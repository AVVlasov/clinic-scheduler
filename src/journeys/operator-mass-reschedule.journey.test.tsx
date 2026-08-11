// СКВОЗНОЙ СЦЕНАРИЙ operator-mass-reschedule —
// оператор сносит день врача, видит пострадавших, перезаписывает одного, выгружает список.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { todayDate } from '../__data__/dates'

import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface AppointmentsResponse {
  items: Array<{ id: string; doctorId: string; status: string; patientId: string }>
}

interface MassBatch {
  id: string
  pendingCount: number
  items: Array<{
    id: string
    handlingStatus: string
    patientName: string | null
    originalStart: string
    newStart: string | null
  }>
}

let server: JourneyServer

const findDoctorWithTwo = async (): Promise<{ doctorId: string; date: string }> => {
  const date = todayDate()
  const list = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
  const byDoctor = new Map<string, number>()
  for (const a of list.items) {
    if (!['scheduled', 'arrived', 'in_progress'].includes(a.status)) continue
    byDoctor.set(a.doctorId, (byDoctor.get(a.doctorId) ?? 0) + 1)
  }
  for (const [doctorId, n] of byDoctor) {
    if (n >= 2) return { doctorId, date }
  }
  throw new Error('нет врача с ≥2 активными записями на сегодня')
}

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

describe('journey operator-mass-reschedule — снос и разбор пострадавших', () => {
  it('превью → снос → перезапись одной → счётчик 1 → выгрузка', async () => {
    const { doctorId, date } = await findDoctorWithTwo()

    render(
      <MemoryRouter initialEntries={[armPath('operator', date)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('operator-page', {}, { timeout: 15000 })
    fireEvent.click(screen.getByTestId('arm-nav-mass-reschedule'))
    const panel = await screen.findByTestId('mass-reschedule-panel')

    fireEvent.change(within(panel).getByTestId('mass-doctor'), { target: { value: doctorId } })
    fireEvent.change(within(panel).getByTestId('mass-date-from'), { target: { value: date } })
    fireEvent.change(within(panel).getByTestId('mass-date-to'), { target: { value: date } })

    await waitFor(() => {
      expect(within(panel).getByTestId('mass-preview')).toHaveTextContent(/Записей под отмену/)
    })
    const previewText = within(panel).getByTestId('mass-preview').textContent ?? ''
    const n = Number((previewText.match(/(\d+)/) || [])[1] ?? 0)
    expect(n).toBeGreaterThanOrEqual(2)

    fireEvent.click(within(panel).getByTestId('mass-apply'))
    await waitFor(() => {
      expect(within(panel).getByTestId('mass-apply')).toHaveTextContent(/Подтвердить необратимо/)
    })
    fireEvent.click(within(panel).getByTestId('mass-apply'))

    await screen.findByTestId('mass-pending-count', {}, { timeout: 10000 })
    const pendingBefore = Number(
      (screen.getByTestId('mass-pending-count').textContent || '').match(/(\d+)/)?.[1] ?? 0,
    )
    expect(pendingBefore).toBeGreaterThanOrEqual(2)

    const items = screen.getAllByTestId(/^mass-item-/)
    const pendingItem = items.find((el) => el.getAttribute('data-handling') === 'pending')
    expect(pendingItem).toBeTruthy()
    fireEvent.click(pendingItem!)

    const bookBtns = await screen.findAllByTestId(/^mass-book-/, {}, { timeout: 5000 })
    expect(bookBtns.length).toBeGreaterThan(0)
    fireEvent.click(bookBtns[0])

    await waitFor(() => {
      const pendingAfter = Number(
        (screen.getByTestId('mass-pending-count').textContent || '').match(/(\d+)/)?.[1] ?? -1,
      )
      expect(pendingAfter).toBe(pendingBefore - 1)
    })

    const rescheduled = screen.getAllByTestId(/^mass-item-/).find(
      (el) => el.getAttribute('data-handling') === 'rescheduled',
    )
    expect(rescheduled).toBeTruthy()
    expect(within(rescheduled!).getByText(/Новое время:/)).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('mass-export'))
    await screen.findByTestId('mass-export-note')
    expect(screen.getByTestId('mass-export-note')).toHaveTextContent(/Выгрузка/)
  }, 45000)

  it('сервер: после сноса записи cancelled и видны в batch', async () => {
    const { doctorId, date } = await findDoctorWithTwo()
    const before = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const ids = before.items
      .filter((a) => a.doctorId === doctorId && ['scheduled', 'arrived', 'in_progress'].includes(a.status))
      .map((a) => a.id)
    expect(ids.length).toBeGreaterThanOrEqual(2)

    const created = await apiPost<MassBatch>(server, '/mass-cancel', {
      doctorId,
      dateFrom: date,
      dateTo: date,
      reason: 'Снос для теста',
    })
    expect(created.status).toBe(201)
    expect(created.body.pendingCount).toBe(ids.length)

    for (const id of ids) {
      const a = await apiGet<{ status: string; cancelReason: string | null }>(server, `/appointments/${id}`)
      expect(a.status).toBe('cancelled')
      expect(a.cancelReason).toMatch(/Снос/)
    }
  })
})
