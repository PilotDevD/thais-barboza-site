# 🚀 Deploy em produção — GRÁTIS

Este guia coloca o sistema inteiro (site + painel + API + banco de dados) no ar,
usando apenas **serviços gratuitos**. Tempo estimado: **30 minutos**.

**Stack:**
- **GitHub** — armazena o código (grátis)
- **Turso** — banco de dados SQLite na nuvem (grátis até 500 DBs / 9GB total)
- **Render.com** — servidor Node.js (grátis, 750h/mês)

---

## ✅ Pré-requisitos

- Uma conta de e-mail (Gmail serve)
- 30 minutos
- **NÃO precisa** instalar Git, nem usar linha de comando, nem cartão de crédito

---

# PARTE 1 — Código no GitHub

### 1.1 Criar conta GitHub

1. Acesse **https://github.com/signup**
2. Crie conta (pode usar Google)
3. Confirme o e-mail

### 1.2 Criar repositório

1. Logado no GitHub, clique no **"+"** no topo direito → **"New repository"**
2. Preencha:
   - **Repository name:** `thais-barboza-site`
   - **Public** (marcado)
   - **NÃO** marque nada em "Add a README", "Add .gitignore", etc — deixe tudo vazio
3. Clique em **"Create repository"**

### 1.3 Fazer upload dos arquivos

1. Na página do repositório recém-criado, clique em **"uploading an existing file"** (link azul no meio da tela)
2. Abra o Explorador de Arquivos no seu computador, entre em `thais-barboza-site`
3. **Selecione todos os arquivos e pastas EXCETO:**
   - ❌ `server/node_modules/` (pasta)
   - ❌ `server/data/` (pasta)
   - ✅ **Selecione tudo o resto** (index.html, css/, js/, admin/, server/package.json, server/server.js, server/.gitignore, .gitignore, render.yaml, todos os .md)
4. Arraste para dentro da área do GitHub
5. No final da página: digite em "Commit changes" algo como `primeira versão` → clique em **"Commit changes"**

⚠️ Se por acaso subir `node_modules` junto, não tem problema — o `.gitignore` vai ignorar no próximo envio.

---

# PARTE 2 — Banco de dados (Turso)

### 2.1 Criar conta Turso

1. Acesse **https://turso.tech**
2. Clique em **"Sign up"** → entre com **GitHub** (usa a conta que você acabou de criar)
3. Permita o acesso

### 2.2 Criar o banco

Turso tem uma interface web simples.

1. No dashboard Turso, clique em **"Create Database"**
2. Preencha:
   - **Name:** `thais-barboza`
   - **Location:** escolha a mais próxima (ex.: `São Paulo (gru)` se disponível, senão `Miami (mia)`)
3. Clique em **Create**

### 2.3 Pegar credenciais

1. Clique no banco recém-criado para abrir os detalhes
2. Você vai ver a **"Database URL"** — algo como `libsql://thais-barboza-seuusuario.turso.io`
3. **Copie essa URL e salve no bloco de notas**
4. Ainda na página do banco, aba **"Generate Token"** (ou "+ Create Token" em algum lugar)
   - Name: `producao`
   - Expiration: `Never` (ou o máximo disponível)
   - Clique em Generate / Create
5. **Copie o token que aparece e salve no bloco de notas** (não vai conseguir ver de novo)

Agora você tem duas coisas salvas:
```
DATABASE_URL = libsql://thais-barboza-xxxxx.turso.io
DATABASE_AUTH_TOKEN = eyJhbGciOiJFZERTQSI...
```

---

# PARTE 3 — Servidor (Render.com)

### 3.1 Criar conta Render

1. Acesse **https://dashboard.render.com/register**
2. Clique em **"GitHub"** para entrar com a conta GitHub
3. Autorize o Render a acessar seus repositórios (quando pedir, selecione "Only select repositories" e escolha `thais-barboza-site`)

### 3.2 Criar Web Service

1. No dashboard do Render, clique em **"+ New"** (canto superior direito) → **"Web Service"**
2. Selecione o repositório **`thais-barboza-site`** na lista → **"Connect"**
3. Na tela de configuração, preencha:
   - **Name:** `thais-barboza` (ou o que preferir)
   - **Region:** `Oregon (US West)` ou `Frankfurt` (o que estiver disponível grátis)
   - **Branch:** `main`
   - **Root Directory:** `server`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** **Free** (clique em "Free" se houver outras opções)

