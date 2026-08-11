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
    { id: 's-002', name: 'Расширенная консультация', duration: 60, category: 'Приём', price: 4000 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
    { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  ],
}

const patientsPayload: PatientList = {
  items: [
    { id: 'p-001', name: 'Алексеев Игорь Николаевич', phone: '+7 900 100-00-01', birthDate: '1985-03-14' },
    { id: 'p-002', name: 'Белова Татьяна Викторовна', phone: '+7 900 100-00-02', birthDate: '1992-07-21' },
    { id: 'p-003', name: 'Григорьев Артём Дмитриевич', phone: '+7 900 100-00-03', birthDate: '1978-11-05' },
  ],
}

const buildSchedule = (date: string): Schedule => ({
  date,
  startTime: '08:00',
  endTime: '09:00',
  stepMinutes: 15,
  slots: [
    {
      time: '08:00',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: false },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
    {
      time: '08:15',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: true, appointmentId: 'a-001' },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
    {
      time: '08:30',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: false },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
    {
      time: '08:45',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: true, appointmentId: 'a-002' },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
  ],
})

const buildAppointment = (
  id: string,
  doctorId: string,
  patientId: string,
  durationMin: number,
  status: Appointment['status'],
  date: string,
  time: string,
): Appointment => ({
  id,
  doctorId,
  patientId,
  start: `${date}T${time}:00+03:00`,
  durationMin,
  status,
  paymentType: 'regular',
  serviceId: 's-001',
  doctorName: doctorId === 'd-001' ? 'Иванова Е.С.' : 'Петров А.В.',
  patientName: patientId === 'p-001'
    ? 'Алексеев Игорь Николаевич'
    : patientId === 'p-002'
      ? 'Белова Татьяна Викторовна'
      : 'Григорьев Артём Дмитриевич',
})

const mockApi = (date: string, appointments: AppointmentList) => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url.includes('/schedule/')) {
      const schedDate = (url.match(/schedule\/(\d{4}-\d{2}-\d{2})/) || [null, date])[1] as string
      return Promise.resolve(new Response(JSON.stringify(buildSchedule(schedDate)), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (isAppointmentsList(url)) {
      return Promise.resolve(new Response(JSON.stringify({ ...appointments, date }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
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

describe('SlotCard — выбор пациента изолирован между слотами', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('при смене свободного слота выбранный пациент сбрасывается, кнопка «Записать» disabled', async () => {
    const date = '2026-08-10'
    mockApi(date, { items: [], date: date })

    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))
    await screen.findByTestId('slot-card')

    fireEvent.click(screen.getByTestId('patient-option-p-002'))
    await waitFor(() => {
      expect(screen.getByTestId('patient-selected')).toHaveTextContent('Белова Татьяна Викторовна')
    })

    fireEvent.click(await screen.findByTestId('slot-d-001-08:30'))

    const newCard = await screen.findByTestId('slot-card')
    expect(newCard).toHaveAttribute('data-busy', 'false')

    expect(screen.queryByTestId('patient-selected')).not.toBeInTheDocument()

    const bookBtn = screen.getByTestId('card-book')
    expect(bookBtn).toBeDisabled()
  })

  it('при смене врача на свободном слоте выбранный пациент сбрасывается', async () => {
    const date = '2026-08-10'
    mockApi(date, { items: [], date: date })

    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))
    await screen.findByTestId('slot-card')

    fireEvent.click(screen.getByTestId('patient-option-p-003'))
    await waitFor(() => {
      expect(screen.getByTestId('patient-selected')).toHaveTextContent('Григорьев Артём Дмитриевич')
    })

    fireEvent.click(await screen.findByTestId('slot-d-002-08:00'))

    const newCard = await screen.findByTestId('slot-card')
    expect(newCard).toHaveAttribute('data-busy', 'false')

    expect(screen.queryByTestId('patient-selected')).not.toBeInTheDocument()

    const bookBtn = screen.getByTestId('card-book')
    expect(bookBtn).toBeDisabled()
  })

  it('после выбора пациента на free-слоте и перехода на busy-слот выбранный пациент не виден в busy-карточке', async () => {
    const date = '2026-08-10'
    const appts: AppointmentList = {
      date: '2026-08-10',
      items: [
        buildAppointment('a-001', 'd-001', 'p-001', 30, 'scheduled', date, '08:15'),
      ],
    }
    mockApi(date, appts)

    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))
    await screen.findByTestId('slot-card')

    fireEvent.click(screen.getByTestId('patient-option-p-002'))
    await waitFor(() => {
      expect(screen.getByTestId('patient-selected')).toHaveTextContent('Белова Татьяна Викторовна')
    })

    fireEvent.click(await screen.findByTestId('slot-d-001-08:15'))

    const busyCard = await screen.findByTestId('slot-card')
    expect(busyCard).toHaveAttribute('data-busy', 'true')

    expect(screen.queryByTestId('patient-picker')).not.toBeInTheDocument()
    expect(screen.queryByTestId('card-pick-target')).not.toBeInTheDocument()

    fireEvent.click(await screen.findByTestId('slot-d-001-08:30'))

    expect(screen.getByTestId('reschedule-hint')).toBeInTheDocument()
    expect(screen.getByTestId('card-reschedule')).toBeInTheDocument()
  })

  it('повторный клик по тому же свободному слоту сохраняет выбранного пациента', async () => {
    const date = '2026-08-10'
    mockApi(date, { items: [], date: date })

    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))
    await screen.findByTestId('slot-card')

    fireEvent.click(screen.getByTestId('patient-option-p-003'))
    await waitFor(() => {
      expect(screen.getByTestId('patient-selected')).toHaveTextContent('Григорьев Артём Дмитриевич')
    })

    fireEvent.click(screen.getByTestId('slot-d-001-08:00'))

    const card = screen.getByTestId('slot-card')
    expect(card).toHaveAttribute('data-busy', 'false')

    expect(screen.getByTestId('patient-selected')).toHaveTextContent('Григорьев Артём Дмитриевич')
    expect(screen.getByTestId('card-book')).not.toBeDisabled()
  })
})

