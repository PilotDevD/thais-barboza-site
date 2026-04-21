/* ==============================================================
   PAINEL DE GESTÃO - Thais Barboza Nutricionista
   100% client-side, dados em localStorage
   ============================================================== */

// ============ DB (cache local alimentado pela API) ============
const DB = {
    _cache: null,
    async bootstrap() {
        this._cache = await API.bootstrap();
        return this._cache;
    },
    load() {
        return this._cache || { config: { profile: {}, services: [], expenseCats: [], incomeCats: [] }, patients: [], appointments: [], transactions: [] };
    }
};

// ============ UTILS ============
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const fmtBRL = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (iso) => {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
};
const fmtDateShort = (iso) => {
    if (!iso) return '-';
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
};
const todayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const monthYearPt = (d) => d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ============ TOAST ============
function toast(msg, type = 'success') {
    const root = $('#toast-root');
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    const icon = type === 'error' ? 'fa-circle-xmark' : type === 'info' ? 'fa-circle-info' : 'fa-circle-check';
    el.innerHTML = `<i class="fas ${icon}"></i> <span>${escapeHtml(msg)}</span>`;
    root.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateX(40px)'; }, 2500);
    setTimeout(() => el.remove(), 2800);
}

// ============ MODAL ============
function openModal(html, opts = {}) {
    const root = $('#modal-root');
    root.innerHTML = `
        <div class="modal-overlay" id="modal-overlay">
            <div class="modal ${opts.size === 'lg' ? 'modal-lg' : ''}">${html}</div>
        </div>`;
    $('#modal-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });
    $$('[data-close]', root).forEach(b => b.addEventListener('click', closeModal));
}
function closeModal() { $('#modal-root').innerHTML = ''; }
function confirmDialog(msg, onYes) {
    openModal(`
        <div class="modal-header"><h3>Confirmar</h3><button class="modal-close" data-close>&times;</button></div>
        <div class="modal-body"><p>${escapeHtml(msg)}</p></div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-close>Cancelar</button>
            <button class="btn btn-danger" id="confirm-yes">Confirmar</button>
        </div>`);
    $('#confirm-yes').addEventListener('click', () => { closeModal(); onYes(); });
}

// ============ AUTH ============
const AUTH = {
    isAuthed() { return !!API.token; },
    async login(pw) {
        try { await API.login(pw); return true; }
        catch (e) { return false; }
    },
    logout() { API.logout(); location.reload(); }
};

// Helper: roda uma mutação na API e re-renderiza
async function syncAndRender(fn, successMsg) {
    try {
        await fn();
        await DB.bootstrap();
        if (successMsg) toast(successMsg);
        navigateTo(location.hash.slice(1) || 'dashboard');
    } catch (e) {
        toast(e.message || 'Erro ao salvar', 'error');
    }
}

// ============ ROUTER ============
const VIEW_TITLES = {
    dashboard: 'Dashboard',
    agenda: 'Agenda',
    pacientes: 'Pacientes',
    financeiro: 'Financeiro',
    relatorios: 'Relatórios',
    config: 'Configurações'
};

function navigateTo(view) {
    if (!VIEW_TITLES[view]) view = 'dashboard';
    location.hash = '#' + view;
    $('#view-title').textContent = VIEW_TITLES[view];
    $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    const container = $('#view-container');
    container.innerHTML = '';
    const fn = VIEWS[view];
    fn(container);
    $('#sidebar').classList.remove('open');
    $('.sidebar-overlay')?.classList.remove('open');
    window.scrollTo(0, 0);
}

// ============ DASHBOARD VIEW ============
const VIEWS = {};

VIEWS.dashboard = (root) => {
    const db = DB.load();
    const today = todayISO();
    const todayAppts = db.appointments.filter(a => a.date === today && a.status !== 'cancelada');
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTx = db.transactions.filter(t => t.date.startsWith(ym));
    const monthRevenue = monthTx.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
    const monthExp = monthTx.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);
    const pendingRevenue = db.appointments
        .filter(a => a.status === 'realizada' && !a.paid)
        .reduce((s, a) => s + Number(a.price || 0), 0);
    const nextAppts = db.appointments
        .filter(a => a.date >= today && a.status !== 'cancelada')
        .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
        .slice(0, 5);

    // last 6 months revenue
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const rev = db.transactions.filter(t => t.type === 'receita' && t.date.startsWith(k)).reduce((s, t) => s + Number(t.amount), 0);
        const exp = db.transactions.filter(t => t.type === 'despesa' && t.date.startsWith(k)).reduce((s, t) => s + Number(t.amount), 0);
        months.push({ label, rev, exp });
    }

    root.innerHTML = `
        <div class="view-header">
            <h2>Bom dia, ${escapeHtml(db.config.profile.name.split(' ')[0])}! 👋</h2>
            <button class="btn btn-primary" id="quick-appt"><i class="fas fa-plus"></i> Nova Consulta</button>
        </div>

        <div class="kpis">
            <div class="kpi">
                <div class="kpi-icon"><i class="fas fa-calendar-day"></i></div>
                <div class="kpi-label">Consultas Hoje</div>
                <div class="kpi-value">${todayAppts.length}</div>
                <div class="kpi-sub">${todayAppts.filter(a => a.status === 'realizada').length} realizada(s)</div>
            </div>
            <div class="kpi green">
                <div class="kpi-icon"><i class="fas fa-sack-dollar"></i></div>
                <div class="kpi-label">Receita do Mês</div>
                <div class="kpi-value">${fmtBRL(monthRevenue)}</div>
                <div class="kpi-sub">Líquido: ${fmtBRL(monthRevenue - monthExp)}</div>
            </div>
            <div class="kpi blue">
                <div class="kpi-icon"><i class="fas fa-user-friends"></i></div>
                <div class="kpi-label">Pacientes Ativos</div>
                <div class="kpi-value">${db.patients.length}</div>
                <div class="kpi-sub">+${db.patients.filter(p => {
        const d = new Date(p.createdAt || 0);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length} este mês</div>
            </div>
            <div class="kpi orange">
                <div class="kpi-icon"><i class="fas fa-hourglass-half"></i></div>
                <div class="kpi-label">A Receber</div>
                <div class="kpi-value">${fmtBRL(pendingRevenue)}</div>
                <div class="kpi-sub">Consultas realizadas sem pagamento</div>
            </div>
        </div>

        <div class="grid-2">
            <div class="card">
                <div class="card-header"><h3>Receita vs Despesa — Últimos 6 meses</h3></div>
                <div class="chart-wrap"><canvas id="chart-rev"></canvas></div>
            </div>
            <div class="card">
                <div class="card-header">
                    <h3>Próximas Consultas</h3>
                    <a href="#agenda" class="btn btn-sm btn-secondary">Ver todas</a>
                </div>
                <div class="appt-list" id="next-appts">
                    ${nextAppts.length === 0 ? '<div class="empty"><i class="fas fa-calendar"></i>Nenhuma consulta agendada.</div>' :
        nextAppts.map(a => {
            const p = db.patients.find(x => x.id === a.patientId);
            return `<div class="appt-item" data-id="${a.id}">
                                <div class="appt-time">${a.time}<small>${fmtDateShort(a.date)}</small></div>
                                <div class="appt-info">
                                    <strong>${escapeHtml(p?.name || 'Paciente removido')}</strong>
                                    <span>${escapeHtml(a.serviceName || '')} • ${fmtBRL(a.price)}</span>
                                </div>
                                <span class="badge badge-${a.status}">${a.status}</span>
                            </div>`;
        }).join('')}
                </div>
            </div>
        </div>
    `;

    $('#quick-appt').addEventListener('click', () => openApptModal());
    $$('#next-appts .appt-item').forEach(el => el.addEventListener('click', () => openApptModal(el.dataset.id)));

    const ctx = $('#chart-rev').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: months.map(m => m.label),
            datasets: [
                { label: 'Receita', data: months.map(m => m.rev), backgroundColor: '#7fb069', borderRadius: 6 },
                { label: 'Despesa', data: months.map(m => m.exp), backgroundColor: '#e4868f', borderRadius: 6 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } },
            scales: { y: { beginAtZero: true, ticks: { callback: v => 'R$ ' + v } } }
        }
    });
};

