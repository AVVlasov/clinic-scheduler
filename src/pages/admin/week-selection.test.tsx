import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { Provider } from '../../theme'
import { AdminPage } from './admin-page'
import type {
  DoctorCardList,
  PublishWeekResult,
  WeekTemplates,
} from '../../__data__/types'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

/** Тот же расчёт понедельника, что и в admin-page.tsx — иначе фикстура промахнётся мимо недели. */
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

const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница']

const buildWeekDays = (weekStart: string) =>
  WEEKDAYS.map((weekday, i) => ({ date: shiftDate(weekStart, i), weekday }))

/**
 * Сборка шаблонов под произвольную неделю: 2 врача с work-интервалами, чтобы
 * сервер посчитал ненулевые числа слотов при публикации. Идентификаторы и
 * имена — не из макета, иначе тест пройдёт на вёрстке, а не на ответе.
 */
const buildTemplates = (weekStart: string, published: boolean): WeekTemplates => {
  const days = buildWeekDays(weekStart)
  const rowDays = (intervals: { start: string; end: string; kind: 'work' | 'break' }[]) =>
    days.map((d, i) => ({
      ...d,
      intervals: i < intervals.length ? [intervals[i]] : [],
    }))
  return {
    weekStart,
    weekEnd: shiftDate(weekStart, 6),
    days,
    rows: [
      {
        doctorId: 'd-sel-001',
        doctorName: 'Селекторова Анна Викторовна',
        specialty: 'Терапевт',
        days: rowDays([
          { start: '09:00', end: '13:00', kind: 'work' },
          { start: '09:30', end: '14:30', kind: 'work' },
          { start: '10:00', end: '12:00', kind: 'work' },
        ]),
      },
      {
        doctorId: 'd-sel-002',
        doctorName: 'Сменов Иван Петрович',
        specialty: 'Хирург',
        days: rowDays([
          { start: '11:00', end: '15:00', kind: 'work' },
          { start: '08:00', end: '12:00', kind: 'work' },
        ]),
      },
    ],
    published,
  }
}

const currentTemplates = buildTemplates(CURRENT_WEEK_START, true)
const nextTemplates = buildTemplates(NEXT_WEEK_START, false)

/**
 * Итог публикации должен отличаться от чисел, которые в принципе можно собрать
 * из вёрстки: тогда текст вида «1 234» — точно из ответа, а не из шаблона.
 */
const publishPayload: PublishWeekResult = {
  weekStart: NEXT_WEEK_START,
  slotsCreated: 1234,
  doctorsAffected: 9,
  publishedAt: `${NEXT_WEEK_START}T10:00:00+03:00`,
}

const emptyCards: DoctorCardList = { items: [] }

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))

interface FetchLog {
  url: string
  method: string
  body: unknown
}

const installFetchMock = (): { fetchMock: ReturnType<typeof vi.spyOn>; log: FetchLog[] } => {
  const log: FetchLog[] = []
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input, init) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const method = init?.method ?? 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : null
    log.push({ url, method, body })

    if (url.includes('/week-templates/publish') && method === 'POST') {
      return json(publishPayload)
    }
    if (url.includes('/week-templates') && method === 'GET') {
      const match = /weekStart=([^&]+)/.exec(url)
      const requested = match ? decodeURIComponent(match[1]) : null
      if (requested === NEXT_WEEK_START) return json(nextTemplates)
      if (requested === CURRENT_WEEK_START) return json(currentTemplates)
      return json(currentTemplates)
    }
    if (url.includes('/doctor-cards')) {
      return json(emptyCards)
    }
    return json({ error: 'not_found', message: 'Не найдено' }, 404)
  })
  return { fetchMock, log }
}

const renderPage = () => render(<Provider><AdminPage /></Provider>)

const weekTemplateGet = (log: FetchLog[], weekStart: string) =>
  log.filter(
    (e) =>
      e.method === 'GET' &&
      e.url.includes('/week-templates') &&
      !e.url.includes('/publish') &&
      e.url.includes(`weekStart=${encodeURIComponent(weekStart)}`),
  )

const postPublish = (log: FetchLog[]) =>
  log.filter(
    (e) => e.method === 'POST' && e.url.includes('/week-templates/publish'),
  )

