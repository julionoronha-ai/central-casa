insert into secoes (id, nome, emoji, ordem) values
  (1,'Legumes & Horta','🥬',1),
  (2,'Frutas','🍎',2),
  (3,'Grãos & Farinha','🌾',3),
  (4,'Carne','🥩',4),
  (5,'Lácteos','🧀',5),
  (6,'Doces','🍫',6),
  (7,'Outros','🛒',7),
  (8,'Limpeza','🧴',8),
  (9,'Higiene','🪥',9),
  (10,'Bebê','🍼',10)
on conflict (id) do nothing;

-- usuários com tokens aleatórios (12 bytes hex). Anote os tokens gerados!
insert into users (nome, papel, can_reset, token) values
  ('Júlio','comprar', true,  encode(gen_random_bytes(12),'hex')),
  ('Lilian','comprar', false, encode(gen_random_bytes(12),'hex')),
  ('Ester','marcar',  false, encode(gen_random_bytes(12),'hex')),
  ('Aline','marcar',  false, encode(gen_random_bytes(12),'hex'))
on conflict (token) do nothing;
