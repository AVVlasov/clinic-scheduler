import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { Provider } from '../../theme'
import { ArmRouter, SectionNav } from '../arm-test-harness'
import { AdminPage } from './admin-page'
import type {
  DoctorCard,
  DoctorCardList,
  PublishWeekResult,
  WeekTemplates,
} from '../../__data__/types'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

/**
 * Понедельник текущей недели — тем же правилом, что и на странице. Страница не
 * принимает неделю параметром, поэтому фикстура обязана попасть в ту же неделю,
 * иначе тест проверял бы чужие данные.
 */
const weekStartOf = (date: Date): string => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const shiftDate = (from: string, days: number): string => {
  const [y, m, d] = from.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const CURRENT_WEEK_START = weekStartOf(new Date('2026-08-10T12:00:00'))

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']

const weekDays = WEEKDAYS.map((weekday, i) => ({
  date: shiftDate(CURRENT_WEEK_START, i),
  weekday,
}))

/**
 * Интервалы фикстуры намеренно не совпадают с макетом: если таблица придёт из
 * вёрстки, а не из ответа сервера, эти значения в DOM не появятся.
 */
const templatesPayload: WeekTemplates = {
  weekStart: CURRENT_WEEK_START,
  weekEnd: shiftDate(CURRENT_WEEK_START, 6),
  days: weekDays,
  rows: [
    {
      doctorId: 'd-001',
      doctorName: 'Иванова Евгения Сергеевна',
      specialty: 'Терапевт',
      days: [
        { ...weekDays[0], intervals: [{ start: '09:15', end: '13:45', kind: 'work' }] },
        { ...weekDays[1], intervals: [{ start: '10:30', end: '16:00', kind: 'work' }] },
        { ...weekDays[2], intervals: [{ start: '00:00', end: '00:00', kind: 'absent' }] },
        { ...weekDays[3], intervals: [{ start: '08:45', end: '12:15', kind: 'break' }] },
        { ...weekDays[4], intervals: [] },
      ],
    },
    {
      doctorId: 'd-002',
      doctorName: 'Петров Артём Владимирович',
      specialty: 'Кардиолог',
      days: [
        { ...weekDays[0], intervals: [{ start: '11:20', end: '15:50', kind: 'work' }] },
        { ...weekDays[1], intervals: [{ start: '00:00', end: '00:00', kind: 'off' }] },
        { ...weekDays[2], intervals: [{ start: '09:00', end: '14:30', kind: 'work' }] },
        { ...weekDays[3], intervals: [{ start: '13:10', end: '18:40', kind: 'work' }] },
        { ...weekDays[4], intervals: [{ start: '07:50', end: '11:10', kind: 'block' }] },
      ],
    },
  ],
  published: false,
}

/**
 * Числа итога отличаются от чисел макета: их нечем взять из вёрстки, только из
 * ответа сервера.
 */
const publishPayload: PublishWeekResult = {
  weekStart: CURRENT_WEEK_START,
  slotsCreated: 1842,
  doctorsAffected: 6,
  publishedAt: `${CURRENT_WEEK_START}T09:12:00+03:00`,
}

const card = (over: Partial<DoctorCard> & Pick<DoctorCard, 'id' | 'name'>): DoctorCard => ({
  specialty: 'Терапевт',
  cabinet: '000',
  specialties: ['Терапевт'],
  site: 'Площадка №1 · Центральная',
  temporarySites: [],
  admissionRules: [],
  equipmentAccess: [],
  patientAge: '',
  preferentialLimit: '',
  pairWork: '',
  serviceWindows: [],
  specializationTags: [],
  ...over,
})

/** Полностью заполненная карточка: на ней проверяется состав всех шести полей. */
const filledCard = card({
  id: 'd-004',
  name: 'Кузнецов Дмитрий Анатольевич',
  specialty: 'Невролог',
  cabinet: '410',
  specialties: ['Невролог', 'Рефлексотерапевт'],
  site: 'Площадка №2 · Южная',
  temporarySites: ['Площадка №3 · Заречная (до 30.09)'],
  admissionRules: ['Только взрослые', 'Приём по направлению'],
  equipmentAccess: ['ЭЭГ', 'УЗИ-аппарат Mindray'],
})

/** 5 карточек, из них 3 неполные: без специальностей, без площадки, площадка из пробелов. */
const cardsPayload: DoctorCardList = {
  items: [
    card({ id: 'd-001', name: 'Иванова Евгения Сергеевна', cabinet: '201' }),
    card({ id: 'd-002', name: 'Петров Артём Владимирович', specialty: 'Кардиолог', cabinet: '305', specialties: ['Кардиолог'], site: '   ' }),
    card({ id: 'd-003', name: 'Сидорова Мария Игоревна', specialty: 'Хирург', cabinet: '112', specialties: [] }),
    filledCard,
    card({ id: 'd-005', name: 'Орлов Никита Павлович', specialty: 'ЛОР', cabinet: '118', specialties: ['ЛОР'], site: '' }),
  ],
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))

