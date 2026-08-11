import { describe, expect, it } from 'vitest'

import { ageYearsOn, evaluateDuration } from './duration'
import { resolveBookingDuration } from './booking'
import type { DurationRule, Service } from './types'

const rules: DurationRule[] = [
  {
    id: 'dr-base',
    priority: 0,
    condition: 'Базовая длительность',
    factor: 'Норматив услуги',
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
    factor: 'Первичный',
    effectLabel: '60 мин',
    enabled: true,
    locked: false,
    match: { serviceCategory: 'Приём', visitType: 'first' },
    effect: { kind: 'set', minutes: 60 },
  },
  {
    id: 'dr-equipment',
    priority: 3,
    condition: 'Оборудование',
    factor: 'Услуга на аппарате',
    effectLabel: '+10 мин',
    enabled: false,
    locked: false,
    match: { requiresEquipment: true },
    effect: { kind: 'add', minutes: 10 },
  },
  {
    id: 'dr-age-senior',
    priority: 4,
    condition: 'Возраст пациента',
    factor: 'Старше 70 лет',
    effectLabel: '+15 мин',
    enabled: true,
    locked: false,
    match: { patientAgeFrom: 70 },
    effect: { kind: 'add', minutes: 15 },
  },
]

const priem: Service = {
  id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500, doctorIds: [],
}
const ecg: Service = {
  id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200, doctorIds: [],
}

describe('расчёт длительности по правилам', () => {
  it('без совпадений действует базовый норматив услуги', () => {
    const res = evaluateDuration(rules, { service: ecg, visitType: 'repeat' })
    expect(res.baseMin).toBe(15)
    expect(res.totalMin).toBe(15)
    expect(res.steps.map((s) => s.ruleId)).toEqual(['dr-base'])
  })

  it('правило «set» заменяет норматив, «add» сдвигает результат', () => {
    const res = evaluateDuration(rules, {
      service: priem,
      visitType: 'first',
      patientAgeYears: 77,
    })
    expect(res.totalMin).toBe(75)
    expect(res.steps.map((s) => s.ruleId)).toEqual(['dr-base', 'dr-visit-first', 'dr-age-senior'])
    expect(res.steps[1].resultMin).toBe(60)
  })

  it('выключенное правило не применяется', () => {
    const off = rules.map((r) => (r.id === 'dr-visit-first' ? { ...r, enabled: false } : r))
    expect(evaluateDuration(off, { service: priem, visitType: 'first' }).totalMin).toBe(30)
    expect(evaluateDuration(rules, { service: priem, visitType: 'first' }).totalMin).toBe(60)
  })

  it('правило по оборудованию срабатывает только для услуги на аппарате', () => {
    const on = rules.map((r) => (r.id === 'dr-equipment' ? { ...r, enabled: true } : r))
    expect(evaluateDuration(on, { service: ecg, visitType: 'repeat' }).totalMin).toBe(15)
    expect(
      evaluateDuration(on, { service: ecg, visitType: 'repeat', requiresEquipment: true }).totalMin,
    ).toBe(25)
  })

  it('возраст без пациента не додумывается: правило не применяется', () => {
    const res = evaluateDuration(rules, { service: priem, visitType: 'first', patientAgeYears: null })
    expect(res.totalMin).toBe(60)
  })

  it('длительность не опускается ниже одного шага сетки', () => {
    const minus: DurationRule[] = [
      rules[0],
      {
        ...rules[1],
        id: 'dr-cut',
        effectLabel: '−60 мин',
        match: {},
        effect: { kind: 'add', minutes: -60 },
      },
    ]
    expect(evaluateDuration(minus, { service: ecg, visitType: 'repeat' }).totalMin).toBe(5)
  })

  it('возраст считается на дату приёма, а не на системные часы', () => {
    expect(ageYearsOn('1949-06-18', '2026-08-11')).toBe(77)
    expect(ageYearsOn('1949-12-31', '2026-08-11')).toBe(76)
    expect(ageYearsOn('', '2026-08-11')).toBeNull()
  })
})

describe('запись оператора считает длительность теми же правилами', () => {
  it('без справочника правил действует резервный норматив приёма', () => {
    expect(resolveBookingDuration(priem, 'first')).toBe(60)
    expect(resolveBookingDuration(priem, 'repeat')).toBe(30)
    expect(resolveBookingDuration(ecg, 'first')).toBe(15)
  })

  it('выключенное администратором правило меняет длительность записи', () => {
    const off = rules.map((r) => (r.id === 'dr-visit-first' ? { ...r, enabled: false } : r))
    expect(resolveBookingDuration(priem, 'first', { rules: off })).toBe(30)
  })

  it('пациент старше 70 получает более длинный приём', () => {
    expect(resolveBookingDuration(priem, 'first', { rules, patientAgeYears: 77 })).toBe(75)
    expect(resolveBookingDuration(priem, 'first', { rules, patientAgeYears: 40 })).toBe(60)
  })
})
