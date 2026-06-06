import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  // Os testes compartilham um único banco Supabase ao vivo — rodar em série evita interferência.
  fullyParallel: false,
  workers: 1,
  retries: 1,
  // Backend Supabase é remoto (sa-east-1): tolerar latência de rede.
  timeout: 60000,
  expect: { timeout: 15000 },
  use: { baseURL: 'http://localhost:5173', headless: true, actionTimeout: 15000, navigationTimeout: 30000 },
  webServer: {
    command: 'npx --yes serve -l 5173 .',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000
  }
})
