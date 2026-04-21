# 🚀 Como publicar o site da Thais Barboza (GRÁTIS)

Este guia foi escrito para quem **não é desenvolvedor**. Você vai colocar no ar:
- **Site público** (`/`) — página institucional
- **Painel de gestão** (`/admin/`) — agenda, pacientes, financeiro

Tudo gratuito, sem servidor, sem banco de dados.

---

## ✅ Antes de começar

### O que você precisa:
1. Uma conta de e-mail (Gmail serve)
2. Um navegador (Chrome / Edge / Firefox)
3. A pasta `thais-barboza-site` (esta pasta)

### ⚠️ Sobre o painel de gestão
O painel salva os dados **dentro do navegador** (localStorage). Isso significa:
- ✔️ Zero custo, funciona offline, privacidade total
- ⚠️ Os dados ficam no computador/celular onde foram lançados
- ⚠️ Se limpar o cache do navegador, os dados somem

**👉 FAÇA BACKUP SEMANAL!** No painel: *Configurações → Exportar backup (JSON)*.

Se a Thais quiser usar em vários dispositivos simultaneamente (tipo celular + computador sincronizados), no futuro precisa de um backend (Firebase ou Supabase) — eu posso migrar quando for a hora.

---

## 🥇 Opção 1 — Netlify (RECOMENDADO — mais fácil)

### Passo a passo

1. Acesse **https://app.netlify.com/signup** e crie conta (use Google para ser mais rápido).

2. Após logar, você verá a tela "Sites". No rodapé ou no centro tem uma área escrita **"Drag and drop your site output folder here"** (arraste e solte).

3. Abra o Explorador de Arquivos e localize a pasta `thais-barboza-site`.

4. **Arraste a pasta inteira** para dentro da área indicada no Netlify.

5. Aguarde 10-30 segundos. Pronto! Netlify vai te dar um link tipo:
   `https://nome-aleatorio-123.netlify.app`

6. **Personalizar o endereço** (opcional mas recomendado):
   - No painel do Netlify, clique em **"Site configuration"** → **"Change site name"**
   - Escolha algo como `thais-barboza-nutri` → vira `https://thais-barboza-nutri.netlify.app`

### ✔️ Atualizar o site depois
Sempre que alterar qualquer arquivo:
- Abra o site no painel Netlify → aba **"Deploys"**
- Arraste a pasta `thais-barboza-site` novamente na área de deploy. Pronto — novo versão no ar em 30s.

---

## 🥈 Opção 2 — Vercel (alternativa boa)

1. Crie conta em **https://vercel.com/signup**
2. Dashboard → **"Add New..." → "Project"**
3. Escolha **"Continue with Browser Upload"** (ou instale o Vercel CLI se for confortável)
4. Arraste a pasta `thais-barboza-site`
5. Clique em **Deploy** — leva ~30s
6. URL final: `https://thais-barboza.vercel.app`

---

## 🥉 Opção 3 — GitHub Pages (se já usa GitHub)

1. Crie conta em **https://github.com** se ainda não tem
2. Crie um repositório novo público chamado `thais-barboza-site`
3. Faça upload dos arquivos (botão "Add file" → "Upload files") — arraste todos os arquivos da pasta
4. Commit → vai para a aba **Settings → Pages**
5. Em "Source", escolha `main` branch → `/ (root)` → Save
6. Em ~1-2 minutos o site estará em `https://SEU-USUARIO.github.io/thais-barboza-site/`

---

## 🔐 Configurações IMPORTANTES após o deploy

### 1. Mudar a senha do painel

- Acesse `SEU-SITE.netlify.app/admin/`
- Faça login com senha padrão: `nutri2026`
- Vá em **Configurações → Segurança → Alterar senha**
- **Escolha uma senha forte** e anote em local seguro

### 2. Preencher os dados reais

No arquivo `index.html`, substitua:
- Telefone: `(11) 98765-4321` → o número real da Thais
- E-mail: `contato@thaisbarboza.com.br` → e-mail real
- WhatsApp: `5511987654321` → número real (sem espaços, com DDD)
- Redes sociais: trocar `href="#"` pelos links reais do Instagram, Facebook, etc.
- CRN no rodapé: confirmar o número correto
- Endereço do consultório

👉 Abra `index.html` no **Notepad (Bloco de Notas)** ou **Notepad++** e use **Ctrl+H** (substituir) para trocar de uma vez.

### 3. Fotos reais

Nos arquivos está usando fotos de exemplo do Unsplash. Para trocar pela foto real da Thais:
1. Coloque as fotos na pasta `thais-barboza-site/img/` (crie essa pasta)
2. No `index.html`, procure as linhas com `images.unsplash.com` e troque:
   - Ex.: `src="img/thais-hero.jpg"` e `src="img/thais-sobre.jpg"`

---

## 🎯 Domínio personalizado (opcional — ~R$40/ano)

Se quiser usar `thaisbarboza.com.br` em vez de `.netlify.app`:

1. Compre o domínio em **Registro.br** (~R$40/ano) ou **Hostinger** (~R$50/ano)
2. No Netlify: **Domain settings → Add custom domain** → digite `thaisbarboza.com.br`
3. Netlify mostra os servidores DNS — copie os 4 endereços tipo `dns1.p01.nsone.net`
4. No Registro.br: **Minhas solicitações → seu domínio → DNS → alterar servidores DNS** → cole os 4 valores
5. Aguarde 4-24h para propagar. Pronto, site no domínio próprio com HTTPS grátis.

---

## 📋 Checklist Final

Antes de divulgar:
- [ ] Site abre em `.netlify.app`
- [ ] Painel `/admin/` abre e senha foi trocada
- [ ] Testou fazer login, criar paciente, agendar consulta, lançar receita
- [ ] Telefone, e-mail e WhatsApp reais foram colocados
- [ ] Links das redes sociais apontam para os perfis reais
- [ ] Testou em celular (abre no Chrome do celular e confere)
- [ ] Exportou o primeiro backup do painel

---

## 🆘 Problemas comuns

**"Site não abre, dá 404"**  
→ Confirme que a pasta tem o arquivo `index.html` direto na raiz (não dentro de subpasta).

**"Entro no painel mas perdi os dados"**  
→ Os dados ficam no navegador. Se limpou o cache ou trocou de dispositivo, vai abrir vazio. Use a função **Restaurar backup** em Configurações com o arquivo JSON salvo anteriormente.

**"Quero que dois celulares vejam os mesmos dados"**  
→ Isso exige um backend. Me chame para migrar para Firebase Firestore (gratuito até 1 GB de dados — suficiente para anos de uso).

**"Quero enviar e-mail automático pelo formulário do site"**  
→ O formulário atual só mostra sucesso local. Para receber e-mails de verdade, use **Formspree** (grátis até 50/mês): crie conta em formspree.io, copie o endpoint e cole no `<form>` do index.html.

---

## 📞 Suporte

Qualquer dúvida sobre o código, é só abrir os arquivos:
- `index.html` — estrutura do site público
- `css/style.css` — todas as cores e layout
- `admin/index.html` e `admin/js/admin.js` — painel

Está tudo comentado e organizado por seção.

Boa sorte! 🍀
