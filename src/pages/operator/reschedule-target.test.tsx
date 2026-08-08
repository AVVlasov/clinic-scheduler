import React from 'react'
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

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
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
    { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 },
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
  endTime: '11:00',
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
  ],
})

const buildAppointment = (
  doctorId: string,
  status: Appointment['status'],
  date: string,
  time: string,
): Appointment => ({
  id: 'a-001',
  doctorId,
  patientId: 'p-001',
  start: `${date}T${time}:00+03:00`,
  durationMin: 30,
  status,
  paymentType: 'cash',
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
      return Promise.resolve(new Response(JSON.stringify(buildSchedule(date)), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.endsWith('/appointments') && init?.method !== 'PATCH') {
      return Promise.resolve(new Response(JSON.stringify({ items: appointments }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (init?.method === 'PATCH' && url.includes('/appointments/')) {
      if (options.patch) return options.patch(url, init)
      return Promise.resolve(new Response(JSON.stringify({
        id: 'a-001', doctorId: 'd-001', patientId: 'p-001',
        start: `${date}T10:00:00+03:00`, durationMin: 30,
        status: 'scheduled', paymentType: 'cash', serviceId: 's-001',
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
    if (url.endsWith('/patients')) {
      return Promise.resolve(new Response(JSON.stringify(patientsPayload), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response('not found', { status: 404 }))
  })
  return fetchMock
}

const renderWithProviders = (ui: React.ReactNode) =>
  render(<Provider>{ui}</Provider>)

describe('SlotCard — выбор цели переноса', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('исходный слот не предлагает выбрать себя целью', async () => {
    const date = '2030-04-05'
    const appts: AppointmentList = {
      items: [buildAppointment('d-001', 'scheduled', date, '09:00')],
    }
    mockApi(date, appts.items)
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    const card = await screen.findByTestId('slot-card')
    expect(card).toHaveAttribute('data-busy', 'true')

    expect(screen.queryByTestId('card-pick-target')).not.toBeInTheDocument()
    expect(screen.getByTestId('card-reschedule')).toBeDisabled()
  })

  it('перенос без другой цели не отправляет PATCH', async () => {
    const date = '2030-04-05'
    const appts: AppointmentList = {
      items: [buildAppointment('d-001', 'scheduled', date, '09:00')],
    }
    const patches: string[] = []
    mockApi(date, appts.items, {
      patch: (_url, init) => {
        patches.push(typeof init?.body === 'string' ? init.body : '')
        return Promise.resolve(new Response(JSON.stringify({
          id: 'a-001', doctorId: 'd-001', patientId: 'p-001',
          start: `${date}T09:00:00+03:00`, durationMin: 30,
          status: 'scheduled', paymentType: 'cash', serviceId: 's-001',
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      },
    })
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    const rescheduleBtn = await screen.findByTestId('card-reschedule')
    expect(rescheduleBtn).toBeDisabled()

    fireEvent.click(rescheduleBtn)

    await new Promise((r) => setTimeout(r, 50))
    expect(patches).toHaveLength(0)
  })

  it('клик по слоту той же (time, doctor) что выбранный — не выбирает цель', async () => {
    const date = '2030-04-05'
    const appts: AppointmentList = {
      items: [buildAppointment('d-001', 'scheduled', date, '09:00')],
    }
    mockApi(date, appts.items)
    renderWithProviders(<OperatorPage />)

    fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
    await screen.findByTestId('slot-card')

    expect(screen.getByTestId('card-reschedule')).toBeDisabled()

    fireEvent.click(screen.getByTestId('slot-d-001-09:00'))

    await waitFor(() => {
      expect(screen.getByTestId('card-reschedule')).toBeDisabled()
    })
  })

  it('перенос в другой слот отправляет новые координаты и обновляет сетку', async () => {
    const date = '2030-04-05'
    const appts: AppointmentList = {
      items: [buildAppointment('d-001', 'scheduled', date, '09:00')],
    }
    const patches: string[] = []
    let scheduleCalls = 0
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/schedule/')) {
        scheduleCalls += 1
        return Promise.resolve(new Response(JSON.stringify(buildSchedule(date)), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
      }
      if (url.endsWith('/appointments') && init?.method !== 'PATCH') {
        return Promise.resolve(new Response(JSON.stringify({ items: appts.items }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
      }
      if (init?.method === 'PATCH' && url.includes('/appointments/')) {
        patches.push(typeof init?.body === 'string' ? init.body : '')
        return Promise.resolve(new Response(JSON.stringify({
          id: 'a-001', doctorId: 'd-001', patientId: 'p-001',
          start: `${date}T10:00:00+03:00`, durationMin: 30,
          status: 'scheduled', paymentType: 'cash', serviceId: 's-001',
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
      if (url.endsWith('/patients')) {
        return Promise.resolve(new Response(JSON.stringify(patientsPayload), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
      }
      return Promise.resolve(new Response('not found', { status: 404 }))
    })

    renderWithProviders(<OperatorPage />)

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

    await waitFor(() => {
      expect(scheduleCalls).toBeGreaterThan(1)
    })

    await waitFor(() => {
      expect(screen.queryByTestId('slot-card')).not.toBeInTheDocument()
    })
  })
})