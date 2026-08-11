import React from 'react'
import { getConfigValue } from '@brojs/cli'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { Provider } from '../../theme'
import { OperatorPage } from './operator-page'
import type { ServiceList } from '../../__data__/types'

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
const date = '2026-08-10'

const servicesPayload: ServiceList = {
  items: [
    {
      id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500,
      doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006'],
    },
    {
      id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200,
      doctorIds: ['d-002', 'd-004'],
    },
  ],
}

const doctorsPayload = {
  items: [
    { id: 'd-001', name: 'Иванова', specialty: 'Терапевт', cabinet: '201' },
    { id: 'd-002', name: 'Петров', specialty: 'Кардиолог', cabinet: '305' },
    { id: 'd-003', name: 'Сидорова', specialty: 'Педиатр', cabinet: '104' },
    { id: 'd-004', name: 'Кузнецов', specialty: 'Невролог', cabinet: '412' },
    { id: 'd-005', name: 'Морозова', specialty: 'Эндокринолог', cabinet: '207' },
    { id: 'd-006', name: 'Волков', specialty: '', cabinet: '001' },
  ],
}

const schedulePayload = {
  date,
  startTime: '08:00',
  endTime: '09:00',
  stepMinutes: 15,
  slots: [
    {
      time: '08:00',
      doctors: doctorsPayload.items.map((d) => ({ id: d.id, name: d.name, busy: false })),
    },
  ],
}

describe('OperatorPage — фильтр сетки по услуге', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-10T12:00:00'))
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
    vi.spyOn(globalThis, 'fetch').mockImplementation((input) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      if (url.includes('/schedule/')) {
        return Promise.resolve(new Response(JSON.stringify(schedulePayload), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
      }
      if (url.includes('/appointments')) {
        return Promise.resolve(new Response(JSON.stringify({ date, items: [] }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
      }
      if (url.endsWith('/doctors')) {
        return Promise.resolve(new Response(JSON.stringify(doctorsPayload), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
      }
      if (url.endsWith('/services')) {
        return Promise.resolve(new Response(JSON.stringify(servicesPayload), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))
      }
      if (url.includes('/waitlist')) {

        return Promise.resolve(new Response(JSON.stringify({ items: [], openCount: 0 }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }))

      }

      if (url.endsWith('/patients')) {
        return Promise.resolve(new Response(JSON.stringify({
          items: [{ id: 'p-001', name: 'Алексеев', phone: '+7', birthDate: '1980-01-01' }],
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      }
      return Promise.resolve(new Response('{}', { status: 200 }))
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('услуга двум врачам оставляет в сетке две колонки; поиск по категории работает', async () => {
    render(
      <MemoryRouter initialEntries={[`/clinic-scheduler/operator?date=${date}`]}>
        <Provider>
          <OperatorPage />
        </Provider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByTestId('service-picker-toggle'))
    const picker = await screen.findByTestId('service-picker')
    fireEvent.change(within(picker).getByTestId('service-picker-search'), {
      target: { value: 'Диагностика' },
    })
    expect(within(picker).getByTestId('service-option-s-003')).toBeInTheDocument()
    expect(within(picker).queryByTestId('service-option-s-001')).not.toBeInTheDocument()

    await act(async () => {
      fireEvent.click(within(picker).getByTestId('service-option-s-003'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('schedule-grid')).toHaveAttribute('data-doctor-count', '2')
    })
    expect(screen.getByTestId('service-picker-active')).toHaveTextContent('ЭКГ')
  })
})
