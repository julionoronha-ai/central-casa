-- ============================================================================
-- Histórico permanente de COMPRAS (para o botão "exportar" do modo Compras e,
-- no futuro, o dashboard de hábitos — Módulo 3).
--
-- Ideia: o registro permanente já existe no banco:
--   • semana atual  -> necessidades (status='comprado', baixado_em = quando comprou)
--   • semanas passadas -> historico (arquivado pelo reset_ciclo ao "zerar")
-- Aqui só (1) garantimos a coluna origem no historico, (2) fazemos o reset_ciclo
-- carregá-la, e (3) expomos uma RPC só-leitura, já desnormalizada (nomes + data),
-- unindo as duas fontes e ordenada cronologicamente.
-- ============================================================================

-- 1) origem também no historico (para não perder a etiqueta ao arquivar)
alter table historico add column if not exists origem text;

-- 2) reset_ciclo passa a carregar origem ao arquivar
create or replace function reset_ciclo(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from users where id = p_user and can_reset) then
    raise exception 'sem permissão para zerar';
  end if;
  insert into historico (item_id,nome_avulso,qtd,status,marcado_por,marcado_em,baixado_por,baixado_em,origem)
    select item_id,nome_avulso,qtd,status,marcado_por,marcado_em,baixado_por,baixado_em,origem from necessidades;
  delete from necessidades;
end;
$$;

-- 3) RPC só-leitura: TODAS as compras (arquivadas + ciclo atual), desnormalizadas.
--    security definer -> pode ler historico/users/itens sem expor as tabelas ao anon.
create or replace function historico_compras()
returns table(
  comprado_em timestamptz,
  secao text,
  item text,
  qtd int,
  pedido_por text,
  comprado_por text,
  origem text
)
language sql security definer set search_path = public as $$
  select
    x.baixado_em                                   as comprado_em,
    coalesce(s.nome, 'Outros')                     as secao,
    coalesce(i.nome, x.nome_avulso, 'item')        as item,
    x.qtd                                          as qtd,
    mp.nome                                         as pedido_por,
    bp.nome                                         as comprado_por,
    coalesce(x.origem, 'pessoa')                    as origem
  from (
    select item_id, nome_avulso, qtd, marcado_por, baixado_por, baixado_em, origem
      from historico    where status = 'comprado' and baixado_em is not null
    union all
    select item_id, nome_avulso, qtd, marcado_por, baixado_por, baixado_em, origem
      from necessidades where status = 'comprado' and baixado_em is not null
  ) x
  left join itens  i  on i.id  = x.item_id
  left join secoes s  on s.id  = i.secao_id
  left join users  mp on mp.id = x.marcado_por
  left join users  bp on bp.id = x.baixado_por
  order by x.baixado_em;
$$;

grant execute on function historico_compras() to anon;
