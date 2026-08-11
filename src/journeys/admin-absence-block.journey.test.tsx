// СКВОЗНОЙ СЦЕНАРИЙ admin-absence-block —
// администратор ставит отсутствие → слоты врача исчезают у оператора;
// записи отменяются и видны в /absences/:id/affected; праздник и типы занятости видны.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { shiftDate, todayDate, weekStartOf } from '../__data__/dates'

import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface ScheduleResponse {
  date: string
  holiday?: { name: string } | null
  slots: Array<{
    time: string
    doctors: Array<{
      id: string
      busy: boolean
      occupancyKind?: string | null
      occupancyLabel?: string | null
    }>
  }>
}

interface AppointmentsResponse {
  items: Array<{ id: string; doctorId: string; status: string; start: string }>
}

interface AffectedResponse {
  items: Array<{ id: string; status: string; cancelReason: string | null }>
}

let server: JourneyServer

const ACTIVE = new Set(['scheduled', 'arrived', 'in_progress'])

const findDoctorDayWithTwoActive = async (): Promise<{ doctorId: string; date: string; ids: string[] }> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 6; i += 1) {
    const date = shiftDate(start, i)
    const list = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const byDoctor = new Map<string, string[]>()
    for (const a of list.items) {
      if (!ACTIVE.has(a.status)) continue
      const arr = byDoctor.get(a.doctorId) ?? []
      arr.push(a.id)
      byDoctor.set(a.doctorId, arr)
    }
    for (const [doctorId, ids] of byDoctor) {
      if (ids.length >= 2) return { doctorId, date, ids: ids.slice(0, 2) }
    }
  }
  throw new Error('в демо-окне нет дня с ≥2 активными записями одного врача')
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

