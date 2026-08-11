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
  date: '2026-08-10',
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
  const date = (path.match(/[?&]date=([^&]+)/) || [null, baseSchedule.date])[1] as string
  if (path.includes('/schedule/')) return { ...baseSchedule, date }
  if (/\/appointments\/[^/?]+\/history/.test(path)) return { items: [] }
  if (path.includes('/appointments') && !/\/appointments\/[^?]/.test(path.split('?')[0])) {
    return {
      date,
      items: [
        {
          id: 'a-001',
          doctorId: 'd-001',
          patientId: 'p-001',
          start: `${date}T08:00:00+03:00`,
          durationMin: 30,
          status: 'scheduled',
          paymentType: 'regular',
          serviceId: null,
          doctorName: 'Иванова Е.С.',
          patientName: 'Алексеев Игорь Николаевич',
          patientPhone: '+7 900 000-00-00',
          patientBirthDate: '1980-01-01',
          patientUid: 'UID-1',
          complaints: null,
          diagnosis: null,
          visitType: null,
          performedServiceIds: [],
          recommendations: [],
          nextVisit: null,
        },
      ],
    }
  }
  if (path.endsWith('/doctors')) return { items: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' }] }
  if (path.endsWith('/services')) {
    return {
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
  }
  if (path.endsWith('/doctor-cards')) return { items: [] }
  if (path.includes('/equipment/schedule')) {
    return {
      date,
      stepMinutes: 15,
      startTime: '08:00',
      endTime: '09:00',
      items: [
        {
          id: 'eq-001',
          name: 'Электрокардиограф',
          code: 'EQ.ECG.01',
          kind: 'apparatus',
          type: 'Диагностика',
          cabinet: '305',
          hours: { start: '08:00', end: '20:00' },
          maintenance: '—',
          serviceIds: ['s-003'],
          serviceNames: ['ЭКГ'],
          sharedWith: [],
          repair: null,
          bookedCount: 0,
          slots: [{ time: '08:00', state: 'free', label: null }],
        },
      ],
    }
  }
  if (path.endsWith('/equipment')) return { items: [] }
  if (path.endsWith('/competencies')) {
    return {
      doctors: [{ id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт' }],
      services: [{ id: 's-001', name: 'Первичная консультация', category: 'Приём' }],
      cells: [{ serviceId: 's-001', values: [{ doctorId: 'd-001', value: 'yes' }] }],
    }
  }
  if (path.includes('/duration-rules')) {
    return {
      items: [
        {
          id: 'dr-base',
          priority: 0,
          condition: 'Базовая длительность',
          factor: 'Норматив услуги',
          effectLabel: 'база',
          enabled: true,
          locked: true,
          match: {},
          effect: { kind: 'base' },
        },
      ],
    }
  }
  if (path.includes('/waitlist')) return { items: [], openCount: 0 }
  if (path.includes('/patients')) return { items: [] }
  if (path.includes('/week-templates')) {
    return {
      weekStart: date,
      weekEnd: date,
      days: [{ date, weekday: 'Пн' }],
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
        const found = screen.queryByTestId(probe)
          || (sw.slug === 'doctor' ? screen.queryByTestId('doctor-empty') : null)
          || (sw.slug === 'registrar' ? screen.queryByTestId('registrar-empty') : null)
          || (sw.slug === 'operator' ? screen.queryByTestId('operator-empty') : null)
        expect(found).toBeInTheDocument()
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
      const found = screen.queryByTestId('doctor-page') || screen.queryByTestId('doctor-empty')
      expect(found).toBeInTheDocument()
    })

    expect(screen.getByTestId('switcher-doctor')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('switcher-operator')).toHaveAttribute('aria-selected', 'false')
  })

  it('каждый пункт навигации открывает свой экран — недоступных пунктов нет', async () => {
    const { container } = render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('main-page')).toBeInTheDocument()
    })

    const cases = [
      {
        switcher: 'switcher-operator',
        items: [
          { id: 'grid', screen: 'operator-page' },
          { id: 'waitlist', screen: 'waitlist-panel' },
          { id: 'mass-reschedule', screen: 'mass-reschedule-panel' },
        ],
      },
      {
        switcher: 'switcher-registrar',
        items: [
          { id: 'queue', screen: 'registrar-page' },
          { id: 'search', screen: 'patient-search' },
          { id: 'new-patient', screen: 'patient-card-form' },
        ],
      },
      {
        switcher: 'switcher-admin',
        items: [
          { id: 'templates', screen: 'week-templates' },
          { id: 'doctors', screen: 'doctors-list' },
          { id: 'equipment', screen: 'equipment-screen' },
          { id: 'matrix', screen: 'matrix-screen' },
          { id: 'duration-rules', screen: 'duration-screen' },
        ],
      },
    ] as const

    for (const c of cases) {
      await act(async () => {
        fireEvent.click(container.querySelector(`[data-testid="${c.switcher}"]`) as HTMLElement)
      })

      await waitFor(() => {
        expect(screen.getByTestId('arm-nav')).toBeInTheDocument()
      })

      for (const item of c.items) {
        await act(async () => {
          fireEvent.click(screen.getByTestId(`arm-nav-${item.id}`))
        })

        await waitFor(() => {
          expect(screen.getByTestId(`arm-nav-${item.id}`)).toHaveAttribute('data-active', 'true')
        })
        await waitFor(() => {
          expect(screen.getByTestId(item.screen)).toBeInTheDocument()
        })
      }
    }

    // Пунктов «недоступно» в интерфейсе больше нет — ни в одном АРМ.
    expect(container.querySelectorAll('[data-status="unavailable"]').length).toBe(0)
    expect(screen.queryByTestId('arm-nav-unavailable-reason')).toBeNull()
  })

  it('раздел живёт в адресе: ссылка открывает тот же экран', async () => {
    window.history.replaceState({}, '', '/clinic-scheduler/admin?section=matrix')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('matrix-screen')).toBeInTheDocument()
    })
    expect(screen.getByTestId('arm-nav-matrix')).toHaveAttribute('data-active', 'true')
  })

  it('неизвестный раздел в адресе открывает первый раздел, а не пустой экран', async () => {
    window.history.replaceState({}, '', '/clinic-scheduler/admin?section=нет-такого')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('arm-nav-templates')).toHaveAttribute('data-active', 'true')
    })
  })

  it('на АРМ с дневными данными есть переключатель даты без ограничения назад', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    window.history.replaceState({}, '', '/clinic-scheduler/operator?date=2026-08-10')
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('app-shell-date-switcher')).toBeInTheDocument()
    })

    expect(screen.getByTestId('app-shell-date')).toHaveTextContent('10 августа')

    await act(async () => {
      fireEvent.click(screen.getByTestId('date-prev'))
    })

    await waitFor(() => {
      expect(window.location.search).toContain('date=2026-08-09')
    })

    await act(async () => {
      fireEvent.click(screen.getByTestId('date-today'))
    })

    await waitFor(() => {
      expect(window.location.search).toContain('date=2026-08-10')
    })

    vi.useRealTimers()
  })
})
