import { defineConfig } from 'vitest/config'

// Vitest cuida só dos testes unitários (tests/**/*.test.js).
// Os testes E2E (tests/e2e/*.spec.js) rodam pelo Playwright (npm run e2e).
export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['tests/e2e/**', 'node_modules/**']
  }
})
