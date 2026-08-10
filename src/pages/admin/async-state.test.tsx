import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

import { Provider } from '../../theme'
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
const NEXT_WEEK_START = shiftDate(CURRENT_WEEK_START, 7)
const WEEK_AFTER_NEXT = shiftDate(CURRENT_WEEK_START, 14)

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']

const buildWeekDays = (weekStart: string) =>
  WEEKDAYS.map((weekday, i) => ({ date: shiftDate(weekStart, i), weekday }))

const buildTemplates = (weekStart: string, published: boolean): WeekTemplates => {
  const days = buildWeekDays(weekStart)
  return {
    weekStart,
    weekEnd: shiftDate(weekStart, 6),
    days,
    rows: [
      {
        doctorId: `doc-${weekStart}`,
        doctorName: 'Иванова Евгения Сергеевна',
        specialty: 'Терапевт',
        days: days.map((d) => ({ ...d, intervals: [{ start: '09:00', end: '13:00', kind: 'work' }] })),
      },
    ],
    published,
  }
}

const publishPayloadFor = (weekStart: string, doctorsAffected: number): PublishWeekResult => ({
  weekStart,
  slotsCreated: 100,
  doctorsAffected,
  publishedAt: `${weekStart}T10:00:00+03:00`,
})

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

const cardsPayload: DoctorCardList = {
  items: [
    card({ id: 'd-001', name: 'Иванова Евгения Сергеевна', site: 'Площадка A' }),
    card({ id: 'd-002', name: 'Петров Артём Владимирович', site: 'Площадка B' }),
  ],
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))

interface DeferredRequest<T> {
  promise: Promise<T>
  resolve: (value: T) => void
}

const deferred = <T,>(): DeferredRequest<T> => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

interface FetchLogEntry {
  url: string
  method: string
  body: unknown
}

interface MockOptions {
  weekRequestDelays?: Set<string>
  patchDelays?: boolean
}

const installFetchMock = (options: MockOptions = {}) => {
  const log: FetchLogEntry[] = []
  const pending = new Map<string, DeferredRequest<Response>>()

  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : null
    log.push({ url, method, body })

    if (url.includes('/week-templates/publish') && method === 'POST') {
      const payload = JSON.parse(String(init?.body ?? '{}')) as { weekStart?: string }
      return json(publishPayloadFor(payload.weekStart ?? CURRENT_WEEK_START, 6))
    }
    if (url.includes('/week-templates') && method === 'GET' && !url.includes('/publish')) {
      const match = /weekStart=([^&]+)/.exec(url)
      const requested = match ? decodeURIComponent(match[1]) : CURRENT_WEEK_START
      const templates =
        requested === NEXT_WEEK_START
          ? buildTemplates(NEXT_WEEK_START, false)
          : requested === WEEK_AFTER_NEXT
            ? buildTemplates(WEEK_AFTER_NEXT, false)
            : buildTemplates(CURRENT_WEEK_START, true)
      const response = json(templates)
      if (options.weekRequestDelays?.has(requested)) {
        const slot: DeferredRequest<Response> = deferred<Response>()
        pending.set(requested, slot)
        return slot.promise
      }
      return response
    }
    if (url.includes('/doctor-cards/') && method === 'PATCH') {
      const id = decodeURIComponent(url.split('/doctor-cards/')[1])
      const target = cardsPayload.items.find((c) => c.id === id)
      if (!target) return json({ error: 'not_found', message: 'Не найдено' }, 404)
      const response = json({ ...target, ...(body as Record<string, unknown>) })
      if (options.patchDelays) {
        const slot: DeferredRequest<Response> = deferred<Response>()
        pending.set(`patch:${id}`, slot)
        return slot.promise
      }
      return response
    }
    if (url.includes('/doctor-cards')) {
      return json(cardsPayload)
    }
    return json({ error: 'not_found', message: 'Не найдено' }, 404)
  })

  return {
    fetchMock,
    log,
    pending,
    resolvePending: (key: string, value: Response) => {
      const slot = pending.get(key)
      if (!slot) throw new Error(`нет ожидающего запроса по ключу ${key}`)
      slot.resolve(value)
    },
  }
}

const renderPage = () => render(<Provider><AdminPage /></Provider>)

const postPublishCalls = (log: FetchLogEntry[]) =>
  log.filter((e) => e.method === 'POST' && e.url.includes('/week-templates/publish'))

const patchCalls = (log: FetchLogEntry[]) =>
  log.filter((e) => e.method === 'PATCH' && e.url.includes('/doctor-cards/'))

