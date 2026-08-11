import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { computeAgeYears } from './doctor-page'

vi.mock('@brojs/cli', () => ({
  getConfigValue: () => '/api',
  getNavigation: () => ({}),
  getNavigationValue: () => '/clinic-scheduler',
}))

// Дата фиксируется: возраст считается от «сегодня», и без фиксации набор был бы зелёным
// сегодня и красным через год.
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-08-10T09:00:00'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('возраст пациента в карточке визита', () => {
  it('34 года, а не «34 лет» — прежнее правило ошибалось на всём после 4', () => {
    expect(computeAgeYears('1992-07-21')).toBe('1992 г. р., 34 года')
  })

  it('21 год, 22 года, 25 лет', () => {
    expect(computeAgeYears('2005-01-01')).toBe('2005 г. р., 21 год')
    expect(computeAgeYears('2004-01-01')).toBe('2004 г. р., 22 года')
    expect(computeAgeYears('2001-01-01')).toBe('2001 г. р., 25 лет')
  })

  it('11–14 — «лет», несмотря на последнюю цифру', () => {
    expect(computeAgeYears('2015-01-01')).toBe('2015 г. р., 11 лет')
    expect(computeAgeYears('2012-01-01')).toBe('2012 г. р., 14 лет')
  })

  it('день рождения ещё не наступил — год не засчитывается', () => {
    expect(computeAgeYears('1992-12-31')).toBe('1992 г. р., 33 года')
  })

  it('нет даты рождения или дата битая — строки нет', () => {
    expect(computeAgeYears(null)).toBeNull()
    expect(computeAgeYears('не дата')).toBeNull()
  })
})
