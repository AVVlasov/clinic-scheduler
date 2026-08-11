/**
 * Русские подписи АРМ врача.
 *
 * Здесь только форматы дат этого АРМ. Роли автора переходов живут в общем
 * словаре `src/__data__/status-labels.ts`: своя копия расходится с чужой на
 * первой же правке.
 */

const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

/** «24 августа» из ГГГГ-ММ-ДД. */
export const formatDayMonth = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d || m < 1 || m > 12) return '—'
  return `${d} ${MONTHS_GENITIVE[m - 1]}`
}

/** «6 августа, 09:00–09:30» — день приёма и его интервал. */
export const formatVisitRange = (start: string, durationMin: number): string => {
  const from = new Date(start)
  if (Number.isNaN(from.getTime())) return '—'
  const to = new Date(from.getTime() + durationMin * 60000)
  const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${from.getDate()} ${MONTHS_GENITIVE[from.getMonth()]}, ${hhmm(from)}–${hhmm(to)}`
}
