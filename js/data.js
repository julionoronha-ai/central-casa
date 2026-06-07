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
    .select('id,item_id,nome_avulso,qtd,status,marcado_por,baixado_por,origem')
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

// Desfaz a baixa: volta o item para "pendente" (corrige clique errado em Compras).
export async function desfazerBaixa(necId) {
  return db.from('necessidades').update({
    status: 'pendente', baixado_por: null, baixado_em: null
  }).eq('id', necId)
}

// Histórico permanente de compras (semana atual + ciclos arquivados), já com
// nomes e data — via RPC security definer. Semente do dashboard de hábitos.
export async function carregarHistoricoCompras() {
  const { data, error } = await db.rpc('historico_compras')
  if (error) throw error
  return data ?? []
}

export async function zerarCiclo(userId) {
  return db.rpc('reset_ciclo', { p_user: userId })
}

export function ouvirMudancas(callback) {
  return db.channel('necessidades-rt')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'necessidades' }, callback)
    .subscribe()
}

export async function nomesUsuarios() {
  const { data, error } = await db.rpc('nomes_usuarios')
  if (error) throw error
  return data ?? []
}

// Admin do catálogo (modo Ajustes)
export async function renomearItem(itemId, nome) {
  return db.from('itens').update({ nome }).eq('id', itemId)
}

export async function removerItem(itemId) {
  // soft delete: desativa o item e limpa qualquer necessidade pendente dele
  await db.from('necessidades').delete().eq('item_id', itemId)
  return db.from('itens').update({ ativo: false }).eq('id', itemId)
}
