import { test, expect } from '@playwright/test'

const TOKEN = process.env.TOKEN_ESTER

test('Ester marca um item e ele fica marcado', async ({ page }) => {
  test.skip(!TOKEN, 'defina TOKEN_ESTER em .env.test')
  await page.goto(`/?u=${TOKEN}`)
  await expect(page.locator('.who')).toContainText('Oi, Ester')

  const primeira = page.locator('.row').first()
  await primeira.locator('.js-toggle').click()
  await expect(primeira).toHaveClass(/on/)
  await expect(primeira.locator('.qty b')).toHaveText('1')

  // incrementa quantidade
  await primeira.locator('.js-inc').click()
  await expect(primeira.locator('.qty b')).toHaveText('2')

  // desmarca (decrementa abaixo de 1) — espera a qtd atualizar entre os cliques
  await primeira.locator('.js-dec').click()
  await expect(primeira.locator('.qty b')).toHaveText('1')
  await primeira.locator('.js-dec').click()
  await expect(primeira).not.toHaveClass(/on/)
})
