import type { AppointmentStatus } from './types'

/**
 * Единый словарь подписей статусов записи для всего UI.
 * Исчерпывающий Record без default: новый статус без подписи ломает типизацию.
 */
export const APPOINTMENT_STATUS_LABELS: { [K in AppointmentStatus]: string } = {
  scheduled: 'Ожидает',
  arrived: 'Пришёл',
  in_progress: 'На приёме',
  completed: 'Завершён',
  cancelled: 'Отменён',
  no_show: 'Не пришёл',
}

export const appointmentStatusLabel = (status: AppointmentStatus): string =>
  APPOINTMENT_STATUS_LABELS[status]

/**
 * Роль автора перехода. В журнале изменений записи стояли литералы сервера —
 * «Ожидает → Пришёл, doctor». Латиница в интерфейсе на русском читается как
 * недоделка, а CLAUDE.md прямо требует русского языка на экране.
 */
const ACTOR_LABELS: Readonly<Record<string, string>> = {
  operator: 'оператор',
  doctor: 'врач',
  registrar: 'регистратор',
  admin: 'администратор',
  system: 'система',
  patient: 'пациент',
}

export const actorLabel = (actor: string | null | undefined): string => {
  const raw = (actor ?? '').trim()
  const known = ACTOR_LABELS[raw.toLowerCase()]
  if (known) return known
  // Сервер иногда кладёт в actor готовое имя сотрудника («Регистратура»):
  // русский текст пропускаем как есть, незнакомую латиницу — не показываем.
  if (raw.length > 0 && /[а-яё]/i.test(raw) && !/[a-z]/i.test(raw)) return raw
  return 'система'
}

/**
 * Событие журнала записи.
 *
 * Журнал показывал переход конечного автомата: «— → Ожидает, оператор»,
 * «Ожидает → Пришёл, регистратор». Читать это должен человек: прочерк вместо
 * события, стрелка, и каждая строка наполовину повторяет предыдущую — хвост
 * прошлого перехода и есть начало следующего. Здесь — то, ЧТО произошло.
 */
export const historyEventLabel = (
  from: AppointmentStatus | null | undefined,
  to: AppointmentStatus,
): string => {
  if (from == null) return 'Запись создана'
  switch (to) {
    case 'scheduled': return 'Возвращена в очередь'
    case 'arrived': return 'Отмечен приход'
    case 'in_progress': return 'Приём начат'
    case 'completed': return 'Приём завершён'
    case 'cancelled': return 'Запись отменена'
    case 'no_show': return 'Отмечена неявка'
  }
}

/**
 * Тон плашки статуса — один на весь продукт.
 *
 * «Не пришёл» был покрашен тремя способами: красный с белым текстом у
 * регистратора, красный с тёмным в списке врача и серый в шапке его же
 * карточки. Общий словарь отдавал только текст, а цвет каждый экран считал
 * своей функцией — и они разошлись. Здесь и текст, и тон.
 */
export interface StatusTone {
  bg: string
  fg: string
}

export const APPOINTMENT_STATUS_TONES: { [K in AppointmentStatus]: StatusTone } = {
  scheduled: { bg: 'surfaceLight', fg: 'textSecondary' },
  // Пришедший пациент ждёт действия — единственный оранжевый в наборе.
  arrived: { bg: 'brandOrange', fg: 'textOnOrange' },
  in_progress: { bg: 'brandGreenTint', fg: 'brandGreen700' },
  completed: { bg: 'brandGreenFaint', fg: 'brandGreen700' },
  cancelled: { bg: 'borderLight', fg: 'textSecondary' },
  no_show: { bg: 'danger', fg: 'white' },
}

export const appointmentStatusTone = (status: AppointmentStatus): StatusTone =>
  APPOINTMENT_STATUS_TONES[status]
