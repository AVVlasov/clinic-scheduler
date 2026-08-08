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

import { ApiError, getAppointments, getServices, rescheduleAppointment } from '../../__data__/api'
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

const COMPLETED_APPOINTMENT_ID = 'a-900'

const setupMocks = (appointments: Appointment[], services: Service[] = baseServices) => {
  mockedGetAppointments.mockResolvedValue({ items: appointments })
  mockedGetServices.mockResolvedValue({ items: services })
}

describe('RegistrarPage — поток статусов завершённого визита', () => {
  beforeEach(() => {
    mockedGetAppointments.mockReset()
    mockedGetServices.mockReset()
    mockedRescheduleAppointment.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('в строке завершённого визита нет кнопки «Отметить приход» и «Восстановить»', async () => {
    const completed: Appointment[] = [
      makeAppointment({
        id: COMPLETED_APPOINTMENT_ID,
        patientName: 'Дмитриева Анна',
        doctorName: 'Кузнецов Д. О.',
        start: '2026-08-06T14:00:00+03:00',
        status: 'completed',
        paymentType: 'card',
        serviceId: 's-007',
      }),
    ]
    setupMocks(completed)

    renderPage()

    const row = await screen.findByTestId(`queue-row-${COMPLETED_APPOINTMENT_ID}`)

    expect(within(row).queryByTestId(`mark-arrived-${COMPLETED_APPOINTMENT_ID}`)).toBeNull()
    expect(within(row).queryByTestId(`mark-waiting-${COMPLETED_APPOINTMENT_ID}`)).toBeNull()
    expect(within(row).queryByText('Отметить приход')).toBeNull()
    expect(within(row).queryByText('Восстановить')).toBeNull()
  })

  it('в строке завершённого визита нет кнопки «Не пришёл»', async () => {
    const completed: Appointment[] = [
      makeAppointment({
        id: COMPLETED_APPOINTMENT_ID,
        patientName: 'Дмитриева Анна',
        start: '2026-08-06T14:00:00+03:00',
        status: 'completed',
        paymentType: 'card',
      }),
    ]
    setupMocks(completed)

    renderPage()

    const row = await screen.findByTestId(`queue-row-${COMPLETED_APPOINTMENT_ID}`)
    expect(within(row).queryByText('Не пришёл')).toBeNull()
  })

  it('в строке завершённого визита остаётся кнопка «Талон» для печати', async () => {
    const completed: Appointment[] = [
      makeAppointment({
        id: COMPLETED_APPOINTMENT_ID,
        patientName: 'Дмитриева Анна',
        start: '2026-08-06T14:00:00+03:00',
        status: 'completed',
      }),
    ]
    setupMocks(completed)

    renderPage()

    const row = await screen.findByTestId(`queue-row-${COMPLETED_APPOINTMENT_ID}`)
    expect(within(row).getByText('Талон')).toBeInTheDocument()
  })

  it('карточка завершённого визита не показывает кнопку основного действия и кнопку «Не пришёл»', async () => {
    const completed: Appointment[] = [
      makeAppointment({
        id: COMPLETED_APPOINTMENT_ID,
        patientName: 'Дмитриева Анна',
        start: '2026-08-06T14:00:00+03:00',
        status: 'completed',
      }),
    ]
    setupMocks(completed)

    renderPage()

    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(within(card).getByTestId('visit-status-badge')).toHaveTextContent('Завершён')
    })

    expect(within(card).queryByTestId('visit-primary-action')).toBeNull()
    expect(within(card).queryByTestId('visit-noshow-button')).toBeNull()
    expect(within(card).queryByText('Отметить приход')).toBeNull()
    expect(within(card).queryByText('Не пришёл')).toBeNull()
  })

  it('когда сервер отклоняет переход статуса с 409, на экране появляется понятное сообщение об отказе', async () => {
    const scheduled: Appointment[] = [
      makeAppointment({
        id: 'a-001',
        patientName: 'Алексеев Игорь',
        start: '2026-08-06T09:00:00+03:00',
        status: 'scheduled',
      }),
    ]
    setupMocks(scheduled)

    const rejectMessage = 'Переход статуса из «completed» в «arrived» запрещён'
    mockedRescheduleAppointment.mockRejectedValue(
      new ApiError(rejectMessage, 409, 'invalid_state_transition'),
    )

    renderPage()

    const row = await screen.findByTestId('queue-row-a-001')
    const arrivedBtn = within(row).getByTestId('mark-arrived-a-001')
    fireEvent.click(arrivedBtn)

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-001', { status: 'arrived' })
    })

    await waitFor(() => {
      expect(screen.getByTestId('registrar-error')).toHaveTextContent(rejectMessage)
    })
  })

  it('в строке визита со статусом «На приёме» нет кнопок «Отметить приход», «Восстановить», «Не пришёл» (in_progress терминален для регистратора)', async () => {
    const inProgress: Appointment[] = [
      makeAppointment({
        id: COMPLETED_APPOINTMENT_ID,
        patientName: 'Дмитриева Анна',
        start: '2026-08-06T13:00:00+03:00',
        status: 'in_progress',
        paymentType: 'card',
      }),
    ]
    setupMocks(inProgress)

    renderPage()

    const row = await screen.findByTestId(`queue-row-${COMPLETED_APPOINTMENT_ID}`)
    expect(within(row).queryByTestId(`mark-arrived-${COMPLETED_APPOINTMENT_ID}`)).toBeNull()
    expect(within(row).queryByTestId(`mark-waiting-${COMPLETED_APPOINTMENT_ID}`)).toBeNull()
    expect(within(row).queryByText('Отметить приход')).toBeNull()
    expect(within(row).queryByText('Восстановить')).toBeNull()
    expect(within(row).queryByText('Не пришёл')).toBeNull()
  })

  it('карточка визита «На приёме» не показывает кнопку основного действия и кнопку «Не пришёл»', async () => {
    const inProgress: Appointment[] = [
      makeAppointment({
        id: COMPLETED_APPOINTMENT_ID,
        patientName: 'Дмитриева Анна',
        start: '2026-08-06T13:00:00+03:00',
        status: 'in_progress',
        paymentType: 'card',
      }),
    ]
    setupMocks(inProgress)

    renderPage()

    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(within(card).getByTestId('visit-status-badge')).toHaveTextContent('На приёме')
    })

    expect(within(card).queryByTestId('visit-primary-action')).toBeNull()
    expect(within(card).queryByTestId('visit-noshow-button')).toBeNull()
    expect(within(card).queryByText('Отметить приход')).toBeNull()
    expect(within(card).queryByText('Не пришёл')).toBeNull()
  })

  it('в строке незавершённого визита кнопки статуса доступны (контрпример — обычные визиты не сломаны)', async () => {
    const mixed: Appointment[] = [
      makeAppointment({ id: 'a-001', patientName: 'Алексеев Игорь', start: '2026-08-06T09:00:00+03:00' }),
      makeAppointment({
        id: 'a-002',
        patientName: 'Белова Татьяна',
        start: '2026-08-06T10:30:00+03:00',
        status: 'arrived',
      }),
    ]
    setupMocks(mixed)

    renderPage()

    const scheduledRow = await screen.findByTestId('queue-row-a-001')
    expect(within(scheduledRow).getByTestId('mark-arrived-a-001')).toBeInTheDocument()

    const arrivedRow = await screen.findByTestId('queue-row-a-002')
    expect(within(arrivedRow).getByTestId('mark-waiting-a-002')).toBeInTheDocument()
  })
})
