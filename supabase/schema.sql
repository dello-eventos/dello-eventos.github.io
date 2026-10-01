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
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'nome'), ''), split_part(new.email, '@', 1)), 120),
    left(new.email, 320),
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
-- Valores negativos contam como zero.
create or replace function public.soma_valores(arr jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select coalesce(sum(greatest(0, coalesce(nullif(x ->> 'valor', '')::numeric, 0))), 0)
  from jsonb_array_elements(case when jsonb_typeof(arr) = 'array' then arr else '[]'::jsonb end) x;
$$;

create or replace function public.calcular_total(d jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select greatest(0, coalesce(nullif(d -> 'contratoEvento' ->> 'valor', '')::numeric, 0))
       + greatest(0, coalesce(nullif(d -> 'montadora' ->> 'valor', '')::numeric, 0))
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

-- Limites de tamanho (evita textos gigantes gravados direto pela API)
alter table public.perfis drop constraint if exists perfis_tamanhos;
alter table public.perfis add constraint perfis_tamanhos
  check (char_length(nome) <= 120 and char_length(email) <= 320);

alter table public.eventos drop constraint if exists eventos_tamanhos;
alter table public.eventos add constraint eventos_tamanhos
  check (char_length(nome) <= 200 and char_length(local) <= 300 and char_length(gerente) <= 150
         and char_length(tipo) <= 60 and octet_length(dados::text) <= 300000);

-- ---------------------------------------------------------------------
-- Fotos e arquivos dos eventos (Supabase Storage, pasta privada "anexos")
-- Caminho: <id do evento>/<arquivo>. Ver: usuários aprovados.
-- Enviar/excluir: quem criou o evento ou admin. Até 10 MB; só fotos e PDF.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anexos', 'anexos', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.evento_da_pasta(caminho text) returns uuid
language plpgsql immutable set search_path = '' as $$
begin
  return split_part(caminho, '/', 1)::uuid;
exception when others then
  return null;
end $$;

create or replace function public.pode_editar_evento(evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_ativo() and exists (
    select 1 from eventos where id = evento and (criado_por = auth.uid() or public.is_admin())
  );
$$;

revoke execute on function public.pode_editar_evento(uuid) from public, anon;
grant execute on function public.pode_editar_evento(uuid) to authenticated;

drop policy if exists "anexos_ver" on storage.objects;
create policy "anexos_ver" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and public.is_ativo());

drop policy if exists "anexos_enviar" on storage.objects;
create policy "anexos_enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.pode_editar_evento(public.evento_da_pasta(name)));

drop policy if exists "anexos_excluir" on storage.objects;
create policy "anexos_excluir" on storage.objects
  for delete to authenticated
  using (bucket_id = 'anexos' and public.pode_editar_evento(public.evento_da_pasta(name)));

-- ---------------------------------------------------------------------
-- Visibilidade do evento: 'todos' (padrão) ou 'privado' (só quem criou e admins)
-- Vale para o evento, o histórico dele e as fotos/arquivos.
-- ---------------------------------------------------------------------
alter table public.eventos add column if not exists visibilidade text not null default 'todos';
alter table public.eventos drop constraint if exists eventos_visibilidade_ok;
alter table public.eventos add constraint eventos_visibilidade_ok check (visibilidade in ('todos', 'privado'));

create or replace function public.pode_ver_evento(evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_ativo() and exists (
    select 1 from eventos
    where id = evento and (visibilidade = 'todos' or criado_por = auth.uid() or public.is_admin())
  );
$$;
revoke execute on function public.pode_ver_evento(uuid) from public, anon;
grant execute on function public.pode_ver_evento(uuid) to authenticated;

drop policy if exists "eventos_select" on public.eventos;
create policy "eventos_select" on public.eventos
  for select to authenticated
  using (public.is_ativo() and (visibilidade = 'todos' or criado_por = auth.uid() or public.is_admin()));

alter table public.historico add column if not exists evento_privado boolean not null default false;
alter table public.historico add column if not exists evento_dono uuid;
update public.historico h
   set evento_dono = e.criado_por, evento_privado = (e.visibilidade = 'privado')
  from public.eventos e
 where e.id = h.evento_id and h.evento_dono is null;

drop policy if exists "historico_select" on public.historico;
create policy "historico_select" on public.historico
  for select to authenticated
  using (public.is_ativo() and (not evento_privado or evento_dono = auth.uid() or public.is_admin()));

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
    foreach campo in array array['situacao', 'nome', 'tipo', 'local', 'gerente', 'data_inicio', 'data_fim', 'valor_total', 'visibilidade'] loop
      if (to_jsonb(old) -> campo) is distinct from (to_jsonb(new) -> campo) then
        det := det || jsonb_build_object(campo, jsonb_build_array(to_jsonb(old) -> campo, to_jsonb(new) -> campo));
      end if;
    end loop;
    if old.dados is distinct from new.dados then
      det := det || jsonb_build_object('dados', true);
    end if;
    if old.visibilidade is distinct from new.visibilidade then
      update historico set evento_privado = (new.visibilidade = 'privado') where evento_id = new.id;
    end if;
    if det = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into historico (evento_id, evento_numero, evento_nome, acao, usuario_id, usuario_nome, detalhes, evento_privado, evento_dono)
  values (ref.id, ref.numero, ref.nome,
          case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'excluiu' end,
          auth.uid(), coalesce(quem, 'Sistema'), det, ref.visibilidade = 'privado', ref.criado_por);
  return null;
end $$;

drop policy if exists "anexos_ver" on storage.objects;
create policy "anexos_ver" on storage.objects
  for select to authenticated
  using (bucket_id = 'anexos' and public.pode_ver_evento(public.evento_da_pasta(name)));
-- ---------------------------------------------------------------------
-- Atividades (anúncios, folders, catálogos, vídeos…)
-- Mesmas regras dos eventos: situação, visibilidade, quem edita, histórico e arquivos.
-- Numeração própria (não interfere na numeração dos eventos).
-- ---------------------------------------------------------------------
create table if not exists public.atividades (
  id             uuid primary key default gen_random_uuid(),
  numero         bigint generated always as identity unique,
  situacao       text not null default 'analise' check (situacao in ('reprovado', 'analise', 'aprovado')),
  visibilidade   text not null default 'todos' check (visibilidade in ('todos', 'privado')),
  tipo           text not null default '',
  data_inicio    date,
  data_fim       date,
  nome           text not null check (length(trim(nome)) > 0),
  gerente        text not null default '',
  valor_total    numeric(14, 2) not null default 0,
  dados          jsonb not null default '{}'::jsonb,
  criado_por     uuid not null default auth.uid() references public.perfis (id),
  criado_em      timestamptz not null default now(),
  atualizado_por uuid references public.perfis (id),
  atualizado_em  timestamptz not null default now(),
  constraint atividades_datas_ok check (data_fim is null or data_inicio is null or data_fim >= data_inicio),
  constraint atividades_tamanhos check (char_length(nome) <= 200 and char_length(gerente) <= 150
         and char_length(tipo) <= 60 and octet_length(dados::text) <= 300000)
);
create index if not exists atividades_inicio_idx on public.atividades (data_inicio);

create or replace function public.atividades_antes_gravar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(auth.uid(), new.criado_por);
    new.criado_em := now();
  else
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
  end if;
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  new.atualizado_em := now();
  new.valor_total := greatest(0, coalesce(nullif(new.dados -> 'contrato' ->> 'valor', '')::numeric, 0));
  return new;
end $$;

drop trigger if exists atividades_antes_gravar on public.atividades;
create trigger atividades_antes_gravar
  before insert or update on public.atividades
  for each row execute function public.atividades_antes_gravar();

alter table public.atividades enable row level security;

drop policy if exists "atividades_select" on public.atividades;
create policy "atividades_select" on public.atividades
  for select to authenticated
  using (public.is_ativo() and (visibilidade = 'todos' or criado_por = auth.uid() or public.is_admin()));

drop policy if exists "atividades_insert" on public.atividades;
create policy "atividades_insert" on public.atividades
  for insert to authenticated with check (public.is_ativo() and criado_por = auth.uid());

drop policy if exists "atividades_update" on public.atividades;
create policy "atividades_update" on public.atividades
  for update to authenticated
  using (public.is_ativo() and (criado_por = auth.uid() or public.is_admin()))
  with check (public.is_ativo() and (criado_por = auth.uid() or public.is_admin()));

drop policy if exists "atividades_delete" on public.atividades;
create policy "atividades_delete" on public.atividades
  for delete to authenticated
  using (public.is_ativo() and (criado_por = auth.uid() or public.is_admin()));

revoke all on public.atividades from anon;

-- Histórico: passa a registrar também as atividades
alter table public.historico add column if not exists tipo_registro text not null default 'evento';
alter table public.historico drop constraint if exists historico_tipo_ok;
alter table public.historico add constraint historico_tipo_ok check (tipo_registro in ('evento', 'atividade'));

create or replace function public.atividades_registrar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  quem text;
  det  jsonb := '{}'::jsonb;
  ref  public.atividades;
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
    foreach campo in array array['situacao', 'nome', 'tipo', 'gerente', 'data_inicio', 'data_fim', 'valor_total', 'visibilidade'] loop
      if (to_jsonb(old) -> campo) is distinct from (to_jsonb(new) -> campo) then
        det := det || jsonb_build_object(campo, jsonb_build_array(to_jsonb(old) -> campo, to_jsonb(new) -> campo));
      end if;
    end loop;
    if old.dados is distinct from new.dados then
      det := det || jsonb_build_object('dados', true);
    end if;
    if old.visibilidade is distinct from new.visibilidade then
      update historico set evento_privado = (new.visibilidade = 'privado') where evento_id = new.id;
    end if;
    if det = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into historico (evento_id, evento_numero, evento_nome, acao, usuario_id, usuario_nome, detalhes, evento_privado, evento_dono, tipo_registro)
  values (ref.id, ref.numero, ref.nome,
          case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'excluiu' end,
          auth.uid(), coalesce(quem, 'Sistema'), det, ref.visibilidade = 'privado', ref.criado_por, 'atividade');
  return null;
end $$;

drop trigger if exists atividades_historico on public.atividades;
create trigger atividades_historico
  after insert or update or delete on public.atividades
  for each row execute function public.atividades_registrar_historico();

revoke execute on function public.atividades_antes_gravar() from public, anon, authenticated;
revoke execute on function public.atividades_registrar_historico() from public, anon, authenticated;

-- Fotos e arquivos: as regras passam a valer para eventos E atividades
create or replace function public.pode_ver_evento(evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_ativo() and (
    exists (select 1 from eventos where id = evento and (visibilidade = 'todos' or criado_por = auth.uid() or public.is_admin()))
    or exists (select 1 from atividades where id = evento and (visibilidade = 'todos' or criado_por = auth.uid() or public.is_admin()))
  );
$$;

create or replace function public.pode_editar_evento(evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_ativo() and (
    exists (select 1 from eventos where id = evento and (criado_por = auth.uid() or public.is_admin()))
    or exists (select 1 from atividades where id = evento and (criado_por = auth.uid() or public.is_admin()))
  );
$$;

-- =====================================================================
-- Migração: frete da entrega no total + evento "realizado"
-- Segura para rodar com o site no ar (só acrescenta; pode rodar de novo)
-- =====================================================================

-- 1) O frete (transportadora ou correio) passa a contar no total do evento
create or replace function public.calcular_total(d jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select greatest(0, coalesce(nullif(d -> 'contratoEvento' ->> 'valor', '')::numeric, 0))
       + greatest(0, coalesce(nullif(d -> 'montadora' ->> 'valor', '')::numeric, 0))
       + public.soma_valores(d -> 'servicos')
       + public.soma_valores(d -> 'gastos')
       + public.soma_valores(d -> 'hospedagem')
       + public.soma_valores(d -> 'alimentacao')
       + public.soma_valores(d -> 'passagens')
       + case when d -> 'entrega' ->> 'modo' in ('transportadora', 'correio')
              then greatest(0, coalesce(nullif(d -> 'entrega' ->> 'frete', '')::numeric, 0)) else 0 end;
$$;

-- 2) Marcar o evento como realizado (bolinha no fim da linha da lista)
alter table public.eventos add column if not exists realizado boolean not null default false;

-- 3) Histórico registra também quando o evento é marcado/desmarcado como realizado
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
    foreach campo in array array['situacao', 'nome', 'tipo', 'local', 'gerente', 'data_inicio', 'data_fim', 'valor_total', 'visibilidade', 'realizado'] loop
      if (to_jsonb(old) -> campo) is distinct from (to_jsonb(new) -> campo) then
        det := det || jsonb_build_object(campo, jsonb_build_array(to_jsonb(old) -> campo, to_jsonb(new) -> campo));
      end if;
    end loop;
    if old.dados is distinct from new.dados then
      det := det || jsonb_build_object('dados', true);
    end if;
    if old.visibilidade is distinct from new.visibilidade then
      update historico set evento_privado = (new.visibilidade = 'privado') where evento_id = new.id;
    end if;
    if det = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into historico (evento_id, evento_numero, evento_nome, acao, usuario_id, usuario_nome, detalhes, evento_privado, evento_dono)
  values (ref.id, ref.numero, ref.nome,
          case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'excluiu' end,
          auth.uid(), coalesce(quem, 'Sistema'), det, ref.visibilidade = 'privado', ref.criado_por);
  return null;
end $$;

revoke execute on function public.eventos_registrar_historico() from public, anon, authenticated;

-- =====================================================================
-- Migração: usuário "executor", conclusão de atividades e realizado em atividades
-- Segura para rodar com o site no ar (só acrescenta; pode rodar de novo)
--
-- executor: vê tudo, mas NÃO cria nem altera eventos/atividades.
--           Nas atividades em que é o "responsável pela execução" ele pode
--           registrar a data de conclusão e uma observação, e enviar fotos.
-- =====================================================================

-- 1) Novo papel
alter table public.perfis drop constraint if exists perfis_papel_check;
alter table public.perfis add constraint perfis_papel_check check (papel in ('admin', 'usuario', 'executor'));

-- Quem pode cadastrar e editar (admin ou usuário comum, aprovado)
create or replace function public.pode_cadastrar() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from perfis where id = auth.uid() and ativo and papel in ('admin', 'usuario'));
$$;
revoke execute on function public.pode_cadastrar() from public, anon;
grant execute on function public.pode_cadastrar() to authenticated;

-- 2) Executor não cria nem altera cadastros
drop policy if exists "eventos_insert" on public.eventos;
create policy "eventos_insert" on public.eventos
  for insert to authenticated with check (public.pode_cadastrar() and criado_por = auth.uid());
