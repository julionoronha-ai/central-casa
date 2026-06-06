# Lista de Compras Colaborativa — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir uma página web colaborativa (grátis) onde Ester, Aline, Lilian e Júlio marcam, por seção, o que está faltando em casa, com modo compras, sincronização em tempo real e resumo no WhatsApp/e-mail.

**Architecture:** Frontend estático (HTML/CSS/JS puro) no GitHub Pages + Supabase (Postgres + REST + Realtime) como banco. Lógica pura isolada e testável (Vitest); fluxos validados com Playwright; entrega de resumo por script Node lido por uma sessão/rotina do Claude.

**Tech Stack:** HTML/CSS/JS vanilla, `@supabase/supabase-js` (CDN + npm para testes), Vitest, Playwright, Node 18+, GitHub Pages, Supabase.

**Referências:** spec em `docs/superpowers/specs/2026-06-06-lista-compras-design.md`; catálogo em `docs/catalogo-semente.md`.

---

## Estrutura de arquivos

```
central-casa/
  index.html                  # shell do app (carrega supabase-js via CDN)
  css/styles.css              # design system aprovado (lilás/Apple-clean)
  js/config.js                # URL + anon key do Supabase (preencher)
  js/supabaseClient.js        # inicializa o client
  js/logic.js                 # funções PURAS (testáveis, sem rede)
  js/data.js                  # camada de dados (CRUD + realtime)
  js/ui.js                    # render das telas + eventos
  js/app.js                   # entrada: resolve usuário pelo token e monta
  supabase/schema.sql         # tabelas + RLS + RPCs
  supabase/seed-base.sql      # seções + usuários (tokens)
  supabase/seed-itens.sql     # GERADO a partir de docs/catalogo-semente.md
  scripts/gerar-seed.mjs      # parser do catálogo -> seed-itens.sql
  scripts/gerar-resumo.mjs    # consulta pendências e imprime texto+HTML do resumo
  tests/logic.test.js         # unit (Vitest)
  tests/e2e/marcar.spec.js    # E2E (Playwright)
  tests/e2e/compras.spec.js   # E2E (Playwright)
  package.json                # tooling
  playwright.config.js
  .env.test                   # credenciais de teste (gitignored)
```

Responsabilidades: `logic.js` não toca em rede (fácil de testar); `data.js` é a única que fala com Supabase; `ui.js` só renderiza/escuta; `app.js` orquestra. Arquivos pequenos e focados.

---

## Task 1: Inicializar projeto Node e tooling

**Files:**
- Create: `central-casa/package.json`
- Create: `central-casa/playwright.config.js`
- Modify: `central-casa/.gitignore`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "central-casa-lista",
  "version": "0.1.0",
  "type": "module",
  "private": true,
  "scripts": {
    "serve": "npx --yes serve -l 5173 .",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "seed": "node scripts/gerar-seed.mjs"
  },
  "devDependencies": {
    "@playwright/test": "^1.45.0",
    "vitest": "^2.0.0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

- [ ] **Step 2: Criar `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: { baseURL: 'http://localhost:5173', headless: true },
  webServer: {
    command: 'npx --yes serve -l 5173 .',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000
  }
})
```

- [ ] **Step 3: Atualizar `.gitignore`**

Acrescentar ao arquivo existente:

```
node_modules/
.env.test
test-results/
playwright-report/
```

- [ ] **Step 4: Instalar dependências**

Run: `cd central-casa && npm install && npx playwright install chromium`
Expected: instala sem erro; cria `node_modules/`.

- [ ] **Step 5: Commit**

```bash
cd central-casa
git add package.json playwright.config.js .gitignore
git commit -m "chore: tooling (vitest, playwright, serve)"
```

---

## Task 2: Schema do Supabase (tabelas + RLS + RPCs)

**Files:**
- Create: `central-casa/supabase/schema.sql`

> Premissa de segurança (do spec §3): dado doméstico não sensível; o token do link é "semi-secreto". Não expomos a tabela `users` ao anon — a resolução do usuário passa por RPC que devolve só campos seguros.

- [ ] **Step 1: Escrever `supabase/schema.sql`**

```sql
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

create policy sel_nec on necessidades for select using (true);
create policy ins_nec on necessidades for insert with check (true);
create policy upd_nec on necessidades for update using (true);
create policy del_nec on necessidades for delete using (true);     -- desmarcar
```

- [ ] **Step 2: Aplicar no Supabase**

Criar projeto grátis em supabase.com (anotar Project URL + chave `anon`). Abrir **SQL Editor**, colar o conteúdo de `schema.sql`, executar.
Expected: "Success. No rows returned". Em **Table editor** aparecem as 5 tabelas.

- [ ] **Step 3: Ativar Realtime na tabela `necessidades`**

Em Supabase → Database → Replication (ou Realtime) → habilitar a publicação para `necessidades`.
Expected: `necessidades` listada como habilitada para Realtime.

- [ ] **Step 4: Commit**

```bash
cd central-casa
git add supabase/schema.sql
git commit -m "feat(db): schema, RLS e RPCs do Supabase"
```

---

## Task 3: Seed das seções e usuários

**Files:**
- Create: `central-casa/supabase/seed-base.sql`

- [ ] **Step 1: Escrever `supabase/seed-base.sql`**

```sql
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
```

- [ ] **Step 2: Aplicar e capturar tokens**

No SQL Editor: rodar `seed-base.sql`. Depois rodar `select nome, token from users order by nome;` e **anotar** os 4 tokens (entram nos links da Task 16).
Expected: 10 seções e 4 usuários criados.

- [ ] **Step 3: Commit**

```bash
cd central-casa
git add supabase/seed-base.sql
git commit -m "feat(db): seed de seções e usuários"
```

---

## Task 4: Gerar seed de itens a partir do catálogo (script)

**Files:**
- Create: `central-casa/scripts/gerar-seed.mjs`
- Create (gerado): `central-casa/supabase/seed-itens.sql`

> DRY: em vez de redigitar ~110 itens, geramos o SQL a partir de `docs/catalogo-semente.md`.

- [ ] **Step 1: Escrever `scripts/gerar-seed.mjs`**

```js
import { readFileSync, writeFileSync } from 'node:fs'

const SECOES = {
  'Legumes-Horta':1, 'Legumes & Horta':1, 'Frutas':2,
  'Grãos / Farinha':3, 'Grãos & Farinha':3, 'Carne':4, 'Lácteos':5,
  'Doces':6, 'Outros':7, 'Limpeza':8, 'Higiene':9, 'Bebê':10
}
const md = readFileSync(new URL('../docs/catalogo-semente.md', import.meta.url), 'utf8')
const linhas = md.split('\n')
let secao = null, ordem = 0
const rows = []
for (const l of linhas) {
  const h = l.match(/^##\s+(.+?)\s*$/)
  if (h) { secao = SECOES[h[1].trim()] ?? null; ordem = 0; continue }
  const m = l.match(/^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/)
  if (!secao || !m) continue
  const nome = m[1].trim(), medida = m[2].trim()
  if (nome === 'Item' || nome.startsWith('---')) continue   // cabeçalho/divisória
  ordem++
  const med = (medida === '—' || medida === '') ? 'null' : `'${medida.replace(/'/g, "''")}'`
  rows.push(`  (${secao}, '${nome.replace(/'/g, "''")}', ${med}, ${ordem})`)
}
const sql = `insert into itens (secao_id, nome, medida, ordem) values\n${rows.join(',\n')}\non conflict do nothing;\n`
writeFileSync(new URL('../supabase/seed-itens.sql', import.meta.url), sql)
console.log(`Gerados ${rows.length} itens em supabase/seed-itens.sql`)
```

- [ ] **Step 2: Rodar o gerador**

Run: `cd central-casa && node scripts/gerar-seed.mjs`
Expected: imprime "Gerados N itens…" (N ≈ 100). Confere `supabase/seed-itens.sql`: começa com `insert into itens` e tem 1 linha por item.

- [ ] **Step 3: Aplicar no Supabase**

No SQL Editor, colar e rodar `seed-itens.sql`.
Expected: `select count(*) from itens;` retorna ~100.

- [ ] **Step 4: Commit**

```bash
cd central-casa
git add scripts/gerar-seed.mjs supabase/seed-itens.sql
git commit -m "feat(db): gerador de seed de itens a partir do catálogo"
```

---

## Task 5: Lógica pura — agrupar e anotar itens (TDD)

**Files:**
- Create: `central-casa/js/logic.js`
- Test: `central-casa/tests/logic.test.js`

- [ ] **Step 1: Escrever o teste que falha**

```js
import { describe, it, expect } from 'vitest'
import { groupBySection, annotate } from '../js/logic.js'

