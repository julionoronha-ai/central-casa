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
