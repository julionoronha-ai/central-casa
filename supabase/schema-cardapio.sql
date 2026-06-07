-- ===== Tabelas do cardápio =====
create table if not exists receitas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  refeicao text not null check (refeicao in ('merenda','cafe','almoco','lanche','jantar')),
  categoria text,
  elaborado boolean not null default false,
  henrique_safe boolean not null default false,
  ingredientes jsonb not null default '[]'::jsonb,
  preparo text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists cardapios (
  id uuid primary key default gen_random_uuid(),
  semana_inicio date not null unique,
  status text not null default 'rascunho' check (status in ('rascunho','aprovado')),
  aprovado_por uuid references users(id),
  aprovado_em timestamptz,
  criado_em timestamptz not null default now()
);

create table if not exists cardapio_itens (
  id uuid primary key default gen_random_uuid(),
  cardapio_id uuid not null references cardapios(id) on delete cascade,
  dia smallint not null check (dia between 1 and 5),
  refeicao text not null check (refeicao in ('merenda','cafe','almoco','lanche','jantar')),
  receita_id uuid references receitas(id),
  eh_variante_henrique boolean not null default false,
  ordem smallint not null default 0
);

create table if not exists feedback_cardapio (
  id uuid primary key default gen_random_uuid(),
  cardapio_id uuid not null references cardapios(id) on delete cascade,
  dia smallint not null,
  refeicao text not null,
  usuario_id uuid not null references users(id),
  gostou boolean,
  porcao text check (porcao in ('muito','bom','pouco')),
  nota text,
  criado_em timestamptz not null default now(),
  unique (cardapio_id, dia, refeicao, usuario_id)
);

create table if not exists despensa_basica (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique
);

-- override de texto por refeição (edição manual antes da aprovação)
create table if not exists cardapio_overrides (
  id uuid primary key default gen_random_uuid(),
  cardapio_id uuid not null references cardapios(id) on delete cascade,
  dia smallint not null,
  refeicao text not null,
  texto text not null,
  unique (cardapio_id, dia, refeicao)
);

-- ===== Alteração no Módulo 1 =====
alter table necessidades add column if not exists origem text not null default 'pessoa';

-- ===== RLS =====
alter table receitas enable row level security;
alter table cardapios enable row level security;
alter table cardapio_itens enable row level security;
alter table feedback_cardapio enable row level security;
alter table despensa_basica enable row level security;
alter table cardapio_overrides enable row level security;

create policy sel_receitas on receitas for select using (true);
create policy ins_receitas on receitas for insert with check (true);
create policy upd_receitas on receitas for update using (true);

create policy sel_cardapios on cardapios for select using (true);
create policy ins_cardapios on cardapios for insert with check (true);
create policy upd_cardapios on cardapios for update using (true);

create policy sel_citens on cardapio_itens for select using (true);
create policy ins_citens on cardapio_itens for insert with check (true);
create policy upd_citens on cardapio_itens for update using (true);
create policy del_citens on cardapio_itens for delete using (true);

create policy sel_fb on feedback_cardapio for select using (true);
create policy ins_fb on feedback_cardapio for insert with check (true);
create policy upd_fb on feedback_cardapio for update using (true);

create policy sel_desp on despensa_basica for select using (true);

create policy sel_ovr on cardapio_overrides for select using (true);
create policy ins_ovr on cardapio_overrides for insert with check (true);
create policy upd_ovr on cardapio_overrides for update using (true);

-- ===== Grants ao anon =====
grant select, insert, update on receitas to anon;
grant select, insert, update on cardapios to anon;
grant select, insert, update, delete on cardapio_itens to anon;
grant select, insert, update on feedback_cardapio to anon;
grant select on despensa_basica to anon;
grant select, insert, update on cardapio_overrides to anon;
