import type React from 'react'

import { palette } from '../__data__/tokens'

/**
 * Поле ввода в плотных формах АРМ.
 *
 * Ширина ограничена намеренно: на мониторе стойки поле «во всю строку»
 * растягивается на полтора экрана, читается как ошибка вёрстки и заставляет
 * вести взгляд от подписи к курсору через пустоту. Ограничение живёт здесь, а
 * не в каждом экране: раньше одинаковый стиль был скопирован в пять файлов, и
 * достаточно было поправить его в четырёх.
 */
export const fieldStyle: React.CSSProperties = {
  height: '32px',
  padding: '0 10px',
  /*
   * Цвет берётся из токенов напрямую. Chakra печатает CSS-переменные в
   * kebab-case (`--chakra-colors-border-light`), поэтому запись camelCase
   * никогда не резолвилась и работало только запасное значение — то есть тема
   * на эти места не влияла вовсе.
   */
  border: `1px solid ${palette.borderLight}`,
  borderRadius: '4px',
  fontSize: '13px',
  width: '100%',
  maxWidth: '320px',
  background: 'white',
}

/** Поле под длинный текст: комментарий, причина, адрес. */
export const wideFieldStyle: React.CSSProperties = {
  ...fieldStyle,
  maxWidth: '560px',
}
