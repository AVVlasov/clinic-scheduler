/**
 * Навигация внутри АРМ. Один пункт — один рабочий экран, который открывается
 * по адресу `?section=<id>`.
 *
 * Пунктов «недоступно» здесь нет намеренно. Кнопка, которая на нажатие
 * отвечает объяснением, почему она не работает, для пользователя неотличима от
 * сломанной: он кликает и не понимает, почему ничего не происходит. Объём
 * работ ведётся в docs/PRD.md и docs/TRACEABILITY.md, а не в интерфейсе
 * клиники.
 */

export interface ArmNavItem {
  /** Значение `?section=` и якорь `data-arm-section` на экране. */
  id: string
  label: string
}

export type ArmSlug = 'operator' | 'doctor' | 'registrar' | 'admin'

/**
 * «Запись от услуги» отдельным разделом не живёт: это была та же сетка с тем же
 * набором действий, только с фильтром сверху — два пункта меню вели на один
 * экран. Подбор по услуге стал фильтром внутри «Расписания».
 */
export const OPERATOR_NAV: ArmNavItem[] = [
  { id: 'grid', label: 'Расписание' },
  { id: 'waitlist', label: 'Лист ожидания' },
  { id: 'mass-reschedule', label: 'Массовая отмена' },
]

export const REGISTRAR_NAV: ArmNavItem[] = [
  { id: 'queue', label: 'Приём смены' },
  { id: 'search', label: 'Картотека' },
  { id: 'new-patient', label: 'Новая карта' },
]

/** У врача один экран: список приёмов и протокол работают только вместе. */
export const DOCTOR_NAV: ArmNavItem[] = [
  { id: 'day', label: 'День приёма' },
]

export const ADMIN_NAV: ArmNavItem[] = [
  { id: 'templates', label: 'Шаблоны приёма' },
  { id: 'doctors', label: 'Справочник врачей' },
  { id: 'equipment', label: 'Оборудование и кабинеты' },
  { id: 'matrix', label: 'Матрица компетенций' },
  { id: 'duration-rules', label: 'Правила длительности' },
]

export const ARM_NAV: Record<ArmSlug, ArmNavItem[]> = {
  operator: OPERATOR_NAV,
  doctor: DOCTOR_NAV,
  registrar: REGISTRAR_NAV,
  admin: ADMIN_NAV,
}

/** Раздел по умолчанию — первый пункт навигации этого АРМ. */
export const defaultSection = (slug: ArmSlug): string => ARM_NAV[slug][0].id

/**
 * Раздел из адреса. Неизвестное значение (старая ссылка, опечатка) не роняет
 * экран и не оставляет пустоту: открывается раздел по умолчанию.
 */
export const resolveSection = (slug: ArmSlug, raw: string | null | undefined): string => {
  const known = ARM_NAV[slug].some((item) => item.id === raw)
  return known && raw ? raw : defaultSection(slug)
}
