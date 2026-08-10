import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Provider } from '../../theme'
import { OperatorPage } from './operator-page'
import type {
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

const mockApiOk = (date: string) => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url.includes('/schedule/')) {
      return Promise.resolve(new Response(JSON.stringify(buildSchedule(date)), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (isAppointmentsList(url)) {
      const d = dateFromUrl(url, date)
      const items = appointmentsPayload.items.map((a) => ({
        ...a,
        start: `${d}${a.start.slice(10)}`,
      }))
      return Promise.resolve(new Response(JSON.stringify({ date: d, items }), {
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

const mockApiConflict = (date: string) => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (isAppointmentsList(url) && init?.method === 'POST') {
      return Promise.resolve(new Response(JSON.stringify({
        error: 'slot_taken',
        message: 'Выбранный слот уже занят',
      }), {
        status: 409, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.includes('/schedule/')) {
      return Promise.resolve(new Response(JSON.stringify(buildSchedule(date)), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (isAppointmentsList(url)) {
      const d = dateFromUrl(url, date)
      const items = appointmentsPayload.items.map((a) => ({
        ...a,
        start: `${d}${a.start.slice(10)}`,
      }))
      return Promise.resolve(new Response(JSON.stringify({ date: d, items }), {
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

describe('OperatorPage — сетка из данных стаба', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('строит сетку из данных стаба, а не из констант', async () => {
    const date = '2026-08-10'
    mockApiOk(date)
    renderWithProviders(<OperatorPage />)

    const grid = await screen.findByTestId('schedule-grid')
    expect(grid).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('row-08:00')).toBeInTheDocument()
      expect(screen.getByTestId('row-08:45')).toBeInTheDocument()
    })

    expect(screen.getByTestId('slot-d-001-08:00')).toHaveAttribute('data-busy', 'false')
    expect(screen.getByTestId('slot-d-001-08:15')).toHaveAttribute('data-busy', 'true')
    expect(screen.getByTestId('slot-d-002-08:15')).toHaveAttribute('data-busy', 'false')

    const d001Busy = screen.getByTestId('slot-d-001-08:15')
    expect(d001Busy.querySelector('[data-testid="busy-label"]')).toHaveTextContent('Алексеев Игорь Николаевич')

    const d002Name = screen.getByText('Петров А.В.')
    expect(d002Name).toBeInTheDocument()
  })

  it('открывает карточку при клике на свободный слот', async () => {
    const date = '2026-08-10'
    mockApiOk(date)
    renderWithProviders(<OperatorPage />)

    const freeSlot = await screen.findByTestId('slot-d-001-08:00')
    fireEvent.click(freeSlot)

    const card = await screen.findByTestId('slot-card')
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('data-busy', 'false')

    expect(await screen.findByTestId('card-time')).toHaveTextContent('08:00')
    expect(screen.getByTestId('card-specialty')).toHaveTextContent('Терапевт')
    expect(screen.getByTestId('card-book')).toBeInTheDocument()
  })

  it('показывает ошибку конфликта при записи в занятый слот (а не молча перезаписывает)', async () => {
    const date = '2026-08-10'
    mockApiConflict(date)
    renderWithProviders(<OperatorPage />)

    const freeSlot = await screen.findByTestId('slot-d-001-08:00')
    fireEvent.click(freeSlot)

    fireEvent.click(await screen.findByTestId('patient-option-p-002'))

    const bookBtn = await screen.findByTestId('card-book')
    await waitFor(() => expect(bookBtn).not.toBeDisabled())
    fireEvent.click(bookBtn)

    const err = await screen.findByTestId('card-error')
    expect(err).toHaveTextContent('Выбранный слот уже занят')

    const card = screen.getByTestId('slot-card')
    expect(card).toBeInTheDocument()
  })

  it('открывает карточку busy-слота и показывает действия Перенести', async () => {
    const date = '2026-08-10'
    mockApiOk(date)
    renderWithProviders(<OperatorPage />)

    const busySlot = await screen.findByTestId('slot-d-001-08:15')
    fireEvent.click(busySlot)

    const card = await screen.findByTestId('slot-card')
    expect(card).toHaveAttribute('data-busy', 'true')

    expect(screen.queryByTestId('card-book')).not.toBeInTheDocument()
    expect(screen.getByTestId('card-reschedule')).toBeInTheDocument()
    expect(screen.getByTestId('card-time')).toHaveTextContent('08:15')
  })

  it('Shift overview считает статистику из данных, а не из констант', async () => {
    const date = '2026-08-10'

    const initialPayload: AppointmentList = {
      date: '2026-08-10',
      items: [
        {
          id: 'a-001',
          doctorId: 'd-001',
          patientId: 'p-001',
          start: `${date}T08:15:00+03:00`,
          durationMin: 30,
          status: 'scheduled',
          paymentType: 'regular',
          serviceId: 's-001',
          doctorName: 'Иванова Е.С.',
          patientName: 'Алексеев Игорь Николаевич',
        },
      ],
    }

    const heavyPayload: AppointmentList = {
      date: '2026-08-10',
      items: [
        {
          id: 'a-010',
          doctorId: 'd-001',
          patientId: 'p-010',
          start: `${date}T08:00:00+03:00`,
          durationMin: 45,
          status: 'scheduled',
          paymentType: 'regular',
          serviceId: 's-001',
          doctorName: 'Иванова Е.С.',
          patientName: 'Иванов Иван',
        },
        {
          id: 'a-011',
          doctorId: 'd-002',
          patientId: 'p-011',
          start: `${date}T08:15:00+03:00`,
          durationMin: 75,
          status: 'no_show',
          paymentType: 'regular',
          serviceId: 's-001',
          doctorName: 'Петров А.В.',
          patientName: 'Петров Пётр',
        },
        {
          id: 'a-012',
          doctorId: 'd-001',
          patientId: 'p-012',
          start: `${date}T08:30:00+03:00`,
          durationMin: 60,
          status: 'arrived',
          paymentType: 'regular',
          serviceId: 's-001',
          doctorName: 'Иванова Е.С.',
          patientName: 'Сидоров Сидор',
        },
      ],
    }

    const buildFetch = (payload: AppointmentList) =>
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        if (url.includes('/schedule/')) {
          return Promise.resolve(new Response(JSON.stringify(buildSchedule(date)), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          }))
        }
        if (isAppointmentsList(url)) {
          return Promise.resolve(new Response(JSON.stringify({ ...payload, date: (typeof url==='string' && (url.match(/date=([^&]+)/)||[])[1]) || payload.date }), {
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

    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockReset()
    fetchMock.mockImplementation(buildFetch(initialPayload))

    const { unmount } = renderWithProviders(<OperatorPage />)

    await screen.findByTestId('schedule-grid')

    const totalA = screen.getByTestId('shift-stat-total').textContent
    const avgA = screen.getByTestId('shift-stat-avg').textContent
    const needsA = screen.getByTestId('shift-stat-needs-action').textContent

    expect(totalA).toMatch(/^\d+$/)
    expect(needsA).toMatch(/^\d+$/)
    expect(totalA).not.toBe('0')
    expect(totalA).toBe('1')
    expect(needsA).toBe('0')
    expect(avgA).toBe('00:30')

    unmount()

    fetchMock.mockReset()
    fetchMock.mockImplementation(buildFetch(heavyPayload))

    renderWithProviders(<OperatorPage />)

    await screen.findByTestId('schedule-grid')

    const totalB = await screen.findByTestId('shift-stat-total')
    const totalBText = totalB.textContent
    const avgB = screen.getByTestId('shift-stat-avg').textContent
    const needsB = screen.getByTestId('shift-stat-needs-action').textContent

    expect(totalBText).toBe('3')
    expect(needsB).toBe('2')
    expect(avgB).toBe('01:00')

    expect(totalBText).not.toBe(totalA)
    expect(needsB).not.toBe(needsA)
    expect(avgB).not.toBe(avgA)
  })

  it('Shift overview на пустом списке даёт нули и «—», а не константы', async () => {
    const date = '2026-08-10'
    const emptyPayload: AppointmentList = { items: [], date: '2026-08-10' }

    const buildFetch = (payload: AppointmentList) =>
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        if (url.includes('/schedule/')) {
          return Promise.resolve(new Response(JSON.stringify(buildSchedule(date)), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          }))
        }
        if (isAppointmentsList(url)) {
          return Promise.resolve(new Response(JSON.stringify({ ...payload, date: (typeof url==='string' && (url.match(/date=([^&]+)/)||[])[1]) || payload.date }), {
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

    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockReset()
    fetchMock.mockImplementation(buildFetch(emptyPayload))

    renderWithProviders(<OperatorPage />)
    await screen.findByTestId('schedule-grid')

    const total = screen.getByTestId('shift-stat-total').textContent
    const avg = screen.getByTestId('shift-stat-avg').textContent
    const needs = screen.getByTestId('shift-stat-needs-action').textContent

    expect(total).toBe('0')
    expect(needs).toBe('0')
    expect(avg).toBe('—')
  })

  it('кнопка «Записать» disabled без выбранного пациента и не уходит на p-001', async () => {
    const date = '2026-08-10'
    mockApiOk(date)
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:00'))

    const bookBtn = await screen.findByTestId('card-book')
    expect(bookBtn).toBeDisabled()

    const posts: string[] = []
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const orig = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (isAppointmentsList(url) && init?.method === 'POST') {
        posts.push(typeof init.body === 'string' ? init.body : '')
        return Promise.resolve(new Response(JSON.stringify({
          id: 'a-999', doctorId: 'd-001', patientId: 'p-999',
          start: `${date}T08:00:00+03:00`, durationMin: 30,
          status: 'scheduled', paymentType: 'regular', serviceId: 's-001',
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }))
      }
      return orig ? orig(input as Request | string, init) : Promise.resolve(new Response('not found', { status: 404 }))
    })

    fireEvent.click(bookBtn)

    expect(posts).toEqual([])
    expect(bookBtn).toBeDisabled()

    fireEvent.click(screen.getByTestId('patient-option-p-003'))

    await waitFor(() => {
      expect(screen.getByTestId('card-book')).not.toBeDisabled()
    })
    expect(screen.getByTestId('patient-selected')).toHaveTextContent('Григорьев Артём Дмитриевич')

    fireEvent.click(screen.getByTestId('card-book'))

    await waitFor(() => {
      expect(posts.length).toBe(1)
    })
    const body = JSON.parse(posts[0])
    expect(body.patientId).toBe('p-003')
    expect(body.patientId).not.toBe('p-001')
    expect(body.doctorId).toBe('d-001')
    expect(body.start).toBe(`${date}T08:00:00+03:00`)
  })

  it('перенос уходит в целевой свободный слот с его временем и календарной датой (смена суток)', async () => {
    const date = '2030-03-09'
    mockApiOk(date)
    renderWithProviders(<OperatorPage />, date)

    fireEvent.click(await screen.findByTestId('slot-d-001-08:15'))

    const card = await screen.findByTestId('slot-card')
    expect(card).toHaveAttribute('data-busy', 'true')

    const rescheduleBtn = screen.getByTestId('card-reschedule')
    expect(rescheduleBtn).toBeDisabled()

    fireEvent.click(await screen.findByTestId('slot-d-002-08:45'))

    await waitFor(() => {
      expect(screen.getByTestId('card-reschedule')).not.toBeDisabled()
    })

    const patches: string[] = []
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const orig = fetchMock.getMockImplementation()
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (init?.method === 'PATCH' && url.includes('/appointments/')) {
        patches.push(typeof init.body === 'string' ? init.body : '')
        return Promise.resolve(new Response(JSON.stringify({
          id: 'a-001', doctorId: 'd-002', patientId: 'p-001',
          start: `${date}T08:45:00+03:00`, durationMin: 30,
          status: 'scheduled', paymentType: 'regular', serviceId: 's-001',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      return orig ? orig(input as Request | string, init) : Promise.resolve(new Response('not found', { status: 404 }))
    })

    fireEvent.click(screen.getByTestId('card-reschedule'))

    await waitFor(() => {
      expect(patches.length).toBe(1)
    })
    const body = JSON.parse(patches[0])
    expect(body.start).toBe('2030-03-09T08:45:00+03:00')
    expect(body.doctorId).toBe('d-002')
    expect(body.durationMin).toBe(30)
    expect(body.start).not.toMatch(/T08:15/)
    expect(body.start).not.toMatch(/Z$/)
  })
})
