import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { DoctorPage } from './doctor-page'
import type { Appointment, Service } from '../../__data__/types'

/**
 * TASK-63: врач видит, на что записан пациент, отмечает только услуги своего допуска,
 * закрывает приём осознанно и знает судьбу заявки на повторный визит.
 */

const mockGetConfigValue = vi.fn()

vi.mock('@brojs/cli', () => ({
  getConfigValue: () => mockGetConfigValue(),
  getNavigation: () => ({}),
  getNavigationValue: () => '/clinic-scheduler',
}))

const DOCTORS = [
  { id: 'd-001', name: 'Иванова Елена Сергеевна', specialty: 'Терапевт', cabinet: '201' },
  { id: 'd-002', name: 'Петров Андрей Викторович', specialty: 'Кардиолог', cabinet: '305' },
]

const SERVICES: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500, doctorIds: ['d-001', 'd-002'] },
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём', price: 1800, doctorIds: ['d-001', 'd-002'] },
  // Матрица компетенций: УЗИ делает только кардиолог. 2 800 ₽ терапевта — чужие деньги.
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика', price: 2800, doctorIds: ['d-002'] },
]

const visit = (over: Partial<Appointment> & Pick<Appointment, 'id' | 'doctorId'>): Appointment => ({
  patientId: 'p-001',
  start: '2026-08-10T09:00:00',
  durationMin: 30,
  status: 'in_progress',
  paymentType: 'regular',
  serviceId: 's-001',
  doctorName: null,
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
  ...over,
})

const APPOINTMENTS: Appointment[] = [
  visit({ id: 'a-001', doctorId: 'd-001', serviceId: 's-001' }),
  visit({
    id: 'a-002',
    doctorId: 'd-001',
    serviceId: 's-002',
    start: '2026-08-10T10:30:00',
    status: 'scheduled',
    patientName: 'Белова Татьяна Викторовна',
    patientPhone: '+7 900 100-00-02',
  }),
  visit({
    id: 'a-101',
    doctorId: 'd-002',
    serviceId: 's-004',
    start: '2026-08-10T12:00:00',
    patientName: 'Григорьев Артём Дмитриевич',
    patientPhone: '+7 900 100-00-03',
  }),
]

const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

interface ApiCalls {
  patches: Array<{ id: string; body: Record<string, unknown> }>
  waitlists: Array<Record<string, unknown>>
}

const installApi = (options: { waitlistFails?: () => boolean } = {}): ApiCalls => {
  const calls: ApiCalls = { patches: [], waitlists: [] }
  const store = APPOINTMENTS.map((a) => ({ ...a }))

  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'

    if (method === 'GET' && url.includes('/doctors')) return jsonResponse({ items: DOCTORS })
    if (method === 'GET' && url.endsWith('/services')) return jsonResponse({ items: SERVICES })
    if (method === 'GET' && /\/appointments\/[^/]+\/history/.test(url)) {
      return jsonResponse({ items: [] })
    }
    if (method === 'GET' && url.includes('/appointments?')) {
      const date = (url.match(/date=([^&]+)/) ?? [null, '2026-08-10'])[1] as string
      const doctorId = (url.match(/doctorId=([^&]+)/) ?? [null, null])[1]
      const items = store.filter((a) => (doctorId ? a.doctorId === doctorId : true))
      return jsonResponse({ items, date, doctorId })
    }
    if (method === 'PATCH' && url.includes('/appointments/')) {
      const id = (url.match(/\/appointments\/([^/?]+)/) ?? [null, ''])[1] as string
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      calls.patches.push({ id, body })
      const idx = store.findIndex((a) => a.id === id)
      const updated: Appointment = {
        ...store[idx],
        status: (body.status as Appointment['status']) ?? store[idx].status,
        complaints: typeof body.complaints === 'string' ? body.complaints : store[idx].complaints,
        diagnosis: typeof body.diagnosis === 'string' ? body.diagnosis : store[idx].diagnosis,
      }
      store[idx] = updated
      return jsonResponse(updated)
    }
    if (method === 'POST' && url.includes('/waitlist')) {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      calls.waitlists.push(body)
      if (options.waitlistFails?.()) {
        return jsonResponse({ error: 'slot_taken', message: 'Слот 2026-08-24T09:00:00+03:00 у врача d-001 уже занят' }, 409)
      }
      return jsonResponse({ id: 'W-9999', ...body })
    }
    if (method === 'GET' && url.includes('/waitlist')) return jsonResponse({ items: [], openCount: 0 })

    throw new Error(`Unexpected fetch: ${method} ${url}`)
  })

  return calls
}

