// Navegação compartilhada entre a Lista (index.html) e o Cardápio (cardapio.html).
// Ordem: Cardápio · Marcar · Compras · Ajustes. Compras/Ajustes só para papel 'comprar'.
// page='lista' → Marcar/Compras/Ajustes são botões de modo (data-modo); Cardápio é link.
// page='cardapio' → Cardápio é o ativo; os demais são links para a index com ?modo=.

export function navToggle({ page, active, papel, token }) {
  const t = encodeURIComponent(token ?? '')
  const comprar = papel === 'comprar'
  const onLista = page === 'lista'
  const btn = (label, sel, modo) => `<button ${modo ? `data-modo="${modo}"` : ''} aria-selected="${sel}">${label}</button>`
  const link = (label, href) => `<a class="navlink" href="${href}">${label}</a>`
  const items = []
  items.push(onLista ? link('Cardápio', `cardapio.html?u=${t}`) : btn('Cardápio', true))
  items.push(onLista ? btn('Marcar', active === 'marcar', 'marcar') : link('Marcar', `index.html?u=${t}&modo=marcar`))
  if (comprar) {
    items.push(onLista ? btn('Compras', active === 'compras', 'compras') : link('Compras', `index.html?u=${t}&modo=compras`))
    items.push(onLista ? btn('Ajustes', active === 'admin', 'admin') : link('Ajustes', `index.html?u=${t}&modo=admin`))
  }
  return `<div class="toggle" role="tablist">${items.join('')}</div>`
}
