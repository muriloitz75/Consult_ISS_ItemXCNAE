# Plano de Redesign do Layout - Consulta ISS

## 📋 Análise do Problema Atual

### Problemas Identificados

1. **Navegação Não Funcional**
   - O Sidebar tem itens de menu, mas as ações não navegam corretamente
   - `currentView` só alterna entre 'main' e 'profile'
   - Dashboard admin está sempre visível na página principal

2. **Layout Poluído**
   - Informações do usuário duplicadas (header + sidebar)
   - Botões de Perfil/Sair duplicados
   - Muitos elementos visuais competindo por atenção

3. **Conteúdo Sempre Visível**
   - Dashboard admin e área de consulta na mesma página
   - Não há separação clara entre seções
   - Falta de "páginas" distintas

---

## 🎯 Solução Proposta

### Nova Arquitetura de Navegação

```
┌─────────────────────────────────────────────────────────────┐
│                        LAYOUT PRINCIPAL                      │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│   SIDEBAR  │              CONTEÚDO PRINCIPAL                │
│   (80px    │                                                │
│   → 256px) │   ┌────────────────────────────────────────┐  │
│            │   │                                        │  │
│  ┌──────┐  │   │         VIEW ATUAL                     │  │
│  │ Home │  │   │                                        │  │
│  ├──────┤  │   │  • Home (Dashboard/Bem-vindo)          │  │
│  │Search│  │   │  • Consulta (Formulário de busca)      │  │
│  ├──────┤  │   │  • Perfil (UserProfilePage)            │  │
│  │Profile│ │   │  • Admin Dashboard (Estatísticas)      │  │
│  ├──────┤  │   │  • Usuários (Gerenciamento)            │  │
│  │Admin │  │   │                                        │  │
│  └──────┘  │   └────────────────────────────────────────┘  │
│            │                                                │
│  [Avatar]  │                                                │
└────────────┴────────────────────────────────────────────────┘
```

### Estados de Navegação (currentView)

| View | Descrição | Conteúdo Exibido |
|------|-----------|------------------|
| `home` | Página inicial | Dashboard resumido + Boas-vindas |
| `search` | Consulta | Formulário de busca + Resultados |
| `profile` | Perfil do usuário | UserProfilePage |
| `admin-dashboard` | Dashboard Admin | Estatísticas e gráficos |
| `admin-users` | Gerenciar Usuários | Lista de usuários + Ações |

---

## 🎨 Design Proposto

### 1. Sidebar (Refinado)

- **Largura**: 80px (colapsado) → 256px (expandido no hover)
- **Estrutura**:
  - Logo/Header (sempre visível)
  - Menu Principal (Home, Consulta, Perfil)
  - Menu Admin (apenas para role='admin')
  - Footer com Avatar do usuário

### 2. Área de Conteúdo (Limpa)

- **Header minimalista**: Apenas título da página atual
- **Conteúdo dinâmico**: Renderiza apenas a view ativa
- **Sem duplicações**: Remover informações do usuário do header

### 3. Views Separadas

#### View: Home
```
┌────────────────────────────────────────┐
│  Bem-vindo, {nome}!                    │
│  {role === 'admin' ? 'Administrador' : 'Usuário'}  │
├────────────────────────────────────────┤
│                                        │
│  Cards de Resumo:                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ Consultas│ │ Usuários │ │  Status  ││
│  │   150    │ │    5     │ │  Online  ││
│  └──────────┘ └──────────┘ └──────────┘│
│                                        │
│  Acesso Rápido:                        │
│  [Nova Consulta]  [Ver Perfil]         │
│                                        │
└────────────────────────────────────────┘
```

#### View: Consulta
```
┌────────────────────────────────────────┐
│  Consulta Lista/CNAE/Alíquota          │
├────────────────────────────────────────┤
│                                        │
│  [Universal] [Especial]                │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │ Campo de busca...                │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Realizar Consulta]                   │
│                                        │
│  (Resultados em modal separado)        │
└────────────────────────────────────────┘
```

