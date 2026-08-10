// СКВОЗНОЙ СЦЕНАРИЙ operator-book — «оператор находит свободный слот и записывает пациента».
//
// Это не тест экрана, это тест РАБОТЫ. Экран оператора уже покрыт девятью файлами тестов в
// src/pages/operator/, все они зелёные, и ни один не отвечает на вопрос, ради которого АРМ
// существует: может ли человек за смену записать пациента. Они мокают `__data__/api` и
// поэтому проверяют экран против придуманных данных, а не против сервера.
//
// Здесь мока API нет. Поднимаются настоящие стабы, рендерится настоящее приложение,
// и путь проходится кликами — так же, как его пройдёт оператор.
//
// ЭТОТ ТЕСТ ОБЯЗАН ПАДАТЬ, ПОКА СЦЕНАРИЙ НЕ РАБОТАЕТ. На 2026-08-09 он падает на первом
// же шаге: сетка пуста, потому что экран всегда просит сегодняшнюю дату и не даёт её
// сменить, а на сегодняшнюю дату слотов нет. Это и есть то, что увидел заказчик.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { URLs } from '../__data__/urls'

import { apiGet, startJourneyServer, type JourneyServer } from './journey-server'

interface AppointmentsResponse {
  items: Array<{ id: string; doctorId: string; patientId: string; start: string; serviceId: string | null }>
}

let server: JourneyServer

beforeEach(async () => {
  server = await startJourneyServer()
})

afterEach(async () => {
  await server.close()
})

const renderOperator = () =>
  render(
    <MemoryRouter initialEntries={[URLs.arms.operator]}>
      <Provider>
        <Dashboard />
      </Provider>
    </MemoryRouter>,
  )

describe('journey operator-book — оператор находит свободный слот и записывает пациента', () => {
  it('operator-book: сетка смены открывается и в ней есть свободные слоты', async () => {
    renderOperator()

    // Шаг 1. Оператор открыл рабочее место и видит сетку смены.
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })

    // Шаг 2. В сетке есть хотя бы один слот, в который можно записать.
    // Пустая сетка — это не «сегодня нет записей», это неработающее рабочее место:
    // оператор колл-центра не может ответить пациенту ничего.
    const freeSlots = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
    expect(
      freeSlots.length,
      'сетка смены пуста — оператору не из чего выбирать слот, сценарий записи недостижим',
    ).toBeGreaterThan(0)
  })

  it('operator-book: выбранный слот открывает карточку, пациент выбирается, запись создаётся на сервере', async () => {
    renderOperator()

    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    const freeSlots = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
    expect(freeSlots.length, 'нет свободных слотов — записывать некуда').toBeGreaterThan(0)

    const before = await apiGet<AppointmentsResponse>(server, '/appointments')

    // Шаг 3. Клик по слоту открывает карточку записи.
    fireEvent.click(freeSlots[0])
    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })

    // Шаг 4. Оператор находит пациента.
    const picker = within(card).getByTestId('patient-picker')
    const options = within(picker).queryAllByTestId(/^patient-option-/)
    expect(options.length, 'в карточке нет ни одного пациента — записывать некого').toBeGreaterThan(0)
    fireEvent.click(options[0])

    // Шаг 5. Запись создаётся.
    const book = within(card).getByTestId('card-book')
    expect(book, 'кнопка «Записать» недоступна на свободном слоте').toBeEnabled()
    fireEvent.click(book)

    // Шаг 6. Эффект виден НА СЕРВЕРЕ, а не только в состоянии React.
    await waitFor(
      async () => {
        const after = await apiGet<AppointmentsResponse>(server, '/appointments')
        expect(after.items.length).toBe(before.items.length + 1)
      },
      { timeout: 5000 },
    )
  })
})
