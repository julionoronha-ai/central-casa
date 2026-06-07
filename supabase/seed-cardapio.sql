-- Despensa básica (não entra na compra)
insert into despensa_basica (nome) values
  ('arroz'),('feijão'),('sal'),('óleo'),('café'),('açúcar'),('canela')
on conflict (nome) do nothing;

-- Receitas-semente (quantidades por porção, aproximadas)
insert into receitas (nome, refeicao, categoria, elaborado, henrique_safe, ingredientes, preparo) values
  ('Uva e biscoito de polvilho','merenda','fruta', false, true,
   '[{"item":"Uva","qtd":0.08,"unidade":"kg"},{"item":"Biscoito de polvilho","qtd":0.03,"unidade":"kg"}]','Lavar a uva; servir com o biscoito de polvilho.'),
  ('Banana amassada com canela, granola e sementes','cafe','fruta', false, false,
   '[{"item":"Banana","qtd":0.12,"unidade":"kg"},{"item":"Granola","qtd":0.03,"unidade":"kg"},{"item":"Mix de sementes","qtd":0.01,"unidade":"kg"}]', null),
  ('Mamão amassado com canela e granola sem glúten','cafe','fruta', false, true,
   '[{"item":"Mamão","qtd":0.12,"unidade":"kg"},{"item":"Granola sem glúten","qtd":0.03,"unidade":"kg"}]', null),
  ('Queijo branco','cafe','generico', false, true, '[{"item":"Queijo branco","qtd":0.04,"unidade":"kg"}]', null),
  ('Café','cafe','bebida', false, true, '[{"item":"Café","qtd":0.01,"unidade":"kg"}]', null),
  ('Arroz','almoco','arroz', false, true, '[{"item":"Arroz","qtd":0.06,"unidade":"kg"}]', null),
  ('Feijão carioca','almoco','feijao', false, true, '[{"item":"Feijão carioca","qtd":0.05,"unidade":"kg"}]', null),
  ('Espaguete de abobrinha com frango','almoco','carne', true, true,
   '[{"item":"Abobrinha","qtd":0.2,"unidade":"kg"},{"item":"Frango (peito)","qtd":0.15,"unidade":"kg"},{"item":"Alho","qtd":0.005,"unidade":"kg"}]',
   E'1. Corte a abobrinha em fios (espiralizador ou fatiador).\n2. Refogue o alho, doure o frango em cubos.\n3. Junte a abobrinha por 3-4 min (al dente).\n4. Tempere e sirva.'),
  ('Couve refogada','almoco','verdura', false, true, '[{"item":"Couve","qtd":0.05,"unidade":"kg"}]', null),
  ('Cenoura amarela cozida','almoco','legume', false, true, '[{"item":"Cenoura","qtd":0.08,"unidade":"kg"}]', null),
  ('Salada (alface, tomate, brócolis, palmito, pepino)','almoco','salada', false, true,
   '[{"item":"Alface","qtd":0.05,"unidade":"kg"},{"item":"Tomate cereja","qtd":0.05,"unidade":"kg"},{"item":"Brócolis","qtd":0.05,"unidade":"kg"},{"item":"Palmito","qtd":0.03,"unidade":"kg"},{"item":"Pepino","qtd":0.05,"unidade":"kg"}]', null),
  ('Iogurte desnatado com granola','lanche','generico', false, false,
   '[{"item":"Iogurte desnatado","qtd":0.15,"unidade":"kg"},{"item":"Granola","qtd":0.03,"unidade":"kg"}]', null),
  ('Iogurte com granola sem glúten','lanche','generico', false, true,
   '[{"item":"Iogurte desnatado","qtd":0.15,"unidade":"kg"},{"item":"Granola sem glúten","qtd":0.03,"unidade":"kg"}]', null),
  ('Sopa de batata-doce com frango','jantar','elaborado', true, true,
   '[{"item":"Batata-doce","qtd":0.2,"unidade":"kg"},{"item":"Frango (peito)","qtd":0.12,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"}]',
   E'1. Cozinhe a batata-doce até amaciar.\n2. Refogue cebola e frango desfiado.\n3. Bata a batata-doce com o caldo, junte o frango.\n4. Ajuste sal e sirva quente.')
on conflict do nothing;
