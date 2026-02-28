# 📋 Plano de Implementação - Migração para Railway

## Visão Geral

Este plano detalha todas as tarefas necessárias para migrar a aplicação de LocalStorage para uma arquitetura com backend Node.js e PostgreSQL no Railway.

---

## 📊 Estimativa de Complexidade

| Fase | Complexidade | Prioridade |
|------|--------------|------------|
| Fase 1: Setup Backend | 🔴 Alta | Crítica |
| Fase 2: Banco de Dados | 🔴 Alta | Crítica |
| Fase 3: Autenticação | 🔴 Alta | Crítica |
| Fase 4: Migração Frontend | 🟡 Média | Alta |
| Fase 5: Deploy Railway | 🟡 Média | Alta |
| Fase 6: Testes | 🟢 Baixa | Média |

---

## 🗓️ Fase 1: Setup do Backend

### 1.1 Estrutura de Pastas
- [ ] Criar pasta `backend/` na raiz do projeto
- [ ] Criar subpastas: `src/routes/`, `src/middleware/`, `src/models/`, `src/config/`, `src/utils/`
- [ ] Criar arquivo `backend/package.json`
- [ ] Criar arquivo `backend/.env.example`
- [ ] Criar arquivo `backend/.gitignore`

### 1.2 Configuração do Servidor
- [ ] Instalar dependências: `express`, `cors`, `dotenv`
- [ ] Criar `src/index.js` com servidor Express básico
- [ ] Configurar middleware de CORS
- [ ] Configurar middleware de parsing JSON
- [ ] Criar rota de health check (`/health`)

### 1.3 Dockerfile
- [ ] Criar `Dockerfile` com Node.js 18 Alpine
- [ ] Configurar WORKDIR `/app`
- [ ] Configurar COPY e npm install
- [ ] Expor porta dinâmica (`${PORT}`)
- [ ] Configurar CMD de inicialização

---

## 🗓️ Fase 2: Banco de Dados PostgreSQL

### 2.1 Configuração de Conexão
- [ ] Instalar dependência: `pg` (node-postgres)
- [ ] Criar `src/config/database.js` com Pool de conexões
- [ ] Configurar SSL para produção
- [ ] Tratar variável `DATABASE_URL` do Railway

### 2.2 Schema do Banco
- [ ] Criar tabela `users` com campos:
  - `id`, `username`, `password`, `name`, `email`, `role`
  - `first_login`, `is_authorized`, `is_blocked`
  - `failed_attempts`, `locked_until`, `password_history`
  - `created_at`, `updated_at`
- [ ] Criar tabela `cnae_data` com campos:
  - `id`, `list_lc`, `description`, `cnae`, `cnae_description`, `aliquota`
- [ ] Criar tabela `audit_log` com campos:
  - `id`, `user_id`, `action`, `details`, `ip_address`, `user_agent`, `created_at`
- [ ] Criar tabela `statistics` com campos:
  - `id`, `user_id`, `action_type`, `details`, `created_at`
- [ ] Criar índices para otimização

### 2.3 Script de Migração
- [ ] Criar `src/config/migrate.js`
- [ ] Implementar criação de tabelas
- [ ] Inserir usuários padrão com senhas hasheadas
- [ ] Migrar dados do `dados.md` para tabela `cnae_data`
- [ ] Tratar erros e rollback

---

## 🗓️ Fase 3: Sistema de Autenticação

### 3.1 Utilitários de Segurança
- [ ] Instalar dependências: `bcryptjs`, `jsonwebtoken`
- [ ] Criar `src/utils/crypto.js`:
  - Função `hashPassword(password)` - bcrypt com salt 10
  - Função `comparePassword(password, hash)` - comparação segura
  - Função `generateToken(user)` - JWT com expiração 24h
  - Função `verifyToken(token)` - validação de token

### 3.2 Middleware de Autenticação
- [ ] Criar `src/middleware/auth.js`
- [ ] Implementar verificação de token JWT
- [ ] Extrair usuário do token e injetar no `req.user`
- [ ] Tratar tokens expirados/inválidos
- [ ] Implementar verificação de bloqueio de usuário

