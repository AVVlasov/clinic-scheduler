import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../__data__/api', () => ({
  getAppointments: vi.fn(),
  rescheduleAppointment: vi.fn(),
  getSchedule: vi.fn(),
  getDoctors: vi.fn(),
  getServices: vi.fn(),
  getPatients: vi.fn(),
  payAppointment: vi.fn(),
  confirmAppointment: vi.fn(),
  createAppointment: vi.fn(),
  cancelAppointment: vi.fn(),
  getAppointmentHistory: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly code: string) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

import {
  confirmAppointment,
  getAppointmentHistory,
  getAppointments,
  getDoctors,
  getServices,
} from '../__data__/api'
import { APPOINTMENT_STATUS_LABELS } from '../__data__/status-labels'
import type { Appointment, Doctor, Patient, Schedule, Service } from '../__data__/types'
import { Provider } from '../theme'
import { DoctorPage } from './doctor/doctor-page'
import { MainPage } from './main/main'
import { SlotCard } from './operator/slot-card'
import { RegistrarPage } from './registrar/registrar-page'

const TECH_ID = /^[a-z]-\d+$/
const FORBIDDEN_COPY = [
  'Смена 3907',
  '3907',
  'передан в МИС',
  'Черновик сохраняется автоматически',
]

const collectTextNodes = (root: HTMLElement): string[] => {
  const out: string[] = []
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const t = (node.textContent ?? '').trim()
      if (t) out.push(t)
      return
    }
    node.childNodes.forEach(walk)
  }
  walk(root)
  return out
}

const assertNoTechIds = (root: HTMLElement) => {
  for (const t of collectTextNodes(root)) {
    expect(t, `тех-идентификатор в UI: ${t}`).not.toMatch(TECH_ID)
  }
}

const assertNoForbiddenCopy = (root: HTMLElement) => {
  const blob = collectTextNodes(root).join('\n')
  for (const s of FORBIDDEN_COPY) {
    expect(blob).not.toContain(s)
  }
}

const services: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 , doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006']},
]

const doctors: Doctor[] = [
  { id: 'd-001', name: 'Иванова Е. С.', specialty: 'Терапия', cabinet: '101' },
]

const patients: Patient[] = [
  { id: 'p-001', name: 'Алексеев Игорь Николаевич', phone: '+7 900 100-00-01', birthDate: '1985-03-12' },
  { id: 'p-002', name: 'Белова Татьяна Викторовна', phone: '+7 900 100-00-02', birthDate: '1992-07-21' },
]

const makeAppt = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a-001',
  doctorId: 'd-001',
  patientId: 'p-001',
  start: '2026-08-06T09:00:00+03:00',
  durationMin: 30,
  status: 'scheduled',
  paymentType: 'regular',
  serviceId: 's-001',
  doctorName: 'Иванова Е. С.',
  doctorCabinet: '101',
  patientName: 'Алексеев Игорь Николаевич',
  patientPhone: '+7 900 100-00-01',
  patientBirthDate: '1985-03-12',
  patientUid: 'UID 0001 4242',
  complaints: null,
  diagnosis: null,
  visitType: 'first',
  performedServiceIds: [],
  recommendations: [],
  nextVisit: null,
  createdByName: 'Смирнова А.И.',
  createdByUnit: 'Колл-центр',
  confirmed: false,
  ...overrides,
})

