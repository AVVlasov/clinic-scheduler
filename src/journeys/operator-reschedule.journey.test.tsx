// Сквозной сценарий: оператор переносит запись и отменяет её — эффект на сервере.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { todayDate, shiftDate, weekStartOf } from '../__data__/dates'

import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

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

const seedBusyAndFree = async (): Promise<{
  date: string
  appointmentId: string
  doctorId: string
  time: string
  freeDoctorId: string
  freeTime: string
}> => {
  const date = await findBookableDate()
  const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
  const freeCells = schedule.slots.flatMap((slot) =>
    slot.doctors.filter((d) => !d.busy).map((d) => ({ time: slot.time, doctorId: d.id })),
  )
  if (freeCells.length < 2) {
    throw new Error('нужно минимум два свободных слота: один занять, второй — цель переноса')
  }
  const [first, second] = freeCells
  const created = await apiPost<{ id: string; doctorId: string; start: string }>(server, '/appointments', {
    doctorId: first.doctorId,
    patientId: 'p-001',
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
