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
