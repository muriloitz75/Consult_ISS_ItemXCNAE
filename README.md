# Ecossistema DIAAF

Uma plataforma digital completa e integrada, desenvolvida para unificar consultas analíticas, gestão de processos e automação de serviços da Divisão de Informações e Arrecadação (DIAAF).

## 🚀 Novas Funcionalidades e Módulos Principais

### 🔒 Autenticação e Segurança Avançada
- **Sistema de Login Completo**: Registro de usuários, recuperação de senha com código único.
- **Aprovação Manual**: Novos usuários ficam pendentes até um Administrador autorizá-los.
- **Soft-Lock (Inatividade)**: Bloqueio automático da sessão após inatividade, exigindo apenas a senha para desbloqueio rápido sem perda de dados.
- **Prevenção de Ataques**: Bloqueio de conta após múltiplas tentativas de login falhas.

### 🎛️ Gestão Dinâmica de Banners (Módulos)
- **Accordion Inline (Novo)**: Banners que atuam como containers ("Prefeitura Moderna", "Consultas Fiscais" e "Biblioteca") agora se expandem diretamente na Home, revelando sub-serviços sem a necessidade de modais sobrepostos.
- **Contagem de Serviços**: Exibição dinâmica da quantidade de sub-itens ativos em cada categoria (ex: "8 serviços disponíveis").
- **Controle Global e por Usuário**: Administradores podem ocultar ou habilitar módulos (`Consulta ISS`, `Análise de Processos`, etc.) globalmente ou de forma individualizada via Drag & Drop.

### 🔍 Motor de Consultas (ISS / CNAE)
- Busca Universal e Avançada combinando descrições, códigos LC e CNAEs.
- Autocomplete, Histórico de 5 últimas pesquisas de usuário e Exportação em CSV.
- Processamento assíncrono (Debounce local) de altos volumes de pesquisa para evitar gargalos.

### 📡 Sistema de Processamento de Arquivos
- **Processos e Pareceres**: Ferramentas emuladas que agora contam com sistema de uploads monitorado.
- **Cancelamento Assíncrono**: Painel nativo para cancelamento e limpeza de cache de requisições de upload pesadas sendo processadas em back-end no Node.js.

### 📊 Painéis de Administração
- Indicadores de Acessos (KPIs tracking), buscas mensais e controle minucioso do fluxo de uso diário na aba Dashboard.
- Controle direto sob usuários, reset amigável de senhas e monitoramento de atividades recentes de consultas.

## 📁 Arquitetura do Projeto

A evolução estrutural migrou de um projeto puramente estático para uma API Express e banco interligado:
```
Consult_ItemXCNAE/
├── index.html        # Front-End Dinâmico
├── script.js         # Orquestração do Front-End (React + Fetch API)
├── style.css         # Estilização CSS e Tailwind injetado
├── server.js         # API Node.js / Express Backend
├── .env              # Variáveis de Ambiente e Secret do JWT
├── dev.sqlite3       # Banco Local (Desenvolvimento/Offline)
└── prisma/           # Estruturas antigas de modelagem (opcional dependendo da build)
```

## 🛠️ Tecnologias Utilizadas

- **Frontend**: React 18, Babel (in-browser para testes rápidos), Tailwind CSS (CDN/Customizadas), Lucide-React (Ícones).
- **Backend API**: Node.js, Express.
- **Segurança Backend**: `jsonwebtoken` (JWT), `bcrypt` (Hashing de Senhas).
- **Banco de Dados (DB Híbrido)**: 
  - `sqlite3`: Autoconfigurado em ambiente local.
  - `pg` (PostgreSQL): Configurado para deploy no **Railway** ou VPS através de `DATABASE_URL`.

## 🚀 Como Usar e Deploy Inicial

### Executando Localmente (Desenvolvimento)
1. Certifique-se de ter o [Node.js](https://nodejs.org/) instalado.
2. Clone o repositório na sua máquina.
3. Instale as dependências executando:
   ```bash
   npm install
   ```
4. Crie um usuário Admin Padrão (ele é auto-gerado caso o banco esteja vazio) rodando a aplicação:
   ```bash
   node server.js
   # ou npm run dev (se tiver nodemon configurado)
   ```
5. Acesse na máquina `http://localhost:3001`
   - O primeiro usuário cadastrado que coincida com a regra de admin (ex. nome admin/Admin@123) possuirá os direitos máximos.

### Gestão de Custos e Infraestrutura (Railway)
O projeto é otimizado para custo zero/mínimo:
- **Fallback Inteligente**: Utiliza `SQLite` local por padrão, migrando para PostgreSQL apenas se detectada a `DATABASE_URL`.
- **Stateless**: Projetado para rodar em instâncias eficientes da Railway sem necessidade de volumes caros.

## 📱 Compatibilidade & Performance
- Suporte Full PWA Concept: Interface adaptativa aos cartões mobile, scrollbar customizado e modais dinâmicos com limite de viewport.
- Multi-Theme (Dark/Light mode) persistido individualmente por perfil de autenticação.

---
**Desenvolvedor**: Murilo Miguel
*© 2026 Ecossistema DIAAF - Inteligência e Gestão Fiscal*