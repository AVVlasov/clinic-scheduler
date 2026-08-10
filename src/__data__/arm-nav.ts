/** Навигация внутри АРМ: доступные разделы и явные «недоступно» с причиной. */

export type ArmNavStatus = 'available' | 'unavailable'

export interface ArmNavItem {
  id: string
  label: string
  status: ArmNavStatus
  /** Для available — якорь раздела на текущем экране; для unavailable — не ведёт никуда. */
  section?: string
  reason?: string
  task?: string
}

export const OPERATOR_NAV: ArmNavItem[] = [
  { id: 'shift', label: 'Смена', status: 'available', section: 'shift' },
  { id: 'grid', label: 'Сетка', status: 'available', section: 'grid' },
  {
    id: 'book-by-service',
    label: 'Запись от услуги',
    status: 'available',
    section: 'book-by-service',
  },
  {
    id: 'pick-doctor-slot',
    label: 'Подбор врача и слота',
    status: 'available',
    section: 'grid',
  },
  {
    id: 'waitlist',
    label: 'Лист ожидания',
    status: 'available',
    section: 'waitlist',
  },
  {
    id: 'mass-reschedule',
    label: 'Снос расписания',
    status: 'available',
    section: 'mass-reschedule',
  },
  {
    id: 'cart',
    label: 'Корзина',
    status: 'unavailable',
    reason: 'За границей MVP: множественная запись — вторая очередь (PRD)',
  },
]

export const REGISTRAR_NAV: ArmNavItem[] = [
  { id: 'queue', label: 'Приём смены', status: 'available', section: 'queue' },
  { id: 'visit', label: 'Карточка визита', status: 'available', section: 'visit' },
  { id: 'pay', label: 'Оплата', status: 'available', section: 'pay' },
  {
    id: 'new-patient',
    label: 'Новая карта пациента',
    status: 'available',
    section: 'new-patient',
  },
]

export const DOCTOR_NAV: ArmNavItem[] = [
  { id: 'day', label: 'День приёма', status: 'available', section: 'day' },
  { id: 'protocol', label: 'Протокол', status: 'available', section: 'protocol' },
  {
    id: 'my-schedule',
    label: 'Моё расписание',
    status: 'unavailable',
    reason: 'За границей MVP: отдельный экран врача не в MUST HAVE карты; день приёма закрывает смену',
  },
  {
    id: 'referral',
    label: 'Направление',
    status: 'unavailable',
    reason: 'За границей MVP: печатные формы кроме талона — вторая очередь / вне текущего контура',
  },
  {
    id: 'sick-leave',
    label: 'Больничный лист',
    status: 'unavailable',
    reason: 'За границей MVP: нет в MUST HAVE карты MVP для АРМ врача',
  },
]

export const ADMIN_NAV: ArmNavItem[] = [
  { id: 'templates', label: 'Шаблоны недели', status: 'available', section: 'templates' },
  { id: 'doctors', label: 'Справочник врачей', status: 'available', section: 'doctors' },
  {
    id: 'absence-block',
    label: 'Блокировка расписания',
    status: 'available',
    section: 'absence-block',
  },
  {
    id: 'equipment',
    label: 'Оборудование и кабинеты',
    status: 'unavailable',
    reason: 'В MVP (MUST HAVE), задача на экран ещё не заведена — пробел в плане',
  },
  {
    id: 'matrix',
    label: 'Матрица компетенций',
    status: 'unavailable',
    reason: 'В MVP (MUST HAVE), задача на экран ещё не заведена — пробел в плане',
  },
  {
    id: 'duration-rules',
    label: 'Правила длительности',
    status: 'unavailable',
    reason: 'В MVP (MUST HAVE), задача на экран ещё не заведена — пробел в плане',
  },
  {
    id: 'specialty-template',
    label: 'Шаблон по специальности',
    status: 'unavailable',
    reason: 'За границей MVP: нет отдельной строки MUST HAVE; покрывается шаблоном недели',
  },
  {
    id: 'notifications',
    label: 'Уведомления и каскад',
    status: 'unavailable',
    reason: 'За границей MVP: транспорт уведомлений — отдельный проект (FAQ); в объёме только отметка подтверждения в карточке',
  },
]

export const ARM_NAV: Record<'operator' | 'doctor' | 'registrar' | 'admin', ArmNavItem[]> = {
  operator: OPERATOR_NAV,
  doctor: DOCTOR_NAV,
  registrar: REGISTRAR_NAV,
  admin: ADMIN_NAV,
}
