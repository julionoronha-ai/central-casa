import * as data from './data.js'
import { setEstado, setReload, setReloadFull, renderTopbar, render, toast } from './ui.js'

function erroFatal(msg) {
  document.getElementById('topbar').innerHTML = ''
  document.getElementById('app').innerHTML = `<div class="erro"><h2>Ops…</h2><p>${msg}</p></div>`
}

async function main() {
  const params = new URLSearchParams(location.search)
  const token = params.get('u')
  if (!token) return erroFatal('Link inválido. Peça um novo ao Júlio.')

  let user
  try { user = await data.resolveUser(token) } catch { return erroFatal('Sem conexão. Tente novamente.') }
  if (!user) return erroFatal('Link inválido. Peça um novo ao Júlio.')

  // modo inicial vindo da URL (?modo=marcar|compras|admin), respeitando o papel
  const permitidos = user.papel === 'comprar' ? ['marcar', 'compras', 'admin'] : ['marcar']
  const modo = permitidos.includes(params.get('modo')) ? params.get('modo') : 'marcar'

  let usuarios = [user]
  try { usuarios = await data.nomesUsuarios() } catch {}
  setEstado({ user, token, modo, _users: usuarios })

  // recarrega só as necessidades (rápido) — catálogo já está em memória.
  // Só re-renderiza se o estado realmente mudou (evita re-render redundante do
  // eco do realtime, que destacaria elementos no meio de uma interação).
  let necSig = null
  const sigOf = arr => arr.map(n => `${n.id}:${n.qtd}:${n.status}`).sort().join('|')
  async function recarregarNec() {
    const necessidades = await data.carregarNecessidades()
    const sig = sigOf(necessidades)
    if (sig === necSig) return
    necSig = sig
    setEstado({ necessidades })
    render()
  }
  // recarrega catálogo + necessidades (no primeiro load e após adicionar item)
  async function recarregarTudo() {
    const { secoes, itens } = await data.carregarCatalogo()
    setEstado({ secoes, itens })
    await recarregarNec()
  }
  setReload(recarregarNec)
  setReloadFull(recarregarTudo)

  try {
    await recarregarTudo()
    renderTopbar()
  } catch (e) {
    return erroFatal('Não consegui carregar a lista. Tente recarregar.')
  }

  // Eco do realtime (mudanças de outros aparelhos): debounce p/ coalescer rajadas
  // e não re-renderizar no meio de uma interação local.
  let ecoTimer
  data.ouvirMudancas(() => {
    clearTimeout(ecoTimer)
    ecoTimer = setTimeout(() => { recarregarNec().catch(() => {}) }, 250)
  })
  window.addEventListener('online', () => toast('Conectado de novo'))
  window.addEventListener('offline', () => toast('Sem internet — vou tentar salvar quando voltar'))
}

main()
