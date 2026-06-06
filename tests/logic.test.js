import { describe, it, expect } from 'vitest'
import { groupBySection, annotate, buildResumoText, buildResumoHtml } from '../js/logic.js'

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