describe('AdminPage — выбор недели (TASK-29)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('на старте неделя фиксирована и совпадает с понедельником текущей', async () => {
    installFetchMock()
    renderPage()

    await screen.findByTestId('week-templates')
    expect(screen.getByTestId('week-current')).toHaveTextContent(CURRENT_WEEK_START)
  })

  it('селектор недели виден: вперёд, назад, индикатор — и кнопка публикации на опубликованной неделе disabled', async () => {
    installFetchMock()
    renderPage()

    await screen.findByTestId('week-selector')
    expect(screen.getByTestId('week-prev')).toBeInTheDocument()
    expect(screen.getByTestId('week-next')).toBeInTheDocument()
    expect(screen.getByTestId('week-current')).toBeInTheDocument()

    // стартовая неделя опубликована — публикация недоступна
    expect(screen.getByTestId('publish-week')).toBeDisabled()
    expect(screen.getByTestId('week-published-badge')).toBeInTheDocument()
  })

  it('на старте текущая неделя выбрана, «назад» ведёт к прошлой (она же нижняя граница), «вперёд» доступен', async () => {
    const { log } = installFetchMock()
    renderPage()

    await screen.findByTestId('week-selector')
    // текущая неделя — стартовая точка: prev доступен (есть прошлая), next доступен (есть будущие)
    expect(screen.getByTestId('week-prev')).not.toBeDisabled()
    expect(screen.getByTestId('week-next')).not.toBeDisabled()

    // уход «назад» на прошлую неделю — это нижняя граница: prev становится disabled
    fireEvent.click(screen.getByTestId('week-prev'))
    await waitFor(() => {
      expect(screen.getByTestId('week-current')).toHaveTextContent(
        shiftDate(CURRENT_WEEK_START, -7),
      )
    })
    expect(screen.getByTestId('week-prev')).toBeDisabled()

    // запрос за прошлой неделей действительно ушёл
    const expected = shiftDate(CURRENT_WEEK_START, -7)
    expect(weekTemplateGet(log, expected).length).toBeGreaterThan(0)
  })

  it('«вперёд» как минимум на месяц: восемь недель подряд доступны', async () => {
    const { log } = installFetchMock()
    renderPage()

    await screen.findByTestId('week-selector')

    for (let i = 1; i <= 8; i += 1) {
      fireEvent.click(screen.getByTestId('week-next'))
      const expected = shiftDate(CURRENT_WEEK_START, 7 * i)
      await waitFor(() => {
        expect(screen.getByTestId('week-current')).toHaveTextContent(expected)
      })
    }

    // дошли до верхней границы — кнопка становится disabled
    expect(screen.getByTestId('week-next')).toBeDisabled()

    // каждая смена недели дёрнула GET /week-templates с новым weekStart
    for (let i = 1; i <= 8; i += 1) {
      const expected = shiftDate(CURRENT_WEEK_START, 7 * i)
      expect(weekTemplateGet(log, expected).length).toBeGreaterThan(0)
    }
  })

  it('end-to-end: на опубликованной неделе кнопка disabled → переключение на следующую делает её доступной → публикация проходит и итог называет числа', async () => {
    const { log } = installFetchMock()
    renderPage()

    await screen.findByTestId('week-selector')

    // 1) стартовая неделя — опубликованная: кнопка заблокирована, попытка публикации ничего не делает
    expect(screen.getByTestId('publish-week')).toBeDisabled()
    expect(postPublish(log)).toHaveLength(0)

    // 2) переключаемся на следующую неделю
    fireEvent.click(screen.getByTestId('week-next'))
    await waitFor(() => {
      expect(screen.getByTestId('week-current')).toHaveTextContent(NEXT_WEEK_START)
    })

    // 3) на новой неделе — кнопка публикации доступна и шаблоны были перезапрошены
    await waitFor(() => {
      expect(screen.getByTestId('publish-week')).not.toBeDisabled()
    })
    expect(weekTemplateGet(log, NEXT_WEEK_START).length).toBeGreaterThan(0)
    expect(screen.queryByTestId('week-published-badge')).not.toBeInTheDocument()

    // 4) публикуем: подтверждение → итог с числами
    fireEvent.click(screen.getByTestId('publish-week'))
    fireEvent.click(await screen.findByTestId('publish-confirm-yes'))

    const result = await screen.findByTestId('publish-result')
    expect(result).toHaveTextContent('1 234')
    expect(result).toHaveTextContent('9')
    expect(result).toHaveTextContent('Нарезано 1 234 слотов на 9 врачей.')

    // 5) POST ушёл на publish с weekStart именно следующей недели
    const calls = postPublish(log)
    expect(calls).toHaveLength(1)
    expect(calls[0].body).toEqual({ weekStart: NEXT_WEEK_START })
  })

  it('смена недели сбрасывает предыдущий итог публикации, чтобы не показывать чужие числа', async () => {
    const { log } = installFetchMock()
    renderPage()

    await screen.findByTestId('week-selector')

    fireEvent.click(screen.getByTestId('week-next'))
    await waitFor(() => {
      expect(screen.getByTestId('week-current')).toHaveTextContent(NEXT_WEEK_START)
    })

    fireEvent.click(screen.getByTestId('publish-week'))
    fireEvent.click(await screen.findByTestId('publish-confirm-yes'))
    await screen.findByTestId('publish-result')

    // возвращаемся на опубликованную неделю — итога там быть не должно
    fireEvent.click(screen.getByTestId('week-prev'))
    await waitFor(() => {
      expect(screen.getByTestId('week-current')).toHaveTextContent(CURRENT_WEEK_START)
    })
    expect(screen.queryByTestId('publish-result')).not.toBeInTheDocument()
    expect(postPublish(log)).toHaveLength(1)
  })
})
