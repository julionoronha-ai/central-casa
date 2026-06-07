import { test, expect } from '@playwright/test'

const JULIO = process.env.TOKEN_JULIO
const SEMANA = process.env.CARDAPIO_SEMANA // ex.: 2026-06-08 (semeada antes de rodar)

test('Júlio vê o cardápio, dá feedback e vê o botão aprovar', async ({ page }) => {
  test.skip(!JULIO || !SEMANA, 'defina TOKEN_JULIO e CARDAPIO_SEMANA e semeie um cardápio rascunho')
  await page.goto(`/cardapio.html?u=${JULIO}&semana=${SEMANA}`)
  await expect(page.locator('.who')).toContainText('Cardápio')

  // dia 1 deve mostrar refeições
  await expect(page.locator('.sec')).toHaveCount(5)

  // feedback: 👍 na primeira refeição
  const fb = page.locator('.fb').first()
  await fb.locator('.thumb.up').click()
  await expect(fb.locator('.thumb.up')).toHaveClass(/on/)

  // porção
  await fb.locator('.seg span', { hasText: 'bom' }).click()
  await expect(fb.locator('.seg span', { hasText: 'bom' })).toHaveClass(/on/)

  // botão aprovar visível para Júlio (comprar)
  await expect(page.locator('#aprovar')).toBeVisible()

  // trocar de dia funciona
  await page.locator('[data-dia="3"]').click()
  await expect(page.locator('.sec')).toHaveCount(5)
})
