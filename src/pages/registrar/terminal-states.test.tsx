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

import {
  getAppointments,
  getServices,
  rescheduleAppointment,
} from '../../__data__/api'
import { Provider } from '../../theme'
import {
  TERMINAL_STATUSES,
  isTerminalStatus,
} from '../../__data__/lifecycle'
import type { Appointment, AppointmentStatus, Service } from '../../__data__/types'

import { RegistrarPage } from './registrar-page'

const renderPage = () => render(<Provider><RegistrarPage /></Provider>)

const mockedGetAppointments = vi.mocked(getAppointments)
const mockedGetServices = vi.mocked(getServices)
const mockedRescheduleAppointment = vi.mocked(rescheduleAppointment)

const baseServices: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 },
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

const setupMocks = (appointments: Appointment[]) => {
  mockedGetAppointments.mockResolvedValue({ items: appointments })
  mockedGetServices.mockResolvedValue({ items: baseServices })
}

describe('src/__data__/lifecycle — единый источник терминальности', () => {
  it('TERMINAL_STATUSES содержит completed/cancelled/no_show и не содержит scheduled/arrived/in_progress', () => {
    expect(TERMINAL_STATUSES.has('completed')).toBe(true)
    expect(TERMINAL_STATUSES.has('cancelled')).toBe(true)
    expect(TERMINAL_STATUSES.has('no_show')).toBe(true)
    expect(TERMINAL_STATUSES.has('scheduled')).toBe(false)
    expect(TERMINAL_STATUSES.has('arrived')).toBe(false)
    expect(TERMINAL_STATUSES.has('in_progress')).toBe(false)
  })

  it('isTerminalStatus совпадает с TERMINAL_STATUSES для всех шести статусов', () => {
    const all: AppointmentStatus[] = ['scheduled', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show']
    for (const s of all) {
      expect(isTerminalStatus(s)).toBe(TERMINAL_STATUSES.has(s))
    }
  })
})

describe('RegistrarPage — терминальные статусы: кнопок переходов нет', () => {
  beforeEach(() => {
    mockedGetAppointments.mockReset()
    mockedGetServices.mockReset()
    mockedRescheduleAppointment.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('no_show: в строке нет кнопок «Отметить приход», «Восстановить», «Отменить приход», «Не пришёл»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-no-show', patientName: 'Григорьев Артём', status: 'no_show' }),
    ]
    setupMocks(items)

    renderPage()
    const row = await screen.findByTestId('queue-row-a-no-show')
    expect(within(row).queryByTestId('mark-arrived-a-no-show')).toBeNull()
    expect(within(row).queryByTestId('mark-waiting-a-no-show')).toBeNull()
    expect(within(row).queryByRole('button', { name: 'Отметить приход' })).toBeNull()
    expect(within(row).queryByRole('button', { name: 'Отменить приход' })).toBeNull()
    expect(within(row).queryByRole('button', { name: 'Не пришёл' })).toBeNull()
  })

  it('no_show: бейдж статуса показывает «Не пришёл»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-no-show-2', patientName: 'Григорьев Артём', status: 'no_show' }),
    ]
    setupMocks(items)

    renderPage()
    const row = await screen.findByTestId('queue-row-a-no-show-2')
    expect(within(row).getByText('Не пришёл')).toBeInTheDocument()
  })

  it('cancelled: в строке нет кнопок переходов, бейдж «Отменён»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-cancelled', patientName: 'Дмитриева Анна', status: 'cancelled' }),
    ]
    setupMocks(items)

    renderPage()
    const row = await screen.findByTestId('queue-row-a-cancelled')
    expect(within(row).queryByTestId('mark-arrived-a-cancelled')).toBeNull()
    expect(within(row).queryByTestId('mark-waiting-a-cancelled')).toBeNull()
    expect(within(row).queryByText('Отметить приход')).toBeNull()
    expect(within(row).queryByText('Отменить приход')).toBeNull()
    expect(within(row).queryByText('Не пришёл')).toBeNull()
    expect(within(row).getByText('Отменён')).toBeInTheDocument()
  })

  it('completed: в строке нет кнопок переходов, бейдж «Завершён»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-completed', patientName: 'Дмитриева Анна', status: 'completed' }),
    ]
    setupMocks(items)

    renderPage()
    const row = await screen.findByTestId('queue-row-a-completed')
    expect(within(row).queryByTestId('mark-arrived-a-completed')).toBeNull()
    expect(within(row).queryByTestId('mark-waiting-a-completed')).toBeNull()
    expect(within(row).queryByText('Отметить приход')).toBeNull()
    expect(within(row).queryByText('Отменить приход')).toBeNull()
    expect(within(row).queryByText('Не пришёл')).toBeNull()
    expect(within(row).getByText('Завершён')).toBeInTheDocument()
  })

  it('in_progress: в строке нет кнопок переходов, бейдж «На приёме»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-in-progress', patientName: 'Сидорова М. А.', status: 'in_progress' }),
    ]
    setupMocks(items)

    renderPage()
    const row = await screen.findByTestId('queue-row-a-in-progress')
    expect(within(row).queryByTestId('mark-arrived-a-in-progress')).toBeNull()
    expect(within(row).queryByTestId('mark-waiting-a-in-progress')).toBeNull()
    expect(within(row).getByText('На приёме')).toBeInTheDocument()
  })

  it('scheduled: бейдж «Ожидает», кнопки переходов доступны', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-scheduled', patientName: 'Алексеев Игорь', status: 'scheduled' }),
    ]
    setupMocks(items)

    renderPage()
    const row = await screen.findByTestId('queue-row-a-scheduled')
    expect(within(row).getByText('Ожидает')).toBeInTheDocument()
    expect(within(row).getByTestId('mark-arrived-a-scheduled')).toBeInTheDocument()
  })
})