describe('journey admin-absence-block — отсутствие, занятость, праздник', () => {
  it(
    'админ ставит отсутствие: превью → подтверждение → слоты врача пусты, записи cancelled в affected',
    async () => {
      const { doctorId, date, ids } = await findDoctorDayWithTwoActive()

      const before = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
      const beforeCount = before.slots.reduce(
        (n, s) => n + s.doctors.filter((d) => d.id === doctorId).length,
        0,
      )
      expect(beforeCount, 'до отсутствия у врача должны быть слоты').toBeGreaterThan(0)

      render(
        <MemoryRouter initialEntries={[armPath('admin')]}>
          <Provider>
            <Dashboard />
          </Provider>
        </MemoryRouter>,
      )

      await screen.findByTestId('admin-page', {}, { timeout: 15000 })
      fireEvent.click(screen.getByTestId('section-absence-block'))
      const dialog = await screen.findByTestId('absence-dialog', {}, { timeout: 5000 })

      fireEvent.change(within(dialog).getByTestId('absence-doctor'), { target: { value: doctorId } })
      fireEvent.change(within(dialog).getByTestId('absence-date-from'), { target: { value: date } })
      fireEvent.change(within(dialog).getByTestId('absence-date-to'), { target: { value: date } })
      fireEvent.change(within(dialog).getByTestId('absence-reason'), { target: { value: 'vacation' } })

      await waitFor(() => {
        expect(within(dialog).getByTestId('absence-preview')).toHaveTextContent(/Под отмену попадёт записей/)
      })
      const previewText = within(dialog).getByTestId('absence-preview').textContent ?? ''
      const previewMatch = previewText.match(/(\d+)/)
      expect(Number(previewMatch?.[1] ?? 0)).toBeGreaterThanOrEqual(2)

      fireEvent.click(within(dialog).getByTestId('absence-apply'))
      await waitFor(() => {
        expect(within(dialog).getByTestId('absence-apply')).toHaveTextContent(/Да, отменить записи/)
      })
      fireEvent.click(within(dialog).getByTestId('absence-apply'))

      await waitFor(() => {
        expect(screen.queryByTestId('absence-dialog')).not.toBeInTheDocument()
      })
      await screen.findByTestId('absence-applied-notice')

      const after = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
      const afterCount = after.slots.reduce(
        (n, s) => n + s.doctors.filter((d) => d.id === doctorId).length,
        0,
      )
      expect(afterCount, 'после отсутствия слоты врача должны исчезнуть').toBe(0)

      // Внутреннего идентификатора отсутствия на экране быть не должно:
      // администратору нужно число отменённых и поимённый список, а не «abs-001».
      const notice = screen.getByTestId('absence-applied-notice').textContent ?? ''
      expect(notice).toMatch(/Отменено записей: \d+/)
      expect(notice).not.toMatch(/abs-\d+/)

      // Разбор показывается на экране, а не остаётся в маршруте, который никто не зовёт.
      const affectedList = await screen.findByTestId('absence-affected-list')
      const patients = await apiGet<{ items: Array<{ id: string; name: string }> }>(server, '/patients')
      const cancelledPatients = new Set(
        (await Promise.all(ids.map((id) => apiGet<{ patientId: string }>(server, `/appointments/${id}`))))
          .map((a) => patients.items.find((p) => p.id === a.patientId)?.name)
          .filter(Boolean) as string[],
      )
      expect(cancelledPatients.size).toBeGreaterThan(0)
      for (const name of cancelledPatients) {
        expect(affectedList.textContent ?? '').toContain(name)
      }

      for (const id of ids) {
        const row = await apiGet<AffectedResponse['items'][number]>(server, `/appointments/${id}`)
        expect(row.status).toBe('cancelled')
        expect(row.cancelReason).toMatch(/Отсутствие/)
      }
    },
    30000,
  )

  it('праздник холдинга: GET /schedule отдаёт holiday, оператор видит баннер а не пустоту', async () => {
    const sunday = shiftDate(weekStartOf(todayDate()), 6)
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${sunday}`)
    expect(schedule.holiday?.name).toBe('Праздник холдинга')
    expect(schedule.slots).toEqual([])

    render(
      <MemoryRouter initialEntries={[armPath('operator', sunday)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('operator-page', {}, { timeout: 15000 })
    const holiday = await screen.findByTestId('schedule-holiday', {}, { timeout: 5000 })
    expect(holiday).toHaveTextContent('Праздник холдинга')
    expect(screen.queryByTestId('operator-empty')).not.toBeInTheDocument()
  })

  it('типы занятости различимы не только цветом: appointment / blocked / tech_break', async () => {
    const monday = weekStartOf(todayDate())
    const wednesday = shiftDate(monday, 2)
    const thursday = shiftDate(monday, 3)

    const wed = await apiGet<ScheduleResponse>(server, `/schedule/${wednesday}`)
    const blocked = wed.slots.flatMap((s) => s.doctors).filter((d) => d.occupancyKind === 'blocked')
    expect(blocked.length).toBeGreaterThan(0)
    expect(blocked.every((d) => d.occupancyLabel === 'Блокировка')).toBe(true)

    const thu = await apiGet<ScheduleResponse>(server, `/schedule/${thursday}`)
    const breaks = thu.slots.flatMap((s) => s.doctors).filter((d) => d.occupancyKind === 'tech_break')
    expect(breaks.length).toBeGreaterThan(0)
    expect(breaks.every((d) => d.occupancyLabel === 'Перерыв')).toBe(true)

    const mon = await apiGet<ScheduleResponse>(server, `/schedule/${monday}`)
    const appts = mon.slots.flatMap((s) => s.doctors).filter((d) => d.occupancyKind === 'appointment')
    expect(appts.length).toBeGreaterThan(0)
    expect(appts.every((d) => d.occupancyLabel && d.occupancyLabel !== 'Блокировка' && d.occupancyLabel !== 'Перерыв')).toBe(true)

    const labels = new Set([
      ...appts.map((d) => d.occupancyLabel),
      ...blocked.map((d) => d.occupancyLabel),
      ...breaks.map((d) => d.occupancyLabel),
    ])
    expect(labels.has('Блокировка')).toBe(true)
    expect(labels.has('Перерыв')).toBe(true)
    expect(labels.size).toBeGreaterThanOrEqual(3)

    render(
      <MemoryRouter initialEntries={[armPath('operator', thursday)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )
    await screen.findByTestId('schedule-grid', {}, { timeout: 15000 })
    const breakCells = screen.getAllByTestId('busy-label').filter((el) => el.getAttribute('data-occupancy-label') === 'tech_break')
    expect(breakCells.length).toBeGreaterThan(0)
    expect(breakCells[0]).toHaveTextContent('Перерыв')
  })
})
