import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Provider } from '../../theme'
import { ScheduleGrid } from './schedule-grid'
import type {
  Appointment,
  Doctor,
  Schedule,
} from '../../__data__/types'

const noop = () => {}

const doctors: Doctor[] = [
  { id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' },
  { id: 'd-002', name: 'Петров А.В.', specialty: 'Кардиолог', cabinet: '305' },
  { id: 'd-003', name: 'Сидоров К.М.', specialty: 'Хирург', cabinet: '410' },
]

const appointments: Appointment[] = [
  {
    id: 'a-001',
    doctorId: 'd-002',
    patientId: 'p-001',
    patientName: 'Алексеев Игорь Николаевич',
    start: '2026-08-08T08:00:00',
    end: '2026-08-08T08:15:00',
    serviceId: 's-001',
    status: 'scheduled',
  },
]

const schedule: Schedule = {
  date: '2026-08-08',
  startTime: '08:00',
  endTime: '08:30',
  stepMinutes: 15,
  slots: [
    {
      time: '08:00',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: false },
        { id: 'd-002', name: 'Петров А.В.', busy: true, appointmentId: 'a-001' },
      ],
    },
    {
      time: '08:15',
      doctors: [
        { id: 'd-001', name: 'Иванова Е.С.', busy: true, appointmentId: 'a-001' },
        { id: 'd-002', name: 'Петров А.В.', busy: false },
        { id: 'd-003', name: 'Сидоров К.М.', busy: false },
      ],
    },
    {
      time: '08:30',
      doctors: [
        { id: 'd-002', name: 'Петров А.В.', busy: false },
      ],
    },
  ],
}

describe('ScheduleGrid — соответствие ячеек колонкам врачей', () => {
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        toJSON: () => ({}),
      } as DOMRect
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('A1: каждая строка содержит doctors.length + 1 ячейку (время + по врачу)', () => {
    render(
      <Provider>
        <ScheduleGrid
          schedule={schedule}
          doctors={doctors}
          appointments={appointments}
          selectedTime={null}
          selectedDoctorId={null}
          onSlotClick={noop}
        />
      </Provider>,
    )

    const row800 = screen.getByTestId('row-08:00')
    const cells = Array.from(row800.children) as HTMLElement[]
    expect(cells.length).toBe(doctors.length + 1)
  })

  it('A2: ячейка неработающего врача существует с data-working="false"', () => {
    render(
      <Provider>
        <ScheduleGrid
          schedule={schedule}
          doctors={doctors}
          appointments={appointments}
          selectedTime={null}
          selectedDoctorId={null}
          onSlotClick={noop}
        />
      </Provider>,
    )

    const offCell = screen.getByTestId('slot-d-003-08:00')
    expect(offCell).toBeInTheDocument()
    expect(offCell).toHaveAttribute('data-working', 'false')
    expect(offCell).toHaveAttribute('data-busy', 'false')
    expect(offCell.getAttribute('aria-label') ?? '').toContain('не работает')
  })

  it('A3: занятая ячейка стоит в колонке своего врача, не сдвигается влево', () => {
    render(
      <Provider>
        <ScheduleGrid
          schedule={schedule}
          doctors={doctors}
          appointments={appointments}
          selectedTime={null}
          selectedDoctorId={null}
          onSlotClick={noop}
        />
      </Provider>,
    )

    const row800 = screen.getByTestId('row-08:00')
    const cells = Array.from(row800.children) as HTMLElement[]

    const slotCells = cells.filter((c) =>
      (c.getAttribute('data-testid') ?? '').startsWith('slot-'),
    )
    expect(slotCells.length).toBe(doctors.length)

    const d002Cell = screen.getByTestId('slot-d-002-08:00')
    const position = slotCells.indexOf(d002Cell)
    expect(position).toBe(1)
  })

  it('A4: grid использует CSS Grid с фиксированным doctors.length + 1 колонок', () => {
    render(
      <Provider>
        <ScheduleGrid
          schedule={schedule}
          doctors={doctors}
          appointments={appointments}
          selectedTime={null}
          selectedDoctorId={null}
          onSlotClick={noop}
        />
      </Provider>,
    )

    const grid = screen.getByTestId('schedule-grid').firstElementChild as HTMLElement
    const style = grid.getAttribute('style') ?? ''
    expect(style).toContain('grid-template-columns')
    const expected = `repeat(${doctors.length},`
    expect(style).toContain(expected)
  })

  it('A5: неполный слот — строка 08:30 содержит ровно одну активную ячейку и две off-ячейки', () => {
    render(
      <Provider>
        <ScheduleGrid
          schedule={schedule}
          doctors={doctors}
          appointments={appointments}
          selectedTime={null}
          selectedDoctorId={null}
          onSlotClick={noop}
        />
      </Provider>,
    )

    const row830 = screen.getByTestId('row-08:30')
    const cells = Array.from(row830.children) as HTMLElement[]
    expect(cells.length).toBe(doctors.length + 1)

    expect(screen.getByTestId('slot-d-002-08:30')).toHaveAttribute('data-busy', 'false')
    expect(screen.getByTestId('slot-d-001-08:30')).toHaveAttribute('data-working', 'false')
    expect(screen.getByTestId('slot-d-003-08:30')).toHaveAttribute('data-working', 'false')
  })
})
