-- Almoço por COMPONENTES (2026-06-07): o prato é montado por categoria, e cada
-- componente aparece na tela. categoria ∈ arroz|feijao|especial|legume|salada|verdura.
-- Idempotente-ish: desativa os almoços antigos (modelo "prato completo") e insere componentes.
update receitas set ativo = false where refeicao = 'almoco';

-- arroz e feijão (fixos todo dia)
insert into receitas (nome, refeicao, categoria, elaborado, henrique_safe, ingredientes, preparo) values
  ('Arroz','almoco','arroz',false,true,'[{"item":"Arroz","qtd":0.06,"unidade":"kg"}]',null),
  ('Feijão carioca','almoco','feijao',false,true,'[{"item":"Feijão carioca","qtd":0.05,"unidade":"kg"}]',null)
on conflict do nothing;

-- pratos ESPECIAIS (★ com receita) — só a proteína/prato principal (boi ou frango)
insert into receitas (nome, refeicao, categoria, elaborado, henrique_safe, ingredientes, preparo) values
  ('Frango ensopado com mandioquinha','almoco','especial',true,true,'[{"item":"Peito de frango","qtd":0.15,"unidade":"kg"},{"item":"Mandioquinha","qtd":0.1,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"},{"item":"Alho","qtd":0.005,"unidade":"kg"}]',E'1. Doure alho e cebola.\n2. Junte o frango em cubos e refogue.\n3. Acrescente a mandioquinha e água; cozinhe até amaciar e encorpar.'),
  ('Bife acebolado','almoco','especial',true,true,'[{"item":"Bife (coxão mole)","qtd":0.15,"unidade":"kg"},{"item":"Cebola","qtd":0.05,"unidade":"kg"}]',E'1. Tempere os bifes.\n2. Sele em frigideira quente.\n3. Refogue bastante cebola e sirva por cima.'),
  ('Frango grelhado ao limão','almoco','especial',true,true,'[{"item":"Peito de frango","qtd":0.15,"unidade":"kg"},{"item":"Limão","qtd":0.03,"unidade":"un"},{"item":"Alho","qtd":0.005,"unidade":"kg"}]',E'1. Tempere o frango com limão e alho.\n2. Grelhe dos dois lados até dourar.'),
  ('Carne moída refogada','almoco','especial',true,true,'[{"item":"Carne moída","qtd":0.15,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"},{"item":"Tomate","qtd":0.05,"unidade":"kg"}]',E'1. Refogue cebola e tomate.\n2. Junte a carne moída e cozinhe até soltar.'),
  ('Frango xadrez sem trigo','almoco','especial',true,true,'[{"item":"Peito de frango","qtd":0.15,"unidade":"kg"},{"item":"Pimentão","qtd":0.05,"unidade":"kg"},{"item":"Cebola","qtd":0.04,"unidade":"kg"}]',E'1. Doure o frango em cubos.\n2. Junte pimentão e cebola em cubos.\n3. Finalize com shoyu SEM glúten.'),
  ('Picadinho de carne','almoco','especial',true,true,'[{"item":"Coxão mole em cubos","qtd":0.15,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"},{"item":"Alho","qtd":0.005,"unidade":"kg"}]',E'1. Sele a carne em cubos.\n2. Refogue com alho e cebola e um pouco de água até amaciar.'),
  ('Almôndegas ao molho','almoco','especial',true,true,'[{"item":"Carne moída","qtd":0.15,"unidade":"kg"},{"item":"Molho de tomate","qtd":0.08,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"}]',E'1. Tempere e enrole as almôndegas.\n2. Cozinhe no molho de tomate até o ponto.'),
  ('Frango desfiado refogado','almoco','especial',true,true,'[{"item":"Peito de frango","qtd":0.15,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"},{"item":"Tomate","qtd":0.05,"unidade":"kg"}]',E'1. Cozinhe e desfie o frango.\n2. Refogue com cebola e tomate.'),
  ('Estrogonofe de frango sem trigo','almoco','especial',true,true,'[{"item":"Peito de frango","qtd":0.15,"unidade":"kg"},{"item":"Creme de leite","qtd":0.05,"unidade":"kg"},{"item":"Molho de tomate","qtd":0.05,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"}]',E'1. Doure o frango em cubos.\n2. Junte molho de tomate e cebola.\n3. Finalize com creme de leite (engrossar com amido de milho se quiser).'),
  ('Carne de panela','almoco','especial',true,true,'[{"item":"Acém","qtd":0.15,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"},{"item":"Alho","qtd":0.005,"unidade":"kg"}]',E'1. Sele a carne.\n2. Cozinhe em panela de pressão com alho, cebola e água até ficar macia.'),
  ('Frango assado com batata','almoco','especial',true,true,'[{"item":"Sobrecoxa de frango","qtd":0.18,"unidade":"kg"},{"item":"Batata","qtd":0.1,"unidade":"kg"},{"item":"Alho","qtd":0.005,"unidade":"kg"}]',E'1. Tempere o frango e a batata.\n2. Asse até dourar.'),
  ('Cubos de boi ao molho','almoco','especial',true,true,'[{"item":"Patinho em cubos","qtd":0.15,"unidade":"kg"},{"item":"Molho de tomate","qtd":0.08,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"}]',E'1. Sele os cubos de boi.\n2. Cozinhe no molho com cebola até amaciar.'),
  ('Frango à parmegiana sem glúten','almoco','especial',true,true,'[{"item":"Filé de frango","qtd":0.15,"unidade":"kg"},{"item":"Farinha sem glúten","qtd":0.02,"unidade":"kg"},{"item":"Molho de tomate","qtd":0.06,"unidade":"kg"},{"item":"Queijo muçarela","qtd":0.04,"unidade":"kg"}]',E'1. Empane o filé com farinha SEM glúten e asse/frite.\n2. Cubra com molho e queijo e gratine.'),
  ('Frango ao curry suave','almoco','especial',true,true,'[{"item":"Peito de frango","qtd":0.15,"unidade":"kg"},{"item":"Leite de coco","qtd":0.04,"unidade":"mL"},{"item":"Cebola","qtd":0.03,"unidade":"kg"}]',E'1. Doure o frango.\n2. Junte cebola, curry e leite de coco; apure o molho.'),
  ('Bife rolê','almoco','especial',true,true,'[{"item":"Bife (coxão mole)","qtd":0.15,"unidade":"kg"},{"item":"Cenoura","qtd":0.03,"unidade":"kg"},{"item":"Cebola","qtd":0.03,"unidade":"kg"}]',E'1. Recheie os bifes com cenoura e cebola e enrole.\n2. Cozinhe no molho até amaciar.')
