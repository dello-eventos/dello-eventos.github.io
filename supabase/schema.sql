-- =====================================================================
--  Dello · Gestão de Eventos — estrutura do banco (Supabase / Postgres)
--  Como usar: Supabase > SQL Editor > New query > cole tudo > Run.
--  Pode ser executado mais de uma vez sem perder dados.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Perfis de usuário (1 por conta de login)
-- papel: 'admin' edita tudo e gerencia usuários; 'usuario' edita só o que criou
-- ativo: contas novas ficam pendentes até um admin aprovar
-- ---------------------------------------------------------------------
create table if not exists public.perfis (
  id         uuid primary key references auth.users on delete cascade,
  nome       text not null default '',
  email      text not null default '',
  papel      text not null default 'usuario' check (papel in ('admin', 'usuario')),
  ativo      boolean not null default false,
  criado_em  timestamptz not null default now()
);

create or replace function public.is_ativo() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and ativo);
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and ativo and papel = 'admin');
$$;

-- Cria o perfil automaticamente no cadastro. A primeira conta vira admin já aprovada.
create or replace function public.novo_usuario() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  primeiro boolean;
begin
  select not exists (select 1 from perfis) into primeiro;
  insert into perfis (id, nome, email, papel, ativo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)),
    new.email,
    case when primeiro then 'admin' else 'usuario' end,
    primeiro
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.novo_usuario();

-- Impede que o sistema fique sem nenhum administrador ativo
create or replace function public.proteger_ultimo_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.id := old.id;
  new.email := old.email;
  if old.papel = 'admin' and old.ativo and (new.papel <> 'admin' or not new.ativo) then
    if not exists (select 1 from perfis where papel = 'admin' and ativo and id <> old.id) then
      raise exception 'É preciso manter pelo menos um administrador ativo.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists perfis_protege_admin on public.perfis;
create trigger perfis_protege_admin
  before update on public.perfis
  for each row execute function public.proteger_ultimo_admin();

alter table public.perfis enable row level security;

drop policy if exists "perfis_select" on public.perfis;
create policy "perfis_select" on public.perfis
  for select to authenticated
  using (public.is_ativo() or id = auth.uid());

drop policy if exists "perfis_update_admin" on public.perfis;
create policy "perfis_update_admin" on public.perfis
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Eventos
-- numero: sequencial automático, nunca se repete
-- dados:  contratos, serviços, gastos, envolvidos, hospedagem, alimentação, passagens
-- ---------------------------------------------------------------------
create table if not exists public.eventos (
  id             uuid primary key default gen_random_uuid(),
  numero         bigint generated always as identity unique,
  situacao       text not null default 'analise' check (situacao in ('reprovado', 'analise', 'aprovado')),
  tipo           text not null,
  data_inicio    date,
  data_fim       date,
  nome           text not null check (length(trim(nome)) > 0),
  local          text not null default '',
  gerente        text not null default '',
  valor_total    numeric(14, 2) not null default 0,
  dados          jsonb not null default '{}'::jsonb,
  criado_por     uuid not null default auth.uid() references public.perfis (id),
  criado_em      timestamptz not null default now(),
  atualizado_por uuid references public.perfis (id),
  atualizado_em  timestamptz not null default now(),
  constraint eventos_datas_ok check (data_fim is null or data_inicio is null or data_fim >= data_inicio)
);

create index if not exists eventos_inicio_idx on public.eventos (data_inicio);
create index if not exists eventos_criado_por_idx on public.eventos (criado_por);

-- Valor total calculado no próprio banco (não depende do navegador)
create or replace function public.soma_valores(arr jsonb) returns numeric
language sql immutable as $$
  select coalesce(sum(coalesce(nullif(x ->> 'valor', '')::numeric, 0)), 0)
  from jsonb_array_elements(case when jsonb_typeof(arr) = 'array' then arr else '[]'::jsonb end) x;
$$;

create or replace function public.calcular_total(d jsonb) returns numeric
language sql immutable as $$
  select coalesce(nullif(d -> 'contratoEvento' ->> 'valor', '')::numeric, 0)
       + coalesce(nullif(d -> 'montadora' ->> 'valor', '')::numeric, 0)
       + public.soma_valores(d -> 'servicos')
       + public.soma_valores(d -> 'gastos')
       + public.soma_valores(d -> 'hospedagem')
       + public.soma_valores(d -> 'alimentacao')
       + public.soma_valores(d -> 'passagens');
$$;

create or replace function public.eventos_antes_gravar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(auth.uid(), new.criado_por);
    new.criado_em := now();
  else
    new.criado_por := old.criado_por;   -- dono não pode ser trocado
    new.criado_em := old.criado_em;
  end if;
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  new.atualizado_em := now();
  new.valor_total := public.calcular_total(new.dados);
  return new;
