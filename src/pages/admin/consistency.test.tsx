import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Provider } from '../../theme'
import { AdminPage } from './admin-page'
import type {
  DoctorCard,
  DoctorCardList,
  DoctorList,
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

const CURRENT_WEEK_START = weekStartOf(new Date())

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']

const weekDays = WEEKDAYS.map((weekday, i) => ({
  date: shiftDate(CURRENT_WEEK_START, i),
  weekday,
}))

const templatesUnpublished: WeekTemplates = {
  weekStart: CURRENT_WEEK_START,
  weekEnd: shiftDate(CURRENT_WEEK_START, 6),
  days: weekDays,
  rows: [
    {
      doctorId: 'd-001',
      doctorName: 'Иванова Евгения Сергеевна',
      specialty: 'Терапевт',
      days: weekDays.map((d, i) => ({
        ...d,
        intervals: i === 4 ? [] : [{ start: '09:00', end: '13:00', kind: 'work' }],
      })),
    },
  ],
  published: false,
}

const templatesPublished: WeekTemplates = {
  ...templatesUnpublished,
  published: true,
}

const publishPayload: PublishWeekResult = {
  weekStart: CURRENT_WEEK_START,
  slotsCreated: 1842,
  doctorsAffected: 6,
  publishedAt: `${CURRENT_WEEK_START}T09:12:00+03:00`,
}

const card = (over: Partial<DoctorCard> & Pick<DoctorCard, 'id' | 'name'>): DoctorCard => ({
  specialty: 'Терапевт',
  cabinet: '201',
  specialties: ['Терапевт'],
  site: 'Площадка №1 · Центральная',
  temporarySites: [],
  admissionRules: [],
  equipmentAccess: [],
  ...over,
})

const cardsPayload: DoctorCardList = {
  items: [
    card({
      id: 'd-001',
      name: 'Иванова Евгения Сергеевна',
      specialty: 'Терапевт',
      cabinet: '201',
      specialties: ['Терапевт'],
    }),
  ],
}

const doctorsPayload: DoctorList = {
  items: [
    {
      id: 'd-001',
      name: 'Иванова Евгения Сергеевна',
      specialty: 'Терапевт',
      cabinet: '201',
    },
  ],
}

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))

/**
 * Мок на fetch: под управлением теста, какая загрузка отвечает ошибкой и в каком порядке.
 * Маршруты: GET /week-templates, POST /week-templates/publish, GET /doctor-cards, PATCH /doctor-cards/:id, GET /doctors.
 */
type Handler = (init?: RequestInit) => Promise<Response>

interface RouterMock {
  onGet: (matcher: (url: string) => boolean, handler: Handler) => void
  onPatch: (matcher: (url: string) => boolean, handler: Handler) => void
  onPost: (matcher: (url: string) => boolean, handler: Handler) => void
  install: () => ReturnType<typeof vi.spyOn>
}

const createRouterMock = (): RouterMock => {
  const routes: Array<{
    method: 'GET' | 'POST' | 'PATCH'
    matcher: (url: string) => boolean
    handler: Handler
  }> = []

  const add = (method: 'GET' | 'POST' | 'PATCH', matcher: (url: string) => boolean, handler: Handler) => {
    routes.push({ method, matcher, handler })
  }

  return {
    onGet: (matcher, handler) => add('GET', matcher, handler),
    onPost: (matcher, handler) => add('POST', matcher, handler),
    onPatch: (matcher, handler) => add('PATCH', matcher, handler),
    install: () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch')
      fetchMock.mockImplementation((input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const method = (init?.method ?? 'GET') as 'GET' | 'POST' | 'PATCH'
        const route = routes.find((r) => r.method === method && r.matcher(url))
        if (route) return route.handler(init)
        return json({ error: 'not_found', message: 'Не найдено' }, 404)
      })
      return fetchMock
    },
  }
}

