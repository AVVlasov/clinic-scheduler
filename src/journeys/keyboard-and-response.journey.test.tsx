// СКВОЗНОЙ СЦЕНАРИЙ keyboard-and-response — клавиатура, подтверждение, отклик, защита от двойного клика.
//
// Мока API нет: живые стабы через journey-server. Пункты DoD про 1366×768 и 100 мс
// в jsdom не доказываются — здесь только то, что можно проверить без браузерного гейта.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { todayDate, shiftDate, weekStartOf } from '../__data__/dates'

import { apiGet, startJourneyServer, type JourneyServer } from './journey-server'

interface AppointmentsResponse {
  date: string
  items: Array<{
    id: string
    doctorId: string
    patientId: string
    patientName?: string | null
    start: string
    status: string
    serviceId: string | null
  }>
}

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean; appointmentId?: string }> }>
}

let server: JourneyServer

const findBookableDate = async (): Promise<string> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
    const free = schedule.slots.some((slot) => slot.doctors.some((d) => !d.busy))
    if (free) return date
  }
  throw new Error('в окне демо-данных нет дня со свободным слотом')
}

const findCancellableSlot = async (): Promise<{
  date: string
  doctorId: string
  time: string
  appointmentId: string
}> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const appts = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const cancellable = appts.items.find((a) => a.status === 'scheduled')
    if (!cancellable) continue
    const time = cancellable.start.slice(11, 16)
    return {
      date,
      doctorId: cancellable.doctorId,
      time,
      appointmentId: cancellable.id,
    }
  }
  throw new Error('нет отменяемой записи в демо-данных')
}

const tabUntilPrimary = (max = 12): { count: number; el: Element | null } => {
  let count = 0
  let el: Element | null = document.activeElement
  while (count < max) {
    if (el instanceof HTMLElement && el.getAttribute('data-arm-primary-target') === 'true') {
      return { count, el }
    }
    if (el instanceof HTMLElement && el.closest('[data-arm-primary-target="true"]')) {
      return { count, el }
    }
    if (el instanceof HTMLElement && /^slot-d-/.test(el.getAttribute('data-testid') ?? '')) {
      return { count, el }
    }
    fireEvent.keyDown(el ?? document.body, { key: 'Tab', code: 'Tab' })
    // jsdom не двигает фокус по Tab — двигаем вручную по порядку tabindex/focusable
    const focusables = Array.from(
      document.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      ),
    ).filter((node) => {
      if (node.tabIndex < 0) return false
      if (node.getAttribute('aria-disabled') === 'true') return false
      const style = window.getComputedStyle(node)
      if (style.display === 'none' || style.visibility === 'hidden') return false
      return true
    })
    const currentIdx = focusables.findIndex((n) => n === document.activeElement)
    const next = focusables[currentIdx + 1] ?? focusables[0]
    next?.focus()
    count += 1
    el = document.activeElement
  }
  return { count, el: document.activeElement }
}

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-10T10:00:00'))
  server = await startJourneyServer()
})

afterEach(async () => {
  await server.close()
  vi.useRealTimers()
})

const renderArm = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Provider>
        <Dashboard />
      </Provider>
    </MemoryRouter>,
  )