describe('ShiftOverview — статистика считается по данным, а не из констант', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('при 1 записи с durationMin=30 обзор показывает total=1 и среднюю длительность 30 мин', async () => {
    const date = '2026-08-10'
    const appts: AppointmentList = {
      date: '2026-08-10',
      items: [
        buildAppointment('a-001', 'd-001', 'p-001', 30, 'scheduled', date, '08:15'),
      ],
    }
    mockApi(date, appts)

    renderWithProviders(<OperatorPage />, date)
    await screen.findByTestId('schedule-grid')

    const totalEl = await screen.findByTestId('shift-stat-total')
    expect(totalEl).toHaveTextContent('1')

    const avgEl = await screen.findByTestId('shift-stat-avg')
    expect(avgEl).toHaveTextContent('30 мин')

    const needsEl = await screen.findByTestId('shift-stat-needs-action')
    expect(needsEl).toHaveTextContent('0')
  })

  it('при 3 записях с разной длительностью total=3, средняя 45 мин и needs=2', async () => {
    const date = '2026-08-10'
    const appts: AppointmentList = {
      date: '2026-08-10',
      items: [
        buildAppointment('a-001', 'd-001', 'p-001', 30, 'scheduled', date, '08:15'),
        buildAppointment('a-002', 'd-001', 'p-002', 60, 'arrived', date, '08:30'),
        buildAppointment('a-003', 'd-002', 'p-003', 45, 'no_show', date, '08:15'),
      ],
    }
    mockApi(date, appts)

    renderWithProviders(<OperatorPage />, date)
    await screen.findByTestId('schedule-grid')

    const totalEl = await screen.findByTestId('shift-stat-total')
    expect(totalEl).toHaveTextContent('3')

    const avgEl = await screen.findByTestId('shift-stat-avg')
    expect(avgEl).toHaveTextContent('45 мин')

    const needsEl = await screen.findByTestId('shift-stat-needs-action')
    expect(needsEl).toHaveTextContent('2')
  })

  it('при 0 записей показывает total=0 и avg=—', async () => {
    const date = '2026-08-10'
    mockApi(date, { items: [], date: date })

    renderWithProviders(<OperatorPage />, date)
    await screen.findByTestId('schedule-grid')

    const totalEl = await screen.findByTestId('shift-stat-total')
    expect(totalEl).toHaveTextContent('0')

    const avgEl = await screen.findByTestId('shift-stat-avg')
    expect(avgEl).toHaveTextContent('—')

    const needsEl = await screen.findByTestId('shift-stat-needs-action')
    expect(needsEl).toHaveTextContent('0')
  })
})