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
    status: 'in_progress',
    paymentType: 'cash',
    serviceId: 's-001',
    doctorName: 'Иванова Елена Сергеевна',
    patientName: 'Алексеев Игорь Николаевич',
    patientPhone: '+7 900 100-00-01',
    patientBirthDate: '1985-03-12',
    patientUid: 'UID 0001 4480',
  },
  {
    id: 'a-002',
    doctorId: 'd-001',
    patientId: 'p-002',
    start: '2026-08-06T10:30:00',
    durationMin: 20,
    status: 'scheduled',
    paymentType: 'insurance',
    serviceId: 's-002',
    doctorName: 'Иванова Елена Сергеевна',
    patientName: 'Белова Татьяна Викторовна',
    patientPhone: '+7 900 100-00-02',
    patientBirthDate: '1992-07-21',
    patientUid: 'UID 0002 4492',
  },
  {
    id: 'a-003',
    doctorId: 'd-002',
    patientId: 'p-003',
    start: '2026-08-06T11:00:00',
    durationMin: 30,
    status: 'completed',
    paymentType: 'card',
    serviceId: 's-003',
    doctorName: 'Петров Андрей Викторович',
    patientName: 'Григорьев Артём Дмитриевич',
    patientPhone: '+7 900 100-00-03',
    patientBirthDate: '1978-11-05',
    patientUid: 'UID 0003 4504',
  },
]

const baseServices: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём' },
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём' },
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика' },
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика' },
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
      if (url.endsWith('/appointments')) return jsonResponse({ items: baseAppointments })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
      throw new Error(`Unexpected fetch: ${url}`)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    expect(screen.getByText('Первичная консультация')).toBeInTheDocument()
    expect(screen.getByText('ЭКГ')).toBeInTheDocument()

    const calledUrls = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(calledUrls.some((u) => u.endsWith('/appointments'))).toBe(true)
    expect(calledUrls.some((u) => u.endsWith('/services'))).toBe(true)
  })

  it('выбор приёма в списке меняет карточку пациента', async () => {
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

    expect(screen.getByTestId('visit-phone').textContent).toBe('+7 900 100-00-01')
    expect(screen.getByTestId('visit-payer').textContent).toContain('Наличные')

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
      if (method === 'GET' && url.endsWith('/appointments')) {
        return jsonResponse({ items: nextAppointments })
      }
      if (method === 'GET' && url.endsWith('/services')) {
        return jsonResponse({ items: baseServices })
      }
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

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(false)

    fireEvent.click(finish)

    await waitFor(() => {
      expect(patchedId).toBe('a-001')
    })

    expect(patchedId).toBe('a-001')
    expect(JSON.parse(String(patchedBody))).toEqual({ status: 'completed' })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/appointments/a-001'),
      expect.objectContaining({ method: 'PATCH' }),
    )

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Завершён')
    })
  })

  it('«Завершить приём» заблокирована, пока жалобы или диагноз пусты', async () => {
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