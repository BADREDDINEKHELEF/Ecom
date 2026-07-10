import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    // Run tests sequentially to avoid cross-test env var pollution from vi.stubEnv
    pool:        'forks',
    include:     ['src/**/*.test.ts', 'scripts/staging-validation/**/*.test.ts'],
    exclude:     ['e2e/**', 'node_modules/**'],
    coverage: {
      provider:  'v8',
      reporter:  ['text', 'json', 'html'],
      include:   ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude:   ['src/**/*.test.ts', 'src/lib/data/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
