import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, expect, vi } from 'vitest'

import broConfig from '../bro.config.js'

/**
 * Опциональная пиновка «сейчас» для доказательства DoD TASK-46:
 * VITEST_SYSTEM_TIME=2026-08-09T12:00:00 (вс) и …-08-10… (пн) — два прогона.
 * Фейкаем только Date (не setTimeout) — иначе ломаются latency стабов и poll регистратора.
 * Тесты с vi.setSystemTime по-прежнему переопределяют часы сами.
 */
const pinnedNow = process.env.VITEST_SYSTEM_TIME
if (pinnedNow) {
  beforeEach(() => {
    const testPath = expect.getState().testPath ?? ''
    if (/[/\\]stubs[/\\]/.test(testPath)) return
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(pinnedNow))
  })
  afterEach(() => {
    vi.useRealTimers()
  })
}

const w = globalThis as unknown as { window?: Record<string, unknown> }

if (typeof w.window === 'undefined') {
  w.window = {}
}
const win = w.window as Record<string, unknown>

const navs = broConfig.navigations as Record<string, string>
const config = broConfig.config as Record<string, string>

win.__BROJS_CONFIG__ = {
  config,
  navigations: navs,
  features: broConfig.features,
}

if (typeof globalThis.localStorage === 'undefined') {
  const memory: Record<string, string> = {}
  const stub: Storage = {
    get length() {
      return Object.keys(memory).length
    },
    clear(): void {
      Object.keys(memory).forEach((k) => {
        delete memory[k]
      })
    },
    getItem(key: string): string | null {
      return Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : null
    },
    key(index: number): string | null {
      return Object.keys(memory)[index] ?? null
    },
    removeItem(key: string): void {
      delete memory[key]
    },
    setItem(key: string, value: string): void {
      memory[key] = String(value)
    },
  }
  ;(globalThis as unknown as { localStorage: Storage }).localStorage = stub
  win.localStorage = stub
}
