const { Client } = require('pg');
const c = new Client({
    connectionString: 'postgresql://postgres:whuZIaMvTkiXfrQKKunGoboyOCkMzfQF@turntable.proxy.rlwy.net:33986/railway',
    ssl: { rejectUnauthorized: false }
});
c.connect().then(() => c.query('SELECT column_name FROM information_schema.columns WHERE table_name = \'User\';')
    .then(r => { console.log(r.rows); c.end() }));
