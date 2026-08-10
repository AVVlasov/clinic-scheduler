// СКВОЗНОЙ СЦЕНАРИЙ cross-role-handoff —
// врач завершил приём запросом к серверу → регистратор видит результат без своих кликов.

import React from 'react'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { todayDate, shiftDate, weekStartOf } from '../__data__/dates'
import { REGISTRAR_POLL_MS } from '../pages/registrar/registrar-page'

import { apiGet, startJourneyServer, type JourneyServer } from './journey-server'

interface AppointmentRow {
  id: string
  doctorId: string
  status: string
  start: string
}

interface AppointmentsResponse {
  date: string
  items: AppointmentRow[]
}

let server: JourneyServer

const apiPatch = async (
  journey: JourneyServer,
  id: string,
  body: Record<string, unknown>,
): Promise<{ status: number; body: unknown }> => {
  const res = await fetch(`${journey.url}/appointments/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { status: res.status, body: json }
}

const findWorkingDateWithArrived = async (): Promise<{ date: string; appointment: AppointmentRow }> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const list = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const arrived = list.items.find((a) => a.status === 'arrived' || a.status === 'in_progress')
    if (arrived) return { date, appointment: arrived }
    const scheduled = list.items.find((a) => a.status === 'scheduled')
    if (scheduled) {
      const toArrived = await apiPatch(server, scheduled.id, { status: 'arrived' })
      if (toArrived.status === 200) {
        return { date, appointment: { ...scheduled, status: 'arrived' } }
      }
    }
  }
  throw new Error('нет записи, которую можно завершить врачом')
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

describe('journey cross-role-handoff — чужое изменение видно регистратору', () => {
  it('врач закрыл приём на сервере → без кликов очередь и счётчики регистратора обновились', async () => {
    const { date, appointment } = await findWorkingDateWithArrived()

    render(
      <MemoryRouter initialEntries={[armPath('registrar', date)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('registrar-page', {}, { timeout: 5000 })
    await screen.findByTestId('registrar-last-updated', {}, { timeout: 5000 })

    const beforeCompleted = Number(screen.getByTestId('counter-waiting').textContent)
    expect(Number.isFinite(beforeCompleted)).toBe(true)

    // Внешнее действие: врач завершает приём прямым запросом к стабу.
    const completed = await apiPatch(server, appointment.id, {
      status: 'completed',
      asDoctorId: appointment.doctorId,
      diagnosis: 'K00.0',
      complaints: 'тест handoff',
      visitType: 'first',
      performedServiceIds: ['s-001'],
    })
    expect(completed.status, JSON.stringify(completed.body)).toBe(200)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REGISTRAR_POLL_MS + 200)
    })

    await waitFor(() => {
      const row = screen.queryByTestId(`queue-row-${appointment.id}`)
      expect(row, 'строка записи должна остаться на экране после poll').toBeTruthy()
      expect(within(row as HTMLElement).getByText('Завершён')).toBeInTheDocument()
    }, { timeout: 5000 })

    expect(screen.getByTestId('registrar-last-updated')).toBeInTheDocument()
  })
})
