import { norm } from './util.js'

export function proximaSemanaInicio(hoje) {
  const d = new Date(hoje)
  const diaIso = (d.getUTCDay() + 6) % 7
  d.setUTCDate(d.getUTCDate() - diaIso + 7)
  return d.toISOString().slice(0, 10)
}

export function aggregateIngredients(itens, porcoes, despensa) {
  const desp = new Set((despensa ?? []).map(norm))
  const acc = new Map()
  for (const it of itens ?? []) {
    for (const ing of (it.ingredientes ?? [])) {
      const key = `${norm(ing.item)}|${ing.unidade ?? ''}`
      const cur = acc.get(key) ?? { item: ing.item, unidade: ing.unidade ?? '', qtd: 0 }
      cur.qtd += (Number(ing.qtd) || 0) * porcoes
      acc.set(key, cur)
    }
  }
  return [...acc.values()]
    .filter(r => !desp.has(norm(r.item)))
    .map(r => ({ item: r.item, unidade: r.unidade, qtd: Math.round(r.qtd * 100) / 100 }))
}

export const ALERGENOS_HENRIQUE = ['amendoim', 'trigo', 'banana', 'peixe', 'nozes', 'castanha']

export function isHenriqueSafe(ingredientes, alergenos = ALERGENOS_HENRIQUE) {
  return !(ingredientes ?? []).some(ing => alergenos.some(a => norm(ing.item).includes(norm(a))))
}

export function validateAlmoco(categorias) {
  const c = (categorias ?? []).map(norm)
  const tem = x => c.includes(x)
  const conta = x => c.filter(v => v === x).length
  const faltando = [
    !tem('arroz') && 'arroz', !tem('feijao') && 'feijão', !tem('carne') && 'carne',
    conta('legume') < 2 && '2 legumes', !tem('salada') && 'salada', !tem('verdura') && 'verdura escura'
  ].filter(Boolean)
  return { ok: faltando.length === 0, faltando }
}

export function buildCardapioMessage(semana, dias) {
  let out = `🍽️ Cardápio — semana ${semana}\n`
  for (const d of dias ?? []) {
    out += `\n*${d.rotulo}*\n`
    for (const r of d.refeicoes) {
      out += `${r.emoji} ${r.nome}: ${r.pratos.join(', ')}\n`
      if (r.henrique) out += `   └ Henrique: ${r.henrique}\n`
    }
  }
  return out.trimEnd()
}

const DIA_ROT = ['', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex']
const ORDEM_REF_EXPORT = { merenda: 1, cafe: 2, almoco: 3, lanche: 4, jantar: 5 }

// Monta um CSV com TODOS os cardápios + feedbacks/recadinhos.
export function buildExportCsv({ cardapios, itens, feedback, receitas, usuarios }) {
  const recById = new Map((receitas ?? []).map(r => [r.id, r.nome]))
  const userById = new Map((usuarios ?? []).map(u => [u.id, u.nome]))
  const cardById = new Map((cardapios ?? []).map(c => [c.id, c]))
  const k = (cid, dia, ref) => `${cid}|${dia}|${ref}`

  const pratosByRef = new Map(), henByRef = new Map()
  for (const it of itens ?? []) {
    const key = k(it.cardapio_id, it.dia, it.refeicao)
    const nome = recById.get(it.receita_id) ?? ''
    const map = it.eh_variante_henrique ? henByRef : pratosByRef
    map.set(key, map.has(key) ? map.get(key) + '; ' + nome : nome)
  }

  const rows = []
  const comFb = new Set()
  for (const f of feedback ?? []) {
    const key = k(f.cardapio_id, f.dia, f.refeicao); comFb.add(key)
    const c = cardById.get(f.cardapio_id)
    rows.push({ semana: c?.semana_inicio ?? '', dia: f.dia, refeicao: f.refeicao,
      pratos: pratosByRef.get(key) ?? '', henrique: henByRef.get(key) ?? '',
      usuario: userById.get(f.usuario_id) ?? '', gostou: f.gostou === true ? '👍' : f.gostou === false ? '👎' : '',
      porcao: f.porcao ?? '', recadinho: f.nota ?? '' })
  }
  for (const [key, pratos] of pratosByRef) {
    if (comFb.has(key)) continue
    const [cid, dia, ref] = key.split('|')
    const c = cardById.get(cid)
    rows.push({ semana: c?.semana_inicio ?? '', dia: Number(dia), refeicao: ref,
      pratos, henrique: henByRef.get(key) ?? '', usuario: '', gostou: '', porcao: '', recadinho: '' })
  }
  rows.sort((a, b) =>
    (a.semana < b.semana ? -1 : a.semana > b.semana ? 1 : 0) ||
    (a.dia - b.dia) ||
    ((ORDEM_REF_EXPORT[a.refeicao] ?? 9) - (ORDEM_REF_EXPORT[b.refeicao] ?? 9)))

  const cols = ['semana', 'dia', 'refeicao', 'pratos', 'henrique', 'usuario', 'gostou', 'porcao', 'recadinho']
  const head = ['Semana', 'Dia', 'Refeição', 'Pratos', 'Variante Henrique', 'Quem avaliou', 'Gostou', 'Porção', 'Recadinho']
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`
  const linha = r => cols.map(c => q(c === 'dia' ? (DIA_ROT[r.dia] ?? r.dia) : r[c])).join(',')
  return [head.map(q).join(','), ...rows.map(linha)].join('\n')
}
