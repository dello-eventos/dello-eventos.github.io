-- =====================================================================
-- Migração: formulário de solicitações dos representantes
-- (Kits, amostras e brindes). Segura para rodar com o site no ar.
--
-- * O formulário é público, mas só funciona com a CHAVE do link.
-- * Quem envia NÃO consegue ler nada: só a função enviar_solicitacao
--   grava, depois de validar todos os campos.
-- * Só administradores veem, lançam como atividade ou arquivam.
-- =====================================================================

create table if not exists public.solicitacoes (
  id           uuid primary key default gen_random_uuid(),
  numero       bigint generated always as identity,
  criado_em    timestamptz not null default now(),
  status       text not null default 'nova',
  dados        jsonb not null,
  atividade_id uuid,
  tratado_por  uuid,
  tratado_em   timestamptz,
  constraint solicitacoes_status_ok check (status in ('nova', 'lancada', 'arquivada')),
  constraint solicitacoes_tamanho check (pg_column_size(dados) < 40000)
);
create index if not exists solicitacoes_status_idx on public.solicitacoes (status, criado_em desc);

alter table public.solicitacoes enable row level security;
revoke all on public.solicitacoes from anon;

drop policy if exists "solicitacoes_select" on public.solicitacoes;
create policy "solicitacoes_select" on public.solicitacoes
  for select to authenticated using (public.is_admin());
drop policy if exists "solicitacoes_update" on public.solicitacoes;
create policy "solicitacoes_update" on public.solicitacoes
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Quem tratou e quando (não dá para forjar)
create or replace function public.solicitacoes_antes_gravar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id; new.numero := old.numero; new.criado_em := old.criado_em; new.dados := old.dados;
  if new.status is distinct from old.status or new.atividade_id is distinct from old.atividade_id then
    new.tratado_por := auth.uid();
    new.tratado_em := now();
  else
    new.tratado_por := old.tratado_por;
    new.tratado_em := old.tratado_em;
  end if;
  return new;
end $$;
revoke execute on function public.solicitacoes_antes_gravar() from public, anon, authenticated;
drop trigger if exists solicitacoes_antes_gravar on public.solicitacoes;
create trigger solicitacoes_antes_gravar before update on public.solicitacoes
  for each row execute function public.solicitacoes_antes_gravar();

-- Chave do link (uma só linha). Admin vê e troca.
create table if not exists public.config_solicitacao (
  id    int primary key default 1,
  chave text not null,
  constraint config_solicitacao_uma check (id = 1),
  constraint config_solicitacao_chave check (char_length(chave) between 12 and 64)
);
insert into public.config_solicitacao (id, chave)
  values (1, substr(replace(gen_random_uuid()::text, '-', ''), 1, 20))
  on conflict (id) do nothing;
alter table public.config_solicitacao enable row level security;
revoke all on public.config_solicitacao from anon;
drop policy if exists "config_solicitacao_admin" on public.config_solicitacao;
create policy "config_solicitacao_admin" on public.config_solicitacao
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Envio do formulário (única porta de entrada para quem não tem login)
create or replace function public.enviar_solicitacao(chave text, dados jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare
  t text;
  campo text;
  item jsonb;
  n int;
  num bigint;
begin
  if chave is null or not exists (select 1 from config_solicitacao c where c.id = 1 and c.chave = enviar_solicitacao.chave) then
    raise exception 'link inválido';
  end if;
  if jsonb_typeof(dados) <> 'object' or pg_column_size(dados) > 30000 then
    raise exception 'dados inválidos';
  end if;
  -- proteção contra envios em massa
  if (select count(*) from solicitacoes where criado_em > now() - interval '10 minutes') >= 40 then
    raise exception 'muitas solicitações: aguarde alguns minutos';
  end if;

  -- todos os campos obrigatórios (complemento é opcional)
  foreach campo in array array['cliente_codigo', 'cliente_nome', 'contato', 'cep', 'rua', 'numero', 'bairro', 'cidade', 'uf',
                               'solicitante', 'tipo', 'evento', 'forma_entrega', 'material_retorna', 'data_evento', 'prazo_entrega'] loop
    t := trim(coalesce(dados ->> campo, ''));
    if t = '' then raise exception 'campo obrigatório: %', campo; end if;
    if char_length(t) > 300 then raise exception 'campo muito longo: %', campo; end if;
  end loop;
  if dados ->> 'tipo' not in ('Kit', 'Amostra', 'Brinde') then raise exception 'tipo inválido'; end if;
  if dados ->> 'forma_entrega' not in ('proprio', 'transportadora', 'correio') then raise exception 'forma de entrega inválida'; end if;
  if dados ->> 'material_retorna' not in ('Sim', 'Não') then raise exception 'material retorna inválido'; end if;
  if (dados ->> 'data_evento') !~ '^(19|20)\d\d-\d\d-\d\d$' or (dados ->> 'prazo_entrega') !~ '^(19|20)\d\d-\d\d-\d\d$' then
    raise exception 'data inválida';
  end if;

  -- itens: de 1 a 60, com quantidade, código e descrição
  if jsonb_typeof(dados -> 'itens') <> 'array' then raise exception 'itens obrigatórios'; end if;
  n := jsonb_array_length(dados -> 'itens');
  if n < 1 or n > 60 then raise exception 'informe de 1 a 60 itens'; end if;
  for item in select * from jsonb_array_elements(dados -> 'itens') loop
    if coalesce(nullif(item ->> 'qtd', '')::numeric, 0) <= 0
       or trim(coalesce(item ->> 'cod', '')) = '' or trim(coalesce(item ->> 'descricao', '')) = ''
       or char_length(coalesce(item ->> 'descricao', '')) > 300 or char_length(coalesce(item ->> 'obs', '')) > 300 then
      raise exception 'item incompleto';
    end if;
  end loop;

  insert into solicitacoes (dados)
  values (dados || jsonb_build_object('data_solicitacao', to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD')))
  returning numero into num;
  return num;
end $$;
revoke execute on function public.enviar_solicitacao(text, jsonb) from public;
grant execute on function public.enviar_solicitacao(text, jsonb) to anon, authenticated;
