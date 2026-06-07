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
