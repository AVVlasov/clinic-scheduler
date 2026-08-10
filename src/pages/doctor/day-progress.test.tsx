import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Provider } from '../../theme'
import { DayList } from './day-list'
import type { Appointment, AppointmentStatus } from '../../__data__/types'

/**
 * TASK-38 п.5: «N из M завершено» сходится — знаменатель это записи врача за день без
 * отменённых и неявок, и после завершения последнего приёма счётчик показывает «M из M».
 *
 * Правило было записано в код, но не проверялось ничем: при знаменателе по всей клинике или
 * с неявками внутри «8 из 8» недостижимо, а врач весь день видит счётчик, который не сходится.
 */

vi.mock('@brojs/cli', () => ({
  getConfigValue: () => '/api',
  getNavigation: () => ({}),
  getNavigationValue: () => '/clinic-scheduler',
}))

let seq = 0
const appt = (status: AppointmentStatus, time = '09:00'): Appointment => {
  seq += 1
  return {
    id: `a-${String(seq).padStart(3, '0')}`,
    doctorId: 'd-001',
    patientId: 'p-001',
    start: `2026-08-10T${time}:00+03:00`,
    durationMin: 30,
    status,
    paymentType: 'regular',
    serviceId: 's-001',
    doctorName: 'Иванова Е.С.',
    patientName: 'Алексеев Игорь Николаевич',
  }
}

const renderDay = (appointments: Appointment[]) =>
  render(
    <Provider>
      <DayList appointments={appointments} selectedId={null} onSelect={() => {}} />
    </Provider>,
  )

const progress = () => screen.getByTestId('doctor-progress').textContent?.trim()

describe('счётчик дня врача «N из M завершено»', () => {
  it('отменённые и неявки не попадают в знаменатель', () => {
    renderDay([
      appt('completed', '09:00'),
      appt('scheduled', '09:30'),
      appt('cancelled', '10:00'),
      appt('no_show', '10:30'),
    ])
    // считаются только две записи: completed и scheduled
    expect(progress()).toBe('1 из 2 завершено')
  })

  it('после завершения последнего приёма счётчик показывает «M из M»', () => {
    const view = renderDay([
      appt('completed', '09:00'),
      appt('in_progress', '09:30'),
      appt('no_show', '10:00'),
    ])
    expect(progress()).toBe('1 из 2 завершено')

    view.unmount()
    renderDay([
      appt('completed', '09:00'),
      appt('completed', '09:30'),
      appt('no_show', '10:00'),
    ])
    expect(progress()).toBe('2 из 2 завершено')
  })

  it('день целиком из отменённых и неявок даёт «0 из 0», а не деление по всей клинике', () => {
    renderDay([appt('cancelled', '09:00'), appt('no_show', '09:30')])
    expect(progress()).toBe('0 из 0 завершено')
  })

  it('пустой день не падает', () => {
    renderDay([])
    expect(progress()).toBe('0 из 0 завершено')
  })
})