on conflict do nothing;

-- LEGUMES (1 por dia, sugerido)
insert into receitas (nome, refeicao, categoria, elaborado, henrique_safe, ingredientes, preparo) values
  ('Cenoura cozida','almoco','legume',false,true,'[{"item":"Cenoura","qtd":0.08,"unidade":"kg"}]',null),
  ('Abobrinha refogada','almoco','legume',false,true,'[{"item":"Abobrinha","qtd":0.08,"unidade":"kg"}]',null),
  ('Chuchu refogado','almoco','legume',false,true,'[{"item":"Chuchu","qtd":0.08,"unidade":"kg"}]',null),
  ('Beterraba cozida','almoco','legume',false,true,'[{"item":"Beterraba","qtd":0.08,"unidade":"kg"}]',null),
  ('Vagem refogada','almoco','legume',false,true,'[{"item":"Vagem","qtd":0.07,"unidade":"kg"}]',null),
  ('Abóbora cozida','almoco','legume',false,true,'[{"item":"Abóbora","qtd":0.08,"unidade":"kg"}]',null),
  ('Quiabo refogado','almoco','legume',false,true,'[{"item":"Quiabo","qtd":0.07,"unidade":"kg"}]',null),
  ('Berinjela assada','almoco','legume',false,true,'[{"item":"Berinjela","qtd":0.08,"unidade":"kg"}]',null),
  ('Ervilha','almoco','legume',false,true,'[{"item":"Ervilha","qtd":0.06,"unidade":"kg"}]',null),
  ('Couve-flor cozida','almoco','legume',false,true,'[{"item":"Couve-flor","qtd":0.08,"unidade":"kg"}]',null)
on conflict do nothing;

-- VERDURAS escuras (1 por dia, sugerida)
insert into receitas (nome, refeicao, categoria, elaborado, henrique_safe, ingredientes, preparo) values
  ('Couve refogada','almoco','verdura',false,true,'[{"item":"Couve","qtd":0.05,"unidade":"kg"}]',null),
  ('Espinafre refogado','almoco','verdura',false,true,'[{"item":"Espinafre","qtd":0.05,"unidade":"kg"}]',null),
  ('Acelga refogada','almoco','verdura',false,true,'[{"item":"Acelga","qtd":0.05,"unidade":"kg"}]',null),
  ('Brócolis no vapor','almoco','verdura',false,true,'[{"item":"Brócolis","qtd":0.06,"unidade":"kg"}]',null),
  ('Agrião','almoco','verdura',false,true,'[{"item":"Agrião","qtd":0.04,"unidade":"kg"}]',null),
  ('Rúcula','almoco','verdura',false,true,'[{"item":"Rúcula","qtd":0.04,"unidade":"kg"}]',null)
on conflict do nothing;

-- SALADAS completas (1 por dia, sugerida)
insert into receitas (nome, refeicao, categoria, elaborado, henrique_safe, ingredientes, preparo) values
  ('Salada de alface, tomate e pepino','almoco','salada',false,true,'[{"item":"Alface","qtd":0.05,"unidade":"kg"},{"item":"Tomate","qtd":0.05,"unidade":"kg"},{"item":"Pepino","qtd":0.04,"unidade":"kg"}]',null),
  ('Salada de folhas com cenoura ralada','almoco','salada',false,true,'[{"item":"Alface","qtd":0.05,"unidade":"kg"},{"item":"Cenoura","qtd":0.03,"unidade":"kg"}]',null),
  ('Salada de tomate e palmito','almoco','salada',false,true,'[{"item":"Tomate","qtd":0.06,"unidade":"kg"},{"item":"Palmito","qtd":0.03,"unidade":"kg"}]',null),
  ('Salada verde completa','almoco','salada',false,true,'[{"item":"Alface","qtd":0.04,"unidade":"kg"},{"item":"Rúcula","qtd":0.03,"unidade":"kg"},{"item":"Tomate cereja","qtd":0.04,"unidade":"kg"}]',null),
  ('Salada de beterraba e cenoura','almoco','salada',false,true,'[{"item":"Beterraba","qtd":0.05,"unidade":"kg"},{"item":"Cenoura","qtd":0.04,"unidade":"kg"}]',null)
on conflict do nothing;
