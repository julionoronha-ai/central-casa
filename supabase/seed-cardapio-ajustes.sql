-- Ajustes pós-uso (2026-06-07): regras rígidas do cardápio.
-- Idempotente. Rodar DEPOIS de schema-cardapio.sql + seed-receitas.sql.

-- 1) Desativar receitas-componente antigas (fragmentos do seed inicial):
--    no modelo atual cada receita = refeição inteira, então fragmentos não podem ser sorteados.
update receitas set ativo = false where nome in (
  'Banana amassada com canela, granola e sementes','Mamão amassado com canela e granola sem glúten',
  'Queijo branco','Café','Arroz','Feijão carioca','Espaguete de abobrinha com frango',
  'Couve refogada','Cenoura amarela cozida','Salada (alface, tomate, brócolis, palmito, pepino)',
  'Iogurte desnatado com granola','Iogurte com granola sem glúten','Sopa de batata-doce com frango'
);

-- 2) Merenda do Henrique: listas FECHADAS (frutas × carboidratos permitidos).
update receitas set ativo = false where refeicao = 'merenda';
insert into receitas (nome, refeicao, categoria, elaborado, henrique_safe, ingredientes, preparo) values
  ('Uva + Pão Belive sem glúten com queijo','merenda','fruta',false,true,'[{"item":"Uva","qtd":0.1,"unidade":"kg"},{"item":"Pão Belive sem glúten com queijo","qtd":1,"unidade":"un"}]',null),
  ('Maçã + Pão Wickbold sem glúten com queijo','merenda','fruta',false,true,'[{"item":"Maçã","qtd":0.15,"unidade":"kg"},{"item":"Pão Wickbold sem glúten com queijo","qtd":1,"unidade":"un"}]',null),
  ('Manga + Biscoito de polvilho','merenda','fruta',false,true,'[{"item":"Manga","qtd":0.15,"unidade":"kg"},{"item":"Biscoito de polvilho","qtd":1,"unidade":"un"}]',null),
  ('Melão + Biscoito Papaovo','merenda','fruta',false,true,'[{"item":"Melão","qtd":0.15,"unidade":"kg"},{"item":"Biscoito Papaovo","qtd":1,"unidade":"un"}]',null),
  ('Melancia + Biscoito wafer Schär','merenda','fruta',false,true,'[{"item":"Melancia","qtd":0.2,"unidade":"kg"},{"item":"Biscoito wafer Schär","qtd":1,"unidade":"un"}]',null),
  ('Mamão + Biscoito maria Schär','merenda','fruta',false,true,'[{"item":"Mamão","qtd":0.15,"unidade":"kg"},{"item":"Biscoito maria Schär","qtd":1,"unidade":"un"}]',null),
  ('Pera + Bolo de chocolate Schär','merenda','fruta',false,true,'[{"item":"Pera","qtd":0.15,"unidade":"kg"},{"item":"Bolo de chocolate Schär","qtd":1,"unidade":"un"}]',null),
  ('Mexerica + Bolo de laranja Schär','merenda','fruta',false,true,'[{"item":"Mexerica","qtd":0.12,"unidade":"kg"},{"item":"Bolo de laranja Schär","qtd":1,"unidade":"un"}]',null),
  ('Uva + Biscoito Mickey','merenda','fruta',false,true,'[{"item":"Uva","qtd":0.1,"unidade":"kg"},{"item":"Biscoito Mickey","qtd":1,"unidade":"un"}]',null),
  ('Maçã + Cookies Schär','merenda','fruta',false,true,'[{"item":"Maçã","qtd":0.15,"unidade":"kg"},{"item":"Cookies Schär","qtd":1,"unidade":"un"}]',null),
  ('Manga + Biscoito vanilla Schär','merenda','fruta',false,true,'[{"item":"Manga","qtd":0.15,"unidade":"kg"},{"item":"Biscoito vanilla Schär","qtd":1,"unidade":"un"}]',null),
  ('Melão + Pão Belive sem glúten com queijo','merenda','fruta',false,true,'[{"item":"Melão","qtd":0.15,"unidade":"kg"},{"item":"Pão Belive sem glúten com queijo","qtd":1,"unidade":"un"}]',null),
  ('Melancia + Pão Wickbold sem glúten com queijo','merenda','fruta',false,true,'[{"item":"Melancia","qtd":0.2,"unidade":"kg"},{"item":"Pão Wickbold sem glúten com queijo","qtd":1,"unidade":"un"}]',null),
  ('Mamão + Biscoito de polvilho','merenda','fruta',false,true,'[{"item":"Mamão","qtd":0.15,"unidade":"kg"},{"item":"Biscoito de polvilho","qtd":1,"unidade":"un"}]',null),
  ('Pera + Biscoito Papaovo','merenda','fruta',false,true,'[{"item":"Pera","qtd":0.15,"unidade":"kg"},{"item":"Biscoito Papaovo","qtd":1,"unidade":"un"}]',null),
  ('Mexerica + Biscoito wafer Schär','merenda','fruta',false,true,'[{"item":"Mexerica","qtd":0.12,"unidade":"kg"},{"item":"Biscoito wafer Schär","qtd":1,"unidade":"un"}]',null)
on conflict do nothing;

-- 3) Liberar DELETE de overrides ao anon (regenerar limpa overrides do slot).
do $$ begin
  if not exists (select 1 from pg_policies where tablename='cardapio_overrides' and policyname='del_ovr') then
    create policy del_ovr on cardapio_overrides for delete using (true);
  end if;
end $$;
grant delete on cardapio_overrides to anon;
