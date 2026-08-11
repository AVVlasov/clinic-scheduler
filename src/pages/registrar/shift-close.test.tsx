// Регистратор доводит смену до конца: деньги после приёма, видимый факт оплаты,
// плательщик в расчёте, поиск по очереди, согласованные счётчики и опрос,
// который не лезет в чужую работу.

import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../__data__/api', () => ({
  getAppointments: vi.fn(),
  rescheduleAppointment: vi.fn(),
  getSchedule: vi.fn(),
  getDoctors: vi.fn(),
  getDoctorCards: vi.fn(),
  getServices: vi.fn(),
  createAppointment: vi.fn(),
  payAppointment: vi.fn(),
  confirmAppointment: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly code: string) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

import {
  getAppointments,
  getDoctorCards,
  getDoctors,
  getServices,
  payAppointment,
  rescheduleAppointment,
} from '../../__data__/api'
import { Provider } from '../../theme'
import type { Appointment, AppointmentStatus, Service } from '../../__data__/types'

import { REGISTRAR_POLL_MS, RegistrarPage } from './registrar-page'

const SHIFT_DATE = '2026-08-10'

const renderPage = () => render(
  <MemoryRouter initialEntries={[`/clinic-scheduler/registrar?date=${SHIFT_DATE}`]}>
    <Provider><RegistrarPage /></Provider>
  </MemoryRouter>,
)

const mockedGetAppointments = vi.mocked(getAppointments)
const mockedGetServices = vi.mocked(getServices)
const mockedGetDoctors = vi.mocked(getDoctors)
const mockedGetDoctorCards = vi.mocked(getDoctorCards)
const mockedPayAppointment = vi.mocked(payAppointment)
const mockedRescheduleAppointment = vi.mocked(rescheduleAppointment)

const SERVICES: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500, doctorIds: [] },
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200, doctorIds: [] },
]

const makeAppointment = (overrides: Partial<Appointment>): Appointment => ({
  id: 'a-001',
  doctorId: 'd-001',
  patientId: 'p-001',
  start: `${SHIFT_DATE}T09:00:00+03:00`,
  durationMin: 30,
  status: 'scheduled',
  paymentType: 'regular',
  serviceId: 's-001',
  doctorName: 'Иванова Е. С.',
  patientName: 'Алексеев Игорь',
  patientPhone: '+7 900 100-00-01',
  patientBirthDate: '1985-03-12',
  patientUid: 'UID 0001 1234',
  doctorCabinet: '201',
  createdByName: 'Смирнова А.И.',
  createdByUnit: 'Колл-центр',
  confirmed: false,
  complaints: null,
  diagnosis: null,
  visitType: null,
  performedServiceIds: [],
  recommendations: [],
  nextVisit: null,
  paidAt: null,
  paidAmount: null,
  ...overrides,
})

const setupMocks = (appointments: Appointment[]) => {
  let current = appointments.map((a) => ({ ...a }))
  mockedGetAppointments.mockImplementation(async () => ({
    items: current.map((a) => ({ ...a })),
    date: SHIFT_DATE,
  }))
  mockedGetServices.mockResolvedValue({ items: SERVICES })
  mockedGetDoctors.mockResolvedValue({
    items: [{ id: 'd-001', name: 'Иванова Е. С.', specialty: 'Терапевт', cabinet: '201' }],
  })
  mockedGetDoctorCards.mockResolvedValue({ items: [] })
  mockedPayAppointment.mockImplementation(async (id, input) => {
    const target = current.find((a) => a.id === id)
    if (!target) throw new Error('not_found')
    const updated: Appointment = {
      ...target,
      paidAt: `${SHIFT_DATE}T12:00:00+03:00`,
      paidAmount: input.amount,
    }
    current = current.map((a) => (a.id === id ? updated : a))
    return updated
  })
  mockedRescheduleAppointment.mockImplementation(async (id, input) => {
    const target = current.find((a) => a.id === id)
    if (!target) throw new Error('not_found')
    const updated = { ...target, status: (input.status ?? target.status) as AppointmentStatus }
    current = current.map((a) => (a.id === id ? updated : a))
    return updated
  })
}

