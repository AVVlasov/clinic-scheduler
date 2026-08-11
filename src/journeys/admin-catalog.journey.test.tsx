// СКВОЗНОЙ СЦЕНАРИЙ admin-catalog — справочники площадки управляют записью.
//
// Три экрана администратора (оборудование, матрица компетенций, правила
// длительности) закрывают пробелы MUST HAVE карты MVP. Проверять их составом
// разметки бессмысленно: экран справочника ценен только тем, что меняет
// поведение записи. Мока API нет — живые стабы, клики по экрану, эффект
// читается запросом к серверу.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { URLs } from '../__data__/urls'
import { todayDate, shiftDate, weekStartOf } from '../__data__/dates'

import { findFreePatient } from './free-slot'
import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean }> }>
}

interface ServicesResponse {
  items: Array<{ id: string; name: string; doctorIds: string[]; limitedDoctorIds?: string[] }>
}

interface EquipmentDayResponse {
  items: Array<{
    id: string
    name: string
    slots: Array<{ time: string; state: string; appointmentId?: string }>
  }>
}

interface AppointmentsResponse {
  date: string
  items: Array<{ id: string; doctorId: string; durationMin: number; serviceId: string | null; start: string }>
}

let server: JourneyServer

/** День и время, свободные сразу у двух врачей: спор должен идти о ресурсе, а не о смене. */
/**
 * Общее свободное окно на всю длительность записи и при свободном аппарате.
 * Одна свободная ячейка ничего не обещает: шаг сетки 15 минут, запись длится 30,
 * а аппарат — второй ресурс, и занятость его у третьего врача даст законный 409,
 * из-за которого сценарий спорил бы не о том, о чём написан.
 */
const findSharedFreeSlot = async (doctorIds: string[], minutes = 30, serviceId?: string) => {
  const start = weekStartOf(todayDate())
  const needed = Math.ceil(minutes / 15)
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
    const appts = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    for (let k = 0; k + needed <= schedule.slots.length; k += 1) {
      const window = schedule.slots.slice(k, k + needed)
      const allFree = doctorIds.every((id) => window.every((s) => {
        const doc = s.doctors.find((d) => d.id === id)
        return doc != null && !doc.busy
      }))
      if (!allFree) continue
      if (serviceId) {
        const startMs = new Date(`${date}T${schedule.slots[k].time}:00+03:00`).getTime()
        const endMs = startMs + minutes * 60000
        const equipmentBusy = appts.items.some((a) => a.serviceId === serviceId
          && a.status !== 'cancelled' && a.status !== 'no_show'
          && new Date(a.start).getTime() < endMs
          && new Date(a.start).getTime() + (a.durationMin ?? 0) * 60000 > startMs)
        if (equipmentBusy) continue
      }
      return { date, time: schedule.slots[k].time }
    }
  }
  throw new Error(`нет общего свободного окна у врачей ${doctorIds.join(',')}`)
}

const findFreeSlotFor = async (doctorId: string) => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
    const slot = schedule.slots.find((s) => {
      const doc = s.doctors.find((d) => d.id === doctorId)
      return doc && !doc.busy
    })
    if (slot) return { date, time: slot.time }
  }
  throw new Error(`нет свободного слота у врача ${doctorId}`)
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

const renderAdmin = (section: string) =>
  render(
    <MemoryRouter initialEntries={[`${URLs.arms.admin}?section=${section}`]}>
      <Provider>
        <Dashboard />
      </Provider>
    </MemoryRouter>,
  )

