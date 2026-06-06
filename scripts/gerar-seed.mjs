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
