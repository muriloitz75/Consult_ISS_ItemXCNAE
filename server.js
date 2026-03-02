const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_production';

// ----- Configuração Isolada do Banco de Dados Dinâmico (PG no Railway / SQLite local) -----
let db;
const connectDB = async () => {
    // Se DATABASE_URL existir e não for local/vazia, tenta PG
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
        console.log("Conectando ao PostgreSQL baseado em DATABASE_URL...");
        const { Pool } = require('pg');
        const pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false } // Necessário para várias instâncias de nuvem/Railway
        });

        db = {
            query: async (text, params) => {
                const { rows } = await pool.query(text, params);
                return rows;
            },
            run: async (text, params) => {
                const res = await pool.query(text, params);
                return { lastID: res.insertId, changes: res.rowCount };
            }
        };

        // Criar tabelas se PostgreSQL
        await pool.query(`
            CREATE TABLE IF NOT EXISTS "User" (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                name TEXT NOT NULL,
                email TEXT,
                firstLogin BOOLEAN DEFAULT true,
                lastPasswordChange TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                passwordHistory JSONB DEFAULT '[]'::jsonb,
                accountLocked BOOLEAN DEFAULT false,
                failedAttempts INTEGER DEFAULT 0,
                isAuthorized BOOLEAN DEFAULT false,
                isBlockedByAdmin BOOLEAN DEFAULT false,
                lockUntil TIMESTAMP,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS "AuditLog" (
                id TEXT PRIMARY KEY,
                "userId" TEXT,
                action TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ipAddress TEXT,
                userAgent TEXT,
                success BOOLEAN DEFAULT true,
                details JSONB
            );

            CREATE TABLE IF NOT EXISTS "BannerConfig" (
                id TEXT PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                label TEXT NOT NULL,
                enabled BOOLEAN DEFAULT true,
                "orderIndex" INTEGER DEFAULT 0,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS "UserBannerConfig" (
                id TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "bannerId" TEXT NOT NULL,
                enabled BOOLEAN DEFAULT true,
                "orderIndex" INTEGER DEFAULT 0,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE("userId", "bannerId")
            );
        `);

        // Migration para bancos já existentes
        const migrations = [
            `ALTER TABLE "BannerConfig" ADD COLUMN IF NOT EXISTS "orderIndex" INTEGER DEFAULT 0`,
            `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accountLocked" BOOLEAN DEFAULT false`,
            `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "failedAttempts" INTEGER DEFAULT 0`,
            `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lockUntil" TIMESTAMP`,
            `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstLogin" BOOLEAN DEFAULT true`,
            `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastPasswordChange" TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
            `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHistory" JSONB DEFAULT '[]'::jsonb`,
            `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isBlockedByAdmin" BOOLEAN DEFAULT false`,
        ];
        for (const mig of migrations) {
            try { await pool.query(mig); } catch (e) { console.log("Migration info:", e.message); }
        }

        // Seed dos banners padrão (PostgreSQL)
        const defaultBanners = [
            { id: 'banner-iss-cnae', key: 'iss-cnae', label: 'Consulta ISS / CNAE' },
            { id: 'banner-pareceres', key: 'pareceres', label: 'Gerador de Pareceres' },
            { id: 'banner-incidencia', key: 'incidencia', label: 'Incidência do ISS' },
            { id: 'banner-processos', key: 'processos', label: 'Análise de Processos' },
            { id: 'banner-nfse-nacional', key: 'nfse-nacional', label: 'NFS-e Nacional' },
            { id: 'banner-diario-oficial', key: 'diario-oficial', label: 'Diário Oficial' },
            { id: 'banner-dte', key: 'dte', label: 'Prefeitura Moderna' },
            { id: 'banner-arrecadacao', key: 'arrecadacao', label: 'Transparência' },
            { id: 'banner-receita', key: 'receita', label: 'Arrecadação' },
            { id: 'banner-entes', key: 'entes', label: 'Entes Federados' },
            { id: 'banner-empresa-facil', key: 'empresa-facil', label: 'Empresa Fácil' },
        ];
        for (let i = 0; i < defaultBanners.length; i++) {
            const b = defaultBanners[i];
            // Utilizando UPSERT real do Postgres para inicializar as ordens na primeira carga
            await pool.query(
                `INSERT INTO "BannerConfig" (id, key, label, enabled, "orderIndex") VALUES ($1, $2, $3, $4, $5) ON CONFLICT (key) DO NOTHING`,
                [b.id, b.key, b.label, true, i]
            );
        }
    } else {
        console.log("Variável DATABASE_URL não identificada ou incompatível. Usando SQLite Local...");
        const sqlite3 = require('sqlite3').verbose();
        const sqldb = new sqlite3.Database('./dev.sqlite3');

        db = {
            query: (text, params) => new Promise((resolve, reject) => {
                const formattedText = text.replace(/\$\d+/g, '?');
                sqldb.all(formattedText, params, (err, rows) => {
                    if (err) {
                        console.error("SQL_QUERY_ERR", text, err);
                        reject(err);
                    } else resolve(rows);
                });
            }),
            run: (text, params) => new Promise((resolve, reject) => {
                const formattedText = text.replace(/\$\d+/g, '?');
                sqldb.run(formattedText, params, function (err) {
                    if (err) {
                        console.error("SQL_RUN_ERR", text, err);
                        reject(err);
                    } else resolve({ lastID: this.lastID, changes: this.changes });
                });
            })
        };

        // Criar tabelas se SQLite
        await db.run(`
            CREATE TABLE IF NOT EXISTS User (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                name TEXT NOT NULL,
                email TEXT,
                firstLogin INTEGER DEFAULT 1,
                lastPasswordChange TEXT DEFAULT CURRENT_TIMESTAMP,
                passwordHistory TEXT DEFAULT '[]',
                accountLocked INTEGER DEFAULT 0,
                failedAttempts INTEGER DEFAULT 0,
                isAuthorized INTEGER DEFAULT 0,
                isBlockedByAdmin INTEGER DEFAULT 0,
                lockUntil TEXT,
                createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS AuditLog (
                id TEXT PRIMARY KEY,
                userId TEXT,
                action TEXT NOT NULL,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                ipAddress TEXT,
                userAgent TEXT,
                success INTEGER DEFAULT 1,
                details TEXT
            );
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS BannerConfig (
                id TEXT PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                label TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                orderIndex INTEGER DEFAULT 0,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db.run(`
            CREATE TABLE IF NOT EXISTS UserBannerConfig (
                id TEXT PRIMARY KEY,
                userId TEXT NOT NULL,
                bannerId TEXT NOT NULL,
                enabled INTEGER DEFAULT 1,
                orderIndex INTEGER DEFAULT 0,
                updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(userId, bannerId)
            );
        `);

        try {
            const columns = await db.query("PRAGMA table_info(BannerConfig)");
            const hasOrderIndex = columns.some(col => col.name === 'orderIndex');
            if (!hasOrderIndex) {
                await db.run(`ALTER TABLE BannerConfig ADD COLUMN orderIndex INTEGER DEFAULT 0;`);
            }
        } catch (e) {
            // Se já existir a coluna (ou dependendo da versão SQLite), pode dar erro ignorável na migração
        }

        // Seed dos banners padrão (SQLite)
        const defaultBanners = [
            { id: 'banner-iss-cnae', key: 'iss-cnae', label: 'Consulta ISS / CNAE' },
            { id: 'banner-pareceres', key: 'pareceres', label: 'Gerador de Pareceres' },
            { id: 'banner-incidencia', key: 'incidencia', label: 'Incidência do ISS' },
            { id: 'banner-processos', key: 'processos', label: 'Análise de Processos' },
            { id: 'banner-nfse-nacional', key: 'nfse-nacional', label: 'NFS-e Nacional' },
            { id: 'banner-diario-oficial', key: 'diario-oficial', label: 'Diário Oficial' },
            { id: 'banner-dte', key: 'dte', label: 'Prefeitura Moderna' },
            { id: 'banner-arrecadacao', key: 'arrecadacao', label: 'Transparência' },
            { id: 'banner-receita', key: 'receita', label: 'Arrecadação' },
            { id: 'banner-entes', key: 'entes', label: 'Entes Federados' },
            { id: 'banner-empresa-facil', key: 'empresa-facil', label: 'Empresa Fácil' },
        ];
        for (let i = 0; i < defaultBanners.length; i++) {
            const b = defaultBanners[i];
            await db.run(
                `INSERT OR IGNORE INTO BannerConfig (id, key, label, enabled, orderIndex) VALUES ($1, $2, $3, $4, $5)`,
                [b.id, b.key, b.label, 1, i]
            );
        }
    }

    // Criar usuário admin padrão se não existir / garantir que nunca esteja bloqueado
    const bcrypt = require('bcrypt');
    const adminCheck = await db.query('SELECT * FROM "User" WHERE username = $1', ['admin']);
    if (!adminCheck || adminCheck.length === 0) {
        const adminId = '10000000-0000-0000-0000-000000000000';
        const hashedAdminPass = await bcrypt.hash('Admin@123', 10);
        await db.run(
            `INSERT INTO "User" (id, username, password, name, role, isAuthorized, isBlockedByAdmin, accountLocked, failedAttempts, firstLogin)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [adminId, 'admin', hashedAdminPass, 'Administrador do Sistema', 'admin', true, false, false, 0, false]
        );
        console.log("Usuário admin padrão criado com sucesso. Login: admin / Senha: Admin@123");
    } else {
        // Se o admin já existe mas está bloqueado (pode acontecer após redeploy), desbloqueia
        const admin = adminCheck[0];
        const isBlocked = admin.isBlockedByAdmin === true || admin.isBlockedByAdmin === 1 || admin.isBlockedByAdmin === 't';
        const isLocked = admin.accountLocked === true || admin.accountLocked === 1 || admin.accountLocked === 't';
        const notAuthorized = !admin.isAuthorized || admin.isAuthorized === 0 || admin.isAuthorized === 'f';
        if (isBlocked || isLocked || notAuthorized) {
            await db.run(
                `UPDATE "User" SET isBlockedByAdmin = $1, accountLocked = $2, failedAttempts = $3, isAuthorized = $4, lockUntil = NULL WHERE username = $5`,
                [false, false, 0, true, 'admin']
            );
            console.log("Admin desbloqueado automaticamente na inicialização.");
        }
    }
};