drop policy if exists "eventos_update" on public.eventos;
create policy "eventos_update" on public.eventos
  for update to authenticated
  using (public.pode_cadastrar() and (criado_por = auth.uid() or public.is_admin()))
  with check (public.pode_cadastrar() and (criado_por = auth.uid() or public.is_admin()));
drop policy if exists "eventos_delete" on public.eventos;
create policy "eventos_delete" on public.eventos
  for delete to authenticated
  using (public.pode_cadastrar() and (criado_por = auth.uid() or public.is_admin()));

drop policy if exists "atividades_insert" on public.atividades;
create policy "atividades_insert" on public.atividades
  for insert to authenticated with check (public.pode_cadastrar() and criado_por = auth.uid());
drop policy if exists "atividades_update" on public.atividades;
create policy "atividades_update" on public.atividades
  for update to authenticated
  using (public.pode_cadastrar() and (criado_por = auth.uid() or public.is_admin()))
  with check (public.pode_cadastrar() and (criado_por = auth.uid() or public.is_admin()));
drop policy if exists "atividades_delete" on public.atividades;
create policy "atividades_delete" on public.atividades
  for delete to authenticated
  using (public.pode_cadastrar() and (criado_por = auth.uid() or public.is_admin()));

create or replace function public.pode_editar_evento(evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.pode_cadastrar() and (
    exists (select 1 from eventos where id = evento and (criado_por = auth.uid() or public.is_admin()))
    or exists (select 1 from atividades where id = evento and (criado_por = auth.uid() or public.is_admin()))
  );
$$;

-- 3) Responsável pela execução: o nome do usuário aparece em algum serviço da atividade
--    (sem diferenciar maiúsculas; aceita vários nomes separados por , / ; & + ou " e ")
create or replace function public.nome_norm(t text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.e_responsavel(atividade uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from atividades a
    join perfis p on p.id = auth.uid() and p.ativo
    cross join lateral jsonb_array_elements(case when jsonb_typeof(a.dados -> 'servicos') = 'array' then a.dados -> 'servicos' else '[]'::jsonb end) s
    cross join lateral regexp_split_to_table(coalesce(s ->> 'responsavel', ''), '\s*([,/;&+]|\s+e\s+)\s*') as parte(nm)
    where a.id = atividade
      and (a.visibilidade = 'todos' or a.criado_por = auth.uid())
      and public.nome_norm(parte.nm) <> ''
      and public.nome_norm(parte.nm) = public.nome_norm(p.nome)
  );
$$;
revoke execute on function public.e_responsavel(uuid) from public, anon;
grant execute on function public.e_responsavel(uuid) to authenticated;

-- 4) A conclusão só muda pela função abaixo; salvar o formulário não apaga o que o executor registrou
create or replace function public.atividades_antes_gravar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    new.criado_por := coalesce(auth.uid(), new.criado_por);
    new.criado_em := now();
    new.dados := coalesce(new.dados, '{}'::jsonb) - 'execucao';
  else
    new.criado_por := old.criado_por;
    new.criado_em := old.criado_em;
    if coalesce(current_setting('dello.execucao', true), '') <> '1' then
      new.dados := (coalesce(new.dados, '{}'::jsonb) - 'execucao')
        || case when old.dados ? 'execucao' then jsonb_build_object('execucao', old.dados -> 'execucao') else '{}'::jsonb end;
    end if;
  end if;
  new.atualizado_por := coalesce(auth.uid(), new.atualizado_por);
  new.atualizado_em := now();
  new.valor_total := greatest(0, coalesce(nullif(new.dados -> 'contrato' ->> 'valor', '')::numeric, 0));
  return new;