### 3.3 Adicionar variáveis de ambiente

Ainda na tela de criação, role até a seção **"Environment Variables"** e clique em **"Add Environment Variable"**. Adicione **uma por uma**:

| Key (nome) | Value (valor) |
|---|---|
| `DATABASE_URL` | (cole a URL do Turso que você salvou) |
| `DATABASE_AUTH_TOKEN` | (cole o token do Turso) |
| `JWT_SECRET` | (escreva uma senha longa e aleatória, tipo `xkj8Kq2mPz9Lw4Rn7vBtYh`) |
| `DEFAULT_ADMIN_PASSWORD` | (a senha que você vai usar para logar no painel — escolha uma forte) |
| `NODE_VERSION` | `20` |

### 3.4 Deploy!

1. Clique em **"Create Web Service"** no final da página
2. O Render vai começar o build — aguarde 3-5 minutos
3. Quando terminar, você verá **"Your service is live 🎉"** e uma URL tipo `https://thais-barboza.onrender.com`

---

# PARTE 4 — Testar!

1. Abra `https://thais-barboza.onrender.com` → você vê o **site público**
2. Abra `https://thais-barboza.onrender.com/admin/` → tela de login
3. Use a senha que você definiu em `DEFAULT_ADMIN_PASSWORD`
4. Cadastre um paciente, crie uma consulta
5. **Feche tudo, espere 20 minutos, abra de novo** → os dados continuam lá (Turso persiste!)

---

# 🎁 Extras

## Domínio personalizado (thaisbarboza.com.br)

Quando a Thais comprar o domínio:

1. Registro.br ou Hostinger → comprar `thaisbarboza.com.br` (~R$40/ano)
2. No painel Render → sua aplicação → **Settings → Custom Domain** → Add `thaisbarboza.com.br`
3. Render mostra um CNAME/IP. No painel do registrador, cadastre esse DNS.
4. Aguardar 1-24h. HTTPS é automático.

## Cuidados com o Free Tier do Render

- O app **hiberna após 15 min sem acesso**. Quando alguém abrir depois, demora **~30 segundos** para "acordar" na primeira requisição. Depois fica rápido.
- Para o dia da apresentação: abra o site 1 min antes para "aquecer".
- Se quiser evitar hibernação: Render cobra $7/mês, ou use um serviço de ping (cron-job.org grátis pingando `/api/health` a cada 10 min).

## Atualizar o sistema depois

Qualquer mudança no código:
1. Edite o arquivo local
2. GitHub → seu repositório → navegue até o arquivo → ícone de lápis (editar) → fazer a alteração → **Commit changes**
3. Render detecta automaticamente e faz redeploy em ~2 min

## Backups periódicos

No painel → Configurações → **Exportar backup (JSON)** — faça isso mensalmente e guarde no Google Drive. Se algo der errado com Turso, você restaura em 1 clique.

---

# 🆘 Problemas comuns

**"Build failed" no Render**
→ Vá na aba **Logs** do Render e veja a mensagem. Geralmente é erro de variável de ambiente faltando ou typo na URL do Turso.

**"Cannot connect to database"**
→ Confirme que `DATABASE_URL` começa com `libsql://` e `DATABASE_AUTH_TOKEN` está exato (sem espaços no começo/fim).

**Login no painel não funciona**
→ Na primeira vez, o servidor cria o usuário com a senha de `DEFAULT_ADMIN_PASSWORD`. Se você mudou essa variável DEPOIS do primeiro deploy, a senha original persistiu. Acesse o dashboard Turso, aba "Tables" → `users` → delete a linha → o servidor cria de novo com a nova senha no próximo deploy.

**Site abre mas `/admin/` dá 404**
→ Confirme que a pasta `admin/` foi enviada ao GitHub com todos os arquivos dentro (`index.html`, `css/`, `js/`).

**Primeira requisição muito lenta**
→ Normal no free tier. Para a apresentação, abra 1 min antes para "aquecer" o servidor.

---

## 📋 Resumo do que você vai ter

Após seguir este guia:

- ✅ Site público: `https://thais-barboza.onrender.com`
- ✅ Painel de gestão: `https://thais-barboza.onrender.com/admin/`
- ✅ Banco de dados persistente no Turso
- ✅ HTTPS automático
- ✅ Auto-deploy a cada commit no GitHub
- ✅ **Custo total: R$ 0,00**

Boa apresentação! 🍀
