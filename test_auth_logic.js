const fetch = require('node-fetch'); // Requer node-fetch na versão 2 se executado no projeto ou built-in no Node 18+

const BASE_URL = 'http://localhost:3001/api';

async function runAuthTests() {
    console.log('--- Iniciando Testes de Autenticação na API ---');
    try {
        // 1. Tentar fazer login com Admin
        console.log('1. Fazendo login com credenciais padrão de Admin...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'Admin@123' })
        });

        if (!loginRes.ok) {
            console.error('❌ Falha ao logar com Admin@123. Tente Mudar@123 se você tiver resetado.');
            const err = await loginRes.json();
            console.error(err);
            return;
        }

        const loginData = await loginRes.json();
        const token = loginData.token;
        const isFirstLogin = loginData.user.firstLogin;
        console.log(`✅ Login bem sucedido. firstLogin = ${isFirstLogin}`);

        // 2. Tentar alterar a senha SEM enviar a senha atual (simulando FirstLoginModal)
        console.log('2. Testando alteração de senha apenas enviando a Nova Senha (comportamento FirstLogin)...');
        const newPassword = 'TestPassword@123';

        const updateRes = await fetch(`${BASE_URL}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                newPassword: newPassword
                // NÃO estamos enviando currentPassword aqui propositalmente
            })
        });

        const updateData = await updateRes.json();

        if (isFirstLogin) {
            if (updateRes.ok) {
                console.log('✅ SUCESSO ESPERADO: Senha alterada com sucesso no FirstLogin (sem exigir senha atual).');
            } else {
                console.error('❌ FALHA INESPERADA: API rejeitou alteração no FirstLogin sem a senha atual.');
                console.error(updateData);
            }
        } else {
            if (updateRes.ok) {
                console.error('❌ FALHA GRAVE DE SEGURANÇA: API permitiu alteração de senha de usuário não-FirstLogin sem exigir a senha atual.');
            } else {
                console.log('✅ SUCESSO ESPERADO: API rejeitou alteração de senha sem currentPassword porque o usuário não estava no FirstLogin.');
                console.log(updateData.error);
            }
        }

        console.log('--- Testes Concluídos ---');

    } catch (e) {
        console.error('Erro ao executar testes:', e);
    }
}

runAuthTests();
