import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'

import App from './app'

const isAppointmentsList = (url: string) => url.includes('/appointments') && !/\/appointments\//.test(url.split('?')[0])

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

const mockFetchOk = () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch')
  fetchMock.mockImplementation((input) => {
    const url = typeof input === 'string' ? input : (input as Request).url
    const date = (url.match(/[?&]date=([^&]+)/) || [null, '2026-08-10'])[1]
    if (/\/appointments\/[^/?]+\/history/.test(url)) {
      return Promise.resolve(new Response(JSON.stringify({ items: [] }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.includes('/schedule/')) {
      return Promise.resolve(new Response(JSON.stringify({
        date,
        startTime: '08:00',
        endTime: '09:00',
        stepMinutes: 15,
        slots: [],
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    }
    if (isAppointmentsList(url)) {
      return Promise.resolve(new Response(JSON.stringify({ items: [], date }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.endsWith('/doctors')) {
      return Promise.resolve(new Response('{"items":[]}', {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    if (url.endsWith('/services')) {
      return Promise.resolve(new Response('{"items":[]}', {
        status: 200, headers: { 'Content-Type': 'application/json' },
      }))
    }
    return Promise.resolve(new Response('{}', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
  })
  return fetchMock
}

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/clinic-scheduler')
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
    mockFetchOk()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('рендерит оболочку со стартовым экраном и переключателем без падения', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByTestId('main-page')).toBeInTheDocument()
    })

    expect(screen.getByTestId('app-shell-brand')).toHaveTextContent('СМ-Клиника')
    expect(screen.getByTestId('switcher-operator')).toBeInTheDocument()
    expect(screen.getByTestId('switcher-doctor')).toBeInTheDocument()
    expect(screen.getByTestId('switcher-registrar')).toBeInTheDocument()
    expect(screen.getByTestId('switcher-admin')).toBeInTheDocument()

    await act(async () => {
      fireEvent.click(screen.getByTestId('switcher-operator'))
    })
    await waitFor(() => {
      expect(screen.getByTestId('arm-nav')).toBeInTheDocument()
    })
    // Каждый пункт навигации ведёт на рабочий экран: «недоступных» пунктов нет.
    expect(screen.getByTestId('arm-nav-grid')).toHaveAttribute('data-active', 'true')
    expect(screen.getByTestId('arm-nav-waitlist')).toHaveAttribute('data-active', 'false')
    expect(screen.queryByTestId('arm-nav-cart')).toBeNull()
  })
})