interface ApiOptions {
  cards?: DoctorCardList
  patchResponse?: (body: Record<string, unknown>) => Promise<Response>
}

/**
 * Мок ставится на fetch, а не на модуль клиента: так под проверкой остаётся
 * настоящий src/__data__/api (адрес, метод, тело запроса и разбор ошибки), а не
 * заглушка вместо него.
 */
const mockApi = ({ cards = cardsPayload, patchResponse }: ApiOptions = {}) => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const method = init?.method ?? 'GET'

    if (url.includes('/week-templates/publish')) {
      return json(publishPayload)
    }
    if (url.includes('/week-templates')) {
      return json(templatesPayload)
    }
    if (url.includes('/doctor-cards/') && method === 'PATCH') {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
      if (patchResponse) return patchResponse(body)
      const id = decodeURIComponent(url.split('/doctor-cards/')[1])
      const target = cards.items.find((c) => c.id === id)
      if (!target) return json({ error: 'not_found', message: 'Карточка врача не найдена' }, 404)
      return json({ ...target, ...body })
    }
    if (url.includes('/doctor-cards')) {
      return json(cards)
    }
    return json({ error: 'not_found', message: 'Не найдено' }, 404)
  })
  return fetchMock
}

const renderPage = () => render(
  <ArmRouter>
    <Provider>
      <SectionNav sections={['templates', 'doctors']} />
      <AdminPage />
    </Provider>
  </ArmRouter>,
)

const openDoctors = async () => {
  fireEvent.click(await screen.findByTestId('section-doctors'))
  return screen.findByTestId('doctors-list')
}

const postPublishCalls = (fetchMock: ReturnType<typeof mockApi>) =>
  fetchMock.mock.calls.filter(([input, init]) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    return url.includes('/week-templates/publish') && (init?.method ?? 'GET') === 'POST'
  })