### 3.3 Rotas de Autenticação
- [ ] Criar `src/routes/auth.js`
- [ ] `POST /api/auth/login`:
  - Validar credenciais
  - Verificar bloqueio/tentativas
  - Gerar token JWT
  - Registrar log de auditoria
- [ ] `POST /api/auth/register`:
  - Validar dados de entrada
  - Verificar username único
  - Hashear senha
  - Criar usuário pendente
- [ ] `POST /api/auth/first-login`:
  - Validar token de primeiro acesso
  - Forçar troca de senha
  - Atualizar `first_login = false`
- [ ] `POST /api/auth/logout`:
  - Invalidar token (opcional: blacklist)

---

## 🗓️ Fase 4: Migração do Frontend

### 4.1 Configuração de API
- [ ] Criar arquivo `src/config/api.js` no frontend
- [ ] Definir `API_BASE_URL` via variável de ambiente
- [ ] Criar função `apiRequest(endpoint, options)`
- [ ] Implementar interceptor para adicionar token JWT
- [ ] Implementar tratamento de erros 401/403

### 4.2 Refatorar UserManager
- [ ] Substituir `localStorage.getItem('userProfiles')` por `GET /api/users`
- [ ] Substituir `localStorage.setItem()` por chamadas de API
- [ ] Adaptar `initializeUsers()` para verificar conexão com API
- [ ] Manter fallback para modo offline (opcional)

### 4.3 Refatorar LoginForm
- [ ] Adaptar `handleLoginSubmit()` para usar `POST /api/auth/login`
- [ ] Armazenar token JWT no localStorage
- [ ] Adaptar `handleRegister()` para usar `POST /api/auth/register`
- [ ] Implementar refresh token (opcional)

### 4.4 Refatorar Estatísticas
- [ ] Criar rotas `src/routes/stats.js` no backend
- [ ] `GET /api/stats` - buscar estatísticas do banco
- [ ] `POST /api/stats/search` - registrar nova busca
- [ ] Adaptar frontend para consumir API de estatísticas

### 4.5 Refatorar Consultas CNAE
- [ ] Criar rotas `src/routes/cnae.js` no backend
- [ ] `GET /api/cnae/search` - busca com filtros
- [ ] `GET /api/cnae/:id` - buscar por ID
- [ ] Adaptar frontend para consumir API de consultas

---

## 🗓️ Fase 5: Deploy no Railway

### 5.1 Preparação
- [ ] Criar conta no Railway (railway.app)
- [ ] Conectar repositório GitHub
- [ ] Criar arquivo `railway.json` na raiz
- [ ] Criar arquivo `railway.toml` (alternativo)

### 5.2 Provisionamento de Serviços
- [ ] Criar novo projeto no Railway
- [ ] Provisionar serviço PostgreSQL
- [ ] Anotar `DATABASE_URL` gerada automaticamente
- [ ] Configurar variáveis de ambiente:
  - `JWT_SECRET` (gerar string aleatória segura)
  - `NODE_ENV=production`
  - `FRONTEND_URL` (URL do frontend)

### 5.3 Deploy do Backend
- [ ] Configurar build Docker no Railway
- [ ] Executar primeira implantação
- [ ] Verificar logs de build
- [ ] Executar script de migração do banco
- [ ] Testar endpoint `/health`

### 5.4 Deploy do Frontend (Estático)
- [ ] Opção A: Servir via backend Express
  - Configurar `express.static('public')`
  - Fazer build do frontend
- [ ] Opção B: Deploy separado (Vercel/Netlify)
  - Configurar CORS no backend
  - Atualizar `API_BASE_URL` no frontend

### 5.5 Configuração de Domínio
- [ ] Configurar domínio customizado (opcional)
- [ ] Verificar SSL automático
- [ ] Testar HTTPS

---

## 🗓️ Fase 6: Testes e Validação

