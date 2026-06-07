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
