import * as data from './cardapio-data.js'
import { esc } from './util.js'

async function main() {
  const id = new URLSearchParams(location.search).get('id')
  const app = document.getElementById('app')
  if (!id) { app.innerHTML = '<div class="erro"><p>Receita não encontrada.</p></div>'; return }
  let r
  try { r = await data.carregarReceita(id) } catch { app.innerHTML = '<div class="erro"><p>Não consegui carregar.</p></div>'; return }
  if (!r) { app.innerHTML = '<div class="erro"><p>Receita não encontrada.</p></div>'; return }
  const ingr = (r.ingredientes ?? []).map(i => `<li>${esc(i.item)}${i.qtd ? ` — ${i.qtd}${esc(i.unidade ?? '')} (por porção)` : ''}</li>`).join('')
  app.innerHTML = `<div class="receita">
    <h2>${esc(r.nome)}</h2>
    <div class="ingr"><strong>Ingredientes</strong><ul>${ingr}</ul></div>
    <div class="ingr"><strong>Modo de preparo</strong><div class="passo">${esc(r.preparo ?? 'Receita pendente.')}</div></div>
  </div>`
}
main()
