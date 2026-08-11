// Сквозной сценарий: оператор переносит запись и отменяет её — эффект на сервере.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import type { Schedule } from '../__data__/types'
import { todayDate, weekDates, weekStartOf } from '../__data__/dates'

import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'
import { findDateWithFreeCells, findFreeCells, findFreePatient } from './free-slot'

interface AppointmentsResponse {
  date: string
  items: Array<{
    id: string
    doctorId: string
    start: string
    status: string
    cancelReason?: string | null
    cancelledBy?: string | null
  }>
}

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean; appointmentId?: string }> }>
}

interface HistoryResponse {
  items: Array<{ from: string | null; to: string; actor: string; at: string }>
}

let server: JourneyServer

const seedBusyAndFree = async (): Promise<{
  date: string
  appointmentId: string
  doctorId: string
  time: string
  freeDoctorId: string
  freeTime: string
}> => {
  // Два свободных окна на всю длительность записи: первое занимаем своей
  // записью, второе служит целью переноса.
  const { date, cells } = await findDateWithFreeCells(server, weekStartOf(todayDate()), 2, 30)
  const [first, second] = cells
  const created = await apiPost<{ id: string; doctorId: string; start: string }>(server, '/appointments', {
    doctorId: first.doctorId,
    patientId: await findFreePatient(server, date, first.time, 30),
    start: `${date}T${first.time}:00+03:00`,
    durationMin: 30,
    serviceId: 's-001',
  })
  expect(created.status).toBe(201)
  return {
    date,
    appointmentId: created.body.id,
    doctorId: first.doctorId,
    time: first.time,
    freeDoctorId: second.doctorId,
    freeTime: second.time,
  }
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

describe('journey operator-reschedule — перенос и отмена на сервере', () => {
  it('из режима переноса есть выход без создания записи', async () => {
    const slots = await seedBusyAndFree()
    renderOperator(slots.date)

    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 10000 })
    fireEvent.click(within(grid).getByTestId(`slot-${slots.doctorId}-${slots.time}`))

    await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    fireEvent.click(within(grid).getByTestId(`slot-${slots.freeDoctorId}-${slots.freeTime}`))

    await waitFor(() => {
      expect(screen.getByTestId('card-clear-reschedule')).toBeInTheDocument()
    }, { timeout: 5000 })

    const before = await apiGet<AppointmentsResponse>(server, `/appointments?date=${slots.date}`)
    fireEvent.click(screen.getByTestId('card-clear-reschedule'))

    await waitFor(() => {
      expect(screen.queryByTestId('card-clear-reschedule')).toBeNull()
    })

    const after = await apiGet<AppointmentsResponse>(server, `/appointments?date=${slots.date}`)
    expect(after.items.length).toBe(before.items.length)
  }, 20000)

  it('перенос в режиме «Неделя» попадает в выбранный день, а не в исходный', async () => {
    // Сценарий заказчика: «перенесите пациента со вторника на четверг». Карточка
    // собирала момент из даты ИСХОДНОЙ записи, подсветка при этом вставала на
    // выбранный день — интерфейс выглядел правильным, а пациент уезжал не туда.
    const source = await seedBusyAndFree()

    // Цель ищем внутри ТОЙ ЖЕ недели: в режиме «Неделя» на экране только её дни.
    let otherDay: { date: string; cells: Array<{ doctorId: string; time: string }> } | null = null
    for (const day of weekDates(source.date)) {
      if (day === source.date) continue
      const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${day}`)
      const cells = findFreeCells(schedule as unknown as Schedule, 1, 30)
      if (cells.length > 0) {
        otherDay = { date: day, cells }
        break
      }
    }
    expect(otherDay, 'в неделе нет второго дня со свободным окном').toBeTruthy()
    const targetCell = otherDay!.cells[0]

    renderOperator(source.date)
    const rangeTabs = await screen.findByTestId('operator-range', {}, { timeout: 10000 })
    fireEvent.click(within(rangeTabs).getByText('Неделя'))

    // В режиме «Неделя» сеток семь — исходный слот берём из своего дня.
    const sourceDayGrid = await screen.findByTestId(`schedule-day-${source.date}`, {}, { timeout: 15000 })
    fireEvent.click(await within(sourceDayGrid).findByTestId(`slot-${source.doctorId}-${source.time}`))
    await screen.findByTestId('slot-card', {}, { timeout: 5000 })

    const targetDayGrid = await screen.findByTestId(`schedule-day-${otherDay!.date}`, {}, { timeout: 10000 })
    fireEvent.click(within(targetDayGrid).getByTestId(`slot-${targetCell.doctorId}-${targetCell.time}`))

    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    fireEvent.click(await within(card).findByTestId('card-reschedule'))

    await waitFor(async () => {
      const moved = await apiGet<{ id: string; start: string; doctorId: string }>(
        server,
        `/appointments/${source.appointmentId}`,
      )
      expect(moved.start.slice(0, 10), 'запись уехала не в тот день').toBe(otherDay!.date)
      expect(moved.start.slice(11, 16)).toBe(targetCell.time)
      expect(moved.doctorId).toBe(targetCell.doctorId)
    }, { timeout: 10000 })

    const sourceDay = await apiGet<AppointmentsResponse>(server, `/appointments?date=${source.date}`)
    expect(sourceDay.items.some((a) => a.id === source.appointmentId)).toBe(false)
  }, 90000)

  it('оператор отменяет запись — слот свободен, причина и история на сервере', async () => {
    const slots = await seedBusyAndFree()
    renderOperator(slots.date)

    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 10000 })
    fireEvent.click(within(grid).getByTestId(`slot-${slots.doctorId}-${slots.time}`))

    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    fireEvent.change(within(card).getByTestId('cancel-reason'), {
      target: { value: 'Пациент отказался' },
    })
    fireEvent.click(within(card).getByTestId('card-cancel'))
    fireEvent.click(within(card).getByTestId('card-cancel'))

    await waitFor(async () => {
      const appt = await apiGet<{
        id: string
        status: string
        cancelReason: string | null
        cancelledBy: string | null
      }>(server, `/appointments/${slots.appointmentId}`)
      expect(appt.status).toBe('cancelled')
      expect(appt.cancelReason).toBe('Пациент отказался')
      expect(appt.cancelledBy).toBe('operator')
    }, { timeout: 10000 })

    const history = await apiGet<HistoryResponse>(server, `/appointments/${slots.appointmentId}/history`)
    expect(history.items.length).toBeGreaterThanOrEqual(2)
    expect(history.items.some((h) => h.to === 'cancelled')).toBe(true)

    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${slots.date}`)
    const slot = schedule.slots.find((s) => s.time === slots.time)
    const doctor = slot?.doctors.find((d) => d.id === slots.doctorId)
    expect(doctor?.busy, 'после отмены слот должен освободиться').toBe(false)
  }, 20000)
})