const renderPage = (doctorId = 'd-001') => render(
  <MemoryRouter initialEntries={[`/clinic-scheduler/doctor?date=2026-08-10&doctorId=${doctorId}`]}>
    <ChakraProvider value={defaultSystem}>
      <DoctorPage />
    </ChakraProvider>
  </MemoryRouter>,
)

const fillProtocol = () => {
  fireEvent.change(screen.getByTestId('visit-complaints'), {
    target: { value: 'Боль в горле третьи сутки' },
  })
  fireEvent.change(screen.getByTestId('visit-diagnosis'), {
    target: { value: 'J02 Острый фарингит' },
  })
}

describe('TASK-63 — АРМ врача: услуга, допуск, подтверждение, заявка', () => {
  beforeEach(() => {
    mockGetConfigValue.mockReturnValue('https://clinic.test/api')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('п.1 — услуга приёма видна в шапке карточки', async () => {
    installApi()
    renderPage()

    await screen.findByTestId('doctor-page')
    await waitFor(() => {
      expect(screen.getByTestId('visit-service').textContent).toBe('Первичная консультация')
    })

    fireEvent.click(screen.getByTestId('day-visit-a-002'))
    await waitFor(() => {
      expect(screen.getByTestId('visit-service').textContent).toBe('Повторная консультация')
    })
  })

  it('п.2 — терапевт не видит в форме услугу вне своего допуска', async () => {
    installApi()
    renderPage('d-001')

    await screen.findByTestId('doctor-page')
    await waitFor(() => {
      expect(screen.getByTestId('visit-service-s-001')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('visit-service-s-004')).toBeNull()
    expect(screen.queryByText('УЗИ брюшной полости')).toBeNull()

    // и в услуге повторного визита её тоже нет: заявка уйдёт этому же врачу
    const nextService = screen.getByTestId('visit-next-service') as HTMLSelectElement
    expect(within(nextService).queryByText('УЗИ брюшной полости')).toBeNull()

    expect(screen.getByTestId('visit-services-scope').textContent).toContain('допуска врача')
  })

  it('п.2 — врачу с допуском та же услуга доступна: фильтр по записи, а не запрет позиции', async () => {
    installApi()
    renderPage('d-002')

    await screen.findByTestId('doctor-page')
    await waitFor(() => {
      expect(screen.getByTestId('visit-service-s-004')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('visit-services-scope')).toBeNull()
  })

  it('п.4 — без подтверждения PATCH не уходит, и в вопросе сказано про неизменяемость', async () => {
    const calls = installApi()
    renderPage()

    await screen.findByTestId('doctor-page')
    await waitFor(() => expect(screen.getByTestId('visit-complaints')).toBeInTheDocument())
    fillProtocol()

    fireEvent.click(screen.getByTestId('visit-finish'))

    const confirm = await screen.findByTestId('visit-finish-confirm')
    expect(within(confirm).getByTestId('visit-finish-confirm-text').textContent)
      .toContain('неизменяемым')
    expect(calls.patches).toHaveLength(0)

    fireEvent.click(screen.getByTestId('visit-finish-confirm-no'))
    await waitFor(() => expect(screen.queryByTestId('visit-finish-confirm')).toBeNull())
    expect(calls.patches).toHaveLength(0)

    fireEvent.click(screen.getByTestId('visit-finish'))
    fireEvent.click(await screen.findByTestId('visit-finish-confirm-yes'))

    await waitFor(() => {
      expect(calls.patches.map((p) => p.id)).toEqual(['a-001'])
    })
    expect(calls.patches[0].body.status).toBe('completed')
  })

  it('п.6 — дата следующего визита раньше дня приёма отклоняется до отправки', async () => {
    const calls = installApi()
    renderPage()

    await screen.findByTestId('doctor-page')
    await waitFor(() => expect(screen.getByTestId('visit-complaints')).toBeInTheDocument())
    fillProtocol()

    fireEvent.change(screen.getByTestId('visit-next-date'), { target: { value: '2026-08-09' } })
    fireEvent.change(screen.getByTestId('visit-next-service'), { target: { value: 's-002' } })

    const error = await screen.findByTestId('visit-next-date-error')
    expect(error.textContent).toContain('не может быть раньше дня приёма')
    expect(error.textContent).toContain('10 августа')
    expect(error.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/)

    expect((screen.getByTestId('visit-finish') as HTMLButtonElement).disabled).toBe(true)
    expect(calls.patches).toHaveLength(0)

    fireEvent.change(screen.getByTestId('visit-next-date'), { target: { value: '2026-08-24' } })
    await waitFor(() => expect(screen.queryByTestId('visit-next-date-error')).toBeNull())
    expect((screen.getByTestId('visit-finish') as HTMLButtonElement).disabled).toBe(false)
  })

  it('п.3 — заявка на повторный визит подтверждается на экране: услуга и дата по-русски', async () => {
    const calls = installApi()
    renderPage()

    await screen.findByTestId('doctor-page')
    await waitFor(() => expect(screen.getByTestId('visit-complaints')).toBeInTheDocument())
    fillProtocol()
    fireEvent.change(screen.getByTestId('visit-next-date'), { target: { value: '2026-08-24' } })
    fireEvent.change(screen.getByTestId('visit-next-service'), { target: { value: 's-002' } })

    fireEvent.click(screen.getByTestId('visit-finish'))
    fireEvent.click(await screen.findByTestId('visit-finish-confirm-yes'))

    const created = await screen.findByTestId('visit-followup-created')
    expect(created.textContent).toContain('Повторная консультация')
    expect(created.textContent).toContain('24 августа')
    expect(created.textContent).not.toMatch(/\d{4}-\d{2}-\d{2}/)
    expect(calls.waitlists).toHaveLength(1)
  })

  it('п.3 — отказ по заявке объяснён, а повтор не требует правки закрытого протокола', async () => {
    let failing = true
    const calls = installApi({ waitlistFails: () => failing })
    renderPage()

    await screen.findByTestId('doctor-page')
    await waitFor(() => expect(screen.getByTestId('visit-complaints')).toBeInTheDocument())
    fillProtocol()
    fireEvent.change(screen.getByTestId('visit-next-date'), { target: { value: '2026-08-24' } })
    fireEvent.change(screen.getByTestId('visit-next-service'), { target: { value: 's-002' } })

    fireEvent.click(screen.getByTestId('visit-finish'))
    fireEvent.click(await screen.findByTestId('visit-finish-confirm-yes'))

    const failure = await screen.findByTestId('visit-followup-error')
    expect(failure.textContent).toContain('Приём завершён')
    expect(failure.textContent).toContain('Повторная консультация')
    expect(failure.textContent).toContain('24 августа')
    // машинный текст сервера до врача не доходит
    expect(failure.textContent).not.toMatch(/[A-Za-z]/)

    // приём закрыт, форма заблокирована — повтор обязан жить отдельно от протокола
    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Завершён')
    })
    expect((screen.getByTestId('visit-finish') as HTMLButtonElement).disabled).toBe(true)

    failing = false
    fireEvent.click(screen.getByTestId('visit-followup-retry'))

    const created = await screen.findByTestId('visit-followup-created')
    expect(created.textContent).toContain('24 августа')
    expect(calls.waitlists).toHaveLength(2)
    expect(calls.patches.filter((p) => p.body.status === 'completed')).toHaveLength(1)
  })

  it('п.7 — в рабочем экране нет выбора чужого врача, день открывает адрес', async () => {
    installApi()
    const { unmount } = renderPage('d-001')

    const page = await screen.findByTestId('doctor-page')
    await waitFor(() => {
      expect(screen.getByTestId('day-visit-a-001')).toBeInTheDocument()
    })

    expect(page.getAttribute('data-doctor')).toBe('d-001')
    expect(screen.queryByTestId('doctor-subject')).toBeNull()
    expect(screen.queryByLabelText('Врач, чей день приёма открыт')).toBeNull()
    for (const box of screen.queryAllByRole('combobox')) {
      for (const doctor of DOCTORS) {
        expect(box.textContent).not.toContain(doctor.name)
      }
    }
    // чужой день в рабочей области не показывается
    expect(screen.queryByTestId('day-visit-a-101')).toBeNull()

    unmount()
    renderPage('d-002')

    const other = await screen.findByTestId('doctor-page')
    await waitFor(() => {
      expect(screen.getByTestId('day-visit-a-101')).toBeInTheDocument()
    })
    expect(other.getAttribute('data-doctor')).toBe('d-002')
    expect(screen.queryByTestId('day-visit-a-001')).toBeNull()
  })
})
