import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../__data__/api', () => ({
  getAppointments: vi.fn(),
  rescheduleAppointment: vi.fn(),
  getSchedule: vi.fn(),
  getDoctors: vi.fn(),
  getServices: vi.fn(),
  payAppointment: vi.fn(),
  confirmAppointment: vi.fn(),
  createAppointment: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly code: string) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

import { getAppointments, getDoctors, getServices, payAppointment, rescheduleAppointment } from '../../__data__/api'
import { Provider } from '../../theme'
import type { Appointment, Service } from '../../__data__/types'

import { RegistrarPage } from './registrar-page'

const renderPage = () => render(
  <MemoryRouter initialEntries={['/clinic-scheduler/registrar']}>
    <Provider><RegistrarPage /></Provider>
  </MemoryRouter>,
)

const mockedGetAppointments = vi.mocked(getAppointments)
const mockedGetServices = vi.mocked(getServices)
const mockedGetDoctors = vi.mocked(getDoctors)
const mockedPayAppointment = vi.mocked(payAppointment)
const mockedRescheduleAppointment = vi.mocked(rescheduleAppointment)

const baseServices: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём', price: 1800 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика', price: 2800 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  { id: 's-007', name: 'Консультация по результатам', duration: 20, category: 'Приём', price: 1700 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
]

const makeAppointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a-001',
  doctorId: 'd-001',
  patientId: 'p-001',
  start: '2026-08-06T09:00:00+03:00',
  durationMin: 30,
  status: 'scheduled',
  paymentType: 'regular',
  serviceId: 's-001',
  doctorName: 'Иванова Е. С.',
  patientName: 'Алексеев Игорь',
  patientPhone: '+7 900 100-00-01',
  patientBirthDate: '1985-03-12',
  patientUid: 'UID 0001 1234',
  doctorCabinet: '101',
  createdByName: 'Смирнова А.И.',
  createdByUnit: 'Колл-центр',
  confirmed: false,
  complaints: null,
  diagnosis: null,
  visitType: null,
  performedServiceIds: [],
  recommendations: [],
  nextVisit: null,
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
    paymentType: 'promo',
  }),
  makeAppointment({
    id: 'a-003',
    patientName: 'Григорьев Артём',
    doctorId: 'd-003',
    doctorName: 'Сидорова М. А.',
    start: '2026-08-06T11:00:00+03:00',
    status: 'in_progress',
    paymentType: 'dms',
  }),
  makeAppointment({
    id: 'a-004',
    patientName: 'Дмитриева Анна',
    doctorId: 'd-004',
    doctorName: 'Кузнецов Д. О.',
    start: '2026-08-06T14:00:00+03:00',
    status: 'completed',
    paymentType: 'promo',
    serviceId: 's-007',
    paidAt: '2026-08-06T14:30:00+03:00',
    paidAmount: 1700,
  }),
]

const setupMocks = (appointments: Appointment[], services: Service[] = baseServices) => {
  let current = appointments.map((a) => ({ ...a }))
  mockedGetAppointments.mockImplementation(async () => ({
    items: current.map((a) => ({ ...a })),
    date: '2026-08-10',
  }))
  mockedGetServices.mockResolvedValue({ items: services })
  mockedGetDoctors.mockResolvedValue({
    items: [
      { id: 'd-001', name: 'Иванова Е. С.', specialty: 'Терапевт', cabinet: '201' },
      { id: 'd-002', name: 'Петров А. В.', specialty: 'Кардиолог', cabinet: '305' },
      { id: 'd-003', name: 'Сидорова М. А.', specialty: 'Педиатр', cabinet: '104' },
      { id: 'd-004', name: 'Кузнецов Д. О.', specialty: 'Невролог', cabinet: '412' },
    ],
  })
  mockedPayAppointment.mockImplementation(async (id, input) => {
    const target = current.find((a) => a.id === id)
    if (!target) throw new Error('not found')
    if (target.paidAt) {
      const err = new Error('already paid') as Error & { status?: number; code?: string }
      err.status = 409
      err.code = 'already_paid'
      throw err
    }
    const updated = { ...target, paidAt: '2026-08-06T12:00:00+03:00', paidAmount: input.amount }
    current = current.map((a) => (a.id === id ? updated : a))
    return updated
  })
  mockedRescheduleAppointment.mockImplementation(async (id, input) => {
    const original = current.find((a) => a.id === id)
    if (!original) throw new Error('not_found')
    const updated = { ...original, ...input, status: input.status ?? original.status }
    current = current.map((a) => (a.id === id ? updated : a))
    return updated
  })
  return {
    setAppointments: (next: Appointment[]) => {
      current = next.map((a) => ({ ...a }))
    },
  }
}