describe('TASK-43 — экран говорит правду', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-06T10:00:00+03:00'))
    vi.mocked(getServices).mockResolvedValue({ items: services })
    vi.mocked(getDoctors).mockResolvedValue({ items: doctors })
    vi.mocked(getAppointmentHistory).mockResolvedValue({ items: [] })
    vi.mocked(confirmAppointment).mockImplementation(async (id) =>
      makeAppt({ id, confirmed: true }),
    )
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('главный экран не показывает константу смены 3907', () => {
    const { container } = render(
      <MemoryRouter>
        <Provider><MainPage /></Provider>
      </MemoryRouter>,
    )
    assertNoForbiddenCopy(container as HTMLElement)
    expect(screen.getByTestId('main-shift-date')).toHaveTextContent('06.08.2026')
  })

  it('очередь регистратора: имена услуг, сортировка, confirmed, без tech-id и ложных фраз', async () => {
    const items = [
      makeAppt({
        id: 'a-late',
        start: '2026-08-06T11:00:00+03:00',
        patientName: 'Григорьев Артём',
        patientUid: 'UID 0003 9999',
        confirmed: true,
        createdByName: 'Орлова Н.В.',
        createdByUnit: 'Регистратура Динамо',
      }),
      makeAppt({
        id: 'a-early',
        start: '2026-08-06T08:00:00+03:00',
        patientName: 'Белова Татьяна',
        patientUid: 'UID 0002 8888',
        confirmed: false,
        createdByName: 'Смирнова А.И.',
        createdByUnit: 'Колл-центр',
      }),
    ]
    vi.mocked(getAppointments).mockResolvedValue({ items, date: '2026-08-06' })

    render(
      <MemoryRouter initialEntries={['/clinic-scheduler/registrar?date=2026-08-06']}>
        <Provider><RegistrarPage /></Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('registrar-page')).toBeInTheDocument()
    })

    const page = screen.getByTestId('registrar-page')
    assertNoTechIds(page)
    assertNoForbiddenCopy(page)
    expect(screen.getAllByText('Первичная консультация').length).toBeGreaterThan(0)
    expect(screen.queryByText('s-001')).not.toBeInTheDocument()

    const early = screen.getByTestId('queue-row-a-early')
    const late = screen.getByTestId('queue-row-a-late')
    const bodyRows = [early, late]
    expect(bodyRows[0].compareDocumentPosition(bodyRows[1]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    expect(screen.getByTestId('unconfirmed-a-early')).toBeInTheDocument()
    expect(screen.getByTestId('confirmed-a-late')).toBeInTheDocument()

    fireEvent.click(early)
    await waitFor(() => {
      expect(screen.getByTestId('visit-uid')).toHaveTextContent('UID 0002 8888')
    })
    expect(screen.getByTestId('visit-birth')).toHaveTextContent('12.03.1985')
    expect(screen.getByTestId('visit-cabinet')).toHaveTextContent('101')
    expect(screen.getByTestId('visit-author')).toHaveTextContent('Смирнова А.И.')
    expect(screen.getByTestId('visit-confirmed')).toHaveTextContent('Не подтверждена')
    expect(screen.getByTestId('visit-service')).toHaveTextContent('Первичная консультация')
    expect(screen.getByTestId('visit-status-badge')).toHaveTextContent(APPOINTMENT_STATUS_LABELS.scheduled)

    fireEvent.click(late)
    await waitFor(() => {
      expect(screen.getByTestId('visit-author')).toHaveTextContent('Орлова Н.В.')
    })
    expect(screen.getByTestId('visit-confirmed')).toHaveTextContent('Запись подтверждена')
  })

  it('день врача: статус cancelled — русская подпись, не enum', async () => {
    vi.mocked(getAppointments).mockResolvedValue({
      items: [
        makeAppt({
          id: 'a-cancel',
          status: 'cancelled',
          cancelReason: 'пациент отказался',
          patientName: 'Дмитриева Анна',
        }),
      ],
      date: '2026-08-06',
      doctorId: 'd-001',
    })

    render(
      <MemoryRouter initialEntries={['/clinic-scheduler/doctor?date=2026-08-06&doctorId=d-001']}>
        <Provider><DoctorPage /></Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge')).toBeInTheDocument()
    })
    const badge = screen.getByTestId('visit-status-badge')
    expect(badge).toHaveTextContent(APPOINTMENT_STATUS_LABELS.cancelled)
    expect(badge).not.toHaveTextContent('cancelled')
    assertNoTechIds(screen.getByTestId('doctor-page'))
    assertNoForbiddenCopy(document.body)
  })

  it('карточка слота оператора показывает автора и отметку подтверждения', async () => {
    const schedule: Schedule = {
      date: '2026-08-06',
      startTime: '08:00',
      endTime: '12:00',
      stepMinutes: 15,
      slots: [
        {
          time: '09:00',
          doctors: [{ id: 'd-001', name: 'Иванова Е. С.', busy: true, appointmentId: 'a-001' }],
        },
      ],
    }
    const appointment = makeAppt({
      createdByName: 'Орлова Н.В.',
      createdByUnit: 'Регистратура Динамо',
      confirmed: false,
    })

    render(
      <Provider>
        <SlotCard
          scheduleDate="2026-08-06"
          time="09:00"
          doctor={doctors[0]}
          doctorResource={schedule.slots[0].doctors[0]}
          appointment={appointment}
          services={services}
          patients={patients}
          schedule={schedule}
        />
      </Provider>,
    )

    expect(screen.getByTestId('card-author')).toHaveTextContent('Орлова Н.В.')
    expect(screen.getByTestId('card-author')).toHaveTextContent('Регистратура Динамо')
    expect(screen.getByTestId('card-unconfirmed')).toHaveTextContent('Не подтверждена')
    expect(screen.getByTestId('card-status')).toHaveTextContent(APPOINTMENT_STATUS_LABELS.scheduled)
    expect(screen.queryByText('Автор: —')).not.toBeInTheDocument()
    assertNoTechIds(screen.getByTestId('slot-card'))
    assertNoForbiddenCopy(screen.getByTestId('slot-card'))
  })
})
