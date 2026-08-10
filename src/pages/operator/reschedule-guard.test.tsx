import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Provider } from '../../theme'
import { OperatorPage } from './operator-page'
import type {
  Appointment,
  AppointmentList,
  DoctorList,
  PatientList,
  Schedule,
  ServiceList,
} from '../../__data__/types'

const isAppointmentsList = (url: string) => url.includes('/appointments') && !/\/appointments\//.test(url.split('?')[0])
const dateFromUrl = (url: string, fallback = '2026-08-10') =>
  (url.match(/[?&]date=([^&]+)/) || [null, fallback])[1] as string


vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
  getNavigation: vi.fn(() => ({})),
  getNavigationValue: vi.fn((key: string) => {
    if (key === 'clinic-scheduler.main') return '/clinic-scheduler'
    return ''
  }),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

const doctorsPayload: DoctorList = {
  items: [
    { id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' },
    { id: 'd-002', name: 'Петров А.В.', specialty: 'Кардиолог', cabinet: '305' },
  ],
}

const servicesPayload: ServiceList = {
  items: [
    { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
    { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  ],
}

const patientsPayload: PatientList = {
  items: [
    { id: 'p-001', name: 'Алексеев Игорь Николаевич', phone: '+7 900 100-00-01', birthDate: '1985-03-14' },
  ],
}

const buildSchedule = (date: string): Schedule => ({
  date,
  startTime: '08:00',
  endTime: '15:00',
  stepMinutes: 60,
  slots: [
    {
      time: '08:00',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: false },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
    {
      time: '09:00',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: true, appointmentId: 'a-001' },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
    {
      time: '10:00',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: false },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
    {
      time: '14:00',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: false },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
  ],
})

const buildAppointment = (
  id: string,
  doctorId: string,
  patientId: string,
  status: Appointment['status'],
  date: string,
  time: string,
): Appointment => ({
  id,
  doctorId,
  patientId,
  start: `${date}T${time}:00+03:00`,
  durationMin: 30,
  status,
  paymentType: 'regular',
  serviceId: 's-001',
  doctorName: doctorId === 'd-001' ? 'Иванова Е.С.' : 'Петров А.В.',
  patientName: 'Алексеев Игорь Николаевич',
})

const mockApi = (
  date: string,
  appointments: Appointment[],
  options: { patch?: (url: string, init: RequestInit | undefined) => Promise<Response> } = {},
) => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url.includes('/schedule/')) {
      const schedDate = (url.match(/schedule\/(\d{4}-\d{2}-\d{2})/) || [null, date])[1] as string
      return Promise.resolve(new Response(JSON.stringify(buildSchedule(schedDate)), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (isAppointmentsList(url) && init?.method !== 'PATCH') {
      return Promise.resolve(new Response(JSON.stringify({ items: appointments, date: dateFromUrl(url) }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (init?.method === 'PATCH' && url.includes('/appointments/')) {
      if (options.patch) return options.patch(url, init)
      return Promise.resolve(new Response(JSON.stringify({
        id: 'a-001', doctorId: 'd-001', patientId: 'p-001',
        start: `${date}T10:00:00+03:00`, durationMin: 30,
        status: 'scheduled', paymentType: 'regular', serviceId: 's-001',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    }
    if (url.endsWith('/doctors')) {
      return Promise.resolve(new Response(JSON.stringify(doctorsPayload), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.endsWith('/services')) {
      return Promise.resolve(new Response(JSON.stringify(servicesPayload), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.includes('/waitlist')) {

      return Promise.resolve(new Response(JSON.stringify({ items: [], openCount: 0 }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))

    }

    if (url.endsWith('/patients')) {
      return Promise.resolve(new Response(JSON.stringify(patientsPayload), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response('not found', { status: 404 }))
  })
  return fetchMock
}

const renderWithProviders = (ui: React.ReactNode, date = '2026-08-10') =>
  render(
    <MemoryRouter initialEntries={[`/clinic-scheduler/operator?date=${date}`]}>
      <Provider>{ui}</Provider>
    </MemoryRouter>,
  )

describe('SlotCard — оператор не переносит завершённые записи', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('у завершённой записи кнопок «Выбрать целью» и «Перенести» нет — есть объяснение', async () => {
    const date = '2030-03-04'
    const appts: AppointmentList = {
      date: '2030-03-04',
      items: [buildAppointment('a-001', 'd-001', 'p-001', 'completed', date, '09:00')],
    }
    mockApi(date, appts.items)
    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    const card = await screen.findByTestId('slot-card')
    expect(card).toHaveAttribute('data-busy', 'true')

    expect(screen.queryByTestId('card-pick-target')).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-reschedule')).not.toBeInTheDocument()

    const blocked = screen.getByTestId('card-reschedule-blocked')
    expect(blocked).toHaveTextContent('Запись завершена — перенос недоступен')
  })

  it('у отменённой записи кнопок переноса тоже нет', async () => {
    const date = '2030-03-04'
    const appts: AppointmentList = {
      date: '2030-03-04',
      items: [buildAppointment('a-001', 'd-001', 'p-001', 'cancelled', date, '09:00')],
    }
    mockApi(date, appts.items)
    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    await screen.findByTestId('slot-card')

    expect(screen.queryByTestId('card-pick-target')).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-reschedule')).not.toBeInTheDocument()
    expect(screen.getByTestId('card-reschedule-blocked')).toBeInTheDocument()
  })

  it('у записи no_show кнопок переноса тоже нет', async () => {
    const date = '2030-03-04'
    const appts: AppointmentList = {
      date: '2030-03-04',
      items: [buildAppointment('a-001', 'd-001', 'p-001', 'no_show', date, '09:00')],
    }
    mockApi(date, appts.items)
    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    await screen.findByTestId('slot-card')

    expect(screen.queryByTestId('card-pick-target')).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-reschedule')).not.toBeInTheDocument()
  })

  it('клик по свободному слоту при завершённой записи не выбирает цель переноса', async () => {
    const date = '2030-03-04'
    const appts: AppointmentList = {
      date: '2030-03-04',
      items: [buildAppointment('a-001', 'd-001', 'p-001', 'completed', date, '09:00')],
    }
    mockApi(date, appts.items)
    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    await screen.findByTestId('slot-card')

    fireEvent.click(await screen.findByTestId('slot-d-001-10:00'))

    await waitFor(() => {
      expect(screen.queryByTestId('reschedule-hint')).not.toBeInTheDocument()
    })

    expect(screen.queryByTestId('card-reschedule')).not.toBeInTheDocument()
  })
})

describe('SlotCard — перенос проверяется по правилам создания', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('перенос за пределы смены: сервер 409 outside_shift — текст ошибки в карточке', async () => {
    const date = '2030-03-04'
    const appts: AppointmentList = {
      date: '2030-03-04',
      items: [buildAppointment('a-001', 'd-001', 'p-001', 'scheduled', date, '09:00')],
    }
    mockApi(date, appts.items, {
      patch: () => Promise.resolve(new Response(JSON.stringify({
        error: 'outside_shift',
        message: 'Интервал 2030-03-04T14:00:00+03:00+30м не попадает в опубликованный рабочий шаблон врача d-001',
      }), { status: 409, headers: { 'Content-Type': 'application/json' } })),
    })
    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    await screen.findByTestId('slot-card')

    fireEvent.click(await screen.findByTestId('slot-d-001-14:00'))

    const rescheduleBtn = await screen.findByTestId('card-reschedule')
    await waitFor(() => expect(rescheduleBtn).not.toBeDisabled())

    fireEvent.click(rescheduleBtn)

    const err = await screen.findByTestId('card-error')
    expect(err).toHaveTextContent(/опубликованный рабочий шаблон/)
  })

  it('перенос в свободный слот внутри смены: PATCH уходит, карточка закрывается', async () => {
    const date = '2030-03-04'
    const appts: AppointmentList = {
      date: '2030-03-04',
      items: [buildAppointment('a-001', 'd-001', 'p-001', 'scheduled', date, '09:00')],
    }
    const patches: string[] = []
    mockApi(date, appts.items, {
      patch: (_url, init) => {
        patches.push(typeof init?.body === 'string' ? init.body : '')
        return Promise.resolve(new Response(JSON.stringify({
          id: 'a-001', doctorId: 'd-001', patientId: 'p-001',
          start: `${date}T10:00:00+03:00`, durationMin: 30,
          status: 'scheduled', paymentType: 'regular', serviceId: 's-001',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      },
    })
    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    await screen.findByTestId('slot-card')

    fireEvent.click(await screen.findByTestId('slot-d-001-10:00'))

    const rescheduleBtn = await screen.findByTestId('card-reschedule')
    await waitFor(() => expect(rescheduleBtn).not.toBeDisabled())
    fireEvent.click(rescheduleBtn)

    await waitFor(() => {
      expect(patches.length).toBe(1)
    })
    const body = JSON.parse(patches[0])
    expect(body.start).toBe(`${date}T10:00:00+03:00`)
    expect(body.doctorId).toBe('d-001')
    expect(body.durationMin).toBe(30)
  })
})