describe('RegistrarPage', () => {
  beforeEach(() => {
    mockedGetAppointments.mockReset()
    mockedGetServices.mockReset()
    mockedRescheduleAppointment.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('загружает очередь из API и показывает строки с именами из данных', async () => {
    setupMocks(APPOINTMENTS)

    renderPage()

    await waitFor(() => {
      expect(mockedGetAppointments).toHaveBeenCalledTimes(1)
      expect(mockedGetServices).toHaveBeenCalledTimes(1)
    })

    for (const a of APPOINTMENTS) {
      const row = await screen.findByTestId(`queue-row-${a.id}`)
      expect(within(row).getByText(a.patientName!)).toBeInTheDocument()
    }

    expect(screen.getByTestId('counter-waiting')).toHaveTextContent('1')
    expect(screen.getByTestId('counter-arrived')).toHaveTextContent('1')
  })

  it('выбор строки меняет карточку визита', async () => {
    setupMocks(APPOINTMENTS)

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
    setupMocks(APPOINTMENTS)

    renderPage()

    await screen.findByTestId('queue-row-a-001')

    const arriveBtn = await screen.findByTestId('mark-arrived-a-001')
    fireEvent.click(arriveBtn)

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-001', { status: 'arrived', actor: 'Регистратура' })
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
    setupMocks(APPOINTMENTS)

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
    setupMocks([])

    renderPage()

    await waitFor(() => {
      expect(mockedGetAppointments).toHaveBeenCalledTimes(1)
    })

    expect(screen.getByTestId('counter-waiting')).toHaveTextContent('0')
    expect(screen.getByTestId('counter-arrived')).toHaveTextContent('0')
    expect(screen.getByTestId('counter-cash')).toHaveTextContent('0 ₽')
    expect(screen.getByTestId('visit-card-empty')).toBeInTheDocument()
  })

  it('показывает сообщение об ошибке при сбое загрузки', async () => {
    mockedGetAppointments.mockRejectedValue(new Error('Сервер недоступен'))
    mockedGetServices.mockResolvedValue({ items: baseServices })

    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('registrar-error')).toHaveTextContent('Сервер недоступен')
    })
  })

  it('касса смены считает только фактически оплаченные записи', async () => {
    setupMocks(APPOINTMENTS)

    renderPage()

    await screen.findByTestId('queue-row-a-004')

    await waitFor(() => {
      expect(screen.getByTestId('counter-cash')).toHaveTextContent('1 700 ₽')
    })
  })

  it('изменение набора записей в API меняет кассу смены', async () => {
    const oneCompleted: Appointment[] = [
      makeAppointment({
        id: 'a-100',
        patientName: 'Иванов Иван',
        serviceId: 's-002',
        status: 'completed',
        paymentType: 'promo',
        paidAt: '2026-08-06T12:00:00+03:00',
        paidAmount: 1800,
      }),
    ]
    setupMocks(oneCompleted)

    const { unmount } = renderPage()
    await screen.findByTestId('queue-row-a-100')
    await waitFor(() => {
      expect(screen.getByTestId('counter-cash')).toHaveTextContent('1 800 ₽')
    })
    unmount()

    const extended: Appointment[] = [
      ...oneCompleted,
      makeAppointment({
        id: 'a-101',
        patientName: 'Петров Пётр',
        serviceId: 's-003',
        status: 'completed',
        paymentType: 'regular',
        start: '2026-08-06T15:00:00+03:00',
        paidAt: '2026-08-06T15:30:00+03:00',
        paidAmount: 1200,
      }),
      makeAppointment({
        id: 'a-102',
        patientName: 'Сидоров Сидор',
        serviceId: 's-001',
        status: 'scheduled',
        paymentType: 'regular',
        start: '2026-08-06T16:00:00+03:00',
      }),
    ]
    setupMocks(extended)

    renderPage()
    await screen.findByTestId('queue-row-a-101')

    await waitFor(() => {
      expect(screen.getByTestId('counter-cash')).toHaveTextContent('3 000 ₽')
    })
  })

  it('«К оплате» в карточке визита считается по справочнику услуг', async () => {
    setupMocks(APPOINTMENTS)

    renderPage()

    await screen.findByTestId('queue-row-a-001')
    const card = await screen.findByTestId('visit-card')

    await waitFor(() => {
      expect(within(card).getByTestId('visit-amount')).toHaveTextContent('2 500 ₽')
    })
  })

  it('«К оплате» пересчитывается по performedServiceIds после приёма', async () => {
    const withPerformed: Appointment[] = [
      makeAppointment({
        id: 'a-200',
        patientName: 'Иванов Иван',
        serviceId: 's-001',
        status: 'completed',
        performedServiceIds: ['s-001', 's-003'],
      }),
    ]
    setupMocks(withPerformed)

    renderPage()

    await screen.findByTestId('queue-row-a-200')
    const card = await screen.findByTestId('visit-card')

    await waitFor(() => {
      expect(within(card).getByTestId('visit-amount')).toHaveTextContent('3 700 ₽')
    })
  })

  it('показывает «—» когда у визита нет услуги', async () => {
    const noService: Appointment[] = [
      makeAppointment({
        id: 'a-300',
        patientName: 'Без имени',
        serviceId: null,
        status: 'arrived',
      }),
    ]
    setupMocks(noService)

    renderPage()

    await screen.findByTestId('queue-row-a-300')
    const card = await screen.findByTestId('visit-card')

    await waitFor(() => {
      expect(within(card).getByTestId('visit-amount')).toHaveTextContent('—')
    })
  })
})