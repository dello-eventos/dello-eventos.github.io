-- =====================================================================
-- Migração: conferência do administrador
-- Segura para rodar com o site no ar (só acrescenta; pode rodar de novo)
--
-- Quem não é administrador:
--   * não aprova: o que cadastra ou altera fica sempre "Em análise";
--   * tudo o que cadastra, altera, marca como realizado ou conclui
--     fica marcado "para conferir" até um administrador aprovar.
-- =====================================================================

alter table public.eventos    add column if not exists revisar boolean not null default false;
alter table public.eventos    add column if not exists revisar_motivo text;
alter table public.eventos    add column if not exists revisar_em timestamptz;
alter table public.eventos    add column if not exists revisar_por uuid;
alter table public.atividades add column if not exists revisar boolean not null default false;
alter table public.atividades add column if not exists revisar_motivo text;
alter table public.atividades add column if not exists revisar_em timestamptz;
alter table public.atividades add column if not exists revisar_por uuid;

-- O que mudou entre a versão antiga e a nova (null = nada que precise de conferência)
create or replace function public.motivo_conferencia(velho jsonb, novo jsonb) returns text
language sql immutable set search_path = '' as $$
  select case
    when velho is null then 'criou'
    when (novo - array['id', 'numero', 'situacao', 'realizado', 'revisar', 'revisar_motivo', 'revisar_em', 'revisar_por',
                       'atualizado_por', 'atualizado_em', 'valor_total', 'criado_por', 'criado_em', 'dados'])
         is distinct from
         (velho - array['id', 'numero', 'situacao', 'realizado', 'revisar', 'revisar_motivo', 'revisar_em', 'revisar_por',
                        'atualizado_por', 'atualizado_em', 'valor_total', 'criado_por', 'criado_em', 'dados'])
      or (coalesce(novo -> 'dados', '{}'::jsonb) - 'execucao' - 'proximo_id')
         is distinct from (coalesce(velho -> 'dados', '{}'::jsonb) - 'execucao' - 'proximo_id') then 'alterou'
    when (novo -> 'realizado') is distinct from (velho -> 'realizado') then
      case when (novo ->> 'realizado')::boolean then 'realizado' else 'desmarcou' end
    when (novo -> 'dados' -> 'execucao' ->> 'conclusao') is distinct from (velho -> 'dados' -> 'execucao' ->> 'conclusao') then 'concluiu'
    when (novo -> 'dados' -> 'execucao') is distinct from (velho -> 'dados' -> 'execucao') then 'execucao'
  end;
$$;

-- Eventos
create or replace function public.eventos_antes_gravar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  motivo text;
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

  -- conferência: só administrador aprova
  if auth.uid() is not null and not public.is_admin() then
    motivo := public.motivo_conferencia(case when tg_op = 'INSERT' then null else to_jsonb(old) end, to_jsonb(new));
    if tg_op = 'INSERT' or motivo = 'alterou' then
      new.situacao := 'analise';
    else
      new.situacao := old.situacao;
    end if;
    if motivo is not null then
      new.revisar := true;
      new.revisar_motivo := case when tg_op = 'UPDATE' and old.revisar and old.revisar_motivo = 'criou' and motivo = 'alterou' then 'criou' else motivo end;
      new.revisar_em := now();
      new.revisar_por := auth.uid();
    else
      new.revisar := old.revisar;
      new.revisar_motivo := old.revisar_motivo;
      new.revisar_em := old.revisar_em;
      new.revisar_por := old.revisar_por;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.eventos_antes_gravar() from public, anon, authenticated;

-- Atividades (mantém a proteção da execução registrada pelo responsável)
create or replace function public.atividades_antes_gravar() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  motivo text;
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

  -- conferência: só administrador aprova
  if auth.uid() is not null and not public.is_admin() then
    motivo := public.motivo_conferencia(case when tg_op = 'INSERT' then null else to_jsonb(old) end, to_jsonb(new));
    if tg_op = 'INSERT' or motivo = 'alterou' then
      new.situacao := 'analise';
    else
      new.situacao := old.situacao;
    end if;
    if motivo is not null then
      new.revisar := true;
      new.revisar_motivo := case when tg_op = 'UPDATE' and old.revisar and old.revisar_motivo = 'criou' and motivo = 'alterou' then 'criou' else motivo end;
      new.revisar_em := now();
      new.revisar_por := auth.uid();
    else
      new.revisar := old.revisar;
      new.revisar_motivo := old.revisar_motivo;
      new.revisar_em := old.revisar_em;
      new.revisar_por := old.revisar_por;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.atividades_antes_gravar() from public, anon, authenticated;
