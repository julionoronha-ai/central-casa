import { describe, it, expect } from 'vitest'
import { norm, esc } from '../js/util.js'
import { proximaSemanaInicio, aggregateIngredients } from '../js/cardapio-logic.js'

describe('norm', () => {
  it('remove acento, caixa e espaços', () => {
    expect(norm('  Açúcar Mascavo ')).toBe('acucar mascavo')
  })
})
describe('esc', () => {
  it('escapa HTML', () => {
    expect(esc('<b>&"')).toBe('&lt;b&gt;&amp;&quot;')
  })
})

describe('proximaSemanaInicio', () => {
  it('quarta 2026-06-10 -> 2026-06-15', () => { expect(proximaSemanaInicio('2026-06-10')).toBe('2026-06-15') })
  it('sábado 2026-06-13 -> 2026-06-15', () => { expect(proximaSemanaInicio('2026-06-13')).toBe('2026-06-15') })
})
describe('aggregateIngredients', () => {
  const itens = [
    { ingredientes: [{ item: 'Frango', qtd: 0.15, unidade: 'kg' }, { item: 'Arroz', qtd: 0.06, unidade: 'kg' }] },
    { ingredientes: [{ item: 'frango', qtd: 0.1, unidade: 'kg' }] }
  ]
  it('soma por item normalizado × porções e tira despensa', () => {
    expect(aggregateIngredients(itens, 6, ['arroz'])).toEqual([{ item: 'Frango', unidade: 'kg', qtd: 1.5 }])
  })
})
