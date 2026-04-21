/* Cliente da API — Thais Barboza
   Envolve chamadas fetch() em métodos simples. */
const API = {
    get token() { return localStorage.getItem('tb_token'); },
    set token(v) { v ? localStorage.setItem('tb_token', v) : localStorage.removeItem('tb_token'); },

    async call(method, path, body) {
        const opts = { method, headers: {} };
        if (body !== undefined) {
            opts.headers['Content-Type'] = 'application/json';
            opts.body = JSON.stringify(body);
        }
        if (this.token) opts.headers['Authorization'] = 'Bearer ' + this.token;
        let r;
        try {
            r = await fetch(path, opts);
        } catch (e) {
            throw new Error('Não foi possível conectar ao servidor. Verifique se ele está rodando.');
        }
        if (r.status === 401) {
            this.token = null;
            if (!path.includes('/auth/login')) location.reload();
            throw new Error('Não autorizado');
        }
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'Erro de rede');
        return data;
    },

    async login(password) {
        const { token } = await this.call('POST', '/api/auth/login', { password });
        this.token = token;
        return true;
    },
    logout() { this.token = null; },
    bootstrap() { return this.call('GET', '/api/bootstrap'); },
    changePassword: (oldPassword, newPassword) => API.call('POST', '/api/auth/change-password', { oldPassword, newPassword }),
    patchConfig: (partial) => API.call('PATCH', '/api/config', partial),

    patients: {
        create: (p) => API.call('POST', '/api/patients', p),
        update: (p) => API.call('PUT', '/api/patients/' + p.id, p),
        delete: (id) => API.call('DELETE', '/api/patients/' + id)
    },
    appointments: {
        create: (a) => API.call('POST', '/api/appointments', a),
        update: (a) => API.call('PUT', '/api/appointments/' + a.id, a),
        delete: (id) => API.call('DELETE', '/api/appointments/' + id)
    },
    transactions: {
        create: (t) => API.call('POST', '/api/transactions', t),
        update: (t) => API.call('PUT', '/api/transactions/' + t.id, t),
        delete: (id) => API.call('DELETE', '/api/transactions/' + id)
    },
    backup: () => API.call('GET', '/api/backup'),
    restore: (data) => API.call('POST', '/api/restore', data),
    reset: () => API.call('POST', '/api/reset')
};
