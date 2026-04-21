# 🖥️ Como rodar o sistema localmente

Guia passo a passo para testar na sua máquina **antes de publicar online**.

---

## 📦 Pré-requisito único: Node.js

Você precisa instalar o **Node.js** (plataforma que roda o servidor).

### Instalação (Windows / Mac)

1. Acesse **https://nodejs.org**
2. Baixe a versão **LTS** (botão verde à esquerda — atualmente 20.x)
3. Execute o instalador e clique em **"Next"** em tudo (padrões já estão ok)
4. Depois de instalar, abra o **Prompt de Comando** (Windows) ou **Terminal** (Mac) e digite:

   ```
   node --version
   ```
   Deve aparecer algo como `v20.x.x`. Se aparecer, deu certo.

---

## ▶️ Primeira execução

### 1. Abra o terminal na pasta do servidor

**Windows:**
- Abra o Explorador de Arquivos
- Navegue até a pasta `thais-barboza-site/server`
- Na barra de endereço, digite `cmd` e pressione Enter
- Um prompt preto vai abrir já na pasta certa

**Mac / Linux:**
- Terminal → `cd /caminho/para/thais-barboza-site/server`

### 2. Instale as dependências (só na primeira vez)

No terminal, digite:

```
npm install
```

Aguarde 1-2 minutos. Vai aparecer um monte de texto — é normal. No final você verá algo como `added 55 packages`.

### 3. Inicie o servidor

```
npm start
```

Deve aparecer:

```
╔════════════════════════════════════════════════╗
║  Thais Barboza — Servidor rodando              ║
╠════════════════════════════════════════════════╣
║  Site:    http://localhost:3000                ║
║  Painel:  http://localhost:3000/admin/         ║
║  Senha:   nutri2026                            ║
╚════════════════════════════════════════════════╝
```

### 4. Abra no navegador

- **Site público:** http://localhost:3000
- **Painel de gestão:** http://localhost:3000/admin/

Faça login com senha `nutri2026`.

### 5. Para parar o servidor

No terminal, pressione **`Ctrl + C`**.

---

## 🗄️ Onde ficam os dados?

No arquivo `server/data/data.db`.

É um banco de dados **SQLite** (um único arquivo). Para fazer backup, é só copiar esse arquivo. Ou usar o botão **Exportar backup (JSON)** dentro das Configurações do painel.

⚠️ Se apagar `data.db`, **todos os dados são perdidos**. O servidor cria um novo vazio automaticamente.

---

## 🔁 Rodadas seguintes

Depois da primeira instalação, toda vez que quiser abrir o sistema:

1. Abrir terminal na pasta `server/`
2. Digitar `npm start`
3. Abrir http://localhost:3000/admin/

Só isso. Não precisa rodar `npm install` de novo.

---

## 🧪 Teste sugerido

1. Faça login (`nutri2026`)
2. **Configurações** → troque a senha
3. **Pacientes** → cadastre a Maria Silva
4. **Agenda** → crie uma consulta para ela amanhã às 14h, Consulta Inicial, R$ 250, status "Realizada", marque "pagamento recebido"
5. **Financeiro** → veja que a receita apareceu automaticamente
6. **Dashboard** → confira os KPIs
7. **Relatórios** → veja o gráfico anual
8. **Configurações** → Exportar backup → ganhe um JSON com tudo

---

## ⚠️ Problemas comuns

### `npm` não é reconhecido
→ Reinstale o Node.js e marque a opção "Add to PATH" no instalador.

### Porta 3000 já em uso
→ Feche o outro programa ou mude a porta: `set PORT=4000 && npm start` (Windows) ou `PORT=4000 npm start` (Mac/Linux).

### `Error: Cannot find module 'better-sqlite3'`
→ Você pulou o `npm install`. Rode `npm install` primeiro.

### `better-sqlite3` falha ao instalar
→ Precisa de ferramentas de build. No Windows: `npm install --global windows-build-tools` (como administrador). No Mac: `xcode-select --install`.

### Painel abre mas diz "senha incorreta" com `nutri2026`
→ O servidor não foi iniciado, ou está rodando em outra porta. Confirme o endereço no terminal.

### Dados sumiram de repente
→ Você apagou `server/data/data.db` ou renomeou a pasta. Restaure a partir de um backup JSON em Configurações.

---

## 🚀 Próximo passo: publicar online (grátis)

Quando tudo estiver funcionando local, para colocar no ar com o mesmo código, leia **`COMO-PUBLICAR-BACKEND.md`** (guia usando Render.com — gratuito com banco persistente).
