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
    id: 'a-001',
    doctorId: 'd-001',
    patientId: 'p-001',
    start: '2026-08-06T09:00:00',
    durationMin: 30,
    status: 'in_progress',
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
    id: 'a-002',
    doctorId: 'd-001',
    patientId: 'p-002',
    start: '2026-08-06T10:30:00',
    durationMin: 20,
    status: 'scheduled',
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
    id: 'a-003',
    doctorId: 'd-002',
    patientId: 'p-003',
    start: '2026-08-06T11:00:00',
    durationMin: 30,
    status: 'completed',
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
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика', price: 2800 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
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

describe('DoctorPage', () => {
  beforeEach(() => {
    mockGetConfigValue.mockReturnValue('https://clinic.test/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('получает список приёмов и услуг из API и отрисовывает оба', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
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

    expect(screen.getAllByText('Первичная консультация').length).toBeGreaterThan(0)
    expect(screen.getAllByText('ЭКГ').length).toBeGreaterThan(0)

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(calledUrls.some((u) => isAppointmentsList(u))).toBe(true)
    expect(calledUrls.some((u) => u.endsWith('/services'))).toBe(true)
  })

  it('выбор приёма в списке меняет карточку пациента', async () => {
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

    expect(screen.getByTestId('visit-phone').textContent).toBe('+7 900 100-00-01')
    expect(screen.getByTestId('visit-payer').textContent).toContain('Обычный')

    fireEvent.click(screen.getByTestId('day-visit-a-002'))

    await waitFor(() => {
      expect(screen.getByTestId('visit-phone').textContent).toBe('+7 900 100-00-02')
    })
    expect(screen.getByTestId('visit-payer').textContent).toContain('ДМС')
    expect(screen.getAllByText('Белова Татьяна Викторовна').length).toBeGreaterThan(0)
  })

  it('«Завершить приём» отправляет PATCH со статусом completed и обновляет список', async () => {
    let patchedId: string | null = null
    let patchedBody: unknown = null
    let nextAppointments: Appointment[] = [...baseAppointments]

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
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
        patchedId = id
        patchedBody = init?.body
        const updated: Appointment = {
          ...(nextAppointments.find((a) => a.id === id) as Appointment),
          status: 'completed',
        }
        nextAppointments = nextAppointments.map((a) => (a.id === id ? updated : a))
        return jsonResponse(updated)
      }
      if (String(input).includes('/history') || url.includes('/history')) return jsonResponse({ items: [] })
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

    fireEvent.change(screen.getByTestId('visit-complaints'), {
      target: { value: 'Боль в области 38 зуба третьи сутки' },
    })
    fireEvent.change(screen.getByTestId('visit-diagnosis'), {
      target: { value: 'K01.1 Ретенированный зуб' },
    })
    fireEvent.click(screen.getByTestId('visit-type-repeat'))
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

    await waitFor(() => {
      expect(patchedId).toBe('a-001')
    })

    expect(patchedId).toBe('a-001')
    expect(JSON.parse(String(patchedBody))).toEqual({
      status: 'completed',
      asDoctorId: 'd-001',
      actor: 'doctor',
      complaints: 'Боль в области 38 зуба третьи сутки',
      diagnosis: 'K01.1 Ретенированный зуб',
      visitType: 'repeat',
      performedServiceIds: ['s-001'],
      recommendations: ['Контрольный осмотр через 7 дней'],
      nextVisit: { date: '2026-08-24', serviceId: 's-002' },
    })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/appointments/a-001'),
      expect.objectContaining({ method: 'PATCH' }),
    )

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Завершён')
    })
  })

  it('протокол переживает перезагрузку: после PATCH следующий GET /appointments возвращает все поля протокола', async () => {
    let patchedBody: unknown = null
    const storedAppointments: Appointment[] = [...baseAppointments]
    const refetchedLists: Appointment[][] = []

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method === 'GET' && isAppointmentsList(url)) {
        const list = storedAppointments.map((a) => ({ ...a }))
        refetchedLists.push(list)
        return jsonResponse({ date: dateFromUrl(url), items: list })
      }
      if (method === 'GET' && url.includes('/doctors')) return jsonResponse({ items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }] })
      if (method === 'GET' && url.endsWith('/services')) {
        return jsonResponse({ items: baseServices })
      }
      if (method === 'GET' && url.includes('/history')) return jsonResponse({ items: [] })
      if (method === 'PATCH' && url.includes('/appointments/')) {
        const match = url.match(/\/appointments\/([^/?]+)/)
        const id = match?.[1] ?? ''
        patchedBody = init?.body
        const body = JSON.parse(String(init?.body)) as Record<string, unknown>
        const target = storedAppointments.find((a) => a.id === id) as Appointment
        const updated: Appointment = {
          ...target,
          status: 'completed',
          complaints: typeof body.complaints === 'string' ? body.complaints : target.complaints,
          diagnosis: typeof body.diagnosis === 'string' ? body.diagnosis : target.diagnosis,
          visitType: body.visitType === 'first' || body.visitType === 'repeat' ? body.visitType : target.visitType,
          performedServiceIds: Array.isArray(body.performedServiceIds)
            ? body.performedServiceIds.filter((v): v is string => typeof v === 'string')
            : target.performedServiceIds,
          recommendations: Array.isArray(body.recommendations)
            ? body.recommendations.filter((v): v is string => typeof v === 'string')
            : target.recommendations,
          nextVisit: body.nextVisit !== undefined ? body.nextVisit as Appointment['nextVisit'] : target.nextVisit,
        }
        const idx = storedAppointments.findIndex((a) => a.id === id)
        storedAppointments[idx] = updated
        return jsonResponse(updated)
      }
      if (String(input).includes('/history') || url.includes('/history')) return jsonResponse({ items: [] })
      if (url.includes('/waitlist') && method === 'POST') {
        return jsonResponse({ id: 'W-9999', kind: 'from_doctor', status: 'open', priority: 'high', patientId: 'p-001', patientName: null, patientPhone: null, serviceId: 's-002', doctorId: 'd-001', dateFrom: '2026-08-24', dateTo: '2026-08-24', comment: '', insuranceAppointmentId: null, createdAt: '2026-08-10T10:00:00Z', createdBy: 'doctor', fulfilledAppointmentId: null, fulfilledAt: null })
      }
      if (url.includes('/waitlist')) {
        return jsonResponse({ items: [], openCount: 0 })
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`)
    })

    const { unmount } = renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    fireEvent.change(screen.getByTestId('visit-complaints'), {
      target: { value: 'Головная боль в височной области третьи сутки' },
    })
    fireEvent.change(screen.getByTestId('visit-diagnosis'), {
      target: { value: 'G44.1 Сосудистая головная боль' },
    })
    fireEvent.click(screen.getByTestId('visit-type-repeat'))
    fireEvent.click(screen.getByTestId('visit-service-s-003'))
    fireEvent.click(screen.getByTestId('visit-rec-КТ контрольная через 14 дней'))
    fireEvent.click(screen.getByTestId('visit-rec-Снятие швов через 10 дней'))
    fireEvent.change(screen.getByTestId('visit-next-date'), {
      target: { value: '2026-08-17' },
    })
    fireEvent.change(screen.getByTestId('visit-next-service'), {
      target: { value: 's-002' },
    })

    fireEvent.click(screen.getByTestId('visit-finish'))

    await waitFor(() => {
      expect(patchedBody).not.toBeNull()
    })

    unmount()

    renderPage()

    await waitFor(() => {
      expect(refetchedLists.length).toBeGreaterThan(1)
    })

    const afterReload = refetchedLists[refetchedLists.length - 1]
    const persisted = afterReload.find((a) => a.id === 'a-001') as Appointment

    expect(persisted.status).toBe('completed')
    expect(persisted.complaints).toBe('Головная боль в височной области третьи сутки')
    expect(persisted.diagnosis).toBe('G44.1 Сосудистая головная боль')
    expect(persisted.visitType).toBe('repeat')
    expect(persisted.performedServiceIds).toEqual(['s-003'])
    expect(persisted.recommendations).toEqual([
      'КТ контрольная через 14 дней',
      'Снятие швов через 10 дней',
    ])
    expect(persisted.nextVisit).toEqual({ date: '2026-08-17', serviceId: 's-002' })

    fireEvent.click(screen.getByTestId('day-visit-a-001'))
    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Завершён')
    })

    const reloadComplaints = screen.getByTestId('visit-complaints') as HTMLTextAreaElement
    expect(reloadComplaints.value).toBe('Головная боль в височной области третьи сутки')

    const reloadDiagnosis = screen.getByTestId('visit-diagnosis') as HTMLInputElement
    expect(reloadDiagnosis.value).toBe('G44.1 Сосудистая головная боль')

    const reloadVisitTypeRepeat = screen.getByTestId('visit-type-repeat')
    expect(reloadVisitTypeRepeat.getAttribute('data-active')).toBe('true')

    const reloadServiceS003 = screen.getByTestId('visit-service-s-003')
    expect(reloadServiceS003.textContent).toContain('✓')

    const reloadServiceS001 = screen.getByTestId('visit-service-s-001')
    expect(reloadServiceS001.textContent).not.toContain('✓')

    const reloadRec1 = screen.getByTestId('visit-rec-КТ контрольная через 14 дней')
    expect(reloadRec1.getAttribute('data-active')).toBe('true')
    const reloadRec2 = screen.getByTestId('visit-rec-Снятие швов через 10 дней')
    expect(reloadRec2.getAttribute('data-active')).toBe('true')

    const reloadNextVisit = screen.getByTestId('visit-next-date') as HTMLInputElement
    expect(reloadNextVisit.value).toBe('2026-08-17')

    const reloadFinish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(reloadFinish.disabled).toBe(true)

    const getAppointmentCalls = fetchMock.mock.calls.filter(
      (c) => isAppointmentsList(String(c[0])) && (c[1]?.method ?? 'GET') === 'GET',
    )
    expect(getAppointmentCalls.length).toBeGreaterThan(1)
  })

  it('«Завершить приём» заблокирована, пока жалобы или диагноз пусты', async () => {
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

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('visit-complaints'), {
      target: { value: 'Только жалобы' },
    })
    expect(finish.disabled).toBe(true)

    fireEvent.change(screen.getByTestId('visit-diagnosis'), {
      target: { value: 'K01.1' },
    })
    expect(finish.disabled).toBe(false)
  })
})