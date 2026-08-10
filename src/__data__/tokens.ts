/**
 * Визуальные токены — из `_ds` (макеты). Источник:
 * ai/05-дизайн/Clinic-scheduler UI макеты/_ds/.../tokens/{colors,typography,shape,spacing}.css
 * Тест tokens.test.ts сверяет значения с CSS; правка «на глаз» ломает прогон.
 */

/** Путь к каталогу токенов _ds относительно корня репо (для тестов). */
export const DS_TOKENS_DIR =
  'ai/05-дизайн/Clinic-scheduler UI макеты/_ds/smclinic-design-system-c4cdb29e-5f82-49a1-b516-e4fd9f4fa0c3/tokens'

export const palette = {
  // colors.css — ступени 500 = точные #0D9B6C / #F07A35 / #DC5658
  brandGreen: '#0D9B6C',
  brandGreenDark: 'oklch(0.520 0.112 162.7)', // --green-600
  brandGreenTint: 'oklch(0.905 0.058 162.7)', // --green-200
  brandGreenFaint: 'oklch(0.978 0.014 162.7)', // --green-50
  brandGreen700: 'oklch(0.465 0.100 162.7)', // --green-700
  brandOrange: '#F07A35',
  brandOrangeDark: 'oklch(0.630 0.150 47.6)', // --orange-600
  brandOrange700: 'oklch(0.500 0.118 47.6)', // --orange-700
  surfaceLight: 'oklch(0.966 0.005 170)', // --n-50 / --surface-light
  borderLight: 'oklch(0.912 0.007 170)', // --n-200
  borderDark: 'oklch(0.858 0.009 170)', // --n-300
  textPrimary: 'oklch(0.255 0.008 170)', // --n-900
  textSecondary: 'oklch(0.565 0.012 170)', // --n-500
  textPlaceholder: 'oklch(0.565 0.012 170)', // --n-500
  danger: '#DC5658',
  /** Текст на оранжевой заливке — всегда тёмный (_ds --text-on-orange). */
  textOnOrange: 'oklch(0.255 0.008 170)',
  /** Текст на зелёной 600+ — белый (_ds --text-on-green). */
  textOnGreen: '#FFFFFF',
  slotBookedFill: 'oklch(0.951 0.032 162.7)', // --green-100 / --slot-booked-fill
} as const

/** typography.css — --font-sans */
export const fonts = {
  body: '"Golos Text", "Open Sans", "Segoe UI", Arial, sans-serif',
  heading: '"Golos Text", "Open Sans", "Segoe UI", Arial, sans-serif',
  mono: '"JetBrains Mono", "Cascadia Mono", Consolas, monospace',
} as const

/** typography.css — веса */
export const fontWeights = {
  regular: '400',
  medium: '500',
  strong: '600',
  bold: '700',
} as const

/** shape.css — радиусы */
export const radii = {
  none: '0',
  xs: '4px',
  sm: '6px',
  md: '8px',
  lg: '12px',
  /** плотные зоны / прежний compact */
  compact: '4px',
  pill: '999px',
} as const

/** shape.css — глубина */
export const shadows = {
  elev1: '0 0 0 1px oklch(0.30 0.02 170 / 0.07), 0 1px 2px oklch(0.30 0.02 170 / 0.05)',
  elev2: '0 0 0 1px oklch(0.30 0.02 170 / 0.07), 0 2px 4px oklch(0.30 0.02 170 / 0.04), 0 8px 16px oklch(0.30 0.02 170 / 0.06)',
  elev3: '0 0 0 1px oklch(0.30 0.02 170 / 0.07), 0 8px 16px oklch(0.30 0.02 170 / 0.06), 0 24px 48px oklch(0.30 0.02 170 / 0.12)',
} as const

export const gridStep = 4

export const spacing = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
} as const

/** Минимальный размер текста на брендовой заливке с белым (_ds --size-on-fill-min). */
export const sizeOnFillMinPx = 18