### 6.1 Testes de Backend
- [ ] Testar `POST /api/auth/login` com credenciais válidas
- [ ] Testar `POST /api/auth/login` com credenciais inválidas
- [ ] Testar bloqueio após 5 tentativas
- [ ] Testar `POST /api/auth/register`
- [ ] Testar `GET /api/users` com token válido
- [ ] Testar `GET /api/users` sem token
- [ ] Testar `GET /api/cnae/search` com filtros
- [ ] Testar `GET /api/stats`

### 6.2 Testes de Frontend
- [ ] Testar login com usuário admin
- [ ] Testar login com usuário comum
- [ ] Testar cadastro de novo usuário
- [ ] Testar alteração de senha
- [ ] Testar consultas CNAE
- [ ] Testar dashboard administrativo
- [ ] Testar bloqueio/desbloqueio de usuários

### 6.3 Testes de Integração
- [ ] Testar fluxo completo de primeiro acesso
- [ ] Testar sincronização entre máquinas diferentes
- [ ] Testar persistência de dados após redeploy
- [ ] Testar performance com múltiplos usuários

### 6.4 Validação Final
- [ ] Verificar logs de auditoria no banco
- [ ] Verificar estatísticas sendo registradas
- [ ] Verificar HTTPS funcionando
- [ ] Verificar domínio customizado (se aplicável)
- [ ] Documentar URLs de produção

---

## 📁 Checklist de Arquivos a Criar

### Backend
```
backend/
├── package.json                    ❌ Criar
├── Dockerfile                      ❌ Criar
├── .env.example                    ❌ Criar
├── .gitignore                      ❌ Criar
└── src/
    ├── index.js                    ❌ Criar
    ├── routes/
    │   ├── auth.js                 ❌ Criar
    │   ├── users.js                ❌ Criar
    │   ├── cnae.js                 ❌ Criar
    │   └── stats.js                ❌ Criar
    ├── middleware/
    │   └── auth.js                 ❌ Criar
    ├── models/
    │   ├── User.js                 ❌ Criar
    │   ├── CnaeData.js             ❌ Criar
    │   └── AuditLog.js             ❌ Criar
    ├── config/
    │   ├── database.js             ❌ Criar
    │   └── migrate.js              ❌ Criar
    └── utils/
        └── crypto.js               ❌ Criar
```

### Raiz do Projeto
```
/
├── railway.json                    ❌ Criar
├── railway.toml                    ❌ Criar (opcional)
└── README.md                       ⚠️ Atualizar
```

### Frontend (Modificações)
```
/
├── script.js                       ⚠️ Refatorar
└── src/
    └── config/
        └── api.js                  ❌ Criar
```

---

## 🔗 Dependências NPM

### Backend (package.json)
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.1.4",
    "pg": "^8.11.0",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```

---

## ⚠️ Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Dados perdidos na migração | Média | Alto | Backup do `dados.md` antes de migrar |
| Incompatibilidade de senhas | Baixa | Alto | Manter mesmo algoritmo de hash |
| Timeout no Railway (free tier) | Alta | Médio | Configurar health check adequado |
| CORS bloqueando requisições | Média | Médio | Configurar origins corretamente |
| JWT expirando muito rápido | Baixa | Médio | Configurar expiração de 24h |

---

## 📝 Notas Adicionais

### Variáveis de Ambiente Necessárias

| Variável | Desenvolvimento | Produção (Railway) |
|----------|-----------------|-------------------|
| `DATABASE_URL` | `postgresql://localhost:5432/dev` | Automático via addon |
| `JWT_SECRET` | `dev-secret-key` | String aleatória segura |
| `NODE_ENV` | `development` | `production` |
| `PORT` | `3000` | Automático |
| `FRONTEND_URL` | `http://localhost:5500` | URL do frontend |

### Comandos Úteis

```bash
# Instalar dependências do backend
cd backend && npm install

# Rodar em desenvolvimento
npm run dev

# Executar migração do banco
npm run migrate

# Ver logs no Railway
railway logs

# Conectar ao banco PostgreSQL
railway connect postgres
```

---

**Documento criado em**: Fevereiro 2025
**Autor**: Kilo Code
**Status**: Pronto para execução
