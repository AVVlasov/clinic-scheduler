// Сквозной сценарий: врач ведёт день scheduled → arrived → in_progress → completed.

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { URLs } from '../__data__/urls'
import { todayDate, shiftDate, weekStartOf, withArmDate } from '../__data__/dates'

import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface AppointmentsResponse {
  date: string
  items: Array<{ id: string; doctorId: string; start: string; status: string }>
}

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean }> }>
}

let server: JourneyServer

const findDoctorWithScheduled = async (): Promise<{ date: string; doctorId: string; appointmentId: string }> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const list = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const scheduled = list.items.find((a) => a.status === 'scheduled')
    if (scheduled) {
      return { date, doctorId: scheduled.doctorId, appointmentId: scheduled.id }
    }
  }
  // создаём запись, если в демо нет scheduled
  const date = todayDate()
  const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
  const free = schedule.slots
    .flatMap((s) => s.doctors.filter((d) => !d.busy).map((d) => ({ time: s.time, doctorId: d.id })))[0]
  if (!free) throw new Error('нет свободного слота для создания записи врача')
  const created = await apiPost<{ id: string; doctorId: string; status: string }>(server, '/appointments', {
    doctorId: free.doctorId,
    patientId: 'p-001',
    start: `${date}T${free.time}:00+03:00`,
    durationMin: 30,
    serviceId: 's-001',
  })
  expect(created.status).toBe(201)
  return { date, doctorId: created.body.doctorId, appointmentId: created.body.id }
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

describe('journey doctor-day-protocol — цепочка статусов врача', () => {
  it('врач проходит scheduled → arrived → in_progress → completed без ухода с экрана', async () => {
    const target = await findDoctorWithScheduled()

    render(
      <MemoryRouter initialEntries={[withArmDate(URLs.arms.doctor, target.date, target.doctorId)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('doctor-page', {}, { timeout: 5000 })

    // экран открывается на рабочей записи, а не на терминальной первой попавшейся
    await waitFor(() => {
      const badge = screen.getByTestId('visit-status-badge')
      expect(['Ожидает', 'Пришёл', 'На приёме']).toContain(badge.textContent)
    })

    fireEvent.click(screen.getByTestId(`day-visit-${target.appointmentId}`))

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Ожидает')
    })

    fireEvent.click(screen.getByTestId('visit-advance-status'))
    await waitFor(async () => {
      const appt = await apiGet<{ status: string }>(server, `/appointments/${target.appointmentId}`)
      expect(appt.status).toBe('arrived')
    })

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Пришёл')
    })

    fireEvent.click(screen.getByTestId('visit-advance-status'))
    await waitFor(async () => {
      const appt = await apiGet<{ status: string }>(server, `/appointments/${target.appointmentId}`)
      expect(appt.status).toBe('in_progress')
    })

    fireEvent.change(screen.getByTestId('visit-complaints'), {
      target: { value: 'Боль в горле' },
    })
    fireEvent.change(screen.getByTestId('visit-diagnosis'), {
      target: { value: 'J02 Острый фарингит' },
    })

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    await waitFor(() => expect(finish.disabled).toBe(false))
    fireEvent.click(finish)

    await waitFor(async () => {
      const appt = await apiGet<{ status: string }>(server, `/appointments/${target.appointmentId}`)
      expect(appt.status).toBe('completed')
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Завершён')
    })
  })
})
