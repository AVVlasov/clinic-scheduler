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
    id: 'a-scheduled',
    doctorId: 'd-001',
    patientId: 'p-001',
    start: '2026-08-06T09:00:00',
    durationMin: 30,
    status: 'scheduled',
    paymentType: 'cash',
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
  {
    id: 'a-noshow',
    doctorId: 'd-002',
    patientId: 'p-003',
    start: '2026-08-06T11:00:00',
    durationMin: 30,
    status: 'no_show',
    paymentType: 'card',
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
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 },
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём', price: 1800 },
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 },
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
      if (url.endsWith('/appointments')) return jsonResponse({ items: baseAppointments })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
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
      if (url.endsWith('/appointments')) return jsonResponse({ items: baseAppointments })
      if (url.endsWith('/services')) return jsonResponse({ items: baseServices })
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

  it('после перевода в arrived кнопка разблокирована и PATCH уходит на сервер', async () => {
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
        const target = nextAppointments.find((a) => a.id === id) as Appointment
        const updated: Appointment = { ...target, status: 'completed' }
        nextAppointments = nextAppointments.map((a) => (a.id === id ? updated : a))
        return jsonResponse(updated)
      }
      throw new Error(`Unexpected fetch: ${method} ${url}`)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Алексеев Игорь Николаевич').length).toBeGreaterThan(0)
    })

    fillRequiredFields()

    const finishScheduled = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finishScheduled.disabled).toBe(true)

    fireEvent.click(screen.getByTestId('day-visit-a-arrived'))

    await waitFor(() => {
      expect(screen.getAllByText('Белова Татьяна Викторовна').length).toBeGreaterThan(0)
    })

    fillRequiredFields()

    const finishArrived = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finishArrived.disabled).toBe(false)

    fireEvent.click(finishArrived)

    await waitFor(() => {
      expect(patchedId).toBe('a-arrived')
    })

    expect(JSON.parse(String(patchedBody))).toMatchObject({ status: 'completed' })
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/appointments/a-arrived'),
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('при 409 invalid_state_transition введённый протокол сохраняется и показывается текст ошибки', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      const method = init?.method ?? 'GET'
      if (method === 'GET' && url.endsWith('/appointments')) {
        return jsonResponse({ items: baseAppointments })
      }
      if (method === 'GET' && url.endsWith('/services')) {
        return jsonResponse({ items: baseServices })
      }
      if (method === 'PATCH' && url.includes('/appointments/')) {
        return jsonResponse(
          {
            error: 'invalid_state_transition',
            message: 'Переход статуса из «arrived» в «completed» запрещён',
          },
          409,
        )
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
    fireEvent.change(screen.getByTestId('visit-next'), {
      target: { value: 'через 14 дней' },
    })

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finish.disabled).toBe(false)

    fireEvent.click(finish)

    await waitFor(() => {
      expect(screen.getByTestId('visit-submit-error-text').textContent).toContain('arrived')
    })

    const complaintsField = screen.getByTestId('visit-complaints') as HTMLTextAreaElement
    expect(complaintsField.value).toBe(complaint)

    const diagnosisField = screen.getByTestId('visit-diagnosis') as HTMLInputElement
    expect(diagnosisField.value).toBe(diagnosis)

    const serviceS001 = screen.getByTestId('visit-service-s-001')
    expect(serviceS001.textContent).toContain('✓')

    const rec = screen.getByTestId('visit-rec-Контрольный осмотр через 7 дней')
    expect(rec.getAttribute('data-active')).toBe('true')

    const next = screen.getByTestId('visit-next') as HTMLInputElement
    expect(next.value).toBe('через 14 дней')

    const finishAfter = screen.getByTestId('visit-finish') as HTMLButtonElement
    expect(finishAfter.disabled).toBe(false)

    fireEvent.click(screen.getByTestId('visit-submit-error-dismiss'))

    await waitFor(() => {
      expect(screen.queryByTestId('visit-submit-error')).toBeNull()
    })
  })
})
