# 🤖 Manual do Agentic Kit: Como Operar Sua Equipe de IA

Este documento é o seu guia definitivo sobre como extrair o máximo de inteligência do ecossistema de Inteligência Artificial presente no diretório `.agent`. O sistema funciona como uma verdadeira "empresa de software automatizada".

A regra de ouro de operação é:
> **Ações grandes exigem Workflows. Tarefas específicas exigem Agentes. O sistema cuida das Skills sozinho.**

---

## 🏗️ A Tríade do Sistema

O sistema é dividido em três camadas lógicas de operação:

### 1. Workflows (A "Estratégia" e o "Processo")
Os workflows ditam **como** um processo longo deve ser executado, passo a passo, muitas vezes passando a bola entre vários agentes.

*   **O que são:** Roteiros estruturados de engenharia (ex: `/plan`, `/brainstorm`, `/deploy`, `/debug`, `/ui-ux-pro-max`).
*   **Quando usar:** Quando você vai começar uma nova funcionalidade do zero, arquitetar um sistema complexo, debugar um problema profundo que você não sabe a causa, ou fazer o deploy para produção.
*   **Como invocar:** Digitando diretamente o comando no chat, por exemplo:
    *   *"Vamos criar um módulo de relatórios. Inicie o `/brainstorm`."*
    *   *"O sistema caiu em produção e não sabemos o porquê. Inicie o `/debug`."*
*   **Quando NÃO usar:** Para consertar um bug rápido focado (ex: erro de digitação), mudar a cor de um botão ou fazer pequenas refatorações em um único arquivo.

### 2. Agentes (Os "Profissionais Especialistas")
Os agentes são as "pessoas" da sua equipe. Cada um domina uma área específica da engenharia de software e carrega consigo ferramentas específicas (Skills).

*   **O que são:** Entidades focadas no domínio (ex: `@backend-specialist`, `@frontend-specialist`, `@security-auditor`, `@debugger`, `@orchestrator`).
*   **Quando usar:** Para a esmagadora maioria das tarefas do dia a dia. Criação de endpoints, ajustes de layout, correção de pequenos bugs ou consultas técnicas.
*   **Como invocar:**
    1.  **Automático (Recomendado):** Basta falar em linguagem natural. O sistema possui `intelligent-routing` e saberá exatamente quem chamar. Ex: *"Ajuste o padding da tabela na página de logs."* (O `frontend-specialist` assumirá).
    2.  **Manual:** Mencionando o agente diretamente. Ex: *"@security-auditor verifique estas dependências."*
*   **Principais Agentes:**
    *   **Orchestrator:** O gerente. Delega e quebra tarefas complexas.
    *   **Frontend Specialist:** Domina React, Next, Tailwind e UI/UX.
    *   **Backend Specialist:** Domina APIs, Node, Arquitetura e Banco de Dados.
    *   **Test Engineer:** Cria as baterias de testes.

### 3. Skills (As "Ferramentas" e "Regras de Ouro")
As Skills são arquivos de conhecimento, regras estritas, scripts operacionais e padrões arquiteturais restritos a uma área.

*   **O que são:** Conhecimento encapsulado (ex: `clean-code`, `testing-patterns`, `database-design`, `seo-fundamentals`).
*   **Quando usar:** Elas são usadas **automaticamente** pelos Agentes. Quando o backend vai criar uma tabela, ele já lê a skill de banco de dados por conta própria.
*   **Como forçar a invocação:** Você pode invocar manualmente quando quer garantir uma auditoria muito estrita ou forçar a execução de um script específico daquela skill.
    *   Ex: *"Refatore essa função e aplique rigorosamente o que diz no `@clean-code`."*
    *   Ex: *"Rode os scripts de análise de bundle da skill `@performance-profiling`."*

---

## 🚀 Resumo Prático: Casos de Uso no Dia a Dia

Abaixo, um resumo de como se comunicar com a IA dependendo da sua necessidade:

#### Cenário A: Tarefas Rotineiras (Deixe o sistema agir)
**Sua Ação:** Fale naturalmente, como faria com um desenvolvedor Júnior/Pleno.
**Comando:** *"Adicione um novo campo 'telefone' na tela de cadastro e faça o backend salvar isso."*
**O que a IA fará:** O Roteador Inteligente dividirá a tarefa entre o Frontend e o Backend e usará as Skills necessárias de UI e Banco de Dados.

#### Cenário B: Criação de Nova Funcionalidade / Épico
**Sua Ação:** Chame um Workflow.
**Comando:** *"Vou precisar integrar uma API externa de pagamentos. Vamos usar o fluxo `/plan`."*
**O que a IA fará:** O `project-planner` fará perguntas socráticas, elaborará um Documento de Plano (`task.md` e `implementation_plan.md`) e só codificará após sua aprovação formal.

#### Cenário C: Bug Cabuloso e Desconhecido
**Sua Ação:** Acione o modo de Guerra.
**Comando:** *"A aplicação está caindo de madrugada com status 500 intermitente. Inicie o `/debug`."*
**O que a IA fará:** O sistema vai isolar variáveis, ler logs do servidor, analisar relatórios analíticos em 4 fases dedutivas seguindo a skill de `systematic-debugging`.

#### Cenário D: Auditoria de Segurança / Entrega
**Sua Ação:** Force uma Skill específica ou invoque um Script de Validação.
**Comando:** *"Antes de aprovarmos esta PR, invoque a skill `@vulnerability-scanner` e rode o script `security_scan.py` sobre os últimos arquivos modificados."*
**O que a IA fará:** Atuará estritamente como Red Team para caçar vulnerabilidades de OWASP Top 10.

---

## 🛠️ Execução de Scripts (Validação)

Várias Skills vêm com "Scripts" atrelados para provar empiricamente que um trabalho foi bem-feito. Sempre que você fala "Faça verificações finais", o sistema roda comandos em Python/Node por trás dos panos. 

Algumas das ferramentas ao seu dispor:
- **`lint_runner.py`**: Garante formatação limpa (Qualquer Agente).
- **`ux_audit.py`**: Garante acessibilidade na UI (Frontend).
- **`schema_validator.py`**: Verifica a estabilidade do Banco (Backend/Database).
- **`lighthouse_audit.py`**: Avalia Core Web Vitals das páginas (Performance).

> **Lembrete Final:** Você é o líder técnico. Sempre que discordar ou desconfiar das escolhas do sistema, peça as evidências ou peça que ele aplique `@clean-code`. O sistema obedece a regras de arquitetura rígidas, mas você tem a palavra final.
