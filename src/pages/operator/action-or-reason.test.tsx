import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { Provider } from '../../theme'
import { OperatorPage } from './operator-page'
import { APPOINTMENT_STATUS_LABELS } from '../../__data__/status-labels'
import type {
  Appointment,
  AppointmentStatus,
  DoctorList,
  PatientList,
  Schedule,
  ServiceList,
} from '../../__data__/types'

/**
 * TASK-39 п.4 — правило недоступного действия, одно на всю систему: у карточки в ЛЮБОМ
 * статусе есть либо доступное действие, либо обычным текстом написанная причина, почему
 * его нет. Кнопок без причины и причин без кнопки не бывает.
 *
 * Правило было записано и разложено по коду, но проверялось точечно: два статуса в карточке
 * врача. Терминальные ветки карточки оператора не проверял никто, а именно они и молчали бы
 * незаметно — человек видит карточку без единой подсказки и не знает, ошибка это или запрет.
 */

const isAppointmentsList = (url: string) =>
  url.includes('/appointments') && !/\/appointments\//.test(url.split('?')[0])

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
  getNavigation: vi.fn(() => ({})),
  getNavigationValue: vi.fn((key: string) =>
    key === 'clinic-scheduler.main' ? '/clinic-scheduler' : ''),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

const DATE = '2030-03-04'

const doctorsPayload: DoctorList = {
  items: [
    { id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' },
    { id: 'd-002', name: 'Петров А.В.', specialty: 'Кардиолог', cabinet: '305' },
  ],
}

const servicesPayload: ServiceList = {
  items: [
    {
      id: 's-001', name: 'Первичная консультация', duration: 30,
      category: 'Приём', price: 2500, doctorIds: ['d-001', 'd-002'],
    },
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
  endTime: '12:00',
  stepMinutes: 60,
  slots: [
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

const buildAppointment = (status: AppointmentStatus): Appointment => ({
  id: 'a-001',
  doctorId: 'd-001',
  patientId: 'p-001',
  start: `${DATE}T09:00:00+03:00`,
  durationMin: 30,
  status,
  paymentType: 'regular',
  serviceId: 's-001',
  doctorName: 'Иванова Е.С.',
  patientName: 'Алексеев Игорь Николаевич',
})

const mockApi = (appointments: Appointment[]) => {
  vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const json = (body: unknown) =>
      Promise.resolve(new Response(JSON.stringify(body), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    if (url.includes('/schedule/')) return json(buildSchedule(DATE))
    if (isAppointmentsList(url)) return json({ items: appointments, date: DATE })
    if (url.endsWith('/doctors')) return json(doctorsPayload)
    if (url.endsWith('/services')) return json(servicesPayload)
    if (url.endsWith('/patients')) return json(patientsPayload)
    if (url.includes('/waitlist')) return json({ items: [], openCount: 0 })
    return Promise.resolve(new Response('not found', { status: 404 }))
  })
}

const renderOperator = () =>
  render(
    <MemoryRouter initialEntries={[`/clinic-scheduler/operator?date=${DATE}`]}>
      <Provider>
        <OperatorPage />
      </Provider>
    </MemoryRouter>,
  )

/** Кнопка считается доступной, только если по ней реально можно нажать. */
const enabledButtons = (root: HTMLElement): HTMLButtonElement[] =>
  Array.from(root.querySelectorAll('button'))
    .filter((b) => !(b as HTMLButtonElement).disabled) as HTMLButtonElement[]

const ALL_STATUSES = Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]

describe('карточка слота оператора — действие либо причина, в каждом статусе', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('перечень статусов исчерпан — новый статус попадёт в проверку сам', () => {
    expect(ALL_STATUSES).toHaveLength(6)
  })

  for (const status of ALL_STATUSES) {
    it(`статус «${APPOINTMENT_STATUS_LABELS[status]}»: есть доступное действие либо написанная причина`, async () => {
      mockApi([buildAppointment(status)])
      renderOperator()

      fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
      const card = await screen.findByTestId('slot-card')

      const actions = enabledButtons(card)
      const blockedTexts = Array.from(card.querySelectorAll('[data-testid$="-blocked"]'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0)

      expect(
        actions.length > 0 || blockedTexts.length > 0,
        `статус ${status}: ни одного доступного действия и ни одной причины`,
      ).toBe(true)

      // Причин без кнопки не бывает: причина обязана быть внятным текстом, а не «недоступно».
      for (const text of blockedTexts) {
        expect(text.length, `статус ${status}: пустая причина`).toBeGreaterThan(10)
        expect(text.toLowerCase()).not.toBe('недоступно')
      }
    })
  }

  it('у терминальных статусов причина названа словами, а не отсутствием кнопки', async () => {
    for (const status of ['cancelled', 'completed', 'no_show'] as AppointmentStatus[]) {
      mockApi([buildAppointment(status)])
      const view = renderOperator()

      fireEvent.click(await screen.findByTestId('slot-d-001-09:00'))
      const card = await screen.findByTestId('slot-card')
      // Пустой элемент-заглушка причиной не считается: человеку нужен текст, а не узел в DOM.
      const blockedTexts = Array.from(card.querySelectorAll('[data-testid$="-blocked"]'))
        .map((el) => (el.textContent ?? '').trim())
        .filter((t) => t.length > 0)

      expect(blockedTexts.length, `статус ${status}: причина не показана`).toBeGreaterThan(0)
      view.unmount()
      vi.restoreAllMocks()
      mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
    }
  })
})