describe('AdminPage — асинхронное состояние (TASK-31)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('при смене недели таблица предыдущей немедленно убирается и кнопка публикации недоступна, пока грузится новая', async () => {
    const harness = installFetchMock({ weekRequestDelays: new Set([NEXT_WEEK_START]) })
    renderPage()

    await screen.findByTestId('week-templates')
    expect(screen.getByTestId('week-current')).toHaveTextContent(CURRENT_WEEK_START)

    fireEvent.click(screen.getByTestId('week-next'))

    // Сразу после клика старая таблица убрана — на экране «Загрузка шаблонов…»
    await waitFor(() => {
      expect(screen.queryByTestId(`tpl-row-doc-${CURRENT_WEEK_START}`)).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('week-templates-loading')).toBeInTheDocument()

    // Кнопка публикации не видна (вся шапка скрыта, пока data === null)
    expect(screen.queryByTestId('publish-week')).not.toBeInTheDocument()
    // Подтверждение не открыто
    expect(screen.queryByTestId('publish-confirm')).not.toBeInTheDocument()

    // Разрешаем загрузку следующей недели — таблица появляется, кнопка доступна
    await act(async () => {
      harness.resolvePending(NEXT_WEEK_START, json(buildTemplates(NEXT_WEEK_START, false)))
    })

    await screen.findByTestId(`tpl-row-doc-${NEXT_WEEK_START}`)
    await waitFor(() => {
      expect(screen.getByTestId('week-current')).toHaveTextContent(NEXT_WEEK_START)
    })
    expect(screen.getByTestId('publish-week')).not.toBeDisabled()
  })

  it('если открыли подтверждение и переключили неделю — POST уходит с показанной неделей, а не со старой', async () => {
    const harness = installFetchMock({
      weekRequestDelays: new Set([NEXT_WEEK_START, WEEK_AFTER_NEXT]),
    })
    renderPage()

    await screen.findByTestId('week-templates')
    fireEvent.click(screen.getByTestId('week-next'))

    // Пока новая неделя грузится — публикация недоступна, диалога нет
    expect(screen.queryByTestId('publish-confirm')).not.toBeInTheDocument()

    await act(async () => {
      harness.resolvePending(NEXT_WEEK_START, json(buildTemplates(NEXT_WEEK_START, false)))
    })

    // Открываем подтверждение для следующей недели
    await screen.findByTestId('publish-week')
    fireEvent.click(screen.getByTestId('publish-week'))
    const confirm = await screen.findByTestId('publish-confirm')
    const [, nextMonthStr, nextDayStr] = NEXT_WEEK_START.split('-')
    expect(confirm).toHaveTextContent(`${nextDayStr}.${nextMonthStr}`)

    // Уходим ещё на неделю вперёд — старый диалог скрыт, таблица очищена
    fireEvent.click(screen.getByTestId('week-next'))
    await waitFor(() => {
      expect(screen.queryByTestId('publish-confirm')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('week-templates-loading')).toBeInTheDocument()

    // Резолвим следующую неделю — кнопка снова доступна
    await act(async () => {
      harness.resolvePending(WEEK_AFTER_NEXT, json(buildTemplates(WEEK_AFTER_NEXT, false)))
    })

    await waitFor(() => {
      expect(screen.getByTestId('week-current')).toHaveTextContent(WEEK_AFTER_NEXT)
    })

    // Подтверждаем — POST уходит с той неделей, которую сейчас видим
    fireEvent.click(await screen.findByTestId('publish-week'))
    fireEvent.click(await screen.findByTestId('publish-confirm-yes'))

    await waitFor(() => {
      expect(postPublishCalls(harness.log)).toHaveLength(1)
    })
    const [publishCall] = postPublishCalls(harness.log)
    expect(publishCall.body).toEqual({ weekStart: WEEK_AFTER_NEXT })
  })

  it('ответ PATCH по ранее выбранному врачу не затирает черновик вновь выбранного', async () => {
    const harness = installFetchMock({ patchDelays: true })
    renderPage()

    fireEvent.click(await screen.findByTestId('section-doctors'))
    const list = await screen.findByTestId('doctors-list')

    // 1) выбираем врача A и правим площадку
    fireEvent.click(within(list).getByTestId('doctor-item-d-001'))
    const siteInputA = await screen.findByTestId('field-site')
    expect(siteInputA).toHaveValue('Площадка A')

    fireEvent.change(siteInputA, { target: { value: 'Площадка A · редактировано' } })

    fireEvent.click(screen.getByTestId('doctor-save'))

    // Запрос ушёл, но отложен — переключаемся на врача B до ответа
    await waitFor(() => {
      expect(patchCalls(harness.log)).toHaveLength(1)
    })

    fireEvent.click(within(list).getByTestId('doctor-item-d-002'))

    const siteInputB = await screen.findByTestId('field-site')
    expect(siteInputB).toHaveValue('Площадка B')

    // 2) Резолвим отложенный PATCH по d-001 — он НЕ должен затронуть состояние B
    const pending = harness.fetchMock.mock.results[0]
    expect(pending).toBeDefined()

    await act(async () => {
      harness.resolvePending(
        'patch:d-001',
        json({
          ...cardsPayload.items[0],
          site: 'Площадка A · сервер',
        }),
      )
    })

    // 3) После ответа черновик и selectedId остаются про врача B
    await waitFor(() => {
      expect(screen.getByTestId('field-site')).toHaveValue('Площадка B')
    })
    expect(within(list).getByTestId('doctor-item-d-002')).toBeInTheDocument()
    // Список A обновился (с серверным значением), но B не пострадал
    expect(within(list).getByTestId('doctor-item-d-001')).toHaveTextContent('Площадка A · сервер')

    // 4) Сохранение завершилось — кнопка больше не показывает «Сохраняем…»
    await waitFor(() => {
      const saveBtn = screen.getByTestId('doctor-save') as HTMLButtonElement
      expect(saveBtn.textContent ?? '').not.toContain('Сохраняем')
    })
  })
})