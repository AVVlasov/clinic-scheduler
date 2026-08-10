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