// Conectar ao Banco de Dados na inicialização
connectDB().catch(console.error);

app.use(cors());
app.use(express.json());

// Função utilitária global para UUID versão simples
function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Acesso negado, token ausente" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido ou expirado" });
        req.user = user;
        next();
    });
};

/* --- Rotas de Autenticação (Agnósticas - Sem ORM) --- */

// Registro de Usuário
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, name, email } = req.body;

        if (!username || !password || !name) {
            return res.status(400).json({ error: "Todos os campos obrigatórios precisam ser preenchidos" });
        }

        const existingQuery = await db.query('SELECT * FROM User WHERE username = $1', [username]);
        if (existingQuery.length > 0) {
            return res.status(400).json({ error: "Nome de usuário já existe" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();
        const jsonHistory = JSON.stringify([hashedPassword]);

        await db.run(
            `INSERT INTO "User" (id, username, password, name, email, role, isAuthorized, passwordHistory, firstLogin)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [userId, username, hashedPassword, name, email || null, 'user', 0, jsonHistory, false]
        );

        console.log("Usuario inserido. Inserindo log...");

        await db.run(
            `INSERT INTO AuditLog (id, userId, action, ipAddress, details) VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), userId, 'user_registered', req.ip || 'unknown', JSON.stringify({ username })]
        );

        res.status(201).json({ message: "Cadastro realizado com sucesso! Aguarde aprovação do administrador.", user: { id: userId, username } });

    } catch (error) {
        console.error("====== ERRO NO REGISTRO ======");
        console.error(error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) return res.status(400).json({ error: "Usuário e senha são obrigatórios" });

        const users = await db.query('SELECT * FROM User WHERE username = $1', [username]);
        const user = users.length > 0 ? users[0] : null;

        if (!user) {
            await db.run(`INSERT INTO AuditLog (id, action, details, success) VALUES ($1, $2, $3, $4)`,
                [uuidv4(), 'login_failed', JSON.stringify({ username, reason: 'user_not_found' }), 0]);
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        // SQLite converte booleanos para 1/0
        const isLocked = user.accountLocked === true || user.accountLocked === 1;
        const isBlocked = user.isBlockedByAdmin === true || user.isBlockedByAdmin === 1;
        const isAuthorized = user.isAuthorized === true || user.isAuthorized === 1;

        if (isLocked || isBlocked) {
            await db.run(`INSERT INTO "AuditLog" (id, "userId", action, success) VALUES ($1, $2, $3, $4)`,
                [uuidv4(), user.id, 'login_failed_locked', 0]);

            let errorMsg = "Sua conta está bloqueada.";
            if (isLocked && user.lockUntil) {
                const lockTime = new Date(user.lockUntil);
                if (lockTime > new Date()) {
                    const diffMs = lockTime - new Date();
                    const diffMins = Math.ceil(diffMs / 60000);
                    errorMsg = `Conta bloqueada por excesso de tentativas. Tente novamente em ${diffMins} minuto(s).`;
                } else {
                    // Time passed, we should theoretically unlock here, but let's unlock and allow retry.
                    await db.run(`UPDATE "User" SET failedAttempts = 0, accountLocked = 0, lockUntil = NULL WHERE id = $1`, [user.id]);
                    // We'll let it fail or succeed down the line based on the password logic
                }
            } else if (isBlocked) {
                errorMsg = "Sua conta foi bloqueada pelo administrador.";
            }

            if ((isLocked && new Date(user.lockUntil) > new Date()) || isBlocked) {
                return res.status(403).json({ error: errorMsg, isLocked: true });
            }
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            const newFailedAttempts = (user.failedAttempts || 0) + 1;
            let query = `UPDATE "User" SET failedAttempts = $1`;
            let params = [newFailedAttempts, user.id];

            if (newFailedAttempts >= 5) {
                query += `, accountLocked = $2, lockUntil = $3`;
                const lockUntil = new Date();
                lockUntil.setMinutes(lockUntil.getMinutes() + 30);
                params = [newFailedAttempts, 1, lockUntil.toISOString(), user.id];
            }
            query += ` WHERE id = $${params.length}`; // $2 ou $4 dependendo da condição

            await db.run(query, params);
            await db.run(`INSERT INTO "AuditLog" (id, "userId", action, success) VALUES ($1, $2, $3, $4)`,
                [uuidv4(), user.id, 'login_failed_password', 0]);

            if (newFailedAttempts >= 5) {
                return res.status(401).json({ error: "Conta bloqueada por 30 minutos após 5 tentativas de falha.", isLocked: true });
            } else {
                const attemptsLeft = 5 - newFailedAttempts;
                let warning = "Credenciais inválidas.";
                if (attemptsLeft <= 2) {
                    warning = `Credenciais inválidas. Restam apenas ${attemptsLeft} tentativa(s) antes do bloqueio da conta.`;
                }
                return res.status(401).json({ error: warning, attemptsLeft });
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({ error: "Sua conta ainda não foi aprovada pelo administrador." });
        }

        // Resetar failed attempts
        await db.run(`UPDATE "User" SET failedAttempts = 0, accountLocked = 0, lockUntil = NULL WHERE id = $1`, [user.id]);

        const firstLogin = user.firstLogin === true || user.firstLogin === 1;

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role, firstLogin },
            JWT_SECRET,
            { expiresIn: '12h' }
        );

        await db.run(`INSERT INTO "AuditLog" (id, "userId", action) VALUES ($1, $2, $3)`, [uuidv4(), user.id, 'login_success']);

        res.json({
            token,
            user: {
                id: user.id, username: user.username, name: user.name,
                email: user.email, role: user.role, firstLogin
            }
        });

    } catch (error) {
        console.error("Erro no login:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// Recuperação de Senha (Esqueci minha Senha)
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { username } = req.body;
        if (!username) return res.status(400).json({ error: "Nome de usuário é obrigatório." });

        const users = await db.query('SELECT id FROM "User" WHERE username = $1', [username]);

        // Log auditing operation whether user exists or not, avoids enumeration attacks
        const userId = users.length > 0 ? users[0].id : null;

        await db.run(
            `INSERT INTO "AuditLog" (id, "userId", action, ipAddress, details) VALUES ($1, $2, $3, $4, $5)`,
            [uuidv4(), userId, 'forgot_password_request', req.ip || 'unknown', JSON.stringify({ requestedUsername: username })]
        );

        // Always return success for security (prevents user guessing)
        res.json({ message: "Se o usuário existir, o administrador responsável será notificado sobre a solicitação de redefinição." });

    } catch (error) {
        console.error("====== ERRO NO ESQUECI A SENHA ======");
        console.error(error);
        res.status(500).json({ error: "Erro interno no servidor." });
    }
});