describe('AdminPage — шаблоны недели', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('строит таблицу «врач × день» из ответа сервера, а не из вёрстки', async () => {
    mockApi()
    renderPage()

    await screen.findByTestId('week-templates')

    // строки — врачи из данных
    expect(screen.getByTestId('tpl-row-d-001')).toBeInTheDocument()
    expect(screen.getByTestId('tpl-row-d-002')).toBeInTheDocument()
    expect(screen.getByText('Иванова Евгения Сергеевна')).toBeInTheDocument()
    expect(screen.getByText('Петров Артём Владимирович')).toBeInTheDocument()

    // колонки — дни недели из данных
    weekDays.forEach((day) => {
      expect(screen.getByText(day.weekday)).toBeInTheDocument()
    })

    // в ячейках — интервалы из данных
    expect(screen.getByTestId(`tpl-cell-d-001-${weekDays[0].date}`)).toHaveTextContent('09:15–13:45')
    expect(screen.getByTestId(`tpl-cell-d-002-${weekDays[2].date}`)).toHaveTextContent('09:00–14:30')
    expect(screen.getByTestId(`tpl-cell-d-002-${weekDays[3].date}`)).toHaveTextContent('13:10–18:40')

    // режим интервала подписан по легенде макета
    expect(screen.getByTestId(`tpl-cell-d-002-${weekDays[4].date}`)).toHaveTextContent('Блокировка')
    // нулевой интервал временем не подписывается
    expect(screen.getByTestId(`tpl-cell-d-001-${weekDays[2].date}`)).toHaveTextContent('Отсутствие')
    expect(screen.getByTestId(`tpl-cell-d-001-${weekDays[2].date}`)).not.toHaveTextContent('00:00')
    // день без интервалов — «Нет приёма»
    expect(screen.getByTestId(`tpl-cell-d-001-${weekDays[4].date}`)).toHaveTextContent('Нет приёма')
  })

  it('не публикует неделю до подтверждения', async () => {
    const fetchMock = mockApi()
    renderPage()

    fireEvent.click(await screen.findByTestId('publish-week'))

    // запрос не ушёл — сначала подтверждение
    expect(postPublishCalls(fetchMock)).toHaveLength(0)
    const confirm = await screen.findByTestId('publish-confirm')
    expect(confirm).toHaveTextContent('Отмена')
    expect(confirm).toHaveTextContent('снять')
    expect(screen.queryByTestId('publish-result')).not.toBeInTheDocument()

    // отказ от подтверждения тоже не публикует
    fireEvent.click(screen.getByTestId('publish-confirm-no'))
    await waitFor(() => {
      expect(screen.queryByTestId('publish-confirm')).not.toBeInTheDocument()
    })
    expect(postPublishCalls(fetchMock)).toHaveLength(0)
  })

  it('после подтверждения публикует неделю и показывает числовой итог из ответа', async () => {
    const fetchMock = mockApi()
    renderPage()

    fireEvent.click(await screen.findByTestId('publish-week'))
    fireEvent.click(await screen.findByTestId('publish-confirm-yes'))

    const result = await screen.findByTestId('publish-result')

    // числа названы, а не «готово»
    expect(result).toHaveTextContent('1 842')
    expect(result).toHaveTextContent('6')
    expect(result).toHaveTextContent('Нарезано 1 842 слота на 6 врачей.')

    // запрос ушёл на нужный адрес и с нужной неделей
    const calls = postPublishCalls(fetchMock)
    expect(calls).toHaveLength(1)
    const [url, init] = calls[0]
    expect(String(url)).toContain('/week-templates/publish')
    expect(JSON.parse(String(init?.body))).toEqual({ weekStart: CURRENT_WEEK_START })
  })

  it('показывает текст ошибки публикации, а не глотает её', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/week-templates/publish')) {
        return json({ error: 'week_already_published', message: 'Эта неделя уже опубликована' }, 409)
      }
      if (url.includes('/week-templates')) return json(templatesPayload)
      if (url.includes('/doctor-cards')) return json(cardsPayload)
      return json({ error: 'not_found', message: 'Не найдено' }, 404)
    })
    renderPage()

    fireEvent.click(await screen.findByTestId('publish-week'))
    fireEvent.click(await screen.findByTestId('publish-confirm-yes'))

    expect(await screen.findByTestId('publish-error')).toHaveTextContent('Эта неделя уже опубликована')
    expect(screen.queryByTestId('publish-result')).not.toBeInTheDocument()
  })
})

