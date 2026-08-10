import { describe, expect, it } from 'vitest'

import { APPOINTMENT_STATUS_LABELS, appointmentStatusLabel } from './status-labels'
import type { AppointmentStatus } from './types'

const ALL_STATUSES: AppointmentStatus[] = [
  'scheduled',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]

describe('APPOINTMENT_STATUS_LABELS', () => {
  it('покрывает каждый статус отдельной русской подписью без совпадения с enum', () => {
    for (const status of ALL_STATUSES) {
      const label = APPOINTMENT_STATUS_LABELS[status]
      expect(label).toBeTruthy()
      expect(label).not.toBe(status)
      expect(appointmentStatusLabel(status)).toBe(label)
    }
  })

  it('не содержит ключей вне AppointmentStatus (исчерпывающий Record)', () => {
    expect(Object.keys(APPOINTMENT_STATUS_LABELS).sort()).toEqual([...ALL_STATUSES].sort())
  })
})
