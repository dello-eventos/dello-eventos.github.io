-- Rode este arquivo UMA VEZ no Supabase: projeto dello-eventos > SQL Editor > New query > cole tudo > Run.
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