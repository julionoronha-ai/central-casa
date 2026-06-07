import { esc } from './util.js'
import { buildCardapioMessage } from './cardapio-logic.js'

const EMOJI = { merenda: '🎒', cafe: '☕', almoco: '🍽️', lanche: '🍎', jantar: '🌙' }
const NOME_REF = { merenda: 'Merenda do Henrique', cafe: 'Café da manhã', almoco: 'Almoço', lanche: 'Lanche da tarde', jantar: 'Jantar / lanche noturno' }
const ORDEM_REF = ['merenda', 'cafe', 'almoco', 'lanche', 'jantar']
const ROTULO_DIA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex']

let estado = { user: null, token: null, semana: null, cardapio: null, itens: [], feedback: [], receitas: new Map(), dia: 1 }
let onAprovar = async () => {}, onFeedback = async () => {}
export function setEstado(p) { Object.assign(estado, p) }
export function getEstado() { return estado }
export function setHandlers(h) { if (h.aprovar) onAprovar = h.aprovar; if (h.feedback) onFeedback = h.feedback }

export function toast(msg) {
  let t = document.querySelector('.toast')
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t) }
  t.textContent = msg; t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 1600)
}

function refeicoesDoDia(dia) {
  const porRef = new Map(ORDEM_REF.map(r => [r, []]))
  for (const it of estado.itens.filter(i => i.dia === dia)) porRef.get(it.refeicao)?.push(it)
  return ORDEM_REF.map(ref => ({ ref, itens: porRef.get(ref) }))
}

function nomeReceita(it) { return estado.receitas.get(it.receita_id)?.nome ?? '—' }

export function renderTopbar() {
  const tb = document.getElementById('topbar')
  const c = estado.cardapio
  const podeAprovar = estado.user?.papel === 'comprar' && c && c.status === 'rascunho'
  tb.innerHTML = `
    <div class="hello"><div>
      <div class="who">Cardápio</div>
      <div class="sub">${c ? 'semana ' + esc(estado.semana) + (c.status === 'aprovado' ? ' · aprovado' : ' · rascunho') : 'sem cardápio ainda'}</div>
    </div></div>
    ${c ? `<div class="cardapio-acts">
      <button class="btn btn-ghost" id="copiar">📋 copiar como mensagem</button>
      ${podeAprovar ? `<button class="btn btn-solid" id="aprovar">✓ aprovar semana</button>` : ''}
    </div>
    <div class="days">${ROTULO_DIA.map((r, i) => `<div class="day ${estado.dia === i + 1 ? 'on' : ''}" data-dia="${i + 1}">${r}<b>${i + 1}</b></div>`).join('')}</div>` : ''}`
  tb.querySelectorAll('[data-dia]').forEach(b => b.onclick = () => { estado.dia = +b.dataset.dia; render() })
  const cp = document.getElementById('copiar'); if (cp) cp.onclick = copiarMensagem
  const ap = document.getElementById('aprovar'); if (ap) ap.onclick = async () => { await onAprovar() }
}

function cardRefeicao({ ref, itens }) {
  if (!itens.length) return ''
  const principais = itens.filter(i => !i.eh_variante_henrique)
  const variante = itens.find(i => i.eh_variante_henrique)
  const pratos = principais.map(it => {
    const r = estado.receitas.get(it.receita_id)
    const star = r?.elaborado ? `<span class="star">★</span> ` : ''
    const link = r?.elaborado ? ` <a class="recipe" href="receita.html?id=${it.receita_id}&u=${encodeURIComponent(estado.token)}">📖 ver receita</a>` : ''
    return `${star}${esc(r?.nome ?? '—')}${link}`
  }).join(' · ')
  const inseguro = principais.some(it => {
    const r = estado.receitas.get(it.receita_id)
    return r && !r.henrique_safe && !variante && ref !== 'almoco'
  })
  const fb = feedbackDe(ref)
  return `<section class="sec"><div class="sec-h"><span class="em">${EMOJI[ref]}</span> ${NOME_REF[ref]}</div>
    <div class="card">
      <div class="dish">${pratos}${ref === 'merenda' ? ' <span style="color:var(--sage);font-size:12px;font-weight:600">✓ sem alérgenos</span>' : ''}</div>
      ${variante ? `<div class="hq"><b>Henrique:</b> ${esc(nomeReceita(variante))}</div>` : ''}
      ${inseguro ? `<div class="warn">⚠ revisar Henrique nesta refeição</div>` : ''}
      ${fbControls(ref, fb)}
    </div></section>`
}

