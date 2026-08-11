import { evaluateDuration, FALLBACK_DURATION_RULES } from './duration'
import type { DurationRule, PaymentType, Service, VisitType } from './types'

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
 * Длительность записи считают правила администратора (экран «Правила
 * длительности»), а не константа в коде оператора: выключенное правило обязано
 * менять длительность реальной записи, иначе экран администратора врёт.
 * Без справочника правил действует резервный норматив приёма.
 */
export const resolveBookingDuration = (
  service: Service,
  visitType: VisitType | null,
  options?: {
    rules?: DurationRule[]
    doctorId?: string | null
    patientAgeYears?: number | null
    requiresEquipment?: boolean
  },
): number => {
  const rules = options?.rules?.length ? options.rules : FALLBACK_DURATION_RULES
  return evaluateDuration(rules, {
    service,
    visitType,
    doctorId: options?.doctorId ?? null,
    patientAgeYears: options?.patientAgeYears ?? null,
    requiresEquipment: options?.requiresEquipment ?? false,
  }).totalMin
}

/** Услуга доступна врачу по матрице компетенций (doctorIds). */
export const serviceOfferedByDoctor = (service: Service, doctorId: string): boolean => {
  if (!Array.isArray(service.doctorIds) || service.doctorIds.length === 0) return true
  return service.doctorIds.includes(doctorId)
}

/** Допуск врача к услуге выдан «с ограничением» — оператор обязан это увидеть. */
export const serviceLimitedForDoctor = (service: Service, doctorId: string): boolean =>
  Array.isArray(service.limitedDoctorIds) && service.limitedDoctorIds.includes(doctorId)

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

/**
 * Тип приёма по умолчанию — из услуги, а не константой.
 *
 * Карточка записи подставляла `'repeat'` для любой услуги, и «Первичная
 * консультация» считалась как повторная: экран администратора обещал 60 минут,
 * оператор видел 30. Название услуги — то же основание, по которому тип приёма
 * выбирает человек; для диагностики и лаборатории тип не применяется вовсе.
 */
export const defaultVisitTypeForService = (service: Service | null | undefined): VisitType | null => {
  if (!service) return null
  if (service.category !== 'Приём') return null
  if (/первичн/i.test(service.name)) return 'first'
  if (/повторн|результат/i.test(service.name)) return 'repeat'
  return 'first'
}