/** Семнадцать строк смены: разные пациенты, телефоны и номера карт. */
const SEVENTEEN: Appointment[] = Array.from({ length: 17 }, (_, i) => {
  const n = i + 1
  const statuses: AppointmentStatus[] = ['scheduled', 'arrived', 'in_progress', 'completed', 'no_show', 'cancelled']
  return makeAppointment({
    id: `a-1${String(n).padStart(2, '0')}`,
    patientName: n === 5 ? 'Кузнецова Мария' : `Пациент${n} Тестов`,
    patientPhone: `+7 900 ${String(100 + n).padStart(3, '0')}-00-0${n % 10}`,
    patientUid: `UID ${String(n).padStart(4, '0')} 55${String(n).padStart(2, '0')}`,
    start: `${SHIFT_DATE}T${String(8 + Math.floor(n / 2)).padStart(2, '0')}:${n % 2 === 0 ? '30' : '00'}:00+03:00`,
    status: statuses[i % statuses.length],
  })
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Оплату можно принять после приёма', () => {
  it('завершённый визит без оплаты даёт кнопку оплаты и в строке очереди, и в карточке', async () => {
    setupMocks([
      makeAppointment({ id: 'a-501', status: 'completed', performedServiceIds: ['s-001'] }),
    ])

    renderPage()

    const row = await screen.findByTestId('queue-row-a-501')
    expect(within(row).getByTestId('pay-a-501')).toBeInTheDocument()

    const card = await screen.findByTestId('visit-card')
    expect(within(card).getByTestId('visit-pay-button')).toBeEnabled()
  })

  it('визит «на приёме» тоже можно оплатить: платят после приёма, а не до', async () => {
    setupMocks([makeAppointment({ id: 'a-502', status: 'in_progress' })])

    renderPage()

    const row = await screen.findByTestId('queue-row-a-502')
    expect(within(row).getByTestId('pay-a-502')).toBeInTheDocument()
  })

  it('оплата из строки уходит на сервер и поднимает кассу смены', async () => {
    setupMocks([
      makeAppointment({ id: 'a-503', status: 'completed', performedServiceIds: ['s-001'] }),
    ])

    renderPage()

    const row = await screen.findByTestId('queue-row-a-503')
    expect(screen.getByTestId('counter-cash')).toHaveTextContent('0 ₽')

    fireEvent.click(within(row).getByTestId('pay-a-503'))

    await waitFor(() => {
      expect(mockedPayAppointment).toHaveBeenCalledWith('a-503', { amount: 2500, paymentType: 'regular' })
    })
    await waitFor(() => {
      expect(screen.getByTestId('counter-cash')).toHaveTextContent('2 500 ₽')
    })
  })

  it('оплаченный визит больше не предлагает оплату', async () => {
    setupMocks([
      makeAppointment({
        id: 'a-504',
        status: 'completed',
        paidAt: `${SHIFT_DATE}T12:00:00+03:00`,
        paidAmount: 2500,
      }),
    ])

    renderPage()

    const row = await screen.findByTestId('queue-row-a-504')
    expect(within(row).queryByTestId('pay-a-504')).toBeNull()
  })
})

describe('Оплаченное отличается от неоплаченного', () => {
  it('две строки с одинаковым основанием и разным paidAt выглядят по-разному', async () => {
    setupMocks([
      makeAppointment({
        id: 'a-601',
        status: 'completed',
        paymentType: 'promo',
        patientName: 'Оплатившая Анна',
        paidAt: `${SHIFT_DATE}T10:35:00+03:00`,
        paidAmount: 2500,
      }),
      makeAppointment({
        id: 'a-602',
        status: 'completed',
        paymentType: 'promo',
        patientName: 'Должник Пётр',
        start: `${SHIFT_DATE}T11:00:00+03:00`,
      }),
    ])

    renderPage()

    const paidRow = await screen.findByTestId('queue-row-a-601')
    const unpaidRow = await screen.findByTestId('queue-row-a-602')

    expect(within(paidRow).getByTestId('paid-a-601')).toHaveTextContent('Оплачено')
    expect(within(unpaidRow).getByTestId('unpaid-a-602')).toHaveTextContent('Не оплачено')
    expect(within(paidRow).queryByTestId('unpaid-a-601')).toBeNull()
    expect(within(unpaidRow).queryByTestId('paid-a-602')).toBeNull()
  })

  it('после оплаты строка меняется без перезагрузки страницы', async () => {
    setupMocks([makeAppointment({ id: 'a-603', status: 'completed' })])

    renderPage()

    const row = await screen.findByTestId('queue-row-a-603')
    expect(within(row).getByTestId('unpaid-a-603')).toBeInTheDocument()

    fireEvent.click(within(row).getByTestId('pay-a-603'))

    await waitFor(() => {
      expect(screen.getByTestId('paid-a-603')).toHaveTextContent('Оплачено')
    })
  })
})

