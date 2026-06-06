-- ===== Tabelas =====
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  papel text not null check (papel in ('marcar','comprar')),
  can_reset boolean not null default false,
  token text not null unique,
  whatsapp text
);

create table if not exists secoes (
  id smallint primary key,
  nome text not null,
  emoji text not null,
  ordem smallint not null
);

create table if not exists itens (
  id uuid primary key default gen_random_uuid(),
  secao_id smallint not null references secoes(id),
  nome text not null,
  medida text,
  ativo boolean not null default true,
  ordem smallint not null default 0
);

create table if not exists necessidades (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references itens(id),
  nome_avulso text,
  qtd int not null default 1,
  status text not null default 'pendente' check (status in ('pendente','comprado')),
  marcado_por uuid not null references users(id),
  marcado_em timestamptz not null default now(),
  baixado_por uuid references users(id),
  baixado_em timestamptz
);
-- no máximo UMA necessidade pendente por item de catálogo
create unique index if not exists uniq_pendente_item
  on necessidades(item_id) where status = 'pendente' and item_id is not null;

create table if not exists historico (
  id uuid primary key default gen_random_uuid(),
  item_id uuid,
  nome_avulso text,
  qtd int,
  status text,
  marcado_por uuid,
  marcado_em timestamptz,
  baixado_por uuid,
  baixado_em timestamptz,
  ciclo_fechado_em timestamptz not null default now()
);

-- ===== RPCs =====
-- resolve usuário pelo token, sem expor a tabela inteira
create or replace function get_user_by_token(p_token text)
returns table(id uuid, nome text, papel text, can_reset boolean)
language sql security definer set search_path = public as $$
  select id, nome, papel, can_reset from users where token = p_token;
$$;

-- zerar ciclo: só quem tem can_reset
create or replace function reset_ciclo(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from users where id = p_user and can_reset) then
    raise exception 'sem permissão para zerar';
  end if;
  insert into historico (item_id,nome_avulso,qtd,status,marcado_por,marcado_em,baixado_por,baixado_em)
    select item_id,nome_avulso,qtd,status,marcado_por,marcado_em,baixado_por,baixado_em from necessidades;
  delete from necessidades;
end;
$$;

-- ===== RLS =====
alter table users enable row level security;          -- sem policy de select: anon não lê
alter table secoes enable row level security;
alter table itens enable row level security;
alter table necessidades enable row level security;
alter table historico enable row level security;      -- sem policy: anon não lê

create policy sel_secoes on secoes for select using (true);
create policy sel_itens  on itens  for select using (true);
create policy ins_itens  on itens  for insert with check (true);   -- "adicionar item novo"
create policy upd_itens  on itens  for update using (true);        -- renomear / desativar (Ajustes)

create policy sel_nec on necessidades for select using (true);
create policy ins_nec on necessidades for insert with check (true);
create policy upd_nec on necessidades for update using (true);
create policy del_nec on necessidades for delete using (true);     -- desmarcar

create or replace function nomes_usuarios()
returns table(id uuid, nome text)
language sql security definer set search_path = public as $$
  select id, nome from users;
$$;

-- ===== Grants para o papel anon =====
-- Necessário porque tabelas criadas via SQL direto (não pelo dashboard) não
-- recebem GRANTs automáticos. RLS controla as LINHAS; o GRANT libera a TABELA.
grant usage on schema public to anon;
grant select on secoes to anon;
grant select, insert, update on itens to anon;                -- insert = "adicionar"; update = renomear/desativar
grant select, insert, update, delete on necessidades to anon; -- marcar/baixa/qtd/desmarcar
grant execute on function get_user_by_token(text) to anon;
grant execute on function reset_ciclo(uuid) to anon;
grant execute on function nomes_usuarios() to anon;
-- users e historico permanecem SEM grant ao anon (acesso só via RPC security definer).
