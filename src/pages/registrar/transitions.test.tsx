import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../__data__/api', () => ({
  getAppointments: vi.fn(),
  rescheduleAppointment: vi.fn(),
  getSchedule: vi.fn(),
  getDoctors: vi.fn(),
  getServices: vi.fn(),
  createAppointment: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly code: string) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

import { getAppointments, getServices, rescheduleAppointment } from '../../__data__/api'
import { Provider } from '../../theme'
import type { Appointment, Service } from '../../__data__/types'

import { RegistrarPage } from './registrar-page'

const renderPage = () => render(<Provider><RegistrarPage /></Provider>)

const mockedGetAppointments = vi.mocked(getAppointments)
const mockedGetServices = vi.mocked(getServices)
const mockedRescheduleAppointment = vi.mocked(rescheduleAppointment)

const baseServices: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 },
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём', price: 1800 },
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 },
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика', price: 2800 },
  { id: 's-007', name: 'Консультация по результатам', duration: 20, category: 'Приём', price: 1700 },
]

const makeAppointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a-001',
  doctorId: 'd-001',
  patientId: 'p-001',
  start: '2026-08-06T09:00:00+03:00',
  durationMin: 30,
  status: 'scheduled',
  paymentType: 'cash',
  serviceId: 's-001',
  doctorName: 'Иванова Е. С.',
  patientName: 'Алексеев Игорь',
  complaints: null,
  diagnosis: null,
  visitType: null,
  performedServiceIds: [],
  recommendations: [],
  nextVisit: null,
  ...overrides,
})

const setupMocks = (appointments: Appointment[], services: Service[] = baseServices) => {
  mockedGetAppointments.mockResolvedValue({ items: appointments })
  mockedGetServices.mockResolvedValue({ items: services })
}

describe('RegistrarPage — действия очереди и палитра статусов', () => {
  beforeEach(() => {
    mockedGetAppointments.mockReset()
    mockedGetServices.mockReset()
    mockedRescheduleAppointment.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('«Отменить приход» для arrived уходит со статусом no_show — допустимый переход arrived→no_show', async () => {
    const arrived: Appointment[] = [
      makeAppointment({
        id: 'a-arrived',
        patientName: 'Белова Татьяна',
        start: '2026-08-06T10:30:00+03:00',
        status: 'arrived',
        paymentType: 'card',
      }),
    ]
    setupMocks(arrived)
    mockedRescheduleAppointment.mockImplementation(async (id, input) => {
      const original = arrived.find((a) => a.id === id)
      if (!original) throw new Error('not_found')
      return { ...original, status: input.status ?? original.status }
    })

    renderPage()

    const row = await screen.findByTestId('queue-row-a-arrived')
    const cancelBtn = within(row).getByTestId('mark-waiting-a-arrived')
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-arrived', { status: 'no_show' })
    })

    expect(screen.queryByTestId('registrar-error')).toBeNull()
  })

  it('«Отметить приход» для scheduled уходит со статусом arrived — допустимый переход scheduled→arrived', async () => {
    const scheduled: Appointment[] = [
      makeAppointment({
        id: 'a-scheduled',
        patientName: 'Алексеев Игорь',
        start: '2026-08-06T09:00:00+03:00',
        status: 'scheduled',
      }),
    ]
    setupMocks(scheduled)
    mockedRescheduleAppointment.mockImplementation(async (id, input) => {
      const original = scheduled.find((a) => a.id === id)
      if (!original) throw new Error('not_found')
      return { ...original, status: input.status ?? original.status }
    })

    renderPage()

    const row = await screen.findByTestId('queue-row-a-scheduled')
    const arriveBtn = within(row).getByTestId('mark-arrived-a-scheduled')
    fireEvent.click(arriveBtn)

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-scheduled', { status: 'arrived' })
    })
  })

  it('«Отменить приход» в карточке визита для arrived уходит со статусом no_show', async () => {
    const arrived: Appointment[] = [
      makeAppointment({
        id: 'a-card-arrived',
        patientName: 'Белова Татьяна',
        start: '2026-08-06T10:30:00+03:00',
        status: 'arrived',
        paymentType: 'card',
      }),
    ]
    setupMocks(arrived)
    mockedRescheduleAppointment.mockImplementation(async (id, input) => {
      const original = arrived.find((a) => a.id === id)
      if (!original) throw new Error('not_found')
      return { ...original, status: input.status ?? original.status }
    })

    renderPage()

    await screen.findByTestId('queue-row-a-card-arrived')
    const card = await screen.findByTestId('visit-card')
    const primary = within(card).getByTestId('visit-primary-action')
    expect(primary).toHaveTextContent('Отменить приход')
    fireEvent.click(primary)

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-card-arrived', { status: 'no_show' })
    })
  })

  it('для записи в no_show нет кнопки «Восстановить» — терминальный статус, допустимых действий нет', async () => {
    const noShow: Appointment[] = [
      makeAppointment({
        id: 'a-no-show',
        patientName: 'Григорьев Артём',
        start: '2026-08-06T11:00:00+03:00',
        status: 'no_show',
        paymentType: 'cash',
      }),
    ]
    setupMocks(noShow)

    renderPage()

    const row = await screen.findByTestId('queue-row-a-no-show')
    expect(within(row).queryByTestId('mark-waiting-a-no-show')).toBeNull()
    expect(within(row).queryByTestId('mark-arrived-a-no-show')).toBeNull()
    const actionButtons = within(row).getAllByRole('button')
    const actionLabels = actionButtons.map((b) => b.textContent?.trim() ?? '')
    expect(actionLabels).not.toContain('Восстановить')
    expect(actionLabels).not.toContain('Отменить приход')
    expect(actionLabels).not.toContain('Отметить приход')
  })

  it('очередь с записью в cancelled рендерится целиком: badge с палитрой и подписью «Отменён»', async () => {
    const cancelled: Appointment[] = [
      makeAppointment({
        id: 'a-cancelled',
        patientName: 'Дмитриева Анна',
        start: '2026-08-06T12:00:00+03:00',
        status: 'cancelled',
        paymentType: 'card',
        serviceId: 's-003',
      }),
      makeAppointment({
        id: 'a-scheduled-after',
        patientName: 'Ефремов Степан',
        start: '2026-08-06T13:00:00+03:00',
        status: 'scheduled',
      }),
    ]
    setupMocks(cancelled)

    renderPage()

    const row = await screen.findByTestId('queue-row-a-cancelled')
    expect(within(row).getByText('Дмитриева Анна')).toBeInTheDocument()
    expect(within(row).getByText('Отменён')).toBeInTheDocument()

    expect(await screen.findByTestId('queue-row-a-scheduled-after')).toBeInTheDocument()
  })
})
