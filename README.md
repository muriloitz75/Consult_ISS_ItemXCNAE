# Sistema de Consulta de Serviços & CNAEs

Uma aplicação web moderna e intuitiva para consulta de serviços fiscais e códigos CNAE, desenvolvida especialmente para profissionais fiscais e contábeis.

## 🚀 Funcionalidades

### 🔍 Modos de Busca
- **Busca Universal**: Pesquisa inteligente que identifica automaticamente o tipo de consulta
- **Busca Avançada**: Filtros específicos para cada campo (Código, Serviço, CNAE)

### 🎨 Interface
- **Modo Escuro/Claro**: Alternância entre temas para melhor experiência visual
- **Design Responsivo**: Funciona perfeitamente em desktop, tablet e mobile
- **Animações Suaves**: Transições e efeitos visuais modernos

### 🔐 Gestão de Acesso (Novo)
- **Aprovação de Cadastros**: Novos usuários requerem aprovação manual do administrador.
- **Reset de Senha Admin**: Administradores podem resetar senhas de usuários para um padrão temporário.
- **Bloqueio de Usuários**: Funcionalidade para bloquear/desbloquear acesso de usuários instantaneamente.
- **Segurança Reforçada**: Feedback imediato de bloqueio e expiração de sessão.

### 📊 Recursos Avançados
- **Autocomplete**: Sugestões automáticas durante a digitação
- **Histórico de Busca**: Armazena as últimas 5 pesquisas realizadas
- **Exportação CSV**: Exporta os resultados filtrados para planilha
- **Filtros por Categoria**: Visualização focada em Serviços ou CNAEs
- **Debounce**: Otimização de performance nas buscas

## 📁 Estrutura do Projeto

```
Consult_ItemXCNAE/
├── index.html          # Aplicação principal
├── dados.md            # Base de dados com registros e alíquotas pré-calculadas
└── README.md           # Documentação
```

## 🛠️ Tecnologias Utilizadas

- **React 18**: Framework JavaScript para interface de usuário
- **Tailwind CSS**: Framework CSS para estilização
- **Babel**: Transpilador JavaScript
- **LocalStorage**: Armazenamento local do histórico

## 🚀 Como Usar

### Instalação
1. Clone ou baixe o projeto
2. Certifique-se que o arquivo `dados.md` está na mesma pasta que `index.html`
3. Abra o arquivo `index.html` em qualquer navegador moderno (requer servidor local devido a políticas de CORS, ex: `python -m http.server`)

### Tipos de Busca

#### Busca Universal
- **Por Código**: Digite códigos como "1.01" ou "1"
- **Por CNAE**: Digite números como "61" ou "619060100"
- **Por Descrição**: Digite palavras-chave do serviço

#### Busca Avançada
- **Código do Item**: Busca exata ou por prefixo (ex: "1.01")
- **Descrição do Serviço**: Busca por palavras contidas na descrição
- **Código CNAE**: Busca por prefixo numérico (ex: "61")
- **Descrição do CNAE**: Busca por palavras na descrição do CNAE

### Filtros por Categoria
- **Todos**: Exibe todos os registros
- **Serviços**: Foca nos itens da Lista LC
- **CNAEs**: Foca nos códigos CNAE

## 📊 Base de Dados

O sistema utiliza uma base com **registros atualizados** contendo:
- **LIST LC**: Código do item da Lei Complementar nº 001/2003
- **Descrição do Serviço**: Descrição completa do serviço
- **CNAE**: Código Nacional de Atividade Econômica
- **Descrição do CNAE**: Descrição da atividade econômica
- **Alíquota ISS**: Taxa aplicada conforme regras específicas (Ex: Educação 2%, Saúde 3%, Construção 4%, Padrão 5%)

## 🎯 Casos de Uso

### Para Contadores
- Consulta rápida de códigos de serviço para emissão de notas fiscais
- Verificação de enquadramento CNAE para clientes
- Consulta imediata da alíquota de ISS aplicável
- Exportação de listas para análise em planilhas

### Para Fiscais
- Verificação de correspondência entre serviços e CNAEs
- Consulta de descrições detalhadas para autuações
- Histórico de consultas para relatórios

### Para Empresários
- Verificação do CNAE adequado para sua atividade
- Consulta de serviços permitidos por código
- Planejamento tributário com base nas alíquotas disponíveis

## 🔧 Funcionalidades Técnicas

### Performance
- **Debounce**: Evita buscas excessivas durante a digitação
- **Limitação de Resultados**: Exibe até 100 registros por vez
- **Memoização**: Cache de resultados para melhor performance

### Usabilidade
- **Autocomplete**: Sugestões baseadas nos dados reais
- **Histórico Persistente**: Mantém buscas entre sessões
- **Feedback Visual**: Indicadores de carregamento e estados

### Acessibilidade
- **Contraste**: Modo escuro para reduzir fadiga visual
- **Responsividade**: Adaptação automática a diferentes telas
- **Navegação por Teclado**: Suporte completo a navegação sem mouse

## 📱 Compatibilidade

- **Navegadores**: Chrome, Firefox, Safari, Edge (versões modernas)
- **Dispositivos**: Desktop, Tablet, Smartphone
- **Sistemas**: Windows, macOS, Linux, iOS, Android

## 🔄 Atualizações

Para atualizar a base de dados:
1. Substitua o arquivo `dados.md` pela nova versão preservando a estrutura de tabela Markdown
2. Mantenha a ordem das colunas: | LIST LC | Descrição LC | CNAE | Descrição CNAE | Alíquota |
3. Recarregue a página no navegador

## 📞 Suporte

Este sistema foi desenvolvido para ser:
- **Intuitivo**: Interface familiar e fácil de usar
- **Rápido**: Respostas instantâneas às consultas
- **Confiável**: Base de dados oficial e atualizada
- **Flexível**: Múltiplas formas de busca e filtros

---

**Desenvolvido com ❤️ para profissionais fiscais e contábeis**

**Desenvolvedor**: Murilo Miguel

*© 2026 Sistema de Consulta Fiscal*