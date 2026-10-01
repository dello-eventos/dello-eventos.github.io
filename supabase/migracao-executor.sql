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
