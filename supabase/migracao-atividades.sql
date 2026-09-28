-- Rode UMA VEZ no Supabase: projeto dello-eventos > SQL Editor > New query > cole tudo > Run.
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
