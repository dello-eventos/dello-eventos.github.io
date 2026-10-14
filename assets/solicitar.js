/* Formulário público: Solicitação de Kits, Amostras e Brindes (representantes)
   Não tem login. Só envia (função enviar_solicitacao no banco) e só funciona com a chave do link. */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
  const hoje = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const fdate = (iso) => /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso.split('-').reverse().join('/') : '';

  const root = $('#root');
  const CFG = window.DELLO_CONFIG || {};
  const params = new URLSearchParams(location.search);
  const chave = (params.get('k') || '').trim();

  const casca = (corpo) => `<div class="sol-wrap">
    <header class="sol-head"><img src="assets/logo-dello.png" alt="Dello"><div><h1>Solicitação de Kits, Amostras e Brindes</h1><p>Dados para emissão de NF · Saída 35</p></div></header>
    ${corpo}
    <p class="sol-rodape">Dello · Gestão de Eventos</p></div>`;
  const aviso = (titulo, texto) => { root.innerHTML = casca(`<div class="card sol-aviso"><h2>${titulo}</h2><p>${texto}</p></div>`); };

  if (!chave) { aviso('Link incompleto', 'Este endereço não tem a chave de acesso. Peça o link do formulário ao marketing da Dello.'); return; }
  if (!CFG.supabaseUrl || !window.supabase) { aviso('Formulário indisponível', 'Não foi possível conectar ao sistema. Tente de novo em alguns minutos.'); return; }
  const sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });

  const campo = (id, rotulo, extra = '', cls = '') => `<div class="field ${cls}"><label for="${id}">${rotulo} <span class="req">*</span></label><input id="${id}" ${extra}></div>`;
  const opcoes = (nome, lista) => `<div class="seg sol-seg" data-grupo="${nome}">${lista.map(([v, l, s]) => `<label><input type="radio" name="${nome}" value="${v}"><span><b>${l}</b>${s ? `<small>${s}</small>` : ''}</span></label>`).join('')}</div>`;
  const linhaItem = () => `<tr data-item>
    <td class="q"><input type="number" min="1" step="1" inputmode="numeric" data-k="qtd" placeholder="0" aria-label="Quantidade"></td>
    <td class="c"><input data-k="cod" maxlength="40" placeholder="Código" aria-label="Código do produto"></td>
    <td class="d"><input data-k="descricao" maxlength="300" placeholder="Descrição do produto" aria-label="Descrição"></td>
    <td class="o"><input data-k="obs" maxlength="300" placeholder="Opcional" aria-label="Observação"></td>
    <td class="x"><button type="button" class="btn btn-ghost icon-btn" data-rm title="Remover linha" aria-label="Remover linha">×</button></td></tr>`;

  function formulario() {
    root.innerHTML = casca(`<form id="fSol" novalidate autocomplete="on">
      <div class="info sol-info"><div>Preencha <b>todos os campos</b> marcados com <span class="req">*</span>. A solicitação vai direto para o marketing da Dello. Data da solicitação: <b>${fdate(hoje())}</b>.</div></div>

      <section class="card"><h2 class="sol-h">1. Cliente / representante</h2>
        <div class="grid g3">
          ${campo('s-cod', 'Cód. cliente / repres.', 'maxlength="40" autocomplete="off"')}
          ${campo('s-nome', 'Nome cliente / repres.', 'maxlength="150" autocomplete="organization"', 'span2')}
          ${campo('s-solic', 'Solicitante (seu nome)', 'maxlength="120" autocomplete="name"')}
          ${campo('s-contato', 'Seu e-mail ou WhatsApp', 'maxlength="150" autocomplete="email" placeholder="Para falarmos com você"', 'span2')}
        </div></section>

      <section class="card"><h2 class="sol-h">2. Endereço de entrega</h2>
        <div class="grid g4">
          <div class="field"><label for="s-cep">CEP <span class="req">*</span></label><input id="s-cep" inputmode="numeric" maxlength="9" placeholder="00000-000" autocomplete="postal-code"><div class="hint" id="cepMsg">Preenche o endereço sozinho</div></div>
          ${campo('s-rua', 'Rua / avenida', 'maxlength="200" autocomplete="address-line1"', 'span2')}
          ${campo('s-num', 'Número', 'maxlength="20"')}
          <div class="field"><label for="s-comp">Complemento</label><input id="s-comp" maxlength="120" placeholder="Opcional"></div>
          ${campo('s-bairro', 'Bairro', 'maxlength="100"')}
          ${campo('s-cidade', 'Cidade', 'maxlength="100" autocomplete="address-level2"')}
          <div class="field"><label for="s-uf">Estado <span class="req">*</span></label><select id="s-uf"><option value=""></option>${UFS.map((u) => `<option>${u}</option>`).join('')}</select></div>
        </div></section>

      <section class="card"><h2 class="sol-h">3. Solicitação</h2>
        <div class="lbl">Tipo <span class="req">*</span></div>${opcoes('tipo', [['Kit', 'Kit'], ['Amostra', 'Amostra'], ['Brinde', 'Brinde']])}
        <div class="grid g3" style="margin-top:14px">
          ${campo('s-evento', 'Evento', 'maxlength="150" placeholder="Feira, visita, treinamento…"')}
          ${campo('s-devento', 'Data do evento', 'type="date"')}
          ${campo('s-prazo', 'Prazo de entrega', 'type="date"')}
        </div>
        <div class="lbl" style="margin-top:14px">Forma de entrega <span class="req">*</span></div>${opcoes('entrega', [['proprio', 'Nosso carro'], ['transportadora', 'Transportadora'], ['correio', 'Correio']])}
        <div class="lbl" style="margin-top:14px">O material retorna? <span class="req">*</span></div>${opcoes('retorna', [['Sim', 'Sim', 'Volta para a Dello'], ['Não', 'Não', 'Fica com o cliente']])}
      </section>

      <section class="card"><h2 class="sol-h">4. Itens</h2>
        <div class="sol-itens"><table class="items" id="itens"><thead><tr><th>Qtd. *</th><th>Cód. prod. *</th><th>Descrição *</th><th>Observação</th><th></th></tr></thead>
          <tbody>${linhaItem()}${linhaItem()}${linhaItem()}</tbody></table></div>
        <button type="button" class="btn add-row" id="addItem">+ Adicionar item</button>
      </section>

      <div class="sol-enviar"><div class="sol-erro hidden" id="erro"></div><button type="submit" class="btn btn-primary btn-lg" id="enviar">Enviar solicitação</button></div>
    </form>`);

    const frm = $('#fSol');
    $('#addItem').onclick = () => { $('#itens tbody').insertAdjacentHTML('beforeend', linhaItem()); $('#itens tbody tr:last-child input').focus(); };
    frm.addEventListener('click', (e) => {
      const b = e.target.closest('[data-rm]');
      if (b) { const tb = $('#itens tbody'); if (tb.children.length > 1) b.closest('tr').remove(); else $$('input', b.closest('tr')).forEach((i) => { i.value = ''; }); }
    });
    frm.addEventListener('change', (e) => {
      if (e.target.type === 'radio') $$(`[data-grupo="${e.target.name}"] label`).forEach((l) => l.classList.toggle('on', $('input', l).checked));
    });
    frm.addEventListener('input', (e) => e.target.classList.remove('invalid'));

    // CEP → endereço
    const cep = $('#s-cep');
    let ultimo = '';
    const buscarCep = async () => {
      const dig = cep.value.replace(/\D/g, '');
      if (dig.length === 5 && !cep.value.includes('-')) return;
      if (dig.length !== 8 || dig === ultimo) return;
      ultimo = dig; cep.value = dig.slice(0, 5) + '-' + dig.slice(5);
      $('#cepMsg').textContent = 'Buscando…';
      try {
        const r = await fetch(`https://viacep.com.br/ws/${dig}/json/`).then((x) => x.json());
        if (r.erro) { $('#cepMsg').textContent = 'CEP não encontrado. Preencha à mão.'; return; }
        const pos = (id, v) => { const el = $(id); if (v && !el.value.trim()) { el.value = v; el.classList.remove('invalid'); } };
        pos('#s-rua', r.logradouro); pos('#s-bairro', r.bairro); pos('#s-cidade', r.localidade); pos('#s-uf', r.uf);
        $('#cepMsg').textContent = 'Endereço preenchido. Confira o número.';
        $('#s-num').focus();
      } catch { $('#cepMsg').textContent = 'Não deu para buscar. Preencha à mão.'; }
    };
    cep.addEventListener('input', () => { if (cep.value.replace(/\D/g, '').length === 8) buscarCep(); });
    cep.addEventListener('blur', buscarCep);

    frm.addEventListener('submit', async (e) => {
      e.preventDefault();
      $$('.invalid', frm).forEach((x) => x.classList.remove('invalid'));
      const erros = [];
      const val = (id, nome) => { const el = $(id), v = el.value.trim(); if (!v) { el.classList.add('invalid'); erros.push(nome); } return v; };
      const radio = (nome, rotulo) => { const r = $(`input[name="${nome}"]:checked`); if (!r) { $(`[data-grupo="${nome}"]`).classList.add('invalid'); erros.push(rotulo); } return r ? r.value : ''; };
      const data = (id, nome) => { const v = val(id, nome); if (v && !/^(19|20)\d\d-\d\d-\d\d$/.test(v)) { $(id).classList.add('invalid'); erros.push(nome + ' (ano com 4 dígitos)'); } return v; };

      const d = {
        cliente_codigo: val('#s-cod', 'Cód. cliente'), cliente_nome: val('#s-nome', 'Nome do cliente'),
        solicitante: val('#s-solic', 'Solicitante'), contato: val('#s-contato', 'Seu e-mail ou WhatsApp'),
        cep: val('#s-cep', 'CEP'), rua: val('#s-rua', 'Rua'), numero: val('#s-num', 'Número'), complemento: $('#s-comp').value.trim(),
        bairro: val('#s-bairro', 'Bairro'), cidade: val('#s-cidade', 'Cidade'), uf: val('#s-uf', 'Estado'),
        tipo: radio('tipo', 'Tipo'), evento: val('#s-evento', 'Evento'),
        data_evento: data('#s-devento', 'Data do evento'), prazo_entrega: data('#s-prazo', 'Prazo de entrega'),
        forma_entrega: radio('entrega', 'Forma de entrega'), material_retorna: radio('retorna', 'Material retorna'),
        itens: [],
      };
      let itemRuim = false;
      $$('#itens tbody tr').forEach((tr) => {
        const g = (k) => $(`[data-k="${k}"]`, tr).value.trim();
        const it = { qtd: g('qtd'), cod: g('cod'), descricao: g('descricao'), obs: g('obs') };
        if (!it.qtd && !it.cod && !it.descricao && !it.obs) return;
        ['qtd', 'cod', 'descricao'].forEach((k) => { if (!it[k] || (k === 'qtd' && !(Number(it.qtd) > 0))) { $(`[data-k="${k}"]`, tr).classList.add('invalid'); itemRuim = true; } });
        it.qtd = Math.round(Number(it.qtd) || 0);
        d.itens.push(it);
      });
      if (itemRuim) erros.push('itens incompletos (quantidade, código e descrição)');
      if (!d.itens.length) { erros.push('pelo menos 1 item'); $('#itens tbody tr [data-k="qtd"]').classList.add('invalid'); }

      const box = $('#erro');
      if (erros.length) {
        box.innerHTML = `<b>Faltou preencher:</b> ${erros.map(esc).join(', ')}.`;
        box.classList.remove('hidden');
        const prim = $('.invalid', frm);
        prim?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        (prim?.matches('input, select') ? prim : $('input', prim))?.focus({ preventScroll: true });
        return;
      }
      box.classList.add('hidden');
      const btn = $('#enviar');
      btn.disabled = true; btn.textContent = 'Enviando…';
      try {
        const { data: numero, error } = await sb.rpc('enviar_solicitacao', { chave, dados: d });
        if (error) throw error;
        sucesso(numero, d);
      } catch (x) {
        const m = String(x?.message || x || '');
        box.innerHTML = /link inválido/i.test(m) ? 'Este link não é mais válido. Peça o link atualizado ao marketing da Dello.'
          : /muitas/i.test(m) ? 'Muitas solicitações ao mesmo tempo. Aguarde alguns minutos e envie de novo (seus dados continuam aqui).'
          : /Failed to fetch|NetworkError|Load failed/i.test(m) ? 'Sem conexão com a internet. Verifique e tente de novo (seus dados continuam aqui).'
          : 'Não foi possível enviar. Confira os campos e tente de novo.';
        box.classList.remove('hidden');
        btn.disabled = false; btn.textContent = 'Enviar solicitação';
      }
    });
  }

  function sucesso(numero, d) {
    root.innerHTML = casca(`<div class="card sol-ok">
      <div class="sol-ok-ic">✓</div>
      <h2>Solicitação Nº ${esc(String(numero).padStart(4, '0'))} enviada!</h2>
      <p>O marketing da Dello recebeu o pedido de <b>${esc(d.tipo.toLowerCase())}</b> para <b>${esc(d.cliente_nome)}</b>, com ${d.itens.length} item(ns) e prazo de entrega em <b>${fdate(d.prazo_entrega)}</b>.</p>
      <p class="muted">Guarde o número da solicitação. Se precisarmos de algo, falamos com você pelo contato informado.</p>
      <button type="button" class="btn btn-primary" id="outra">Fazer outra solicitação</button></div>`);
    $('#outra').onclick = () => { formulario(); window.scrollTo(0, 0); };
    window.scrollTo(0, 0);
  }

  formulario();
})();