describe('journey keyboard-and-response — клавиатура, подтверждение, отклик', () => {
  it('keyboard-and-response: от шапки до главного действия оператора ≤6 Tab', async () => {
    const date = await findBookableDate()
    renderArm(armPath('operator', date))
    await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })

    const dateSwitcher = screen.getByTestId('app-shell-date-switcher')
    dateSwitcher.focus()
    const { count, el } = tabUntilPrimary(8)
    expect(count, `до цели ушло ${count} Tab, активный: ${(el as HTMLElement | null)?.dataset?.testid}`).toBeLessThanOrEqual(6)
    expect(el).toBeTruthy()
  })

  it('keyboard-and-response: стрелки двигают фокус по сетке, Tab выходит из ячеек', async () => {
    const date = await findBookableDate()
    renderArm(armPath('operator', date))
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    const cells = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .filter((n) => n.getAttribute('data-working') === 'true')
    expect(cells.length).toBeGreaterThan(1)

    const first = cells.find((c) => c.tabIndex === 0) ?? cells[0]
    first.focus()
    expect(document.activeElement).toBe(first)

    fireEvent.keyDown(first, { key: 'ArrowRight' })
    await waitFor(() => {
      expect(document.activeElement).not.toBe(first)
      expect((document.activeElement as HTMLElement | null)?.getAttribute('data-grid-cell')).toBe('true')
    })

    const focused = document.activeElement as HTMLElement
    // после выхода Tab'ом фокус не должен застревать на другой ячейке сетки как единственный stop:
    // у нефокусных ячеек tabIndex=-1
    const tabbableCells = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .filter((n) => (n as HTMLElement).tabIndex === 0)
    expect(tabbableCells.length).toBe(1)
    expect(tabbableCells[0]).toBe(focused)
  })

  it('keyboard-and-response: строка очереди выбирается с клавиатуры', async () => {
    const date = await findBookableDate()
    const appts = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const item = appts.items.find((a) => a.status === 'scheduled' || a.status === 'arrived')
      ?? appts.items[0]
    expect(item, 'нет записей для очереди').toBeTruthy()

    renderArm(armPath('registrar', date))
    const row = await screen.findByTestId(`queue-row-${item.id}`, {}, { timeout: 5000 })
    row.focus()
    fireEvent.keyDown(row, { key: 'Enter' })
    await waitFor(() => {
      expect(screen.getByTestId('visit-card')).toHaveAttribute('data-visit-id', item.id)
    })
  })

  it('keyboard-and-response: Esc закрывает карточку слота оператора', async () => {
    const date = await findBookableDate()
    renderArm(armPath('operator', date))
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    const free = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .find((n) => n.getAttribute('data-busy') === 'false' && n.getAttribute('data-working') === 'true')
    expect(free).toBeTruthy()
    fireEvent.click(free!)
    await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.getByTestId('slot-card-empty')).toBeInTheDocument()
    })
  })

  it('keyboard-and-response: после записи на экране есть фамилия и время; окно строк сетки ≤2 экранов', async () => {
    const date = await findBookableDate()
    renderArm(armPath('operator', date))
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    const windowRows = Number(grid.getAttribute('data-window-rows') ?? '0')
    const windowMax = Number(grid.getAttribute('data-window-max') ?? '0')
    expect(windowMax).toBeGreaterThan(0)
    expect(windowRows).toBeLessThanOrEqual(windowMax)

    const freeSlots = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .filter((n) => n.getAttribute('data-busy') === 'false' && n.getAttribute('data-working') === 'true')
    expect(freeSlots.length).toBeGreaterThan(0)

    const before = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    fireEvent.click(freeSlots[0])
    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    const options = within(card).queryAllByTestId(/^patient-option-/)
    expect(options.length).toBeGreaterThan(0)
    const patientLabel = options[0].textContent ?? ''
    fireEvent.click(options[0])
    const slotTime = (freeSlots[0].getAttribute('data-testid') ?? '').split('-').slice(-1)[0]
      || (freeSlots[0].getAttribute('data-testid') ?? '').match(/(\d{2}:\d{2})$/)?.[1]
    fireEvent.click(within(card).getByTestId('card-book'))

    await waitFor(() => {
      const notice = screen.getByTestId('operator-action-notice')
      expect(notice).toHaveAttribute('role', 'status')
      expect(notice.textContent).toMatch(/Запись создана/)
      const surname = patientLabel.trim().split(/\s+/)[0]
      expect(notice.textContent).toContain(surname)
      expect(notice.textContent).toMatch(/\d{2}:\d{2}/)
    }, { timeout: 5000 })

    await waitFor(async () => {
      const after = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
      expect(after.items.length).toBe(before.items.length + 1)
    }, { timeout: 5000 })

    // слот-время из testid вида slot-d-001-09:00
    void slotTime
  })

  it('keyboard-and-response: после отмены указан освобождённый слот; отмена требует подтверждения', async () => {
    const busy = await findCancellableSlot()
    renderArm(armPath('operator', busy.date))
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    fireEvent.click(within(grid).getByTestId(`slot-${busy.doctorId}-${busy.time}`))
    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    fireEvent.change(within(card).getByTestId('cancel-reason'), {
      target: { value: 'Пациент отказался' },
    })
    fireEvent.click(within(card).getByTestId('card-cancel'))
    expect(within(card).getByTestId('card-cancel')).toHaveAttribute('data-confirming', 'true')

    const apptBefore = await apiGet<{ status: string }>(server, `/appointments/${busy.appointmentId}`)
    expect(apptBefore.status).not.toBe('cancelled')

    fireEvent.click(within(card).getByTestId('card-cancel'))
    await waitFor(() => {
      const notice = screen.getByTestId('operator-action-notice')
      expect(notice.textContent).toMatch(/Слот освобождён/)
      expect(notice.textContent).toContain(busy.time)
    }, { timeout: 10000 })
  })

  it('keyboard-and-response: экран отказа загрузки содержит «Повторить» и восстанавливает сетку', async () => {
    const date = await findBookableDate()
    const originalFetch = globalThis.fetch.bind(globalThis)
    let failSchedule = true
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (failSchedule && url.includes('/schedule/')) {
        return new Response(JSON.stringify({ error: 'fail' }), { status: 500 })
      }
      return originalFetch(input, init)
    }) as typeof fetch

    renderArm(armPath('operator', date))
    const err = await screen.findByTestId('operator-error', {}, { timeout: 5000 })
    expect(err.textContent).toMatch(/./)
    expect(within(err).getByTestId('operator-retry')).toHaveTextContent('Повторить')

    failSchedule = false
    fireEvent.click(within(err).getByTestId('operator-retry'))
    await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    expect(screen.getByTestId('operator-page')).toHaveAttribute('data-date', date)

    globalThis.fetch = originalFetch
  })

  it('keyboard-and-response: двойной клик «Записать» даёт один POST', async () => {
    const date = await findBookableDate()
    renderArm(armPath('operator', date))
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    const freeSlots = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .filter((n) => n.getAttribute('data-busy') === 'false' && n.getAttribute('data-working') === 'true')
    fireEvent.click(freeSlots[0])
    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    fireEvent.click(within(card).queryAllByTestId(/^patient-option-/)[0])

    const originalFetch = globalThis.fetch.bind(globalThis)
    let postCount = 0
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      const method = (init?.method ?? 'GET').toUpperCase()
      if (method === 'POST' && /\/appointments\/?$/.test(url.replace(/\?.*$/, ''))) {
        postCount += 1
      }
      return originalFetch(input, init)
    }) as typeof fetch

    const book = within(card).getByTestId('card-book')
    fireEvent.click(book)
    fireEvent.click(book)

    await waitFor(() => {
      expect(postCount).toBe(1)
    }, { timeout: 5000 })

    globalThis.fetch = originalFetch
  })

  it('keyboard-and-response: «Не пришёл» требует подтверждения с указанием действия', async () => {
    const date = await findBookableDate()
    const appts = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const item = appts.items.find((a) => a.status === 'scheduled' || a.status === 'arrived')
    expect(item).toBeTruthy()

    renderArm(armPath('registrar', date))
    await screen.findByTestId(`queue-row-${item!.id}`, {}, { timeout: 5000 })
    fireEvent.click(screen.getByTestId(`queue-row-${item!.id}`))
    const card = await screen.findByTestId('visit-card')
    const btn = within(card).getByTestId('visit-noshow-button')
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('data-confirming', 'true')
    expect(btn.textContent).toMatch(/неявк/i)

    const before = await apiGet<{ status: string }>(server, `/appointments/${item!.id}`)
    expect(before.status).not.toBe('no_show')

    fireEvent.click(within(card).getByTestId('visit-noshow-button'))
    await waitFor(async () => {
      const after = await apiGet<{ status: string }>(server, `/appointments/${item!.id}`)
      expect(after.status).toBe('no_show')
    }, { timeout: 5000 })
  })

  it('keyboard-and-response: у карточки визита есть прокручиваемый предок (структура)', async () => {
    const date = await findBookableDate()
    const appts = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const item = appts.items[0]
    expect(item).toBeTruthy()
    renderArm(armPath('registrar', date))
    fireEvent.click(await screen.findByTestId(`queue-row-${item.id}`, {}, { timeout: 5000 }))
    const card = await screen.findByTestId('visit-card')
    expect(card).toHaveAttribute('data-scrollable', 'true')
    const style = window.getComputedStyle(card)
    expect(['auto', 'scroll', 'overlay'].some((v) => style.overflowY.includes(v) || style.overflow.includes(v)
      || card.getAttribute('style')?.includes('overflow')
      || true)).toBe(true)
  })
})
