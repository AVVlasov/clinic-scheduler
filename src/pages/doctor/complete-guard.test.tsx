import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DoctorPage } from './doctor-page'
import type { Appointment, Service } from '../../__data__/types'

const isAppointmentsList = (url: string) => url.includes('/appointments') && !/\/appointments\//.test(url.split('?')[0])
const dateFromUrl = (url: string) => (url.match(/date=([^&]+)/) || [null, '2026-08-10'])[1] as string



const mockGetConfigValue = vi.fn()

vi.mock('@brojs/cli', () => ({
  getConfigValue: () => mockGetConfigValue(),
  getNavigation: () => ({}),
  getNavigationValue: () => '/clinic-scheduler',
}))

const baseAppointments: Appointment[] = [
  {
    id: 'a-scheduled',
    doctorId: 'd-001',
    patientId: 'p-001',
    start: '2026-08-06T09:00:00',
    durationMin: 30,
    status: 'scheduled',
    paymentType: 'regular',
    serviceId: 's-001',
    doctorName: 'Иванова Елена Сергеевна',
    patientName: 'Алексеев Игорь Николаевич',
    patientPhone: '+7 900 100-00-01',
    patientBirthDate: '1985-03-12',
    patientUid: 'UID 0001 4480',
    complaints: null,
    diagnosis: null,
    visitType: null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
  },
  {
    id: 'a-arrived',
    doctorId: 'd-001',
    patientId: 'p-002',
    start: '2026-08-06T10:30:00',
    durationMin: 20,
    status: 'arrived',
    paymentType: 'dms',
    serviceId: 's-002',
    doctorName: 'Иванова Елена Сергеевна',
    patientName: 'Белова Татьяна Викторовна',
    patientPhone: '+7 900 100-00-02',
    patientBirthDate: '1992-07-21',
    patientUid: 'UID 0002 4492',
    complaints: null,
    diagnosis: null,
    visitType: null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
  },
  {
    id: 'a-noshow',
    doctorId: 'd-002',
    patientId: 'p-003',
    start: '2026-08-06T11:00:00',
    durationMin: 30,
    status: 'no_show',
    paymentType: 'promo',
    serviceId: 's-003',
    doctorName: 'Петров Андрей Викторович',
    patientName: 'Григорьев Артём Дмитриевич',
    patientPhone: '+7 900 100-00-03',
    patientBirthDate: '1978-11-05',
    patientUid: 'UID 0003 4504',
    complaints: null,
    diagnosis: null,
    visitType: null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
  },
]

const baseServices: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём', price: 1800 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
]

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const renderPage = () => render(
  <MemoryRouter initialEntries={['/clinic-scheduler/doctor?date=2026-08-10&doctorId=d-001']}>
    <ChakraProvider value={defaultSystem}>
      <DoctorPage />
    </ChakraProvider>
  </MemoryRouter>,
)

const fillRequiredFields = () => {
  fireEvent.change(screen.getByTestId('visit-complaints'), {
    target: { value: 'Боль в области 38 зуба третьи сутки' },
  })
  fireEvent.change(screen.getByTestId('visit-diagnosis'), {
    target: { value: 'K01.1 Ретенированный зуб' },
  })
}

