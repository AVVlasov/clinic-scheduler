/** Дата рабочего места: ГГГГ-ММ-ДД, без системных часов в тестах — передавать явно или пинить vi.setSystemTime. */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export const isIsoDate = (value: string): boolean => {
  if (!DATE_RE.test(value)) return false
  const t = new Date(`${value}T00:00:00`).getTime()
  return !Number.isNaN(t)
}

export const todayDate = (now: Date = new Date()): string => {
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export const shiftDate = (from: string, days: number): string => {
  const [y, m, d] = from.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  return todayDate(date)
}

/** Понедельник недели, содержащей дату (локаль-независимо, неделя Пн–Вс). */
export const weekStartOf = (isoDate: string): string => {
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7))
  return todayDate(date)
}

export const weekDates = (isoDate: string): string[] => {
  const start = weekStartOf(isoDate)
  return Array.from({ length: 7 }, (_, i) => shiftDate(start, i))
}

export const parseArmDate = (search: string, fallback: string = todayDate()): string => {
  const raw = new URLSearchParams(search).get('date')
  if (raw && isIsoDate(raw)) return raw
  return fallback
}

export const withArmDate = (pathname: string, date: string, doctorId?: string): string => {
  const url = new URL(pathname, 'http://local')
  url.searchParams.set('date', date)
  if (doctorId) url.searchParams.set('doctorId', doctorId)
  else url.searchParams.delete('doctorId')
  return `${url.pathname}?${url.searchParams.toString()}`
}

/**
 * Тот же адрес с другим разделом рабочего места. Раздел живёт в адресе, чтобы
 * ссылка открывала тот же экран и работала кнопка «назад».
 */
export const withArmSection = (search: string, section: string): string => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  params.set('section', section)
  return `?${params.toString()}`
}

export const parseArmDoctorId = (search: string): string | null => {
  const raw = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get('doctorId')
  return raw && raw.trim() ? raw : null
}

export const formatArmDateLabel = (isoDate: string): string => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return `${weekdays[date.getDay()]}, ${d} ${months[m - 1]}`
}

/** Короткая дата ДД.ММ — с ведущими нулями, как в остальных экранах («11.08», не «11.8»). */
export const formatShortDate = (isoDate: string): string => {
  const [, mm, dd] = isoDate.split('-')
  return `${dd}.${mm}`
}

/**
 * Момент события журнала: «14:20», а если событие не в день приёма — «08.08, 14:20».
 * Без времени журнал изменений не отвечает на единственный вопрос, ради которого
 * его открывают: когда это случилось.
 */
export const formatEventMoment = (at: string, onDate?: string): string => {
  const t = new Date(at)
  if (Number.isNaN(t.getTime())) return '—'
  const hhmm = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`
  const yyyy = t.getFullYear()
  const mm = String(t.getMonth() + 1).padStart(2, '0')
  const dd = String(t.getDate()).padStart(2, '0')
  const sameDay = onDate == null || onDate === `${yyyy}-${mm}-${dd}`
  return sameDay ? hhmm : `${dd}.${mm}, ${hhmm}`
}