describe('AdminPage — справочник врачей', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('показывает список врачей из данных и полный состав карточки', async () => {
    mockApi()
    renderPage()
    await openDoctors()

    // список — из getDoctorCards
    expect(screen.getByTestId('doctor-item-d-001')).toHaveTextContent('Иванова Евгения Сергеевна')
    expect(screen.getByTestId('doctor-item-d-004')).toHaveTextContent('Кузнецов Дмитрий Анатольевич')

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))

    const cardPanel = await screen.findByTestId('doctor-card')

    // 1) специальности
    const specialties = within(cardPanel).getByTestId('field-specialties')
    expect(within(specialties).getByText('Невролог')).toBeInTheDocument()
    expect(within(specialties).getByText('Рефлексотерапевт')).toBeInTheDocument()
    // 2) основная площадка
    expect(within(cardPanel).getByTestId('field-site')).toHaveValue('Площадка №2 · Южная')
    // 3) кабинет
    expect(within(cardPanel).getByTestId('field-cabinet')).toHaveValue('410')
    // 4) временные площадки
    expect(within(within(cardPanel).getByTestId('field-temporary-sites'))
      .getByText('Площадка №3 · Заречная (до 30.09)')).toBeInTheDocument()
    // 5) правила приёма
    const rules = within(cardPanel).getByTestId('field-admission-rules')
    expect(within(rules).getByText('Только взрослые')).toBeInTheDocument()
    expect(within(rules).getByText('Приём по направлению')).toBeInTheDocument()
    // 6) допуски к оборудованию
    const equipment = within(cardPanel).getByTestId('field-equipment-access')
    expect(within(equipment).getByText('ЭЭГ')).toBeInTheDocument()
    expect(within(equipment).getByText('УЗИ-аппарат Mindray')).toBeInTheDocument()
  })

  it('сохраняет правку карточки через клиент API и отражает её в списке', async () => {
    const fetchMock = mockApi()
    renderPage()
    await openDoctors()

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))
    const siteInput = await screen.findByTestId('field-site')

    fireEvent.change(siteInput, { target: { value: 'Площадка №5 · Заречная' } })
    fireEvent.click(screen.getByTestId('doctor-save'))

    // ушёл PATCH с изменённым полем на адрес карточки
    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(([, init]) => (init?.method ?? 'GET') === 'PATCH')
      expect(patch).toBeDefined()
      const [url, init] = patch!
      expect(String(url)).toContain('/doctor-cards/d-004')
      expect(JSON.parse(String(init?.body))).toEqual({ site: 'Площадка №5 · Заречная' })
    })

    // новое значение видно в списке без перезагрузки страницы
    await waitFor(() => {
      expect(screen.getByTestId('doctor-item-d-004')).toHaveTextContent('Площадка №5 · Заречная')
    })
    expect(screen.getByTestId('field-site')).toHaveValue('Площадка №5 · Заречная')
  })

  it('показывает русское сообщение об ошибке сохранения', async () => {
    mockApi({
      patchResponse: () => json({ error: 'invalid_site', message: 'Основная площадка не может быть пустой' }, 400),
    })
    renderPage()
    await openDoctors()

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))
    fireEvent.change(await screen.findByTestId('field-site'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('doctor-save'))

    expect(await screen.findByTestId('doctor-save-error'))
      .toHaveTextContent('Основная площадка не может быть пустой')
  })
})

describe('AdminPage — счётчик незаполненных карточек', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('считает незаполненные карточки по загруженным данным', async () => {
    mockApi()
    renderPage()

    // 5 карточек фикстуры, из них 3 без специальностей или без основной площадки
    await waitFor(() => {
      expect(screen.getByTestId('incomplete-cards')).toHaveTextContent('3')
    })
  })

  it('на другой выборке даёт другое число — значение не константа', async () => {
    mockApi({
      cards: {
        items: [
          cardsPayload.items[0],
          cardsPayload.items[3],
          cardsPayload.items[4],
        ],
      },
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByTestId('incomplete-cards')).toHaveTextContent('1')
    })
  })

  it('пересчитывает счётчик после того, как карточку дозаполнили', async () => {
    mockApi()
    renderPage()
    await openDoctors()

    await waitFor(() => {
      expect(screen.getByTestId('incomplete-cards')).toHaveTextContent('3')
    })

    fireEvent.click(screen.getByTestId('doctor-item-d-005'))
    fireEvent.change(await screen.findByTestId('field-site'), { target: { value: 'Площадка №1 · Центральная' } })
    fireEvent.click(screen.getByTestId('doctor-save'))

    await waitFor(() => {
      expect(screen.getByTestId('incomplete-cards')).toHaveTextContent('2')
    })
  })
})

