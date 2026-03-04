const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const DATABASE_URL = 'postgresql://postgres:whuZIaMvTkiXfrQKKunGoboyOCkMzfQF@turntable.proxy.rlwy.net:33986/railway';

async function resetAdminPassword() {
    const pool = new Pool({
        connectionString: DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('Conectando ao banco de dados...');
        const newPassword = 'Admin@123';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const query = `
            UPDATE "User" 
            SET password = $1, 
                "firstLogin" = true, 
                "failedAttempts" = 0, 
                "accountLocked" = false,
                "isAuthorized" = true,
                "isBlockedByAdmin" = false,
                "lockUntil" = NULL
            WHERE username = 'admin'
        `;

        const res = await pool.query(query, [hashedPassword]);

        if (res.rowCount > 0) {
            console.log('✅ Senha do admin resetada com sucesso para: ' + newPassword);
        } else {
            console.log('❌ Usuário admin não encontrado no banco de dados!');
        }

    } catch (error) {
        console.error('❌ Erro ao resetar senha:', error);
    } finally {
        await pool.end();
        console.log('Conexão encerrada.');
    }
}

resetAdminPassword();
