// Карта пациента: лента визитов не разъезжается на весь экран и начинается с
// последнего визита.

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../__data__/api', () => ({
  getPatientAppointments: vi.fn(),
}))

import { getPatientAppointments } from '../../__data__/api'
import { Provider } from '../../theme'
import type { Appointment, Patient } from '../../__data__/types'

import { PatientCardView } from './patient-card-view'

const mockedGetPatientAppointments = vi.mocked(getPatientAppointments)

const PATIENT: Patient = {
  id: 'p-001',
  name: 'Алексеев Игорь Николаевич',
  phone: '+7 916 482-31-07',
  birthDate: '1985-03-12',
  cardNumber: '0041-2187',
}

const visit = (n: number): Appointment => ({
  id: `a-${String(n).padStart(3, '0')}`,
  doctorId: 'd-001',
  patientId: 'p-001',
  start: `2026-0${1 + (n % 8)}-1${n % 9}T09:00:00+03:00`,
  durationMin: 30,
  status: 'completed',
  paymentType: 'regular',
  serviceId: 's-001',
  doctorName: 'Иванова Елена Сергеевна',
  patientName: PATIENT.name,
  patientPhone: PATIENT.phone,
  patientBirthDate: PATIENT.birthDate,
  patientUid: PATIENT.cardNumber,
  complaints: null,
  diagnosis: null,
  visitType: null,
  performedServiceIds: [],
  recommendations: [],
  nextVisit: null,
})

/** Двенадцать визитов, отсортированных по возрастанию, — как их отдаёт сервер. */
const TWELVE: Appointment[] = Array.from({ length: 12 }, (_, i) => visit(i + 1))
  .sort((a, b) => a.start.localeCompare(b.start))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('PatientCardView — лента визитов', () => {
  it('показывает последние пять визитов и говорит, сколько их всего', async () => {
    mockedGetPatientAppointments.mockResolvedValue({ items: TWELVE, date: '2026-08-10' })

    render(
      <Provider>
        <PatientCardView patient={PATIENT} onBack={vi.fn()} onCreateNew={vi.fn()} />
      </Provider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('patient-appointments-limit')).toHaveTextContent('Показаны последние 5 из 12')
    })

    const list = screen.getByTestId('patient-appointments-list')
    expect(list.querySelectorAll('[data-testid^="patient-appointment-"]')).toHaveLength(5)

    const newest = TWELVE[TWELVE.length - 1]
    const oldest = TWELVE[0]
    expect(screen.getByTestId(`patient-appointment-${newest.id}`)).toBeInTheDocument()
    expect(screen.queryByTestId(`patient-appointment-${oldest.id}`)).toBeNull()
  })

  it('короткая история выводится целиком и без подписи об ограничении', async () => {
    mockedGetPatientAppointments.mockResolvedValue({ items: TWELVE.slice(0, 3), date: '2026-08-10' })

    render(
      <Provider>
        <PatientCardView patient={PATIENT} onBack={vi.fn()} onCreateNew={vi.fn()} />
      </Provider>,
    )

    await waitFor(() => {
      const list = screen.getByTestId('patient-appointments-list')
      expect(list.querySelectorAll('[data-testid^="patient-appointment-"]')).toHaveLength(3)
    })
    expect(screen.queryByTestId('patient-appointments-limit')).toBeNull()
  })
})
