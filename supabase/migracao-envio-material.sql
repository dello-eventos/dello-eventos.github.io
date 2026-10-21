-- =====================================================================
-- Migração: atividade de "envio de material" (itens com valor unitário e total)
-- Segura para rodar com o site no ar (só troca funções; pode rodar de novo)
-- =====================================================================

-- Só o frete de um envio (transportadora ou correio)
create or replace function public.valor_frete(e jsonb) returns numeric
language sql immutable set search_path = '' as $$
  select case when e ->> 'modo' in ('transportadora', 'correio')
              then greatest(0, coalesce(nullif(e ->> 'frete', '')::numeric, 0)) else 0 end;
$$;

-- Atividades: contrato + frete e mercadoria das remessas; ou, se for envio de material, itens + fretes
-- (mantém a proteção da execução e a regra de conferência)
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
  if coalesce(new.dados ->> 'envio_material', '') = 'true' then
    -- envio de material: itens (qtd × unitário) + fretes; a "mercadoria" da entrega não conta
    new.valor_total := public.soma_valores(new.dados -> 'material' -> 'itens')
      + public.valor_frete(new.dados -> 'entrega')
      + coalesce((select sum(public.valor_frete(x)) from jsonb_array_elements(
          case when jsonb_typeof(new.dados -> 'remessas') = 'array' then new.dados -> 'remessas' else '[]'::jsonb end) x), 0);
  else
    new.valor_total := greatest(0, coalesce(nullif(new.dados -> 'contrato' ->> 'valor', '')::numeric, 0))
      + public.valor_envio(new.dados -> 'entrega')
      + coalesce((select sum(public.valor_envio(x)) from jsonb_array_elements(
          case when jsonb_typeof(new.dados -> 'remessas') = 'array' then new.dados -> 'remessas' else '[]'::jsonb end) x), 0);
  end if;

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
