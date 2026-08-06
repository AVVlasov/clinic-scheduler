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

import { getAppointments, rescheduleAppointment } from '../../__data__/api'
import { Provider } from '../../theme'
import type { Appointment } from '../../__data__/types'

import { RegistrarPage } from './registrar-page'

const renderPage = () => render(<Provider><RegistrarPage /></Provider>)

const mockedGetAppointments = vi.mocked(getAppointments)
const mockedRescheduleAppointment = vi.mocked(rescheduleAppointment)

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
  ...overrides,
})

const APPOINTMENTS: Appointment[] = [
  makeAppointment({ id: 'a-001', patientName: 'Алексеев Игорь', start: '2026-08-06T09:00:00+03:00' }),
  makeAppointment({
    id: 'a-002',
    patientName: 'Белова Татьяна',
    doctorId: 'd-002',
    doctorName: 'Петров А. В.',
    start: '2026-08-06T10:30:00+03:00',
    status: 'arrived',
    paymentType: 'card',
  }),
  makeAppointment({
    id: 'a-003',
    patientName: 'Григорьев Артём',
    doctorId: 'd-003',
    doctorName: 'Сидорова М. А.',
    start: '2026-08-06T11:00:00+03:00',
    status: 'in_progress',
    paymentType: 'insurance',
  }),
]

describe('RegistrarPage', () => {
  beforeEach(() => {
    mockedGetAppointments.mockReset()
    mockedRescheduleAppointment.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('загружает очередь из API и показывает строки с именами из данных', async () => {
    mockedGetAppointments.mockResolvedValue({ items: APPOINTMENTS })

    renderPage()

    await waitFor(() => {
      expect(mockedGetAppointments).toHaveBeenCalledTimes(1)
    })

    for (const a of APPOINTMENTS) {
      const row = await screen.findByTestId(`queue-row-${a.id}`)
      expect(within(row).getByText(a.patientName!)).toBeInTheDocument()
    }

    expect(screen.getByTestId('counter-waiting')).toHaveTextContent('1')
    expect(screen.getByTestId('counter-arrived')).toHaveTextContent('1')
  })

  it('выбор строки меняет карточку визита', async () => {
    mockedGetAppointments.mockResolvedValue({ items: APPOINTMENTS })

    renderPage()

    await screen.findByTestId('queue-row-a-001')

    const card = await screen.findByTestId('visit-card')
    expect(within(card).getByTestId('visit-patient')).toHaveTextContent('Алексеев Игорь')

    const row2 = screen.getByTestId('queue-row-a-002')
    fireEvent.click(row2)

    await waitFor(() => {
      expect(within(card).getByTestId('visit-patient')).toHaveTextContent('Белова Татьяна')
    })
  })

  it('«отметить приход» вызывает rescheduleAppointment и обновляет статус в UI', async () => {
    mockedGetAppointments.mockResolvedValue({ items: APPOINTMENTS })
    mockedRescheduleAppointment.mockImplementation(async (id, input) => {
      const original = APPOINTMENTS.find((a) => a.id === id)
      if (!original) throw new Error('not_found')
      return { ...original, status: input.status ?? original.status }
    })

    renderPage()

    await screen.findByTestId('queue-row-a-001')

    const arriveBtn = await screen.findByTestId('mark-arrived-a-001')
    fireEvent.click(arriveBtn)

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-001', { status: 'arrived' })
    })

    await waitFor(() => {
      const row = screen.getByTestId('queue-row-a-001')
      expect(within(row).getByText('Пришёл')).toBeInTheDocument()
    })

    const card = screen.getByTestId('visit-card')
    expect(within(card).getByTestId('visit-status-badge')).toHaveTextContent('Пришёл')
    expect(within(card).getByTestId('visit-primary-action')).toHaveTextContent('Отменить приход')
  })

  it('фильтр по статусу сужает очередь', async () => {
    mockedGetAppointments.mockResolvedValue({ items: APPOINTMENTS })

    renderPage()

    await screen.findByTestId('queue-row-a-003')

    fireEvent.click(screen.getByRole('button', { name: 'Ожидают', pressed: false }))
    await waitFor(() => {
      expect(screen.queryByTestId('queue-row-a-002')).toBeNull()
      expect(screen.queryByTestId('queue-row-a-003')).toBeNull()
    })
    expect(screen.getByTestId('queue-row-a-001')).toBeInTheDocument()
  })

  it('не падает, когда API возвращает пустой список', async () => {
    mockedGetAppointments.mockResolvedValue({ items: [] })

    renderPage()

    await waitFor(() => {
      expect(mockedGetAppointments).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByTestId('counter-waiting')).toHaveTextContent('0')
    expect(screen.getByTestId('counter-arrived')).toHaveTextContent('0')
    expect(screen.getByTestId('visit-card-empty')).toBeInTheDocument()
  })

  it('показывает сообщение об ошибке при сбое загрузки', async () => {
    mockedGetAppointments.mockRejectedValue(new Error('Сервер недоступен'))

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('registrar-error')).toHaveTextContent('Сервер недоступен')
    })
  })
})
