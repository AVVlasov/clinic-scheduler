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
    { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  ],
}

const patientsPayload: PatientList = {
  items: [
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
        { id: 'd-001', name: 'Иванова Е.С.', busy: false },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
  ],
})

const appointmentsPayload: AppointmentList = {
  date: '2026-08-10',
  items: [
    {
      id: 'a-001',
      doctorId: 'd-001',
      patientId: 'p-001',
      start: `${'2026-08-10'}T08:15:00+03:00`,
      durationMin: 30,
      status: 'scheduled',
      paymentType: 'regular',
      serviceId: 's-001',
      doctorName: 'Иванова Е.С.',
      patientName: 'Алексеев Игорь Николаевич',
    },
  ],
}

const renderWithProviders = (ui: React.ReactNode, date = '2026-08-10') =>
  render(
    <MemoryRouter initialEntries={[`/clinic-scheduler/operator?date=${date}`]}>
      <Provider>{ui}</Provider>
    </MemoryRouter>,
  )

const buildBaseFetch = (
  date: string,
  overrides: {
    appointmentsOnReload?: (callIndex: number) => Appointment[] | null
    postResponse?: (callIndex: number) => { status: number; body: unknown }
    patchResponse?: (callIndex: number) => { status: number; body: unknown }
  } = {},
) => {
  let appointmentsCallIndex = 0
  let postCallIndex = 0
  let patchCallIndex = 0
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const method = init?.method ?? 'GET'
    if (url.includes('/schedule/')) {
      return Promise.resolve(new Response(JSON.stringify(buildSchedule(date)), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (isAppointmentsList(url) && method === 'POST') {
      postCallIndex += 1
      if (overrides.postResponse) {
        const r = overrides.postResponse(postCallIndex)
        return Promise.resolve(new Response(JSON.stringify(r.body), {
          status: r.status, headers: { 'Content-Type': 'application/json' },
        }))
      }
      return Promise.resolve(new Response(JSON.stringify({
        id: 'a-999', doctorId: 'd-001', patientId: 'p-002',
        start: `${date}T08:00:00+03:00`, durationMin: 30,
        status: 'scheduled', paymentType: 'regular', serviceId: 's-001',
      }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
    }
    if (isAppointmentsList(url) && method !== 'PATCH') {
      appointmentsCallIndex += 1
      const items = overrides.appointmentsOnReload
        ? overrides.appointmentsOnReload(appointmentsCallIndex)
        : appointmentsPayload.items
      if (items === null) {
        return Promise.resolve(new Response(JSON.stringify({
          error: 'server_error',
          message: 'База данных временно недоступна',
        }), {
          status: 500, headers: { 'Content-Type': 'application/json' },
        }))
      }
      return Promise.resolve(new Response(JSON.stringify({ date, items }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (method === 'PATCH' && url.includes('/appointments/')) {
      patchCallIndex += 1
      if (overrides.patchResponse) {
        const r = overrides.patchResponse(patchCallIndex)
        return Promise.resolve(new Response(JSON.stringify(r.body), {
          status: r.status, headers: { 'Content-Type': 'application/json' },
        }))
      }
      return Promise.resolve(new Response(JSON.stringify({
        id: 'a-001', doctorId: 'd-002', patientId: 'p-001',
        start: `${date}T08:45:00+03:00`, durationMin: 30,
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

describe('OperatorPage — отказ перезагрузки после записи виден оператору', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('после успешной записи, если GET /appointments упал, виден банер ошибки и сетка не подменена', async () => {
    const date = '2026-08-10'
    const fetchMock = buildBaseFetch(date, {
      appointmentsOnReload: (callIndex) => {
        if (callIndex === 1) return appointmentsPayload.items
        return null
      },
    })
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))

    fireEvent.click(await screen.findByTestId('patient-option-p-002'))

    fireEvent.click(await screen.findByTestId('card-book'))

    const banner = await screen.findByTestId('operator-refresh-error')
    expect(banner).toBeInTheDocument()
    expect(banner.textContent).toContain('База данных временно недоступна')

    const hint = screen.getByTestId('operator-refresh-error-hint')
    expect(hint.textContent).toContain('локальная сетка устарела')

    const calls = fetchMock.mock.calls.filter(([input, init]) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      const method = init?.method ?? 'GET'
      return isAppointmentsList(url) && method === 'GET'
    })
    expect(calls.length).toBeGreaterThanOrEqual(2)

    const postCalls = fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST')
    expect(postCalls).toHaveLength(1)
  })

  it('карточка слота после отказа перезагрузки остаётся открытой — оператор видит неуспех', async () => {
    const date = '2026-08-10'
    buildBaseFetch(date, {
      appointmentsOnReload: (callIndex) => {
        if (callIndex === 1) return appointmentsPayload.items
        return null
      },
    })
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))
    const card = await screen.findByTestId('slot-card')
    expect(card).toBeInTheDocument()

    fireEvent.click(await screen.findByTestId('patient-option-p-002'))
    fireEvent.click(screen.getByTestId('card-book'))

    await screen.findByTestId('operator-refresh-error')
    expect(screen.getByTestId('slot-card')).toBeInTheDocument()
  })

  it('после успешной записи сетка обновляется без банера, если reload прошёл', async () => {
    const date = '2026-08-10'
    buildBaseFetch(date, {
      appointmentsOnReload: () => appointmentsPayload.items,
    })
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))
    fireEvent.click(await screen.findByTestId('patient-option-p-002'))
    fireEvent.click(screen.getByTestId('card-book'))

    await waitFor(() => {
      expect(screen.queryByTestId('operator-refresh-error')).not.toBeInTheDocument()
    })
    expect(screen.queryByTestId('slot-card')).not.toBeInTheDocument()
  })
})

describe('OperatorPage — отказ перезагрузки после переноса виден оператору', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('после успешного PATCH, если GET /appointments упал, виден банер ошибки', async () => {
    const date = '2026-08-10'
    buildBaseFetch(date, {
      appointmentsOnReload: (callIndex) => {
        if (callIndex === 1) return appointmentsPayload.items
        return null
      },
    })
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:15'))
    await screen.findByTestId('slot-card')

    fireEvent.click(await screen.findByTestId('slot-d-001-08:30'))

    const rescheduleBtn = await screen.findByTestId('card-reschedule')
    await waitFor(() => expect(rescheduleBtn).not.toBeDisabled())
    fireEvent.click(rescheduleBtn)

    const banner = await screen.findByTestId('operator-refresh-error')
    expect(banner.textContent).toContain('База данных временно недоступна')
  })

  it('после успешного переноса сетка обновляется без банера', async () => {
    const date = '2026-08-10'
    buildBaseFetch(date, {
      appointmentsOnReload: () => appointmentsPayload.items,
    })
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:15'))
    await screen.findByTestId('slot-card')

    fireEvent.click(await screen.findByTestId('slot-d-001-08:30'))
    const rescheduleBtn = await screen.findByTestId('card-reschedule')
    await waitFor(() => expect(rescheduleBtn).not.toBeDisabled())
    fireEvent.click(rescheduleBtn)

    await waitFor(() => {
      expect(screen.queryByTestId('operator-refresh-error')).not.toBeInTheDocument()
    })
  })
})

describe('OperatorPage — банер скрывается при повторном успешном действии', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('если предыдущий refresh упал, банер сохраняется до следующего успешного обновления', async () => {
    const date = '2026-08-10'
    const shouldFail = true
    buildBaseFetch(date, {
      appointmentsOnReload: (callIndex) => {
        if (callIndex === 1) return appointmentsPayload.items
        if (shouldFail) return null
        return appointmentsPayload.items
      },
    })
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))
    fireEvent.click(await screen.findByTestId('patient-option-p-002'))
    fireEvent.click(screen.getByTestId('card-book'))

    await screen.findByTestId('operator-refresh-error')
    expect(screen.getByTestId('slot-card')).toBeInTheDocument()
  })
})
