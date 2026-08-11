// Гигиена интерфейса: правила, нарушение которых заказчик увидел на приёмке
// 2026-08-11 — дублирующиеся подписи, поля во всю ширину экрана, кнопки без
// действия, поля без подписи. Проверяются на живых экранах всех четырёх АРМ:
// поштучные тесты каждого поля стоили бы дороже и всё равно пропустили бы
// следующий такой же экран.

import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import App from '../app'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
  getNavigation: vi.fn(() => ({})),
  getNavigationValue: vi.fn((key: string) => {
    if (key === 'clinic-scheduler.main') return '/clinic-scheduler'
    return ''
  }),
  getNavigations: vi.fn(() => ({})),
  getNavigationsValue: vi.fn(() => undefined),
  getFeatures: vi.fn(() => ({})),
  getFeatureValue: vi.fn(() => undefined),
  getAllFeatures: vi.fn(() => ({})),
  getConfig: vi.fn(() => ({})),
  getHistory: vi.fn(() => undefined),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

const DATE = '2026-08-11'

const doctors = [
  { id: 'd-001', name: 'Иванова Елена Сергеевна', specialty: 'Терапевт', cabinet: '201' },
  { id: 'd-002', name: 'Петров Андрей Викторович', specialty: 'Кардиолог', cabinet: '305' },
]

const services = [
  {
    id: 's-001',
    name: 'Первичная консультация',
    duration: 30,
    category: 'Приём',
    price: 2500,
    doctorIds: ['d-001', 'd-002'],
    limitedDoctorIds: [],
    requiresEquipment: false,
  },
]

const patients = [
  { id: 'p-001', name: 'Алексеев Игорь Николаевич', phone: '+7 900 100-00-01', birthDate: '1985-03-12', cardNumber: 'UID 0001' },
]

const schedule = {
  date: DATE,
  startTime: '08:00',
  endTime: '09:00',
  stepMinutes: 15,
  slots: [
    { time: '08:00', doctors: doctors.map((d) => ({ id: d.id, name: d.name, busy: false })) },
    { time: '08:15', doctors: doctors.map((d) => ({ id: d.id, name: d.name, busy: false })) },
  ],
}

const apiBody = (path: string): unknown => {
  if (path.includes('/schedule/')) return schedule
  if (path.includes('/equipment/schedule')) {
    return {
      date: DATE, stepMinutes: 15, startTime: '08:00', endTime: '09:00', items: [],
    }
  }
  if (path.endsWith('/equipment')) return { items: [] }
  if (path.endsWith('/competencies')) return { doctors: [], services: [], cells: [] }
  if (path.includes('/duration-rules')) return { items: [] }
  if (path.includes('/waitlist')) return { items: [], openCount: 0 }
  if (path.includes('/mass-cancel')) return { items: [] }
  if (path.endsWith('/doctors')) return { items: doctors }
  if (path.endsWith('/services')) return { items: services }
  if (path.includes('/patients')) return { items: patients }
  if (path.endsWith('/doctor-cards')) return { items: [] }
  if (path.includes('/week-templates')) {
    return {
      weekStart: DATE, weekEnd: DATE, days: [{ date: DATE, weekday: 'Вт' }], rows: [], published: false,
    }
  }
  if (path.includes('/appointments')) return { date: DATE, items: [] }
  return {}
}

const mockFetchOk = () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    return Promise.resolve(new Response(JSON.stringify(apiBody(url)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
  })
  return fetchMock
}

const visibleText = (root: HTMLElement): string[] => Array.from(root.querySelectorAll('*'))
  .filter((el) => el.children.length === 0)
  .map((el) => (el.textContent ?? '').trim())
  .filter(Boolean)

/** Поле должно как-то называться: подпись, aria или хотя бы placeholder. */
const accessibleName = (el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string => {
  const aria = el.getAttribute('aria-label')
  if (aria) return aria
  const labelledBy = el.getAttribute('aria-labelledby')
  if (labelledBy) {
    const label = document.getElementById(labelledBy)
    if (label?.textContent?.trim()) return label.textContent.trim()
  }
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label?.textContent?.trim()) return label.textContent.trim()
  }
  const wrapping = el.closest('label')
  if (wrapping?.textContent?.trim()) return wrapping.textContent.trim()
  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return placeholder
  if (el.tagName === 'SELECT') {
    const first = (el as HTMLSelectElement).options[0]
    // «Пациент», «Услуга» первой опцией — тоже подпись поля.
    if (first && first.value === '' && first.textContent?.trim()) return first.textContent.trim()
  }
  return ''
}

