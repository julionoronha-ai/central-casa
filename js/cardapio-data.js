import { db } from './supabaseClient.js'
import { norm } from './util.js'

export async function carregarReceitas() {
  const { data } = await db.from('receitas').select('*').eq('ativo', true)
  return data ?? []
}

export async function carregarReceita(id) {
  const { data, error } = await db.from('receitas').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function carregarDespensa() {
  const { data } = await db.from('despensa_basica').select('nome')
  return (data ?? []).map(r => r.nome)
}

export async function carregarCardapioSemana(semanaInicio) {
  const { data: cs } = await db.from('cardapios').select('*').eq('semana_inicio', semanaInicio).limit(1)
  const cardapio = cs?.[0]
  if (!cardapio) return null
  const { data: itens } = await db.from('cardapio_itens').select('*').eq('cardapio_id', cardapio.id).order('dia').order('ordem')
  const { data: feedback } = await db.from('feedback_cardapio').select('*').eq('cardapio_id', cardapio.id)
  const { data: overrides } = await db.from('cardapio_overrides').select('*').eq('cardapio_id', cardapio.id)
  return { cardapio, itens: itens ?? [], feedback: feedback ?? [], overrides: overrides ?? [] }
}

export async function salvarOverride(cardapioId, dia, refeicao, texto) {
  return db.from('cardapio_overrides').upsert(
    { cardapio_id: cardapioId, dia, refeicao, texto },
    { onConflict: 'cardapio_id,dia,refeicao' }
  )
}

// Gera/regenera a semana inteira: cria (ou reusa) o cardápio rascunho, limpa e insere os itens.
export async function salvarCardapioGerado(semanaInicio, itens) {
  const { data: cs } = await db.from('cardapios').select('id').eq('semana_inicio', semanaInicio).limit(1)
  let cardapioId = cs?.[0]?.id
  if (!cardapioId) {
    const { data, error } = await db.from('cardapios').insert({ semana_inicio: semanaInicio, status: 'rascunho' }).select().single()
    if (error) throw error
    cardapioId = data.id
  } else {
    await db.from('cardapios').update({ status: 'rascunho' }).eq('id', cardapioId)
  }
  await db.from('cardapio_itens').delete().eq('cardapio_id', cardapioId)
  await db.from('cardapio_overrides').delete().eq('cardapio_id', cardapioId)
  const rows = (itens ?? []).map(i => ({ ...i, cardapio_id: cardapioId }))
  if (rows.length) { const { error } = await db.from('cardapio_itens').insert(rows); if (error) throw error }
  return cardapioId
}

// Troca o prato de uma refeição (remove override antigo daquele slot).
export async function regenerarRefeicao(cardapioId, dia, refeicao, receitaId) {
  await db.from('cardapio_itens').delete().eq('cardapio_id', cardapioId).eq('dia', dia).eq('refeicao', refeicao)
  await db.from('cardapio_overrides').delete().eq('cardapio_id', cardapioId).eq('dia', dia).eq('refeicao', refeicao)
  return db.from('cardapio_itens').insert({ cardapio_id: cardapioId, dia, refeicao, receita_id: receitaId, eh_variante_henrique: false, ordem: 0 })
}

export async function carregarUltimoCardapio() {
  const { data } = await db.from('cardapios').select('*').order('semana_inicio', { ascending: false }).limit(1)
  return data?.[0] ?? null
}

export async function carregarCatalogo() {
  const { data } = await db.from('itens').select('id,nome').eq('ativo', true)
  return data ?? []
}

export async function carregarTudoParaExport() {
  const [c, i, f, r, u] = await Promise.all([
    db.from('cardapios').select('*').order('semana_inicio'),
    db.from('cardapio_itens').select('*'),
    db.from('feedback_cardapio').select('*'),
    db.from('receitas').select('id,nome'),
    db.rpc('nomes_usuarios')
  ])
  return { cardapios: c.data ?? [], itens: i.data ?? [], feedback: f.data ?? [], receitas: r.data ?? [], usuarios: u.data ?? [] }
}

export async function salvarFeedback(cardapioId, dia, refeicao, userId, gostou, porcao, nota) {
  return db.from('feedback_cardapio').upsert(
    { cardapio_id: cardapioId, dia, refeicao, usuario_id: userId, gostou, porcao, nota },
    { onConflict: 'cardapio_id,dia,refeicao,usuario_id' }
  )
}

// Aprova o cardápio e insere os ingredientes na lista (origem 'cardapio'),
// deduplicando contra necessidades pendentes. `ingredientes` já vem agregado
// (item, qtd, unidade) e sem a despensa básica.
export async function aprovarCardapio(cardapioId, userId, ingredientes, catalogo) {
  await db.from('cardapios').update({
    status: 'aprovado', aprovado_por: userId, aprovado_em: new Date().toISOString()
  }).eq('id', cardapioId)

  const { data: pend } = await db.from('necessidades').select('item_id,nome_avulso').eq('status', 'pendente')
  const chaves = new Set((pend ?? []).map(n => n.item_id ? 'i:' + n.item_id : 'n:' + norm(n.nome_avulso)))
  const catByNorm = new Map((catalogo ?? []).map(c => [norm(c.nome), c]))

  const rows = []
  for (const ing of ingredientes) {
    const cat = catByNorm.get(norm(ing.item))
    const chave = cat ? 'i:' + cat.id : 'n:' + norm(ing.item)
    if (chaves.has(chave)) continue
    chaves.add(chave)
    const medida = ing.unidade ? ` (${ing.qtd}${ing.unidade})` : ''
    rows.push({
      item_id: cat ? cat.id : null,
      nome_avulso: `${ing.item}${medida}`,
      qtd: 1, status: 'pendente', marcado_por: userId, origem: 'cardapio'
    })
  }
  if (rows.length) await db.from('necessidades').insert(rows)
  return rows.length
}
