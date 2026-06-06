import { groupBySection, annotate } from './logic.js'
import * as data from './data.js'

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

let estado = { user: null, secoes: [], itens: [], necessidades: [], modo: 'marcar', busca: '' }

export function setEstado(patch) { Object.assign(estado, patch) }
export function getEstado() { return estado }

// Recarrega após uma mutação do próprio usuário (não espera o eco do realtime).
// reload = só necessidades (leve/rápido); reloadFull = catálogo + necessidades (após adicionar item).
let reload = async () => {}
let reloadFull = async () => {}
export function setReload(fn) { reload = fn }
export function setReloadFull(fn) { reloadFull = fn }

export function toast(msg) {
  let t = document.querySelector('.toast')
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t) }
  t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1600)
}

function nomesUsuarios() {
  const m = new Map(); for (const u of estado._users ?? []) m.set(u.id, u.nome); return m
}

export function renderTopbar() {
  const tb = document.getElementById('topbar')
  const u = estado.user
  const podeComprar = u.papel === 'comprar'
  tb.innerHTML = `
    <div class="hello">
      <div><div class="who">${estado.modo === 'compras' ? 'Compras' : 'Oi, ' + esc(u.nome)}</div>
      <div class="sub">${estado.modo === 'compras' ? 'toque pra dar baixa' : 'marque o que está faltando'}</div></div>
      <div class="ava">${esc((u.nome ?? '')[0] ?? '')}</div>
    </div>
    ${podeComprar ? `<div class="toggle" role="tablist">
      <button role="tab" data-modo="marcar" aria-selected="${estado.modo === 'marcar'}">Marcar</button>
      <button role="tab" data-modo="compras" aria-selected="${estado.modo === 'compras'}">Compras</button>
    </div>` : ''}
    ${estado.modo === 'marcar' ? `<input class="search" id="busca" placeholder="🔍 buscar item…" value="${esc(estado.busca)}">` : ''}`
  tb.querySelectorAll('[data-modo]').forEach(b =>
    b.onclick = () => { setEstado({ modo: b.dataset.modo }); renderTopbar(); render() })
  const busca = document.getElementById('busca')
  if (busca) busca.oninput = e => { estado.busca = e.target.value; render() }
}

function rowMarcar(item) {
  const on = item.marcado
  return `<div class="row ${on ? 'on' : ''}" data-item="${item.id}" data-nec="${item.necId ?? ''}">
    <div class="check js-toggle">${on ? '✓' : ''}</div>
    <div><div class="nm">${esc(item.nome)}</div>${item.medida ? `<div class="md">${esc(item.medida)}</div>` : ''}</div>
    <div class="right">${on
      ? `<div class="qty"><button class="js-dec">−</button><b>${item.qtd ?? 1}</b><button class="js-inc">+</button></div>`
      : `<span class="md">qtd</span>`}</div>
  </div>`
}

export function renderMarcar() {
  const app = document.getElementById('app')
  const anotados = annotate(estado.itens, estado.necessidades)
  const filtro = estado.busca.trim().toLowerCase()
  const visiveis = filtro ? anotados.filter(i => i.nome.toLowerCase().includes(filtro)) : anotados
  const grupos = groupBySection(visiveis, estado.secoes)
  app.innerHTML = grupos.map(s => `
    <section class="sec"><div class="sec-h"><span class="em">${s.emoji}</span> ${s.nome}
      <span class="cnt">${s.itens.filter(i => i.marcado).length} marcados</span></div>
      <div class="card">${s.itens.map(rowMarcar).join('')}</div></section>`).join('')
    + `<button class="addbtn" id="add">＋ adicionar item novo</button>
       <div class="foot">salva sozinho · sincroniza em tempo real</div>`
  wireMarcar()
}

