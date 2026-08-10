import { describe, expect, it } from 'vitest'

import {
  filterServicesByQuery,
  PAYMENT_TYPE_OPTIONS,
  resolveBookingDuration,
  serviceOfferedByDoctor,
} from './booking'
import type { Service } from './types'

describe('booking helpers', () => {
  it('перечень оснований оплаты — из документа заказчика (5 значений)', () => {
    expect(PAYMENT_TYPE_OPTIONS.map((o) => o.id)).toEqual([
      'regular', 'dms', 'promo', 'discount', 'certificate',
    ])
  })

  it('услуга диагностики 15 мин даёт durationMin 15 независимо от типа приёма', () => {
    const ecg: Service = {
      id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200,
      doctorIds: ['d-002', 'd-004'],
    }
    expect(resolveBookingDuration(ecg, 'first')).toBe(15)
    expect(resolveBookingDuration(ecg, 'repeat')).toBe(15)
  })

  it('приём: первичный 60 / повторный 30', () => {
    const svc: Service = {
      id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500,
      doctorIds: ['d-001'],
    }
    expect(resolveBookingDuration(svc, 'first')).toBe(60)
    expect(resolveBookingDuration(svc, 'repeat')).toBe(30)
  })

  it('serviceOfferedByDoctor и filterServicesByQuery', () => {
    const ecg: Service = {
      id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200,
      doctorIds: ['d-002', 'd-004'],
    }
    expect(serviceOfferedByDoctor(ecg, 'd-002')).toBe(true)
    expect(serviceOfferedByDoctor(ecg, 'd-001')).toBe(false)
    expect(filterServicesByQuery([ecg], 'экг')).toHaveLength(1)
    expect(filterServicesByQuery([ecg], 'диагн')).toHaveLength(1)
    expect(filterServicesByQuery([ecg], 'неттакого')).toHaveLength(0)
  })
})