describe('AdminPage — консистентность (consistency)', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('ошибка загрузки шаблонов не затирает успех загрузки справочника (обратный порядок)', async () => {
    const router = createRouterMock()
    router.onGet(
      (url) => url.includes('/week-templates') && !url.includes('publish'),
      () => json({ error: 'server_down', message: 'Сервер шаблонов недоступен' }, 500),
    )
    router.onGet(
      (url) => url.includes('/doctor-cards'),
      () => json(cardsPayload),
    )
    router.install()

    render(<Provider><AdminPage /></Provider>)

    // шаблоны в ошибке, ошибка видна ровно один раз
    const errorBanner = await screen.findByTestId('week-templates-error')
    expect(errorBanner).toHaveTextContent('Сервер шаблонов недоступен')

    // справочник при этом доступен — экран не остался в общей «Загрузке»
    fireEvent.click(screen.getByTestId('section-doctors'))
    await screen.findByTestId('doctor-item-d-001')
    expect(screen.queryByTestId('doctors-list-error')).not.toBeInTheDocument()
  })

  it('ошибка загрузки справочника не затирает успех загрузки шаблонов', async () => {
    const router = createRouterMock()
    router.onGet(
      (url) => url.includes('/week-templates') && !url.includes('publish'),
      () => json(templatesUnpublished),
    )
    router.onGet(
      (url) => url.includes('/doctor-cards'),
      () => json({ error: 'server_down', message: 'Сервер справочника недоступен' }, 500),
    )
    router.install()

    render(<Provider><AdminPage /></Provider>)

    // шаблоны отрисовались — это успех, который раньше затирался общим loadError
    await screen.findByTestId('tpl-row-d-001')
    expect(screen.getByText('Иванова Евгения Сергеевна')).toBeInTheDocument()

    // ошибка видна только по справочнику, а не «шаблоны загружены, ошибка — везде»
    fireEvent.click(screen.getByTestId('section-doctors'))
    expect(await screen.findByTestId('doctors-list-error'))
      .toHaveTextContent('Сервер справочника недоступен')
    expect(screen.queryByTestId('week-templates-error')).not.toBeInTheDocument()
  })

  it('опубликованная неделя: кнопка публикации disabled и подпись «Неделя опубликована»', async () => {
    const router = createRouterMock()
    router.onGet(
      (url) => url.includes('/week-templates') && !url.includes('publish'),
      () => json(templatesPublished),
    )
    router.onGet((url) => url.includes('/doctor-cards'), () => json(cardsPayload))
    router.install()

    render(<Provider><AdminPage /></Provider>)

    const publishBtn = await screen.findByTestId('publish-week')
    expect(publishBtn).toBeDisabled()
    expect(screen.getByTestId('week-published-badge')).toHaveTextContent('Неделя опубликована')
  })

  it('опубликованная неделя: клик по disabled-кнопке не отправляет POST /week-templates/publish', async () => {
    const router = createRouterMock()
    let publishCalls = 0
    router.onGet(
      (url) => url.includes('/week-templates') && !url.includes('publish'),
      () => json(templatesPublished),
    )
    router.onGet((url) => url.includes('/doctor-cards'), () => json(cardsPayload))
    router.onPost(
      (url) => url.includes('/week-templates/publish'),
      () => {
        publishCalls += 1
        return json(publishPayload)
      },
    )
    const fetchMock = router.install()

    render(<Provider><AdminPage /></Provider>)

    const publishBtn = await screen.findByTestId('publish-week')
    fireEvent.click(publishBtn)

    await waitFor(() => {
      expect(publishCalls).toBe(0)
    })
    expect(fetchMock.mock.calls.filter(([, init]) => (init?.method ?? 'GET') === 'POST')).toHaveLength(0)
  })

  it('PATCH специальностей синхронизирует specialty в /doctors', async () => {
    const router = createRouterMock()
    router.onGet(
      (url) => url.includes('/week-templates') && !url.includes('publish'),
      () => json(templatesUnpublished),
    )
    router.onGet((url) => url.includes('/doctor-cards'), () => json(cardsPayload))

    const liveDoctor = { ...doctorsPayload.items[0] }
    router.onGet((url) => url.includes('/doctors') && !url.includes('doctor-cards'), () => json({ items: [liveDoctor] }))

    router.onPatch(
      (url) => url.includes('/doctor-cards/d-001'),
      (init) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>
        const next = Array.isArray(body.specialties) ? (body.specialties as string[]) : []
        if (next.length > 0) liveDoctor.specialty = next[0]
        return json({
          ...cardsPayload.items[0],
          ...body,
          specialty: next[0] ?? cardsPayload.items[0].specialty,
        })
      },
    )
    router.install()

    render(<Provider><AdminPage /></Provider>)
    fireEvent.click(await screen.findByTestId('section-doctors'))
    fireEvent.click(await screen.findByTestId('doctor-item-d-001'))

    const specialties = await screen.findByTestId('field-specialties')
    const input = specialties.querySelector('input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Эндокринолог' } })
    fireEvent.click(specialties.querySelector('[data-testid="field-specialties-add"]') as HTMLElement)

    fireEvent.click(screen.getByTestId('doctor-save'))

    await waitFor(() => {
      // прямой запрос /doctors обязан вернуть обновлённую запись врача
      expect(liveDoctor.specialty).toBe('Эндокринолог')
    })

    // повторное открытие карточки отражает синхронизированную specialty
    await waitFor(() => {
      expect(screen.getByTestId('doctor-card')).toHaveTextContent('Эндокринолог')
    })
  })
})