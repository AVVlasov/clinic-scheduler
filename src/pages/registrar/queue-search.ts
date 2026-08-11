import type { Appointment } from '../../__data__/types'

const digitsOf = (value: string | null | undefined): string => String(value ?? '').replace(/\D/g, '')

const normalize = (value: string | null | undefined): string =>
  String(value ?? '').toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()

/**
 * Поиск по очереди: фамилия, телефон или номер карты — ровно то, чем человек у
 * стойки себя называет. Цифры сравниваются с цифрами: телефон записан как
 * «+7 900 100-00-01», а называют его без разделителей.
 */
export const matchesQueueQuery = (visit: Appointment, query: string): boolean => {
  const q = normalize(query)
  if (!q) return true

  const queryDigits = digitsOf(query)
  if (queryDigits.length >= 3) {
    if (digitsOf(visit.patientPhone).includes(queryDigits)) return true
    if (digitsOf(visit.patientUid).includes(queryDigits)) return true
  }

  return [visit.patientName, visit.patientPhone, visit.patientUid]
    .some((field) => normalize(field).includes(q))
}
