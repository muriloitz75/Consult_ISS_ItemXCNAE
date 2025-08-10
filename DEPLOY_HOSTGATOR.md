# 🚀 Deploy no HostGator - Sistema de Consulta Fiscal

## 📋 Pré-requisitos

- Conta ativa no HostGator
- Acesso ao cPanel
- Cliente FTP (FileZilla recomendado)
- Domínio configurado

## 📁 Arquivos para Upload

Todos os arquivos do projeto devem ser enviados para a pasta `public_html` do seu domínio:

```
public_html/
├── .htaccess          # Configurações do servidor
├── index.html         # Página principal
├── script.js          # Lógica da aplicação
├── style.css          # Estilos CSS
└── dados.xml          # Base de dados
```

## 🔧 Passos para Deploy

### 1. Preparação dos Arquivos
- ✅ Todos os arquivos estão prontos
- ✅ Arquivo `.htaccess` configurado
- ✅ Aplicação otimizada para mobile
- ✅ Compressão GZIP habilitada

### 2. Upload via FTP

1. **Conecte-se ao FTP:**
   - Host: `ftp.seudominio.com.br`
   - Usuário: Seu usuário cPanel
   - Senha: Sua senha cPanel
   - Porta: 21

2. **Navegue até a pasta:**
   ```
   /public_html/
   ```

3. **Faça upload de todos os arquivos:**
   - `.htaccess`
   - `index.html`
   - `script.js`
   - `style.css`
   - `dados.xml`

### 3. Upload via cPanel File Manager

1. Acesse o cPanel
2. Clique em "Gerenciador de Arquivos"
3. Navegue até `public_html`
4. Clique em "Upload"
5. Selecione todos os arquivos do projeto
6. Aguarde o upload completar

## ⚙️ Configurações Importantes

### SSL/HTTPS (Recomendado)

Se você tem certificado SSL ativo:

1. Edite o arquivo `.htaccess`
2. Descomente as linhas de redirecionamento HTTPS:
   ```apache
   RewriteEngine On
   RewriteCond %{HTTPS} off
   RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
   ```

### Permissões de Arquivos

- **Arquivos:** 644
- **Pastas:** 755
- **`.htaccess`:** 644

## 🔍 Verificação do Deploy

1. **Teste a URL principal:**
   ```
   https://seudominio.com.br
   ```

2. **Verifique se carrega:**
   - ✅ Interface da aplicação
   - ✅ Dados XML carregando
   - ✅ Funcionalidade de busca
   - ✅ Modo escuro
   - ✅ Responsividade mobile

3. **Teste em diferentes dispositivos:**
   - Desktop
   - Tablet
   - Smartphone

## 🐛 Solução de Problemas

### Erro 500 - Internal Server Error
- Verifique permissões do `.htaccess`
- Confirme sintaxe do arquivo `.htaccess`

### Arquivos não carregam
- Verifique se todos os arquivos foram enviados
- Confirme nomes dos arquivos (case-sensitive)

### XML não carrega
- Verifique se `dados.xml` está na raiz
- Confirme permissões do arquivo (644)

### CSS/JS não aplicam
- Limpe cache do navegador
- Verifique console do navegador (F12)

## 📊 Otimizações Incluídas

- ✅ **Compressão GZIP** - Reduz tamanho dos arquivos
- ✅ **Cache de arquivos** - Melhora velocidade de carregamento
- ✅ **Headers de segurança** - Proteção adicional
- ✅ **Responsividade mobile** - Funciona em todos os dispositivos
- ✅ **SPA Configuration** - Navegação suave

## 🎯 URLs de Teste

Após o deploy, teste estas funcionalidades:

1. **Busca universal:** Digite qualquer termo
2. **Busca avançada:** Use filtros específicos
3. **Modo escuro:** Toggle no canto superior
4. **Mobile:** Teste em dispositivo móvel

## 📞 Suporte

Em caso de problemas:
1. Verifique logs de erro no cPanel
2. Teste localmente primeiro
3. Confirme configurações do HostGator

---

**✨ Aplicação pronta para produção!**

Desenvolvido por **Murilo Miguel** | © 2025