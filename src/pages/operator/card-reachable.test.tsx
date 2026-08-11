// Низ карточки записи должен быть достижим.
//
// ЗАЧЕМ. Правая колонка растягивалась по высоте строки и не прокручивалась:
// карточка занятого слота выше сетки, поэтому её низ — «Записать», «Перенести»,
// «Отменить» и поле причины отмены — обрезался краем экрана. Кнопки было видно
// наполовину, и нажать их было нельзя ничем: ни колесом, ни клавиатурой.
//
// Проверяется не «есть атрибут», а вычисленный стиль предка: атрибут можно
// поставить и не дать прокрутки.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getConfigValue } from '@brojs/cli'

import { Provider } from '../../theme'
import { OperatorPage } from './operator-page'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
  getNavigation: vi.fn(() => ({})),
  getNavigationValue: vi.fn((key: string) => (key === 'clinic-scheduler.main' ? '/clinic-scheduler' : '')),
}))
const mockedGetConfigValue = vi.mocked(getConfigValue)

const DATE = '2026-08-10'

const jsonResponse = (body: unknown, status = 200): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))

const doctors = { items: [{ id: 'd-001', name: 'Иванова Елена Сергеевна', specialty: 'Терапевт', cabinet: '201' }] }
const services = {
  items: [
    { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500, doctorIds: ['d-001'] },
  ],
}
const patients = {
  items: [
    { id: 'p-001', name: 'Алексеев Игорь Николаевич', phone: '+7 916 482-31-07', birthDate: '1985-03-12', cardNumber: '0041-2187' },
  ],
}
const slotTimes = ['09:00', '09:15', '09:30', '09:45', '10:00']
const schedule = {
  date: DATE,
  startTime: '09:00',
  endTime: '10:15',
  stepMinutes: 15,
  holiday: null,
  slots: slotTimes.map((time) => ({
    time,
    doctors: [{ id: 'd-001', name: 'Иванова Елена Сергеевна', busy: false, occupancyKind: null, occupancyLabel: null }],
  })),
}

const renderPage = () => render(
  <MemoryRouter initialEntries={[`/clinic-scheduler/operator?date=${DATE}`]}>
    <Provider>
      <OperatorPage />
    </Provider>
  </MemoryRouter>,
)

/** Есть ли среди предков элемент, который реально прокручивается. */
const hasScrollableAncestor = (el: HTMLElement): boolean => {
  let node: HTMLElement | null = el.parentElement
  while (node && node !== document.body) {
    const { overflowY, overflow } = window.getComputedStyle(node)
    if (['auto', 'scroll', 'overlay'].some((v) => overflowY === v || overflow === v)) return true
    node = node.parentElement
  }
  return false
}

describe('OperatorPage — карточка записи достижима целиком', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(`${DATE}T09:00:00`))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api')
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/schedule/')) return jsonResponse(schedule)
      if (url.includes('/appointments')) return jsonResponse({ date: DATE, items: [] })
      if (url.endsWith('/doctors')) return jsonResponse(doctors)
      if (url.endsWith('/services')) return jsonResponse(services)
      if (url.includes('/patients')) return jsonResponse(patients)
      if (url.includes('/duration-rules')) return jsonResponse({ items: [] })
      if (url.includes('/waitlist')) return jsonResponse({ items: [], openCount: 0 })
      return jsonResponse({ error: 'not_found' }, 404)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('у карточки есть прокручиваемый предок: до кнопок можно добраться', async () => {
    renderPage()
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    fireEvent.click(within(grid).getByTestId('slot-d-001-09:00'))

    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    expect(
      hasScrollableAncestor(card),
      'карточка не имеет прокручиваемого предка — её низ обрезается краем экрана',
    ).toBe(true)
  })

  it('колонка карточки прокручивается сама, а не растягивает страницу', async () => {
    renderPage()
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    fireEvent.click(within(grid).getByTestId('slot-d-001-09:00'))
    await screen.findByTestId('slot-card', {}, { timeout: 5000 })

    const column = screen.getByTestId('slot-card-column')
    const style = window.getComputedStyle(column)
    expect(['auto', 'scroll', 'overlay']).toContain(style.overflowY)
    // minH:0 обязателен: без него flex-элемент не сжимается ниже содержимого,
    // и прокрутка не включается, сколько overflow ни ставь.
    expect(['0', '0px']).toContain(style.minHeight)
  })

  it('кнопка записи видна и нажимаема после выбора пациента', async () => {
    renderPage()
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    fireEvent.click(within(grid).getByTestId('slot-d-001-09:00'))
    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })

    await waitFor(() => {
      expect(within(card).getByTestId('patient-option-p-001')).toBeInTheDocument()
    })
    fireEvent.click(within(card).getByTestId('patient-option-p-001'))

    const book = within(card).getByTestId('card-book')
    expect(book).toBeEnabled()
  })
})