end $$;
revoke execute on function public.atividades_antes_gravar() from public, anon, authenticated;

create or replace function public.registrar_execucao(atividade uuid, conclusao date, obs text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  quem text;
  r jsonb;
  n int;
begin
  if not public.is_ativo() then raise exception 'permission denied'; end if;
  if not (public.is_admin()
          or exists (select 1 from atividades where id = atividade and criado_por = auth.uid() and public.pode_cadastrar())
          or public.e_responsavel(atividade)) then
    raise exception 'permission denied';
  end if;
  if conclusao is not null and (conclusao < date '2000-01-01' or conclusao > date '2100-12-31') then
    raise exception 'invalid input: data de conclusão';
  end if;
  select nome into quem from perfis where id = auth.uid();
  perform set_config('dello.execucao', '1', true);
  update atividades
     set dados = jsonb_set(coalesce(dados, '{}'::jsonb), '{execucao}',
           case when conclusao is null and coalesce(trim(obs), '') = '' then 'null'::jsonb
                else jsonb_build_object('conclusao', conclusao, 'obs', left(coalesce(trim(obs), ''), 2000),
                                        'por', quem, 'por_id', auth.uid(), 'em', now()) end)
   where id = atividade
  returning dados -> 'execucao' into r;
  get diagnostics n = row_count;
  perform set_config('dello.execucao', '', true);
  if n = 0 then raise exception 'permission denied'; end if;
  return r;
end $$;
revoke execute on function public.registrar_execucao(uuid, date, text) from public, anon;
grant execute on function public.registrar_execucao(uuid, date, text) to authenticated;

-- 5) Fotos: o responsável pela execução também pode enviar (excluir continua só para quem edita)
create or replace function public.pode_enviar_anexo(evento uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.pode_editar_evento(evento) or public.e_responsavel(evento);
$$;
revoke execute on function public.pode_enviar_anexo(uuid) from public, anon;
grant execute on function public.pode_enviar_anexo(uuid) to authenticated;

drop policy if exists "anexos_enviar" on storage.objects;
create policy "anexos_enviar" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'anexos' and public.pode_enviar_anexo(public.evento_da_pasta(name)));

