// Gera um cardápio-rascunho para a próxima semana (ou a data passada como argumento),
// usando o MESMO gerador da página (banco de receitas + regras) — só com a chave anon
// pública, SEM senha do banco. Uso:
//   npm run cardapio:novo            (próxima semana)
//   npm run cardapio:novo 2026-06-22 (semana específica, segunda-feira)
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../js/config.js'
import { gerarSemana } from '../js/cardapio-gerador.js'
import { proximaSemanaInicio } from '../js/cardapio-logic.js'

const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const semana = process.argv[2] || proximaSemanaInicio(new Date().toISOString().slice(0, 10))

const { data: receitas, error: er } = await db.from('receitas').select('*').eq('ativo', true)
if (er) { console.error('Erro ao ler receitas:', er.message); process.exit(1) }
const itens = gerarSemana(receitas)
if (!itens.length) { console.error('Banco de receitas vazio?'); process.exit(1) }

let { data: cs } = await db.from('cardapios').select('id').eq('semana_inicio', semana).limit(1)
let cardapioId = cs?.[0]?.id
if (!cardapioId) {
  const { data, error } = await db.from('cardapios').insert({ semana_inicio: semana, status: 'rascunho' }).select().single()
  if (error) { console.error('Erro ao criar cardápio:', error.message); process.exit(1) }
  cardapioId = data.id
} else {
  await db.from('cardapios').update({ status: 'rascunho' }).eq('id', cardapioId)
}
await db.from('cardapio_itens').delete().eq('cardapio_id', cardapioId)
await db.from('cardapio_overrides').delete().eq('cardapio_id', cardapioId)
const { error: ei } = await db.from('cardapio_itens').insert(itens.map(i => ({ ...i, cardapio_id: cardapioId })))
if (ei) { console.error('Erro ao inserir itens:', ei.message); process.exit(1) }

console.log(`✅ Cardápio rascunho gerado para a semana de ${semana} (${itens.length} itens).`)
console.log(`Abra com seu link pessoal:`)
console.log(`  https://julionoronha-ai.github.io/central-casa/cardapio.html?u=<SEU_TOKEN>&semana=${semana}`)
console.log(`Revise, ajuste (✏️/🎲) e aprove na página.`)
