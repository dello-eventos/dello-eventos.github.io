/* Dello · Gestão de Eventos */
'use strict';
(() => {

/* ================================================================
   Constantes
   ================================================================ */
const CFG = window.DELLO_CONFIG || {};
const DEMO = !(CFG.supabaseUrl && CFG.supabaseAnonKey);

const SIT = {
  reprovado: { label: 'Não aprovado', cor: 'red',   hex: '#D23B3B', cx: 'Vermelho' },
  analise:   { label: 'Em análise',   cor: 'amber', hex: '#E0A21A', cx: 'Amarelo' },
  aprovado:  { label: 'Aprovado',     cor: 'green', hex: '#17925A', cx: 'Verde' },
};
const SIT_ORDEM = ['reprovado', 'analise', 'aprovado'];
const TIPOS = ['Feira', 'Convenção', 'Workshop', 'Ação em cliente', 'Show room', 'Visita na fábrica', 'Palestra', 'Confraternização'];
const SERVICOS = ['Bancada', 'Prateleiras', 'Mesa', 'Cadeiras', 'TV'];
const GASTOS = ['Catálogo', 'Amostras', 'Brindes', 'Camisetas', 'Banner', 'Banco', 'Base giratória', 'Suportes', 'Plataforma', 'Toalhas', 'Flores', 'Outros'];
const MEIOS = ['Aéreo', 'Ônibus', 'Carro'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const CATS = [
  ['contratos', 'Contratos'], ['servicos', 'Serviços contratados'], ['gastos', 'Gastos diversos'],
  ['hospedagem', 'Hospedagem'], ['alimentacao', 'Alimentação'], ['passagens', 'Passagens / condução'],
];

const REP = {
  envolvidos: { add: 'Adicionar envolvido', compact: true, campos: [{ k: 'nome', ph: 'Nome do envolvido' }] },
  hospedagem: { add: 'Adicionar hóspede', titulo: 'Hóspede', campos: [
    { k: 'nome', l: 'Hóspede', span: 2, list: 'dl-env', ph: 'Nome' },
    { k: 'chegada', l: 'Chegada', t: 'date' }, { k: 'saida', l: 'Saída', t: 'date' },
    { k: 'hotel', l: 'Hotel', span: 2, ph: 'Nome do hotel' }, { k: 'contato', l: 'Contato no hotel' }, { k: 'telefone', l: 'Telefone', t: 'tel' },
    { k: 'email', l: 'E-mail do hotel', t: 'email', span: 2 }, { k: 'codigo', l: 'Cód. reserva' }, { k: 'valor', l: 'Valor', t: 'money' },
  ] },
  alimentacao: { add: 'Adicionar refeição', titulo: 'Refeição', campos: [
    { k: 'data', l: 'Data', t: 'date' }, { k: 'local', l: 'Local', ph: 'Restaurante' }, { k: 'obs', l: 'Descrição', ph: 'Ex.: jantar com clientes' }, { k: 'valor', l: 'Valor', t: 'money' },
  ] },
  passagens: { add: 'Adicionar passagem', titulo: 'Passagem', campos: [
    { k: 'quem', l: 'Quem', list: 'dl-env', ph: 'Nome' }, { k: 'meio', l: 'Meio', t: 'select', opts: MEIOS },
    { k: 'origem', l: 'Origem' }, { k: 'destino', l: 'Destino' },
    { k: 'data', l: 'Data', t: 'date' }, { k: 'hora', l: 'Hora', t: 'time' }, { k: 'codigo', l: 'Cód. reserva' }, { k: 'valor', l: 'Valor', t: 'money' },
  ] },
};

/* ================================================================
   Ícones
   ================================================================ */
const P = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9M13 17V5M8 17v-3"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/>',
  key: '<circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6M15.5 7.5l3 3L22 7l-3-3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  pencil: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  whats: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M7 10l5 5 5-5M12 15V3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M2 10h20M16 15h2"/>',
  trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkc: '<path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="m22 4-10 10-3-3"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  hourglass: '<path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4a2 2 0 0 0 .6-1.4V2"/>',
  refresh: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5M12 3v12"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  chevL: '<path d="m15 18-6-6 6-6"/>',
  chevR: '<path d="m9 18 6-6-6-6"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n] || ''}</svg>`;

/* ================================================================
   Utilitários
   ================================================================ */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const brlCurto = (n) => {
  n = Number(n) || 0;
  if (n >= 1e6) return 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' mi';
  if (n >= 1e4) return 'R$ ' + (n / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' mil';
  return brl(n);
};
const fmtNum = (n) => (n === '' || n == null || isNaN(n) || Number(n) === 0) ? '' : Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function parseMoney(s) {
  if (typeof s === 'number') return s;
  s = String(s || '').replace(/[R$\s]/g, '');
  if (!s) return 0;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s);
  if (!isFinite(n) || n <= 0) return 0;
  return Math.round(Math.min(n, 999999999) * 100) / 100;
}
const fdate = (d) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d ?? ''));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};
const fdia = (t) => t ? new Date(t).toLocaleDateString('pt-BR') : '';
const fdt = (t) => t ? new Date(t).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const pad = (n) => n == null ? '—' : String(n).padStart(4, '0');
const hojeISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const iniciais = (n) => String(n || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
const primeiroNome = (n) => String(n || '').trim().split(/\s+/)[0] || '';
const periodo = (e) => {
  const i = e.data_inicio, f = e.data_fim;
  if (i && f && i !== f) return `${fdate(i)} a ${fdate(f)}`;
  return fdate(i || f) || 'Sem data';
};
const pill = (s) => SIT[s] ? `<span class="pill ${SIT[s].cor}">${SIT[s].label}</span>` : '';
const soma = (arr, f = (x) => x) => arr.reduce((t, x) => t + (Number(f(x)) || 0), 0);
const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));

