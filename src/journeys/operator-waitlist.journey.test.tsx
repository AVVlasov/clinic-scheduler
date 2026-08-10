// СКВОЗНОЙ СЦЕНАРИЙ operator-waitlist —
// оператор создаёт заявку, копирует, подбирает слот и закрывает записью;
// улучшение даты сохраняет страховочную запись; врач порождает заявку from_doctor.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { shiftDate, todayDate } from '../__data__/dates'

import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface WaitlistList {
  items: Array<{
    id: string
    kind: string
    status: string
    patientId: string
    insuranceAppointmentId: string | null
    fulfilledAppointmentId: string | null
  }>
  openCount: number
}

interface AppointmentsResponse {
  items: Array<{ id: string; patientId: string; status: string; serviceId: string | null }>
}

let server: JourneyServer

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-10T10:00:00'))
  server = await startJourneyServer()
  await apiPost(server, '/demo/reset', {})
})

afterEach(async () => {
  await server.close()
  vi.useRealTimers()
})

describe('journey operator-waitlist — заявка, подбор, страховочная, от врача', () => {
  it('оператор создаёт заявку, копирует, подбирает слот и закрывает записью', async () => {
    const date = todayDate()
    render(
      <MemoryRouter initialEntries={[armPath('operator', date)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('operator-page', {}, { timeout: 15000 })
    fireEvent.click(screen.getByTestId('section-waitlist'))
    await screen.findByTestId('waitlist-panel')

    fireEvent.click(screen.getByTestId('waitlist-new'))
    const form = await screen.findByTestId('waitlist-form')
    fireEvent.change(within(form).getByTestId('waitlist-kind'), { target: { value: 'nearest' } })
    fireEvent.change(within(form).getByTestId('waitlist-patient'), { target: { value: 'p-001' } })
    fireEvent.change(within(form).getByTestId('waitlist-service'), { target: { value: 's-001' } })
    fireEvent.change(within(form).getByTestId('waitlist-date-from'), { target: { value: date } })
    fireEvent.change(within(form).getByTestId('waitlist-date-to'), { target: { value: shiftDate(date, 2) } })
    fireEvent.change(within(form).getByTestId('waitlist-comment'), { target: { value: 'нужен слот' } })
    fireEvent.click(within(form).getByTestId('waitlist-submit'))

    await waitFor(async () => {
      const list = await apiGet<WaitlistList>(server, '/waitlist?status=open')
      expect(list.openCount).toBeGreaterThanOrEqual(1)
      expect(list.items.some((w) => w.kind === 'nearest')).toBe(true)
    })

    await screen.findByTestId('waitlist-open-count')
    const row = await screen.findByTestId(/^waitlist-row-W-/)
    fireEvent.click(row)

    fireEvent.click(screen.getByTestId('waitlist-copy'))
    await waitFor(async () => {
      const list = await apiGet<WaitlistList>(server, '/waitlist')
      expect(list.items.filter((w) => w.kind === 'nearest').length).toBeGreaterThanOrEqual(2)
    })

    fireEvent.click(screen.getByTestId('waitlist-match'))
    const matches = await screen.findByTestId('waitlist-matches', {}, { timeout: 5000 })
    const bookBtn = within(matches).getAllByTestId(/^waitlist-book-/)[0]
    fireEvent.click(bookBtn)

    await waitFor(async () => {
      const list = await apiGet<WaitlistList>(server, '/waitlist')
      const fulfilled = list.items.filter((w) => w.status === 'fulfilled')
      expect(fulfilled.length).toBeGreaterThanOrEqual(1)
      expect(fulfilled[0].fulfilledAppointmentId).toBeTruthy()
    })
  }, 40000)

  it('улучшение даты: страховочная запись остаётся, заявка ссылается на неё', async () => {
    const date = todayDate()
    const appts = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const active = appts.items.find((a) => a.status === 'scheduled' || a.status === 'arrived')
    expect(active).toBeTruthy()

    const created = await apiPost<{ id: string; insuranceAppointmentId: string | null; status: string }>(
      server,
      '/waitlist',
      {
        kind: 'reschedule',
        patientId: active!.patientId,
        serviceId: active!.serviceId || 's-001',
        dateFrom: date,
        dateTo: date,
        insuranceAppointmentId: active!.id,
        comment: 'улучшение',
      },
    )
    expect(created.status).toBe(201)
    expect(created.body.insuranceAppointmentId).toBe(active!.id)

    const appt = await apiGet<{ id: string; status: string; insuranceForWaitlistId?: string }>(
      server,
      `/appointments/${active!.id}`,
    )
    expect(appt.status).toBe(active!.status)
    expect(appt.insuranceForWaitlistId).toBe(created.body.id)
  })

  it('четыре типа фильтруются; заявка от врача видна оператору', async () => {
    const date = todayDate()
    for (const kind of ['from_doctor', 'distant', 'reschedule', 'nearest'] as const) {
      const r = await apiPost(server, '/waitlist', {
        kind,
        patientId: 'p-002',
        doctorId: 'd-001',
        dateFrom: date,
        dateTo: date,
        createdBy: kind === 'from_doctor' ? 'doctor' : 'operator',
      })
      expect(r.status).toBe(201)
    }

    const fromDoctor = await apiGet<WaitlistList>(server, '/waitlist?kind=from_doctor')
    expect(fromDoctor.items.length).toBe(1)
    expect(fromDoctor.items[0].kind).toBe('from_doctor')

    render(
      <MemoryRouter initialEntries={[armPath('operator', date)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )
    await screen.findByTestId('operator-page', {}, { timeout: 15000 })
    fireEvent.click(screen.getByTestId('section-waitlist'))
    await screen.findByTestId('waitlist-panel')
    fireEvent.click(screen.getByTestId('waitlist-filter-from_doctor'))
    await waitFor(() => {
      const rows = screen.getAllByTestId(/^waitlist-row-/)
      expect(rows.every((r) => r.getAttribute('data-kind') === 'from_doctor')).toBe(true)
    })
  })
})
