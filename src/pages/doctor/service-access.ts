import type { Service } from '../../__data__/types'

/**
 * Допуск врача к услуге — матрица компетенций (ФТ 1.5).
 *
 * Пустой список допущенных читается как «услугу оказывают все»: ровно так его
 * трактует сервер при создании записи, и расходиться с ним экран не должен.
 */
export const isServiceAllowedForDoctor = (
  service: Service,
  doctorId: string | null | undefined,
): boolean => {
  const allowed = Array.isArray(service.doctorIds) ? service.doctorIds : []
  if (allowed.length === 0) return true
  if (!doctorId) return false
  return allowed.includes(doctorId)
}

export const servicesAllowedForDoctor = (
  services: Service[],
  doctorId: string | null | undefined,
): Service[] => services.filter((s) => isServiceAllowedForDoctor(s, doctorId))

/** Название услуги записи; идентификатор на экран не выпускаем. */
export const serviceNameById = (services: Service[], serviceId: string | null): string => {
  if (!serviceId) return 'Услуга не указана'
  return services.find((s) => s.id === serviceId)?.name ?? 'Услуга не указана'
}