end $$;

drop trigger if exists eventos_antes_gravar on public.eventos;
create trigger eventos_antes_gravar
  before insert or update on public.eventos
  for each row execute function public.eventos_antes_gravar();

alter table public.eventos enable row level security;

-- Todos os usuários aprovados veem todos os eventos
drop policy if exists "eventos_select" on public.eventos;
create policy "eventos_select" on public.eventos
  for select to authenticated using (public.is_ativo());

drop policy if exists "eventos_insert" on public.eventos;
create policy "eventos_insert" on public.eventos
  for insert to authenticated with check (public.is_ativo() and criado_por = auth.uid());

-- Editar/excluir: só quem criou, ou admin
drop policy if exists "eventos_update" on public.eventos;
create policy "eventos_update" on public.eventos
  for update to authenticated
  using (public.is_ativo() and (criado_por = auth.uid() or public.is_admin()))
  with check (public.is_ativo() and (criado_por = auth.uid() or public.is_admin()));

drop policy if exists "eventos_delete" on public.eventos;
create policy "eventos_delete" on public.eventos
  for delete to authenticated
  using (public.is_ativo() and (criado_por = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------
-- Histórico (auditoria): quem criou, alterou ou excluiu cada evento
-- Gravado só pelo banco; ninguém consegue editar ou apagar pelo sistema.
-- ---------------------------------------------------------------------
create table if not exists public.historico (
  id             bigint generated always as identity primary key,
  evento_id      uuid,
  evento_numero  bigint,
  evento_nome    text,
  acao           text not null check (acao in ('criou', 'alterou', 'excluiu')),
  usuario_id     uuid,
  usuario_nome   text,
  em             timestamptz not null default now(),
  detalhes       jsonb not null default '{}'::jsonb
);

create index if not exists historico_evento_idx on public.historico (evento_id, em desc);

create or replace function public.eventos_registrar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  quem text;
  det  jsonb := '{}'::jsonb;
  ref  public.eventos;
  campo text;
begin
  select nome into quem from perfis where id = auth.uid();
  if tg_op = 'DELETE' then
    ref := old;
    det := jsonb_build_object('valor_total', old.valor_total);
  else
    ref := new;
  end if;

  if tg_op = 'UPDATE' then
    foreach campo in array array['situacao', 'nome', 'tipo', 'local', 'gerente', 'data_inicio', 'data_fim', 'valor_total'] loop
      if (to_jsonb(old) -> campo) is distinct from (to_jsonb(new) -> campo) then
        det := det || jsonb_build_object(campo, jsonb_build_array(to_jsonb(old) -> campo, to_jsonb(new) -> campo));
      end if;
    end loop;
    if old.dados is distinct from new.dados then
      det := det || jsonb_build_object('dados', true);
    end if;
    if det = '{}'::jsonb then
      return null;  -- nada mudou de fato
    end if;
  end if;

  insert into historico (evento_id, evento_numero, evento_nome, acao, usuario_id, usuario_nome, detalhes)
  values (ref.id, ref.numero, ref.nome,
          case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'excluiu' end,
          auth.uid(), coalesce(quem, 'Sistema'), det);
  return null;
end $$;

drop trigger if exists eventos_historico on public.eventos;
create trigger eventos_historico
  after insert or update or delete on public.eventos
  for each row execute function public.eventos_registrar_historico();

alter table public.historico enable row level security;

drop policy if exists "historico_select" on public.historico;
create policy "historico_select" on public.historico
  for select to authenticated using (public.is_ativo());

-- Visitantes não autenticados não acessam nada
revoke all on public.perfis, public.eventos, public.historico from anon;


-- ---------------------------------------------------------------------
-- Endurecimento (recomendações do Security Advisor do Supabase)
-- ---------------------------------------------------------------------
alter function public.soma_valores(jsonb) set search_path = '';
alter function public.calcular_total(jsonb) set search_path = '';

-- Funções de gatilho: só o próprio banco as executa
revoke execute on function public.novo_usuario() from public, anon, authenticated;
revoke execute on function public.proteger_ultimo_admin() from public, anon, authenticated;
revoke execute on function public.eventos_antes_gravar() from public, anon, authenticated;
revoke execute on function public.eventos_registrar_historico() from public, anon, authenticated;

-- Funções usadas nas regras de acesso: só para quem está logado
revoke execute on function public.is_ativo() from public, anon;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_ativo() to authenticated;
grant execute on function public.is_admin() to authenticated;