describe('VisitCard — терминальные статусы: кнопок переходов нет', () => {
  beforeEach(() => {
    mockedGetAppointments.mockReset()
    mockedGetServices.mockReset()
    mockedRescheduleAppointment.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('no_show: карточка не показывает primary action и кнопку «Не пришёл»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-no-show-c', patientName: 'Григорьев Артём', status: 'no_show' }),
    ]
    setupMocks(items)

    renderPage()
    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(within(card).getByTestId('visit-status-badge')).toHaveTextContent('Не пришёл')
    })
    expect(within(card).queryByTestId('visit-primary-action')).toBeNull()
    expect(within(card).queryByTestId('visit-noshow-button')).toBeNull()
  })

  it('cancelled: карточка не показывает primary action и кнопку «Не пришёл»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-cancelled-c', patientName: 'Дмитриева Анна', status: 'cancelled' }),
    ]
    setupMocks(items)

    renderPage()
    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(within(card).getByTestId('visit-status-badge')).toHaveTextContent('Отменён')
    })
    expect(within(card).queryByTestId('visit-primary-action')).toBeNull()
    expect(within(card).queryByTestId('visit-noshow-button')).toBeNull()
  })

  it('in_progress: карточка не показывает primary action, бейдж «На приёме»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-in-progress-c', patientName: 'Сидорова М. А.', status: 'in_progress' }),
    ]
    setupMocks(items)

    renderPage()
    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(within(card).getByTestId('visit-status-badge')).toHaveTextContent('На приёме')
    })
    expect(within(card).queryByTestId('visit-primary-action')).toBeNull()
    expect(within(card).queryByTestId('visit-noshow-button')).toBeNull()
  })

  it('scheduled: карточка показывает primary action «Отметить приход» и кнопку «Не пришёл»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-scheduled-c', patientName: 'Алексеев Игорь', status: 'scheduled' }),
    ]
    setupMocks(items)

    renderPage()
    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(within(card).getByTestId('visit-status-badge')).toHaveTextContent('Ожидает')
    })
    expect(within(card).getByTestId('visit-primary-action')).toHaveTextContent('Отметить приход')
    expect(within(card).getByTestId('visit-noshow-button')).toBeInTheDocument()
  })
})

describe('RegistrarPage — «Отменить приход» НЕ ведёт в no_show', () => {
  beforeEach(() => {
    mockedGetAppointments.mockReset()
    mockedGetServices.mockReset()
    mockedRescheduleAppointment.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('для arrived «Отменить приход» в строке вызывает PATCH {status: scheduled}, не no_show', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-cancel-arrived', patientName: 'Белова Татьяна', status: 'arrived' }),
    ]
    setupMocks(items)
    mockedRescheduleAppointment.mockImplementation(async (id, input) => {
      const original = items.find((a) => a.id === id)
      if (!original) throw new Error('not_found')
      return { ...original, status: input.status ?? original.status }
    })

    renderPage()
    const row = await screen.findByTestId('queue-row-a-cancel-arrived')
    const cancelBtn = within(row).getByTestId('mark-waiting-a-cancel-arrived')
    fireEvent.click(cancelBtn)

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-cancel-arrived', { status: 'scheduled' })
    })
    const calls = mockedRescheduleAppointment.mock.calls
    const noShowCall = calls.find(([, body]) => (body as { status: string }).status === 'no_show')
    expect(noShowCall).toBeUndefined()
  })

  it('фиксация неявки выполняется отдельной кнопкой «Не пришёл»', async () => {
    const items: Appointment[] = [
      makeAppointment({ id: 'a-noshow-visit', patientName: 'Белова Татьяна', status: 'arrived' }),
    ]
    setupMocks(items)
    mockedRescheduleAppointment.mockImplementation(async (id, input) => {
      const original = items.find((a) => a.id === id)
      if (!original) throw new Error('not_found')
      return { ...original, status: input.status ?? original.status }
    })

    renderPage()
    const card = await screen.findByTestId('visit-card')
    const noShowBtn = within(card).getByTestId('visit-noshow-button')
    fireEvent.click(noShowBtn)

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-noshow-visit', { status: 'no_show' })
    })
  })
})