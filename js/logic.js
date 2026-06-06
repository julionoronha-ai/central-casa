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
