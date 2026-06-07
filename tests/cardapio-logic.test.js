import { describe, it, expect } from 'vitest'
import { norm, esc } from '../js/util.js'
import { proximaSemanaInicio, aggregateIngredients, isHenriqueSafe, validateAlmoco, buildCardapioMessage, buildExportCsv } from '../js/cardapio-logic.js'

describe('buildExportCsv', () => {
  it('inclui cabeçalho, pratos e feedback', () => {
    const csv = buildExportCsv({
      cardapios: [{ id: 'c1', semana_inicio: '2026-06-08' }],
      itens: [
        { cardapio_id: 'c1', dia: 3, refeicao: 'almoco', receita_id: 'r1', eh_variante_henrique: false },
        { cardapio_id: 'c1', dia: 3, refeicao: 'almoco', receita_id: 'r2', eh_variante_henrique: true }
      ],
      feedback: [{ cardapio_id: 'c1', dia: 3, refeicao: 'almoco', usuario_id: 'u1', gostou: true, porcao: 'bom', nota: 'curtiram' }],
      receitas: [{ id: 'r1', nome: 'Arroz' }, { id: 'r2', nome: 'Arroz Henrique' }],
      usuarios: [{ id: 'u1', nome: 'Júlio' }]
    })
    expect(csv).toContain('"Semana"') // cabeçalho
    expect(csv).toContain('2026-06-08')
    expect(csv).toContain('Qua')
    expect(csv).toContain('Arroz')
    expect(csv).toContain('Arroz Henrique')
    expect(csv).toContain('Júlio')
    expect(csv).toContain('👍')
    expect(csv).toContain('curtiram')
  })
})

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

describe('isHenriqueSafe', () => {
  it('rejeita banana e trigo', () => {
    expect(isHenriqueSafe([{ item: 'Banana' }])).toBe(false)
    expect(isHenriqueSafe([{ item: 'Farinha de trigo' }])).toBe(false)
  })
  it('aceita seguro', () => { expect(isHenriqueSafe([{ item: 'Mamão' }, { item: 'Arroz' }])).toBe(true) })
})
describe('validateAlmoco', () => {
  it('aprova completo', () => { expect(validateAlmoco(['arroz','feijao','carne','legume','legume','salada','verdura']).ok).toBe(true) })
  it('aponta faltas', () => {
    const r = validateAlmoco(['arroz','feijao','carne','legume','salada'])
    expect(r.ok).toBe(false); expect(r.faltando).toContain('2 legumes'); expect(r.faltando).toContain('verdura escura')
  })
})
describe('buildCardapioMessage', () => {
  it('monta texto por dia/refeição com variante', () => {
    const dias = [{ rotulo: 'Seg 9', refeicoes: [{ nome: 'Café', emoji: '☕', pratos: ['banana amassada'], henrique: 'mamão amassado' }] }]
    const t = buildCardapioMessage('9–13 jun', dias)
    expect(t).toContain('*Seg 9*'); expect(t).toContain('☕ Café: banana amassada'); expect(t).toContain('Henrique: mamão amassado')
  })
})
