// Клик по закрытому времени не роняет экран и объясняет причину.
//
// ЗАЧЕМ. Ячейка «Блокировка» занята (`busy: true`), но записи за ней нет.
// Карточка читала `appointment.confirmed` без проверки — и падала с
// «Cannot read properties of undefined (reading 'confirmed')», унося весь АРМ
// оператора в белый экран. Один клик по серой ячейке заканчивал работу смены.
//
// Проверяется и то, и другое: экран не падает И оператор понимает, почему
// записать сюда нельзя. Пустая карточка с мёртвыми кнопками — не решение.

import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getConfigValue } from '@brojs/cli'

import { Provider } from '../../theme'
import { SlotCard } from './slot-card'
import type { Doctor, Schedule, SlotResource } from '../../__data__/types'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
  getNavigation: vi.fn(() => ({})),
  getNavigationValue: vi.fn((key: string) => (key === 'clinic-scheduler.main' ? '/clinic-scheduler' : '')),
}))
const mockedGetConfigValue = vi.mocked(getConfigValue)

const DATE = '2026-08-12'
const doctor: Doctor = { id: 'd-004', name: 'Кузнецов Дмитрий Олегович', specialty: 'Невролог', cabinet: '412' }

const closedResource = (kind: 'blocked' | 'tech_break', label: string): SlotResource => ({
  id: doctor.id,
  name: doctor.name,
  busy: true,
  occupancyKind: kind,
  occupancyLabel: label,
})

const schedule: Schedule = {
  date: DATE,
  startTime: '10:00',
  endTime: '10:30',
  stepMinutes: 15,
  holiday: null,
  slots: [
    { time: '10:00', doctors: [closedResource('blocked', 'Блокировка')] },
    { time: '10:15', doctors: [closedResource('blocked', 'Блокировка')] },
  ],
}

const renderCard = (resource: SlotResource) => render(
  <Provider>
    <SlotCard
      scheduleDate={DATE}
      time="10:00"
      doctor={doctor}
      doctorResource={resource}
      services={[]}
      patients={[]}
      schedule={schedule}
    />
  </Provider>,
)

describe('SlotCard — закрытое время без записи', () => {
  beforeEach(() => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ items: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('блокировка: карточка открывается и не падает', () => {
    renderCard(closedResource('blocked', 'Блокировка'))
    const card = screen.getByTestId('slot-card')
    expect(within(card).getByTestId('card-closed-reason')).toHaveTextContent('Время закрыто администратором')
    expect(card).toHaveTextContent('Блокировка')
  })

  it('перерыв объясняется своими словами, а не общей фразой', () => {
    renderCard(closedResource('tech_break', 'Перерыв'))
    expect(screen.getByTestId('card-closed-reason')).toHaveTextContent('Перерыв в приёме')
  })

  it('у закрытого времени нет ни записи, ни действий над записью', () => {
    renderCard(closedResource('blocked', 'Блокировка'))
    const card = screen.getByTestId('slot-card')
    // Кнопка «Записать» не должна предлагаться: сервер такую запись отклонит.
    expect(within(card).queryByTestId('card-book')).toBeNull()
    expect(within(card).queryByTestId('card-confirm')).toBeNull()
    expect(within(card).queryByTestId('card-cancel')).toBeNull()
    expect(within(card).queryByTestId('card-reschedule')).toBeNull()
  })

  it('свободный слот по-прежнему предлагает запись', () => {
    renderCard({ id: doctor.id, name: doctor.name, busy: false, occupancyKind: null, occupancyLabel: null })
    expect(screen.queryByTestId('card-closed-reason')).toBeNull()
    expect(screen.getByTestId('card-book')).toBeInTheDocument()
  })

  it('клик по закрытой ячейке в сетке не оставляет экран пустым', () => {
    // Регресс ровно на тот случай, что видел владелец: после клика карточка
    // есть, а не белая страница.
    renderCard(closedResource('blocked', 'Блокировка'))
    const card = screen.getByTestId('slot-card')
    fireEvent.click(card)
    expect(screen.getByTestId('slot-card')).toBeInTheDocument()
    expect(card.textContent?.trim().length ?? 0).toBeGreaterThan(0)
  })
})
