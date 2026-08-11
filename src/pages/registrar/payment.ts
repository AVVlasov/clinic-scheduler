import type { Appointment, PaymentType } from '../../__data__/types'

/**
 * Деньги стойки: за что берут и сколько попадает в кассу смены.
 *
 * Расчёт живёт отдельно от экранов, потому что одно и то же число показывают
 * три места сразу — строка очереди, карточка визита и плитка «Касса смены».
 * Пока каждое считало само, плитка складывала то, чего в кассе нет.
 */

/** За что берут деньги: фактически оказанные услуги, иначе — плановая услуга записи. */
export const chargedServiceIds = (visit: Appointment): string[] => {
  if (visit.performedServiceIds.length > 0) return visit.performedServiceIds
  return visit.serviceId ? [visit.serviceId] : []
}

/** Стоимость услуг визита по прайсу — сколько стоит приём, а не сколько платит пациент. */
export const servicesTotal = (visit: Appointment, priceMap: Map<string, number>): number => {
  let sum = 0
  for (const id of chargedServiceIds(visit)) {
    const price = priceMap.get(id)
    if (typeof price === 'number') sum += price
  }
  return sum
}

/**
 * Основания оплаты, по которым платит не пациент, а третья сторона: в кассу
 * смены по такому визиту не приходит ничего, счёт уходит страховой. Так же
 * считает и сервер, когда сеет оплаты демо-дня (`cashDue` в stubs/api/data.js).
 *
 * Остальные основания (акция, скидка, сертификат) справочника условий не имеют,
 * и придумывать проценты в коде регистратуры нельзя: цена берётся из прайса.
 */
export const THIRD_PARTY_PAYMENT_TYPES: ReadonlySet<PaymentType> = new Set<PaymentType>(['dms'])

export const isThirdPartyPayment = (paymentType: PaymentType): boolean =>
  THIRD_PARTY_PAYMENT_TYPES.has(paymentType)

/** Сколько регистратор берёт в кассу за этот визит. */
export const cashDue = (visit: Appointment, priceMap: Map<string, number>): number =>
  isThirdPartyPayment(visit.paymentType) ? 0 : servicesTotal(visit, priceMap)

/** Что визит уже принёс в кассу смены: факт оплаты, а не ожидание. */
export const paidIntoCash = (visit: Appointment, priceMap: Map<string, number>): number => {
  if (!visit.paidAt) return 0
  return typeof visit.paidAmount === 'number' ? visit.paidAmount : cashDue(visit, priceMap)
}

export const shiftCashTotal = (visits: Appointment[], priceMap: Map<string, number>): number =>
  visits.reduce((acc, visit) => acc + paidIntoCash(visit, priceMap), 0)

// Формат денег общий для всех АРМ: см. src/__data__/money.ts
export { formatRub } from '../../__data__/money'

export const buildPriceMap = (services: Array<{ id: string; price: number }>): Map<string, number> => {
  const map = new Map<string, number>()
  for (const service of services) map.set(service.id, service.price)
  return map
}