// Atualizar o perfil do próprio usuário (Exige Token JWT válido)
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, email, username, currentPassword, newPassword } = req.body;

        const users = await db.query('SELECT * FROM User WHERE id = $1', [userId]);
        if (users.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });
        const user = users[0];

        const updates = [];
        const params = [];
        const addUpdate = (field, value) => {
            params.push(value);
            updates.push(`"${field}" = $${params.length}`);
        };

        if (name) addUpdate('name', name);
        if (email) addUpdate('email', email);

        if (username && username !== user.username) {
            const existing = await db.query('SELECT * FROM User WHERE username = $1', [username]);
            if (existing.length > 0) return res.status(400).json({ error: "Este nome de usuário já está em uso" });
            addUpdate('username', username);
        }

        let isPasswordChanged = false;
        if (newPassword && currentPassword) {
            const validPassword = await bcrypt.compare(currentPassword, user.password);
            if (!validPassword) return res.status(401).json({ error: "Senha atual incorreta" });

            const newHashedPassword = await bcrypt.hash(newPassword, 10);

            // Lidar com JSON de History de forma simples
            let history = [];
            try { history = JSON.parse(user.passwordHistory || '[]'); } catch (e) { }

            const isReused = history.some(hash => bcrypt.compareSync(newPassword, hash));
            if (isReused) return res.status(400).json({ error: "Esta senha já foi usada recentemente" });

            addUpdate('password', newHashedPassword);
            addUpdate('firstLogin', 0);
            addUpdate('lastPasswordChange', new Date().toISOString());

            history.push(newHashedPassword);
            if (history.length > 5) history.shift();
            addUpdate('passwordHistory', JSON.stringify(history));

            isPasswordChanged = true;
        }

        if (updates.length > 0) {
            params.push(userId); // Adiciona userId como o ULTIMO parametro
            const query = `UPDATE User SET ${updates.join(', ')} WHERE id = $${params.length}`;
            await db.run(query, params);
        }

        await db.run(
            `INSERT INTO AuditLog (id, userId, action, details) VALUES ($1, $2, $3, $4)`,
            [uuidv4(), userId, 'profile_updated', JSON.stringify({ passwordChanged: isPasswordChanged })]
        );

        // Retornar o usuário atualizado pra facilitar vida do front
        const updatedUsers = await db.query('SELECT * FROM User WHERE id = $1', [userId]);
        const updatedUser = updatedUsers[0];

        res.json({
            message: "Perfil atualizado com sucesso", user: {
                id: updatedUser.id, username: updatedUser.username, name: updatedUser.name,
                email: updatedUser.email, role: updatedUser.role, firstLogin: (updatedUser.firstLogin === 1 || updatedUser.firstLogin === true)
            }
        });
    } catch (error) {
        console.error("Erro na atualização do perfil:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// Middleware para verificar se é Admin
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: "Acesso negado. Apenas administradores." });
    }
    next();
};

