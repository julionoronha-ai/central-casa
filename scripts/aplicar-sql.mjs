// Aplica os SQLs do projeto no Postgres do Supabase e imprime os tokens dos usuários.
// Uso: DATABASE_URL='postgresql://postgres:SENHA@db.<ref>.supabase.co:5432/postgres' node scripts/aplicar-sql.mjs
// A senha NUNCA é gravada em arquivo — vem só pela env var.
import { readFileSync } from 'node:fs'
import pg from 'pg'

const url = process.env.DATABASE_URL
if (!url || url.includes('[YOUR-PASSWORD]')) {
  console.error('ERRO: defina DATABASE_URL com a senha REAL do banco (não o placeholder).')
  process.exit(1)
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
const files = ['supabase/schema.sql', 'supabase/seed-base.sql', 'supabase/seed-itens.sql']

await client.connect()
for (const f of files) {
  const sql = readFileSync(new URL('../' + f, import.meta.url), 'utf8')
  await client.query(sql)
  console.log('aplicado:', f)
}
const { rows } = await client.query('select nome, papel, token from users order by nome')
console.log('\n=== TOKENS (anote/cole de volta) ===')
for (const r of rows) console.log(`${r.nome} (${r.papel}): ${r.token}`)
const counts = await client.query('select (select count(*) from secoes) as secoes, (select count(*) from itens) as itens')
console.log('\nseções:', counts.rows[0].secoes, '· itens:', counts.rows[0].itens)
await client.end()
