# Plano de Orquestração: Saúde do Código e Custos Railway

Este plano detalha a execução de uma checagem abrangente da saúde do projeto e uma análise de impacto financeiro na infraestrutura Railway após as mudanças recentes.

## Overview
O objetivo é garantir que o código mantenha altos padrões de qualidade (lint, segurança, performance) e que a arquitetura na Railway permaneça otimizada para o menor custo possível, evitando desperdícios com as novas funcionalidades.

## Project Type
- **WEB**: Aplicação baseada em React/JavaScript (Frontend).

## Success Criteria
- [ ] Relatório detalhado de saúde do código (Lint, Segurança, UX).
- [ ] Diagnóstico de custos Railway com recomendações de economia.
- [ ] Verificação de zero regressões de performance nos banners e login.
- [ ] Plano aprovado pelo usuário.

## Tech Stack
- **Frontend**: React, Tailwind CSS.
- **Tools**: ESLint, Lighthouse, Railway CLI (simulado).
- **Scripts**: `ux_audit.py`, `security_scan.py`, `lint_runner.py`.

## File Structure
- `script.js`: Arquivo principal de lógica e UI.
- `index.html`: Ponto de entrada HTML.
- `image/`: Ativos de mídia.

## Task Breakdown

### Phase 1: Análise de Saúde (Health Check)
| Task ID | Component | Agent | Skill | Priority | Description | INPUT → OUTPUT → VERIFY |
|---------|-----------|-------|-------|----------|-------------|-------------------------|
| T1.1 | Code Quality | test-engineer | lint-and-validate | P0 | Executar lint e verificação de tipos | `script.js` → Relatório Lint → Erros zero |
| T1.2 | Security | security-auditor | vulnerability-scanner | P0 | Scan de vulnerabilidades e segredos | Código Fonte → Relatório Security → Sem blockers |
| T1.3 | UX/UI Audit | frontend-specialist | frontend-design | P1 | Verificar consistência visual e acessibilidade | UI Dashboard → Relatório UX → Conformidade WCAG |

### Phase 2: Análise de Custos Railway
| Task ID | Component | Agent | Skill | Priority | Description | INPUT → OUTPUT → VERIFY |
|---------|-----------|-------|-------|----------|-------------|-------------------------|
| T2.1 | Cost Diagnosis | railway-cost-optimizer | railway-cost-optimizer | P0 | Analisar se as mudanças de UI aumentaram carga/custo | Arquitetura atual → Diagnóstico → Lista de economia |
| T2.2 | Optimization | railway-cost-optimizer | railway-cost-optimizer | P1 | Propor arquitetura mínima viável | Diagnóstico → Novo Plano Infra → Aprovação técnica |

### Phase X: Verificação Final
- [ ] Executar `python .agent/scripts/verify_all.py .`
- [ ] Executar `python .agent/skills/vulnerability-scanner/scripts/security_scan.py .`
- [ ] Validar conformidade com "Purple Ban" e melhores práticas de design.

## ✅ PHASE X COMPLETE
- Lint: [ ]
- Security: [ ]
- Build: [ ]
- Date: [ ]
