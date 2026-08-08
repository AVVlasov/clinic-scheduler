import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DoctorPage } from './doctor-page'
import type { Appointment, Service } from '../../__data__/types'

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
    paymentType: 'cash',
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
    recommendations: ['Контрольный осмотр через 7 дней', 'КТ контрольная через 14 дней'],
    nextVisit: 'через 14 дней',
  },
  {
    id: 'a-002',
    doctorId: 'd-001',
    patientId: 'p-002',
    start: '2026-08-06T10:30:00',
    durationMin: 20,
    status: 'in_progress',
    paymentType: 'insurance',
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
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 },
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём', price: 1800 },
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 },
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика', price: 2800 },
]

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const renderPage = () => render(
  <ChakraProvider value={defaultSystem}>
    <DoctorPage />
  </ChakraProvider>,
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
      if (url.endsWith('/appointments')) return jsonResponse({ items: baseAppointments })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()

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

    const rec2 = screen.getByTestId('visit-rec-КТ контрольная через 14 дней')
    expect(rec2.getAttribute('data-active')).toBe('true')

    const recOff = screen.getByTestId('visit-rec-Снятие швов через 10 дней')
    expect(recOff.getAttribute('data-active')).toBe('false')

    const nextVisit = screen.getByTestId('visit-next') as HTMLInputElement
    expect(nextVisit.value).toBe('через 14 дней')
  })

  it('локальные правки сохраняются при переключении между визитами и возврате', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.endsWith('/appointments')) return jsonResponse({ items: baseAppointments })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()

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
      if (url.endsWith('/appointments')) return jsonResponse({ items: baseAppointments })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(true)
  })
})
