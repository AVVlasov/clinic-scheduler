import type { AppointmentStatus } from './types'

export const TERMINAL_STATUSES: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>([
  'completed',
  'cancelled',
  'no_show',
])

/**
 * Неявка отменяема: пациент опоздал и всё-таки пришёл — это рабочий случай
 * стойки, а не порча закрытой записи. Остальные терминальные статусы остаются
 * без выхода: завершённый приём и отменённая запись переигрываются новой
 * записью, а не правкой старой.
 */
export const STATUS_TRANSITIONS: Readonly<Record<AppointmentStatus, ReadonlySet<AppointmentStatus>>> = {
  scheduled: new Set<AppointmentStatus>(['arrived', 'in_progress', 'cancelled', 'no_show']),
  arrived: new Set<AppointmentStatus>(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']),
  in_progress: new Set<AppointmentStatus>(['completed', 'cancelled', 'no_show']),
  completed: new Set<AppointmentStatus>(),
  cancelled: new Set<AppointmentStatus>(),
  no_show: new Set<AppointmentStatus>(['scheduled']),
}

export const isTerminalStatus = (status: AppointmentStatus): boolean =>
  TERMINAL_STATUSES.has(status)

export const isStatusTransitionAllowed = (
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean => STATUS_TRANSITIONS[from]?.has(to) ?? false

export const isRegistrarTerminal = (status: AppointmentStatus): boolean =>
  isTerminalStatus(status) || status === 'in_progress'

/** Ошибочную неявку регистратор возвращает в очередь одним действием. */
export const canReturnToQueue = (status: AppointmentStatus): boolean =>
  isStatusTransitionAllowed(status, 'scheduled') && status === 'no_show'

/**
 * Статусы, в которых стойка ещё может взять деньги. Порядок в клинике такой:
 * сначала приём, потом касса — поэтому `in_progress` и `completed` здесь
 * обязательны. Раньше оплата пряталась вместе с кнопками переходов, и за
 * завершённый визит взять деньги было нечем.
 */
export const PAYABLE_STATUSES: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>([
  'scheduled',
  'arrived',
  'in_progress',
  'completed',
])

export const canAcceptPayment = (visit: {
  status: AppointmentStatus
  paidAt?: string | null
}): boolean => PAYABLE_STATUSES.has(visit.status) && !visit.paidAt
