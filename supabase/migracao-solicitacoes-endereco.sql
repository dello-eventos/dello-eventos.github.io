-- =====================================================================
-- Migração: no formulário dos representantes, o endereço de entrega só é
-- obrigatório quando a forma de entrega for transportadora ou correio.
-- Segura para rodar com o site no ar (só troca a função; pode rodar de novo)
-- =====================================================================

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

  -- campos obrigatórios (o endereço só é obrigatório para transportadora ou correio)
  foreach campo in array array['cliente_codigo', 'cliente_nome', 'contato', 'solicitante', 'tipo', 'evento',
                               'forma_entrega', 'material_retorna', 'data_evento', 'prazo_entrega'] loop
    t := trim(coalesce(dados ->> campo, ''));
    if t = '' then raise exception 'campo obrigatório: %', campo; end if;
    if char_length(t) > 300 then raise exception 'campo muito longo: %', campo; end if;
  end loop;
  foreach campo in array array['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf'] loop
    t := trim(coalesce(dados ->> campo, ''));
    if t = '' and campo <> 'complemento' and dados ->> 'forma_entrega' in ('transportadora', 'correio') then
      raise exception 'campo obrigatório: %', campo;
    end if;
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