-- 6) Atividade realizada (bolinha) + histórico com realizado e data de conclusão
alter table public.atividades add column if not exists realizado boolean not null default false;

create or replace function public.atividades_registrar_historico() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  quem text;
  det  jsonb := '{}'::jsonb;
  ref  public.atividades;
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
    foreach campo in array array['situacao', 'nome', 'tipo', 'gerente', 'data_inicio', 'data_fim', 'valor_total', 'visibilidade', 'realizado'] loop
      if (to_jsonb(old) -> campo) is distinct from (to_jsonb(new) -> campo) then
        det := det || jsonb_build_object(campo, jsonb_build_array(to_jsonb(old) -> campo, to_jsonb(new) -> campo));
      end if;
    end loop;
    if (old.dados -> 'execucao' ->> 'conclusao') is distinct from (new.dados -> 'execucao' ->> 'conclusao') then
      det := det || jsonb_build_object('conclusao', jsonb_build_array(old.dados -> 'execucao' -> 'conclusao', new.dados -> 'execucao' -> 'conclusao'));
    end if;
    if (old.dados - 'execucao') is distinct from (new.dados - 'execucao')
       or (old.dados -> 'execucao' ->> 'obs') is distinct from (new.dados -> 'execucao' ->> 'obs') then
      det := det || jsonb_build_object('dados', true);
    end if;
    if old.visibilidade is distinct from new.visibilidade then
      update historico set evento_privado = (new.visibilidade = 'privado') where evento_id = new.id;
    end if;
    if det = '{}'::jsonb then
      return null;
    end if;
  end if;

  insert into historico (evento_id, evento_numero, evento_nome, acao, usuario_id, usuario_nome, detalhes, evento_privado, evento_dono, tipo_registro)
  values (ref.id, ref.numero, ref.nome,
          case tg_op when 'INSERT' then 'criou' when 'UPDATE' then 'alterou' else 'excluiu' end,
          auth.uid(), coalesce(quem, 'Sistema'), det, ref.visibilidade = 'privado', ref.criado_por, 'atividade');
  return null;
end $$;
revoke execute on function public.atividades_registrar_historico() from public, anon, authenticated;