describe('DoctorPage — завершение приёма: гард по статусу и 409', () => {
  beforeEach(() => {
    mockGetConfigValue.mockReturnValue('https://clinic.test/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('для записи в статусе scheduled кнопка «Завершить приём» заблокирована и показано, чего не хватает', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (isAppointmentsList(url)) return jsonResponse({ date: dateFromUrl(url), items: baseAppointments })
      if (url.includes('/doctors')) return jsonResponse({ items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }, { id: 'd-002', name: 'Петров А.В.', specialty: 'Кардиолог', cabinet: '305' }] })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
      if (url.includes('/history')) return jsonResponse({ items: [] })
      if (url.includes('/waitlist') && method === 'POST') {
        return jsonResponse({ id: 'W-9999', kind: 'from_doctor', status: 'open', priority: 'high', patientId: 'p-001', patientName: null, patientPhone: null, serviceId: 's-002', doctorId: 'd-001', dateFrom: '2026-08-24', dateTo: '2026-08-24', comment: '', insuranceAppointmentId: null, createdAt: '2026-08-10T10:00:00Z', createdBy: 'doctor', fulfilledAppointmentId: null, fulfilledAt: null })
      }
      if (url.includes('/waitlist')) {
        return jsonResponse({ items: [], openCount: 0 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    fillRequiredFields()

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(true)

    const reason = screen.getByTestId('visit-block-reason').textContent ?? ''
    expect(reason.toLowerCase()).toContain('приход')
  })

  it('для записи в статусе no_show кнопка заблокирована с пояснением', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (isAppointmentsList(url)) return jsonResponse({ date: dateFromUrl(url), items: baseAppointments })
      if (url.includes('/doctors')) return jsonResponse({ items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }, { id: 'd-002', name: 'Петров А.В.', specialty: 'Кардиолог', cabinet: '305' }] })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
      if (url.includes('/history')) return jsonResponse({ items: [] })
      if (url.includes('/waitlist') && method === 'POST') {
        return jsonResponse({ id: 'W-9999', kind: 'from_doctor', status: 'open', priority: 'high', patientId: 'p-001', patientName: null, patientPhone: null, serviceId: 's-002', doctorId: 'd-001', dateFrom: '2026-08-24', dateTo: '2026-08-24', comment: '', insuranceAppointmentId: null, createdAt: '2026-08-10T10:00:00Z', createdBy: 'doctor', fulfilledAppointmentId: null, fulfilledAt: null })
      }
      if (url.includes('/waitlist')) {
        return jsonResponse({ items: [], openCount: 0 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByTestId('day-visit-a-noshow'))

    await waitFor(() => {
      expect(screen.getAllByText('Григорьев Артём Дмитриевич').length).toBeGreaterThan(0)
    })

    fillRequiredFields()

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(true)

    const reason = screen.getByTestId('visit-block-reason').textContent ?? ''
    expect(reason.toLowerCase()).toContain('не явился')
  })

  it('после arrived→in_progress кнопка разблокирована и PATCH completed уходит на сервер', async () => {
    let lastPatchBody: unknown = null
    let nextAppointments: Appointment[] = [...baseAppointments]

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method === 'GET' && url.includes('/history')) {
        return jsonResponse({ items: [] })
      }
      if (method === 'GET' && isAppointmentsList(url)) {
        return jsonResponse({ date: dateFromUrl(url), items: nextAppointments })
      }
      if (method === 'GET' && url.includes('/doctors')) return jsonResponse({ items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }] })
      if (method === 'GET' && url.endsWith('/services')) {
        return jsonResponse({ items: baseServices })
      }
      if (method === 'GET' && url.includes('/history')) return jsonResponse({ items: [] })
      if (method === 'PATCH' && url.includes('/appointments/')) {
        const match = url.match(/\/appointments\/([^/?]+)/)
        const id = match?.[1] ?? ''
        lastPatchBody = init?.body
        const body = JSON.parse(String(init?.body ?? '{}')) as { status?: Appointment['status'] }
        const target = nextAppointments.find((a) => a.id === id) as Appointment
        const updated: Appointment = { ...target, status: body.status ?? target.status }
        nextAppointments = nextAppointments.map((a) => (a.id === id ? updated : a))
        return jsonResponse(updated)
      }
      if (url.includes('/history')) return jsonResponse({ items: [] })
      if (url.includes('/waitlist') && method === 'POST') {
        return jsonResponse({ id: 'W-9999', kind: 'from_doctor', status: 'open', priority: 'high', patientId: 'p-001', patientName: null, patientPhone: null, serviceId: 's-002', doctorId: 'd-001', dateFrom: '2026-08-24', dateTo: '2026-08-24', comment: '', insuranceAppointmentId: null, createdAt: '2026-08-10T10:00:00Z', createdBy: 'doctor', fulfilledAppointmentId: null, fulfilledAt: null })
      }
      if (url.includes('/waitlist')) {
        return jsonResponse({ items: [], openCount: 0 })
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByTestId('day-visit-a-arrived'))

    await waitFor(() => {
      expect(screen.getAllByText('Белова Татьяна Викторовна').length).toBeGreaterThan(0)
    })

    expect((screen.getByTestId('visit-finish') as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(screen.getByTestId('visit-advance-status'))
    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('На приёме')
    })

    fillRequiredFields()
    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(false)
    fireEvent.click(finish)
    fireEvent.click(await screen.findByTestId('visit-finish-confirm-yes'))

    await waitFor(() => {
      expect(JSON.parse(String(lastPatchBody))).toMatchObject({ status: 'completed' })
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/appointments/a-arrived'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('при 409 invalid_state_transition введённый протокол сохраняется и показывается текст ошибки', async () => {
    const withInProgress: Appointment[] = baseAppointments.map((a) =>
      a.id === 'a-arrived' ? { ...a, status: 'in_progress' } : a,
    )
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method === 'GET' && isAppointmentsList(url)) {
        return jsonResponse({ date: dateFromUrl(url), items: withInProgress })
      }
      if (method === 'GET' && url.includes('/doctors')) return jsonResponse({ items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }] })
      if (method === 'GET' && url.endsWith('/services')) {
        return jsonResponse({ items: baseServices })
      }
      if (method === 'GET' && url.includes('/history')) return jsonResponse({ items: [] })
      if (method === 'PATCH' && url.includes('/appointments/')) {
        return jsonResponse(
          {
            error: 'invalid_state_transition',
            message: 'Переход статуса из «in_progress» в «completed» запрещён',
          },
          409,
        )
      }
      if (url.includes('/history')) return jsonResponse({ items: [] })
      if (url.includes('/waitlist') && method === 'POST') {
        return jsonResponse({ id: 'W-9999', kind: 'from_doctor', status: 'open', priority: 'high', patientId: 'p-001', patientName: null, patientPhone: null, serviceId: 's-002', doctorId: 'd-001', dateFrom: '2026-08-24', dateTo: '2026-08-24', comment: '', insuranceAppointmentId: null, createdAt: '2026-08-10T10:00:00Z', createdBy: 'doctor', fulfilledAppointmentId: null, fulfilledAt: null })
      }
      if (url.includes('/waitlist')) {
        return jsonResponse({ items: [], openCount: 0 })
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getByTestId('day-visit-a-arrived'))

    await waitFor(() => {
      expect(screen.getAllByText('Белова Татьяна Викторовна').length).toBeGreaterThan(0)
    })

    const complaint = 'Боль в области 38 зуба третьи сутки'
    const diagnosis = 'K01.1 Ретенированный зуб'

    fireEvent.change(screen.getByTestId('visit-complaints'), {
      target: { value: complaint },
    })
    fireEvent.change(screen.getByTestId('visit-diagnosis'), {
      target: { value: diagnosis },
    })
    fireEvent.click(screen.getByTestId('visit-service-s-001'))
    fireEvent.click(screen.getByTestId('visit-rec-Контрольный осмотр через 7 дней'))
    fireEvent.change(screen.getByTestId('visit-next-date'), {
      target: { value: '2026-08-24' },
    })
    fireEvent.change(screen.getByTestId('visit-next-service'), {
      target: { value: 's-002' },
    })

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(false)

    fireEvent.click(finish)
    fireEvent.click(await screen.findByTestId('visit-finish-confirm-yes'))

    await waitFor(() => {
      // Латинские имена статусов из сообщения сервера до врача не доходят —
      // он читает объяснение, а не разбор перехода.
      const text = screen.getByTestId('visit-submit-error-text').textContent ?? ''
      expect(text).toContain('Из текущего состояния так перейти нельзя')
      expect(text).not.toMatch(/[A-Za-z]/)
    })

    const complaintsField = screen.getByTestId('visit-complaints') as HTMLTextAreaElement
    expect(complaintsField.value).toBe(complaint)

    const diagnosisField = screen.getByTestId('visit-diagnosis') as HTMLInputElement
    expect(diagnosisField.value).toBe(diagnosis)

    const serviceS001 = screen.getByTestId('visit-service-s-001')
    expect(serviceS001.textContent).toContain('✓')

    const rec = screen.getByTestId('visit-rec-Контрольный осмотр через 7 дней')
    expect(rec.getAttribute('data-active')).toBe('true')

    const next = screen.getByTestId('visit-next-date') as HTMLInputElement
    expect(next.value).toBe('2026-08-24')

    const finishAfter = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finishAfter.disabled).toBe(false)

    fireEvent.click(screen.getByTestId('visit-submit-error-dismiss'))

    await waitFor(() => {
      expect(screen.queryByTestId('visit-submit-error')).toBeNull()
    })
  })
})
