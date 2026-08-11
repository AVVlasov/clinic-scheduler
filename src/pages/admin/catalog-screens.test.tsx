import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { Provider } from '../../theme'
import { CompetencyMatrixScreen } from './competency-matrix'
import { DurationRulesScreen } from './duration-rules'
import { EquipmentSchedule } from './equipment-schedule'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
  getNavigation: vi.fn(() => ({})),
  getNavigationValue: vi.fn(() => ''),
  getNavigations: vi.fn(() => ({})),
  getNavigationsValue: vi.fn(() => undefined),
  getFeatures: vi.fn(() => ({})),
  getFeatureValue: vi.fn(() => undefined),
  getAllFeatures: vi.fn(() => ({})),
  getConfig: vi.fn(() => ({})),
  getHistory: vi.fn(() => undefined),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
})

const equipmentDay = {
  date: '2026-08-11',
  stepMinutes: 15,
  startTime: '08:00',
  endTime: '09:00',
  items: [
    {
      id: 'eq-001',
      name: 'Электрокардиограф Schiller AT-102',
      code: 'EQ.ECG.01',
      kind: 'apparatus',
      type: 'Функциональная диагностика',
      cabinet: '305',
      hours: { start: '08:00', end: '20:00' },
      maintenance: '10 мин после исследования',
      serviceIds: ['s-003'],
      serviceNames: ['ЭКГ'],
      sharedWith: [],
      repair: null,
      bookedCount: 1,
      slots: [
        { time: '08:00', state: 'free', label: null },
        {
          time: '08:15',
          state: 'booked',
          label: 'Алексеев Игорь Николаевич',
          appointmentId: 'a-100',
          doctorName: 'Петров Андрей Викторович',
          serviceName: 'ЭКГ',
          isStart: true,
        },
      ],
    },
    {
      id: 'eq-002',
      name: 'УЗИ-сканер Mindray Resona 7',
      code: 'EQ.USG.04',
      kind: 'apparatus',
      type: 'УЗИ',
      cabinet: '118',
      hours: { start: '08:00', end: '20:00' },
      maintenance: '—',
      serviceIds: ['s-004'],
      serviceNames: ['УЗИ брюшной полости'],
      sharedWith: [],
      repair: { from: '2026-08-11', to: '2026-08-12', reason: 'Ремонт' },
      bookedCount: 0,
      slots: [
        { time: '08:00', state: 'repair', label: 'Ремонт' },
        { time: '08:15', state: 'repair', label: 'Ремонт' },
      ],
    },
  ],
}

const matrix = {
  doctors: [
    { id: 'd-001', name: 'Иванова Елена Сергеевна', specialty: 'Терапевт' },
    { id: 'd-002', name: 'Петров Андрей Викторович', specialty: 'Кардиолог' },
  ],
  services: [
    { id: 's-001', name: 'Первичная консультация', category: 'Приём' },
    { id: 's-003', name: 'ЭКГ', category: 'Диагностика' },
  ],
  cells: [
    {
      serviceId: 's-001',
      values: [{ doctorId: 'd-001', value: 'yes' }, { doctorId: 'd-002', value: 'limited' }],
    },
    {
      serviceId: 's-003',
      values: [{ doctorId: 'd-001', value: 'no' }, { doctorId: 'd-002', value: 'yes' }],
    },
  ],
}

const durationRules = {
  items: [
    {
      id: 'dr-base',
      priority: 0,
      condition: 'Базовая длительность',
      factor: 'Норматив услуги из справочника',
      effectLabel: 'база',
      enabled: true,
      locked: true,
      match: {},
      effect: { kind: 'base' },
    },
    {
      id: 'dr-visit-first',
      priority: 1,
      condition: 'Тип приёма',
      factor: 'Первичный, категория «Приём»',
      effectLabel: '60 мин',
      enabled: true,
      locked: false,
      match: { serviceCategory: 'Приём', visitType: 'first' },
      effect: { kind: 'set', minutes: 60 },
    },
  ],
}

const services = {
  items: [
    {
      id: 's-001',
      name: 'Первичная консультация',
      duration: 30,
      category: 'Приём',
      price: 2500,
      doctorIds: ['d-001'],
      limitedDoctorIds: [],
      requiresEquipment: false,
    },
  ],
}

const patients = {
  items: [
    { id: 'p-005', name: 'Кузьмин Пётр Ильич', phone: '+7', birthDate: '1949-06-18', cardNumber: 'UID 5' },
  ],
}

