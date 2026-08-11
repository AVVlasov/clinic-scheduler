import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

import { Provider } from '../../theme'
import { DayList } from './day-list'
import type { Appointment, AppointmentStatus, Service } from '../../__data__/types'

/**
 * TASK-38 п.5: «N из M завершено» сходится — знаменатель это записи врача за день без
 * отменённых и неявок, и после завершения последнего приёма счётчик показывает «M из M».
 *
 * Правило было записано в код, но не проверялось ничем: при знаменателе по всей клинике или
 * с неявками внутри «8 из 8» недостижимо, а врач весь день видит счётчик, который не сходится.
 *
 * TASK-63 п.1 и п.5: строка дня называет услугу (а не одну и ту же дату у всех записей),
 * а расхождение счётчика со списком подписано словами, а не оставлено на догадку.
 */

vi.mock('@brojs/cli', () => ({
  getConfigValue: () => '/api',
  getNavigation: () => ({}),
  getNavigationValue: () => '/clinic-scheduler',
}))

const services: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500, doctorIds: ['d-001'] },
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика', price: 2800, doctorIds: ['d-002'] },
]

let seq = 0
const appt = (
  status: AppointmentStatus,
  time = '09:00',
  serviceId: string | null = 's-001',
): Appointment => {
  seq += 1
  return {
    id: `a-${String(seq).padStart(3, '0')}`,
    doctorId: 'd-001',
    patientId: 'p-001',
    start: `2026-08-10T${time}:00+03:00`,
    durationMin: 30,
    status,
    paymentType: 'regular',
    serviceId,
    doctorName: 'Иванова Е.С.',
    patientName: 'Алексеев Игорь Николаевич',
    patientPhone: null,
    patientBirthDate: null,
    patientUid: null,
    complaints: null,
    diagnosis: null,
    visitType: null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
  }
}

const renderDay = (appointments: Appointment[]) =>
  render(
    <Provider>
      <DayList appointments={appointments} services={services} selectedId={null} onSelect={() => {}} />
    </Provider>,
  )

const progress = () => screen.getByTestId('doctor-progress').textContent?.trim()

describe('счётчик дня врача «N из M завершено»', () => {
  it('отменённые и неявки не попадают в знаменатель, и разница названа словами', () => {
    renderDay([
      appt('completed', '09:00'),
      appt('scheduled', '09:30'),
      appt('cancelled', '10:00'),
      appt('no_show', '10:30'),
    ])
    // считаются только две записи: completed и scheduled, но строк на экране четыре
    expect(progress()).toBe('1 из 2 завершено · не состоялись: 2')
  })

  it('день из трёх записей, одна из которых неявка: знаменатель объяснён, 2 + 1 = 3 строки', () => {
    renderDay([
      appt('completed', '09:00'),
      appt('in_progress', '09:30'),
      appt('no_show', '10:00'),
    ])
    expect(progress()).toBe('1 из 2 завершено · не состоялись: 1')
    expect(screen.getAllByTestId(/^day-visit-a-/).length).toBe(3)
  })

  it('день без отменённых и неявок обходится без приписки', () => {
    renderDay([appt('completed', '09:00'), appt('completed', '09:30')])
    expect(progress()).toBe('2 из 2 завершено')
  })

  it('день целиком из отменённых и неявок даёт «0 из 0», а не деление по всей клинике', () => {
    renderDay([appt('cancelled', '09:00'), appt('no_show', '09:30')])
    expect(progress()).toBe('0 из 0 завершено · не состоялись: 2')
  })

  it('пустой день не падает', () => {
    renderDay([])
    expect(progress()).toBe('0 из 0 завершено')
  })
})

describe('строка дня врача называет услугу', () => {
  it('две записи с разными услугами различаются, а не повторяют одну и ту же дату', () => {
    const first = appt('scheduled', '09:00', 's-001')
    const second = appt('scheduled', '09:30', 's-004')
    renderDay([first, second])

    const firstLine = screen.getByTestId(`day-visit-service-${first.id}`).textContent ?? ''
    const secondLine = screen.getByTestId(`day-visit-service-${second.id}`).textContent ?? ''

    expect(firstLine).toContain('Первичная консультация')
    expect(secondLine).toContain('УЗИ брюшной полости')
    expect(firstLine).not.toBe(secondLine)
    // дата у всех записей дня одна — в строке ей делать нечего
    expect(firstLine).not.toContain('августа')
    expect(secondLine).not.toContain('августа')
  })

  it('запись без услуги подписана по-русски, а не идентификатором', () => {
    const nameless = appt('scheduled', '11:00', null)
    renderDay([nameless])
    const line = screen.getByTestId(`day-visit-service-${nameless.id}`).textContent ?? ''
    expect(line).toContain('Услуга не указана')
    expect(line).not.toMatch(/[A-Za-z]/)
  })
})
