/**
 * Русские подписи АРМ врача.
 *
 * Словарь локальный, а не в `src/__data__/`: сервер отдаёт роль автора перехода
 * машинным ключом («doctor», «registrar»), и на экран такой ключ выпускать нельзя —
 * равно как и ISO-дату из `nextVisit.date`.
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

const HISTORY_ACTOR_LABELS: Readonly<Record<string, string>> = {
  operator: 'оператор',
  doctor: 'врач',
  registrar: 'регистратор',
  admin: 'администратор',
  system: 'система',
  patient: 'пациент',
}

/**
 * Автор перехода в журнале статусов. В `actor` сервер кладёт и роль, и иногда
 * имя сотрудника из «кто отменил», поэтому готовую русскую подпись пропускаем как есть,
 * а незнакомую латиницу не показываем вовсе.
 */
export const historyActorLabel = (actor: string | null | undefined): string => {
  const raw = (actor ?? '').trim()
  const known = HISTORY_ACTOR_LABELS[raw.toLowerCase()]
  if (known) return known
  if (raw.length > 0 && /[а-яё]/i.test(raw) && !/[a-z]/i.test(raw)) return raw
  return 'система'
}