function wireMarcar() {
  const app = document.getElementById('app')
  app.querySelectorAll('.row').forEach(row => {
    const itemId = row.dataset.item, necId = row.dataset.nec
    row.querySelector('.js-toggle').onclick = async () => {
      if (necId) { await data.desmarcar(necId) } else { await data.marcar(itemId, estado.user.id, 1) }
      await reload()
    }
    const dec = row.querySelector('.js-dec'), inc = row.querySelector('.js-inc')
    if (inc) inc.onclick = async () => { const q = +row.querySelector('b').textContent + 1; await data.ajustarQtd(necId, q); await reload() }
    if (dec) dec.onclick = async () => {
      const q = +row.querySelector('b').textContent - 1
      if (q <= 0) await data.desmarcar(necId); else await data.ajustarQtd(necId, q)
      await reload()
    }
  })
  document.getElementById('add').onclick = abrirAdicionar
}

async function abrirAdicionar() {
  const nome = prompt('Nome do item novo:')
  if (!nome) return
  const lista = estado.secoes.map((s, i) => `${i + 1}. ${s.nome}`).join('\n')
  const escolha = +prompt(`Seção?\n${lista}`)
  const secao = estado.secoes[escolha - 1]
  if (!secao) return toast('Seção inválida')
  await data.adicionarItem(secao.id, nome.trim(), estado.user.id, 1)
  await reloadFull()
  toast('Item adicionado')
}

function rowCompras(nec, nomes, itensById) {
  const it = nec.item_id ? itensById.get(nec.item_id) : null
  const nome = it ? it.nome : (nec.nome_avulso ?? 'item')
  const comprado = nec.status === 'comprado'
  const etiqueta = comprado ? 'comprei' : (nomes.get(nec.marcado_por) ?? '—')
  return `<div class="row ${comprado ? 'bought' : ''}" data-nec="${nec.id}">
    <div class="check js-baixa">${comprado ? '✓' : ''}</div>
    <div><div class="nm">${esc(nome)}${nec.qtd > 1 ? ` <span class="md">×${nec.qtd}</span>` : ''}</div></div>
    <div class="right"><span class="by">${esc(etiqueta)}</span></div></div>`
}

export function renderCompras() {
  const app = document.getElementById('app'), tb = document.getElementById('topbar')
  const itensById = new Map(estado.itens.map(i => [i.id, i]))
  const nomes = nomesUsuarios()
  const pendentesCount = estado.necessidades.filter(n => n.status === 'pendente').length

  tb.querySelector('.pillbar')?.remove()
  const bar = document.createElement('div'); bar.className = 'pillbar'
  bar.innerHTML = `<div class="n">${pendentesCount} <span>itens pendentes</span></div>
    ${estado.user.can_reset ? `<button class="clear" id="zerar">limpar · nova semana</button>` : ''}`
  tb.appendChild(bar)
  if (estado.user.can_reset) document.getElementById('zerar').onclick = async () => {
    if (confirm('Zerar a lista e começar nova semana?')) { await data.zerarCiclo(estado.user.id); await reload(); toast('Nova semana iniciada') }
  }

  const porSecao = new Map()
  for (const n of estado.necessidades) {
    const sid = n.item_id ? (itensById.get(n.item_id)?.secao_id ?? 7) : 7
    if (!porSecao.has(sid)) porSecao.set(sid, [])
    porSecao.get(sid).push(n)
  }
  const secoesOrd = [...estado.secoes].sort((a, b) => a.ordem - b.ordem)
  app.innerHTML = secoesOrd.filter(s => porSecao.has(s.id)).map(s => {
    const linhas = porSecao.get(s.id).map(n => rowCompras(n, nomes, itensById)).join('')
    return `<section class="sec"><div class="sec-h"><span class="em">${s.emoji}</span> ${s.nome}
      <span class="cnt">${porSecao.get(s.id).filter(n => n.status === 'pendente').length}</span></div>
      <div class="card">${linhas}</div></section>`
  }).join('') + `<div class="foot">"comprei" some da lista · só Júlio pode zerar</div>`

  app.querySelectorAll('.row').forEach(row => {
    row.querySelector('.js-baixa').onclick = async () => { await data.darBaixa(row.dataset.nec, estado.user.id); await reload() }
  })
}

export function render() {
  if (estado.modo === 'compras') renderCompras(); else renderMarcar()
}