function feedbackDe(ref) {
  return estado.feedback.find(f => f.dia === estado.dia && f.refeicao === ref && f.usuario_id === estado.user?.id) ?? {}
}

function fbControls(ref, fb) {
  const seg = p => `<span class="${fb.porcao === p ? 'on' : ''}" data-porcao="${p}">${p}</span>`
  return `<div class="fb" data-ref="${ref}">
    <button class="thumb up ${fb.gostou === true ? 'on' : ''}" data-g="1">👍</button>
    <button class="thumb down ${fb.gostou === false ? 'on' : ''}" data-g="0">👎</button>
    <div class="seg">${seg('muito')}${seg('bom')}${seg('pouco')}</div>
    <input class="fbnote" placeholder="recadinho…" value="${esc(fb.nota ?? '')}">
  </div>`
}

export function render() {
  const app = document.getElementById('app')
  if (!estado.cardapio) { app.innerHTML = `<div class="erro"><h2>Sem cardápio</h2><p>Peça ao Claude: "gera o cardápio da próxima semana".</p></div>`; return }
  app.innerHTML = refeicoesDoDia(estado.dia).map(cardRefeicao).join('')
  wireFeedback()
}

function wireFeedback() {
  document.querySelectorAll('.fb').forEach(bloco => {
    const ref = bloco.dataset.ref
    const ler = () => ({
      gostou: bloco.querySelector('.thumb.up').classList.contains('on') ? true
        : bloco.querySelector('.thumb.down').classList.contains('on') ? false : null,
      porcao: bloco.querySelector('.seg .on')?.dataset.porcao ?? null,
      nota: bloco.querySelector('.fbnote').value
    })
    bloco.querySelector('.thumb.up').onclick = async () => { toggleThumb(bloco, true); await enviar(ref, ler()) }
    bloco.querySelector('.thumb.down').onclick = async () => { toggleThumb(bloco, false); await enviar(ref, ler()) }
    bloco.querySelectorAll('.seg span').forEach(s => s.onclick = async () => {
      bloco.querySelectorAll('.seg span').forEach(x => x.classList.remove('on')); s.classList.add('on'); await enviar(ref, ler())
    })
    bloco.querySelector('.fbnote').onchange = async () => enviar(ref, ler())
  })
}
function toggleThumb(bloco, up) {
  const u = bloco.querySelector('.thumb.up'), d = bloco.querySelector('.thumb.down')
  if (up) { u.classList.toggle('on'); d.classList.remove('on') } else { d.classList.toggle('on'); u.classList.remove('on') }
}
async function enviar(ref, v) {
  try { await onFeedback(estado.dia, ref, v); toast('Feedback salvo') }
  catch { toast('Não consegui salvar — tente de novo') }
}

async function copiarMensagem() {
  const dias = []
  for (let dia = 1; dia <= 5; dia++) {
    const refeicoes = refeicoesDoDia(dia).filter(x => x.itens.length).map(({ ref, itens }) => {
      const variante = itens.find(i => i.eh_variante_henrique)
      return {
        nome: NOME_REF[ref], emoji: EMOJI[ref],
        pratos: itens.filter(i => !i.eh_variante_henrique).map(nomeReceita),
        henrique: variante ? nomeReceita(variante) : null
      }
    })
    dias.push({ rotulo: ROTULO_DIA[dia - 1], refeicoes })
  }
  const txt = buildCardapioMessage(estado.semana, dias)
  try {
    await navigator.clipboard.writeText(txt)
    toast('Copiado! cole no WhatsApp')
  } catch { toast('Não consegui copiar — copie manualmente') }
}
