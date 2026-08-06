import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import App from '../app'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
  getNavigation: vi.fn(() => ({})),
  getNavigationValue: vi.fn((key: string) => {
    if (key === 'clinic-scheduler.main') return '/clinic-scheduler'
    return ''
  }),
  getNavigations: vi.fn(() => ({})),
  getNavigationsValue: vi.fn(() => undefined),
  getFeatures: vi.fn(() => ({})),
  getFeatureValue: vi.fn(() => undefined),
  getAllFeatures: vi.fn(() => ({})),
  getConfig: vi.fn(() => ({})),
  getHistory: vi.fn(() => undefined),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

const SWITCHERS = [
  { slug: 'operator', testId: 'switcher-operator', armLabel: 'АРМ оператора' },
  { slug: 'doctor', testId: 'switcher-doctor', armLabel: 'АРМ врача' },
  { slug: 'registrar', testId: 'switcher-registrar', armLabel: 'АРМ регистратора' },
  { slug: 'admin', testId: 'switcher-admin', armLabel: 'АРМ администратора' },
] as const

const baseSchedule = {
  date: new Date().toISOString().slice(0, 10),
  startTime: '08:00',
  endTime: '09:00',
  stepMinutes: 15,
  slots: [
    {
      time: '08:00',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: false },
      ],
    },
  ],
}

const apiBody = (path: string): unknown => {
  if (path.includes('/schedule/')) return baseSchedule
  if (path.endsWith('/appointments')) {
    return {
      items: [
        {
          id: 'a-001',
          doctorId: 'd-001',
          patientId: 'p-001',
          start: `${baseSchedule.date}T08:00:00+03:00`,
          durationMin: 30,
          status: 'scheduled',
          paymentType: 'cash',
          serviceId: null,
          doctorName: 'Иванова Е.С.',
          patientName: 'Алексеев Игорь Николаевич',
          patientPhone: '+7 900 000-00-00',
          patientBirthDate: '1980-01-01',
          patientUid: 'UID-1',
        },
      ],
    }
  }
  if (path.endsWith('/doctors')) return { items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201', type: 'doctor' as const }] }
  if (path.endsWith('/services')) return { items: [] }
  if (path.endsWith('/doctor-cards')) return { items: [] }
  if (path.includes('/week-templates')) {
    return {
      weekStart: baseSchedule.date,
      weekEnd: baseSchedule.date,
      days: [{ date: baseSchedule.date, weekday: 'Пн' }],
      rows: [],
      published: false,
    }
  }
  return {}
}

const mockFetchOk = () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    return Promise.resolve(new Response(JSON.stringify(apiBody(url)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
  })
  return fetchMock
}

describe('AppShell — каркас и навигация между АРМ', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/clinic-scheduler')
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
    mockFetchOk()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('рендерит шапку с логотипом, площадкой, датой, переключателем и пользователем', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('app-shell')).toBeInTheDocument()
    })

    expect(screen.getByTestId('app-shell-brand')).toHaveTextContent('СМ-Клиника')
    expect(screen.getByTestId('app-shell-site')).toHaveTextContent('Динамо')
    expect(screen.getByTestId('app-shell-date')).toBeInTheDocument()
    expect(screen.getByTestId('app-shell-user')).toHaveTextContent('Ефимова Т. С.')
    expect(screen.getByTestId('app-shell-switcher')).toBeInTheDocument()

    for (const sw of SWITCHERS) {
      expect(screen.getByTestId(sw.testId)).toHaveTextContent(
        sw.slug === 'operator' ? 'Оператор'
          : sw.slug === 'doctor' ? 'Врач'
            : sw.slug === 'registrar' ? 'Регистратор'
              : 'Администратор',
      )
    }
  })

  it('на корневой выкладке показывает реальный лендинг, а не Grid-заглушку', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('main-page')).toBeInTheDocument()
    })

    expect(screen.getByTestId('main-card-operator')).toBeInTheDocument()
    expect(screen.getByTestId('main-card-doctor')).toBeInTheDocument()
    expect(screen.getByTestId('main-card-registrar')).toBeInTheDocument()
    expect(screen.getByTestId('main-card-admin')).toBeInTheDocument()
    expect(screen.getByTestId('main-site')).toHaveTextContent('Динамо')
  })

  it('клик по сегменту переключателя открывает нужный АРМ и подсвечивает активный пункт', async () => {
    const { container } = render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('main-page')).toBeInTheDocument()
    })

    for (const sw of SWITCHERS) {
      const navTarget = container.querySelector(`[data-testid="${sw.testId}"]`) as HTMLElement
      expect(navTarget).toBeInTheDocument()
      await act(async () => {
        fireEvent.click(navTarget)
      })

      const probe = sw.slug === 'operator' ? 'operator-page'
        : sw.slug === 'doctor' ? 'doctor-page'
          : sw.slug === 'registrar' ? 'counter-cash'
            : 'admin-page'

      await waitFor(() => {
        expect(screen.getByTestId(probe)).toBeInTheDocument()
      })

      expect(screen.getByTestId(sw.testId)).toHaveAttribute('aria-selected', 'true')
      for (const other of SWITCHERS) {
        if (other.slug === sw.slug) continue
        expect(screen.getByTestId(other.testId)).toHaveAttribute('aria-selected', 'false')
      }

      expect(screen.getByTestId('app-shell-arm-label')).toHaveTextContent(sw.armLabel)
    }
  })

  it('переход со стартового экрана кнопкой «Открыть» открывает выбранный АРМ', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('main-page')).toBeInTheDocument()
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('main-card-doctor-open'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('doctor-page')).toBeInTheDocument()
    })

    expect(screen.getByTestId('switcher-doctor')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('switcher-operator')).toHaveAttribute('aria-selected', 'false')
  })
})