describe('AdminPage — поздний ответ saveDoctorCard не подменяет свежий черновик', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  /**
   * Сценарий: save A → выбор B → возврат на A → правка A → save A.
   * Первый запрос задержан и его ответ приходит ПОСЛЕ второго save. Без
   * счётчика токенов ответ #1 перезаписывает state: setCards пишет устаревшее
   * значение, а setDraft возвращает черновик к старой правке.
   */
  it('ответ устаревшего save не затирает draft и cards от свежего save', async () => {
    const deferreds: Array<{
      url: string
      resolve: (body: Record<string, unknown>) => void
      body: Record<string, unknown>
    }> = []
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      const method = init?.method ?? 'GET'
      if (url.includes('/week-templates/publish')) {
        return json(publishPayload)
      }
      if (url.includes('/week-templates')) {
        return json(templatesPayload)
      }
      if (url.includes('/doctor-cards/') && method === 'PATCH') {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
        return new Promise<Response>((resolve) => {
          deferreds.push({ url, resolve: (b) => resolve(json(b, 200)), body })
        })
      }
      if (url.includes('/doctor-cards')) {
        return json(cardsPayload)
      }
      return json({ error: 'not_found', message: 'Не найдено' }, 404)
    })

    renderPage()
    await openDoctors()

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))
    const siteInput = await screen.findByTestId('field-site')
    fireEvent.change(siteInput, { target: { value: 'Площадка №1 · Старый ответ' } })
    fireEvent.click(screen.getByTestId('doctor-save'))

    await waitFor(() => {
      expect(deferreds.length).toBe(1)
    })
    const firstRequest = deferreds[0]

    fireEvent.click(screen.getByTestId('doctor-item-d-002'))
    await screen.findByTestId('doctor-item-d-002')
    await waitFor(() => {
      expect(screen.getByTestId('field-site')).toHaveValue('   ')
    })

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))
    const siteInput2 = await screen.findByTestId('field-site')
    fireEvent.change(siteInput2, { target: { value: 'Площадка №9 · Свежий ответ' } })
    fireEvent.click(screen.getByTestId('doctor-save'))

    await waitFor(() => {
      expect(deferreds.length).toBe(2)
    })
    const secondRequest = deferreds[1]

    secondRequest.resolve({ ...cardsPayload.items.find((c) => c.id === 'd-004')!, site: 'Площадка №9 · Свежий ответ' })
    await waitFor(() => {
      expect(screen.getByTestId('field-site')).toHaveValue('Площадка №9 · Свежий ответ')
    })
    firstRequest.resolve({ ...cardsPayload.items.find((c) => c.id === 'd-004')!, site: 'Площадка №1 · Старый ответ' })

    await new Promise((r) => setTimeout(r, 50))
    expect(screen.getByTestId('field-site')).toHaveValue('Площадка №9 · Свежий ответ')
    expect(screen.getByTestId('doctor-item-d-004')).toHaveTextContent('Площадка №9 · Свежий ответ')
    expect(screen.getByTestId('doctor-item-d-004')).not.toHaveTextContent('Площадка №1 · Старый ответ')
  })

  it('правки, введённые после нажатия «Сохранить», не затираются ответом', async () => {
    const deferreds: Array<{
      resolve: (body: Record<string, unknown>) => void
    }> = []
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      const method = init?.method ?? 'GET'
      if (url.includes('/week-templates')) return json(templatesPayload)
      if (url.includes('/doctor-cards/') && method === 'PATCH') {
        return new Promise<Response>((resolve) => {
          deferreds.push({ resolve: (b) => resolve(json(b, 200)) })
        })
      }
      if (url.includes('/doctor-cards')) return json(cardsPayload)
      return json({ error: 'not_found', message: 'Не найдено' }, 404)
    })

    renderPage()
    await openDoctors()

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))
    fireEvent.change(await screen.findByTestId('field-site'), {
      target: { value: 'Площадка · отправлено' },
    })
    fireEvent.click(screen.getByTestId('doctor-save'))

    await waitFor(() => {
      expect(deferreds.length).toBe(1)
    })

    fireEvent.change(screen.getByTestId('field-site'), {
      target: { value: 'Площадка · дописано во время save' },
    })
    fireEvent.change(screen.getByTestId('field-cabinet'), {
      target: { value: '777' },
    })

    deferreds[0].resolve({
      ...cardsPayload.items.find((c) => c.id === 'd-004')!,
      site: 'Площадка · отправлено',
      cabinet: '410',
    })

    await waitFor(() => {
      expect(screen.getByTestId('doctor-save')).not.toBeDisabled()
    })
    expect(screen.getByTestId('field-site')).toHaveValue('Площадка · дописано во время save')
    expect(screen.getByTestId('field-cabinet')).toHaveValue('777')
  })

  /**
   * Контр-сценарий: один save, ответ приходит нормально — состояние применяется.
   * Без этого теста легко «защитить всё подряд» и закрыть задачу-в-пустоту.
   */
  it('единственный save без гонки применяет ответ сервера', async () => {
    mockApi({
      patchResponse: (body) => json({
        ...cardsPayload.items.find((c) => c.id === 'd-004')!,
        ...body,
      }),
    })
    renderPage()
    await openDoctors()

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))
    fireEvent.change(await screen.findByTestId('field-site'), {
      target: { value: 'Площадка №7 · Контроль' },
    })
    fireEvent.click(screen.getByTestId('doctor-save'))

    await waitFor(() => {
      expect(screen.getByTestId('field-site')).toHaveValue('Площадка №7 · Контроль')
    })
    expect(screen.getByTestId('doctor-item-d-004')).toHaveTextContent('Площадка №7 · Контроль')
  })

  it('устаревший ответ не показывает чужую ошибку saveError', async () => {
    const deferreds: Array<{
      resolve: (body: Record<string, unknown>, status?: number) => void
    }> = []
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      const method = init?.method ?? 'GET'
      if (url.includes('/week-templates/publish')) return json(publishPayload)
      if (url.includes('/week-templates')) return json(templatesPayload)
      if (url.includes('/doctor-cards/') && method === 'PATCH') {
        return new Promise<Response>((resolve) => {
          deferreds.push({ resolve: (b, s) => resolve(json(b, s ?? 200)) })
        })
      }
      if (url.includes('/doctor-cards')) return json(cardsPayload)
      return json({ error: 'not_found' }, 404)
    })

    renderPage()
    await openDoctors()

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))
    fireEvent.change(await screen.findByTestId('field-site'), {
      target: { value: 'Площадка №1 · Старый' },
    })
    fireEvent.click(screen.getByTestId('doctor-save'))

    await waitFor(() => expect(deferreds.length).toBe(1))

    fireEvent.click(screen.getByTestId('doctor-item-d-002'))
    await screen.findByTestId('doctor-item-d-002')
    await waitFor(() => {
      expect(screen.getByTestId('field-site')).toHaveValue('   ')
    })

    fireEvent.click(screen.getByTestId('doctor-item-d-004'))
    fireEvent.change(await screen.findByTestId('field-site'), {
      target: { value: 'Площадка №2 · Свежий' },
    })
    fireEvent.click(screen.getByTestId('doctor-save'))

    await waitFor(() => expect(deferreds.length).toBe(2))

    deferreds[0].resolve(
      { error: 'invalid_site', message: 'Ошибка из устаревшего ответа' },
      400,
    )
    deferreds[1].resolve({ ...cardsPayload.items[3], site: 'Площадка №2 · Свежий' })

    await waitFor(() => {
      expect(screen.getByTestId('field-site')).toHaveValue('Площадка №2 · Свежий')
    })
    expect(screen.queryByTestId('doctor-save-error')).not.toBeInTheDocument()
  })
})
