import type { AppointmentStatus } from './types'

export const TERMINAL_STATUSES: ReadonlySet<AppointmentStatus> = new Set<AppointmentStatus>([
  'completed',
  'cancelled',
  'no_show',
])

export const STATUS_TRANSITIONS: Readonly<Record<AppointmentStatus, ReadonlySet<AppointmentStatus>>> = {
  scheduled: new Set<AppointmentStatus>(['arrived', 'in_progress', 'cancelled', 'no_show']),
  arrived: new Set<AppointmentStatus>(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']),
  in_progress: new Set<AppointmentStatus>(['completed', 'cancelled', 'no_show']),
  completed: new Set<AppointmentStatus>(),
  cancelled: new Set<AppointmentStatus>(),
  no_show: new Set<AppointmentStatus>(),
}

export const isTerminalStatus = (status: AppointmentStatus): boolean =>
  TERMINAL_STATUSES.has(status)

export const isStatusTransitionAllowed = (
  from: AppointmentStatus,
  to: AppointmentStatus,
): boolean => STATUS_TRANSITIONS[from]?.has(to) ?? false

export const isRegistrarTerminal = (status: AppointmentStatus): boolean =>
  isTerminalStatus(status) || status === 'in_progress'