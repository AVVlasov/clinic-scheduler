import type { PaymentType, Service, VisitType } from './types'

export const PAYMENT_TYPE_OPTIONS: ReadonlyArray<{ id: PaymentType; label: string }> = [
  { id: 'regular', label: 'Обычный (платный)' },
  { id: 'dms', label: 'ДМС' },
  { id: 'promo', label: 'Акция' },
  { id: 'discount', label: 'Скидка' },
  { id: 'certificate', label: 'Сертификат' },
]

export const paymentTypeLabel = (value: PaymentType | null | undefined): string =>
  PAYMENT_TYPE_OPTIONS.find((o) => o.id === value)?.label ?? (value ? String(value) : '—')

/**
 * Длительность записи: для категории «Приём» тип визита задаёт норматив
 * (первичный 60 / повторный 30); иначе берётся длительность услуги из справочника.
 */
export const resolveBookingDuration = (service: Service, visitType: VisitType): number => {
  if (service.category === 'Приём') {
    return visitType === 'first' ? 60 : 30
  }
  return service.duration
}

/** Услуга доступна врачу по матрице компетенций (doctorIds). */
export const serviceOfferedByDoctor = (service: Service, doctorId: string): boolean => {
  if (!Array.isArray(service.doctorIds) || service.doctorIds.length === 0) return true
  return service.doctorIds.includes(doctorId)
}

export const filterServicesByQuery = (services: Service[], query: string): Service[] => {
  const q = query.trim().toLowerCase()
  if (!q) return services
  return services.filter(
    (s) => s.name.toLowerCase().includes(q) || s.category.toLowerCase().includes(q),
  )
}

export const addMinutesToTime = (time: string, minutes: number): string => {
  const [hh, mm] = time.split(':').map(Number)
  const total = hh * 60 + mm + minutes
  const h = Math.floor(total / 60) % 24
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const formatTimeRange = (startTime: string, durationMin: number): string =>
  `${startTime}–${addMinutesToTime(startTime, durationMin)}`
