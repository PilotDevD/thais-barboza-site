/* =======================================================
   Servidor Express + libSQL — Thais Barboza Nutricionista
   - Local: banco SQLite em arquivo (server/data/data.db)
   - Produção: Turso (libSQL na nuvem, gratuito)
   - Mesma base de código para os dois
   ======================================================= */
const express = require('express');
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'tb-dev-secret-change-in-production';
const DEFAULT_PW = process.env.DEFAULT_ADMIN_PASSWORD || 'nutri2026';

// ---------- DB SETUP ----------
let db;
if (process.env.DATABASE_URL) {
    db = createClient({
        url: process.env.DATABASE_URL,
        authToken: process.env.DATABASE_AUTH_TOKEN
    });
    console.log('→ Conectado ao banco remoto (Turso)');
} else {
    const DATA_DIR = path.join(__dirname, 'data');
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    db = createClient({ url: 'file:' + path.join(DATA_DIR, 'data.db') });
    console.log('→ Usando banco local: server/data/data.db');
}

async function initSchema() {
    await db.batch([
        `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            password_hash TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS patients (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT, phone TEXT, birthdate TEXT,
            height TEXT, weight TEXT, target TEXT,
            goal TEXT, notes TEXT,
            created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS appointments (
            id TEXT PRIMARY KEY,
            patient_id TEXT NOT NULL,
            date TEXT NOT NULL, time TEXT NOT NULL,
            service_id TEXT, service_name TEXT,
            duration INTEGER DEFAULT 60,
            price REAL DEFAULT 0,
            status TEXT DEFAULT 'agendada',
            paid INTEGER DEFAULT 0,
            notes TEXT,
            created_at INTEGER NOT NULL
        )`,
        `CREATE TABLE IF NOT EXISTS transactions (
            id TEXT PRIMARY KEY,
            appt_id TEXT,
            type TEXT NOT NULL,
            category TEXT,
            amount REAL NOT NULL,
            date TEXT NOT NULL,
            description TEXT,
            created_at INTEGER NOT NULL
        )`,
        `CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(date)`,
        `CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_id)`,
        `CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date)`
    ], 'write');

    // Seed user
    const u = (await db.execute('SELECT id FROM users LIMIT 1')).rows[0];
    if (!u) {
        await db.execute({
            sql: 'INSERT INTO users (password_hash) VALUES (?)',
            args: [bcrypt.hashSync(DEFAULT_PW, 10)]
        });
        console.log('→ Usuário criado. Senha padrão:', DEFAULT_PW);
    }

    // Seed config
    const s = (await db.execute({ sql: 'SELECT value FROM settings WHERE key=?', args: ['config'] })).rows[0];
    if (!s) {
        const defaultConfig = {
            profile: { name: 'Thais Barboza', crn: 'CRN-3 38.291', email: 'contato@thaisbarboza.com.br', phone: '(11) 98765-4321' },
            services: [
                { id: 's1', name: 'Consulta Inicial', duration: 60, price: 250 },
                { id: 's2', name: 'Retorno', duration: 45, price: 180 },
                { id: 's3', name: 'Cardápio Desinchar', duration: 30, price: 197 },
                { id: 's4', name: 'Consulta Online', duration: 50, price: 220 }
            ],
            expenseCats: ['Aluguel', 'Marketing', 'Material', 'Plano de Saúde', 'Impostos', 'Outros'],
            incomeCats: ['Consulta', 'Programa', 'E-book', 'Parceria', 'Outros']
        };
        await db.execute({
            sql: 'INSERT INTO settings (key, value) VALUES (?, ?)',
            args: ['config', JSON.stringify(defaultConfig)]
        });
    }
}

// ---------- HELPERS ----------
const q = (sql, args = []) => db.execute({ sql, args });
const one = async (sql, args = []) => (await q(sql, args)).rows[0];
const many = async (sql, args = []) => (await q(sql, args)).rows;

const getConfig = async () => JSON.parse((await one('SELECT value FROM settings WHERE key=?', ['config'])).value);
const saveConfig = (cfg) => q('UPDATE settings SET value=? WHERE key=?', [JSON.stringify(cfg), 'config']);

const mapPatient = (p) => ({
    id: p.id, name: p.name, email: p.email, phone: p.phone,
    birthdate: p.birthdate, height: p.height, weight: p.weight,
    target: p.target, goal: p.goal, notes: p.notes, createdAt: Number(p.created_at)
});
const mapAppt = (a) => ({
    id: a.id, patientId: a.patient_id, date: a.date, time: a.time,
    serviceId: a.service_id, serviceName: a.service_name, duration: Number(a.duration),
    price: Number(a.price), status: a.status, paid: !!a.paid, notes: a.notes, createdAt: Number(a.created_at)
});
const mapTx = (t) => ({
    id: t.id, apptId: t.appt_id, type: t.type, category: t.category,
    amount: Number(t.amount), date: t.date, description: t.description, createdAt: Number(t.created_at)
});