const SECTIONS: Array<{ arm: string; section?: string; ready: string }> = [
  { arm: 'operator', ready: 'operator-page' },
  { arm: 'operator', section: 'waitlist', ready: 'waitlist-panel' },
  { arm: 'operator', section: 'mass-reschedule', ready: 'mass-reschedule-panel' },
  { arm: 'registrar', ready: 'registrar-page' },
  { arm: 'registrar', section: 'search', ready: 'patient-search' },
  { arm: 'registrar', section: 'new-patient', ready: 'patient-card-form' },
  { arm: 'admin', ready: 'week-templates' },
  { arm: 'admin', section: 'doctors', ready: 'doctors-list' },
  { arm: 'admin', section: 'equipment', ready: 'equipment-screen' },
  { arm: 'admin', section: 'matrix', ready: 'matrix-screen' },
  { arm: 'admin', section: 'duration-rules', ready: 'duration-screen' },
]

const openSection = async (arm: string, section: string | undefined, ready: string) => {
  const url = section
    ? `/clinic-scheduler/${arm}?date=${DATE}&section=${section}`
    : `/clinic-scheduler/${arm}?date=${DATE}`
  window.history.replaceState({}, '', url)
  const view = render(<App />)
  await waitFor(() => {
    expect(screen.getByTestId(ready)).toBeInTheDocument()
  }, { timeout: 5000 })
  return view
}

describe('гигиена интерфейса — дубли подписей, ширина полей, подписанные поля', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(`${DATE}T10:00:00`))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
    mockFetchOk()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    window.history.replaceState({}, '', '/clinic-scheduler')
  })

  it.each(SECTIONS)('$arm/$section: подпись поля не повторяется рядом дословно', async ({ arm, section, ready }) => {
    const { container, unmount } = await openSection(arm, section, ready)

    const fields = Array.from(container.querySelectorAll<HTMLInputElement>('input[placeholder]'))
    const texts = visibleText(container as HTMLElement)
    for (const field of fields) {
      const placeholder = (field.getAttribute('placeholder') ?? '').trim()
      if (!placeholder) continue
      expect(
        texts.filter((t) => t === placeholder),
        `подпись «${placeholder}» продублирована текстом рядом с полем`,
      ).toHaveLength(0)
    }
    unmount()
  })

  it.each(SECTIONS)('$arm/$section: у каждого поля есть подпись', async ({ arm, section, ready }) => {
    const { container, unmount } = await openSection(arm, section, ready)

    const fields = Array.from(
      container.querySelectorAll<HTMLInputElement>('input:not([type="checkbox"]):not([type="radio"]), select, textarea'),
    )
    for (const field of fields) {
      expect(
        accessibleName(field),
        `поле ${field.getAttribute('data-testid') ?? field.outerHTML.slice(0, 80)} без подписи`,
      ).not.toBe('')
    }
    unmount()
  })

  it.each(SECTIONS)('$arm/$section: поле не растягивается во всю ширину экрана', async ({ arm, section, ready }) => {
    const { container, unmount } = await openSection(arm, section, ready)

    const fields = Array.from(
      container.querySelectorAll<HTMLElement>('input[style], select[style], textarea[style]'),
    )
    for (const field of fields) {
      const { width, maxWidth } = field.style
      if (width !== '100%') continue
      expect(
        maxWidth,
        `поле ${field.getAttribute('data-testid') ?? ''} шириной 100% без ограничения`,
      ).not.toBe('')
    }
    unmount()
  })

  /**
   * Строка вида «значение · значение · значение» — машинная склейка фактов:
   * читатель угадывает, что к чему относится, и экран выглядит сгенерированным.
   * Факты разводятся колонками, подписями или запятой в фразе.
   */
  it.each(SECTIONS)('$arm/$section: факты не склеены точками-разделителями', async ({ arm, section, ready }) => {
    const { container, unmount } = await openSection(arm, section, ready)

    const glued = visibleText(container as HTMLElement).filter((t) => t.includes(' · '))
    expect(glued, `склейка через « · »: ${glued.join(' | ')}`).toHaveLength(0)
    unmount()
  })

  it('ни один пункт навигации не отвечает отказом на нажатие', async () => {
    const { container } = await openSection('admin', undefined, 'week-templates')

    const navButtons = Array.from(container.querySelectorAll<HTMLElement>('[data-testid^="arm-nav-"]'))
    expect(navButtons.length).toBeGreaterThan(1)

    for (const button of navButtons) {
      expect(button.getAttribute('aria-disabled')).not.toBe('true')
      expect(button.getAttribute('data-status')).not.toBe('unavailable')
      const before = window.location.search
      await act(async () => {
        fireEvent.click(button)
      })
      const section = button.getAttribute('data-testid')?.replace('arm-nav-', '')
      expect(
        button.getAttribute('data-active'),
        `нажатие на «${button.textContent}» не открыло раздел (было ${before})`,
      ).toBe('true')
      expect(section).toBeTruthy()
    }
  })
})
