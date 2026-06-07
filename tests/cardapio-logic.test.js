import { describe, it, expect } from 'vitest'
import { norm, esc } from '../js/util.js'

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