// ---------- AUTH MIDDLEWARE ----------
function auth(req, res, next) {
    const h = req.headers.authorization || '';
    const token = h.startsWith('Bearer ') ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'unauthorized' });
    try {
        jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'invalid_token' });
    }
}

// ---------- EXPRESS ----------
app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Healthcheck (usado pelo Render)
app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---------- AUTH ROUTES ----------
app.post('/api/auth/login', async (req, res) => {
    try {
        const u = await one('SELECT * FROM users LIMIT 1');
        if (!u || !bcrypt.compareSync(req.body.password || '', u.password_hash)) {
            return res.status(401).json({ error: 'credenciais inválidas' });
        }
        const token = jwt.sign({ sub: Number(u.id) }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ token });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/change-password', auth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'senha muito curta' });
        const u = await one('SELECT * FROM users LIMIT 1');
        if (!bcrypt.compareSync(oldPassword || '', u.password_hash)) {
            return res.status(401).json({ error: 'senha atual incorreta' });
        }
        await q('UPDATE users SET password_hash=? WHERE id=?', [bcrypt.hashSync(newPassword, 10), u.id]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- BOOTSTRAP ----------
app.get('/api/bootstrap', auth, async (req, res) => {
    try {
        res.json({
            config: await getConfig(),
            patients: (await many('SELECT * FROM patients ORDER BY name')).map(mapPatient),
            appointments: (await many('SELECT * FROM appointments')).map(mapAppt),
            transactions: (await many('SELECT * FROM transactions')).map(mapTx)
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- PATIENTS ----------
app.post('/api/patients', auth, async (req, res) => {
    try {
        const p = req.body;
        if (!p.id || !p.name) return res.status(400).json({ error: 'id e nome obrigatórios' });
        await q(`INSERT INTO patients (id,name,email,phone,birthdate,height,weight,target,goal,notes,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
            [p.id, p.name, p.email || '', p.phone || '', p.birthdate || '',
             String(p.height || ''), String(p.weight || ''), String(p.target || ''),
             p.goal || '', p.notes || '', p.createdAt || Date.now()]);
        res.json(p);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/patients/:id', auth, async (req, res) => {
    try {
        const p = req.body;
        await q(`UPDATE patients SET name=?, email=?, phone=?, birthdate=?, height=?, weight=?, target=?, goal=?, notes=? WHERE id=?`,
            [p.name, p.email || '', p.phone || '', p.birthdate || '',
             String(p.height || ''), String(p.weight || ''), String(p.target || ''),
             p.goal || '', p.notes || '', req.params.id]);
        res.json(p);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/patients/:id', auth, async (req, res) => {
    try { await q('DELETE FROM patients WHERE id=?', [req.params.id]); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- APPOINTMENTS ----------
app.post('/api/appointments', auth, async (req, res) => {
    try {
        const a = req.body;
        if (!a.id || !a.patientId || !a.date || !a.time) return res.status(400).json({ error: 'campos obrigatórios faltando' });
        await q(`INSERT INTO appointments (id,patient_id,date,time,service_id,service_name,duration,price,status,paid,notes,created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
            [a.id, a.patientId, a.date, a.time, a.serviceId || '', a.serviceName || '',
             a.duration || 60, a.price || 0, a.status || 'agendada', a.paid ? 1 : 0,
             a.notes || '', a.createdAt || Date.now()]);
        res.json(a);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/appointments/:id', auth, async (req, res) => {
    try {
        const a = req.body;
        await q(`UPDATE appointments SET patient_id=?, date=?, time=?, service_id=?, service_name=?, duration=?, price=?, status=?, paid=?, notes=? WHERE id=?`,
            [a.patientId, a.date, a.time, a.serviceId || '', a.serviceName || '',
             a.duration || 60, a.price || 0, a.status, a.paid ? 1 : 0, a.notes || '', req.params.id]);
        res.json(a);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/appointments/:id', auth, async (req, res) => {
    try {
        await db.batch([
            { sql: 'DELETE FROM transactions WHERE appt_id=?', args: [req.params.id] },
            { sql: 'DELETE FROM appointments WHERE id=?', args: [req.params.id] }
        ], 'write');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- TRANSACTIONS ----------
app.post('/api/transactions', auth, async (req, res) => {
    try {
        const t = req.body;
        if (!t.id || !t.type || !t.date || t.amount == null) return res.status(400).json({ error: 'campos obrigatórios faltando' });
        await q(`INSERT INTO transactions (id,appt_id,type,category,amount,date,description,created_at)
            VALUES (?,?,?,?,?,?,?,?)`,
            [t.id, t.apptId || null, t.type, t.category || '',
             Number(t.amount), t.date, t.description || '', t.createdAt || Date.now()]);
        res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/transactions/:id', auth, async (req, res) => {
    try {
        const t = req.body;
        await q(`UPDATE transactions SET type=?, category=?, amount=?, date=?, description=? WHERE id=?`,
            [t.type, t.category || '', Number(t.amount), t.date, t.description || '', req.params.id]);
        res.json(t);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/transactions/:id', auth, async (req, res) => {
    try { await q('DELETE FROM transactions WHERE id=?', [req.params.id]); res.json({ ok: true }); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- CONFIG ----------
app.patch('/api/config', auth, async (req, res) => {
    try {
        const merged = { ...(await getConfig()), ...req.body };
        await saveConfig(merged);
        res.json(merged);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- BACKUP / RESTORE ----------
app.get('/api/backup', auth, async (req, res) => {
    try {
        res.json({
            version: 1,
            exportedAt: new Date().toISOString(),
            config: await getConfig(),
            patients: (await many('SELECT * FROM patients')).map(mapPatient),
            appointments: (await many('SELECT * FROM appointments')).map(mapAppt),
            transactions: (await many('SELECT * FROM transactions')).map(mapTx)
        });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/restore', auth, async (req, res) => {
    try {
        const d = req.body;
        if (!d.config || !Array.isArray(d.patients)) return res.status(400).json({ error: 'backup inválido' });
        const stmts = [
            { sql: 'DELETE FROM transactions', args: [] },
            { sql: 'DELETE FROM appointments', args: [] },
            { sql: 'DELETE FROM patients', args: [] },
            { sql: 'UPDATE settings SET value=? WHERE key=?', args: [JSON.stringify(d.config), 'config'] }
        ];
        for (const p of d.patients) stmts.push({
            sql: 'INSERT INTO patients (id,name,email,phone,birthdate,height,weight,target,goal,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
            args: [p.id, p.name || '', p.email || '', p.phone || '', p.birthdate || '',
                   String(p.height || ''), String(p.weight || ''), String(p.target || ''), p.goal || '', p.notes || '', p.createdAt || Date.now()]
        });
        for (const a of (d.appointments || [])) stmts.push({
            sql: 'INSERT INTO appointments (id,patient_id,date,time,service_id,service_name,duration,price,status,paid,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
            args: [a.id, a.patientId, a.date, a.time, a.serviceId || '', a.serviceName || '',
                   a.duration || 60, a.price || 0, a.status || 'agendada', a.paid ? 1 : 0, a.notes || '', a.createdAt || Date.now()]
        });
        for (const t of (d.transactions || [])) stmts.push({
            sql: 'INSERT INTO transactions (id,appt_id,type,category,amount,date,description,created_at) VALUES (?,?,?,?,?,?,?,?)',
            args: [t.id, t.apptId || null, t.type, t.category || '',
                   Number(t.amount), t.date, t.description || '', t.createdAt || Date.now()]
        });
        await db.batch(stmts, 'write');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/reset', auth, async (req, res) => {
    try {
        await db.batch([
            'DELETE FROM transactions',
            'DELETE FROM appointments',
            'DELETE FROM patients'
        ], 'write');
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ---------- STATIC FILES ----------
const SITE_DIR = path.join(__dirname, '..');
app.use(express.static(SITE_DIR));

app.use((req, res) => {
    if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'rota não encontrada' });
    res.status(404).send('Página não encontrada');
});

// ---------- START ----------
(async () => {
    try {
        await initSchema();
        app.listen(PORT, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════════╗');
            console.log('║  Thais Barboza — Servidor rodando              ║');
            console.log('╠════════════════════════════════════════════════╣');
            console.log(`║  Porta:   ${PORT}                                 ║`);
            console.log(`║  Site:    http://localhost:${PORT}                 ║`);
            console.log(`║  Painel:  http://localhost:${PORT}/admin/          ║`);
            console.log('╚════════════════════════════════════════════════╝');
            console.log('');
        });
    } catch (e) {
        console.error('Falha ao iniciar:', e);
        process.exit(1);
    }
})();
