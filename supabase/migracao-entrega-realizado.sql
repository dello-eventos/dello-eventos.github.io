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
