const { Pool } = require('pg');
const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
p.query('UPDATE "User" SET "isAuthorized" = true, "isBlockedByAdmin" = false, "accountLocked" = false, "failedAttempts" = 0 WHERE username = $1', ['admin'])
    .then(r => { console.log('Admin corrigido! Linhas afetadas:', r.rowCount); p.end(); })
    .catch(e => { console.error('ERRO:', e.message); p.end(); });