const secoes = [
  { id: 1, nome: 'Legumes & Horta', emoji: '🥬', ordem: 1 },
  { id: 8, nome: 'Limpeza', emoji: '🧴', ordem: 8 }
]
const itens = [
  { id: 'a', secao_id: 1, nome: 'Alface', medida: '1un', ordem: 1 },
  { id: 'b', secao_id: 1, nome: 'Cebola', medida: '1kg', ordem: 2 },
  { id: 'c', secao_id: 8, nome: 'Detergente', medida: null, ordem: 1 }
]

describe('groupBySection', () => {
  it('agrupa itens por seção, na ordem das seções', () => {
    const g = groupBySection(itens, secoes)
    expect(g.map(s => s.nome)).toEqual(['Legumes & Horta', 'Limpeza'])
    expect(g[0].itens.map(i => i.nome)).toEqual(['Alface', 'Cebola'])
  })
})

describe('annotate', () => {
  it('marca itens com necessidade pendente e qtd', () => {
    const nec = [{ item_id: 'a', qtd: 2, status: 'pendente', marcado_por: 'u1' }]
    const out = annotate(itens, nec)
    const alface = out.find(i => i.id === 'a')
    expect(alface.marcado).toBe(true)
    expect(alface.qtd).toBe(2)
    expect(out.find(i => i.id === 'b').marcado).toBe(false)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd central-casa && npm test -- tests/logic.test.js`
Expected: FAIL ("does not provide an export named 'groupBySection'").

- [ ] **Step 3: Implementar em `js/logic.js`**

```js
// Funções puras — sem rede, sem DOM. Fáceis de testar.

export function groupBySection(itens, secoes) {
  const ordenadas = [...secoes].sort((a, b) => a.ordem - b.ordem)
  return ordenadas.map(s => ({
    ...s,
    itens: itens
      .filter(i => i.secao_id === s.id)
      .sort((a, b) => (a.ordem - b.ordem) || a.nome.localeCompare(b.nome))
  })).filter(s => s.itens.length > 0)
}

export function annotate(itens, necessidades) {
  const byItem = new Map()
  for (const n of necessidades) {
    if (n.item_id) byItem.set(n.item_id, n)
  }
  return itens.map(i => {
    const n = byItem.get(i.id)
    return { ...i, marcado: !!n, qtd: n ? n.qtd : null, necId: n ? n.id : null }
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd central-casa && npm test -- tests/logic.test.js`
Expected: PASS (2 testes).

- [ ] **Step 5: Commit**

```bash
cd central-casa
git add js/logic.js tests/logic.test.js
git commit -m "feat(logic): groupBySection e annotate (TDD)"
```

---

## Task 6: Lógica pura — texto e HTML do resumo (TDD)

**Files:**
- Modify: `central-casa/js/logic.js`
- Modify: `central-casa/tests/logic.test.js`

- [ ] **Step 1: Acrescentar testes em `tests/logic.test.js`**

```js
import { buildResumoText, buildResumoHtml } from '../js/logic.js'

const pendentes = [
  { nome: 'Alface', secao: 'Legumes & Horta', emoji: '🥬', qtd: 2, por: 'Ester' },
  { nome: 'Cebola', secao: 'Legumes & Horta', emoji: '🥬', qtd: 1, por: 'Ester' },
  { nome: 'Detergente', secao: 'Limpeza', emoji: '🧴', qtd: 3, por: 'Aline' }
]

describe('buildResumoText', () => {
  it('monta texto por seção com quantidade', () => {
    const t = buildResumoText(pendentes)
    expect(t).toContain('🥬 Legumes & Horta')
    expect(t).toContain('• Alface ×2')
    expect(t).toContain('🧴 Limpeza')
    expect(t).toContain('• Detergente ×3')
  })
  it('mensagem vazia quando não há pendências', () => {
    expect(buildResumoText([])).toContain('Nenhum item pendente')
  })
})

describe('buildResumoHtml', () => {
  it('gera HTML com as seções', () => {
    const h = buildResumoHtml(pendentes)
    expect(h).toContain('<h3')
    expect(h).toContain('Alface')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd central-casa && npm test -- tests/logic.test.js`
Expected: FAIL ("does not provide an export named 'buildResumoText'").

- [ ] **Step 3: Acrescentar em `js/logic.js`**

```js
function porSecao(pendentes) {
  const map = new Map()
  for (const p of pendentes) {
    const k = `${p.emoji} ${p.secao}`
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(p)
  }
  return map
}

export function buildResumoText(pendentes) {
  if (!pendentes.length) return '🛒 Lista de Compras\n\nNenhum item pendente. 🎉'
  let out = '🛒 Lista de Compras — pendências\n'
  for (const [secao, itens] of porSecao(pendentes)) {
    out += `\n${secao}\n`
    for (const i of itens) out += `• ${i.nome}${i.qtd > 1 ? ` ×${i.qtd}` : ''}\n`
  }
  return out.trimEnd()
}

export function buildResumoHtml(pendentes) {
  if (!pendentes.length) return '<p>Nenhum item pendente. 🎉</p>'
  let out = '<div style="font-family:Arial,sans-serif">'
  for (const [secao, itens] of porSecao(pendentes)) {
    out += `<h3 style="color:#5E4FA6;margin:16px 0 6px">${secao}</h3><ul style="margin:0;padding-left:18px">`
    for (const i of itens) out += `<li>${i.nome}${i.qtd > 1 ? ` ×${i.qtd}` : ''}</li>`
    out += '</ul>'
  }
  return out + '</div>'
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd central-casa && npm test -- tests/logic.test.js`
Expected: PASS (todos os testes, incl. os da Task 5).

- [ ] **Step 5: Commit**

```bash
cd central-casa
git add js/logic.js tests/logic.test.js
git commit -m "feat(logic): resumo em texto e HTML (TDD)"
```

---

## Task 7: Config e client do Supabase

**Files:**
- Create: `central-casa/js/config.js`
- Create: `central-casa/js/supabaseClient.js`

- [ ] **Step 1: Criar `js/config.js`**

> Preencher com os valores reais do projeto Supabase (URL + chave `anon`). A chave `anon` é pública por design; pode ir ao repositório.

```js
export const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co'   // <- colar URL do projeto
export const SUPABASE_ANON_KEY = 'COLE_A_CHAVE_ANON_AQUI'        // <- colar chave anon
```

- [ ] **Step 2: Criar `js/supabaseClient.js`**

```js
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js'
// supabase-js é carregado via CDN no index.html e exposto como window.supabase
export const db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
```

- [ ] **Step 3: Commit**

```bash
cd central-casa
git add js/config.js js/supabaseClient.js
git commit -m "feat: config e client do Supabase"
```

---

## Task 8: Camada de dados (CRUD + realtime)

**Files:**
- Create: `central-casa/js/data.js`

- [ ] **Step 1: Escrever `js/data.js`**

```js
import { db } from './supabaseClient.js'

export async function resolveUser(token) {
  const { data, error } = await db.rpc('get_user_by_token', { p_token: token })
  if (error) throw error
  return data && data[0] ? data[0] : null
}

export async function carregarCatalogo() {
  const [{ data: secoes }, { data: itens }] = await Promise.all([
    db.from('secoes').select('*').order('ordem'),
    db.from('itens').select('*').eq('ativo', true)
  ])
  return { secoes: secoes ?? [], itens: itens ?? [] }
}

export async function carregarNecessidades() {
  const { data, error } = await db
    .from('necessidades')
    .select('id,item_id,nome_avulso,qtd,status,marcado_por,baixado_por')
  if (error) throw error
  return data ?? []
}

export async function marcar(itemId, userId, qtd = 1) {
  return db.from('necessidades').insert({ item_id: itemId, marcado_por: userId, qtd, status: 'pendente' })
}

export async function ajustarQtd(necId, qtd) {
  return db.from('necessidades').update({ qtd }).eq('id', necId)
}

export async function desmarcar(necId) {
  return db.from('necessidades').delete().eq('id', necId)
}

export async function adicionarItem(secaoId, nome, userId, qtd = 1) {
  const { data, error } = await db.from('itens').insert({ secao_id: secaoId, nome, ativo: true }).select().single()
  if (error) throw error
  await marcar(data.id, userId, qtd)
  return data
}

export async function darBaixa(necId, userId) {
  return db.from('necessidades').update({
    status: 'comprado', baixado_por: userId, baixado_em: new Date().toISOString()
  }).eq('id', necId)
}

export async function zerarCiclo(userId) {
  return db.rpc('reset_ciclo', { p_user: userId })
}

export function ouvirMudancas(callback) {
  return db.channel('necessidades-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'necessidades' }, callback)
    .subscribe()
}
```

- [ ] **Step 2: Verificação rápida (lint mental + import)**

Run: `cd central-casa && node --check js/data.js`
Expected: sem erro de sintaxe.

- [ ] **Step 3: Commit**

```bash
cd central-casa
git add js/data.js
git commit -m "feat(data): CRUD de necessidades + realtime"
```

---

## Task 9: Shell HTML + design system (CSS aprovado)

**Files:**
- Create: `central-casa/index.html`
- Create: `central-casa/css/styles.css`

- [ ] **Step 1: Criar `index.html`**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Casa · Lista de Compras</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
</head>
<body>
  <header class="topbar" id="topbar"></header>
  <main id="app"><div class="loading">carregando…</div></main>
  <script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Criar `css/styles.css`** (tokens e componentes do mockup aprovado)

```css
:root{
  --bg:#F6F4FC; --surface:#FFFFFF; --ink:#26222E; --muted:#938EA3; --line:#EFECF5;
  --lilac:#8B7AD6; --lilac-deep:#5E4FA6; --lilac-soft:#EEE9FB; --lilac-softer:#F5F2FD;
  --sage:#6FB99A; --sage-soft:#E8F4EE;
  --shadow:0 10px 30px -12px rgba(75,55,140,.28); --shadow-sm:0 4px 14px -6px rgba(75,55,140,.22);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0}
body{font-family:'Hanken Grotesk',sans-serif;color:var(--ink);min-height:100vh;
  background:radial-gradient(1200px 600px at 12% -10%,#E7DEFB 0,transparent 55%),
    radial-gradient(900px 500px at 95% 8%,#E3ECFA 0,transparent 50%),var(--bg);
  padding-bottom:40px}
.loading{text-align:center;color:var(--muted);padding:80px 0}
.topbar{position:sticky;top:0;z-index:5;background:rgba(255,255,255,.72);backdrop-filter:blur(14px);
  border-bottom:1px solid var(--line);padding:max(18px,env(safe-area-inset-top)) 18px 14px}
.hello{display:flex;align-items:center;justify-content:space-between;max-width:560px;margin:0 auto}
.hello .who{font-family:'Fraunces',serif;font-size:22px;font-weight:500}
.hello .sub{color:var(--muted);font-size:13px;margin-top:2px}
.ava{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:600;background:linear-gradient(135deg,#C9BCF2,#8B7AD6);box-shadow:var(--shadow-sm)}
.toggle{display:flex;gap:6px;background:var(--lilac-softer);border-radius:100px;padding:4px;max-width:560px;margin:12px auto 0}
.toggle button{flex:1;border:0;background:transparent;font-family:inherit;font-weight:600;font-size:13px;
  color:var(--muted);padding:8px;border-radius:100px;cursor:pointer}
.toggle button[aria-selected="true"]{background:#fff;color:var(--lilac-deep);box-shadow:var(--shadow-sm)}
.search{display:block;width:calc(100% - 36px);max-width:524px;margin:12px auto 0;background:#fff;border:1px solid var(--line);
  border-radius:14px;padding:12px 14px;font:inherit;font-size:15px;box-shadow:var(--shadow-sm)}
main{max-width:560px;margin:0 auto;padding:6px 18px}
.sec{margin-top:18px}
.sec-h{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;margin:6px 4px 9px}
.sec-h .em{width:28px;height:28px;border-radius:9px;background:var(--lilac-softer);display:flex;align-items:center;justify-content:center}
.sec-h .cnt{margin-left:auto;color:var(--muted);font-weight:500;font-size:12px}
.card{background:#fff;border-radius:18px;box-shadow:var(--shadow-sm);overflow:hidden}
.row{display:flex;align-items:center;gap:12px;padding:14px 15px;border-bottom:1px solid var(--line);min-height:52px}
.row:last-child{border-bottom:0}
.check{width:24px;height:24px;border-radius:8px;border:2px solid #DBD5EC;flex:none;display:flex;
  align-items:center;justify-content:center;color:transparent;font-size:14px;cursor:pointer;transition:.18s}
.row.on .check{background:linear-gradient(135deg,var(--lilac),var(--lilac-deep));border-color:transparent;color:#fff}
.row .nm{font-size:15px;font-weight:500}.row.on .nm{font-weight:600}
.row .md{color:var(--muted);font-size:12px;font-weight:500}
.row .right{margin-left:auto;display:flex;align-items:center;gap:8px}
.qty{display:flex;align-items:center;background:var(--lilac-soft);border-radius:10px}
.qty b{font-size:13px;font-weight:600;color:var(--lilac-deep);min-width:22px;text-align:center}
.qty button{border:0;background:transparent;color:var(--lilac-deep);font-size:16px;padding:6px 10px;cursor:pointer}
.by{font-size:11px;color:var(--muted);background:#F3F1FA;padding:3px 9px;border-radius:100px;font-weight:500}
.row.bought .nm{text-decoration:line-through;color:#C3BED2}
.row.bought .check{background:var(--sage-soft);border-color:transparent;color:var(--sage)}
.addbtn{margin:16px 4px;width:calc(100% - 8px);padding:14px;border-radius:14px;border:1.5px dashed #D5CEEC;
  background:#fff;color:var(--lilac-deep);font-weight:600;font:inherit;cursor:pointer}
.pillbar{display:flex;align-items:center;justify-content:space-between;max-width:560px;margin:10px auto 0}
.pillbar .n{font-weight:700}.pillbar .n span{color:var(--muted);font-weight:500}
.clear{font-size:12px;font-weight:600;color:var(--lilac-deep);background:var(--lilac-soft);
  padding:8px 14px;border-radius:100px;border:0;cursor:pointer}
.foot{text-align:center;color:#C2BCD2;font-size:11px;padding:14px 0}
.erro{max-width:420px;margin:80px auto;text-align:center;color:var(--muted)}
.toast{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);background:#26222E;color:#fff;
  padding:10px 16px;border-radius:100px;font-size:13px;opacity:0;transition:.25s;pointer-events:none}
.toast.show{opacity:.95}
```

- [ ] **Step 3: Verificar no navegador**

Run: `cd central-casa && npm run serve` e abrir `http://localhost:5173`.
Expected: fundo lavanda, fontes carregadas, "carregando…" (ainda sem dados — esperado).

- [ ] **Step 4: Commit**

```bash
cd central-casa
git add index.html css/styles.css
git commit -m "feat(ui): shell HTML e design system aprovado"
```

---

## Task 10: Render da tela "Marcar" + eventos

**Files:**
- Create: `central-casa/js/ui.js`

- [ ] **Step 1: Escrever a parte "marcar" em `js/ui.js`**

```js
import { groupBySection, annotate } from './logic.js'
import * as data from './data.js'

let estado = { user: null, secoes: [], itens: [], necessidades: [], modo: 'marcar', busca: '' }

export function setEstado(patch) { Object.assign(estado, patch) }
export function getEstado() { return estado }

export function toast(msg) {
  let t = document.querySelector('.toast')
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t) }
  t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1600)
}

function nomesUsuarios() {
  const m = new Map(); for (const u of estado._users ?? []) m.set(u.id, u.nome); return m
}

export function renderTopbar() {
  const tb = document.getElementById('topbar')
  const u = estado.user
  const podeComprar = u.papel === 'comprar'
  tb.innerHTML = `
    <div class="hello">
      <div><div class="who">${estado.modo === 'compras' ? 'Compras' : 'Oi, ' + u.nome}</div>
      <div class="sub">${estado.modo === 'compras' ? 'toque pra dar baixa' : 'marque o que está faltando'}</div></div>
      <div class="ava">${u.nome[0]}</div>
    </div>
    ${podeComprar ? `<div class="toggle" role="tablist">
      <button role="tab" data-modo="marcar" aria-selected="${estado.modo === 'marcar'}">Marcar</button>
      <button role="tab" data-modo="compras" aria-selected="${estado.modo === 'compras'}">Compras</button>
    </div>` : ''}
    ${estado.modo === 'marcar' ? `<input class="search" id="busca" placeholder="🔍 buscar item…" value="${estado.busca}">` : ''}`
  tb.querySelectorAll('[data-modo]').forEach(b =>
    b.onclick = () => { setEstado({ modo: b.dataset.modo }); renderTopbar(); render() })
  const busca = document.getElementById('busca')
  if (busca) busca.oninput = e => { estado.busca = e.target.value; render() }
}

function rowMarcar(item) {
  const on = item.marcado
  return `<div class="row ${on ? 'on' : ''}" data-item="${item.id}" data-nec="${item.necId ?? ''}">
    <div class="check js-toggle">${on ? '✓' : ''}</div>
    <div><div class="nm">${item.nome}</div>${item.medida ? `<div class="md">${item.medida}</div>` : ''}</div>
    <div class="right">${on
      ? `<div class="qty"><button class="js-dec">−</button><b>${item.qtd ?? 1}</b><button class="js-inc">+</button></div>`
      : `<span class="md">qtd</span>`}</div>
  </div>`
}

export function renderMarcar() {
  const app = document.getElementById('app')
  const anotados = annotate(estado.itens, estado.necessidades)
  const filtro = estado.busca.trim().toLowerCase()
  const visiveis = filtro ? anotados.filter(i => i.nome.toLowerCase().includes(filtro)) : anotados
  const grupos = groupBySection(visiveis, estado.secoes)
  app.innerHTML = grupos.map(s => `
    <section class="sec"><div class="sec-h"><span class="em">${s.emoji}</span> ${s.nome}
      <span class="cnt">${s.itens.filter(i => i.marcado).length} marcados</span></div>
      <div class="card">${s.itens.map(rowMarcar).join('')}</div></section>`).join('')
    + `<button class="addbtn" id="add">＋ adicionar item novo</button>
       <div class="foot">salva sozinho · sincroniza em tempo real</div>`
  wireMarcar()
}

function wireMarcar() {
  const app = document.getElementById('app')
  app.querySelectorAll('.row').forEach(row => {
    const itemId = row.dataset.item, necId = row.dataset.nec
    row.querySelector('.js-toggle').onclick = async () => {
      if (necId) { await data.desmarcar(necId) } else { await data.marcar(itemId, estado.user.id, 1) }
    }
    const dec = row.querySelector('.js-dec'), inc = row.querySelector('.js-inc')
    if (inc) inc.onclick = async () => { const q = +row.querySelector('b').textContent + 1; await data.ajustarQtd(necId, q) }
    if (dec) dec.onclick = async () => {
      const q = +row.querySelector('b').textContent - 1
      if (q <= 0) await data.desmarcar(necId); else await data.ajustarQtd(necId, q)
    }
  })
  document.getElementById('add').onclick = abrirAdicionar
}

async function abrirAdicionar() {
  const nome = prompt('Nome do item novo:')
  if (!nome) return
  const lista = estado.secoes.map((s, i) => `${i + 1}. ${s.nome}`).join('\n')
  const escolha = +prompt(`Seção?\n${lista}`)
  const secao = estado.secoes[escolha - 1]
  if (!secao) return toast('Seção inválida')
  await data.adicionarItem(secao.id, nome.trim(), estado.user.id, 1)
  toast('Item adicionado')
}
```

- [ ] **Step 2: Verificar sintaxe**

Run: `cd central-casa && node --check js/ui.js`
Expected: sem erro. (A função `render()` e a parte "compras" entram na Task 11.)

- [ ] **Step 3: Commit**

```bash
cd central-casa
git add js/ui.js
git commit -m "feat(ui): tela marcar + eventos"
```

---

## Task 11: Render do "Modo compras" + render() despachante

**Files:**
- Modify: `central-casa/js/ui.js`

- [ ] **Step 1: Acrescentar em `js/ui.js` (modo compras + render)**

```js
function rowCompras(nec, nomes, itensById) {
  const it = nec.item_id ? itensById.get(nec.item_id) : null
  const nome = it ? it.nome : (nec.nome_avulso ?? 'item')
  const comprado = nec.status === 'comprado'
  const etiqueta = comprado ? 'comprei' : (nomes.get(nec.marcado_por) ?? '—')
  return `<div class="row ${comprado ? 'bought' : ''}" data-nec="${nec.id}">
    <div class="check js-baixa">${comprado ? '✓' : ''}</div>
    <div><div class="nm">${nome}${nec.qtd > 1 ? ` <span class="md">×${nec.qtd}</span>` : ''}</div></div>
    <div class="right"><span class="by">${etiqueta}</span></div></div>`
}

export function renderCompras() {
  const app = document.getElementById('app'), tb = document.getElementById('topbar')
  const itensById = new Map(estado.itens.map(i => [i.id, i]))
  const nomes = nomesUsuarios()
  const secoesById = new Map(estado.secoes.map(s => [s.id, s]))
  const pendentesCount = estado.necessidades.filter(n => n.status === 'pendente').length

  // barra de pendências + botão zerar (só Júlio)
  const bar = document.createElement('div'); bar.className = 'pillbar'
  bar.innerHTML = `<div class="n">${pendentesCount} <span>itens pendentes</span></div>
    ${estado.user.can_reset ? `<button class="clear" id="zerar">limpar · nova semana</button>` : ''}`
  tb.appendChild(bar)
  if (estado.user.can_reset) document.getElementById('zerar').onclick = async () => {
    if (confirm('Zerar a lista e começar nova semana?')) { await data.zerarCiclo(estado.user.id); toast('Nova semana iniciada') }
  }

  // agrupa necessidades por seção do item
  const porSecao = new Map()
  for (const n of estado.necessidades) {
    const sid = n.item_id ? (itensById.get(n.item_id)?.secao_id ?? 7) : 7
    if (!porSecao.has(sid)) porSecao.set(sid, [])
    porSecao.get(sid).push(n)
  }
  const secoesOrd = [...estado.secoes].sort((a, b) => a.ordem - b.ordem)
  app.innerHTML = secoesOrd.filter(s => porSecao.has(s.id)).map(s => {
    const linhas = porSecao.get(s.id).map(n => rowCompras(n, nomes, itensById)).join('')
    return `<section class="sec"><div class="sec-h"><span class="em">${s.emoji}</span> ${s.nome}
      <span class="cnt">${porSecao.get(s.id).filter(n => n.status === 'pendente').length}</span></div>
      <div class="card">${linhas}</div></section>`
  }).join('') + `<div class="foot">"comprei" some da lista · só Júlio pode zerar</div>`

  app.querySelectorAll('.row').forEach(row => {
    row.querySelector('.js-baixa').onclick = async () => { await data.darBaixa(row.dataset.nec, estado.user.id) }
  })
}

export function render() {
  if (estado.modo === 'compras') renderCompras(); else renderMarcar()
}
```

- [ ] **Step 2: Verificar sintaxe**

Run: `cd central-casa && node --check js/ui.js`
Expected: sem erro.

- [ ] **Step 3: Commit**

```bash
cd central-casa
git add js/ui.js
git commit -m "feat(ui): modo compras + despachante render()"
```

---

## Task 12: Entrada do app (token, carga, realtime, erros)

**Files:**
- Create: `central-casa/js/app.js`

- [ ] **Step 1: Escrever `js/app.js`**

```js
import * as data from './data.js'
import { db } from './supabaseClient.js'
import { setEstado, renderTopbar, render, toast } from './ui.js'

function erroFatal(msg) {
  document.getElementById('topbar').innerHTML = ''
  document.getElementById('app').innerHTML = `<div class="erro"><h2>Ops…</h2><p>${msg}</p></div>`
}

async function main() {
  const token = new URLSearchParams(location.search).get('u')
  if (!token) return erroFatal('Link inválido. Peça um novo ao Júlio.')

  let user
  try { user = await data.resolveUser(token) } catch { return erroFatal('Sem conexão. Tente novamente.') }
  if (!user) return erroFatal('Link inválido. Peça um novo ao Júlio.')

  // lista de nomes p/ etiquetas do modo compras (uso pontual da tabela users via RPC seria ideal;
  // aqui carregamos nomes mínimos derivando das necessidades já marcadas — simplificado:
  setEstado({ user, modo: 'marcar', _users: [user] })

  async function recarregar() {
    const { secoes, itens } = await data.carregarCatalogo()
    const necessidades = await data.carregarNecessidades()
    setEstado({ secoes, itens, necessidades })
    render()
  }

  try {
    await recarregar()
    renderTopbar()
  } catch (e) {
    return erroFatal('Não consegui carregar a lista. Tente recarregar.')
  }

  data.ouvirMudancas(async () => { try { await recarregar() } catch {} })
  window.addEventListener('online', () => toast('Conectado de novo'))
  window.addEventListener('offline', () => toast('Sem internet — vou tentar salvar quando voltar'))
}

main()
```

> Nota sobre etiquetas "quem marcou": o modo compras mostra o nome de quem marcou. Como o anon não lê a tabela `users` inteira (segurança), na Task 13 adicionamos uma RPC `nomes_usuarios()` que devolve só `id,nome` (sem token) para preencher as etiquetas.

- [ ] **Step 2: Verificar sintaxe**

Run: `cd central-casa && node --check js/app.js`
Expected: sem erro.

- [ ] **Step 3: Commit**

```bash
cd central-casa
git add js/app.js
git commit -m "feat: entrada do app (token, carga, realtime, erros)"
```

---

## Task 13: RPC de nomes + ligação no app

**Files:**
- Modify: `central-casa/supabase/schema.sql`
- Modify: `central-casa/js/data.js`
- Modify: `central-casa/js/app.js`

- [ ] **Step 1: Acrescentar RPC em `supabase/schema.sql` e aplicar no SQL Editor**

```sql
create or replace function nomes_usuarios()
returns table(id uuid, nome text)
language sql security definer set search_path = public as $$
  select id, nome from users;
$$;
```

Aplicar no SQL Editor do Supabase (rodar só esse bloco).
Expected: "Success".

- [ ] **Step 2: Acrescentar em `js/data.js`**

```js
export async function nomesUsuarios() {
  const { data, error } = await db.rpc('nomes_usuarios')
  if (error) throw error
  return data ?? []
}
```

- [ ] **Step 3: Usar no `js/app.js`** — trocar a linha do `_users`

Substituir:
```js
  setEstado({ user, modo: 'marcar', _users: [user] })
```
por:
```js
  let usuarios = [user]
  try { usuarios = await data.nomesUsuarios() } catch {}
  setEstado({ user, modo: 'marcar', _users: usuarios })
```

- [ ] **Step 4: Verificar sintaxe**

Run: `cd central-casa && node --check js/data.js && node --check js/app.js`
Expected: sem erro.

- [ ] **Step 5: Commit**

```bash
cd central-casa
git add supabase/schema.sql js/data.js js/app.js
git commit -m "feat: RPC nomes_usuarios para etiquetas do modo compras"
```

---

## Task 14: E2E — fluxo de marcar (Playwright)

**Files:**
- Create: `central-casa/.env.test`
- Create: `central-casa/tests/e2e/marcar.spec.js`

> Pré-requisito: Supabase com schema + seeds aplicados (Tasks 2–4) e `js/config.js` preenchido. Use o token do usuário **Ester** (papel `marcar`).

- [ ] **Step 1: Criar `.env.test`** (gitignored) só para referência dos tokens

```
TOKEN_ESTER=cole_o_token_da_ester
TOKEN_JULIO=cole_o_token_do_julio
```

- [ ] **Step 2: Escrever `tests/e2e/marcar.spec.js`**

```js
import { test, expect } from '@playwright/test'

const TOKEN = process.env.TOKEN_ESTER

test('Ester marca um item e ele fica marcado', async ({ page }) => {
  test.skip(!TOKEN, 'defina TOKEN_ESTER em .env.test')
  await page.goto(`/?u=${TOKEN}`)
  await expect(page.locator('.who')).toContainText('Oi, Ester')

  const primeira = page.locator('.row').first()
  await primeira.locator('.js-toggle').click()
  await expect(primeira).toHaveClass(/on/)
  await expect(primeira.locator('.qty b')).toHaveText('1')

  // incrementa quantidade
  await primeira.locator('.js-inc').click()
  await expect(primeira.locator('.qty b')).toHaveText('2')

  // desmarca (decrementa abaixo de 1)
  await primeira.locator('.js-dec').click() // 1
  await primeira.locator('.js-dec').click() // remove
  await expect(primeira).not.toHaveClass(/on/)
})
```

- [ ] **Step 3: Rodar E2E**

Run: `cd central-casa && set -a && . ./.env.test && set +a && npm run e2e -- marcar.spec.js`
Expected: PASS (1 teste). Se `TOKEN_ESTER` vazio, o teste é "skipped".

- [ ] **Step 4: Commit**

```bash
cd central-casa
git add tests/e2e/marcar.spec.js
git commit -m "test(e2e): fluxo de marcar"
```

---

## Task 15: E2E — modo compras e baixa (Playwright)

**Files:**
- Create: `central-casa/tests/e2e/compras.spec.js`

- [ ] **Step 1: Escrever `tests/e2e/compras.spec.js`**

```js
import { test, expect } from '@playwright/test'

const ESTER = process.env.TOKEN_ESTER
const JULIO = process.env.TOKEN_JULIO

test('Júlio vê pendência marcada pela Ester e dá baixa', async ({ page, context }) => {
  test.skip(!ESTER || !JULIO, 'defina TOKEN_ESTER e TOKEN_JULIO em .env.test')

  // Ester marca um item
  await page.goto(`/?u=${ESTER}`)
  const item = page.locator('.row').first()
  const nome = await item.locator('.nm').innerText()
  if (!(await item.getAttribute('class')).includes('on')) await item.locator('.js-toggle').click()
  await expect(item).toHaveClass(/on/)

  // Júlio abre o modo compras
  const p2 = await context.newPage()
  await p2.goto(`/?u=${JULIO}`)
  await p2.locator('[data-modo="compras"]').click()
  const linha = p2.locator('.row', { hasText: nome }).first()
  await expect(linha).toBeVisible()
  await expect(p2.locator('#zerar')).toBeVisible() // Júlio pode zerar

  // dá baixa
  await linha.locator('.js-baixa').click()
  await expect(linha).toHaveClass(/bought/)
})

test('botão zerar NÃO aparece para quem não pode', async ({ page }) => {
  test.skip(!ESTER, 'defina TOKEN_ESTER')
  await page.goto(`/?u=${ESTER}`)
  await expect(page.locator('[data-modo="compras"]')).toHaveCount(0) // Ester nem vê o toggle
})
```

- [ ] **Step 2: Rodar E2E**

Run: `cd central-casa && set -a && . ./.env.test && set +a && npm run e2e -- compras.spec.js`
Expected: PASS (2 testes) ou "skipped" sem tokens.

- [ ] **Step 3: Commit**

```bash
cd central-casa
git add tests/e2e/compras.spec.js
git commit -m "test(e2e): modo compras, baixa e permissão de zerar"
```

---

## Task 16: Deploy no GitHub Pages + links por usuário

**Files:**
- (configuração no GitHub; sem novos arquivos de código)

- [ ] **Step 1: Publicar o repositório no GitHub**

```bash
cd central-casa
gh repo create central-casa --private --source=. --remote=origin --push
```
Expected: repositório criado e código enviado.

- [ ] **Step 2: Ativar GitHub Pages**

No GitHub → Settings → Pages → Source: `Deploy from a branch` → branch `main` / pasta `/ (root)` → Save.
Expected: após ~1 min, URL pública tipo `https://<user>.github.io/central-casa/`.

- [ ] **Step 3: Validar no celular**

Abrir `https://<user>.github.io/central-casa/?u=<token-da-ester>` no celular.
Expected: "Oi, Ester", lista carrega, marcar funciona e sincroniza.

- [ ] **Step 4: Gerar e encurtar os 4 links**

Montar os links `.../?u=<token>` para Júlio, Lilian, Ester, Aline. Encurtar cada um (ex.: serviço de encurtador) para mandar no WhatsApp. Guardar o mapeamento nome→link em `docs/links-usuarios.md` (NÃO commitar se quiser manter privado — adicionar ao `.gitignore`).

- [ ] **Step 5: Commit (config, se houver)**

```bash
cd central-casa
git add -A && git commit -m "docs: deploy GitHub Pages" --allow-empty
git push
```

---

## Task 17: Script de resumo + runbook "manda a lista"

**Files:**
- Create: `central-casa/scripts/gerar-resumo.mjs`
- Create: `central-casa/docs/runbook-resumo.md`

- [ ] **Step 1: Escrever `scripts/gerar-resumo.mjs`**

```js
// Consulta as pendências no Supabase e imprime: (1) texto p/ WhatsApp e (2) HTML p/ e-mail.
// Uso: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/gerar-resumo.mjs
import { createClient } from '@supabase/supabase-js'
import { buildResumoText, buildResumoHtml } from '../js/logic.js'

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

const [{ data: secoes }, { data: itens }, { data: nec }] = await Promise.all([
  db.from('secoes').select('*'),
  db.from('itens').select('id,secao_id,nome'),
  db.from('necessidades').select('item_id,nome_avulso,qtd,status').eq('status', 'pendente')
])
const secById = new Map(secoes.map(s => [s.id, s]))
const itById = new Map(itens.map(i => [i.id, i]))
const pendentes = nec.map(n => {
  const it = n.item_id ? itById.get(n.item_id) : null
  const sec = it ? secById.get(it.secao_id) : secById.get(7)
  return { nome: it ? it.nome : n.nome_avulso, secao: sec.nome, emoji: sec.emoji, qtd: n.qtd, por: '' }
})
console.log('===WHATSAPP===')
console.log(buildResumoText(pendentes))
console.log('===EMAIL_HTML===')
console.log(buildResumoHtml(pendentes))
```

- [ ] **Step 2: Testar o script**

Run: `cd central-casa && SUPABASE_URL='https://SEU-PROJETO.supabase.co' SUPABASE_ANON_KEY='...' node scripts/gerar-resumo.mjs`
Expected: imprime bloco `===WHATSAPP===` com itens por seção e `===EMAIL_HTML===` com HTML.

- [ ] **Step 3: Escrever `docs/runbook-resumo.md`** (como o Claude envia, sob demanda e agendado)

```markdown
# Runbook — Resumo da Lista de Compras

## Sob demanda ("manda a lista")
Quando o Júlio pedir "manda a lista" numa sessão do Claude:
1. Rodar `node scripts/gerar-resumo.mjs` com as variáveis SUPABASE_URL/ANON_KEY.
2. Pegar o bloco `===WHATSAPP===` e enviar via MCP do WhatsApp para o Júlio.

## Automático — sexta 20:30 (só Júlio)
Rotina agendada (skill `schedule`) que:
1. Roda o script e captura os dois blocos.
2. Envia o e-mail (Gmail/Composio) para julionoronha@gmail.com com o HTML.
3. Envia o texto no WhatsApp do Júlio **se** o MCP do WhatsApp estiver disponível no ambiente da rotina; senão, o e-mail garante a entrega e o WhatsApp sai sob demanda.
```

- [ ] **Step 4: Commit**

```bash
cd central-casa
git add scripts/gerar-resumo.mjs docs/runbook-resumo.md
git commit -m "feat: script de resumo + runbook de envio"
git push
```

---

## Task 18: Agendar a rotina de sexta 20:30

**Files:**
- (configuração via skill `schedule`; sem código novo)

- [ ] **Step 1: Criar a rotina agendada**

Usar a skill `schedule` para criar uma rotina **sexta-feira 20:30** (America/Sao_Paulo) que execute o runbook `docs/runbook-resumo.md`: gera o resumo, envia e-mail para julionoronha@gmail.com e WhatsApp do Júlio (com fallback de e-mail).

- [ ] **Step 2: Teste imediato (rodar uma vez agora)**

Disparar a rotina manualmente uma vez.
Expected: e-mail chega com as pendências; WhatsApp chega (se MCP disponível).

- [ ] **Step 3: Confirmar agendamento**

Listar as rotinas e confirmar a entrada de sexta 20:30 ativa.

---

## Self-review (cobertura do spec)

- §2 Arquitetura (Pages + Supabase) → Tasks 1,2,7,16 ✅
- §3 Identidade/papéis/zerar só Júlio → Tasks 2 (RPCs), 3 (users), 11 (botão zerar condicionado), 15 (teste) ✅
- §4 Modelo de dados → Task 2 ✅
- §5 Telas/design aprovado → Tasks 9,10,11 ✅
- §6 Fluxos (marcar, desmarcar, add, baixa, zerar, sob demanda, automático) → Tasks 8,10,11,17,18 ✅
- §7 Limitação WhatsApp/e-mail → Tasks 17,18 (fallback documentado) ✅
- §8 Erros/borda (token inválido, offline, marca única, zerar c/ confirmação) → Tasks 2 (índice único), 12, 11 ✅
- §9 Testes → Tasks 5,6 (unit), 14,15 (E2E) ✅
- §10 Parâmetros (conta Supabase, repo, tokens, catálogo, ambiente da rotina, destino) → Tasks 2,3,16,18 ✅

Sem placeholders proibidos; nomes de funções consistentes entre `data.js`/`ui.js`/`app.js` (`marcar`, `desmarcar`, `ajustarQtd`, `adicionarItem`, `darBaixa`, `zerarCiclo`, `resolveUser`, `nomesUsuarios`, `ouvirMudancas`, `groupBySection`, `annotate`, `buildResumoText`, `buildResumoHtml`).
