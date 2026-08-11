// СКВОЗНОЙ СЦЕНАРИЙ admin-publish-week —
// администратор правит шаблон, публикует неделю → у оператора появляется сетка.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { shiftDate, todayDate, weekStartOf } from '../__data__/dates'

import { apiGet, apiPatch, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface WeekTemplatesResponse {
  weekStart: string
  published: boolean
  days: Array<{ date: string }>
  rows: Array<{
    doctorId: string
    days: Array<{ date: string; intervals: Array<{ start: string; end: string; kind: string }> }>
  }>
}

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string }> }>
}

interface PublishResult {
  weekStart: string
  slotsCreated: number
  doctorsAffected: number
}

let server: JourneyServer

const findUnpublishedWeek = async (): Promise<string> => {
  const current = weekStartOf(todayDate())
  for (let i = 2; i <= 8; i += 1) {
    const ws = shiftDate(current, 7 * i)
    const tpl = await apiGet<WeekTemplatesResponse>(server, `/week-templates?weekStart=${ws}`)
    if (!tpl.published) return ws
  }
  const fallback = shiftDate(current, 14)
  await apiPost(server, '/week-templates/unpublish', { weekStart: fallback })
  return fallback
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

describe('journey admin-publish-week — правка шаблона → публикация → сетка оператора', () => {
  it(
    'после правки интервала и публикации GET /schedule отдаёт другое число слотов, оператор видит день',
    async () => {
      const weekStart = await findUnpublishedWeek()
      const beforeTpl = await apiGet<WeekTemplatesResponse>(
        server,
        `/week-templates?weekStart=${weekStart}`,
      )
      const doctorId = beforeTpl.rows[0].doctorId
      const monday = beforeTpl.days[0].date

      // замерим слоты «как было бы» на дефолтном шаблоне: сначала опубликуем соседнюю
      // контрольную неделю без правок не трогаем — сравниваем monday до/после правки на сервере
      const patch = await apiPatch<WeekTemplatesResponse>(server, '/week-templates/interval', {
        weekStart,
        doctorId,
        date: monday,
        intervals: [{ start: '09:00', end: '09:30', kind: 'work' }],
      })
      expect(patch.status).toBe(200)

      for (const row of beforeTpl.rows) {
        if (row.doctorId === doctorId) continue
        const r = await apiPatch(server, '/week-templates/interval', {
          weekStart,
          doctorId: row.doctorId,
          date: monday,
          intervals: [{ start: '00:00', end: '00:00', kind: 'off' }],
        })
        expect(r.status).toBe(200)
      }

      const publish = await apiPost<PublishResult>(server, '/week-templates/publish', { weekStart })
      expect(publish.status).toBe(200)
      expect(publish.body.slotsCreated).toBeGreaterThan(0)

      const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${monday}`)
      const doctorPairs = schedule.slots.reduce((acc, s) => acc + s.doctors.length, 0)
      expect(doctorPairs).toBe(2)
      expect(schedule.slots.some((s) => s.doctors.some((d) => d.id === doctorId))).toBe(true)

      let weekSum = 0
      for (const day of beforeTpl.days) {
        const daySched = await apiGet<ScheduleResponse>(server, `/schedule/${day.date}`)
        weekSum += daySched.slots.reduce((acc, s) => acc + s.doctors.length, 0)
      }
      expect(weekSum).toBe(publish.body.slotsCreated)

      render(
        <MemoryRouter initialEntries={[armPath('operator', monday)]}>
          <Provider>
            <Dashboard />
          </Provider>
        </MemoryRouter>,
      )

      await screen.findByTestId('operator-page', {}, { timeout: 15000 })
      expect(screen.getByTestId('operator-page')).toHaveAttribute('data-date', monday)
      await waitFor(() => {
        expect(screen.getAllByTestId(/^slot-/).length).toBeGreaterThan(0)
      }, { timeout: 15000 })
    },
    30000,
  )

  it(
    'админский экран: ячейка открывает редактор, сохранение переживает перезагрузку',
    async () => {
      const weekStart = await findUnpublishedWeek()
      const current = weekStartOf(todayDate())
      const weeksAhead = Math.round(
        (new Date(`${weekStart}T00:00:00`).getTime() - new Date(`${current}T00:00:00`).getTime())
        / (7 * 24 * 3600 * 1000),
      )

      render(
        <MemoryRouter initialEntries={[armPath('admin')]}>
          <Provider>
            <Dashboard />
          </Provider>
        </MemoryRouter>,
      )

      await screen.findByTestId('admin-page', {}, { timeout: 15000 })
      await screen.findByTestId('week-next', {}, { timeout: 15000 })

      for (let i = 0; i < weeksAhead; i += 1) {
        fireEvent.click(screen.getByTestId('week-next'))
        await waitFor(() => {
          expect(screen.getByTestId('week-current').getAttribute('data-week-start')).toBe(
            shiftDate(current, 7 * (i + 1)),
          )
        }, { timeout: 15000 })
      }
      expect(screen.getByTestId('week-current')).toHaveAttribute('data-week-start', weekStart)

      const tpl = await apiGet<WeekTemplatesResponse>(server, `/week-templates?weekStart=${weekStart}`)
      const doctorId = tpl.rows[0].doctorId
      const date = tpl.days[0].date
      const cell = await screen.findByTestId(`tpl-cell-${doctorId}-${date}`)
      fireEvent.click(cell)

      const editor = await screen.findByTestId('interval-editor')
      fireEvent.change(within(editor).getByTestId('interval-kind'), { target: { value: 'work' } })
      fireEvent.change(within(editor).getByTestId('interval-start'), { target: { value: '11:00' } })
      fireEvent.change(within(editor).getByTestId('interval-end'), { target: { value: '12:00' } })
      fireEvent.click(within(editor).getByTestId('interval-save'))

      await waitFor(() => {
        expect(screen.queryByTestId('interval-editor')).not.toBeInTheDocument()
      }, { timeout: 15000 })
      expect(cell).toHaveTextContent('11:00–12:00')

      const reloaded = await apiGet<WeekTemplatesResponse>(
        server,
        `/week-templates?weekStart=${weekStart}`,
      )
      const saved = reloaded.rows.find((r) => r.doctorId === doctorId)?.days[0].intervals[0]
      expect(saved).toEqual({ start: '11:00', end: '12:00', kind: 'work' })
    },
    30000,
  )
})
