import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  DS_TOKENS_DIR,
  fontWeights,
  fonts,
  gridStep,
  palette,
  radii,
  shadows,
  sizeOnFillMinPx,
} from './tokens'

const readTokenCss = (name: string): string => {
  const full = path.join(process.cwd(), DS_TOKENS_DIR, name)
  expect(fs.existsSync(full), `нет файла источника ${full}`).toBe(true)
  return fs.readFileSync(full, 'utf8')
}

/** Достаёт значение `--name:` из :root CSS (первая декларация). */
const cssVar = (css: string, name: string): string => {
  const re = new RegExp(`--${name}\\s*:\\s*([^;]+);`)
  const m = css.match(re)
  expect(m, `в CSS нет --${name}`).toBeTruthy()
  return (m as RegExpMatchArray)[1].replace(/\/\*.*?\*\//g, '').trim()
}

describe('design tokens ↔ _ds', () => {
  const colors = readTokenCss('colors.css')
  const typography = readTokenCss('typography.css')
  const shape = readTokenCss('shape.css')
  const spacing = readTokenCss('spacing.css')
  const fontsCss = readTokenCss('fonts.css')

  it('палитра 500 совпадает с комментариями _ds (точные hex бренда)', () => {
    expect(colors).toContain('#0D9B6C')
    expect(colors).toContain('#F07A35')
    expect(colors).toContain('#DC5658')
    expect(palette.brandGreen).toBe('#0D9B6C')
    expect(palette.brandOrange).toBe('#F07A35')
    expect(palette.danger).toBe('#DC5658')
  })

  it('ступни -600/-700 и нейтрали совпадают с oklch из colors.css', () => {
    expect(palette.brandGreenDark).toBe(cssVar(colors, 'green-600'))
    expect(palette.brandGreen700).toBe(cssVar(colors, 'green-700'))
    expect(palette.brandGreenTint).toBe(cssVar(colors, 'green-200'))
    expect(palette.brandGreenFaint).toBe(cssVar(colors, 'green-50'))
    expect(palette.brandOrangeDark).toBe(cssVar(colors, 'orange-600'))
    expect(palette.brandOrange700).toBe(cssVar(colors, 'orange-700'))
    expect(palette.surfaceLight).toBe(cssVar(colors, 'n-50'))
    expect(palette.borderLight).toBe(cssVar(colors, 'n-200'))
    expect(palette.borderDark).toBe(cssVar(colors, 'n-300'))
    expect(palette.textPrimary).toBe(cssVar(colors, 'n-900'))
    expect(palette.textSecondary).toBe(cssVar(colors, 'n-500'))
    expect(palette.slotBookedFill).toBe(cssVar(colors, 'green-100'))
  })

  it('на оранжевом заливе текст тёмный; порог белого на заливке — 18px', () => {
    expect(cssVar(colors, 'text-on-orange')).toBe('var(--n-900)')
    expect(palette.textOnOrange).toBe(cssVar(colors, 'n-900'))
    expect(cssVar(typography, 'size-on-fill-min')).toBe('18px')
    expect(sizeOnFillMinPx).toBe(18)
  })

  it('типографика: Golos Text в стеке UI, JetBrains Mono — идентификаторы', () => {
    const sans = cssVar(typography, 'font-sans')
    expect(sans).toContain('Golos Text')
    expect(fonts.body).toContain('Golos Text')
    expect(fonts.heading).toContain('Golos Text')
    expect(fonts.mono).toContain('JetBrains Mono')
    expect(fontsCss).toContain('Golos+Text')
  })

  it('веса 400/500/600/700 из typography.css', () => {
    expect(fontWeights.regular).toBe(cssVar(typography, 'weight-regular'))
    expect(fontWeights.medium).toBe(cssVar(typography, 'weight-medium'))
    expect(fontWeights.strong).toBe(cssVar(typography, 'weight-strong'))
    expect(fontWeights.bold).toBe(cssVar(typography, 'weight-bold'))
  })

  it('радиусы из shape.css (включая пилюлю 999px)', () => {
    expect(radii.xs).toBe(cssVar(shape, 'radius-xs'))
    expect(radii.sm).toBe(cssVar(shape, 'radius-sm'))
    expect(radii.md).toBe(cssVar(shape, 'radius-md'))
    expect(radii.lg).toBe(cssVar(shape, 'radius-lg'))
    expect(radii.pill).toBe(cssVar(shape, 'radius-pill'))
    expect(radii.none).toBe(cssVar(shape, 'radius-grid'))
    expect(radii.compact).toBe(radii.xs)
  })

  it('тени elev из shape.css', () => {
    const norm = (s: string) => s.replace(/\s+/g, '').trim()
    expect(norm(shadows.elev1)).toBe(norm(cssVar(shape, 'elev-1')))
    expect(norm(shadows.elev2)).toBe(norm(cssVar(shape, 'elev-2')))
    expect(norm(shadows.elev3)).toBe(norm(cssVar(shape, 'elev-3')))
  })

  it('шаг сетки 4px из spacing.css', () => {
    expect(cssVar(spacing, 'unit')).toBe('4px')
    expect(gridStep).toBe(4)
  })

  it('шрифты подключены в продукте (css + файлы mono)', () => {
    const fontsProduct = path.join(process.cwd(), 'src/assets/smclinic-fonts.css')
    expect(fs.existsSync(fontsProduct)).toBe(true)
    const css = fs.readFileSync(fontsProduct, 'utf8')
    expect(css).toContain('Golos+Text')
    expect(css).toContain('JetBrainsMono-Regular.woff2')
    expect(fs.existsSync(path.join(process.cwd(), 'src/assets/fonts/JetBrainsMono-Regular.woff2'))).toBe(true)
    expect(fs.existsSync(path.join(process.cwd(), 'src/assets/fonts/JetBrainsMono-Bold.woff2'))).toBe(true)
  })

  it('контраст: белый на brandOrange запрещён правилом textOnOrange ≠ white', () => {
    expect(palette.textOnOrange.toLowerCase()).not.toBe('#ffffff')
    expect(palette.textOnOrange).not.toBe('#FFFFFF')
    expect(palette.brandOrange).toBe('#F07A35')
  })
})
