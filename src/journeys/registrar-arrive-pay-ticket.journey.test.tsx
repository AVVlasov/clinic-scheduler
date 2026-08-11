// Сквозной: регистратор доводит смену до конца — приход, оплата после приёма,
// печать талона и откат ошибочной неявки. Мока API нет: живые стабы.

import React from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

interface AppointmentResponse {
  id: string
  status: string
  paidAt: string | null
  paidAmount: number | null
  paymentType: string
}

interface HistoryResponse {
  items: Array<{ from: string | null; to: string; actor: string }>
}

let server: JourneyServer
let printSpy: ReturnType<typeof vi.spyOn>

/** Цена услуги s-001 берётся у сервера: тест не повторяет прайс своими числами. */
const servicePrice = async (serviceId: string): Promise<number> => {
  const services = await apiGet<{ items: Array<{ id: string; price: number }> }>(server, '/services')
  const found = services.items.find((s) => s.id === serviceId)
  if (!found) throw new Error(`услуга ${serviceId} не найдена`)
  return found.price
}

const seedAppointment = async (
  options: { paymentType?: string; status?: string } = {},
): Promise<{ date: string; id: string }> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
    const candidates = schedule.slots
      .flatMap((s) => s.doctors.filter((d) => !d.busy).map((d) => ({ time: s.time, doctorId: d.id })))
    // Свободных окон в сетке несколько: сервер — последняя инстанция, и если он
    // отказал по занятости, берём следующее окно, а не роняем сценарий.
    for (const free of candidates) {
      const created = await apiPost<{ id: string }>(server, '/appointments', {
        doctorId: free.doctorId,
        patientId: 'p-001',
        start: `${date}T${free.time}:00+03:00`,
        durationMin: 30,
        serviceId: 's-001',
        paymentType: options.paymentType ?? 'regular',
        ...(options.status ? { status: options.status } : {}),
      })
      if (created.status === 201) return { date, id: created.body.id }
    }
  }
  throw new Error('нет свободного слота')
}

/** «2 500 ₽» → 2500: плитка кассы сравнивается числом, а не строкой. */
const cashValue = (): number =>
  Number((screen.getByTestId('counter-cash').textContent ?? '').replace(/\D/g, ''))

const openRegistrar = async (date: string) => {
  render(
    <MemoryRouter initialEntries={[armPath('registrar', date)]}>
      <Provider>
        <Dashboard />
      </Provider>
    </MemoryRouter>,
  )
  await screen.findByTestId('registrar-page', {}, { timeout: 8000 })
}

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-10T10:00:00'))
  printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)
  server = await startJourneyServer()
})

afterEach(async () => {
  printSpy.mockRestore()
  await server.close()
  vi.useRealTimers()
})

