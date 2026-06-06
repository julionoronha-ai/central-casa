import { test, expect } from '@playwright/test'

const ESTER = process.env.TOKEN_ESTER
const JULIO = process.env.TOKEN_JULIO

test('Júlio vê pendência marcada pela Ester e dá baixa', async ({ page, context }) => {
  test.skip(!ESTER || !JULIO, 'defina TOKEN_ESTER e TOKEN_JULIO em .env.test')

  // Ester marca um item
  await page.goto(`/?u=${ESTER}`)
  const item = page.locator('.row').first()
  const nome = await item.locator('.nm').innerText()
  if (!(await item.getAttribute('class')).includes('on')) await item.locator('.js-toggle').click()
  await expect(item).toHaveClass(/on/)

  // Júlio abre o modo compras
  const p2 = await context.newPage()
  await p2.goto(`/?u=${JULIO}`)
  await p2.locator('[data-modo="compras"]').click()
  const linha = p2.locator('.row', { hasText: nome }).first()
  await expect(linha).toBeVisible()
  await expect(p2.locator('#zerar')).toBeVisible() // Júlio pode zerar

  // dá baixa
  await linha.locator('.js-baixa').click()
  await expect(linha).toHaveClass(/bought/)
})

test('botão zerar NÃO aparece para quem não pode', async ({ page }) => {
  test.skip(!ESTER, 'defina TOKEN_ESTER')
  await page.goto(`/?u=${ESTER}`)
  await expect(page.locator('[data-modo="compras"]')).toHaveCount(0) // Ester nem vê o toggle
})
