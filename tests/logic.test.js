import { describe, it, expect } from 'vitest'
import { groupBySection, annotate, buildResumoText, buildResumoHtml, buildHistoricoCsv, fmtDataBR } from '../js/logic.js'

const secoes = [
  { id: 1, nome: 'Legumes & Horta', emoji: '🥬', ordem: 1 },
  { id: 8, nome: 'Limpeza', emoji: '🧴', ordem: 8 }
]
const itens = [
  { id: 'a', secao_id: 1, nome: 'Alface', medida: '1un', ordem: 1 },
  { id: 'b', secao_id: 1, nome: 'Cebola', medida: '1kg', ordem: 2 },
  { id: 'c', secao_id: 8, nome: 'Detergente', medida: null, ordem: 1 }
]

describe('groupBySection', () => {
  it('agrupa itens por seção, na ordem das seções', () => {
    const g = groupBySection(itens, secoes)
    expect(g.map(s => s.nome)).toEqual(['Legumes & Horta', 'Limpeza'])
    expect(g[0].itens.map(i => i.nome)).toEqual(['Alface', 'Cebola'])
  })
})

describe('annotate', () => {
  it('marca itens com necessidade pendente e qtd', () => {
    const nec = [{ item_id: 'a', qtd: 2, status: 'pendente', marcado_por: 'u1' }]
    const out = annotate(itens, nec)
    const alface = out.find(i => i.id === 'a')
    expect(alface.marcado).toBe(true)
    expect(alface.qtd).toBe(2)
    expect(out.find(i => i.id === 'b').marcado).toBe(false)
  })
})

const pendentes = [
  { nome: 'Alface', secao: 'Legumes & Horta', emoji: '🥬', qtd: 2, por: 'Ester' },
  { nome: 'Cebola', secao: 'Legumes & Horta', emoji: '🥬', qtd: 1, por: 'Ester' },
  { nome: 'Detergente', secao: 'Limpeza', emoji: '🧴', qtd: 3, por: 'Aline' }
]

describe('buildResumoText', () => {
  it('monta texto por seção com quantidade', () => {
    const t = buildResumoText(pendentes)
    expect(t).toContain('🥬 Legumes & Horta')
    expect(t).toContain('• Alface ×2')
    expect(t).toContain('🧴 Limpeza')
    expect(t).toContain('• Detergente ×3')
  })
  it('mensagem vazia quando não há pendências', () => {
    expect(buildResumoText([])).toContain('Nenhum item pendente')
  })
})

describe('buildResumoHtml', () => {
  it('gera HTML com as seções', () => {
    const h = buildResumoHtml(pendentes)
    expect(h).toContain('<h3')
    expect(h).toContain('Alface')
  })
})

describe('fmtDataBR', () => {
  it('formata ISO UTC para horário de Brasília (UTC-3)', () => {
    expect(fmtDataBR('2026-06-07T13:30:00Z')).toBe('07/06/2026 10:30')
  })
  it('vazio para entrada ausente ou inválida', () => {
    expect(fmtDataBR(null)).toBe('')
    expect(fmtDataBR('não-é-data')).toBe('')
  })
})

describe('buildHistoricoCsv', () => {
  // linhas como vêm da RPC historico_compras (já desnormalizadas e ordenadas)
  const rows = [
    { comprado_em: '2026-06-01T12:00:00Z', secao: 'Legumes & Horta', item: 'Alface', qtd: 2, pedido_por: 'Ester', comprado_por: 'Júlio', origem: 'pessoa' },
    { comprado_em: '2026-06-03T17:00:00Z', secao: 'Limpeza', item: 'Detergente', qtd: 3, pedido_por: 'Cardápio', comprado_por: 'Lilian', origem: 'cardapio' }
  ]
  const csv = buildHistoricoCsv(rows)
  const linhas = csv.split('\n')

  it('tem cabeçalho com a coluna Data', () => {
    expect(linhas[0]).toBe('"Data","Seção","Item","Quantidade","Pedido por","Comprado por","Origem"')
  })
  it('inclui data formatada, item, quem pediu e quem comprou', () => {
    expect(csv).toContain('"01/06/2026 09:00","Legumes & Horta","Alface","2","Ester","Júlio","pessoa"')
  })
  it('traduz origem cardapio para "Cardápio"', () => {
    expect(csv).toContain('"Detergente","3","Cardápio","Lilian","Cardápio"')
  })
  it('preserva a ordem cronológica recebida', () => {
    const itensCol = linhas.slice(1).map(l => l.split('","')[2])
    expect(itensCol).toEqual(['Alface', 'Detergente'])
  })
  it('escapa aspas', () => {
    const c = buildHistoricoCsv([{ item: 'Item "especial"', qtd: 1 }])
    expect(c).toContain('"Item ""especial"""')
  })
})
