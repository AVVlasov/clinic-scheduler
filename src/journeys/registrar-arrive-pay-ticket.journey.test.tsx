// Сквозной: регистратор отмечает приход, проводит оплату, печатает талон.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { todayDate, shiftDate, weekStartOf } from '../__data__/dates'

import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean }> }>
}

let server: JourneyServer

const seedAppointment = async (): Promise<{ date: string; id: string }> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
    const free = schedule.slots
      .flatMap((s) => s.doctors.filter((d) => !d.busy).map((d) => ({ time: s.time, doctorId: d.id })))[0]
    if (!free) continue
    const created = await apiPost<{ id: string }>(server, '/appointments', {
      doctorId: free.doctorId,
      patientId: 'p-001',
      start: `${date}T${free.time}:00+03:00`,
      durationMin: 30,
      serviceId: 's-001',
      paymentType: 'dms',
    })
    expect(created.status).toBe(201)
    return { date, id: created.body.id }
  }
  throw new Error('нет свободного слота')
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

describe('journey registrar-arrive-pay-ticket', () => {
  it('приход → оплата на сервере → талон на экране; касса растёт только после оплаты', async () => {
    const seed = await seedAppointment()

    render(
      <MemoryRouter initialEntries={[armPath('registrar', seed.date)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('registrar-page', {}, { timeout: 5000 })
    expect(screen.getByTestId('counter-cash')).toHaveTextContent('0 ₽')

    const row = await screen.findByTestId(`queue-row-${seed.id}`, {}, { timeout: 5000 })
    fireEvent.click(row)

    const card = await screen.findByTestId('visit-card')
    fireEvent.click(within(card).getByTestId('visit-primary-action'))

    await waitFor(async () => {
      const appt = await apiGet<{ status: string }>(server, `/appointments/${seed.id}`)
      expect(appt.status).toBe('arrived')
    }, { timeout: 5000 })

    fireEvent.click(within(card).getByTestId('visit-pay-button'))

    await waitFor(async () => {
      const appt = await apiGet<{ paidAt: string | null; paidAmount: number | null; paymentType: string }>(
        server,
        `/appointments/${seed.id}`,
      )
      expect(appt.paidAt).toBeTruthy()
      expect(appt.paidAmount).toBeGreaterThan(0)
      expect(appt.paymentType).toBe('dms')
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(screen.getByTestId('counter-cash').textContent).not.toBe('0 ₽')
    })

    fireEvent.click(within(card).getByTestId('visit-print-button'))
    const ticket = await screen.findByTestId('ticket-print')
    expect(within(ticket).getByTestId('ticket-patient')).toBeInTheDocument()
    expect(within(ticket).getByTestId('ticket-doctor')).toBeInTheDocument()
    expect(within(ticket).getByTestId('ticket-time')).toBeInTheDocument()
    expect(within(ticket).getByTestId('ticket-cabinet')).toBeInTheDocument()
    expect(within(ticket).getByTestId('ticket-service')).toBeInTheDocument()
  }, 20000)
})
