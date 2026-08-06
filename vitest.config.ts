import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{ts,tsx}', 'stubs/**/*.test.{js,ts}'],
    setupFiles: ['./src/setupTests.ts'],
    css: false,
    onConsoleLog(log, type) {
      if (type === 'stderr' && /Could not parse CSS stylesheet/.test(log)) {
        return false
      }
      return true
    },
  },
})
