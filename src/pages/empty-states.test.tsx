import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'

import { Provider } from '../theme'
import { DoctorPage } from './doctor/doctor-page'
import { RegistrarPage } from './registrar/registrar-page'
import { OperatorPage } from './operator/operator-page'
import type {
  AppointmentList,
  DoctorList,
  PatientList,
  Schedule,
  ServiceList,
} from '../__data__/types'

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

const jsonResponse = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))

interface DeferredRequest<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

const deferred = <T,>(): DeferredRequest<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

const baseServices: ServiceList = {
  items: [
    { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  ],
}

const emptyAppointments: AppointmentList = { items: [], date: '2026-08-10' }

const emptySchedule = (date: string): Schedule => ({
  date,
  startTime: '08:00',
  endTime: '09:00',
  stepMinutes: 15,
  slots: [],
})

const baseDoctors: DoctorList = {
  items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }],
}

const basePatients: PatientList = {
  items: [
    { id: 'p-001', name: 'Алексеев Игорь Николаевич', phone: '+7 900 100-00-01', birthDate: '1985-03-12' },
  ],
}

const renderWithProviders = (ui: React.ReactNode, initialPath = '/clinic-scheduler/operator') =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Provider>{ui}</Provider>
    </MemoryRouter>,
  )

describe('TASK-35 — loading vs empty vs error на трёх АРМ', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('DoctorPage', () => {
    const doctorPath = '/clinic-scheduler/doctor?date=2026-08-10&doctorId=d-001'

    it('до ответа API показывает loading, после пустого ответа — empty-state с причиной, без «Загрузка приёмов»', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      const apptsSlot = deferred<Response>()
      const svcSlot = deferred<Response>()
      fetchMock.mockImplementation((input) => {
        const url = String(input)
        if (url.includes('/doctors')) return jsonResponse(baseDoctors)
        if (isAppointmentsList(url)) return apptsSlot.promise
        if (url.endsWith('/services')) return svcSlot.promise
        return jsonResponse({ error: 'not_found' }, 404)
      })

      renderWithProviders(<DoctorPage />, doctorPath)

      expect(await screen.findByTestId('doctor-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('doctor-empty')).not.toBeInTheDocument()
      expect(screen.queryByText(/Загрузка приёмов/)).toBeInTheDocument()

      await act(async () => {
        apptsSlot.resolve(jsonResponse(emptyAppointments))
        svcSlot.resolve(jsonResponse(baseServices))
      })

      await waitFor(() => {
        expect(screen.queryByTestId('doctor-loading')).not.toBeInTheDocument()
      })
      const empty = await screen.findByTestId('doctor-empty')
      expect(empty).toBeInTheDocument()
      const reason = screen.getByTestId('doctor-empty-reason')
      expect(reason.textContent ?? '').not.toEqual('')
      // Главное: текст «Загрузка приёмов» ушёл — экран больше не выглядит «зависшим»
      expect(screen.queryByText(/Загрузка приёмов/)).not.toBeInTheDocument()
    })

    it('при ошибке API показывает error-блок, loading при этом не виден', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      fetchMock.mockImplementation((input) => {
        const url = String(input)
        if (url.includes('/doctors')) return jsonResponse(baseDoctors)
        if (isAppointmentsList(url)) {
          return jsonResponse({ error: 'server_error', message: 'База данных временно недоступна' }, 500)
        }
        if (url.endsWith('/services')) return jsonResponse(baseServices)
        return jsonResponse({ error: 'not_found' }, 404)
      })

      renderWithProviders(<DoctorPage />, doctorPath)

      const err = await screen.findByTestId('doctor-error')
      expect(err.textContent).toContain('База данных временно недоступна')
      expect(screen.queryByTestId('doctor-loading')).not.toBeInTheDocument()
      expect(screen.getByTestId('doctor-retry')).toBeInTheDocument()
    })
  })

  describe('RegistrarPage', () => {
    it('до ответа API показывает loading, после пустого ответа — empty-state с причиной и нулевыми счётчиками', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      const apptsSlot = deferred<Response>()
      const svcSlot = deferred<Response>()
      fetchMock.mockImplementation((input) => {
        const url = String(input)
        if (isAppointmentsList(url)) return apptsSlot.promise
        if (url.endsWith('/services')) return svcSlot.promise
        if (url.endsWith('/doctors')) return jsonResponse(baseDoctors)
        return jsonResponse({ error: 'not_found' }, 404)
      })

      renderWithProviders(<RegistrarPage />, '/clinic-scheduler/registrar?date=2026-08-10')

      expect(await screen.findByTestId('registrar-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('registrar-empty')).not.toBeInTheDocument()
      expect(screen.queryByText(/Загрузка очереди/)).toBeInTheDocument()

      await act(async () => {
        apptsSlot.resolve(jsonResponse(emptyAppointments))
        svcSlot.resolve(jsonResponse(baseServices))
      })

      await waitFor(() => {
        expect(screen.queryByTestId('registrar-loading')).not.toBeInTheDocument()
      })

      const empty = await screen.findByTestId('registrar-empty')
      expect(empty).toBeInTheDocument()
      const reason = screen.getByTestId('registrar-empty-reason')
      expect(reason.textContent ?? '').toMatch(/приём|очередь/i)
      expect(screen.queryByText(/Загрузка очереди/)).not.toBeInTheDocument()

      // Счётчики шапки остались — пустые значения это не «loading»
      expect(screen.getByTestId('counter-waiting')).toHaveTextContent('0')
      expect(screen.getByTestId('counter-arrived')).toHaveTextContent('0')
    })

    it('при ошибке API показывает error-блок, loading при этом не виден', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      fetchMock.mockImplementation((input) => {
        const url = String(input)
        if (isAppointmentsList(url)) {
          return jsonResponse({ error: 'server_error', message: 'Сервер недоступен' }, 500)
        }
        if (url.endsWith('/services')) return jsonResponse(baseServices)
        if (url.endsWith('/doctors')) return jsonResponse(baseDoctors)
        return jsonResponse({ error: 'not_found' }, 404)
      })

      renderWithProviders(<RegistrarPage />, '/clinic-scheduler/registrar?date=2026-08-10')

      const err = await screen.findByTestId('registrar-error')
      expect(err.textContent).toContain('Сервер недоступен')
      expect(screen.queryByTestId('registrar-loading')).not.toBeInTheDocument()
      expect(screen.getByTestId('registrar-retry')).toHaveTextContent('Повторить')
    })

    it('отказ действия не стирает очередь: таблица на месте, показан action-error', async () => {
      const date = '2026-08-10'
      const appointments: AppointmentList = {
        date,
        items: [{
          id: 'a-001',
          doctorId: 'd-001',
          patientId: 'p-001',
          start: `${date}T09:00:00+03:00`,
          durationMin: 30,
          status: 'scheduled',
          paymentType: 'regular',
          serviceId: 's-001',
          doctorName: 'Иванова Е.С.',
          patientName: 'Алексеев Игорь Николаевич',
          patientPhone: '+7 900 100-00-01',
          patientBirthDate: '1985-03-12',
          patientUid: 'UID-1',
          complaints: null,
          diagnosis: null,
          visitType: null,
          performedServiceIds: [],
          recommendations: [],
          nextVisit: null,
        }],
      }
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      fetchMock.mockImplementation((input, init) => {
        const url = String(input)
        const method = (init?.method ?? 'GET').toUpperCase()
        if (method === 'PATCH' && url.includes('/appointments/')) {
          return jsonResponse({
            error: 'invalid_state_transition',
            message: 'Переход статуса запрещён',
          }, 409)
        }
        if (isAppointmentsList(url)) return jsonResponse(appointments)
        if (url.endsWith('/services')) return jsonResponse(baseServices)
        if (url.endsWith('/doctors')) return jsonResponse(baseDoctors)
        return jsonResponse({ error: 'not_found' }, 404)
      })

      renderWithProviders(<RegistrarPage />, '/clinic-scheduler/registrar?date=2026-08-10')
      await screen.findByTestId('queue-row-a-001')
      await act(async () => {
        screen.getByTestId('mark-arrived-a-001').click()
      })
      await waitFor(() => {
        expect(screen.getByTestId('registrar-action-error')).toHaveTextContent('Переход статуса запрещён')
      })
      expect(screen.getByTestId('queue-row-a-001')).toBeInTheDocument()
      expect(screen.getByTestId('counter-waiting')).toBeInTheDocument()
      expect(screen.queryByTestId('registrar-error')).not.toBeInTheDocument()
    })
  })

  describe('OperatorPage', () => {
    it('до ответа API показывает loading, после пустого расписания — empty-state с причиной', async () => {
      const date = '2026-08-10'
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      const scheduleSlot = deferred<Response>()
      const apptsSlot = deferred<Response>()
      const docsSlot = deferred<Response>()
      const svcSlot = deferred<Response>()
      const patsSlot = deferred<Response>()

      fetchMock.mockImplementation((input) => {
        const url = String(input)
        if (url.includes('/schedule/')) return scheduleSlot.promise
        if (isAppointmentsList(url)) return apptsSlot.promise
        if (url.endsWith('/doctors')) return docsSlot.promise
        if (url.endsWith('/services')) return svcSlot.promise
        if (url.endsWith('/patients')) return patsSlot.promise
        if (url.includes('/waitlist')) return jsonResponse({ items: [] })
        return jsonResponse({ error: 'not_found' }, 404)
      })

      renderWithProviders(<OperatorPage />, '/clinic-scheduler/operator?date=2026-08-10')

      expect(await screen.findByTestId('operator-loading')).toBeInTheDocument()
      expect(screen.queryByTestId('operator-empty')).not.toBeInTheDocument()

      await act(async () => {
        scheduleSlot.resolve(jsonResponse(emptySchedule(date)))
        apptsSlot.resolve(jsonResponse(emptyAppointments))
        docsSlot.resolve(jsonResponse(baseDoctors))
        svcSlot.resolve(jsonResponse(baseServices))
        patsSlot.resolve(jsonResponse(basePatients))
      })

      await waitFor(() => {
        expect(screen.queryByTestId('operator-loading')).not.toBeInTheDocument()
      })
      const empty = await screen.findByTestId('operator-empty')
      expect(empty).toBeInTheDocument()
      const reason = screen.getByTestId('operator-empty-reason')
      expect(reason.textContent ?? '').not.toEqual('')
      expect(screen.queryByText(/Загрузка сетки/)).not.toBeInTheDocument()
    })

    it('при ошибке API показывает error-блок, loading при этом не виден', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      fetchMock.mockImplementation((input) => {
        const url = String(input)
        if (url.includes('/schedule/')) {
          return jsonResponse({ error: 'server_error', message: 'База данных временно недоступна' }, 500)
        }
        if (isAppointmentsList(url)) return jsonResponse(emptyAppointments)
        if (url.endsWith('/doctors')) return jsonResponse(baseDoctors)
        if (url.endsWith('/services')) return jsonResponse(baseServices)
        if (url.endsWith('/patients')) return jsonResponse(basePatients)
        if (url.includes('/waitlist')) return jsonResponse({ items: [] })
        return jsonResponse({ error: 'not_found' }, 404)
      })

      renderWithProviders(<OperatorPage />, '/clinic-scheduler/operator?date=2026-08-10')

      const err = await screen.findByTestId('operator-error')
      expect(err.textContent).toContain('База данных временно недоступна')
      expect(screen.queryByTestId('operator-loading')).not.toBeInTheDocument()
    })
  })
})
