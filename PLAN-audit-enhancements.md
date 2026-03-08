# Plan: Audit Menu Enhancements

Este plano detalha a implementação de melhorias na Central de Auditoria, focando em filtros avançados e monitoramento de segurança proativo.

## Project Type
WEB (React/Node.js)

## Success Criteria
- [ ] Interface possui um seletor de "Tipo de Evento" funcional.
- [ ] Falhas de login são registradas e filtráveis.
- [ ] Existe um card de "Alertas de Segurança" que destaca 3+ falhas consecutivas de um mesmo usuário/IP.
- [ ] A performance da tabela de auditoria se mantém estável com filtros client-side.

## Tech Stack
- Frontend: React (in-browser Babel), Tailwind CSS.
- Backend: Node.js, Express.
- Database: SQLite/PostgreSQL.

## Proposed Changes

### [Component] Backend (Audit Logging)
#### [MODIFY] [server.js](file:///c:/Users/Murilo/Desktop/Projects/EcoSistema-diaaf/server.js)
- Garantir que falhas de login registrem um objeto no `AuditLog` com `action: 'login_failure'`.
- Revisar se o endpoint `/api/admin/audit-stats` envia todos os campos necessários para o frontend processar os alertas.

### [Component] Frontend (Audit UI)
#### [MODIFY] [script.js](file:///c:/Users/Murilo/Desktop/Projects/EcoSistema-diaaf/script.js)
- **Estado**: Adicionar `auditTypeFilter` ao componente de Auditoria.
- **UI**: 
    - Adicionar `select` para tipos de evento: "Todos", "Acessos", "Falhas de Login", "Gestão".
    - Adicionar card de "Alerta de Segurança" (condicional).
- **Lógica**: Atualizar a função de renderização da tabela para filtrar por `type` ou `action`.

---

## Task Breakdown

### Phase 1: Foundation (Backend)
- **Task 1**: Reforçar logging de falhas de login no backend.
    - **Agent**: `backend-specialist`
    - **Skill**: `nodejs-best-practices`
    - **Input**: `server.js` rotas de `/api/auth/login`.
    - **Output**: Logs de auditoria criados em falhas de senha ou usuário inexistente.
    - **Verify**: Tentar login com senha errada e verificar se o registro aparece no banco com `action='login_failure'`.

### Phase 2: Core UI (Frontend)
- **Task 2**: Adicionar Filtro de Tipo de Evento.
    - **Agent**: `frontend-specialist`
    - **Skill**: `react-best-practices`
    - **Input**: Component e de Auditoria em `script.js`.
    - **Output**: Dropdown lateral ao filtro de usuário.
    - **Verify**: Selecionar "Falhas de Login" e ver apenas eventos de falha na tabela.

- **Task 3**: Implementar Card de Alertas de Segurança.
    - **Agent**: `frontend-specialist`
    - **Skill**: `frontend-design`
    - **Input**: Dados de `statistics.searchHistory`.
    - **Output**: Card visual (vermelho/âmbar) se houver anomalias recentes.
    - **Verify**: Simular falhas de login e verificar se o alerta aparece no dashboard de auditoria.

---

## Phase X: Verification
- [ ] `python .agent/skills/lint-and-validate/scripts/lint_runner.py .`
- [ ] Teste Manual: Exportar CSV para garantir que os novos tipos de evento são incluídos.
- [ ] Teste de Segurança: Verificar se o log de auditoria não expõe senhas (apenas status de falha).
