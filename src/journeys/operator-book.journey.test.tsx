// СКВОЗНОЙ СЦЕНАРИЙ operator-book — «оператор находит свободный слот и записывает пациента».
//
// Это не тест экрана, это тест РАБОТЫ. Экран оператора уже покрыт девятью файлами тестов в
// src/pages/operator/, все они зелёные, и ни один не отвечает на вопрос, ради которого АРМ
// существует: может ли человек за смену записать пациента. Они мокают `__data__/api` и
// поэтому проверяют экран против придуманных данных, а не против сервера.
//
// Здесь мока API нет. Поднимаются настоящие стабы, рендерится настоящее приложение,
// и путь проходится кликами — так же, как его пройдёт оператор.

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
  items: Array<{ id: string; doctorId: string; patientId: string; start: string; serviceId: string | null }>
}

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean }> }>
}

let server: JourneyServer

/** Первый рабочий день окна с непустой сеткой — не зависит от дня недели прогона. */
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

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-10T10:00:00'))
  server = await startJourneyServer()
})

afterEach(async () => {
  await server.close()
  vi.useRealTimers()
})

const renderOperator = (date: string) =>
  render(
    <MemoryRouter initialEntries={[armPath('operator', date)]}>
      <Provider>
        <Dashboard />
      </Provider>
    </MemoryRouter>,
  )

describe('journey operator-book — оператор находит свободный слот и записывает пациента', () => {
  it('operator-book: сетка смены открывается и в ней есть свободные слоты', async () => {
    const date = await findBookableDate()
    renderOperator(date)

    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    const freeSlots = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .filter((el) => el.getAttribute('data-busy') === 'false' && el.getAttribute('data-working') === 'true')
    expect(
      freeSlots.length,
      'сетка смены пуста — оператору не из чего выбирать слот, сценарий записи недостижим',
    ).toBeGreaterThan(0)
  })

  it('operator-book: выбранный слот открывает карточку, пациент выбирается, запись создаётся на сервере', async () => {
    const date = await findBookableDate()
    renderOperator(date)

    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    const freeSlots = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .filter((el) => el.getAttribute('data-busy') === 'false' && el.getAttribute('data-working') === 'true')
    expect(freeSlots.length, 'нет свободных слотов — записывать некуда').toBeGreaterThan(0)

    const before = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)

    fireEvent.click(freeSlots[0])
    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })

    const picker = within(card).getByTestId('patient-picker')
    const options = within(picker).queryAllByTestId(/^patient-option-/)
    expect(options.length, 'в карточке нет ни одного пациента — записывать некого').toBeGreaterThan(0)
    fireEvent.click(options[0])

    const book = within(card).getByTestId('card-book')
    expect(book, 'кнопка «Записать» недоступна на свободном слоте').toBeEnabled()
    fireEvent.click(book)

    await waitFor(
      async () => {
        const after = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
        expect(after.items.length).toBe(before.items.length + 1)
      },
      { timeout: 5000 },
    )
  })
})
