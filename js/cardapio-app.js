import * as data from './cardapio-data.js'
import { resolveUser } from './data.js'
import { esc } from './util.js'
import { aggregateIngredients, proximaSemanaInicio, buildExportCsv } from './cardapio-logic.js'
import { setEstado, setHandlers, renderTopbar, render, toast, getEstado } from './cardapio-ui.js'

function erroFatal(msg) {
  document.getElementById('topbar').innerHTML = ''
  document.getElementById('app').innerHTML = `<div class="erro"><h2>Ops…</h2><p>${esc(msg)}</p></div>`
}

async function main() {
  const params = new URLSearchParams(location.search)
  const token = params.get('u')
  if (!token) return erroFatal('Link inválido. Peça um novo ao Júlio.')
  let user
  try { user = await resolveUser(token) } catch { return erroFatal('Sem conexão. Tente novamente.') }
  if (!user) return erroFatal('Link inválido. Peça um novo ao Júlio.')

  let semana = params.get('semana')
  if (!semana) {
    const ult = await data.carregarUltimoCardapio()
    semana = ult?.semana_inicio ?? proximaSemanaInicio(new Date().toISOString().slice(0, 10))
  }

  const receitasArr = await data.carregarReceitas()
  const receitas = new Map(receitasArr.map(r => [r.id, r]))
  setEstado({ user, token, semana, receitas, dia: 1 })

  async function recarregar() {
    const res = await data.carregarCardapioSemana(semana)
    setEstado({ cardapio: res?.cardapio ?? null, itens: res?.itens ?? [], feedback: res?.feedback ?? [], overrides: res?.overrides ?? [] })
    renderTopbar(); render()
  }

  setHandlers({
    feedback: async (dia, ref, v) => {
      const e = getEstado()
      const { error } = await data.salvarFeedback(e.cardapio.id, dia, ref, user.id, v.gostou, v.porcao, v.nota)
      if (error) throw error
    },
    override: async (dia, ref, texto) => {
      const e = getEstado()
      const { error } = await data.salvarOverride(e.cardapio.id, dia, ref, texto)
      if (error) throw error
      await recarregar()
    },
    exportar: async () => {
      try {
        const dados = await data.carregarTudoParaExport()
        const csv = '﻿' + buildExportCsv(dados)
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'cardapios-feedback.csv'; a.click()
        URL.revokeObjectURL(url)
        toast('Exportado (CSV)')
      } catch { toast('Não consegui exportar') }
    },
    aprovar: async () => {
      const e = getEstado()
      if (!confirm('Aprovar a semana e jogar os ingredientes na lista de compras?')) return
      const itensComIngr = e.itens.map(it => ({ ingredientes: e.receitas.get(it.receita_id)?.ingredientes ?? [] }))
      const despensa = await data.carregarDespensa()
      const catalogo = await data.carregarCatalogo()
      const agregados = aggregateIngredients(itensComIngr, 6, despensa)
      const n = await data.aprovarCardapio(e.cardapio.id, user.id, agregados, catalogo)
      toast(`Aprovado · ${n} itens na lista`)
      await recarregar()
    }
  })

  try { await recarregar() } catch (err) { return erroFatal('Não consegui carregar o cardápio.') }
}

main()
