/// <reference types="vitest" />
import { getViteConfig } from 'astro/config'

export default getViteConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts'],
  },
})