describe('Сумма учитывает плательщика', () => {
  it('ДМС: в кассу не уходит стоимость услуги — счёт у страховой', async () => {
    setupMocks([
      makeAppointment({ id: 'a-701', status: 'completed', paymentType: 'dms' }),
    ])

    renderPage()

    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(within(card).getByTestId('visit-amount')).toHaveTextContent('0 ₽')
    })
    expect(within(card).getByTestId('visit-services-total')).toHaveTextContent('2 500 ₽')

    fireEvent.click(within(card).getByTestId('visit-pay-button'))

    await waitFor(() => {
      expect(mockedPayAppointment).toHaveBeenCalledWith('a-701', { amount: 0, paymentType: 'dms' })
    })
    expect(screen.getByTestId('counter-cash')).toHaveTextContent('0 ₽')
  })

  it('платный визит уходит в кассу целиком', async () => {
    setupMocks([
      makeAppointment({ id: 'a-702', status: 'completed', paymentType: 'regular' }),
    ])

    renderPage()

    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(within(card).getByTestId('visit-amount')).toHaveTextContent('2 500 ₽')
    })
    expect(within(card).queryByTestId('visit-services-total')).toBeNull()
  })
})

describe('Ошибочную неявку можно откатить', () => {
  it('«Вернуть в очередь» возвращает запись в ожидание, и приход снова можно отметить', async () => {
    setupMocks([makeAppointment({ id: 'a-801', status: 'no_show' })])

    renderPage()

    const row = await screen.findByTestId('queue-row-a-801')
    fireEvent.click(within(row).getByTestId('return-to-queue-a-801'))

    await waitFor(() => {
      expect(mockedRescheduleAppointment).toHaveBeenCalledWith('a-801', {
        status: 'scheduled',
        actor: 'Регистратура',
      })
    })

    await waitFor(() => {
      expect(screen.getByTestId('mark-arrived-a-801')).toBeInTheDocument()
    })
  })
})

describe('Очередь ищется', () => {
  it('поиск по фамилии сужает семнадцать строк до одной', async () => {
    setupMocks(SEVENTEEN)

    renderPage()

    await screen.findByTestId('queue-row-a-101')
    expect(screen.getAllByTestId(/^queue-row-/)).toHaveLength(17)

    fireEvent.change(screen.getByTestId('queue-search'), { target: { value: 'Кузнецова' } })

    await waitFor(() => {
      expect(screen.getAllByTestId(/^queue-row-/)).toHaveLength(1)
    })
    expect(screen.getByTestId('queue-row-a-105')).toBeInTheDocument()
    expect(screen.getByTestId('queue-found')).toHaveTextContent('Найдено 1 из 17')
  })

  it('поиск по телефону цифрами находит строку, набранную с разделителями', async () => {
    setupMocks(SEVENTEEN)

    renderPage()

    await screen.findByTestId('queue-row-a-101')
    fireEvent.change(screen.getByTestId('queue-search'), { target: { value: '9001050' } })

    await waitFor(() => {
      expect(screen.getAllByTestId(/^queue-row-/)).toHaveLength(1)
    })
    expect(screen.getByTestId('queue-row-a-105')).toBeInTheDocument()
  })

  it('поиск по номеру карты находит пациента', async () => {
    setupMocks(SEVENTEEN)

    renderPage()

    await screen.findByTestId('queue-row-a-101')
    fireEvent.change(screen.getByTestId('queue-search'), { target: { value: '0007 5507' } })

    await waitFor(() => {
      expect(screen.getAllByTestId(/^queue-row-/)).toHaveLength(1)
    })
    expect(screen.getByTestId('queue-row-a-107')).toBeInTheDocument()
  })

  it('поиск работает вместе с чипом статуса', async () => {
    setupMocks(SEVENTEEN)

    renderPage()

    await screen.findByTestId('queue-row-a-101')
    fireEvent.click(screen.getByTestId('filter-scheduled'))

    // Ожидающих в фикстуре трое, и все они «Пациент…».
    await waitFor(() => {
      expect(screen.getAllByTestId(/^queue-row-/)).toHaveLength(3)
    })

    // Кузнецова есть в смене, но она в неявке: чип и поиск сужают вместе, а не
    // по очереди — иначе поиск «возвращал» бы отфильтрованные строки.
    fireEvent.change(screen.getByTestId('queue-search'), { target: { value: 'Кузнецова' } })
    await waitFor(() => {
      expect(screen.queryAllByTestId(/^queue-row-/)).toHaveLength(0)
    })

    fireEvent.change(screen.getByTestId('queue-search'), { target: { value: 'Пациент7' } })
    await waitFor(() => {
      expect(screen.getAllByTestId(/^queue-row-/)).toHaveLength(1)
    })
    expect(screen.getByTestId('queue-row-a-107')).toBeInTheDocument()
    expect(screen.queryByTestId('queue-row-a-102')).toBeNull()
  })

  it('пустой результат поиска объясняется словами, а не пустой таблицей', async () => {
    setupMocks(SEVENTEEN)

    renderPage()

    await screen.findByTestId('queue-row-a-101')
    fireEvent.change(screen.getByTestId('queue-search'), { target: { value: 'Несуществующий' } })

    await waitFor(() => {
      expect(screen.getByTestId('queue-empty')).toHaveTextContent('По запросу никого не нашли')
    })
  })
})