describe('journey registrar-arrive-pay-ticket', () => {
  it('приход → оплата на сервере → касса растёт ровно на сумму визита → талон печатается', async () => {
    const seed = await seedAppointment()
    const price = await servicePrice('s-001')

    await openRegistrar(seed.date)

    const row = await screen.findByTestId(`queue-row-${seed.id}`, {}, { timeout: 8000 })
    fireEvent.click(row)

    const card = await screen.findByTestId('visit-card')
    fireEvent.click(within(card).getByTestId('visit-primary-action'))

    await waitFor(async () => {
      const appt = await apiGet<AppointmentResponse>(server, `/appointments/${seed.id}`)
      expect(appt.status).toBe('arrived')
    }, { timeout: 8000 })

    const cashBefore = cashValue()
    fireEvent.click(within(card).getByTestId('visit-pay-button'))

    await waitFor(async () => {
      const appt = await apiGet<AppointmentResponse>(server, `/appointments/${seed.id}`)
      expect(appt.paidAt).toBeTruthy()
      expect(appt.paidAmount).toBe(price)
    }, { timeout: 8000 })

    await waitFor(() => {
      expect(cashValue()).toBe(cashBefore + price)
    }, { timeout: 8000 })

    // Факт оплаты виден в самой очереди, а не только в карточке.
    await waitFor(() => {
      expect(screen.getByTestId(`paid-${seed.id}`)).toHaveTextContent('Оплачено')
    })

    fireEvent.click(within(card).getByTestId('visit-print-button'))
    const ticket = await screen.findByTestId('ticket-print')
    for (const field of [
      'ticket-patient', 'ticket-date', 'ticket-time', 'ticket-doctor',
      'ticket-service', 'ticket-cabinet', 'ticket-site', 'ticket-number',
    ]) {
      expect(within(ticket).getByTestId(field).textContent?.trim()).not.toBe('')
    }
    expect(within(ticket).getByTestId('ticket-site')).toHaveTextContent('Динамо')
    expect(within(ticket).getByTestId('ticket-print-styles').textContent).toContain('@media print')

    fireEvent.click(within(ticket).getByTestId('ticket-print-button'))
    expect(printSpy).toHaveBeenCalledTimes(1)
  }, 30000)

  it('за завершённый приём деньги берут из строки очереди', async () => {
    const seed = await seedAppointment({ status: 'completed' })
    const price = await servicePrice('s-001')

    await openRegistrar(seed.date)

    const row = await screen.findByTestId(`queue-row-${seed.id}`, {}, { timeout: 8000 })
    const cashBefore = cashValue()
    fireEvent.click(within(row).getByTestId(`pay-${seed.id}`))

    await waitFor(async () => {
      const appt = await apiGet<AppointmentResponse>(server, `/appointments/${seed.id}`)
      expect(appt.paidAt).toBeTruthy()
      expect(appt.paidAmount).toBe(price)
    }, { timeout: 8000 })

    await waitFor(() => {
      expect(cashValue()).toBe(cashBefore + price)
    }, { timeout: 8000 })
  }, 30000)

  it('визит по ДМС закрывается, но кассу смены не поднимает', async () => {
    const seed = await seedAppointment({ paymentType: 'dms', status: 'completed' })

    await openRegistrar(seed.date)

    const row = await screen.findByTestId(`queue-row-${seed.id}`, {}, { timeout: 8000 })
    const cashBefore = cashValue()
    fireEvent.click(within(row).getByTestId(`pay-${seed.id}`))

    await waitFor(async () => {
      const appt = await apiGet<AppointmentResponse>(server, `/appointments/${seed.id}`)
      expect(appt.paidAt).toBeTruthy()
      expect(appt.paymentType).toBe('dms')
      expect(appt.paidAmount).toBe(0)
    }, { timeout: 8000 })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3500)
    })
    expect(cashValue()).toBe(cashBefore)
  }, 30000)

  it('ошибочная неявка возвращается в очередь, и приход отмечается снова', async () => {
    const seed = await seedAppointment({ status: 'no_show' })

    await openRegistrar(seed.date)

    const row = await screen.findByTestId(`queue-row-${seed.id}`, {}, { timeout: 8000 })
    fireEvent.click(within(row).getByTestId(`return-to-queue-${seed.id}`))

    await waitFor(async () => {
      const appt = await apiGet<AppointmentResponse>(server, `/appointments/${seed.id}`)
      expect(appt.status).toBe('scheduled')
    }, { timeout: 8000 })

    const history = await apiGet<HistoryResponse>(server, `/appointments/${seed.id}/history`)
    const back = history.items.find((h) => h.from === 'no_show' && h.to === 'scheduled')
    expect(back, 'откат неявки обязан попасть в историю').toBeTruthy()
    expect(back?.actor).toBe('Регистратура')

    fireEvent.click(await screen.findByTestId(`mark-arrived-${seed.id}`, {}, { timeout: 8000 }))

    await waitFor(async () => {
      const appt = await apiGet<AppointmentResponse>(server, `/appointments/${seed.id}`)
      expect(appt.status).toBe('arrived')
    }, { timeout: 8000 })
  }, 30000)
})