// ============ AGENDA VIEW ============
VIEWS.agenda = (root) => {
    const state = { view: 'lista', filter: 'all', month: new Date() };

    root.innerHTML = `
        <div class="view-header">
            <h2>Agenda</h2>
            <div style="display:flex; gap:8px; flex-wrap:wrap">
                <div class="tabs" style="margin:0">
                    <button class="tab-btn active" data-tab="lista">Lista</button>
                    <button class="tab-btn" data-tab="calendario">Calendário</button>
                </div>
                <button class="btn btn-primary" id="new-appt"><i class="fas fa-plus"></i> Nova Consulta</button>
            </div>
        </div>
        <div id="agenda-body"></div>
    `;

    $('#new-appt').addEventListener('click', () => openApptModal());
    $$('.tab-btn', root).forEach(b => b.addEventListener('click', () => {
        $$('.tab-btn', root).forEach(x => x.classList.toggle('active', x === b));
        state.view = b.dataset.tab;
        render();
    }));

    function render() {
        const body = $('#agenda-body');
        if (state.view === 'lista') renderList(body);
        else renderCal(body);
    }

    function renderList(body) {
        const db = DB.load();
        body.innerHTML = `
            <div class="filters">
                <input type="text" id="f-search" placeholder="Buscar paciente...">
                <select id="f-status">
                    <option value="all">Todos os status</option>
                    <option value="agendada">Agendada</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                </select>
                <input type="date" id="f-from">
                <input type="date" id="f-to">
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table class="table">
                        <thead><tr>
                            <th>Data</th><th>Hora</th><th>Paciente</th><th>Serviço</th>
                            <th>Valor</th><th>Status</th><th>Pago</th><th></th>
                        </tr></thead>
                        <tbody id="appts-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;

        const draw = () => {
            const term = $('#f-search').value.toLowerCase();
            const st = $('#f-status').value;
            const from = $('#f-from').value;
            const to = $('#f-to').value;
            const tbody = $('#appts-tbody');
            const items = db.appointments
                .filter(a => {
                    const p = db.patients.find(x => x.id === a.patientId);
                    if (term && !(p?.name || '').toLowerCase().includes(term)) return false;
                    if (st !== 'all' && a.status !== st) return false;
                    if (from && a.date < from) return false;
                    if (to && a.date > to) return false;
                    return true;
                })
                .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="empty"><i class="fas fa-calendar-xmark"></i>Nenhuma consulta encontrada.</td></tr>`;
                return;
            }
            tbody.innerHTML = items.map(a => {
                const p = db.patients.find(x => x.id === a.patientId);
                return `
                    <tr>
                        <td>${fmtDate(a.date)}</td>
                        <td>${a.time}</td>
                        <td>${escapeHtml(p?.name || '—')}</td>
                        <td>${escapeHtml(a.serviceName || '')}</td>
                        <td>${fmtBRL(a.price)}</td>
                        <td><span class="badge badge-${a.status}">${a.status}</span></td>
                        <td><span class="badge badge-${a.paid ? 'pago' : 'pendente'}">${a.paid ? 'Pago' : 'Pendente'}</span></td>
                        <td class="actions">
                            <button class="btn btn-icon btn-secondary" data-edit="${a.id}" title="Editar"><i class="fas fa-pen"></i></button>
                            <button class="btn btn-icon btn-danger" data-del="${a.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`;
            }).join('');

            $$('[data-edit]', tbody).forEach(b => b.addEventListener('click', () => openApptModal(b.dataset.edit)));
            $$('[data-del]', tbody).forEach(b => b.addEventListener('click', () => {
                confirmDialog('Excluir esta consulta?', () => {
                    syncAndRender(() => API.appointments.delete(b.dataset.del), 'Consulta excluída.');
                });
            }));
        };

        $('#f-search').addEventListener('input', draw);
        $('#f-status').addEventListener('change', draw);
        $('#f-from').addEventListener('change', draw);
        $('#f-to').addEventListener('change', draw);
        draw();
    }

    function renderCal(body) {
        const db = DB.load();
        const m = state.month;
        const year = m.getFullYear(), month = m.getMonth();
        const first = new Date(year, month, 1);
        const startDow = first.getDay();
        const days = new Date(year, month + 1, 0).getDate();
        const prevDays = new Date(year, month, 0).getDate();
        const cells = [];
        for (let i = startDow - 1; i >= 0; i--) cells.push({ day: prevDays - i, other: true, date: null });
        for (let d = 1; d <= days; d++) {
            const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            cells.push({ day: d, other: false, date: iso });
        }
        while (cells.length % 7 !== 0) cells.push({ day: cells.length - startDow - days + 1, other: true });
        const today = todayISO();

        body.innerHTML = `
            <div class="calendar">
                <div class="calendar-header">
                    <button class="btn btn-secondary btn-sm" id="cal-prev"><i class="fas fa-chevron-left"></i></button>
                    <h3>${monthYearPt(m)}</h3>
                    <button class="btn btn-secondary btn-sm" id="cal-next"><i class="fas fa-chevron-right"></i></button>
                </div>
                <div class="cal-grid">
                    ${['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => `<div class="cal-dow">${d}</div>`).join('')}
                    ${cells.map(c => {
            if (c.other) return `<div class="cal-day other"><div class="cal-day-num">${c.day}</div></div>`;
            const appts = db.appointments.filter(a => a.date === c.date && a.status !== 'cancelada');
            return `<div class="cal-day ${c.date === today ? 'today' : ''} ${appts.length ? 'has' : ''}" data-date="${c.date}">
                                <div class="cal-day-num">${c.day}</div>
                                <div class="cal-day-dots">${appts.slice(0,6).map(() => '<span class="cal-dot"></span>').join('')}</div>
                            </div>`;
        }).join('')}
                </div>
            </div>
            <div id="day-detail" style="margin-top:20px"></div>
        `;

        $('#cal-prev').addEventListener('click', () => { state.month = new Date(year, month - 1, 1); renderCal(body); });
        $('#cal-next').addEventListener('click', () => { state.month = new Date(year, month + 1, 1); renderCal(body); });
        $$('.cal-day[data-date]').forEach(el => el.addEventListener('click', () => showDay(el.dataset.date)));
        showDay(today);

        function showDay(date) {
            const appts = db.appointments.filter(a => a.date === date).sort((a, b) => a.time.localeCompare(b.time));
            const detail = $('#day-detail');
            detail.innerHTML = `
                <div class="card">
                    <div class="card-header">
                        <h3>${fmtDate(date)} — ${appts.length} consulta(s)</h3>
                        <button class="btn btn-primary btn-sm" id="add-appt-day"><i class="fas fa-plus"></i> Adicionar</button>
                    </div>
                    <div class="appt-list">
                        ${appts.length === 0 ? '<div class="empty"><i class="fas fa-calendar"></i>Sem consultas neste dia.</div>' :
                    appts.map(a => {
                        const p = db.patients.find(x => x.id === a.patientId);
                        return `<div class="appt-item" data-id="${a.id}">
                                <div class="appt-time">${a.time}</div>
                                <div class="appt-info">
                                    <strong>${escapeHtml(p?.name || '—')}</strong>
                                    <span>${escapeHtml(a.serviceName || '')} • ${fmtBRL(a.price)}</span>
                                </div>
                                <span class="badge badge-${a.status}">${a.status}</span>
                            </div>`;
                    }).join('')}
                    </div>
                </div>
            `;
            $('#add-appt-day').addEventListener('click', () => openApptModal(null, date));
            $$('.appt-item[data-id]', detail).forEach(el => el.addEventListener('click', () => openApptModal(el.dataset.id)));
        }
    }

    render();
};