const store = (() => {
  const mem = {};
  return {
    get(k) { try { return localStorage.getItem(k); } catch { return mem[k] ?? null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { mem[k] = v; } },
    del(k) { try { localStorage.removeItem(k); } catch { delete mem[k]; } },
  };
})();

function subtotais(d = {}) {
  const pos = (v) => Math.max(0, Number(v) || 0);
  const s = (a) => soma(Array.isArray(a) ? a : [], (x) => pos(x?.valor));
  return {
    contratos: pos(d.contratoEvento?.valor) + pos(d.montadora?.valor),
    servicos: s(d.servicos), gastos: s(d.gastos), hospedagem: s(d.hospedagem),
    alimentacao: s(d.alimentacao), passagens: s(d.passagens),
  };
}
const totalDe = (d) => Math.round(soma(Object.values(subtotais(d))) * 100) / 100;

// Garante o formato esperado dos dados vindos do banco (proteção contra registros malformados)
function sanear(ev) {
  if (!ev) return ev;
  const obj = (x) => (x && typeof x === 'object' && !Array.isArray(x)) ? x : {};
  const arr = (x) => Array.isArray(x) ? x.filter((i) => i && typeof i === 'object' && !Array.isArray(i)) : [];
  const d = obj(ev.dados);
  ev.dados = {
    ...d, contratoEvento: obj(d.contratoEvento), montadora: obj(d.montadora),
    servicos: arr(d.servicos), gastos: arr(d.gastos), hospedagem: arr(d.hospedagem),
    alimentacao: arr(d.alimentacao), passagens: arr(d.passagens),
    envolvidos: Array.isArray(d.envolvidos) ? d.envolvidos.filter((x) => typeof x === 'string') : [],
    observacoes: typeof d.observacoes === 'string' ? d.observacoes : '',
  };
  return ev;
}

function msgErro(e) {
  const m = String(e?.message || e || '');
  if (/Invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
  if (/Email not confirmed/i.test(m)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (/already registered|already been registered/i.test(m)) return 'Este e-mail já está cadastrado. Use "Entrar" ou "Esqueci minha senha".';
  if (/Password should be at least|at least 8/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/check constraint|value too long|too large/i.test(m)) return 'Algum campo passou do tamanho permitido. Encurte o texto e tente de novo.';
  if (/rate limit|too many/i.test(m)) return 'Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.';
  if (/row-level security|permission denied|PGRST116|0 rows/i.test(m)) return 'Você não tem permissão para esta ação.';
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Sem conexão com o servidor. Verifique a internet.';
  if (/admin_definir_senha|Could not find the function/i.test(m)) return 'Recurso de senha provisória não instalado. Rode o arquivo supabase/opcional-senha-provisoria.sql no Supabase.';
  if (/Payload too large|maximum allowed size|exceeded/i.test(m)) return 'Arquivo maior que 10 MB.';
  if (/mime type|invalid_mime/i.test(m)) return 'Tipo de arquivo não permitido. Use fotos (JPG, PNG, WEBP, GIF) ou PDF.';
  if (/Bucket not found/i.test(m)) return 'O armazenamento de arquivos ainda não foi configurado.';
  if (/eventos_datas_ok/i.test(m)) return 'A data de término não pode ser anterior à data de início.';
  return m || 'Ocorreu um erro inesperado.';
}

/* ================================================================
   Toast e modais
   ================================================================ */
function toast(msg, tipo = 'ok') {
  let box = $('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.append(box); }
  const t = document.createElement('div');
  t.className = 'toast ' + tipo;
  t.setAttribute('role', 'status');
  t.innerHTML = ic(tipo === 'ok' ? 'checkc' : 'alert') + `<span>${esc(msg)}</span>`;
  box.append(t);
  setTimeout(() => { t.style.transition = 'opacity .3s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, tipo === 'ok' ? 3000 : 5000);
}

function modal(o) {
  return new Promise((resolve) => {
    const bg = document.createElement('div');
    bg.className = 'modal-bg';
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(o.title)}">
      <div class="m-ic ${o.danger ? 'danger' : ''}">${ic(o.icon || 'info')}</div>
      <h3>${esc(o.title)}</h3>${o.text ? `<p>${esc(o.text)}</p>` : ''}
      <form novalidate>${o.body || ''}<div class="msg err hidden"></div>
        <div class="m-acts">${o.cancel === false ? '' : `<button type="button" class="btn" data-c>${esc(o.cancel || 'Cancelar')}</button>`}
        <button type="submit" class="btn ${o.danger ? 'btn-danger-solid' : 'btn-primary'}">${esc(o.ok || 'Confirmar')}</button></div>
      </form></div>`;
    const form = $('form', bg), err = $('.msg', bg), ok = $('[type=submit]', bg);
    const fechar = (v) => { bg.remove(); document.removeEventListener('keydown', onKey); resolve(v); };
    const onKey = (e) => { if (e.key === 'Escape') fechar(false); };
    document.addEventListener('keydown', onKey);
    bg.addEventListener('mousedown', (e) => { if (e.target === bg) fechar(false); });
    $('[data-c]', bg)?.addEventListener('click', () => fechar(false));
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!o.onSubmit) return fechar(true);
      err.classList.add('hidden');
      ok.disabled = true;
      try { const r = await o.onSubmit(Object.fromEntries(new FormData(form))); fechar(r ?? true); }
      catch (x) { err.textContent = msgErro(x); err.classList.remove('hidden'); ok.disabled = false; }
    });
    document.body.append(bg);
    ($('input', form) || ok).focus();
  });
}
const confirmar = (title, text, o = {}) => modal({ title, text, icon: o.icon || 'alert', danger: o.danger, ok: o.ok || 'Confirmar' });

/* ================================================================
   Camada de dados — Supabase
   ================================================================ */
function SupaAPI() {
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' },
  });
  const chk = ({ data, error }) => { if (error) throw error; return data; };
  const url = () => location.origin + location.pathname;
  const campos = (ev) => ({
    situacao: ev.situacao, tipo: ev.tipo, nome: ev.nome, local: ev.local || '', gerente: ev.gerente || '',
    data_inicio: ev.data_inicio || null, data_fim: ev.data_fim || null, dados: ev.dados,
    valor_total: totalDe(ev.dados),
  });
  return {
    demo: false,
    async init() { const { data } = await sb.auth.getSession(); return data.session?.user || null; },
    onAuth(cb) { sb.auth.onAuthStateChange((evt, session) => cb(evt, session?.user || null)); },
    async me() {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return null;
      return chk(await sb.from('perfis').select('*').eq('id', user.id).maybeSingle());
    },
    async signIn(email, password) { chk(await sb.auth.signInWithPassword({ email, password })); },
    async signUp(nome, email, password) { return chk(await sb.auth.signUp({ email, password, options: { data: { nome }, emailRedirectTo: url() } })); },
    async resetPassword(email) { chk(await sb.auth.resetPasswordForEmail(email, { redirectTo: url() })); },
    async updatePassword(password) { chk(await sb.auth.updateUser({ password })); },
    async signOut() { await sb.auth.signOut(); },
    async listEventos() {
      const todos = [];
      for (let de = 0; ; de += 1000) {
        const pag = chk(await sb.from('eventos').select('*').order('numero', { ascending: false }).range(de, de + 999));
        todos.push(...pag.map(sanear));
        if (pag.length < 1000) return todos;
      }
    },
    async getEvento(id) { return sanear(chk(await sb.from('eventos').select('*').eq('id', id).maybeSingle())); },
    async saveEvento(ev) {
      if (ev.id) {
        const r = chk(await sb.from('eventos').update(campos(ev)).eq('id', ev.id).select());
        if (!r.length) throw new Error('permission denied');
        return r[0];
      }
      return chk(await sb.from('eventos').insert(campos(ev)).select().single());
    },
    async deleteEvento(id) {
      const r = chk(await sb.from('eventos').delete().eq('id', id).select('id'));
      if (!r.length) throw new Error('permission denied');
    },
    async listPerfis() { return chk(await sb.from('perfis').select('*').order('nome')); },
    async updatePerfil(id, patch) {
      const r = chk(await sb.from('perfis').update(patch).eq('id', id).select());
      if (!r.length) throw new Error('permission denied');
      return r[0];
    },
    async adminSenha(id, senha) { chk(await sb.rpc('admin_definir_senha', { usuario: id, nova_senha: senha })); },
    async listarAnexos(evId) {
      const itens = chk(await sb.storage.from('anexos').list(evId, { limit: 500, sortBy: { column: 'created_at', order: 'asc' } })).filter((f) => f.id);
      if (!itens.length) return [];
      const paths = itens.map((f) => `${evId}/${f.name}`);
      const urls = chk(await sb.storage.from('anexos').createSignedUrls(paths, 3600));
      return itens.map((f, i) => ({ path: paths[i], nome: f.name, tipo: f.metadata?.mimetype || '', tamanho: f.metadata?.size || 0, criado_em: f.created_at, url: urls[i]?.signedUrl || '' }));
    },
    async enviarAnexo(evId, arquivo, nome) {
      chk(await sb.storage.from('anexos').upload(`${evId}/${Date.now()}-${nome}`, arquivo, { contentType: arquivo.type, upsert: false }));
    },
    async excluirAnexo(path) {
      const r = chk(await sb.storage.from('anexos').remove([path]));
      if (!r?.length) throw new Error('permission denied');
    },
    async limparAnexos(evId) {
      const itens = chk(await sb.storage.from('anexos').list(evId, { limit: 1000 })).filter((f) => f.id);
      if (itens.length) chk(await sb.storage.from('anexos').remove(itens.map((f) => `${evId}/${f.name}`)));
    },
    async historico(eventoId) {
      let q = sb.from('historico').select('*').order('em', { ascending: false }).limit(400);
      if (eventoId) q = q.eq('evento_id', eventoId);
      return chk(await q);
    },
  };
}

/* ================================================================
   Camada de dados — Demonstração (sem banco, fica no navegador)
   ================================================================ */
function DemoAPI() {
  const KEY = 'dello.eventos.demo.v2';
  let db = null;
  try { db = JSON.parse(store.get(KEY) || 'null'); } catch { db = null; }
  if (!db) db = semente();
  let atual = store.get(KEY + '.user') || 'demo-admin';
  const salvar = () => store.set(KEY, JSON.stringify(db));
  const perfil = (id) => db.perfis.find((p) => p.id === id);
  const isAdmin = () => perfil(atual)?.papel === 'admin' && perfil(atual)?.ativo;
  const podeEditar = (ev) => isAdmin() || ev.criado_por === atual;
  const anexosMem = {};
  const negar = () => { throw new Error('permission denied'); };
  const log = (acao, ev, detalhes = {}) => db.historico.unshift({
    id: ++db.hseq, evento_id: ev.id, evento_numero: ev.numero, evento_nome: ev.nome, acao,
    usuario_id: atual, usuario_nome: perfil(atual)?.nome || '—', em: new Date().toISOString(), detalhes,
  });

  function semente() {
    const h = hojeISO();
    const perfis = [
      { id: 'demo-admin', nome: 'Administrador Demo', email: 'admin@exemplo.com', papel: 'admin', ativo: true, criado_em: new Date().toISOString() },
      { id: 'demo-user', nome: 'Gerente Comercial Demo', email: 'gerente@exemplo.com', papel: 'usuario', ativo: true, criado_em: new Date().toISOString() },
      { id: 'demo-pend', nome: 'Novo Colaborador', email: 'novo@exemplo.com', papel: 'usuario', ativo: false, criado_em: new Date().toISOString() },
    ];
    const mk = (numero, por, o) => {
      const ev = { id: uid(), numero, criado_por: por, atualizado_por: por, criado_em: new Date(Date.now() - (10 - numero) * 864e5).toISOString(), ...o };
      ev.atualizado_em = ev.criado_em;
      ev.valor_total = totalDe(ev.dados);
      return ev;
    };
    const eventos = [
      mk(1, 'demo-user', { situacao: 'aprovado', tipo: 'Workshop', nome: 'Workshop Organização de Escritório', local: 'Showroom Dello — Extrema/MG', gerente: 'Gerente Comercial Demo',
        data_inicio: addDias(h, -24), data_fim: addDias(h, -24), dados: { contratoEvento: {}, montadora: {},
        servicos: [{ nome: 'Mesa', qt: 4, valor: 480, fixo: true }, { nome: 'Cadeiras', qt: 30, valor: 900, fixo: true }],
        gastos: [{ nome: 'Amostras', qt: 60, valor: 1320, obs: 'Kits para participantes', fixo: true }, { nome: 'Brindes', qt: 60, valor: 780, fixo: true }],
        envolvidos: ['Gerente Comercial Demo'], hospedagem: [], alimentacao: [{ data: addDias(h, -24), local: 'Buffet local', obs: 'Coffee break', valor: 1150 }], passagens: [], observacoes: '' } }),
      mk(2, 'demo-admin', { situacao: 'aprovado', tipo: 'Feira', nome: 'Feira Escolar & Office', local: 'Expo Center Norte — São Paulo/SP', gerente: 'Administrador Demo',
        data_inicio: addDias(h, 18), data_fim: addDias(h, 21), dados: {
        contratoEvento: { data: addDias(h, -40), area: 36, valor: 18000 }, montadora: { data: addDias(h, -30), nome: 'Montadora Exemplo', valor: 12500 },
        servicos: [{ nome: 'Bancada', qt: 2, valor: 1600, fixo: true }, { nome: 'Prateleiras', qt: 6, valor: 1440, fixo: true }, { nome: 'TV', qt: 1, valor: 650, fixo: true }],
        gastos: [{ nome: 'Catálogo', qt: 500, valor: 1750, fixo: true }, { nome: 'Brindes', qt: 300, valor: 2400, fixo: true }, { nome: 'Camisetas', qt: 12, valor: 540, obs: 'Equipe do estande', fixo: true }, { nome: 'Flores', qt: 1, valor: 320, fixo: true }],
        envolvidos: ['Administrador Demo', 'Gerente Comercial Demo', 'Promotora 1'],
        hospedagem: [{ nome: 'Administrador Demo', chegada: addDias(h, 17), saida: addDias(h, 21), hotel: 'Hotel Exemplo Anhembi', contato: 'Recepção', telefone: '(11) 0000-0000', email: 'reservas@hotel.exemplo', codigo: 'HX-2231', valor: 1680 },
          { nome: 'Gerente Comercial Demo', chegada: addDias(h, 17), saida: addDias(h, 21), hotel: 'Hotel Exemplo Anhembi', contato: 'Recepção', telefone: '(11) 0000-0000', email: 'reservas@hotel.exemplo', codigo: 'HX-2232', valor: 1680 }],
        alimentacao: [{ data: addDias(h, 18), local: 'Praça de alimentação', obs: 'Equipe', valor: 620 }, { data: addDias(h, 19), local: 'Restaurante', obs: 'Jantar com clientes', valor: 1380 }],
        passagens: [{ quem: 'Administrador Demo', meio: 'Carro', origem: 'Extrema/MG', destino: 'São Paulo/SP', data: addDias(h, 17), hora: '08:00', codigo: '', valor: 380 }],
        observacoes: 'Estande de esquina, próximo à entrada principal.' } }),
      mk(3, 'demo-user', { situacao: 'analise', tipo: 'Convenção', nome: 'Convenção de Vendas Região Sul', local: 'Centro de Eventos — Curitiba/PR', gerente: 'Gerente Comercial Demo',
        data_inicio: addDias(h, 46), data_fim: addDias(h, 47), dados: { contratoEvento: { data: '', area: 20, valor: 6500 }, montadora: {},
        servicos: [{ nome: 'Mesa', qt: 2, valor: 300, fixo: true }], gastos: [{ nome: 'Banner', qt: 2, valor: 460, fixo: true }, { nome: 'Catálogo', qt: 200, valor: 700, fixo: true }],
        envolvidos: ['Gerente Comercial Demo'], hospedagem: [{ nome: 'Gerente Comercial Demo', chegada: addDias(h, 45), saida: addDias(h, 47), hotel: 'Hotel Centro', valor: 780 }],
        alimentacao: [], passagens: [{ quem: 'Gerente Comercial Demo', meio: 'Aéreo', origem: 'São Paulo/SP', destino: 'Curitiba/PR', data: addDias(h, 45), hora: '07:40', codigo: 'LA8X2K', valor: 890 }], observacoes: '' } }),
      mk(4, 'demo-admin', { situacao: 'reprovado', tipo: 'Ação em cliente', nome: 'Ação de Volta às Aulas — Rede Parceira', local: 'Belo Horizonte/MG', gerente: 'Administrador Demo',
        data_inicio: addDias(h, 70), data_fim: addDias(h, 72), dados: { contratoEvento: {}, montadora: {}, servicos: [],
        gastos: [{ nome: 'Amostras', qt: 400, valor: 3800, fixo: true }, { nome: 'Suportes', qt: 8, valor: 1200, fixo: true }], envolvidos: [], hospedagem: [], alimentacao: [], passagens: [], observacoes: 'Reavaliar no próximo trimestre.' } }),
    ];
    const historico = eventos.map((e, i) => ({ id: i + 1, evento_id: e.id, evento_numero: e.numero, evento_nome: e.nome, acao: 'criou', usuario_id: e.criado_por,
      usuario_nome: perfis.find((p) => p.id === e.criado_por).nome, em: e.criado_em, detalhes: {} })).reverse();
    return { seq: eventos.length, hseq: historico.length, perfis, eventos, historico };
  }

  return {
    demo: true,
    async init() { return { id: atual }; },
    onAuth() {},
    async me() { return clone(perfil(atual)); },
    setUser(id) { atual = id; store.set(KEY + '.user', id); },
    reset() { store.del(KEY); store.del(KEY + '.user'); },
    async signIn() {}, async signUp() {}, async resetPassword() {}, async updatePassword() {}, async signOut() {},
    async listEventos() { return clone(db.eventos).sort((a, b) => b.numero - a.numero); },
    async getEvento(id) { const e = db.eventos.find((x) => x.id === id); return e ? clone(e) : null; },
    async saveEvento(ev) {
      const agora = new Date().toISOString();
      const dados = clone(ev.dados);
      if (ev.id) {
        const i = db.eventos.findIndex((x) => x.id === ev.id);
        if (i < 0) throw new Error('Evento não encontrado.');
        const old = db.eventos[i];
        if (!podeEditar(old)) negar();
        const novo = { ...old, situacao: ev.situacao, tipo: ev.tipo, nome: ev.nome, local: ev.local, gerente: ev.gerente,
          data_inicio: ev.data_inicio || null, data_fim: ev.data_fim || null, dados, valor_total: totalDe(dados), atualizado_por: atual, atualizado_em: agora };
        const det = {};
        ['situacao', 'nome', 'tipo', 'local', 'gerente', 'data_inicio', 'data_fim', 'valor_total'].forEach((k) => { if ((old[k] ?? null) !== (novo[k] ?? null)) det[k] = [old[k] ?? null, novo[k] ?? null]; });
        if (JSON.stringify(old.dados) !== JSON.stringify(novo.dados)) det.dados = true;
        db.eventos[i] = novo;
        if (Object.keys(det).length) log('alterou', novo, det);
        salvar();
        return clone(novo);
      }
      const novo = { id: uid(), numero: ++db.seq, situacao: ev.situacao, tipo: ev.tipo, nome: ev.nome, local: ev.local, gerente: ev.gerente,
        data_inicio: ev.data_inicio || null, data_fim: ev.data_fim || null, dados, valor_total: totalDe(dados),
        criado_por: atual, criado_em: agora, atualizado_por: atual, atualizado_em: agora };
      db.eventos.push(novo);
      log('criou', novo);
      salvar();
      return clone(novo);
    },
    async deleteEvento(id) {
      const e = db.eventos.find((x) => x.id === id);
      if (!e || !podeEditar(e)) negar();
      db.eventos = db.eventos.filter((x) => x.id !== id);
      log('excluiu', e, { valor_total: e.valor_total });
      salvar();
    },
    async listPerfis() { return clone(db.perfis).sort((a, b) => a.nome.localeCompare(b.nome)); },
    async updatePerfil(id, patch) {
      if (!isAdmin()) negar();
      const p = perfil(id);
      const n = { ...p, ...patch };
      if (p.papel === 'admin' && p.ativo && (n.papel !== 'admin' || !n.ativo) && !db.perfis.some((x) => x.id !== id && x.papel === 'admin' && x.ativo)) {
        throw new Error('É preciso manter pelo menos um administrador ativo.');
      }
      Object.assign(p, patch);
      salvar();
      return clone(p);
    },
    async adminSenha() { if (!isAdmin()) negar(); },
    async listarAnexos(id) { return (anexosMem[id] || []).slice(); },
    async enviarAnexo(id, arquivo, nome) {
      const ev = db.eventos.find((x) => x.id === id);
      if (!ev || !podeEditar(ev)) negar();
      const n = `${Date.now()}-${nome}`;
      (anexosMem[id] ||= []).push({ path: `${id}/${n}`, nome: n, tipo: arquivo.type, tamanho: arquivo.size, criado_em: new Date().toISOString(), url: URL.createObjectURL(arquivo) });
    },
    async excluirAnexo(path) {
      const id = path.split('/')[0], ev = db.eventos.find((x) => x.id === id);
      if (ev && !podeEditar(ev)) negar();
      anexosMem[id] = (anexosMem[id] || []).filter((a) => a.path !== path);
    },
    async limparAnexos(id) { delete anexosMem[id]; },
    async historico(eventoId) { return clone(eventoId ? db.historico.filter((h) => h.evento_id === eventoId) : db.historico).slice(0, 400); },
  };
}

/* ================================================================
   Estado e inicialização
   ================================================================ */
let api;
const S = { me: null, perfis: [], eventos: [], dirty: false, recovery: false, filtros: { q: '', sit: '', tipo: '', gerente: '', meus: false }, anoPainel: String(new Date().getFullYear()) };
const root = $('#root');
const isAdmin = () => S.me?.papel === 'admin';
const podeEditar = (ev) => !!S.me && (isAdmin() || ev.criado_por === S.me.id);

/* Aplicativo instalável (ícone na área de trabalho / tela inicial) */
let promptInstalar = null;
const appInstalado = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; });
window.addEventListener('appinstalled', () => {
  promptInstalar = null;
  $('#btnInstalar')?.classList.add('hidden');
  toast('Aplicativo instalado! Procure o ícone "Dello Eventos" na área de trabalho.');
});
async function instalarApp() {
  if (promptInstalar) {
    promptInstalar.prompt();
    const r = await promptInstalar.userChoice;
    promptInstalar = null;
    if (r.outcome === 'accepted') $('#btnInstalar')?.classList.add('hidden');
    return;
  }
  modal({
    title: 'Instalar o aplicativo', icon: 'monitor', cancel: false, ok: 'Entendi',
    body: `<div class="inst-passos">
      <p><b>Computador (Chrome ou Edge):</b> clique no ícone <b>Instalar</b> que aparece no lado direito da barra de endereço.
        Se não aparecer: menu <b>⋮</b> → <b>Transmitir, salvar e compartilhar</b> → <b>Instalar página como app</b>.
        No Edge: menu <b>…</b> → <b>Aplicativos</b> → <b>Instalar este site como aplicativo</b>.</p>
      <p><b>Celular Android:</b> menu <b>⋮</b> do Chrome → <b>Adicionar à tela inicial</b> → <b>Instalar</b>.</p>
      <p><b>iPhone:</b> no Safari, toque em <b>Compartilhar</b> → <b>Adicionar à Tela de Início</b>.</p></div>`,
  });
}
const nomeDe = (id) => S.perfis.find((p) => p.id === id)?.nome || '—';

async function boot() {
  if (window.top !== window.self) {
    root.innerHTML = `<div class="pending"><img src="assets/logo-dello.png" alt="Dello"><h2>Abra o sistema diretamente</h2><p><a href="${esc(location.href)}" target="_top" rel="noopener">Clique aqui para abrir a Gestão de Eventos</a></p></div>`;
    return;
  }
  const hash = location.hash;
  if (/type=recovery/.test(hash)) S.recovery = true;
  let erroLink = '';
  if (/error_description=/.test(hash)) {
    const p = new URLSearchParams(hash.slice(1));
    erroLink = /expired/i.test(p.get('error_code') || p.get('error_description') || '') ? 'O link expirou. Peça um novo.' : (p.get('error_description') || 'Link inválido.');
  }

  if (DEMO) api = DemoAPI();
  else if (!window.supabase?.createClient) {
    root.innerHTML = `<div class="pending"><img src="assets/logo-dello.png" alt="Dello"><div class="ico">${ic('alert')}</div><h2>Não foi possível conectar</h2><p>Verifique sua conexão com a internet e recarregue a página.</p><button class="btn btn-primary" id="btnReload">${ic('refresh')}Recarregar</button></div>`;
    $('#btnReload').onclick = () => location.reload();
    return;
  } else api = SupaAPI();

  api.onAuth((evt) => {
    if (evt === 'PASSWORD_RECOVERY') { S.recovery = true; if (S.me) pedirNovaSenha(); }
    if (evt === 'SIGNED_OUT') { S.me = null; renderAuth('entrar'); }
  });

  let user = null;
  try { user = await api.init(); } catch (e) { erroLink = msgErro(e); }
  if (/access_token|error_description|type=/.test(location.hash)) history.replaceState(null, '', location.pathname + location.search + '#/painel');
  if (!user) { renderAuth('entrar', erroLink ? { err: erroLink } : null); return; }
  await entrar();
  if (erroLink) toast(erroLink, 'err');
}

async function entrar() {
  try {
    S.me = await api.me();
  } catch (e) { renderAuth('entrar', { err: msgErro(e) }); return; }
  if (!S.me) { renderAuth('entrar', { err: 'Seu perfil não foi encontrado. Fale com um administrador.' }); return; }
  if (!S.me.ativo) { renderPendente(); return; }
  try { S.perfis = await api.listPerfis(); } catch { S.perfis = [S.me]; }
  renderShell();
  if (!location.hash || location.hash === '#' || location.hash === '#/') location.hash = '#/painel';
  else route();
  if (S.recovery) pedirNovaSenha();
}

function pedirNovaSenha() {
  S.recovery = false;
  return modal({
    title: 'Defina sua nova senha', icon: 'key', ok: 'Salvar senha', cancel: false,
    body: `<div class="field"><label>Nova senha</label><input type="password" name="s1" autocomplete="new-password" required></div>
           <div class="field"><label>Confirme a nova senha</label><input type="password" name="s2" autocomplete="new-password" required></div>`,
    onSubmit: async ({ s1, s2 }) => {
      if ((s1 || '').length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
      if (s1 !== s2) throw new Error('As senhas não conferem.');
      await api.updatePassword(s1);
      toast('Senha atualizada');
    },
  });
}

/* ================================================================
   Telas de acesso
   ================================================================ */
function renderAuth(modo = 'entrar', aviso = null) {
  const cfg = {
    entrar: { h: 'Bem-vindo(a)', p: 'Entre com seu e-mail e senha para acessar o sistema.', ok: 'Entrar' },
    criar: { h: 'Criar conta', p: 'Depois do cadastro, um administrador aprova seu acesso.', ok: 'Criar conta' },
    recuperar: { h: 'Esqueceu a senha?', p: 'Fale com um administrador do sistema na Dello. Ele define uma senha provisória para você, e depois você pode trocá-la no ícone de chave, ao lado do seu nome.', ok: '' },
  }[modo];
  root.innerHTML = `<div class="auth">
    <aside class="auth-brand">
      <img src="assets/logo-dello.png" alt="Dello">
      <div class="mid">
        <h1>Gestão de Eventos</h1>
        <p>Planeje, aprove e acompanhe o investimento em feiras, convenções e ações comerciais da Dello.</p>
        <ul>
          <li><span class="ck">${ic('check')}</span>Orçamento completo de cada evento</li>
          <li><span class="ck">${ic('check')}</span>Aprovação por situação, com histórico</li>
          <li><span class="ck">${ic('check')}</span>Relatórios prontos para imprimir e compartilhar</li>
        </ul>
      </div>
      <div class="foot">© ${new Date().getFullYear()} Dello · A marca da organização</div>
    </aside>
    <main class="auth-form"><div class="auth-card">
      <img class="logo-m" src="assets/logo-dello.png" alt="Dello">
      <h2>${cfg.h}</h2><p>${cfg.p}</p>
      ${modo === 'recuperar' ? `<button class="btn btn-primary btn-block" data-m="entrar">${ic('back')}Voltar para o login</button>` : `<form id="fAuth" novalidate>
        ${aviso?.err ? `<div class="msg err">${esc(aviso.err)}</div>` : ''}
        ${aviso?.ok ? `<div class="msg ok">${esc(aviso.ok)}</div>` : ''}
        ${modo === 'criar' ? `<div class="field"><label for="aNome">Nome completo</label><input id="aNome" name="nome" autocomplete="name" maxlength="120" value="${esc(aviso?.nome || '')}" required></div>` : ''}
        <div class="field"><label for="aEmail">E-mail</label><input id="aEmail" name="email" type="email" autocomplete="email" maxlength="200" value="${esc(aviso?.email || '')}" required></div>
        ${modo !== 'recuperar' ? `<div class="field"><label for="aSenha">Senha</label><input id="aSenha" name="senha" type="password" autocomplete="${modo === 'criar' ? 'new-password' : 'current-password'}" required>${modo === 'criar' ? '<div class="hint">Mínimo de 8 caracteres.</div>' : ''}</div>` : ''}
        ${modo === 'criar' ? `<div class="field"><label for="aSenha2">Confirme a senha</label><input id="aSenha2" name="senha2" type="password" autocomplete="new-password" required></div>` : ''}
        ${modo === 'entrar' ? `<div class="row-end"><a class="linkish" data-m="recuperar">Esqueci minha senha</a></div>` : ''}
        <button class="btn btn-primary btn-block" type="submit">${cfg.ok}</button>
      </form>`}
      <div class="alt">${modo === 'entrar' ? 'Ainda não tem acesso? <a data-m="criar">Criar conta</a>' : 'Já tem conta? <a data-m="entrar">Entrar</a>'}</div>
    </div></main></div>`;

  $$('[data-m]').forEach((a) => a.addEventListener('click', () => renderAuth(a.dataset.m)));
  const f = $('#fAuth');
  if (!f) return;
  (aviso?.email ? $('#aSenha', f) || $('input', f) : $('input', f)).focus();
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(f));
    const email = (d.email || '').trim().toLowerCase();
    const falha = (m) => renderAuth(modo, { err: m, email: d.email, nome: d.nome });
    if (!/^\S+@\S+\.\S+$/.test(email)) return falha('Informe um e-mail válido.');
    const btn = $('[type=submit]', f);
    btn.disabled = true; btn.textContent = 'Aguarde…';
    try {
      if (modo === 'entrar') {
        if (!d.senha) return falha('Informe a senha.');
        await api.signIn(email, d.senha);
        root.innerHTML = '<div class="boot"><img src="assets/logo-dello.png" alt="Dello"><div class="spinner"></div></div>';
        await entrar();
      } else if (modo === 'criar') {
        if (!d.nome?.trim()) return falha('Informe seu nome.');
        if ((d.senha || '').length < 8) return falha('A senha precisa ter pelo menos 8 caracteres.');
        if (d.senha !== d.senha2) return falha('As senhas não conferem.');
        const r = await api.signUp(d.nome.trim(), email, d.senha);
        if (r?.session) await entrar();
        else renderAuth('entrar', { ok: `Enviamos um link de confirmação para ${email}. Depois de confirmar, aguarde a aprovação de um administrador.` });
      } else {
        await api.resetPassword(email);
        renderAuth('entrar', { ok: `Se ${email} estiver cadastrado, você receberá um link para criar uma nova senha.` });
      }
    } catch (x) { falha(msgErro(x)); }
  });
}

function renderPendente() {
  root.innerHTML = `<div class="boot" style="gap:0"><div class="pending">
    <img src="assets/logo-dello.png" alt="Dello">
    <div class="ico">${ic('hourglass')}</div>
    <h2>Aguardando aprovação</h2>
    <p>Olá, ${esc(primeiroNome(S.me.nome))}! Sua conta foi criada. Um administrador precisa liberar seu acesso. Assim que for aprovado, é só entrar de novo.</p>
    <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
      <button class="btn btn-primary" id="pvChk">${ic('refresh')}Verificar novamente</button>
      <button class="btn" id="pvOut">${ic('logout')}Sair</button>
    </div></div></div>`;
  $('#pvChk').onclick = () => entrar();
  $('#pvOut').onclick = () => api.signOut().then(() => renderAuth('entrar'));
}

/* ================================================================
   Estrutura principal
   ================================================================ */
function renderShell() {
  const pend = S.perfis.filter((p) => !p.ativo).length;
  const demoBar = DEMO ? `<div class="demo-bar no-print">${ic('info')}
      <span><b>Modo demonstração.</b> Os dados ficam só neste navegador até o banco ser conectado.</span><span class="sp"></span>
      <label>Ver como:</label><select id="demoUser">${S.perfis.filter((p) => p.ativo).map((p) => `<option value="${p.id}" ${p.id === S.me.id ? 'selected' : ''}>${esc(p.nome)} (${p.papel === 'admin' ? 'admin' : 'usuário'})</option>`).join('')}</select>
      <button class="btn btn-sm" id="demoReset" style="background:#243152;color:#fff;border-color:#34436a">Restaurar exemplo</button></div>` : '';
  root.innerHTML = `<div class="shell" id="shell">
    <aside class="side">
      <a class="brand" href="#/painel"><img src="assets/logo-dello.png" alt="Dello"><span>Gestão de Eventos</span></a>
      <nav class="nav">
        <a href="#/painel" data-r="painel">${ic('grid')}Painel</a>
        <a href="#/eventos" data-r="eventos">${ic('calendar')}Eventos</a>
        <a href="#/eventos/novo" data-r="novo">${ic('plus')}Novo evento</a>
        <a href="#/relatorios" data-r="relatorios">${ic('chart')}Relatórios</a>
        <a href="#/historico" data-r="historico">${ic('clock')}Histórico</a>
        ${isAdmin() ? `<div class="grp">Administração</div><a href="#/usuarios" data-r="usuarios">${ic('users')}Usuários<span class="badge ${pend ? '' : 'hidden'}" id="pendBadge">${pend}</span></a>` : ''}
      </nav>
      ${appInstalado() ? '' : `<button type="button" class="nav-inst" id="btnInstalar">${ic('monitor')}<span>Instalar aplicativo<small>Ícone na área de trabalho ou no celular</small></span></button>`}
      <div class="me">
        <div class="avatar">${esc(iniciais(S.me.nome))}</div>
        <div class="who"><b title="${esc(S.me.nome)}">${esc(S.me.nome)}</b><span class="small muted">${isAdmin() ? 'Administrador' : 'Usuário'}</span></div>
        ${DEMO ? '' : `<button class="btn btn-ghost icon-btn" id="btnSenha" title="Alterar senha" aria-label="Alterar senha">${ic('key')}</button>
        <button class="btn btn-ghost icon-btn" id="btnSair" title="Sair" aria-label="Sair">${ic('logout')}</button>`}
      </div>
    </aside>
    <div class="scrim"></div>
    <div class="main">
      ${demoBar}
      <header class="topbar">
        <button class="btn btn-ghost icon-btn menu-btn" id="btnMenu" aria-label="Menu">${ic('menu')}</button>
        <div class="titles"><h1 id="pgTitle"></h1><div class="sub" id="pgSub"></div></div>
        <div class="acts" id="pgActs"></div>
      </header>
      <div class="content" id="view"></div>
    </div></div>`;

  const shell = $('#shell');
  $('#btnMenu').onclick = () => shell.classList.add('nav-open');
  $('#btnInstalar')?.addEventListener('click', instalarApp);
  $('.scrim').onclick = () => shell.classList.remove('nav-open');
  $('#btnSair')?.addEventListener('click', async () => {
    if (!(await confirmar('Sair do sistema?', 'Você precisará entrar novamente com seu e-mail e senha.', { icon: 'logout', ok: 'Sair' }))) return;
    S.dirty = false;
    await api.signOut();
    S.me = null;
    renderAuth('entrar');
  });
  $('#btnSenha')?.addEventListener('click', () => modal({
    title: 'Alterar senha', icon: 'key', ok: 'Salvar senha',
    body: `<div class="field"><label>Nova senha</label><input type="password" name="s1" autocomplete="new-password"></div>
           <div class="field"><label>Confirme a nova senha</label><input type="password" name="s2" autocomplete="new-password"></div>`,
    onSubmit: async ({ s1, s2 }) => {
      if ((s1 || '').length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
      if (s1 !== s2) throw new Error('As senhas não conferem.');
      await api.updatePassword(s1);
      toast('Senha alterada com sucesso');
    },
  }));
  $('#demoUser')?.addEventListener('change', async (e) => {
    api.setUser(e.target.value);
    S.dirty = false;
    S.me = await api.me();
    renderShell();
    route();
    toast('Agora vendo como ' + S.me.nome);
  });
  $('#demoReset')?.addEventListener('click', async () => {
    if (!(await confirmar('Restaurar dados de exemplo?', 'Tudo o que foi cadastrado na demonstração será apagado deste navegador.', { danger: true, ok: 'Restaurar' }))) return;
    api.reset();
    location.hash = '#/painel';
    location.reload();
  });
}

function setPage(title, sub = '', acts = '') {
  $('#pgTitle').textContent = title;
  $('#pgSub').innerHTML = sub;
  $('#pgActs').innerHTML = acts;
  document.title = `${title} · Dello Eventos`;
}
const view = () => $('#view');
const carregando = () => { view().innerHTML = '<div class="card"><div class="empty"><div class="spinner" style="margin:0 auto"></div></div></div>'; };
const vazio = (icon, t, p, btn = '') => `<div class="empty"><div class="ico">${ic(icon)}</div><h3>${t}</h3><p>${p}</p>${btn}</div>`;

/* ================================================================
   Rotas
   ================================================================ */
const ROTAS = [
  [/^#\/painel$/, 'painel', () => viewPainel()],
  [/^#\/eventos$/, 'eventos', () => viewEventos()],
  [/^#\/eventos\/novo$/, 'novo', () => viewForm(null)],
  [/^#\/eventos\/([\w-]+)\/editar$/, 'eventos', (m) => viewForm(m[1])],
  [/^#\/eventos\/([\w-]+)\/duplicar$/, 'novo', (m) => viewForm(m[1], true)],
  [/^#\/eventos\/([\w-]+)$/, 'eventos', (m) => viewDetalhe(m[1])],
  [/^#\/relatorios$/, 'relatorios', () => viewRelatorios()],
  [/^#\/historico$/, 'historico', () => viewHistorico()],
  [/^#\/usuarios$/, 'usuarios', () => viewUsuarios()],
];
let ultimoHash = location.hash, ignorar = false;

let ultimaChecagem = Date.now();
async function route() {
  if (!S.me || !$('#view')) return;
  if (!DEMO && Date.now() - ultimaChecagem > 5 * 60 * 1000) {
    ultimaChecagem = Date.now();
    try {
      const eu = await api.me();
      if (!eu || !eu.ativo) { S.me = eu; S.dirty = false; if (eu) renderPendente(); else renderAuth('entrar'); return; }
      if (eu.papel !== S.me.papel) { S.me = eu; renderShell(); }
    } catch { /* sem conexão: segue com o que tem */ }
  }
  const h = location.hash || '#/painel';
  const r = ROTAS.find(([re]) => re.test(h));
  if (!r) { location.hash = '#/painel'; return; }
  $('#shell').classList.remove('nav-open', 'has-savebar');
  $$('.nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === r[1]));
  window.scrollTo(0, 0);
  try { await r[2](h.match(r[0])); }
  catch (e) {
    console.error(e);
    view().innerHTML = `<div class="card">${vazio('alert', 'Não foi possível carregar', esc(msgErro(e)), '<button class="btn" id="btnReload">Tentar novamente</button>')}</div>`;
    $('#btnReload').onclick = () => location.reload();
  }
}

window.addEventListener('hashchange', async () => {
  if (ignorar) { ignorar = false; return; }
  if (S.dirty) {
    const ok = await confirmar('Descartar alterações?', 'Há informações que ainda não foram salvas neste evento.', { danger: true, ok: 'Descartar' });
    if (!ok) { ignorar = true; location.hash = ultimoHash; return; }
    S.dirty = false;
  }
  ultimoHash = location.hash;
  route();
});
window.addEventListener('beforeunload', (e) => { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

/* ================================================================
   Painel
   ================================================================ */
async function viewPainel() {
  setPage('Painel', `Olá, ${esc(primeiroNome(S.me.nome))}. Aqui está o resumo dos eventos.`,
    `<a class="btn btn-primary" href="#/eventos/novo">${ic('plus')}<span>Novo <span class="lbl-long">evento</span></span></a>`);
  carregando();
  const evs = S.eventos = await api.listEventos();
  const anos = uniq([...evs.map((e) => (e.data_inicio || '').slice(0, 4)), String(new Date().getFullYear())]).reverse();

  const desenhar = () => {
    const ano = S.anoPainel;
    const doAno = evs.filter((e) => (e.data_inicio || '').startsWith(ano));
    const por = (s) => doAno.filter((e) => e.situacao === s);
    const aprov = por('aprovado'), anal = por('analise'), repr = por('reprovado');
    const vAprov = soma(aprov, (e) => e.valor_total), vAnal = soma(anal, (e) => e.valor_total);
    const hoje = hojeISO(), lim = addDias(hoje, 30);
    const ativos = evs.filter((e) => e.situacao !== 'reprovado');
    const proximos = ativos.filter((e) => e.data_inicio && (e.data_fim || e.data_inicio) >= hoje).sort((a, b) => a.data_inicio.localeCompare(b.data_inicio));
    const em30 = proximos.filter((e) => e.data_inicio <= lim);
    const recentes = [...evs].sort((a, b) => (b.atualizado_em || '').localeCompare(a.atualizado_em || '')).slice(0, 5);

    const meses = Array.from({ length: 12 }, (_, i) => soma(doAno.filter((e) => e.situacao !== 'reprovado' && +e.data_inicio.slice(5, 7) === i + 1), (e) => e.valor_total));
    const maxM = Math.max(...meses, 1);
    const mesAtual = ano === hoje.slice(0, 4) ? +hoje.slice(5, 7) - 1 : -1;

    const porTipo = TIPOS.map((t) => { const l = doAno.filter((e) => e.tipo === t && e.situacao !== 'reprovado'); return [t, soma(l, (e) => e.valor_total), l.length]; })
      .filter((x) => x[2]).sort((a, b) => b[1] - a[1]);
    const maxT = Math.max(...porTipo.map((x) => x[1]), 1);
    const nSit = doAno.length || 1;

    const itemLista = (e) => {
      const d = e.data_inicio || '';
      return `<a href="#/eventos/${e.id}"><div class="datebox"><b>${d.slice(8, 10) || '—'}</b><span>${d ? MESES[+d.slice(5, 7) - 1] : ''}</span></div>
        <div class="grow"><div class="t">${esc(e.nome)}</div><div class="s">${esc(e.tipo)} · ${esc(e.local || 'Local a definir')}</div></div>${pill(e.situacao)}</a>`;
    };

    view().innerHTML = `
      <div class="kpis">
        <div class="kpi"><div class="ic brand">${ic('calendar')}</div><div><div class="lb">Eventos em ${ano}</div><div class="vl">${doAno.length}</div><div class="ft">${aprov.length} aprovados · ${anal.length} em análise</div></div></div>
        <div class="kpi"><div class="ic green">${ic('checkc')}</div><div><div class="lb">Investimento aprovado</div><div class="vl">${brlCurto(vAprov)}</div><div class="ft">${brl(vAprov)}</div></div></div>
        <div class="kpi"><div class="ic amber">${ic('hourglass')}</div><div><div class="lb">Aguardando aprovação</div><div class="vl">${brlCurto(vAnal)}</div><div class="ft">${anal.length} evento(s) em análise</div></div></div>
        <div class="kpi"><div class="ic blue">${ic('trend')}</div><div><div class="lb">Próximos 30 dias</div><div class="vl">${em30.length}</div><div class="ft">${em30[0] ? esc(em30[0].nome.slice(0, 28)) + ' · ' + fdate(em30[0].data_inicio).slice(0, 5) : 'Nenhum evento agendado'}</div></div></div>
      </div>
      <div class="dash">
        <div class="dash-col">
          <div class="card">
            <div class="card-h"><div><h3>Investimento por mês</h3><div class="small muted">Eventos aprovados e em análise, pela data de início</div></div><span class="sp"></span>
              <select id="selAno" style="width:auto;height:36px">${anos.map((a) => `<option ${a === ano ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
            <div class="cols">${meses.map((v, i) => `<div class="col ${i === mesAtual ? 'now' : ''}"><div class="bar ${v ? '' : 'zero'}" style="height:${v ? Math.max(4, (v / maxM) * 100) : 2}%" data-v="${esc(MESES[i] + ': ' + brl(v))}"></div><div class="m">${MESES[i]}</div></div>`).join('')}</div>
          </div>
          <div class="card">
            <div class="card-h"><div><h3>Investimento por tipo de evento</h3><div class="small muted">Aprovados e em análise em ${ano}</div></div></div>
            ${porTipo.length ? `<div class="hbars">${porTipo.map(([t, v, n]) => `<div class="hbar"><div class="top"><b>${esc(t)} <span class="muted small" style="font-weight:600">· ${n} evento(s)</span></b><span>${brl(v)}</span></div><div class="track"><div class="fill" style="width:${(v / maxT) * 100}%"></div></div></div>`).join('')}</div>`
              : '<p class="muted">Nenhum evento neste ano.</p>'}
          </div>
        </div>
        <div class="dash-col">
          <div class="card">
            <div class="card-h"><h3>Situação dos eventos</h3></div>
            <div class="stack">${SIT_ORDEM.map((s) => `<div style="width:${(por(s).length / nSit) * 100}%;background:${SIT[s].hex}" title="${SIT[s].label}"></div>`).join('')}</div>
            <div class="legend">${[['aprovado', aprov], ['analise', anal], ['reprovado', repr]].map(([s, l]) => `<div class="row"><span class="dot" style="background:${SIT[s].hex}"></span>${SIT[s].label}<span class="sp"></span><span class="muted small">${l.length} ·</span><b>${brl(soma(l, (e) => e.valor_total))}</b></div>`).join('')}</div>
          </div>
          <div class="card">
            <div class="card-h"><h3>Próximos eventos</h3><span class="sp"></span><a class="small" href="#/eventos" style="font-weight:700;text-decoration:none">Ver todos</a></div>
            ${proximos.length ? `<div class="list-ev">${proximos.slice(0, 5).map(itemLista).join('')}</div>` : '<p class="muted">Nenhum evento futuro cadastrado.</p>'}
          </div>
          <div class="card">
            <div class="card-h"><h3>Atualizados recentemente</h3></div>
            ${recentes.length ? `<div class="list-ev">${recentes.map((e) => `<a href="#/eventos/${e.id}"><div class="avatar sm">${esc(iniciais(nomeDe(e.atualizado_por || e.criado_por)))}</div><div class="grow"><div class="t">${esc(e.nome)}</div><div class="s">${esc(nomeDe(e.atualizado_por || e.criado_por))} · ${fdt(e.atualizado_em)}</div></div></a>`).join('')}</div>` : '<p class="muted">Nenhum evento cadastrado ainda.</p>'}
          </div>
        </div>
      </div>`;
    $('#selAno').onchange = (e) => { S.anoPainel = e.target.value; desenhar(); };
  };

  if (!evs.length) {
    view().innerHTML = `<div class="card">${vazio('calendar', 'Nenhum evento cadastrado', 'Comece cadastrando o primeiro evento da Dello.', `<a class="btn btn-primary" href="#/eventos/novo">${ic('plus')}Cadastrar evento</a>`)}</div>`;
    return;
  }
  desenhar();
}

/* ================================================================
   Lista de eventos
   ================================================================ */
async function viewEventos() {
  setPage('Eventos', 'Todos os eventos cadastrados. Você edita os que criou' + (isAdmin() ? ' e, como administrador, qualquer um.' : '.'),
    `<a class="btn btn-primary" href="#/eventos/novo">${ic('plus')}<span>Novo <span class="lbl-long">evento</span></span></a>`);
  carregando();
  const evs = S.eventos = await api.listEventos();
  const F = S.filtros;
  const gerentes = uniq(evs.map((e) => e.gerente));

  view().innerHTML = `<div class="card">
    <div class="filters">
      <div class="search input-icon">${ic('search')}<input id="fq" type="search" placeholder="Buscar por nome, local, gerente ou número" value="${esc(F.q)}"></div>
      <select id="ftipo" aria-label="Tipo"><option value="">Todos os tipos</option>${TIPOS.map((t) => `<option ${F.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <select id="fger" aria-label="Gerente"><option value="">Todos os gerentes</option>${gerentes.map((g) => `<option ${F.gerente === g ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>
      <label class="toggle"><input type="checkbox" id="fmeus" ${F.meus ? 'checked' : ''}><span class="sw"></span>Só os meus</label>
    </div>
    <div class="chips" id="fsit" style="margin-bottom:14px"></div>
    <div id="lista"></div>
  </div>`;

  const desenhar = () => {
    const q = F.q.trim().toLowerCase();
    const base = evs.filter((e) => (!F.tipo || e.tipo === F.tipo) && (!F.gerente || e.gerente === F.gerente) && (!F.meus || e.criado_por === S.me.id)
      && (!q || [e.nome, e.local, e.gerente, pad(e.numero), String(e.numero), e.tipo].some((x) => String(x || '').toLowerCase().includes(q))));
    const lista = base.filter((e) => !F.sit || e.situacao === F.sit);
    $('#fsit').innerHTML = [['', 'Todos', null], ...SIT_ORDEM.map((s) => [s, SIT[s].label, SIT[s].hex])]
      .map(([s, l, c]) => `<button class="chip ${F.sit === s ? 'on' : ''}" data-s="${s}">${c ? `<span class="d" style="background:${c}"></span>` : ''}${l} <span style="opacity:.6">${s ? base.filter((e) => e.situacao === s).length : base.length}</span></button>`).join('');
    $$('#fsit .chip').forEach((b) => b.onclick = () => { F.sit = b.dataset.s; desenhar(); });

    if (!evs.length) { $('#lista').innerHTML = vazio('calendar', 'Nenhum evento cadastrado', 'Cadastre o primeiro evento para começar.', `<a class="btn btn-primary" href="#/eventos/novo">${ic('plus')}Novo evento</a>`); return; }
    if (!lista.length) { $('#lista').innerHTML = vazio('search', 'Nada encontrado', 'Nenhum evento corresponde aos filtros escolhidos.'); return; }
    $('#lista').innerHTML = `<div class="tbl-wrap"><table class="tbl cards">
      <thead><tr><th>Nº</th><th>Evento</th><th class="hide-md">Tipo</th><th>Período</th><th class="hide-md">Gerente</th><th>Situação</th><th class="right">Investimento</th><th></th></tr></thead>
      <tbody>${lista.map((e) => `<tr class="click" data-id="${e.id}">
        <td data-hide><span class="seq">${pad(e.numero)}</span></td>
        <td class="c-main"><div class="ev-name">${esc(e.nome)}</div><div class="ev-sub">${ic('pin')}${esc(e.local || 'Local a definir')}</div></td>
        <td data-hide class="hide-md"><span class="tag">${esc(e.tipo)}</span></td>
        <td data-hide class="nowrap">${periodo(e)}</td>
        <td data-hide class="hide-md">${esc(e.gerente || "—")}</td>
        <td class="c-sit">${pill(e.situacao)}</td>
        <td class="c-val right num nowrap"><b>${brl(e.valor_total)}</b></td>
        <td data-hide><div class="acts">
          ${podeEditar(e) ? `<a class="btn btn-ghost icon-btn" href="#/eventos/${e.id}/editar" title="Editar" aria-label="Editar">${ic('pencil')}</a>
            <button class="btn btn-ghost icon-btn btn-danger" data-del="${e.id}" title="Excluir" aria-label="Excluir">${ic('trash')}</button>`
            : `<span class="btn btn-ghost icon-btn" title="Somente leitura: criado por ${esc(nomeDe(e.criado_por))}" style="cursor:default;color:var(--mute)">${ic('lock')}</span>`}
        </div></td>
        <td class="c-meta m-only">Nº ${pad(e.numero)} · ${esc(e.tipo)} · ${periodo(e)}</td>
      </tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="2" data-hide>${lista.length} evento(s)</td><td data-hide class="hide-md"></td><td data-hide></td><td data-hide class="hide-md"></td><td data-hide></td><td class="right num nowrap" data-hide>${brl(soma(lista, (e) => e.valor_total))}</td><td data-hide></td></tr></tfoot>
    </table></div>`;
    $$('#lista tr.click').forEach((tr) => tr.addEventListener('click', (ev) => { if (!ev.target.closest('a,button')) location.hash = '#/eventos/' + tr.dataset.id; }));
    $$('#lista [data-del]').forEach((b) => b.addEventListener('click', () => excluirEvento(evs.find((e) => e.id === b.dataset.del), () => viewEventos())));
  };

  let t;
  $('#fq').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; desenhar(); }, 150); });
  $('#ftipo').onchange = (e) => { F.tipo = e.target.value; desenhar(); };
  $('#fger').onchange = (e) => { F.gerente = e.target.value; desenhar(); };
  $('#fmeus').onchange = (e) => { F.meus = e.target.checked; desenhar(); };
  desenhar();
}

async function excluirEvento(ev, depois) {
  const ok = await confirmar(`Excluir o evento Nº ${pad(ev.numero)}?`, `"${ev.nome}" será removido para todos os usuários. A exclusão fica registrada no histórico e não pode ser desfeita.`, { danger: true, icon: 'trash', ok: 'Excluir evento' });
  if (!ok) return;
  try {
    try { await api.limparAnexos(ev.id); } catch { /* sem arquivos ou sem acesso ao armazenamento */ }
    await api.deleteEvento(ev.id); toast('Evento excluído'); depois();
  }
  catch (e) { toast(msgErro(e), 'err'); }
}

/* ================================================================
   Detalhe do evento
   ================================================================ */
function linhasEvento(e) {
  const d = e.dados || {}, L = [];
  const ce = d.contratoEvento || {}, mo = d.montadora || {};
  if (ce.valor || ce.data || ce.area) L.push(['Contrato do evento', [ce.data && 'Aprovação ' + fdate(ce.data), ce.area && ce.area + ' m²'].filter(Boolean).join(' · '), ce.valor]);
  if (mo.valor || mo.nome) L.push(['Montadora', [mo.nome, mo.data && fdate(mo.data)].filter(Boolean).join(' · '), mo.valor]);
  (d.servicos || []).filter((s) => s.qt || s.valor).forEach((s) => L.push(['Serviço', `${s.nome}${s.qt ? ' · qtde ' + s.qt : ''}`, s.valor]));
  (d.gastos || []).filter((g) => g.qt || g.valor || g.obs).forEach((g) => L.push(['Gasto diverso', `${g.nome}${g.qt ? ' · qtde ' + g.qt : ''}${g.obs ? ' · ' + g.obs : ''}`, g.valor]));
  (d.hospedagem || []).forEach((h) => L.push(['Hospedagem', [h.nome, h.hotel, (h.chegada || h.saida) && `${fdate(h.chegada)} a ${fdate(h.saida)}`, h.codigo && 'Reserva ' + h.codigo].filter(Boolean).join(' · '), h.valor]));
  (d.alimentacao || []).forEach((a) => L.push(['Alimentação', [fdate(a.data), a.local, a.obs].filter(Boolean).join(' · '), a.valor]));
  (d.passagens || []).forEach((p) => L.push(['Passagem', [p.quem, p.meio, (p.origem || p.destino) && `${p.origem || '?'} → ${p.destino || '?'}`, p.data && fdate(p.data) + (p.hora ? ' ' + p.hora : ''), p.codigo && 'Reserva ' + p.codigo].filter(Boolean).join(' · '), p.valor]));
  return L;
}

function textoEvento(e) {
  return `*Nº ${pad(e.numero)} — ${e.nome}*\n${SIT[e.situacao]?.label} · ${e.tipo}\n${periodo(e)}${e.local ? ' · ' + e.local : ''}\nGerente: ${e.gerente || '—'}\n` +
    linhasEvento(e).map(([g, d, v]) => `• ${g}${d ? ': ' + d : ''} — ${brl(v)}`).join('\n') + `\n*Total: ${brl(e.valor_total)}*`;
}

async function viewDetalhe(id) {
  carregando();
  const e = await api.getEvento(id);
  if (!e) {
    setPage('Evento não encontrado');
    view().innerHTML = `<div class="card">${vazio('alert', 'Evento não encontrado', 'Ele pode ter sido excluído.', `<a class="btn" href="#/eventos">${ic('back')}Voltar para eventos</a>`)}</div>`;
    return;
  }
  const d = e.dados || {}, st = subtotais(d), pode = podeEditar(e);
  setPage(`Evento Nº ${pad(e.numero)}`, `<a href="#/eventos" style="text-decoration:none;font-weight:600">← Eventos</a>`,
    `<button class="btn" id="dPrint" title="Imprimir">${ic('printer')}<span class="lbl-long">Imprimir</span></button>
     <button class="btn" id="dWa" title="Compartilhar no WhatsApp">${ic('whats')}<span class="lbl-long">WhatsApp</span></button>
     <a class="btn" href="#/eventos/${e.id}/duplicar" title="Duplicar">${ic('copy')}<span class="lbl-long">Duplicar</span></a>
     ${pode ? `<button class="btn btn-danger" id="dDel" title="Excluir">${ic('trash')}</button><a class="btn btn-primary" href="#/eventos/${e.id}/editar">${ic('pencil')}Editar</a>` : ''}`);

  const tabela = (cols, rows, total) => rows.length ? `<table class="mini"><thead><tr>${cols.map((c) => `<th class="${c[1] || ''}">${c[0]}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((v, i) => `<td class="${cols[i][1] || ''}">${v}</td>`).join('')}</tr>`).join('')}</tbody>
    ${total != null ? `<tfoot><tr><td colspan="${cols.length - 1}">Subtotal</td><td class="r">${brl(total)}</td></tr></tfoot>` : ''}</table>` : '<p class="muted small" style="margin:0">Nada informado.</p>';
  const ce = d.contratoEvento || {}, mo = d.montadora || {};
  const maxC = Math.max(...Object.values(st), 1);

  view().innerHTML = `
    ${pode ? '' : `<div class="info no-print">${ic('lock')}<div>Somente leitura. Este evento foi criado por <b>${esc(nomeDe(e.criado_por))}</b>; só essa pessoa ou um administrador pode alterá-lo.</div></div>`}
    <div class="print-only" style="margin-bottom:16px"><img src="assets/logo-dello.png" alt="Dello" style="width:90px"></div>
    <div class="card">
      <div class="det-head">
        <div class="grow">${pill(e.situacao)} <span class="tag brand">${esc(e.tipo)}</span>
          <h2>${esc(e.nome)}</h2>
          <div class="muted" style="display:flex;align-items:center;gap:6px">${ic('pin')}${esc(e.local || 'Local a definir')}</div></div>
        <div class="total-box"><span>Valor total de investimento</span><b>${brl(e.valor_total)}</b></div>
      </div>
      <div class="facts">
        <div><span>Período</span><b>${periodo(e)}</b></div>
        <div><span>Gerente responsável</span><b>${esc(e.gerente || '—')}</b></div>
        <div><span>Cadastrado por</span><b>${esc(nomeDe(e.criado_por))}</b><div class="small muted">${fdt(e.criado_em)}</div></div>
        <div><span>Última alteração</span><b>${esc(nomeDe(e.atualizado_por || e.criado_por))}</b><div class="small muted">${fdt(e.atualizado_em)}</div></div>
      </div>
    </div>
    <div class="det-grid">
      <div class="card"><div class="card-h"><h3>Composição do investimento</h3></div>
        <div class="hbars">${CATS.map(([k, l]) => `<div class="hbar"><div class="top"><b>${l}</b><span>${brl(st[k])}</span></div><div class="track"><div class="fill" style="width:${(st[k] / maxC) * 100}%"></div></div></div>`).join('')}</div></div>
      <div class="card"><div class="card-h"><h3>Contratos</h3><span class="sp"></span><b class="num">${brl(st.contratos)}</b></div>
        <div class="sub-h" style="margin-top:0">Contrato sobre o evento</div>
        <div class="grid g3"><div><div class="lbl">Aprovação</div>${fdate(ce.data) || '—'}</div><div><div class="lbl">Área</div>${ce.area ? esc(String(ce.area).replace('.', ',')) + ' m²' : '—'}</div><div><div class="lbl">Valor</div>${brl(ce.valor)}</div></div>
        <div class="sub-h">Contrato da montadora</div>
        <div class="grid g3"><div><div class="lbl">Data</div>${fdate(mo.data) || '—'}</div><div><div class="lbl">Montadora</div>${esc(mo.nome || '—')}</div><div><div class="lbl">Valor</div>${brl(mo.valor)}</div></div>
      </div>
      <div class="card"><div class="card-h"><h3>Serviços contratados</h3></div>
        ${tabela([['Item'], ['Qtde', 'r'], ['Valor', 'r']], (d.servicos || []).filter((s) => s.qt || s.valor).map((s) => [esc(s.nome), esc(s.qt || '—'), brl(s.valor)]), st.servicos)}</div>
      <div class="card"><div class="card-h"><h3>Gastos diversos</h3></div>
        ${tabela([['Item'], ['Qtde', 'r'], ['Obs.'], ['Valor', 'r']], (d.gastos || []).filter((g) => g.qt || g.valor || g.obs).map((g) => [esc(g.nome), esc(g.qt || '—'), esc(g.obs || ''), brl(g.valor)]), st.gastos)}</div>
      <div class="card full"><div class="card-h"><h3>Envolvidos</h3></div>
        ${(d.envolvidos || []).length ? `<div class="people">${d.envolvidos.map((n) => `<span class="person"><span class="avatar sm">${esc(iniciais(n))}</span>${esc(n)}</span>`).join('')}</div>` : '<p class="muted small" style="margin:0">Nenhum envolvido informado.</p>'}</div>
      <div class="card full"><div class="card-h"><h3>Hospedagem</h3></div><div style="overflow-x:auto">
        ${tabela([['Hóspede'], ['Hotel'], ['Chegada'], ['Saída'], ['Contato'], ['Reserva'], ['Valor', 'r']], (d.hospedagem || []).map((h) => [esc(h.nome), esc(h.hotel), fdate(h.chegada), fdate(h.saida), [h.contato, h.telefone, h.email].filter(Boolean).map(esc).join('<br>'), esc(h.codigo), brl(h.valor)]), st.hospedagem)}</div></div>
      <div class="card"><div class="card-h"><h3>Alimentação</h3></div>
        ${tabela([['Data'], ['Local'], ['Descrição'], ['Valor', 'r']], (d.alimentacao || []).map((a) => [fdate(a.data), esc(a.local), esc(a.obs), brl(a.valor)]), st.alimentacao)}</div>
      <div class="card"><div class="card-h"><h3>Passagens / condução</h3></div><div style="overflow-x:auto">
        ${tabela([['Quem'], ['Meio'], ['Trecho'], ['Data'], ['Reserva'], ['Valor', 'r']], (d.passagens || []).map((p) => [esc(p.quem), esc(p.meio), esc([p.origem, p.destino].filter(Boolean).join(' → ')), fdate(p.data) + (p.hora ? ' ' + esc(p.hora) : ''), esc(p.codigo), brl(p.valor)]), st.passagens)}</div></div>
      ${d.observacoes ? `<div class="card full"><div class="card-h"><h3>Observações</h3></div><div style="white-space:pre-wrap">${esc(d.observacoes)}</div></div>` : ''}
      <div class="card full" id="anxCard"><div class="card-h"><h3>Fotos e arquivos <span class="muted small" id="anxCount"></span></h3><span class="sp"></span>
        <span class="small muted hidden no-print" id="anxStatus"></span>
        ${pode ? `<label class="btn btn-sm btn-primary no-print" for="anxInput">${ic('upload')}Adicionar</label><input type="file" id="anxInput" multiple accept="image/*,application/pdf" class="hidden">` : ''}</div>
        <div id="anxBox"></div></div>
      <div class="card full no-print"><div class="card-h"><h3>Histórico deste evento</h3></div><div id="dHist"><div class="spinner"></div></div></div>
    </div>`;

  $('#dPrint').onclick = () => window.print();
  carregarAnexos(e, pode);
  if (pode) {
    $('#anxInput').onchange = (x) => { enviarAnexos(e, x.target.files, pode); x.target.value = ''; };
    const card = $('#anxCard');
    card.addEventListener('dragover', (x) => { x.preventDefault(); card.classList.add('drag'); });
    card.addEventListener('dragleave', (x) => { if (!card.contains(x.relatedTarget)) card.classList.remove('drag'); });
    card.addEventListener('drop', (x) => { x.preventDefault(); card.classList.remove('drag'); enviarAnexos(e, x.dataTransfer.files, pode); });
  }
  $('#dWa').onclick = () => window.open('https://wa.me/?text=' + encodeURIComponent(textoEvento(e)), '_blank', 'noopener');
  $('#dDel')?.addEventListener('click', () => excluirEvento(e, () => { location.hash = '#/eventos'; }));
  api.historico(e.id).then((hs) => { $('#dHist') && ($('#dHist').innerHTML = hs.length ? timeline(hs, false) : '<p class="muted small" style="margin:0">Sem registros.</p>'); })
    .catch(() => { $('#dHist') && ($('#dHist').innerHTML = '<p class="muted small">Não foi possível carregar o histórico.</p>'); });
}

/* ================================================================
   Fotos e arquivos do evento
   ================================================================ */
const TIPOS_ANEXO = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;
const MAX_ANEXO = 10 * 1024 * 1024;
const nomeArquivo = (n) => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').slice(-80) || 'arquivo';
const nomeExibicao = (n) => String(n).replace(/^\d+-/, '');
const tamanhoArq = (b) => b >= 1048576 ? (b / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';

// Fotos grandes são reduzidas (até 2000 px, JPEG) antes do envio, para economizar espaço
async function prepararArquivo(f) {
  if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size < 700 * 1024) return f;
  try {
    const bmp = await createImageBitmap(f);
    const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
    if (!blob || blob.size >= f.size) return f;
    return new File([blob], f.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch { return f; }
}

async function carregarAnexos(ev, pode) {
  const box = $('#anxBox');
  if (!box) return;
  box.innerHTML = '<div class="spinner"></div>';
  let lista;
  try { lista = await api.listarAnexos(ev.id); }
  catch (x) { box.innerHTML = `<p class="muted small" style="margin:0">Não foi possível carregar os arquivos. ${esc(msgErro(x))}</p>`; return; }
  if (!$('#anxBox')) return;
  $('#anxCount').textContent = lista.length ? `(${lista.length})` : '';
  if (!lista.length) {
    box.innerHTML = `<div class="anx-empty">${ic('image')}<div>${pode ? 'Nenhum arquivo ainda. Clique em <b>Adicionar</b> ou arraste fotos e PDFs para cá (fotos do estande, projeto, contratos…).' : 'Nenhum arquivo anexado.'}</div></div>`;
    return;
  }
  const imgs = lista.filter((a) => a.tipo.startsWith('image/'));
  box.innerHTML = `<div class="anx-grid">${lista.map((a, i) => {
    const img = a.tipo.startsWith('image/'), nome = esc(nomeExibicao(a.nome));
    return `<div class="anx">
      <button type="button" class="anx-th" data-abrir="${i}" title="${nome}">${img ? `<img src="${esc(a.url)}" alt="${nome}" loading="lazy">` : `<span class="anx-doc">${ic('file')}<b>PDF</b></span>`}</button>
      <div class="anx-inf"><span title="${nome}">${nome}</span><small>${tamanhoArq(a.tamanho)} · ${fdia(a.criado_em)}</small></div>
      ${pode ? `<button type="button" class="btn btn-ghost icon-btn anx-del no-print" data-del-anx="${i}" title="Excluir arquivo" aria-label="Excluir arquivo">${ic('trash')}</button>` : ''}
    </div>`;
  }).join('')}</div>`;
  $$('[data-abrir]', box).forEach((b) => b.addEventListener('click', () => {
    const a = lista[+b.dataset.abrir];
    if (a.tipo.startsWith('image/')) abrirGaleria(imgs, imgs.indexOf(a));
    else window.open(a.url, '_blank', 'noopener');
  }));
  $$('[data-del-anx]', box).forEach((b) => b.addEventListener('click', async () => {
    const a = lista[+b.dataset.delAnx];
    if (!(await confirmar('Excluir este arquivo?', `"${nomeExibicao(a.nome)}" será removido do evento para todos.`, { danger: true, icon: 'trash', ok: 'Excluir' }))) return;
    try { await api.excluirAnexo(a.path); toast('Arquivo excluído'); carregarAnexos(ev, pode); }
    catch (x) { toast(msgErro(x), 'err'); }
  }));
}

async function enviarAnexos(ev, arquivos, pode) {
  const lista = [...(arquivos || [])];
  if (!lista.length) return;
  const st = $('#anxStatus');
  let ok = 0;
  for (let i = 0; i < lista.length; i++) {
    const f = lista[i];
    if (!TIPOS_ANEXO.test(f.type)) { toast(`"${f.name}": envie fotos (JPG, PNG, WEBP, GIF) ou PDF.`, 'err'); continue; }
    st.textContent = `Enviando ${i + 1} de ${lista.length}…`;
    st.classList.remove('hidden');
    const pronto = await prepararArquivo(f);
    if (pronto.size > MAX_ANEXO) { toast(`"${f.name}" passa de 10 MB.`, 'err'); continue; }
    try { await api.enviarAnexo(ev.id, pronto, nomeArquivo(pronto.name)); ok++; }
    catch (x) { toast(`"${f.name}": ${msgErro(x)}`, 'err'); }
  }
  st.classList.add('hidden');
  if (ok) toast(ok === 1 ? 'Arquivo enviado' : `${ok} arquivos enviados`);
  carregarAnexos(ev, pode);
}

function abrirGaleria(imgs, inicio) {
  let i = Math.max(0, inicio);
  const bg = document.createElement('div');
  bg.className = 'lightbox';
  bg.setAttribute('role', 'dialog');
  const mover = (d) => { i = (i + d + imgs.length) % imgs.length; desenhar(); };
  const fechar = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = (e) => {
    if (e.key === 'Escape') fechar();
    if (imgs.length > 1 && e.key === 'ArrowLeft') mover(-1);
    if (imgs.length > 1 && e.key === 'ArrowRight') mover(1);
  };
  function desenhar() {
    const a = imgs[i];
    bg.innerHTML = `<button type="button" class="lb-x" aria-label="Fechar">${ic('x')}</button>
      ${imgs.length > 1 ? `<button type="button" class="lb-nav lb-prev" aria-label="Anterior">${ic('chevL')}</button><button type="button" class="lb-nav lb-next" aria-label="Próxima">${ic('chevR')}</button>` : ''}
      <figure><img src="${esc(a.url)}" alt="${esc(nomeExibicao(a.nome))}"><figcaption>${esc(nomeExibicao(a.nome))} · ${i + 1} de ${imgs.length} · <a href="${esc(a.url)}" target="_blank" rel="noopener">Abrir original</a></figcaption></figure>`;
    $('.lb-x', bg).onclick = fechar;
    $('.lb-prev', bg)?.addEventListener('click', () => mover(-1));
    $('.lb-next', bg)?.addEventListener('click', () => mover(1));
  }
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.tagName === 'FIGURE') fechar(); });
  document.addEventListener('keydown', onKey);
  desenhar();
  document.body.append(bg);
}

/* ================================================================
   Formulário (incluir / alterar / duplicar)
   ================================================================ */
function novoEvento() {
  return { id: null, numero: null, situacao: 'analise', tipo: TIPOS[0], data_inicio: '', data_fim: '', nome: '', local: '', gerente: S.me?.nome || '', dados: {} };
}
function normalizarDados(d = {}) {
  const fx = (lista, salvos = []) => [
    ...lista.map((n) => ({ qt: '', valor: '', obs: '', ...(salvos.find((s) => s.nome === n && s.fixo !== false) || {}), nome: n, fixo: true })),
    ...salvos.filter((s) => s.fixo === false || !lista.includes(s.nome)).map((s) => ({ ...s, fixo: false })),
  ];
  return {
    contratoEvento: { data: '', area: '', valor: '', ...(d.contratoEvento || {}) },
    montadora: { data: '', nome: '', valor: '', ...(d.montadora || {}) },
    servicos: fx(SERVICOS, d.servicos), gastos: fx(GASTOS, d.gastos),
    envolvidos: [...(d.envolvidos || [])], hospedagem: [...(d.hospedagem || [])],
    alimentacao: [...(d.alimentacao || [])], passagens: [...(d.passagens || [])],
    observacoes: d.observacoes || '',
  };
}

function campoRep(c, v) {
  let inp;
  if (c.t === 'select') inp = `<select data-k="${c.k}">${c.opts.map((o) => `<option ${v === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
  else if (c.t === 'money') inp = `<div class="prefix"><span>R$</span><input class="money" inputmode="decimal" data-k="${c.k}" value="${fmtNum(v)}" placeholder="0,00" autocomplete="off"></div>`;
  else inp = `<input type="${c.t || 'text'}" data-k="${c.k}" value="${esc(v ?? '')}" ${c.list ? `list="${c.list}"` : ''} placeholder="${esc(c.ph || '')}" maxlength="200" autocomplete="off">`;
  if (!c.l) return inp;
  return `<div class="field ${c.span === 2 ? 'span2' : ''}"><label>${c.l}</label>${inp}</div>`;
}
function repHtml(tipo, obj = {}, n = 1) {
  const cfg = REP[tipo];
  if (cfg.compact) {
    return `<div class="rep compact" data-rep><span class="n">${n}</span><div class="rep-grid">${campoRep(cfg.campos[0], typeof obj === 'string' ? obj : obj.nome)}</div>
      <button type="button" class="btn btn-ghost icon-btn" data-rm title="Remover" aria-label="Remover">${ic('x')}</button></div>`;
  }
  return `<div class="rep" data-rep><div class="rep-h"><span class="n">${cfg.titulo} ${n}</span><span class="sp"></span>
    <button type="button" class="btn btn-ghost icon-btn" data-rm title="Remover" aria-label="Remover">${ic('trash')}</button></div>
    <div class="rep-grid">${cfg.campos.map((c) => campoRep(c, obj[c.k])).join('')}</div></div>`;
}
function itemHtml(grupo, it) {
  const obs = grupo === 'gastos';
  const cheio = it.qt || it.valor;
  return `<tr data-item ${it.fixo ? `data-fixo="1" data-nome="${esc(it.nome)}"` : ''} class="${cheio ? 'has' : ''}">
    <td class="it">${it.fixo ? esc(it.nome) : `<input data-k="nome" value="${esc(it.nome)}" placeholder="Descrição do item" maxlength="120" style="min-width:150px">`}</td>
    <td class="q"><input type="number" min="0" step="1" inputmode="numeric" data-k="qt" value="${esc(it.qt ?? '')}" placeholder="0"></td>
    <td class="v"><div class="prefix"><span>R$</span><input class="money" inputmode="decimal" data-k="valor" value="${fmtNum(it.valor)}" placeholder="0,00" autocomplete="off"></div></td>
    ${obs ? `<td class="o"><input data-k="obs" value="${esc(it.obs || '')}" placeholder="Observação" maxlength="300"></td>` : ''}
    <td class="x">${it.fixo ? '' : `<button type="button" class="btn btn-ghost icon-btn" data-rm-item title="Remover" aria-label="Remover">${ic('x')}</button>`}</td></tr>`;
}

async function viewForm(id, duplicar = false) {
  carregando();
  let ev;
  if (id) {
    ev = await api.getEvento(id);
    if (!ev) { location.hash = '#/eventos'; toast('Evento não encontrado', 'err'); return; }
    if (duplicar) ev = { ...clone(ev), id: null, numero: null, nome: ev.nome + ' (cópia)', situacao: 'analise', criado_por: null };
    else if (!podeEditar(ev)) { toast('Você só pode editar eventos que você criou.', 'err'); location.hash = '#/eventos/' + id; return; }
  } else ev = novoEvento();
  const novo = !ev.id;
  const d = normalizarDados(ev.dados);
  if (!S.eventos.length) { try { S.eventos = await api.listEventos(); } catch { /* sugestões são opcionais */ } }
  const sugGerentes = uniq([...S.perfis.filter((p) => p.ativo).map((p) => p.nome), ...S.eventos.map((e) => e.gerente)]);
  const sugLocais = uniq(S.eventos.map((e) => e.local));

  setPage(novo ? (duplicar ? 'Duplicar evento' : 'Novo evento') : `Editar evento Nº ${pad(ev.numero)}`,
    novo ? 'Preencha as informações. O número é gerado automaticamente ao salvar.' : esc(ev.nome),
    `<a class="btn" href="${novo ? '#/eventos' : '#/eventos/' + ev.id}">Cancelar</a><button class="btn btn-primary" type="submit" form="frm">${ic('save')}Salvar</button>`);
  $('#shell').classList.add('has-savebar');

  const secH = (n, t, p, stId) => `<div class="sec-h"><span class="sec-n">${n}</span><div><h2>${t}</h2>${p ? `<p>${p}</p>` : ''}</div><span class="sp"></span>${stId ? `<span class="sub-total" id="st-${stId}"></span>` : ''}</div>`;
  const reps = (tipo, lista) => `<div class="reps" id="rp-${tipo}">${(lista.length ? lista : [{}]).map((o, i) => repHtml(tipo, o, i + 1)).join('')}</div>
    <button type="button" class="btn add-row" data-add="${tipo}">${ic('plus')}${REP[tipo].add}</button>`;
  const hintEnter = `<div class="kbd-hint">${ic('info')}<span><kbd>Enter</kbd> no último campo abre uma nova linha · <kbd>Enter</kbd> numa linha vazia pula para a próxima seção</span></div>`;

  view().innerHTML = `<form id="frm" novalidate autocomplete="off"><div class="form-layout">
    <div class="form-main">
      <section class="card">
        ${secH(1, 'Dados do evento', 'Informações que aparecem no resumo e nos relatórios')}
        <div class="lbl">Situação</div>
        <div class="seg" id="seg" style="margin-bottom:18px">${SIT_ORDEM.map((s) => `<label class="${SIT[s].cor} ${ev.situacao === s ? 'on' : ''}"><input type="radio" name="sit" value="${s}" ${ev.situacao === s ? 'checked' : ''}><span class="d"></span><span><b>${SIT[s].label}</b><small>${SIT[s].cx}</small></span></label>`).join('')}</div>
        <div class="grid g3">
          <div class="field span2"><label for="f-nome">Nome do evento <span class="req">*</span></label><input id="f-nome" value="${esc(ev.nome)}" placeholder="Ex.: Feira Escolar 2027" maxlength="160"></div>
          <div class="field"><label for="f-tipo">Tipo de evento</label><select id="f-tipo">${TIPOS.map((t) => `<option ${ev.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}${TIPOS.includes(ev.tipo) ? '' : `<option selected>${esc(ev.tipo)}</option>`}</select></div>
          <div class="field"><label for="f-inicio">Data de início</label><input id="f-inicio" type="date" value="${esc(ev.data_inicio || '')}"></div>
          <div class="field"><label for="f-fim">Data de término</label><input id="f-fim" type="date" value="${esc(ev.data_fim || '')}"></div>
          <div class="field"><label for="f-gerente">Gerente responsável</label><input id="f-gerente" list="dl-ger" value="${esc(ev.gerente)}" placeholder="Nome do gerente" maxlength="150"></div>
          <div class="field span-all"><label for="f-local">Local do evento</label><input id="f-local" list="dl-loc" value="${esc(ev.local)}" placeholder="Pavilhão, cidade/UF" maxlength="300"></div>
        </div>
      </section>

      <section class="card">
        ${secH(2, 'Contratos', 'Contrato do espaço e da montadora do estande', 'contratos')}
        <div class="sub-h" style="margin-top:0">Contrato sobre o evento</div>
        <div class="grid g3">
          <div class="field"><label for="f-ce-data">Data de aprovação</label><input id="f-ce-data" type="date" value="${esc(d.contratoEvento.data)}"></div>
          <div class="field"><label for="f-ce-area">Área (m²)</label><input id="f-ce-area" inputmode="decimal" value="${esc(d.contratoEvento.area ?? '')}" placeholder="0"></div>
          <div class="field"><label for="f-ce-valor">Valor</label><div class="prefix"><span>R$</span><input id="f-ce-valor" class="money" inputmode="decimal" value="${fmtNum(d.contratoEvento.valor)}" placeholder="0,00"></div></div>
        </div>
        <div class="sub-h">Contrato da montadora</div>
        <div class="grid g3">
          <div class="field"><label for="f-mo-data">Data do contrato</label><input id="f-mo-data" type="date" value="${esc(d.montadora.data)}"></div>
          <div class="field"><label for="f-mo-nome">Montadora</label><input id="f-mo-nome" value="${esc(d.montadora.nome)}" placeholder="Nome da montadora" maxlength="200"></div>
          <div class="field"><label for="f-mo-valor">Valor</label><div class="prefix"><span>R$</span><input id="f-mo-valor" class="money" inputmode="decimal" value="${fmtNum(d.montadora.valor)}" placeholder="0,00"></div></div>
        </div>
      </section>

      <section class="card">
        ${secH(3, 'Serviços contratados', 'Mobiliário e equipamentos do estande', 'servicos')}
        <table class="items" id="it-servicos"><thead><tr><th>Item</th><th>Qtde</th><th>Valor</th><th></th></tr></thead><tbody>${d.servicos.map((s) => itemHtml('servicos', s)).join('')}</tbody></table>
        <button type="button" class="btn add-row btn-sm" data-add-item="servicos">${ic('plus')}Outro serviço</button>
      </section>

      <section class="card">
        ${secH(4, 'Gastos diversos', 'Materiais, brindes e itens de apoio', 'gastos')}
        <table class="items" id="it-gastos"><thead><tr><th>Item</th><th>Qtde</th><th>Valor</th><th class="o">Observação</th><th></th></tr></thead><tbody>${d.gastos.map((g) => itemHtml('gastos', g)).join('')}</tbody></table>
        <button type="button" class="btn add-row btn-sm" data-add-item="gastos">${ic('plus')}Outro gasto</button>
      </section>

      <section class="card">
        ${secH(5, 'Envolvidos', 'Pessoas que participam do evento. Os nomes viram sugestão em hospedagem e passagens.')}
        ${reps('envolvidos', d.envolvidos)}
      </section>

      <section class="card">
        ${secH(6, 'Hospedagem', 'Uma linha por hóspede', 'hospedagem')}
        ${reps('hospedagem', d.hospedagem)}${hintEnter}
      </section>

      <section class="card">
        ${secH(7, 'Alimentação', '', 'alimentacao')}
        ${reps('alimentacao', d.alimentacao)}
      </section>

      <section class="card">
        ${secH(8, 'Passagem / condução', 'Uma linha por pessoa e trecho', 'passagens')}
        ${reps('passagens', d.passagens)}
      </section>

      <section class="card">
        ${secH(9, 'Observações', 'Informações adicionais sobre o evento')}
        <textarea id="f-obs" placeholder="Opcional" maxlength="5000">${esc(d.observacoes)}</textarea>
        <div class="kbd-hint">${ic('image')}<span>Fotos do estande, projeto e outros arquivos são adicionados na página do evento, depois de salvar.</span></div>
      </section>
    </div>

    <aside class="resumo"><div class="card">
      <div class="num-ev">${novo ? 'Novo evento · Nº automático' : 'Evento Nº ' + pad(ev.numero)}</div>
      <div class="ev-t" id="rs-nome"></div>
      <div id="rs-sit" style="margin-bottom:14px"></div>
      <div class="lines">${CATS.map(([k, l]) => `<div data-c="${k}"><span>${l}</span><b></b></div>`).join('')}</div>
      <div class="tot"><span>Valor total de investimento</span><b id="rs-tot"></b></div>
      <div class="btns"><button class="btn btn-primary btn-block" type="submit">${ic('save')}${novo ? 'Salvar evento' : 'Salvar alterações'}</button>
        <a class="btn btn-block" href="${novo ? '#/eventos' : '#/eventos/' + ev.id}">Cancelar</a></div>
      ${novo ? '' : `<div class="meta">Cadastrado por ${esc(nomeDe(ev.criado_por))} em ${fdt(ev.criado_em)}<br>Última alteração: ${esc(nomeDe(ev.atualizado_por))}, ${fdt(ev.atualizado_em)}</div>`}
    </div></aside>
  </div>
  <div class="savebar"><div class="t"><span>Total</span><b id="sb-tot"></b></div><button class="btn btn-primary" type="submit">${ic('save')}Salvar</button></div>
  <datalist id="dl-env"></datalist>
  <datalist id="dl-ger">${sugGerentes.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
  <datalist id="dl-loc">${sugLocais.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
  </form>`;

  const frm = $('#frm');

  const ler = () => {
    const v = (id) => $('#f-' + id).value.trim();
    const itens = (g) => $$(`#it-${g} tr[data-item]`).map((tr) => {
      const q = $('[data-k=qt]', tr).value;
      const o = { nome: tr.dataset.fixo ? tr.dataset.nome : $('[data-k=nome]', tr).value.trim(), fixo: !!tr.dataset.fixo, qt: q === '' ? '' : Math.min(999999, Math.max(0, Math.round(Number(q)) || 0)), valor: parseMoney($('[data-k=valor]', tr).value) };
      const ob = $('[data-k=obs]', tr);
      if (ob) o.obs = ob.value.trim();
      return o;
    });
    const linhas = (t) => $$(`#rp-${t} [data-rep]`).map((r) => {
      const o = {};
      $$('[data-k]', r).forEach((i) => { o[i.dataset.k] = i.classList.contains('money') ? parseMoney(i.value) : i.value.trim(); });
      return o;
    });
    const area = v('ce-area');
    return {
      situacao: $('input[name=sit]:checked', frm)?.value || 'analise', tipo: v('tipo'), nome: v('nome'), local: v('local'), gerente: v('gerente'),
      data_inicio: v('inicio'), data_fim: v('fim'),
      dados: {
        contratoEvento: { data: v('ce-data'), area: area ? parseMoney(area) : '', valor: parseMoney(v('ce-valor')) },
        montadora: { data: v('mo-data'), nome: v('mo-nome'), valor: parseMoney(v('mo-valor')) },
        servicos: itens('servicos'), gastos: itens('gastos'),
        envolvidos: linhas('envolvidos').map((r) => r.nome), hospedagem: linhas('hospedagem'),
        alimentacao: linhas('alimentacao'), passagens: linhas('passagens'), observacoes: $('#f-obs').value.trim(),
      },
    };
  };

  const atualizar = () => {
    const f = ler(), st = subtotais(f.dados), tot = totalDe(f.dados);
    $('#rs-nome').textContent = f.nome || 'Evento sem nome';
    $('#rs-sit').innerHTML = pill(f.situacao) + ` <span class="tag">${esc(f.tipo)}</span>`;
    CATS.forEach(([k]) => {
      const row = $(`.lines [data-c="${k}"]`);
      row.classList.toggle('z', !st[k]);
      $('b', row).textContent = brl(st[k]);
      const s = $('#st-' + k); if (s) s.textContent = st[k] ? brl(st[k]) : '';
    });
    $('#rs-tot').textContent = brl(tot);
    $('#sb-tot').textContent = brl(tot);
    $$('.items tr[data-item]').forEach((tr) => tr.classList.toggle('has', !!($('[data-k=qt]', tr).value || parseMoney($('[data-k=valor]', tr).value))));
    $$('#seg label').forEach((l) => l.classList.toggle('on', $('input', l).checked));
    $('#dl-env').innerHTML = uniq(f.dados.envolvidos).map((n) => `<option value="${esc(n)}">`).join('');
  };
  const renumerar = (box) => $$('[data-rep]', box).forEach((r, i) => { const n = $('.n', r); n.textContent = box.id === 'rp-envolvidos' ? i + 1 : `${REP[box.id.slice(3)].titulo} ${i + 1}`; });
  const addRep = (tipo, foco = true) => {
    const box = $('#rp-' + tipo);
    box.insertAdjacentHTML('beforeend', repHtml(tipo, {}, $$('[data-rep]', box).length + 1));
    if (foco) $('[data-k]', box.lastElementChild).focus();
    return box.lastElementChild;
  };
  atualizar();

  frm.addEventListener('input', () => { S.dirty = true; atualizar(); });
  frm.addEventListener('change', atualizar);
  frm.addEventListener('focusin', (e) => { if (e.target.classList.contains('money')) setTimeout(() => e.target.select(), 0); });
  frm.addEventListener('focusout', (e) => {
    const t = e.target;
    if (t.classList.contains('money') && t.value.trim()) t.value = fmtNum(parseMoney(t.value));
  });
  frm.addEventListener('click', (e) => {
    const a = e.target.closest('[data-add]');
    if (a) { addRep(a.dataset.add); S.dirty = true; return; }
    const ai = e.target.closest('[data-add-item]');
    if (ai) {
      const tb = $(`#it-${ai.dataset.addItem} tbody`);
      tb.insertAdjacentHTML('beforeend', itemHtml(ai.dataset.addItem, { nome: '', qt: '', valor: '', obs: '', fixo: false }));
      $('[data-k=nome]', tb.lastElementChild).focus();
      S.dirty = true; return;
    }
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      const rep = rm.closest('[data-rep]'), box = rep.parentElement;
      if ($$('[data-rep]', box).length > 1) rep.remove();
      else $$('[data-k]', rep).forEach((i) => { if (i.tagName !== 'SELECT') i.value = ''; });
      renumerar(box); atualizar(); S.dirty = true; return;
    }
    const ri = e.target.closest('[data-rm-item]');
    if (ri) { ri.closest('tr').remove(); atualizar(); S.dirty = true; }
  });

  // Enter avança de campo; no fim de uma linha preenchida abre outra; linha vazia pula para a próxima seção
  const focaveis = () => $$('input:not([type=radio]):not([type=hidden]), select, textarea', frm).filter((el) => el.offsetParent !== null);
  const primeiroDepois = (el) => focaveis().find((f) => !el.contains(f) && (el.compareDocumentPosition(f) & Node.DOCUMENT_POSITION_FOLLOWING));
  frm.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON' || e.target.type === 'radio') return;
    e.preventDefault();
    const t = e.target, rep = t.closest('[data-rep]');
    if (rep) {
      const box = rep.parentElement, tipo = box.id.slice(3);
      const campos = $$('[data-k]', rep);
      const vazia = campos.every((i) => i.tagName === 'SELECT' || !i.value.trim());
      if (vazia) {
        const sec = box.closest('section');
        if ($$('[data-rep]', box).length > 1) { rep.remove(); renumerar(box); atualizar(); }
        (primeiroDepois(sec) || $('.resumo .btn-primary')).focus();
        return;
      }
      if (t === campos[campos.length - 1]) {
        const prox = rep.nextElementSibling;
        if (prox) $('[data-k]', prox).focus(); else addRep(tipo);
        return;
      }
    }
    const lista = focaveis(), i = lista.indexOf(t);
    (lista[i + 1] || $('.resumo .btn-primary')).focus();
  });

  frm.addEventListener('submit', async (e) => {
    e.preventDefault();
    $$('.invalid', frm).forEach((x) => x.classList.remove('invalid'));
    const f = ler();
    const erro = (id, msg) => { const el = $('#f-' + id); el.classList.add('invalid'); el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); toast(msg, 'err'); };
    if (!f.nome) return erro('nome', 'Informe o nome do evento.');
    if (f.data_inicio && f.data_fim && f.data_fim < f.data_inicio) return erro('fim', 'A data de término é anterior à data de início.');
    if (f.dados.hospedagem.some((h) => h.chegada && h.saida && h.saida < h.chegada)) { toast('Há hospedagem com saída antes da chegada.', 'err'); return; }

    const temAlgo = (o) => Object.entries(o).some(([k, v]) => k !== 'meio' && v !== '' && v !== 0 && v != null);
    const dd = f.dados;
    dd.servicos = dd.servicos.filter((s) => s.qt || s.valor || (!s.fixo && s.nome)).map((s) => ({ ...s, nome: s.nome || 'Outro serviço' }));
    dd.gastos = dd.gastos.filter((g) => g.qt || g.valor || g.obs || (!g.fixo && g.nome)).map((g) => ({ ...g, nome: g.nome || 'Outro gasto' }));
    dd.envolvidos = dd.envolvidos.filter(Boolean);
    dd.hospedagem = dd.hospedagem.filter(temAlgo);
    dd.alimentacao = dd.alimentacao.filter(temAlgo);
    dd.passagens = dd.passagens.filter(temAlgo);

    const btns = $$('[type=submit]', frm).concat($$('#pgActs [type=submit]'));
    btns.forEach((b) => { b.disabled = true; });
    try {
      const salvo = await api.saveEvento({ ...f, id: ev.id });
      S.dirty = false;
      S.eventos = [];
      toast(novo ? `Evento Nº ${pad(salvo.numero)} cadastrado` : 'Alterações salvas');
      location.hash = '#/eventos/' + salvo.id;
    } catch (x) {
      toast(msgErro(x), 'err');
      btns.forEach((b) => { b.disabled = false; });
    }
  });
  $('#f-nome').focus();
}

/* ================================================================
   Relatórios
   ================================================================ */
async function viewRelatorios() {
  setPage('Relatórios', 'Monte, imprima e compartilhe relatórios de eventos');
  carregando();
  const evs = S.eventos = await api.listEventos();
  const gerentes = uniq(evs.map((e) => e.gerente));
  const R = S.rel || (S.rel = { por: 'situacao', val: '', de: '', ate: '', formato: 'resumido' });

  view().innerHTML = `<div class="card no-print">
    <div class="rep-filters">
      <div class="field"><label>Relatório por</label><select id="rPor">
        ${[['situacao', 'Situação'], ['evento', 'Evento'], ['gerente', 'Gerente'], ['tipo', 'Tipo de evento'], ['periodo', 'Data a ser realizado']].map(([v, l]) => `<option value="${v}" ${R.por === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div id="rParam"></div>
      <div class="field"><label>Formato</label><select id="rFmt"><option value="resumido" ${R.formato === 'resumido' ? 'selected' : ''}>Resumido</option><option value="detalhado" ${R.formato === 'detalhado' ? 'selected' : ''}>Detalhado (todos os itens)</option></select></div>
      <button class="btn btn-primary" id="rGerar">${ic('file')}Gerar relatório</button>
    </div></div>
    <div id="rOut"></div>`;

  const param = () => {
    const p = $('#rParam');
    const sel = (lbl, opts, todos) => `<div class="field"><label>${lbl}</label><select id="rVal">${todos ? `<option value="">${todos}</option>` : ''}${opts.map(([v, l]) => `<option value="${esc(v)}" ${R.val === v ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    if (R.por === 'situacao') p.innerHTML = sel('Situação', SIT_ORDEM.map((s) => [s, SIT[s].label]), 'Todas as situações');
    if (R.por === 'evento') p.innerHTML = sel('Evento', evs.map((e) => [e.id, `Nº ${pad(e.numero)} — ${e.nome}`]));
    if (R.por === 'gerente') p.innerHTML = sel('Gerente', gerentes.map((g) => [g, g]), 'Todos os gerentes');
    if (R.por === 'tipo') p.innerHTML = sel('Tipo', TIPOS.map((t) => [t, t]), 'Todos os tipos');
    if (R.por === 'periodo') p.innerHTML = `<div class="grid g2"><div class="field"><label>De</label><input type="date" id="rDe" value="${R.de}"></div><div class="field"><label>Até</label><input type="date" id="rAte" value="${R.ate}"></div></div>`;
  };
  $('#rPor').onchange = (e) => { R.por = e.target.value; R.val = ''; param(); };
  $('#rFmt').onchange = (e) => { R.formato = e.target.value; gerar(); };
  $('#rGerar').onclick = () => gerar();
  param();

  function gerar() {
    R.val = $('#rVal')?.value ?? '';
    R.de = $('#rDe')?.value || ''; R.ate = $('#rAte')?.value || '';
    let lista = evs, desc = '', agrupar = null;
    if (R.por === 'situacao') { if (R.val) lista = lista.filter((e) => e.situacao === R.val); else agrupar = (e) => e.situacao; desc = 'Situação: ' + (R.val ? SIT[R.val].label : 'todas'); }
    if (R.por === 'evento') { lista = lista.filter((e) => e.id === R.val); desc = 'Evento selecionado'; }
    if (R.por === 'gerente') { if (R.val) lista = lista.filter((e) => e.gerente === R.val); else agrupar = (e) => e.gerente || 'Sem gerente'; desc = 'Gerente: ' + (R.val || 'todos'); }
    if (R.por === 'tipo') { if (R.val) lista = lista.filter((e) => e.tipo === R.val); else agrupar = (e) => e.tipo; desc = 'Tipo: ' + (R.val || 'todos'); }
    if (R.por === 'periodo') {
      lista = lista.filter((e) => e.data_inicio && (!R.de || (e.data_fim || e.data_inicio) >= R.de) && (!R.ate || e.data_inicio <= R.ate));
      desc = 'Período: ' + (R.de || R.ate ? `${fdate(R.de) || 'início'} a ${fdate(R.ate) || 'hoje em diante'}` : 'todas as datas');
    }
    lista = [...lista].sort((a, b) => (a.data_inicio || '9999').localeCompare(b.data_inicio || '9999'));
    const total = soma(lista, (e) => e.valor_total);
    const vs = (s) => soma(lista.filter((e) => e.situacao === s), (e) => e.valor_total);

    let grupos = [[null, lista]];
    if (agrupar) {
      const m = new Map();
      lista.forEach((e) => { const k = agrupar(e); if (!m.has(k)) m.set(k, []); m.get(k).push(e); });
      grupos = [...m.entries()];
      if (R.por === 'situacao') grupos.sort((a, b) => ['aprovado', 'analise', 'reprovado'].indexOf(a[0]) - ['aprovado', 'analise', 'reprovado'].indexOf(b[0]));
      else grupos.sort((a, b) => String(a[0]).localeCompare(String(b[0]), 'pt-BR'));
    }
    const nomeGrupo = (k) => R.por === 'situacao' ? SIT[k]?.label : k;

    const tabela = (l) => `<div style="overflow-x:auto"><table class="mini"><thead><tr><th>Nº</th><th>Evento</th><th>Tipo</th><th>Período</th><th>Gerente</th><th>Situação</th><th class="r">Valor</th></tr></thead>
      <tbody>${l.map((e) => `<tr><td class="seq">${pad(e.numero)}</td><td><b>${esc(e.nome)}</b><div class="small muted">${esc(e.local)}</div></td><td>${esc(e.tipo)}</td><td class="nowrap">${periodo(e)}</td><td>${esc(e.gerente)}</td><td>${pill(e.situacao)}</td><td class="r">${brl(e.valor_total)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><td colspan="6">${l.length} evento(s)</td><td class="r">${brl(soma(l, (e) => e.valor_total))}</td></tr></tfoot></table></div>`;
    const detalhe = (e) => `<div class="rep-ev"><div class="h"><span class="seq">Nº ${pad(e.numero)}</span><b>${esc(e.nome)}</b>${pill(e.situacao)}<span class="sp"></span><span class="v">${brl(e.valor_total)}</span></div>
      <div class="i">${esc(e.tipo)} · ${periodo(e)} · ${esc(e.local || 'Local a definir')} · Gerente: ${esc(e.gerente || '—')}${(e.dados?.envolvidos || []).length ? ' · Envolvidos: ' + e.dados.envolvidos.map(esc).join(', ') : ''}</div>
      ${linhasEvento(e).length ? `<table class="mini"><tbody>${linhasEvento(e).map(([g, d, v]) => `<tr><td style="width:150px"><b>${g}</b></td><td>${esc(d)}</td><td class="r">${brl(v)}</td></tr>`).join('')}</tbody></table>` : '<div class="small muted">Nenhum item lançado.</div>'}</div>`;

    $('#rOut').innerHTML = `<div class="card report">
      <div class="report-actions no-print" style="margin-bottom:18px">
        <a class="btn" href="#/painel">${ic('x')}Sair</a>
        <button class="btn" id="rPrint">${ic('printer')}Imprimir / PDF</button>
        <button class="btn" id="rWa">${ic('whats')}WhatsApp</button>
        <button class="btn" id="rMail">${ic('mail')}E-mail</button>
        <button class="btn" id="rCsv">${ic('download')}Excel</button>
      </div>
      <div class="report-head"><img src="assets/logo-dello.png" alt="Dello"><div><h2>Relatório de eventos</h2><div class="small muted">${esc(desc)}${R.formato === 'detalhado' ? ' · detalhado' : ''}</div></div>
        <span class="sp"></span><div class="meta">Gerado em ${fdt(new Date())}<br>por ${esc(S.me.nome)}</div></div>
      ${lista.length ? `
      <div class="report-sum"><div><span>Eventos</span><b>${lista.length}</b></div><div><span>Aprovado</span><b>${brl(vs('aprovado'))}</b></div><div><span>Em análise</span><b>${brl(vs('analise'))}</b></div><div class="hl"><span>Valor total</span><b>${brl(total)}</b></div></div>
      ${grupos.map(([k, l]) => `${k != null ? `<div class="grp-h">${esc(nomeGrupo(k))}<span class="sp"></span><span class="num">${brl(soma(l, (e) => e.valor_total))}</span></div>` : ''}
        ${tabela(l)}${R.formato === 'detalhado' ? l.map(detalhe).join('') : ''}`).join('')}`
      : vazio('search', 'Nenhum evento encontrado', 'Ajuste os filtros e gere novamente.')}
    </div>`;

    const texto = `*Relatório de eventos — Dello*\n${desc}\n${lista.length} evento(s) · Total ${brl(total)}\n\n` +
      (R.formato === 'detalhado' ? lista.map(textoEvento).join('\n\n') : lista.map((e) => `• Nº ${pad(e.numero)} ${e.nome} (${SIT[e.situacao].label}) — ${periodo(e)} — ${brl(e.valor_total)}`).join('\n'));
    $('#rPrint')?.addEventListener('click', () => window.print());
    $('#rWa')?.addEventListener('click', () => window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank', 'noopener'));
    $('#rMail')?.addEventListener('click', () => { location.href = 'mailto:?subject=' + encodeURIComponent('Relatório de eventos — Dello') + '&body=' + encodeURIComponent(texto.replace(/\*/g, '')); });
    $('#rCsv')?.addEventListener('click', () => exportarCsv(lista));
  }
  gerar();
}

function exportarCsv(lista) {
  const n = (v) => (Number(v) || 0).toFixed(2).replace('.', ',');
  const q = (s) => { let t = String(s ?? ''); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return `"${t.replace(/"/g, '""')}"`; };
  const cab = ['Nº', 'Situação', 'Tipo', 'Evento', 'Local', 'Gerente', 'Início', 'Término', 'Contratos', 'Serviços', 'Gastos diversos', 'Hospedagem', 'Alimentação', 'Passagens', 'Total', 'Cadastrado por'];
  const linhas = lista.map((e) => {
    const st = subtotais(e.dados);
    return [pad(e.numero), SIT[e.situacao]?.label, e.tipo, e.nome, e.local, e.gerente, fdate(e.data_inicio), fdate(e.data_fim),
      n(st.contratos), n(st.servicos), n(st.gastos), n(st.hospedagem), n(st.alimentacao), n(st.passagens), n(e.valor_total), nomeDe(e.criado_por)].map(q).join(';');
  });
  const blob = new Blob(['﻿' + [cab.map(q).join(';'), ...linhas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `eventos-dello-${hojeISO()}.csv`;
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/* ================================================================
   Histórico
   ================================================================ */
const CAMPOS_H = { situacao: 'Situação', nome: 'Nome', tipo: 'Tipo', local: 'Local', gerente: 'Gerente', data_inicio: 'Início', data_fim: 'Término', valor_total: 'Valor total' };
function fmtCampo(k, v) {
  if (v == null || v === '') return '—';
  if (k === 'situacao') return SIT[v]?.label || v;
  if (k === 'valor_total') return brl(v);
  if (k.startsWith('data_')) return fdate(v);
  return String(v);
}
function timeline(hs, comEvento = true) {
  const verbo = { criou: 'cadastrou', alterou: 'alterou', excluiu: 'excluiu' };
  const icone = { criou: 'plus', alterou: 'pencil', excluiu: 'trash' };
  return `<div class="timeline">${hs.map((h) => {
    const d = h.detalhes || {};
    const itens = Object.keys(CAMPOS_H).filter((k) => Array.isArray(d[k])).map((k) => `${CAMPOS_H[k]}: ${esc(fmtCampo(k, d[k][0]))} → <b>${esc(fmtCampo(k, d[k][1]))}</b>`);
    if (d.dados) itens.push('Itens, contratos ou viagens atualizados');
    if (h.acao === 'excluiu' && d.valor_total != null) itens.push('Valor na exclusão: ' + brl(d.valor_total));
    const alvo = comEvento ? ` o evento ${h.acao === 'excluiu' ? `<b>Nº ${pad(h.evento_numero)} — ${esc(h.evento_nome)}</b>` : `<a href="#/eventos/${h.evento_id}"><b>Nº ${pad(h.evento_numero)} — ${esc(h.evento_nome)}</b></a>`}` : ' o evento';
    return `<div class="tl"><div class="ic ${h.acao}">${ic(icone[h.acao] || 'info')}</div><div class="body"><div><b>${esc(h.usuario_nome || '—')}</b> ${verbo[h.acao] || h.acao}${alvo}</div>
      ${itens.length ? `<ul>${itens.map((i) => `<li>${i}</li>`).join('')}</ul>` : ''}<div class="when">${fdt(h.em)}</div></div></div>`;
  }).join('')}</div>`;
}
async function viewHistorico() {
  setPage('Histórico', 'Registro automático de quem cadastrou, alterou ou excluiu cada evento');
  carregando();
  const hs = await api.historico();
  view().innerHTML = `<div class="card">
    <div class="filters"><div class="search input-icon">${ic('search')}<input id="hq" type="search" placeholder="Filtrar por pessoa, evento ou número"></div>
      <select id="ha" aria-label="Ação"><option value="">Todas as ações</option><option value="criou">Cadastros</option><option value="alterou">Alterações</option><option value="excluiu">Exclusões</option></select></div>
    <div id="hl"></div></div>`;
  const desenhar = () => {
    const q = $('#hq').value.trim().toLowerCase(), a = $('#ha').value;
    const l = hs.filter((h) => (!a || h.acao === a) && (!q || [h.usuario_nome, h.evento_nome, pad(h.evento_numero)].some((x) => String(x || '').toLowerCase().includes(q))));
    $('#hl').innerHTML = l.length ? timeline(l) : vazio('clock', 'Nenhum registro', hs.length ? 'Nada corresponde ao filtro.' : 'As ações nos eventos aparecerão aqui.');
  };
  $('#hq').oninput = desenhar; $('#ha').onchange = desenhar;
  desenhar();
}

/* ================================================================
   Usuários (somente admin)
   ================================================================ */
async function viewUsuarios() {
  if (!isAdmin()) { location.hash = '#/painel'; return; }
  setPage('Usuários', 'Aprove acessos e defina quem é administrador');
  carregando();
  const [perfis, evs] = await Promise.all([api.listPerfis(), api.listEventos()]);
  S.perfis = perfis;
  const pend = perfis.filter((p) => !p.ativo);
  const badge = $('#pendBadge');
  if (badge) { badge.textContent = pend.length; badge.classList.toggle('hidden', !pend.length); }
  const ordenados = [...pend, ...perfis.filter((p) => p.ativo)];

  view().innerHTML = `
    <div class="info">${ic('info')}<div><b>Como dar acesso a alguém:</b> envie o link do sistema. A pessoa clica em <b>Criar conta</b> e aparece aqui como <b>Pendente</b>. Ligue o acesso e escolha o papel.<br>
      <b>Atenção:</b> o e-mail não é verificado automaticamente. Antes de liberar, confirme com a pessoa (WhatsApp ou pessoalmente) que foi ela mesma que se cadastrou.<br>
      <b>Administrador</b> edita e exclui qualquer evento e gerencia usuários. <b>Usuário</b> vê todos os eventos, mas edita e exclui só os que criou.</div></div>
    ${pend.length ? `<div class="info warn">${ic('hourglass')}<div><b>${pend.length} pessoa(s) aguardando aprovação.</b></div></div>` : ''}
    <div class="card"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>Pessoa</th><th>Papel</th><th>Acesso</th><th class="right">Eventos criados</th><th>Desde</th><th></th></tr></thead>
      <tbody>${ordenados.map((p) => {
        const eu = p.id === S.me.id;
        return `<tr data-id="${p.id}">
          <td><div style="display:flex;align-items:center;gap:10px"><div class="avatar sm">${esc(iniciais(p.nome))}</div><div style="min-width:0"><b>${esc(p.nome)}</b>${eu ? ' <span class="tag">você</span>' : ''}<div class="small muted">${esc(p.email)}</div></div></div></td>
          <td><select class="role-sel" data-papel ${eu ? 'disabled title="Você não pode alterar o próprio papel"' : ''}><option value="usuario" ${p.papel === 'usuario' ? 'selected' : ''}>Usuário</option><option value="admin" ${p.papel === 'admin' ? 'selected' : ''}>Administrador</option></select></td>
          <td><label class="toggle" ${eu ? 'style="opacity:.5;pointer-events:none"' : ''}><input type="checkbox" data-ativo ${p.ativo ? 'checked' : ''} ${eu ? 'disabled' : ''}><span class="sw"></span><span data-lbl>${p.ativo ? 'Liberado' : '<span class="pill amber">Pendente</span>'}</span></label></td>
          <td class="right num">${evs.filter((e) => e.criado_por === p.id).length}</td>
          <td class="small muted nowrap">${fdia(p.criado_em)}</td>
          <td class="right">${eu ? '' : `<button class="btn btn-sm" data-senha title="Definir uma senha provisória para esta pessoa">${ic('key')}Senha provisória</button>`}</td></tr>`;
      }).join('')}</tbody></table></div></div>`;

  $$('tr[data-id]').forEach((tr) => {
    const id = tr.dataset.id, p = perfis.find((x) => x.id === id);
    const papel = $('[data-papel]', tr), ativo = $('[data-ativo]', tr);
    $('[data-senha]', tr)?.addEventListener('click', () => modal({
      title: `Senha provisória para ${p.nome}`, icon: 'key', ok: 'Definir senha',
      text: 'Informe a nova senha e passe para a pessoa por um canal seguro. Ela pode trocar depois, no ícone de chave.',
      body: `<div class="field"><label>Nova senha (mínimo 8 caracteres)</label><input type="text" name="s1" autocomplete="off"></div>`,
      onSubmit: async ({ s1 }) => {
        if ((s1 || '').length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
        await api.adminSenha(id, s1);
        toast('Senha provisória definida para ' + p.nome);
      },
    }));
    papel.onchange = async () => {
      const antes = p.papel;
      try { await api.updatePerfil(id, { papel: papel.value }); p.papel = papel.value; toast(`${p.nome} agora é ${papel.value === 'admin' ? 'administrador' : 'usuário'}`); }
      catch (e) { papel.value = antes; toast(msgErro(e), 'err'); }
    };
    ativo.onchange = async () => {
      try {
        await api.updatePerfil(id, { ativo: ativo.checked });
        p.ativo = ativo.checked;
        $('[data-lbl]', tr).innerHTML = p.ativo ? 'Liberado' : '<span class="pill amber">Pendente</span>';
        const n = perfis.filter((x) => !x.ativo).length;
        if (badge) { badge.textContent = n; badge.classList.toggle('hidden', !n); }
        toast(p.ativo ? `Acesso liberado para ${p.nome}` : `Acesso de ${p.nome} bloqueado`);
      } catch (e) { ativo.checked = !ativo.checked; toast(msgErro(e), 'err'); }
    };
  });
}

boot();
})();
