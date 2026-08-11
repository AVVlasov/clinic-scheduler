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
    status: 'completed',
    paymentType: 'regular',
    serviceId: 's-001',
    doctorName: 'Иванова Елена Сергеевна',
    patientName: 'Алексеев Игорь Николаевич',
    patientPhone: '+7 900 100-00-01',
    patientBirthDate: '1985-03-12',
    patientUid: 'UID 0001 4480',
    complaints: 'Боль в области 38 зуба третьи сутки',
    diagnosis: 'K01.1 Ретенированный зуб',
    visitType: 'repeat',
    performedServiceIds: ['s-001', 's-003'],
    recommendations: ['Контрольный осмотр через 7 дней', 'Контроль давления через 14 дней'],
    nextVisit: { date: '2026-08-24', serviceId: 's-002' },
  },
  {
    id: 'a-002',
    doctorId: 'd-001',
    patientId: 'p-002',
    start: '2026-08-06T10:30:00',
    durationMin: 20,
    status: 'in_progress',
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

describe('DoctorPage — протокол из визита', () => {
  beforeEach(() => {
    mockGetConfigValue.mockReturnValue('https://clinic.test/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('форма подтягивает сохранённый протокол из данных визита (DOM)', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/history')) return jsonResponse({ items: [] })
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
      expect(screen.getByTestId('day-visit-a-001')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('day-visit-a-001'))
    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    const complaints = screen.getByTestId('visit-complaints') as HTMLTextAreaElement
    expect(complaints.value).toBe('Боль в области 38 зуба третьи сутки')

    const diagnosis = screen.getByTestId('visit-diagnosis') as HTMLInputElement
    expect(diagnosis.value).toBe('K01.1 Ретенированный зуб')

    const visitTypeFirst = screen.getByTestId('visit-type-first')
    const visitTypeRepeat = screen.getByTestId('visit-type-repeat')
    expect(visitTypeRepeat.getAttribute('data-active')).toBe('true')
    expect(visitTypeFirst.getAttribute('data-active')).toBe('false')

    const serviceS001 = screen.getByTestId('visit-service-s-001')
    expect(serviceS001.textContent).toContain('✓')

    const serviceS003 = screen.getByTestId('visit-service-s-003')
    expect(serviceS003.textContent).toContain('✓')

    const serviceS002 = screen.getByTestId('visit-service-s-002')
    expect(serviceS002.textContent).not.toContain('✓')

    const rec1 = screen.getByTestId('visit-rec-Контрольный осмотр через 7 дней')
    expect(rec1.textContent).toContain('Контрольный осмотр через 7 дней')
    expect(rec1.getAttribute('data-active')).toBe('true')

    const rec2 = screen.getByTestId('visit-rec-Контроль давления через 14 дней')
    expect(rec2.getAttribute('data-active')).toBe('true')

    const recOff = screen.getByTestId('visit-rec-Явка с результатами анализов')
    expect(recOff.getAttribute('data-active')).toBe('false')

    expect((screen.getByTestId('visit-next-date') as HTMLInputElement).value).toBe('2026-08-24')
    expect((screen.getByTestId('visit-next-service') as HTMLSelectElement).value).toBe('s-002')
  })

  it('локальные правки сохраняются при переключении между визитами и возврате', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/history')) return jsonResponse({ items: [] })
      if (isAppointmentsList(url)) return jsonResponse({ date: dateFromUrl(url), items: baseAppointments })
      if (url.includes('/doctors')) return jsonResponse({ items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }, { id: 'd-002', name: 'Петров А.В.', specialty: 'Кардиолог', cabinet: '305' }] })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
      if (url.includes('/waitlist') && method === 'POST') {
        return jsonResponse({ id: 'W-9999', kind: 'from_doctor', status: 'open', priority: 'high', patientId: 'p-001', patientName: null, patientPhone: null, serviceId: 's-002', doctorId: 'd-001', dateFrom: '2026-08-24', dateTo: '2026-08-24', comment: '', insuranceAppointmentId: null, createdAt: '2026-08-10T10:00:00Z', createdBy: 'doctor', fulfilledAppointmentId: null, fulfilledAt: null })
      }
      if (url.includes('/waitlist')) {
        return jsonResponse({ items: [], openCount: 0 })
      }
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()

    // экран открывается на рабочей записи (a-002), затем правим a-001
    await waitFor(() => {
      expect(screen.getByTestId('day-visit-a-002')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('day-visit-a-001'))
    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    const a001Draft = 'ЛОКАЛЬНАЯ ПРАВКА ВИЗИТ A — кеш'
    fireEvent.change(screen.getByTestId('visit-complaints'), {
      target: { value: a001Draft },
    })

    fireEvent.click(screen.getByTestId('day-visit-a-002'))

    await waitFor(() => {
      expect(screen.getAllByText('Белова Татьяна Викторовна').length).toBeGreaterThan(0)
    })

    const complaintsB = screen.getByTestId('visit-complaints') as HTMLTextAreaElement
    expect(complaintsB.value).toBe('')

    fireEvent.click(screen.getByTestId('day-visit-a-001'))

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    const complaintsA = screen.getByTestId('visit-complaints') as HTMLTextAreaElement
    expect(complaintsA.value).toBe(a001Draft)
  })

  it('для завершённого визита кнопка «Завершить приём» заблокирована', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/history')) return jsonResponse({ items: [] })
      if (isAppointmentsList(url)) return jsonResponse({ date: dateFromUrl(url), items: baseAppointments })
      if (url.includes('/doctors')) return jsonResponse({ items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }, { id: 'd-002', name: 'Петров А.В.', specialty: 'Кардиолог', cabinet: '305' }] })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
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
      expect(screen.getByTestId('day-visit-a-001')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('day-visit-a-001'))
    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Завершён')
    })

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(true)
  })
})