describe('Счётчики согласованы с таблицей', () => {
  it('сумма плиток равна числу строк очереди — отменённые тоже посчитаны', async () => {
    setupMocks(SEVENTEEN)

    renderPage()

    await screen.findByTestId('queue-row-a-101')
    const rows = screen.getAllByTestId(/^queue-row-/)

    const value = (testId: string) => Number(screen.getByTestId(testId).textContent)
    const sum = value('counter-waiting')
      + value('counter-arrived')
      + value('counter-in-progress')
      + value('counter-completed')
      + value('counter-no-show')
      + value('counter-cancelled')

    expect(sum).toBe(rows.length)
  })

  it('отменённая запись не предлагает напечатать талон', async () => {
    setupMocks([
      makeAppointment({ id: 'a-901', status: 'cancelled' }),
      makeAppointment({ id: 'a-902', status: 'scheduled', start: `${SHIFT_DATE}T10:00:00+03:00` }),
    ])

    renderPage()

    const cancelledRow = await screen.findByTestId('queue-row-a-901')
    expect(within(cancelledRow).queryByTestId('print-ticket-a-901')).toBeNull()
    expect(within(cancelledRow).queryByTestId('pay-a-901')).toBeNull()

    const liveRow = screen.getByTestId('queue-row-a-902')
    expect(within(liveRow).getByTestId('print-ticket-a-902')).toBeInTheDocument()
  })
})

describe('Фоновое обновление не перебивает работу', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('после закрытия карточки два цикла опроса не открывают первую строку', async () => {
    setupMocks(SEVENTEEN)

    renderPage()

    await screen.findByTestId('queue-row-a-101', {}, { timeout: 5000 })
    expect(screen.getByTestId('visit-card')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => {
      expect(screen.getByTestId('visit-card-empty')).toBeInTheDocument()
    })

    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(REGISTRAR_POLL_MS + 100)
      })
    }

    expect(screen.getByTestId('visit-card-empty')).toBeInTheDocument()
    expect(screen.queryByTestId('visit-card')).toBeNull()
  })

  it('два цикла опроса не сбивают выбранную карточку', async () => {
    setupMocks(SEVENTEEN)

    renderPage()

    fireEvent.click(await screen.findByTestId('queue-row-a-107', {}, { timeout: 5000 }))
    const card = await screen.findByTestId('visit-card')
    await waitFor(() => {
      expect(card).toHaveAttribute('data-visit-id', 'a-107')
    })

    for (let i = 0; i < 2; i += 1) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(REGISTRAR_POLL_MS + 100)
      })
    }

    expect(screen.getByTestId('visit-card')).toHaveAttribute('data-visit-id', 'a-107')
  })
})
