// СКВОЗНОЙ СЦЕНАРИЙ operator-book-by-service — запись «от услуги».
// Мока API нет: живые стабы + клики по экрану.

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
  items: Array<{ id: string; doctorId: string; patientId: string; start: string; serviceId: string | null }>
}

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean }> }>
}

interface ServicesResponse {
  items: Array<{ id: string; name: string; doctorIds: string[] }>
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

const findBookableDateForDoctors = async (doctorIds: string[]): Promise<string> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
    const free = schedule.slots.some((slot) =>
      slot.doctors.some((d) => doctorIds.includes(d.id) && !d.busy),
    )
    if (free) return date
  }
  throw new Error(`нет свободного слота у врачей ${doctorIds.join(',')}`)
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

describe('journey operator-book-by-service — запись от услуги', () => {
  it('поиск услуги сужает сетку до врачей, оказывающих услугу, и запись создаётся', async () => {
    const services = await apiGet<ServicesResponse>(server, '/services')
    const ecg = services.items.find((s) => s.id === 's-003')
    expect(ecg, 'в справочнике нет ЭКГ s-003').toBeTruthy()
    expect(ecg!.doctorIds).toHaveLength(2)

    const date = await findBookableDateForDoctors(ecg!.doctorIds)
    renderOperator(date)

    const picker = await screen.findByTestId('service-picker', {}, { timeout: 8000 })
    const search = within(picker).getByTestId('service-picker-search')
    fireEvent.change(search, { target: { value: 'ЭКГ' } })
    fireEvent.click(within(picker).getByTestId('service-option-s-003'))

    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 8000 })
    await waitFor(() => {
      expect(grid).toHaveAttribute('data-doctor-count', '2')
    }, { timeout: 5000 })

    const freeSlots = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .filter((el) => el.getAttribute('data-busy') === 'false' && el.getAttribute('data-working') === 'true')
    expect(freeSlots.length, 'нет свободных слотов у врачей ЭКГ').toBeGreaterThan(0)

    const before = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    fireEvent.click(freeSlots[0])

    const card = await screen.findByTestId('slot-card', {}, { timeout: 8000 })
    expect(within(card).getByTestId('card-service')).toHaveValue('s-003')
    expect(within(card).getByTestId('card-service')).toBeDisabled()

    const options = within(card).queryAllByTestId(/^patient-option-/)
    expect(options.length).toBeGreaterThan(0)
    fireEvent.click(options[0])

    const book = within(card).getByTestId('card-book')
    await waitFor(() => expect(book).toBeEnabled(), { timeout: 5000 })
    fireEvent.click(book)

    await waitFor(
      async () => {
        const after = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
        expect(after.items.length).toBe(before.items.length + 1)
        const created = after.items.find((a) => !before.items.some((b) => b.id === a.id))
        expect(created?.serviceId).toBe('s-003')
        expect(ecg!.doctorIds).toContain(created!.doctorId)
      },
      { timeout: 10000 },
    )
  }, 30000)

  it('вход «от слота» по-прежнему открывает ту же карточку записи', async () => {
    const date = await findBookableDate()
    renderOperator(date)

    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 5000 })
    const freeSlots = within(grid).queryAllByTestId(/^slot-d-\d+-\d{2}:\d{2}$/)
      .filter((el) => el.getAttribute('data-busy') === 'false' && el.getAttribute('data-working') === 'true')
    expect(freeSlots.length).toBeGreaterThan(0)
    fireEvent.click(freeSlots[0])

    const card = await screen.findByTestId('slot-card', {}, { timeout: 5000 })
    expect(within(card).getByTestId('card-book')).toBeInTheDocument()
    expect(within(card).getByTestId('patient-picker')).toBeInTheDocument()
    expect(within(card).getByTestId('card-service')).not.toBeDisabled()
  }, 15000)

  it('сервер отклоняет запись услуги к врачу без компетенции', async () => {
    const date = await findBookableDate()
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
    const forbiddenDoctor = 'd-001'
    const free = schedule.slots.find((s) => s.doctors.some((d) => d.id === forbiddenDoctor && !d.busy))
    expect(free, 'нет свободного слота у d-001').toBeTruthy()

    const res = await apiPost<{ error?: string }>(server, '/appointments', {
      doctorId: forbiddenDoctor,
      patientId: 'p-001',
      start: `${date}T${free!.time}:00+03:00`,
      durationMin: 15,
      serviceId: 's-003',
    })
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('service_not_offered')
  })
})