// ================= ROTAS DE ADMINISTRAÇÃO =================

// 1. Listar todos os usuários (Apenas Admin)
app.get('/api/auth/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const users = await db.query('SELECT id, username, name, email, role, isAuthorized, isBlockedByAdmin, accountLocked, createdAt FROM "User"');
        res.json(users);
    } catch (error) {
        console.error("Erro ao listar usuários:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// 2. Autorizar um usuário pendente
app.post('/api/auth/users/:id/authorize', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db.run('UPDATE User SET isAuthorized = 1 WHERE id = $1', [id]);

        await db.run(
            `INSERT INTO AuditLog (id, "userId", action, details) VALUES ($1, $2, $3, $4)`,
            [uuidv4(), req.user.id, 'admin_authorized_user', JSON.stringify({ targetUserId: id })]
        );

        res.json({ message: "Usuário autorizado com sucesso." });
    } catch (error) {
        console.error("Erro ao autorizar usuário:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// 3. Bloquear / Desbloquear usuário
app.post('/api/auth/users/:id/block', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const users = await db.query('SELECT isBlockedByAdmin FROM User WHERE id = $1', [id]);

        if (users.length === 0) return res.status(404).json({ error: "Usuário não encontrado" });

        // SQLite boolean to int
        const currentStatus = users[0].isBlockedByAdmin === true || users[0].isBlockedByAdmin === 1;
        const newStatus = currentStatus ? 0 : 1;

        await db.run('UPDATE User SET isBlockedByAdmin = $1 WHERE id = $2', [newStatus, id]);

        await db.run(
            `INSERT INTO AuditLog (id, "userId", action, details) VALUES ($1, $2, $3, $4)`,
            [uuidv4(), req.user.id, newStatus ? 'admin_blocked_user' : 'admin_unblocked_user', JSON.stringify({ targetUserId: id })]
        );

        res.json({ message: `Usuário ${newStatus ? 'bloqueado' : 'desbloqueado'} com sucesso.` });
    } catch (error) {
        console.error("Erro ao bloquear usuário:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// 4. Resetar senha de um usuário
app.post('/api/auth/users/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const defaultPassword = "Mudar@123";
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        await db.run('UPDATE User SET password = $1, firstLogin = 1 WHERE id = $2', [hashedPassword, id]);

        await db.run(
            `INSERT INTO AuditLog (id, "userId", action, details) VALUES ($1, $2, $3, $4)`,
            [uuidv4(), req.user.id, 'admin_reset_password', JSON.stringify({ targetUserId: id })]
        );

        res.json({ message: "Senha resetada para 'Mudar@123'." });
    } catch (error) {
        console.error("Erro ao resetar senha:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});

// 5. Excluir usuário
app.delete('/api/auth/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        if (req.user.id === id) {
            return res.status(400).json({ error: "Não é possível excluir o próprio usuário." });
        }

        await db.run('DELETE FROM User WHERE id = $1', [id]);
        await db.run('DELETE FROM AuditLog WHERE "userId" = $1', [id]);

        await db.run(
            `INSERT INTO AuditLog (id, "userId", action, details) VALUES ($1, $2, $3, $4)`,
            [uuidv4(), req.user.id, 'admin_deleted_user', JSON.stringify({ targetUserId: id })]
        );

        res.json({ message: "Usuário excluído com sucesso." });
    } catch (error) {
        console.error("Erro ao deletar usuário:", error);
        res.status(500).json({ error: "Erro interno no servidor" });
    }
});


// ================= ROTAS DE BANNERS =================

// Listar banners com status — com token opcional para personalização por usuário
app.get('/api/banners', async (req, res) => {
    try {
        const globalBanners = await db.query('SELECT id, key, label, enabled, "orderIndex" FROM "BannerConfig" ORDER BY "orderIndex" ASC, id ASC');
        const normalized = globalBanners.map(b => ({
            ...b,
            enabled: b.enabled === true || b.enabled === 1 || b.enabled === 't'
        }));

        // Tenta extrair o userId do token JWT (se enviado)
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (token) {
            try {
                const decoded = require('jsonwebtoken').verify(token, JWT_SECRET);
                const userId = decoded.id;

                // Busca overrides do usuário
                const overrides = await db.query(
                    'SELECT "bannerId", enabled, "orderIndex" FROM "UserBannerConfig" WHERE "userId" = $1',
                    [userId]
                );

                if (overrides.length > 0) {
                    // Mescla: override prevalece sobre global
                    const overrideMap = {};
                    overrides.forEach(o => {
                        overrideMap[o.bannerId] = {
                            enabled: o.enabled === true || o.enabled === 1 || o.enabled === 't',
                            orderIndex: o.orderIndex
                        };
                    });

                    const merged = normalized.map(b => {
                        if (overrideMap[b.id] !== undefined) {
                            return {
                                ...b,
                                enabled: overrideMap[b.id].enabled,
                                orderIndex: overrideMap[b.id].orderIndex,
                                hasOverride: true
                            };
                        }
                        return b;
                    });

                    // Reordena se houver overrides com orderIndex
                    merged.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
                    return res.json(merged);
                }
            } catch (e) {
                // token inválido ou expirado — retorna global sem erro
            }
        }

        res.json(normalized);
    } catch (error) {
        console.error('Erro ao listar banners:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// ================= ROTA DE REORDENAÇÃO MÚLTIPLA =================
app.put('/api/admin/banners/reorder', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { orderedBanners } = req.body; // Expects: [{ id: '123', orderIndex: 0 }, { id: '456', orderIndex: 1 }]

        if (!Array.isArray(orderedBanners)) {
            return res.status(400).json({ error: 'Payload inválido. Esperado um array de banners.' });
        }

        // We update one by one as a simplified approach for SQLite and Postgres compatibility
        for (const item of orderedBanners) {
            if (item.id !== undefined && item.orderIndex !== undefined) {
                await db.run(
                    'UPDATE "BannerConfig" SET "orderIndex" = $1, "updatedAt" = $2 WHERE id = $3',
                    [item.orderIndex, new Date().toISOString(), item.id]
                );
            }
        }

        await db.run(
            `INSERT INTO "AuditLog" (id, "userId", action, details) VALUES ($1, $2, $3, $4)`,
            [uuidv4(), req.user.id, 'admin_reorder_banners', JSON.stringify({ count: orderedBanners.length })]
        );

        res.json({ message: 'Banners reordenados com sucesso.', success: true });
    } catch (error) {
        console.error('Erro ao reordenar banners:', error);
        res.status(500).json({ error: 'Erro interno no servidor ao tentar reordenar' });
    }
});

// Alternar estado de um banner (admin only)
app.put('/api/admin/banners/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { enabled } = req.body;

        if (typeof enabled === 'undefined') {
            return res.status(400).json({ error: 'Campo "enabled" é obrigatório.' });
        }

        const banners = await db.query('SELECT * FROM "BannerConfig" WHERE id = $1', [id]);
        if (banners.length === 0) return res.status(404).json({ error: 'Banner não encontrado.' });

        const enabledValue = !!enabled;
        await db.run(
            'UPDATE "BannerConfig" SET enabled = $1, updatedAt = $2 WHERE id = $3',
            [enabledValue, new Date().toISOString(), id]
        );

        await db.run(
            `INSERT INTO AuditLog (id, userId, action, details) VALUES ($1, $2, $3, $4)`,
            [uuidv4(), req.user.id, 'admin_toggle_banner', JSON.stringify({ bannerId: id, enabled })]
        );

        res.json({ message: `Banner ${enabled ? 'ativado' : 'desativado'} com sucesso.`, id, enabled });
    } catch (error) {
        console.error('Erro ao atualizar banner:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// =============== ROTAS DE BANNERS POR USUÁRIO (ADMIN) ===============

// Listar banners globais com overrides do usuário mesclados
app.get('/api/admin/users/:userId/banners', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const globalBanners = await db.query(
            'SELECT id, key, label, enabled, "orderIndex" FROM "BannerConfig" ORDER BY "orderIndex" ASC, id ASC'
        );
        const overrides = await db.query(
            'SELECT "bannerId", enabled, "orderIndex" FROM "UserBannerConfig" WHERE "userId" = $1',
            [userId]
        );

        const overrideMap = {};
        overrides.forEach(o => {
            overrideMap[o.bannerId] = {
                enabled: o.enabled === true || o.enabled === 1 || o.enabled === 't',
                orderIndex: o.orderIndex
            };
        });

        const merged = globalBanners.map(b => {
            const normalizedGlobal = b.enabled === true || b.enabled === 1 || b.enabled === 't';
            if (overrideMap[b.id] !== undefined) {
                return {
                    ...b,
                    enabled: overrideMap[b.id].enabled,
                    orderIndex: overrideMap[b.id].orderIndex,
                    globalEnabled: normalizedGlobal,
                    hasOverride: true
                };
            }
            return { ...b, enabled: normalizedGlobal, globalEnabled: normalizedGlobal, hasOverride: false };
        });

        res.json(merged);
    } catch (error) {
        console.error('Erro ao listar banners do usuário:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Ativar/desativar um banner específico para um usuário (cria ou atualiza override)
app.put('/api/admin/users/:userId/banners/:bannerId', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId, bannerId } = req.params;
        const { enabled } = req.body;

        if (typeof enabled === 'undefined') {
            return res.status(400).json({ error: 'Campo "enabled" é obrigatório.' });
        }

        const userCheck = await db.query('SELECT id FROM "User" WHERE id = $1', [userId]);
        if (userCheck.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

        const bannerCheck = await db.query('SELECT id, "orderIndex" FROM "BannerConfig" WHERE id = $1', [bannerId]);
        if (bannerCheck.length === 0) return res.status(404).json({ error: 'Banner não encontrado.' });

        const enabledValue = !!enabled;
        const overrideId = uuidv4();
        const now = new Date().toISOString();
        const globalOrder = bannerCheck[0].orderIndex ?? 0;

        // UPSERT: se já existe override, atualiza; senão, cria
        const existing = await db.query(
            'SELECT id FROM "UserBannerConfig" WHERE "userId" = $1 AND "bannerId" = $2',
            [userId, bannerId]
        );

        if (existing.length > 0) {
            await db.run(
                'UPDATE "UserBannerConfig" SET enabled = $1, updatedAt = $2 WHERE "userId" = $3 AND "bannerId" = $4',
                [enabledValue, now, userId, bannerId]
            );
        } else {
            await db.run(
                'INSERT INTO "UserBannerConfig" (id, "userId", "bannerId", enabled, "orderIndex", updatedAt) VALUES ($1, $2, $3, $4, $5, $6)',
                [overrideId, userId, bannerId, enabledValue, globalOrder, now]
            );
        }

        await db.run(
            'INSERT INTO "AuditLog" (id, "userId", action, details) VALUES ($1, $2, $3, $4)',
            [uuidv4(), req.user.id, 'admin_toggle_user_banner', JSON.stringify({ targetUserId: userId, bannerId, enabled })]
        );

        res.json({ message: `Banner ${enabled ? 'ativado' : 'desativado'} para o usuário com sucesso.`, userId, bannerId, enabled });
    } catch (error) {
        console.error('Erro ao atualizar banner do usuário:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Reordenar banners de um usuário específico
app.put('/api/admin/users/:userId/banners/reorder', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        const { orderedBanners } = req.body;

        if (!Array.isArray(orderedBanners)) {
            return res.status(400).json({ error: 'Payload inválido. Esperado um array de banners.' });
        }

        const now = new Date().toISOString();

        for (const item of orderedBanners) {
            if (item.id === undefined || item.orderIndex === undefined) continue;

            const existing = await db.query(
                'SELECT id, enabled FROM "UserBannerConfig" WHERE "userId" = $1 AND "bannerId" = $2',
                [userId, item.id]
            );

            if (existing.length > 0) {
                await db.run(
                    'UPDATE "UserBannerConfig" SET "orderIndex" = $1, updatedAt = $2 WHERE "userId" = $3 AND "bannerId" = $4',
                    [item.orderIndex, now, userId, item.id]
                );
            } else {
                // Busca o estado atual global para manter o enabled correto
                const global = await db.query('SELECT enabled FROM "BannerConfig" WHERE id = $1', [item.id]);
                const globalEnabled = global.length > 0 ? (global[0].enabled === true || global[0].enabled === 1 || global[0].enabled === 't') : true;
                await db.run(
                    'INSERT INTO "UserBannerConfig" (id, "userId", "bannerId", enabled, "orderIndex", updatedAt) VALUES ($1, $2, $3, $4, $5, $6)',
                    [uuidv4(), userId, item.id, globalEnabled, item.orderIndex, now]
                );
            }
        }

        await db.run(
            'INSERT INTO "AuditLog" (id, "userId", action, details) VALUES ($1, $2, $3, $4)',
            [uuidv4(), req.user.id, 'admin_reorder_user_banners', JSON.stringify({ targetUserId: userId, count: orderedBanners.length })]
        );

        res.json({ message: 'Ordem dos banners do usuário atualizada com sucesso.', success: true });
    } catch (error) {
        console.error('Erro ao reordenar banners do usuário:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Remover todos os overrides do usuário (resetar para configuração global)
app.delete('/api/admin/users/:userId/banners', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        const userCheck = await db.query('SELECT id FROM "User" WHERE id = $1', [userId]);
        if (userCheck.length === 0) return res.status(404).json({ error: 'Usuário não encontrado.' });

        await db.run('DELETE FROM "UserBannerConfig" WHERE "userId" = $1', [userId]);

        await db.run(
            'INSERT INTO "AuditLog" (id, "userId", action, details) VALUES ($1, $2, $3, $4)',
            [uuidv4(), req.user.id, 'admin_reset_user_banners', JSON.stringify({ targetUserId: userId })]
        );

        res.json({ message: 'Configurações de banners do usuário resetadas para o padrão global.', success: true });
    } catch (error) {
        console.error('Erro ao resetar banners do usuário:', error);
        res.status(500).json({ error: 'Erro interno no servidor' });
    }
});

// Servir os arquivos estáticos
app.use(express.static('.'));

app.listen(PORT, () => {
    console.log(`\uD83D\uDE80 Servidor rodando na porta ${PORT}`);
});