describe('АРМ администратора — оборудование и кабинеты', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockOk = () => vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (url.includes('/equipment/schedule')) return Promise.resolve(json(equipmentDay))
    return Promise.resolve(json({}, 404))
  })

  it('лента дня строится из ответа сервера: занятость и ремонт различимы', async () => {
    mockOk()
    render(<Provider><EquipmentSchedule date="2026-08-11" /></Provider>)

    await screen.findByTestId('equipment-day')
    expect(screen.getByTestId('equipment-slot-eq-001-08:00')).toHaveAttribute('data-state', 'free')
    expect(screen.getByTestId('equipment-slot-eq-001-08:15')).toHaveAttribute('data-state', 'booked')
    expect(screen.getByTestId('equipment-slot-eq-002-08:00')).toHaveAttribute('data-state', 'repair')
    expect(screen.getByTestId('equipment-meta')).toHaveTextContent('ресурсов: 2')
  })

  it('клик по занятому слоту показывает, кто и на что занял аппарат', async () => {
    mockOk()
    render(<Provider><EquipmentSchedule date="2026-08-11" /></Provider>)

    fireEvent.click(await screen.findByTestId('equipment-slot-eq-001-08:15'))
    const details = await screen.findByTestId('equipment-slot-details')
    expect(details).toHaveTextContent('Алексеев Игорь Николаевич')
    expect(details).toHaveTextContent('Петров Андрей Викторович')
    expect(details).toHaveTextContent('ЭКГ')
  })

  it('фильтр по кабинету оставляет только его ресурсы', async () => {
    mockOk()
    render(<Provider><EquipmentSchedule date="2026-08-11" /></Provider>)

    await screen.findByTestId('equipment-day')
    fireEvent.click(screen.getByTestId('equipment-room-118'))
    await waitFor(() => {
      expect(screen.queryByTestId('equipment-row-eq-001')).toBeNull()
    })
    expect(screen.getByTestId('equipment-row-eq-002')).toBeInTheDocument()
  })

  it('список ресурсов показывает график, услуги и число занятых интервалов', async () => {
    mockOk()
    render(<Provider><EquipmentSchedule date="2026-08-11" /></Provider>)

    await screen.findByTestId('equipment-day')
    fireEvent.click(screen.getByTestId('equipment-view-list'))
    const row = await screen.findByTestId('equipment-list-row-eq-001')
    expect(row).toHaveTextContent('ЭКГ')
    expect(row).toHaveTextContent('08:00–20:00')
    expect(screen.getByTestId('equipment-booked-eq-001')).toHaveTextContent('1')
    expect(screen.getByTestId('equipment-booked-eq-002')).toHaveTextContent('ремонт')
  })

  it('ошибка загрузки показывается текстом, а не пустой лентой', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      json({ error: 'invalid_date', message: 'Дата обязательна' }, 400),
    )
    render(<Provider><EquipmentSchedule date="плохая-дата" /></Provider>)

    expect(await screen.findByTestId('equipment-error')).toHaveTextContent('Дата обязательна')
  })
})

describe('АРМ администратора — матрица компетенций', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('рисует три значения допуска из ответа сервера и считает их', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(json(matrix))
    render(<Provider><CompetencyMatrixScreen /></Provider>)

    await screen.findByTestId('matrix-screen')
    await waitFor(() => {
      expect(screen.getByTestId('matrix-cell-d-001-s-001')).toHaveAttribute('data-value', 'yes')
    })
    expect(screen.getByTestId('matrix-cell-d-002-s-001')).toHaveAttribute('data-value', 'limited')
    expect(screen.getByTestId('matrix-cell-d-001-s-003')).toHaveAttribute('data-value', 'no')
    expect(screen.getByTestId('matrix-counts')).toHaveTextContent('Выполняют: 2')
    expect(screen.getByTestId('matrix-counts')).toHaveTextContent('С ограничением: 1')
  })

  it('клик по клетке отправляет следующее значение на сервер и показывает ответ', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as { value: string }
        const next = {
          ...matrix,
          cells: matrix.cells.map((c) => (c.serviceId === 's-003'
            ? {
              ...c,
              values: c.values.map((v) => (v.doctorId === 'd-001' ? { ...v, value: body.value } : v)),
            }
            : c)),
        }
        return Promise.resolve(json({
          serviceId: 's-003', doctorId: 'd-001', value: body.value, matrix: next,
        }))
      }
      return Promise.resolve(json(matrix))
    })

    render(<Provider><CompetencyMatrixScreen /></Provider>)
    const cell = await screen.findByTestId('matrix-cell-d-001-s-003')
    fireEvent.click(cell)

    await waitFor(() => {
      expect(screen.getByTestId('matrix-cell-d-001-s-003')).toHaveAttribute('data-value', 'yes')
    })
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
    expect(patch, 'PATCH /competencies не ушёл').toBeTruthy()
    expect(JSON.parse(String(patch?.[1]?.body))).toEqual({
      serviceId: 's-003', doctorId: 'd-001', value: 'yes',
    })
    expect(screen.getByTestId('matrix-last-change')).toHaveTextContent('выполняет')
  })

  it('ошибку сохранения показывает, а клетку не перекрашивает', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
      if (init?.method === 'PATCH') {
        return Promise.resolve(json({ error: 'service_not_found', message: 'Услуга не найдена' }, 404))
      }
      return Promise.resolve(json(matrix))
    })

    render(<Provider><CompetencyMatrixScreen /></Provider>)
    const cell = await screen.findByTestId('matrix-cell-d-001-s-003')
    fireEvent.click(cell)

    expect(await screen.findByTestId('matrix-save-error')).toHaveTextContent('Услуга не найдена')
    expect(screen.getByTestId('matrix-cell-d-001-s-003')).toHaveAttribute('data-value', 'no')
  })
})