#### View: Perfil
```
┌────────────────────────────────────────┐
│  Meu Perfil                            │
├────────────────────────────────────────┤
│                                        │
│  [Avatar Grande]                       │
│                                        │
│  Nome: _______________                 │
│  Email: _______________                │
│  Usuário: ____________                 │
│                                        │
│  [Alterar Senha]                       │
│                                        │
│  [Salvar] [Cancelar]                   │
└────────────────────────────────────────┘
```

#### View: Admin Dashboard
```
┌────────────────────────────────────────┐
│  Dashboard Administrativo              │
├────────────────────────────────────────┤
│                                        │
│  Cards de Estatísticas:                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐│
│  │ Acessos  │ │ Consultas│ │ Usuários ││
│  │   500    │ │   150    │ │    5     ││
│  └──────────┘ └──────────┘ └──────────┘│
│                                        │
│  Gráficos:                             │
│  ┌────────────────┐ ┌────────────────┐ │
│  │ Acessos/User   │ │ Consultas/User │ │
│  └────────────────┘ └────────────────┘ │
│                                        │
│  Últimas Consultas:                    │
│  (lista)                               │
└────────────────────────────────────────┘
```

#### View: Gerenciar Usuários
```
┌────────────────────────────────────────┐
│  Gerenciar Usuários                    │
├────────────────────────────────────────┤
│  [Novo Usuário]                        │
│                                        │
│  Pendentes (3):                        │
│  ┌──────────────────────────────────┐  │
│  │ João - joao@email.com [Autorizar]│  │
│  │ Maria - maria@email.com [Autorizar]│ │
│  └──────────────────────────────────┘  │
│                                        │
│  Usuários Ativos:                      │
│  ┌──────────────────────────────────┐  │
│  │ admin - Administrador            │  │
│  │ user - Usuário [Bloquear][Reset] │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

---

## 🔧 Implementação Técnica

### Mudanças no Estado (App Component)

```javascript
// Estado atual
const [currentView, setCurrentView] = useState('main');
const [showDashboard, setShowDashboard] = useState(true);

// Novo estado proposto
const [currentView, setCurrentView] = useState('home');
// Views: 'home' | 'search' | 'profile' | 'admin-dashboard' | 'admin-users'
```

### Mudanças no Sidebar

```javascript
const menuItems = [
    { id: 'home', label: 'Início', icon: HomeIcon, view: 'home' },
    { id: 'search', label: 'Consulta', icon: SearchIcon, view: 'search' },
    { id: 'profile', label: 'Meu Perfil', icon: ProfileIcon, view: 'profile' }
];

const adminItems = [
    { id: 'admin-dashboard', label: 'Dashboard', icon: DashboardIcon, view: 'admin-dashboard' },
    { id: 'admin-users', label: 'Usuários', icon: UsersIcon, view: 'admin-users' }
];
```

### Estrutura de Renderização

```javascript
// No componente App
const renderContent = () => {
    switch(currentView) {
        case 'home':
            return <HomeView />;
        case 'search':
            return <SearchView />;
        case 'profile':
            return <UserProfilePage />;
        case 'admin-dashboard':
            return <AdminDashboard />;
        case 'admin-users':
            return <AdminUsers />;
        default:
            return <HomeView />;
    }
};
```

---

## 📱 Responsividade

- **Desktop**: Sidebar visível, conteúdo ao lado
- **Tablet**: Sidebar colapsada (80px), expande no hover
- **Mobile**: Sidebar oculta, botão hamburger para abrir

---

## ✅ Checklist de Implementação

1. [ ] Atualizar estado de navegação no App
2. [ ] Refatorar Sidebar para usar views
3. [ ] Criar componente HomeView
4. [ ] Separar SearchView do conteúdo atual
5. [ ] Criar AdminDashboard separado
6. [ ] Criar AdminUsers separado
7. [ ] Remover elementos duplicados do header
8. [ ] Limpar CSS não utilizado
9. [ ] Testar navegação completa
10. [ ] Testar responsividade

---

## 🎯 Benefícios Esperados

1. **Navegação Clara**: Usuário sabe onde está
2. **Interface Limpa**: Sem duplicações
3. **UX Profissional**: Transições suaves entre views
4. **Manutenibilidade**: Código organizado por views
5. **Escalabilidade**: Fácil adicionar novas views
