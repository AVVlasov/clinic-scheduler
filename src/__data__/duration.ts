import type { DurationRule, Service, VisitType } from './types'

/**
 * Расчёт длительности приёма по правилам администратора (ФТ 1.6, 2.1).
 *
 * Одна функция на два места: панель «Проверка расчёта» в АРМ администратора и
 * запись из карточки слота в АРМ оператора. Если бы каждый считал сам, экран
 * администратора показывал бы одно число, а в записи сохранялось другое —
 * ровно то расхождение, ради которого расчёт вынесен сюда.
 */

export interface DurationContext {
  service: Pick<Service, 'duration' | 'category'>
  /** Тип приёма может быть не выбран: тогда правила по типу не применяются. */
  visitType: VisitType | null
  doctorId?: string | null
  /** Полных лет пациента на дату приёма; null — пациент ещё не выбран. */
  patientAgeYears?: number | null
  /** Услуга выполняется на аппарате (ресурс из справочника оборудования). */
  requiresEquipment?: boolean
}

export interface DurationStep {
  ruleId: string
  condition: string
  factor: string
  effectLabel: string
  /** Длительность после применения правила. */
  resultMin: number
}

export interface DurationBreakdown {
  baseMin: number
  steps: DurationStep[]
  totalMin: number
}

/** Полных лет на дату (или на сегодня, если дата не задана). */
export const ageYearsOn = (birthDate: string | null | undefined, on?: string): number | null => {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null
  const [by, bm, bd] = birthDate.split('-').map(Number)
  const ref = on && /^\d{4}-\d{2}-\d{2}$/.test(on) ? on.split('-').map(Number) : null
  const now = ref ? new Date(ref[0], ref[1] - 1, ref[2]) : new Date()
  let years = now.getFullYear() - by
  const hadBirthday = now.getMonth() + 1 > bm || (now.getMonth() + 1 === bm && now.getDate() >= bd)
  if (!hadBirthday) years -= 1
  return years >= 0 ? years : null
}

const matches = (rule: DurationRule, ctx: DurationContext): boolean => {
  const m = rule.match
  if (m.serviceCategory != null && m.serviceCategory !== ctx.service.category) return false
  if (m.visitType != null && m.visitType !== ctx.visitType) return false
  if (m.doctorId != null && m.doctorId !== ctx.doctorId) return false
  if (m.requiresEquipment === true && ctx.requiresEquipment !== true) return false
  if (m.patientAgeFrom != null) {
    if (ctx.patientAgeYears == null) return false
    if (ctx.patientAgeYears < m.patientAgeFrom) return false
  }
  return true
}

/**
 * Правила применяются по приоритету сверху вниз: базовое даёт норматив услуги,
 * `set` заменяет его нормативом условия, `add` сдвигает результат.
 */
export const evaluateDuration = (
  rules: DurationRule[],
  ctx: DurationContext,
): DurationBreakdown => {
  const ordered = [...rules].sort((a, b) => a.priority - b.priority)
  const baseMin = ctx.service.duration
  let total = baseMin
  const steps: DurationStep[] = []

  for (const rule of ordered) {
    if (!rule.enabled && !rule.locked) continue
    if (!matches(rule, ctx)) continue

    if (rule.effect.kind === 'base') {
      total = baseMin
    } else if (rule.effect.kind === 'set') {
      total = rule.effect.minutes
    } else {
      total += rule.effect.minutes
    }
    if (total < 5) total = 5
    steps.push({
      ruleId: rule.id,
      condition: rule.condition,
      factor: rule.factor,
      effectLabel: rule.effectLabel,
      resultMin: total,
    })
  }

  return { baseMin, steps, totalMin: total }
}

/**
 * Резервные правила на случай, когда справочник ещё не загружен: повторяют
 * норматив приёма, действовавший до появления экрана правил (первичный 60,
 * повторный 30). Экран администратора всегда работает на серверном списке.
 */
export const FALLBACK_DURATION_RULES: DurationRule[] = [
  {
    id: 'dr-base',
    priority: 0,
    condition: 'Базовая длительность',
    factor: 'Норматив услуги из справочника',
    effectLabel: 'база',
    enabled: true,
    locked: true,
    match: {},
    effect: { kind: 'base' },
  },
  {
    id: 'dr-visit-first',
    priority: 1,
    condition: 'Тип приёма',
    factor: 'Первичный, категория «Приём»',
    effectLabel: '60 мин',
    enabled: true,
    locked: false,
    match: { serviceCategory: 'Приём', visitType: 'first' },
    effect: { kind: 'set', minutes: 60 },
  },
  {
    id: 'dr-visit-repeat',
    priority: 2,
    condition: 'Тип приёма',
    factor: 'Повторный, категория «Приём»',
    effectLabel: '30 мин',
    enabled: true,
    locked: false,
    match: { serviceCategory: 'Приём', visitType: 'repeat' },
    effect: { kind: 'set', minutes: 30 },
  },
]