// ============ APPOINTMENT MODAL ============
function openApptModal(id = null, defaultDate = null) {
    const db = DB.load();
    const existing = id ? db.appointments.find(a => a.id === id) : null;
    const services = db.config.services;
    const a = existing || {
        id: uid(), patientId: '', date: defaultDate || todayISO(), time: '09:00',
        serviceId: services[0]?.id || '', serviceName: services[0]?.name || '',
        price: services[0]?.price || 0, duration: services[0]?.duration || 60,
        status: 'agendada', paid: false, notes: ''
    };

    openModal(`
        <div class="modal-header">
            <h3>${existing ? 'Editar' : 'Nova'} Consulta</h3>
            <button class="modal-close" data-close>&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-field">
                <label>Paciente *</label>
                <select id="a-patient" required>
                    <option value="">Selecione...</option>
                    ${db.patients.map(p => `<option value="${p.id}" ${p.id === a.patientId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
                    <option value="__new__">+ Cadastrar novo paciente</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-field">
                    <label>Data *</label>
                    <input type="date" id="a-date" value="${a.date}" required>
                </div>
                <div class="form-field">
                    <label>Hora *</label>
                    <input type="time" id="a-time" value="${a.time}" required>
                </div>
            </div>
            <div class="form-field">
                <label>Serviço *</label>
                <select id="a-service">
                    ${services.map(s => `<option value="${s.id}" ${s.id === a.serviceId ? 'selected' : ''}>${escapeHtml(s.name)} (${s.duration}min)</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-field">
                    <label>Valor (R$)</label>
                    <input type="number" id="a-price" min="0" step="0.01" value="${a.price}">
                </div>
                <div class="form-field">
                    <label>Status</label>
                    <select id="a-status">
                        <option value="agendada" ${a.status === 'agendada' ? 'selected' : ''}>Agendada</option>
                        <option value="confirmada" ${a.status === 'confirmada' ? 'selected' : ''}>Confirmada</option>
                        <option value="realizada" ${a.status === 'realizada' ? 'selected' : ''}>Realizada</option>
                        <option value="cancelada" ${a.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                    </select>
                </div>
            </div>
            <div class="form-field">
                <label><input type="checkbox" id="a-paid" ${a.paid ? 'checked' : ''}> Pagamento recebido (gera receita automaticamente)</label>
            </div>
            <div class="form-field">
                <label>Observações</label>
                <textarea id="a-notes" rows="3">${escapeHtml(a.notes || '')}</textarea>
            </div>
        </div>
        <div class="modal-footer">
            ${existing ? '<button class="btn btn-danger" id="a-del" style="margin-right:auto"><i class="fas fa-trash"></i></button>' : ''}
            <button class="btn btn-secondary" data-close>Cancelar</button>
            <button class="btn btn-primary" id="a-save">Salvar</button>
        </div>
    `);

    const srvSel = $('#a-service');
    srvSel.addEventListener('change', () => {
        const s = services.find(x => x.id === srvSel.value);
        if (s) $('#a-price').value = s.price;
    });

    $('#a-patient').addEventListener('change', (e) => {
        if (e.target.value === '__new__') {
            e.target.value = a.patientId || '';
            openPatientModal(null, (newPatient) => {
                openApptModal(id, defaultDate);
                setTimeout(() => { $('#a-patient').value = newPatient.id; }, 50);
            });
        }
    });

    $('#a-save').addEventListener('click', async () => {
        const patientId = $('#a-patient').value;
        if (!patientId || patientId === '__new__') { toast('Selecione um paciente.', 'error'); return; }
        const srv = services.find(x => x.id === srvSel.value);
        const obj = {
            id: a.id, patientId,
            date: $('#a-date').value, time: $('#a-time').value,
            serviceId: srv.id, serviceName: srv.name, duration: srv.duration,
            price: Number($('#a-price').value) || 0,
            status: $('#a-status').value,
            paid: $('#a-paid').checked,
            notes: $('#a-notes').value.trim(),
            createdAt: existing?.createdAt || Date.now()
        };
        await syncAndRender(async () => {
            if (existing) await API.appointments.update(obj);
            else await API.appointments.create(obj);
            const cur = DB.load();
            const existingTx = cur.transactions.find(t => t.apptId === obj.id);
            if (obj.paid && obj.price > 0 && !existingTx) {
                const patient = cur.patients.find(p => p.id === obj.patientId);
                await API.transactions.create({
                    id: uid(), apptId: obj.id, type: 'receita',
                    category: 'Consulta', amount: obj.price, date: obj.date,
                    description: `${obj.serviceName} - ${patient?.name || ''}`,
                    createdAt: Date.now()
                });
            } else if (!obj.paid && existingTx) {
                await API.transactions.delete(existingTx.id);
            }
            closeModal();
        }, 'Consulta salva!');
    });

    if (existing) {
        $('#a-del').addEventListener('click', () => {
            confirmDialog('Excluir esta consulta?', () => {
                syncAndRender(async () => {
                    await API.appointments.delete(a.id);
                    closeModal();
                }, 'Consulta excluída.');
            });
        });
    }
}

// ============ PACIENTES VIEW ============
VIEWS.pacientes = (root) => {
    root.innerHTML = `
        <div class="view-header">
            <h2>Pacientes</h2>
            <button class="btn btn-primary" id="new-pat"><i class="fas fa-plus"></i> Novo Paciente</button>
        </div>
        <div class="filters">
            <input type="text" id="p-search" placeholder="Buscar por nome, email ou telefone...">
        </div>
        <div class="card">
            <div class="table-wrap">
                <table class="table">
                    <thead><tr>
                        <th>Nome</th><th>Contato</th><th>Objetivo</th>
                        <th>Consultas</th><th>Desde</th><th></th>
                    </tr></thead>
                    <tbody id="pat-tbody"></tbody>
                </table>
            </div>
        </div>
    `;
    $('#new-pat').addEventListener('click', () => openPatientModal());

    const draw = () => {
        const db = DB.load();
        const term = $('#p-search').value.toLowerCase();
        const items = db.patients.filter(p =>
            !term || p.name.toLowerCase().includes(term) ||
            (p.email || '').toLowerCase().includes(term) ||
            (p.phone || '').toLowerCase().includes(term)
        ).sort((a, b) => a.name.localeCompare(b.name));

        const tbody = $('#pat-tbody');
        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="empty"><i class="fas fa-user-slash"></i>Nenhum paciente cadastrado.</td></tr>`;
            return;
        }
        tbody.innerHTML = items.map(p => {
            const appts = db.appointments.filter(a => a.patientId === p.id).length;
            return `
                <tr>
                    <td><strong>${escapeHtml(p.name)}</strong></td>
                    <td>${escapeHtml(p.phone || '')}<br><small style="color:#7d6d6a">${escapeHtml(p.email || '')}</small></td>
                    <td>${escapeHtml(p.goal || '-')}</td>
                    <td>${appts}</td>
                    <td>${p.createdAt ? fmtDate(new Date(p.createdAt).toISOString().slice(0,10)) : '-'}</td>
                    <td class="actions">
                        <button class="btn btn-icon btn-secondary" data-view="${p.id}" title="Ver"><i class="fas fa-eye"></i></button>
                        <button class="btn btn-icon btn-secondary" data-edit="${p.id}" title="Editar"><i class="fas fa-pen"></i></button>
                        <button class="btn btn-icon btn-danger" data-del="${p.id}" title="Excluir"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`;
        }).join('');
        $$('[data-edit]', tbody).forEach(b => b.addEventListener('click', () => openPatientModal(b.dataset.edit)));
        $$('[data-view]', tbody).forEach(b => b.addEventListener('click', () => openPatientDetail(b.dataset.view)));
        $$('[data-del]', tbody).forEach(b => b.addEventListener('click', () => {
            confirmDialog('Excluir este paciente? As consultas dele permanecerão registradas.', () => {
                syncAndRender(() => API.patients.delete(b.dataset.del), 'Paciente excluído.');
            });
        }));
    };
    $('#p-search').addEventListener('input', draw);
    draw();
};

function openPatientModal(id = null, onSaved = null) {
    const db = DB.load();
    const existing = id ? db.patients.find(p => p.id === id) : null;
    const p = existing || { id: uid(), name: '', email: '', phone: '', birthdate: '', height: '', weight: '', target: '', goal: '', notes: '' };

    openModal(`
        <div class="modal-header">
            <h3>${existing ? 'Editar' : 'Novo'} Paciente</h3>
            <button class="modal-close" data-close>&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-field">
                <label>Nome completo *</label>
                <input type="text" id="p-name" value="${escapeHtml(p.name)}" required>
            </div>
            <div class="form-row">
                <div class="form-field"><label>E-mail</label><input type="email" id="p-email" value="${escapeHtml(p.email)}"></div>
                <div class="form-field"><label>Telefone / WhatsApp</label><input type="tel" id="p-phone" value="${escapeHtml(p.phone)}"></div>
            </div>
            <div class="form-row-3">
                <div class="form-field"><label>Nascimento</label><input type="date" id="p-birth" value="${p.birthdate}"></div>
                <div class="form-field"><label>Altura (cm)</label><input type="number" id="p-height" value="${p.height}"></div>
                <div class="form-field"><label>Peso atual (kg)</label><input type="number" step="0.1" id="p-weight" value="${p.weight}"></div>
            </div>
            <div class="form-row">
                <div class="form-field"><label>Peso meta (kg)</label><input type="number" step="0.1" id="p-target" value="${p.target}"></div>
                <div class="form-field"><label>Objetivo</label><input type="text" id="p-goal" value="${escapeHtml(p.goal)}" placeholder="Ex.: emagrecimento"></div>
            </div>
            <div class="form-field">
                <label>Anamnese / Observações</label>
                <textarea id="p-notes" rows="4">${escapeHtml(p.notes)}</textarea>
            </div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-close>Cancelar</button>
            <button class="btn btn-primary" id="p-save">Salvar</button>
        </div>
    `, { size: 'lg' });

    $('#p-save').addEventListener('click', async () => {
        const name = $('#p-name').value.trim();
        if (!name) { toast('Nome é obrigatório.', 'error'); return; }
        const obj = {
            id: p.id, name,
            email: $('#p-email').value.trim(),
            phone: $('#p-phone').value.trim(),
            birthdate: $('#p-birth').value,
            height: $('#p-height').value,
            weight: $('#p-weight').value,
            target: $('#p-target').value,
            goal: $('#p-goal').value.trim(),
            notes: $('#p-notes').value.trim(),
            createdAt: existing?.createdAt || Date.now()
        };
        try {
            if (existing) await API.patients.update(obj);
            else await API.patients.create(obj);
            await DB.bootstrap();
            toast('Paciente salvo!');
            closeModal();
            if (onSaved) onSaved(obj);
            else navigateTo(location.hash.slice(1) || 'pacientes');
        } catch (e) { toast(e.message || 'Erro ao salvar', 'error'); }
    });
}

function openPatientDetail(id) {
    const db = DB.load();
    const p = db.patients.find(x => x.id === id);
    if (!p) return;
    const appts = db.appointments.filter(a => a.patientId === id).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    const totalPaid = appts.filter(a => a.paid).reduce((s, a) => s + Number(a.price || 0), 0);
    const pending = appts.filter(a => a.status === 'realizada' && !a.paid).reduce((s, a) => s + Number(a.price || 0), 0);

    openModal(`
        <div class="modal-header">
            <h3>${escapeHtml(p.name)}</h3>
            <button class="modal-close" data-close>&times;</button>
        </div>
        <div class="modal-body">
            <div class="grid-2-eq" style="margin-bottom:16px">
                <div><strong>E-mail:</strong> ${escapeHtml(p.email || '-')}</div>
                <div><strong>Telefone:</strong> ${escapeHtml(p.phone || '-')}</div>
                <div><strong>Altura:</strong> ${p.height ? p.height + ' cm' : '-'}</div>
                <div><strong>Peso atual:</strong> ${p.weight ? p.weight + ' kg' : '-'}</div>
                <div><strong>Peso meta:</strong> ${p.target ? p.target + ' kg' : '-'}</div>
                <div><strong>Objetivo:</strong> ${escapeHtml(p.goal || '-')}</div>
            </div>
            ${p.notes ? `<div style="padding:12px;background:#faf8f7;border-radius:8px;margin-bottom:16px"><strong>Anamnese:</strong><br>${escapeHtml(p.notes)}</div>` : ''}
            <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
                <div class="kpi"><div class="kpi-label">Consultas</div><div class="kpi-value" style="font-size:1.4rem">${appts.length}</div></div>
                <div class="kpi green"><div class="kpi-label">Total Pago</div><div class="kpi-value" style="font-size:1.4rem">${fmtBRL(totalPaid)}</div></div>
                <div class="kpi orange"><div class="kpi-label">A Receber</div><div class="kpi-value" style="font-size:1.4rem">${fmtBRL(pending)}</div></div>
            </div>
            <h4 style="margin-bottom:10px;font-family:'Playfair Display',serif">Histórico de Consultas</h4>
            ${appts.length === 0 ? '<p style="color:#7d6d6a">Sem consultas.</p>' : `
            <div class="table-wrap"><table class="table">
                <thead><tr><th>Data</th><th>Serviço</th><th>Valor</th><th>Status</th><th>Pago</th></tr></thead>
                <tbody>${appts.map(a => `<tr>
                    <td>${fmtDate(a.date)} ${a.time}</td>
                    <td>${escapeHtml(a.serviceName || '')}</td>
                    <td>${fmtBRL(a.price)}</td>
                    <td><span class="badge badge-${a.status}">${a.status}</span></td>
                    <td><span class="badge badge-${a.paid ? 'pago' : 'pendente'}">${a.paid ? 'Pago' : 'Pendente'}</span></td>
                </tr>`).join('')}</tbody>
            </table></div>`}
        </div>
        <div class="modal-footer">
            <a href="https://wa.me/55${(p.phone || '').replace(/\D/g, '')}" target="_blank" class="btn btn-success" style="margin-right:auto"><i class="fab fa-whatsapp"></i> WhatsApp</a>
            <button class="btn btn-secondary" data-close>Fechar</button>
            <button class="btn btn-primary" id="pd-edit">Editar Paciente</button>
        </div>
    `, { size: 'lg' });

    $('#pd-edit').addEventListener('click', () => { closeModal(); openPatientModal(id); });
}

// ============ FINANCEIRO VIEW ============
VIEWS.financeiro = (root) => {
    const state = { tab: 'tx' };
    root.innerHTML = `
        <div class="view-header">
            <h2>Financeiro</h2>
            <button class="btn btn-primary" id="new-tx"><i class="fas fa-plus"></i> Nova Transação</button>
        </div>
        <div class="tabs">
            <button class="tab-btn active" data-tab="tx">Transações</button>
            <button class="tab-btn" data-tab="resumo">Resumo do mês</button>
        </div>
        <div id="fin-body"></div>
    `;
    $('#new-tx').addEventListener('click', () => openTxModal());
    $$('.tab-btn', root).forEach(b => b.addEventListener('click', () => {
        $$('.tab-btn', root).forEach(x => x.classList.toggle('active', x === b));
        state.tab = b.dataset.tab;
        render();
    }));

    function render() {
        const body = $('#fin-body');
        if (state.tab === 'tx') renderTx(body);
        else renderSummary(body);
    }

    function renderTx(body) {
        body.innerHTML = `
            <div class="filters">
                <select id="tx-type">
                    <option value="all">Todos os tipos</option>
                    <option value="receita">Receitas</option>
                    <option value="despesa">Despesas</option>
                </select>
                <input type="month" id="tx-month" value="${todayISO().slice(0,7)}">
            </div>
            <div class="card">
                <div class="table-wrap">
                    <table class="table">
                        <thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th><th></th></tr></thead>
                        <tbody id="tx-tbody"></tbody>
                        <tfoot id="tx-tfoot"></tfoot>
                    </table>
                </div>
            </div>
        `;
        const draw = () => {
            const db = DB.load();
            const type = $('#tx-type').value;
            const month = $('#tx-month').value;
            const items = db.transactions
                .filter(t => (type === 'all' || t.type === type) && (!month || t.date.startsWith(month)))
                .sort((a, b) => b.date.localeCompare(a.date));
            const tbody = $('#tx-tbody');
            const tfoot = $('#tx-tfoot');
            if (items.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="empty"><i class="fas fa-wallet"></i>Sem transações no filtro.</td></tr>`;
                tfoot.innerHTML = '';
                return;
            }
            tbody.innerHTML = items.map(t => `
                <tr>
                    <td>${fmtDate(t.date)}</td>
                    <td><span class="badge badge-${t.type}">${t.type}</span></td>
                    <td>${escapeHtml(t.category)}</td>
                    <td>${escapeHtml(t.description || '-')}</td>
                    <td style="text-align:right;font-weight:700;color:${t.type === 'receita' ? '#5a8a3a' : '#dc3545'}">
                        ${t.type === 'receita' ? '+' : '-'} ${fmtBRL(t.amount)}
                    </td>
                    <td class="actions">
                        ${t.apptId ? '' : `<button class="btn btn-icon btn-secondary" data-edit="${t.id}"><i class="fas fa-pen"></i></button>`}
                        <button class="btn btn-icon btn-danger" data-del="${t.id}"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>`).join('');

            const rev = items.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
            const exp = items.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);
            tfoot.innerHTML = `
                <tr><td colspan="4" style="text-align:right;font-weight:700">Receitas</td><td style="text-align:right;color:#5a8a3a;font-weight:700">${fmtBRL(rev)}</td><td></td></tr>
                <tr><td colspan="4" style="text-align:right;font-weight:700">Despesas</td><td style="text-align:right;color:#dc3545;font-weight:700">${fmtBRL(exp)}</td><td></td></tr>
                <tr><td colspan="4" style="text-align:right;font-weight:700">Resultado líquido</td><td style="text-align:right;font-weight:700;font-size:1.05rem">${fmtBRL(rev - exp)}</td><td></td></tr>`;

            $$('[data-edit]', tbody).forEach(b => b.addEventListener('click', () => openTxModal(b.dataset.edit)));
            $$('[data-del]', tbody).forEach(b => b.addEventListener('click', () => {
                confirmDialog('Excluir esta transação?', () => {
                    const tx = DB.load().transactions.find(x => x.id === b.dataset.del);
                    syncAndRender(async () => {
                        await API.transactions.delete(b.dataset.del);
                        if (tx?.apptId) {
                            const ap = DB.load().appointments.find(a => a.id === tx.apptId);
                            if (ap) await API.appointments.update({ ...ap, paid: false });
                        }
                    }, 'Transação excluída.');
                });
            }));
        };
        $('#tx-type').addEventListener('change', draw);
        $('#tx-month').addEventListener('change', draw);
        draw();
    }

    function renderSummary(body) {
        const db = DB.load();
        const month = todayISO().slice(0, 7);
        body.innerHTML = `
            <div class="filters">
                <input type="month" id="sum-month" value="${month}">
            </div>
            <div class="kpis" id="sum-kpis"></div>
            <div class="grid-2">
                <div class="card">
                    <div class="card-header"><h3>Receitas por categoria</h3></div>
                    <div class="chart-wrap"><canvas id="chart-rev-cat"></canvas></div>
                </div>
                <div class="card">
                    <div class="card-header"><h3>Despesas por categoria</h3></div>
                    <div class="chart-wrap"><canvas id="chart-exp-cat"></canvas></div>
                </div>
            </div>
        `;
        let chart1, chart2;
        const draw = () => {
            const m = $('#sum-month').value;
            const items = db.transactions.filter(t => t.date.startsWith(m));
            const rev = items.filter(t => t.type === 'receita');
            const exp = items.filter(t => t.type === 'despesa');
            const revTotal = rev.reduce((s, t) => s + Number(t.amount), 0);
            const expTotal = exp.reduce((s, t) => s + Number(t.amount), 0);
            const net = revTotal - expTotal;
            $('#sum-kpis').innerHTML = `
                <div class="kpi green"><div class="kpi-icon"><i class="fas fa-arrow-up"></i></div><div class="kpi-label">Receitas</div><div class="kpi-value">${fmtBRL(revTotal)}</div><div class="kpi-sub">${rev.length} lançamento(s)</div></div>
                <div class="kpi"><div class="kpi-icon"><i class="fas fa-arrow-down"></i></div><div class="kpi-label">Despesas</div><div class="kpi-value">${fmtBRL(expTotal)}</div><div class="kpi-sub">${exp.length} lançamento(s)</div></div>
                <div class="kpi blue"><div class="kpi-icon"><i class="fas fa-equals"></i></div><div class="kpi-label">Resultado</div><div class="kpi-value" style="color:${net >= 0 ? '#5a8a3a' : '#dc3545'}">${fmtBRL(net)}</div><div class="kpi-sub">${revTotal > 0 ? Math.round(net/revTotal*100) : 0}% de margem</div></div>
                <div class="kpi orange"><div class="kpi-icon"><i class="fas fa-ticket"></i></div><div class="kpi-label">Ticket médio</div><div class="kpi-value">${rev.length ? fmtBRL(revTotal/rev.length) : fmtBRL(0)}</div><div class="kpi-sub">Por receita</div></div>
            `;
            const groupBy = (arr) => {
                const g = {};
                arr.forEach(t => { g[t.category] = (g[t.category] || 0) + Number(t.amount); });
                return g;
            };
            const drawPie = (canvas, data, colors) => {
                const entries = Object.entries(data);
                return new Chart(canvas.getContext('2d'), {
                    type: 'doughnut',
                    data: {
                        labels: entries.map(([k]) => k),
                        datasets: [{ data: entries.map(([, v]) => v), backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }]
                    },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                });
            };
            if (chart1) chart1.destroy();
            if (chart2) chart2.destroy();
            const revData = groupBy(rev);
            const expData = groupBy(exp);
            if (Object.keys(revData).length) chart1 = drawPie($('#chart-rev-cat'), revData, ['#5a8a3a','#7fb069','#a5c98e','#c7dbb2','#8a2332','#b0344a']);
            if (Object.keys(expData).length) chart2 = drawPie($('#chart-exp-cat'), expData, ['#8a2332','#b0344a','#e4868f','#f4a8b0','#7d6d6a','#2c1b1f']);
        };
        $('#sum-month').addEventListener('change', draw);
        draw();
    }

    render();
};

