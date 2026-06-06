import * as data from './data.js'
import { setEstado, renderTopbar, render, toast } from './ui.js'

function erroFatal(msg) {
  document.getElementById('topbar').innerHTML = ''
  document.getElementById('app').innerHTML = `<div class="erro"><h2>Ops…</h2><p>${msg}</p></div>`
}

async function main() {
  const token = new URLSearchParams(location.search).get('u')
  if (!token) return erroFatal('Link inválido. Peça um novo ao Júlio.')

  let user
  try { user = await data.resolveUser(token) } catch { return erroFatal('Sem conexão. Tente novamente.') }
  if (!user) return erroFatal('Link inválido. Peça um novo ao Júlio.')

  let usuarios = [user]
  try { usuarios = await data.nomesUsuarios() } catch {}
  setEstado({ user, modo: 'marcar', _users: usuarios })

  async function recarregar() {
    const { secoes, itens } = await data.carregarCatalogo()
    const necessidades = await data.carregarNecessidades()
    setEstado({ secoes, itens, necessidades })
    render()
  }

  try {
    await recarregar()
    renderTopbar()
  } catch (e) {
    return erroFatal('Não consegui carregar a lista. Tente recarregar.')
  }

  data.ouvirMudancas(async () => { try { await recarregar() } catch {} })
  window.addEventListener('online', () => toast('Conectado de novo'))
  window.addEventListener('offline', () => toast('Sem internet — vou tentar salvar quando voltar'))
}

main()
