const http = require('http');
const fs = require('fs');

async function testFlow() {
    const fetch = globalThis.fetch;
    const BASE_URL = 'http://localhost:3001/api';
    const logs = [];
    const log = (msg, obj) => logs.push({ msg, obj });

    log('--- Iniciando Simulação ---');

    let loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
    });

    if (!loginRes.ok) {
        log('Falha no login inicial!', await loginRes.text());
        fs.writeFileSync('results.json', JSON.stringify(logs, null, 2));
        return;
    }
    const loginData = await loginRes.json();
    const token = loginData.token;
    log('Login OK. Token recebido.', loginData);

    const updateRes = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            username: 'superadmin',
            name: 'Administrador Supremo'
        })
    });

    const updateData = await updateRes.json();
    log('Update Status:', { status: updateRes.status, data: updateData });

    let reloginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'superadmin', password: 'Admin@123' })
    });

    const reloginData = await reloginRes.json();
    log('Relogin Status:', { status: reloginRes.status, data: reloginData });

    const revertToken = reloginRes.ok ? reloginData.token : token;
    const restoreRes = await fetch(`${BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${revertToken}`
        },
        body: JSON.stringify({
            username: 'admin',
            name: 'Administrador do Sistema'
        })
    });
    log('Revert Status:', restoreRes.status);

    fs.writeFileSync('results.json', JSON.stringify(logs, null, 2));
}

testFlow().catch(console.error);
