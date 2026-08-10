/**
 * Русское согласование существительного с числом.
 *
 * «6 врача» и «1 врачей» — не опечатка вёрстки, а отсутствие правила: счётчики собирались
 * конкатенацией с одной формой слова. Интерфейс на русском (см. CLAUDE.md), поэтому форма
 * выбирается здесь, а не подбирается на глаз в каждом месте.
 */
export const plural = (count: number, one: string, few: string, many: string): string => {
  const n = Math.abs(Math.trunc(count))
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 14) return many
  const mod10 = n % 10
  if (mod10 === 1) return one
  if (mod10 >= 2 && mod10 <= 4) return few
  return many
}

export const doctorsWord = (count: number): string => plural(count, 'врач', 'врача', 'врачей')

export const slotsWord = (count: number): string => plural(count, 'слот', 'слота', 'слотов')