describe('journey admin-catalog — справочники площадки управляют записью', () => {
  it('матрица компетенций: снятый допуск закрывает запись к врачу', async () => {
    const before = await apiGet<ServicesResponse>(server, '/services')
    const ecgBefore = before.items.find((s) => s.id === 's-003')
    expect(ecgBefore?.doctorIds).toContain('d-002')

    const slot = await findFreeSlotFor('d-002')

    renderAdmin('matrix')
    const cell = await screen.findByTestId('matrix-cell-d-002-s-003', {}, { timeout: 8000 })
    expect(cell).toHaveAttribute('data-value', 'yes')

    // ✓ → ! → ·: два клика снимают допуск полностью.
    fireEvent.click(cell)
    await waitFor(() => {
      expect(screen.getByTestId('matrix-cell-d-002-s-003')).toHaveAttribute('data-value', 'limited')
    }, { timeout: 5000 })
    fireEvent.click(screen.getByTestId('matrix-cell-d-002-s-003'))
    await waitFor(() => {
      expect(screen.getByTestId('matrix-cell-d-002-s-003')).toHaveAttribute('data-value', 'no')
    }, { timeout: 5000 })

    const after = await apiGet<ServicesResponse>(server, '/services')
    expect(after.items.find((s) => s.id === 's-003')?.doctorIds).not.toContain('d-002')

    const booking = await apiPost<{ error?: string }>(server, '/appointments', {
      doctorId: 'd-002',
      patientId: 'p-001',
      start: `${slot.date}T${slot.time}:00+03:00`,
      durationMin: 15,
      serviceId: 's-003',
    })
    expect(booking.status).toBe(409)
    expect(booking.body.error).toBe('service_not_offered')
  })

  it('правила длительности: выключенное правило меняет длительность новой записи', async () => {
    const slot = await findFreeSlotFor('d-001')

    renderAdmin('duration-rules')
    await screen.findByTestId('duration-screen', {}, { timeout: 8000 })

    // Проверка расчёта на экране администратора: первичный приём — 60 минут.
    const preview = await screen.findByTestId('duration-preview', {}, { timeout: 8000 })
    fireEvent.change(within(preview).getByTestId('duration-service'), { target: { value: 's-001' } })
    fireEvent.change(within(preview).getByTestId('duration-visit-type'), { target: { value: 'first' } })
    await waitFor(() => {
      expect(screen.getByTestId('duration-total')).toHaveTextContent('60 мин')
    })

    fireEvent.click(screen.getByTestId('duration-toggle-dr-visit-first'))
    await waitFor(() => {
      expect(screen.getByTestId('duration-rule-dr-visit-first')).toHaveAttribute('data-enabled', 'false')
    }, { timeout: 5000 })
    await waitFor(() => {
      expect(screen.getByTestId('duration-total')).toHaveTextContent('30 мин')
    })

    // Оператор записывает того же первичного пациента — длительность считает тот же расчёт.
    render(
      <MemoryRouter initialEntries={[armPath('operator', slot.date)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )
    const grid = await screen.findByTestId('schedule-grid', {}, { timeout: 15000 })
    fireEvent.click(within(grid).getByTestId(`slot-d-001-${slot.time}`))

    const card = await screen.findByTestId('slot-card', {}, { timeout: 8000 })
    fireEvent.change(within(card).getByTestId('card-service'), { target: { value: 's-001' } })
    fireEvent.click(within(card).getByTestId('card-visit-first'))
    await waitFor(() => {
      expect(within(card).getByTestId('card-duration-note')).toHaveTextContent('30 мин')
    })
    fireEvent.click(within(card).getByTestId('patient-option-p-002'))
    fireEvent.click(within(card).getByTestId('card-book'))

    await waitFor(async () => {
      const appts = await apiGet<AppointmentsResponse>(server, `/appointments?date=${slot.date}`)
      const created = appts.items.find(
        (a) => a.doctorId === 'd-001' && a.start.slice(11, 16) === slot.time,
      )
      expect(created, 'запись не создалась').toBeTruthy()
      expect(created?.durationMin).toBe(30)
    }, { timeout: 10000 })
  })

  it('оборудование: занятый аппарат виден на ленте и закрывает время у другого врача', async () => {
    const shared = await findSharedFreeSlot(['d-002', 'd-006'], 30, 's-004')

    const created = await apiPost<{ id: string }>(server, '/appointments', {
      doctorId: 'd-002',
      patientId: await findFreePatient(server, shared.date, shared.time, 30),
      start: `${shared.date}T${shared.time}:00+03:00`,
      durationMin: 30,
      serviceId: 's-004',
    })
    expect(created.status).toBe(201)

    // Второй врач в то же время — аппарат один, сервер отказывает с русской причиной.
    const second = await apiPost<{ error?: string; message?: string }>(server, '/appointments', {
      doctorId: 'd-006',
      patientId: await findFreePatient(server, shared.date, shared.time, 30),
      start: `${shared.date}T${shared.time}:00+03:00`,
      durationMin: 30,
      serviceId: 's-004',
    })
    expect(second.status).toBe(409)
    expect(second.body.error).toBe('equipment_busy')
    expect(second.body.message).toMatch(/УЗИ-сканер/)

    const day = await apiGet<EquipmentDayResponse>(server, `/equipment/schedule?date=${shared.date}`)
    const usg = day.items.find((e) => e.id === 'eq-002')
    expect(usg?.slots.find((s) => s.time === shared.time)?.appointmentId).toBe(created.body.id)
  })

  it('экран оборудования показывает занятость этого дня, а не пустую ленту', async () => {
    const slot = await findFreeSlotFor('d-004')
    const created = await apiPost<{ id: string }>(server, '/appointments', {
      doctorId: 'd-004',
      patientId: 'p-001',
      start: `${slot.date}T${slot.time}:00+03:00`,
      durationMin: 15,
      serviceId: 's-003',
    })
    expect(created.status).toBe(201)

    vi.setSystemTime(new Date(`${slot.date}T10:00:00`))
    renderAdmin('equipment')

    const row = await screen.findByTestId('equipment-row-eq-001', {}, { timeout: 8000 })
    const busy = within(row).getByTestId(`equipment-slot-eq-001-${slot.time}`)
    expect(busy).toHaveAttribute('data-state', 'booked')

    fireEvent.click(busy)
    const details = await screen.findByTestId('equipment-slot-details')
    expect(details).toHaveTextContent('Кузнецов Дмитрий Олегович')
    expect(details).toHaveTextContent('ЭКГ')
  })
})