function openTxModal(id = null) {
    const db = DB.load();
    const existing = id ? db.transactions.find(t => t.id === id) : null;
    const t = existing || { id: uid(), type: 'receita', category: 'Consulta', amount: 0, date: todayISO(), description: '' };
    const cats = (type) => type === 'receita' ? db.config.incomeCats : db.config.expenseCats;

    openModal(`
        <div class="modal-header">
            <h3>${existing ? 'Editar' : 'Nova'} Transação</h3>
            <button class="modal-close" data-close>&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-row">
                <div class="form-field"><label>Tipo *</label>
                    <select id="t-type">
                        <option value="receita" ${t.type === 'receita' ? 'selected' : ''}>Receita</option>
                        <option value="despesa" ${t.type === 'despesa' ? 'selected' : ''}>Despesa</option>
                    </select>
                </div>
                <div class="form-field"><label>Data *</label><input type="date" id="t-date" value="${t.date}" required></div>
            </div>
            <div class="form-row">
                <div class="form-field"><label>Categoria *</label>
                    <select id="t-cat">${cats(t.type).map(c => `<option ${c === t.category ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}</select>
                </div>
                <div class="form-field"><label>Valor (R$) *</label><input type="number" step="0.01" min="0" id="t-amount" value="${t.amount}" required></div>
            </div>
            <div class="form-field"><label>Descrição</label><textarea id="t-desc" rows="2">${escapeHtml(t.description)}</textarea></div>
        </div>
        <div class="modal-footer">
            <button class="btn btn-secondary" data-close>Cancelar</button>
            <button class="btn btn-primary" id="t-save">Salvar</button>
        </div>
    `);

    $('#t-type').addEventListener('change', (e) => {
        const sel = $('#t-cat');
        sel.innerHTML = cats(e.target.value).map(c => `<option>${escapeHtml(c)}</option>`).join('');
    });

    $('#t-save').addEventListener('click', async () => {
        const obj = {
            id: t.id,
            type: $('#t-type').value,
            category: $('#t-cat').value,
            amount: Number($('#t-amount').value) || 0,
            date: $('#t-date').value,
            description: $('#t-desc').value.trim(),
            apptId: t.apptId || null,
            createdAt: existing?.createdAt || Date.now()
        };
        if (obj.amount <= 0) { toast('Valor deve ser maior que zero.', 'error'); return; }
        await syncAndRender(async () => {
            if (existing) await API.transactions.update(obj);
            else await API.transactions.create(obj);
            closeModal();
        }, 'Transação salva!');
    });
}

// ============ RELATORIOS VIEW ============
VIEWS.relatorios = (root) => {
    const db = DB.load();
    const now = new Date();
    const year = now.getFullYear();
    root.innerHTML = `
        <div class="view-header">
            <h2>Relatórios</h2>
            <div style="display:flex;gap:8px">
                <select id="r-year" style="padding:10px 14px;border-radius:8px;border:1px solid #ece6e3;background:white">
                    ${[year, year - 1, year - 2].map(y => `<option>${y}</option>`).join('')}
                </select>
                <button class="btn btn-secondary" id="export-csv"><i class="fas fa-file-csv"></i> Exportar CSV</button>
            </div>
        </div>

        <div class="kpis" id="r-kpis"></div>

        <div class="card mb-4">
            <div class="card-header"><h3>Receita anual por mês</h3></div>
            <div class="chart-wrap"><canvas id="r-chart"></canvas></div>
        </div>

        <div class="grid-2-eq">
            <div class="card">
                <div class="card-header"><h3>Top 10 Pacientes</h3></div>
                <div class="table-wrap" id="top-pat"></div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Serviços mais vendidos</h3></div>
                <div class="table-wrap" id="top-srv"></div>
            </div>
        </div>
    `;

    let chart;
    const draw = () => {
        const y = Number($('#r-year').value);
        const yearTx = db.transactions.filter(t => t.date.startsWith(String(y)));
        const rev = yearTx.filter(t => t.type === 'receita').reduce((s, t) => s + Number(t.amount), 0);
        const exp = yearTx.filter(t => t.type === 'despesa').reduce((s, t) => s + Number(t.amount), 0);
        const yearAppts = db.appointments.filter(a => a.date.startsWith(String(y)));
        const realized = yearAppts.filter(a => a.status === 'realizada').length;
        $('#r-kpis').innerHTML = `
            <div class="kpi green"><div class="kpi-icon"><i class="fas fa-coins"></i></div><div class="kpi-label">Receita ${y}</div><div class="kpi-value">${fmtBRL(rev)}</div></div>
            <div class="kpi"><div class="kpi-icon"><i class="fas fa-coins"></i></div><div class="kpi-label">Despesa ${y}</div><div class="kpi-value">${fmtBRL(exp)}</div></div>
            <div class="kpi blue"><div class="kpi-icon"><i class="fas fa-scale-balanced"></i></div><div class="kpi-label">Lucro ${y}</div><div class="kpi-value">${fmtBRL(rev - exp)}</div></div>
            <div class="kpi orange"><div class="kpi-icon"><i class="fas fa-check"></i></div><div class="kpi-label">Consultas Realizadas</div><div class="kpi-value">${realized}</div></div>
        `;
        const months = Array.from({ length: 12 }, (_, i) => {
            const k = `${y}-${String(i + 1).padStart(2, '0')}`;
            const r = yearTx.filter(t => t.type === 'receita' && t.date.startsWith(k)).reduce((s, t) => s + Number(t.amount), 0);
            const e = yearTx.filter(t => t.type === 'despesa' && t.date.startsWith(k)).reduce((s, t) => s + Number(t.amount), 0);
            return { r, e };
        });
        const labels = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        if (chart) chart.destroy();
        chart = new Chart($('#r-chart').getContext('2d'), {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Receita', data: months.map(m => m.r), borderColor: '#5a8a3a', backgroundColor: 'rgba(127,176,105,0.15)', fill: true, tension: 0.3 },
                    { label: 'Despesa', data: months.map(m => m.e), borderColor: '#8a2332', backgroundColor: 'rgba(228,134,143,0.15)', fill: true, tension: 0.3 }
                ]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
        });

        // top pacientes
        const byPatient = {};
        db.transactions.filter(t => t.type === 'receita' && t.apptId).forEach(t => {
            const a = db.appointments.find(x => x.id === t.apptId);
            if (!a) return;
            byPatient[a.patientId] = (byPatient[a.patientId] || 0) + Number(t.amount);
        });
        const topPat = Object.entries(byPatient).sort((a, b) => b[1] - a[1]).slice(0, 10);
        $('#top-pat').innerHTML = topPat.length === 0 ? '<div class="empty"><i class="fas fa-users"></i>Sem dados.</div>' : `
            <table class="table"><thead><tr><th>Paciente</th><th style="text-align:right">Total</th></tr></thead>
            <tbody>${topPat.map(([pid, v]) => {
                const p = db.patients.find(x => x.id === pid);
                return `<tr><td>${escapeHtml(p?.name || '—')}</td><td style="text-align:right;font-weight:700">${fmtBRL(v)}</td></tr>`;
            }).join('')}</tbody></table>`;

        // top serviços
        const bySrv = {};
        db.appointments.filter(a => a.status === 'realizada').forEach(a => {
            bySrv[a.serviceName] = (bySrv[a.serviceName] || 0) + 1;
        });
        const topSrv = Object.entries(bySrv).sort((a, b) => b[1] - a[1]);
        $('#top-srv').innerHTML = topSrv.length === 0 ? '<div class="empty"><i class="fas fa-list"></i>Sem dados.</div>' : `
            <table class="table"><thead><tr><th>Serviço</th><th style="text-align:right">Consultas</th></tr></thead>
            <tbody>${topSrv.map(([s, c]) => `<tr><td>${escapeHtml(s)}</td><td style="text-align:right;font-weight:700">${c}</td></tr>`).join('')}</tbody></table>`;
    };

    $('#r-year').addEventListener('change', draw);
    $('#export-csv').addEventListener('click', () => {
        const lines = [['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor']];
        db.transactions.forEach(t => lines.push([t.date, t.type, t.category, (t.description || '').replace(/[\n;]/g, ' '), String(t.amount).replace('.', ',')]));
        const csv = lines.map(l => l.map(c => `"${c}"`).join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `financeiro_${todayISO()}.csv`;
        a.click();
        toast('CSV exportado!');
    });
    draw();
};

// ============ CONFIG VIEW ============
VIEWS.config = (root) => {
    const db = DB.load();
    root.innerHTML = `
        <div class="view-header"><h2>Configurações</h2></div>

        <div class="card mb-4">
            <div class="card-header"><h3>Perfil</h3></div>
            <div class="form-row">
                <div class="form-field"><label>Nome</label><input type="text" id="c-name" value="${escapeHtml(db.config.profile.name)}"></div>
                <div class="form-field"><label>CRN</label><input type="text" id="c-crn" value="${escapeHtml(db.config.profile.crn)}"></div>
            </div>
            <div class="form-row">
                <div class="form-field"><label>E-mail</label><input type="email" id="c-email" value="${escapeHtml(db.config.profile.email)}"></div>
                <div class="form-field"><label>Telefone</label><input type="tel" id="c-phone" value="${escapeHtml(db.config.profile.phone)}"></div>
            </div>
            <button class="btn btn-primary" id="c-save-profile">Salvar perfil</button>
        </div>

        <div class="card mb-4">
            <div class="card-header"><h3>Serviços e preços</h3><button class="btn btn-primary btn-sm" id="c-add-srv"><i class="fas fa-plus"></i> Adicionar</button></div>
            <div id="c-srv-list"></div>
        </div>

        <div class="grid-2-eq mb-4">
            <div class="card">
                <div class="card-header"><h3>Categorias de Receita</h3></div>
                <div id="c-inc-cats"></div>
                <div style="display:flex;gap:6px;margin-top:10px">
                    <input type="text" id="c-inc-new" placeholder="Nova categoria" style="flex:1;padding:8px 12px;border:1px solid #ece6e3;border-radius:8px">
                    <button class="btn btn-primary btn-sm" id="c-inc-add">+</button>
                </div>
            </div>
            <div class="card">
                <div class="card-header"><h3>Categorias de Despesa</h3></div>
                <div id="c-exp-cats"></div>
                <div style="display:flex;gap:6px;margin-top:10px">
                    <input type="text" id="c-exp-new" placeholder="Nova categoria" style="flex:1;padding:8px 12px;border:1px solid #ece6e3;border-radius:8px">
                    <button class="btn btn-primary btn-sm" id="c-exp-add">+</button>
                </div>
            </div>
        </div>

        <div class="card mb-4">
            <div class="card-header"><h3>Segurança</h3></div>
            <div class="form-row">
                <div class="form-field"><label>Senha atual</label><input type="password" id="c-pw-old"></div>
                <div class="form-field"><label>Nova senha</label><input type="password" id="c-pw-new"></div>
            </div>
            <button class="btn btn-primary" id="c-pw-save">Alterar senha</button>
        </div>

        <div class="card mb-4">
            <div class="card-header"><h3>Backup e Dados</h3></div>
            <p style="color:#7d6d6a;margin-bottom:12px">Baixe um arquivo de backup periodicamente. Restaurar apaga os dados atuais.</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap">
                <button class="btn btn-primary" id="c-export"><i class="fas fa-download"></i> Exportar backup (JSON)</button>
                <label class="btn btn-secondary"><i class="fas fa-upload"></i> Restaurar backup <input type="file" accept=".json" id="c-import" hidden></label>
                <button class="btn btn-danger" id="c-reset"><i class="fas fa-trash"></i> Zerar todos os dados</button>
            </div>
        </div>
    `;

    $('#c-save-profile').addEventListener('click', async () => {
        const profile = {
            name: $('#c-name').value.trim(),
            crn: $('#c-crn').value.trim(),
            email: $('#c-email').value.trim(),
            phone: $('#c-phone').value.trim()
        };
        try {
            await API.patchConfig({ profile });
            await DB.bootstrap();
            $('#user-name').textContent = profile.name;
            toast('Perfil atualizado!');
        } catch (e) { toast(e.message, 'error'); }
    });

    const renderSrv = () => {
        const d = DB.load();
        $('#c-srv-list').innerHTML = `
            <table class="table"><thead><tr><th>Serviço</th><th>Duração (min)</th><th>Preço (R$)</th><th></th></tr></thead>
            <tbody>${d.config.services.map(s => `
                <tr>
                    <td><input type="text" value="${escapeHtml(s.name)}" data-sid="${s.id}" data-f="name" style="width:100%;padding:6px;border:1px solid #ece6e3;border-radius:6px"></td>
                    <td><input type="number" value="${s.duration}" data-sid="${s.id}" data-f="duration" style="width:80px;padding:6px;border:1px solid #ece6e3;border-radius:6px"></td>
                    <td><input type="number" step="0.01" value="${s.price}" data-sid="${s.id}" data-f="price" style="width:100px;padding:6px;border:1px solid #ece6e3;border-radius:6px"></td>
                    <td><button class="btn btn-icon btn-danger" data-srv-del="${s.id}"><i class="fas fa-trash"></i></button></td>
                </tr>`).join('')}</tbody></table>
        `;
        $$('#c-srv-list input').forEach(inp => inp.addEventListener('change', async () => {
            const dd = DB.load();
            const services = dd.config.services.map(s => s.id === inp.dataset.sid
                ? { ...s, [inp.dataset.f]: inp.dataset.f === 'name' ? inp.value : Number(inp.value) } : s);
            try { await API.patchConfig({ services }); await DB.bootstrap(); toast('Serviço atualizado.'); }
            catch (e) { toast(e.message, 'error'); }
        }));
        $$('[data-srv-del]').forEach(b => b.addEventListener('click', () => {
            confirmDialog('Remover este serviço?', async () => {
                const services = DB.load().config.services.filter(x => x.id !== b.dataset.srvDel);
                try { await API.patchConfig({ services }); await DB.bootstrap(); renderSrv(); toast('Serviço removido.'); }
                catch (e) { toast(e.message, 'error'); }
            });
        }));
    };
    renderSrv();
    $('#c-add-srv').addEventListener('click', async () => {
        const services = [...DB.load().config.services, { id: uid(), name: 'Novo serviço', duration: 60, price: 0 }];
        try { await API.patchConfig({ services }); await DB.bootstrap(); renderSrv(); }
        catch (e) { toast(e.message, 'error'); }
    });

    const renderCats = (boxId, key) => {
        const list = DB.load().config[key] || [];
        $(boxId).innerHTML = list.map(c => `
            <div style="display:flex;align-items:center;gap:8px;padding:6px 0">
                <span style="flex:1">${escapeHtml(c)}</span>
                <button class="btn btn-icon btn-secondary" data-cat-del="${escapeHtml(c)}" data-key="${key}"><i class="fas fa-times"></i></button>
            </div>`).join('');
        $$(`${boxId} [data-cat-del]`).forEach(b => b.addEventListener('click', async () => {
            const cats = DB.load().config[b.dataset.key].filter(x => x !== b.dataset.catDel);
            try { await API.patchConfig({ [b.dataset.key]: cats }); await DB.bootstrap(); renderCats(boxId, key); }
            catch (e) { toast(e.message, 'error'); }
        }));
    };
    renderCats('#c-inc-cats', 'incomeCats');
    renderCats('#c-exp-cats', 'expenseCats');
    $('#c-inc-add').addEventListener('click', async () => {
        const v = $('#c-inc-new').value.trim(); if (!v) return;
        const cats = DB.load().config.incomeCats; if (cats.includes(v)) return;
        try { await API.patchConfig({ incomeCats: [...cats, v] }); await DB.bootstrap(); $('#c-inc-new').value = ''; renderCats('#c-inc-cats', 'incomeCats'); }
        catch (e) { toast(e.message, 'error'); }
    });
    $('#c-exp-add').addEventListener('click', async () => {
        const v = $('#c-exp-new').value.trim(); if (!v) return;
        const cats = DB.load().config.expenseCats; if (cats.includes(v)) return;
        try { await API.patchConfig({ expenseCats: [...cats, v] }); await DB.bootstrap(); $('#c-exp-new').value = ''; renderCats('#c-exp-cats', 'expenseCats'); }
        catch (e) { toast(e.message, 'error'); }
    });

    $('#c-pw-save').addEventListener('click', async () => {
        const oldP = $('#c-pw-old').value, newP = $('#c-pw-new').value;
        if (newP.length < 4) { toast('Nova senha muito curta.', 'error'); return; }
        try {
            await API.changePassword(oldP, newP);
            $('#c-pw-old').value = ''; $('#c-pw-new').value = '';
            toast('Senha alterada!');
        } catch (e) { toast(e.message || 'Erro', 'error'); }
    });

    $('#c-export').addEventListener('click', async () => {
        try {
            const data = await API.backup();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `backup_thais_${todayISO()}.json`;
            a.click();
            toast('Backup exportado!');
        } catch (e) { toast(e.message, 'error'); }
    });
    $('#c-import').addEventListener('change', (e) => {
        const f = e.target.files[0]; if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const data = JSON.parse(reader.result);
                if (!data.config || !Array.isArray(data.patients)) throw new Error('invalid');
                confirmDialog('Restaurar vai substituir TODOS os dados atuais. Continuar?', async () => {
                    try { await API.restore(data); await DB.bootstrap(); toast('Backup restaurado!'); navigateTo('dashboard'); }
                    catch (err) { toast(err.message, 'error'); }
                });
            } catch { toast('Arquivo inválido.', 'error'); }
        };
        reader.readAsText(f);
    });
    $('#c-reset').addEventListener('click', () => {
        confirmDialog('Isto apagará TUDO (pacientes, consultas, transações). Tem certeza?', async () => {
            try { await API.reset(); await DB.bootstrap(); toast('Dados zerados.'); navigateTo('dashboard'); }
            catch (e) { toast(e.message, 'error'); }
        });
    });
};

// ============ INIT ============
async function init() {
    const today = new Date();
    $('#today-date').textContent = today.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

    if (!AUTH.isAuthed()) {
        $('#login-screen').classList.remove('hidden');
        $('#app').classList.add('hidden');
        $('#login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            $('#login-error').textContent = '';
            const pw = $('#login-password').value;
            const btn = e.submitter;
            if (btn) btn.disabled = true;
            if (await AUTH.login(pw)) location.reload();
            else {
                $('#login-error').textContent = 'Senha incorreta ou servidor offline.';
                if (btn) btn.disabled = false;
            }
        });
        return;
    }

    try {
        await DB.bootstrap();
    } catch (e) {
        $('#login-screen').classList.remove('hidden');
        $('#login-error').textContent = 'Sessão expirada. Faça login novamente.';
        AUTH.logout();
        return;
    }

    $('#login-screen').classList.add('hidden');
    $('#app').classList.remove('hidden');
    const db = DB.load();
    $('#user-name').textContent = db.config.profile.name || 'Thais Barboza';
    $('#logout-btn').addEventListener('click', () => AUTH.logout());

    // sidebar nav
    $$('.nav-item').forEach(a => a.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(a.dataset.view);
    }));

    // mobile menu
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    $('#menu-toggle').addEventListener('click', () => {
        $('#sidebar').classList.add('open');
        overlay.classList.add('open');
    });
    overlay.addEventListener('click', () => {
        $('#sidebar').classList.remove('open');
        overlay.classList.remove('open');
    });

    // initial route
    const initial = (location.hash.slice(1) || 'dashboard');
    navigateTo(initial);

    window.addEventListener('hashchange', () => {
        navigateTo(location.hash.slice(1) || 'dashboard');
    });
}

init();