describe('АРМ администратора — правила длительности', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockOk = (rules = durationRules) => vi.spyOn(globalThis, 'fetch').mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    if (init?.method === 'PATCH') {
      const body = JSON.parse(String(init.body)) as { enabled: boolean }
      return Promise.resolve(json({
        items: rules.items.map((r) => (r.id === 'dr-visit-first' ? { ...r, enabled: body.enabled } : r)),
      }))
    }
    if (url.includes('/duration-rules')) return Promise.resolve(json(rules))
    if (url.endsWith('/services')) return Promise.resolve(json(services))
    if (url.includes('/patients')) return Promise.resolve(json(patients))
    if (url.endsWith('/equipment')) return Promise.resolve(json({ items: [] }))
    return Promise.resolve(json({}, 404))
  })

  it('правила показаны по приоритету, базовое не выключается', async () => {
    mockOk()
    render(<Provider><DurationRulesScreen /></Provider>)

    await screen.findByTestId('duration-rules-table')
    expect(screen.getByTestId('duration-rule-dr-base')).toHaveTextContent('база')
    expect(screen.queryByTestId('duration-toggle-dr-base')).toBeNull()
    expect(screen.getByTestId('duration-toggle-dr-visit-first')).toHaveAttribute('aria-checked', 'true')
  })

  it('проверка расчёта считает те же минуты, что уйдут в запись', async () => {
    mockOk()
    render(<Provider><DurationRulesScreen /></Provider>)

    const preview = await screen.findByTestId('duration-preview')
    fireEvent.change(within(preview).getByTestId('duration-visit-type'), { target: { value: 'first' } })
    await waitFor(() => {
      expect(screen.getByTestId('duration-total')).toHaveTextContent('60 мин')
    })

    fireEvent.change(within(preview).getByTestId('duration-visit-type'), { target: { value: 'repeat' } })
    await waitFor(() => {
      expect(screen.getByTestId('duration-total')).toHaveTextContent('30 мин')
    })
  })

  it('выключение правила меняет и список, и расчёт', async () => {
    mockOk()
    render(<Provider><DurationRulesScreen /></Provider>)

    const preview = await screen.findByTestId('duration-preview')
    fireEvent.change(within(preview).getByTestId('duration-visit-type'), { target: { value: 'first' } })
    await waitFor(() => {
      expect(screen.getByTestId('duration-total')).toHaveTextContent('60 мин')
    })

    fireEvent.click(screen.getByTestId('duration-toggle-dr-visit-first'))
    await waitFor(() => {
      expect(screen.getByTestId('duration-rule-dr-visit-first')).toHaveAttribute('data-enabled', 'false')
    })
    await waitFor(() => {
      expect(screen.getByTestId('duration-total')).toHaveTextContent('30 мин')
    })
  })

  it('возраст пациента участвует в расчёте только когда пациент выбран', async () => {
    const withAge = {
      items: [
        ...durationRules.items,
        {
          id: 'dr-age-senior',
          priority: 4,
          condition: 'Возраст пациента',
          factor: 'Старше 70 лет',
          effectLabel: '+15 мин',
          enabled: true,
          locked: false,
          match: { patientAgeFrom: 70 },
          effect: { kind: 'add', minutes: 15 },
        },
      ],
    }
    mockOk(withAge)
    vi.setSystemTime(new Date('2026-08-11T10:00:00'))
    render(<Provider><DurationRulesScreen /></Provider>)

    const preview = await screen.findByTestId('duration-preview')
    fireEvent.change(within(preview).getByTestId('duration-visit-type'), { target: { value: 'first' } })
    await waitFor(() => {
      expect(screen.getByTestId('duration-total')).toHaveTextContent('60 мин')
    })

    fireEvent.change(within(preview).getByTestId('duration-patient'), { target: { value: 'p-005' } })
    await waitFor(() => {
      expect(screen.getByTestId('duration-total')).toHaveTextContent('75 мин')
    })
  })
})
