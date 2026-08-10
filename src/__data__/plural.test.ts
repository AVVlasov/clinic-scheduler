import { describe, expect, it } from 'vitest'

import { doctorsWord, plural, slotsWord } from './plural'

describe('plural — согласование существительного с числом', () => {
  it('единственное число: 1, 21, 101', () => {
    expect(doctorsWord(1)).toBe('врач')
    expect(doctorsWord(21)).toBe('врач')
    expect(doctorsWord(101)).toBe('врач')
  })

  it('форма «2–4»: 2, 3, 4, 22', () => {
    expect(doctorsWord(2)).toBe('врача')
    expect(doctorsWord(3)).toBe('врача')
    expect(doctorsWord(4)).toBe('врача')
    expect(doctorsWord(22)).toBe('врача')
  })

  it('множественное: 0, 5, 6, 9, 25', () => {
    expect(doctorsWord(0)).toBe('врачей')
    expect(doctorsWord(5)).toBe('врачей')
    expect(doctorsWord(6)).toBe('врачей')
    expect(doctorsWord(9)).toBe('врачей')
    expect(doctorsWord(25)).toBe('врачей')
  })

  it('исключение 11–14 — множественное, несмотря на последнюю цифру', () => {
    expect(doctorsWord(11)).toBe('врачей')
    expect(doctorsWord(12)).toBe('врачей')
    expect(doctorsWord(13)).toBe('врачей')
    expect(doctorsWord(14)).toBe('врачей')
    expect(doctorsWord(111)).toBe('врачей')
  })

  it('слоты склоняются по тому же правилу', () => {
    expect(slotsWord(1)).toBe('слот')
    expect(slotsWord(2)).toBe('слота')
    expect(slotsWord(5)).toBe('слотов')
    expect(slotsWord(11)).toBe('слотов')
  })

  it('правило общее, а не список слов', () => {
    expect(plural(1, 'запись', 'записи', 'записей')).toBe('запись')
    expect(plural(3, 'запись', 'записи', 'записей')).toBe('записи')
    expect(plural(12, 'запись', 'записи', 'записей')).toBe('записей')
  })
})
