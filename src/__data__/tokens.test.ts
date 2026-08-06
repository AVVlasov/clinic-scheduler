import { describe, expect, it } from 'vitest'

import { fonts, gridStep, palette, radii } from './tokens'

describe('design tokens', () => {
  it('палитра совпадает со значениями из smclinic-Design-System.md §2', () => {
    expect(palette.brandGreen).toBe('#0D9B6C')
    expect(palette.brandGreenDark).toBe('#0A7D57')
    expect(palette.brandGreenTint).toBe('#D8F3E9')
    expect(palette.brandGreenFaint).toBe('#EEF9F4')
    expect(palette.brandOrange).toBe('#F07A35')
    expect(palette.brandOrangeDark).toBe('#D66A2C')
    expect(palette.surfaceLight).toBe('#F5F7F6')
    expect(palette.borderLight).toBe('#E0E6E3')
    expect(palette.borderDark).toBe('#C8C8C8')
    expect(palette.textPrimary).toBe('#1F1F1F')
    expect(palette.textSecondary).toBe('#6E6E6E')
    expect(palette.textPlaceholder).toBe('#3D3D3D')
    expect(palette.danger).toBe('#DC5658')
  })

  it('для текста мельче 18px доступны -700-версии фирменных цветов', () => {
    expect(palette.brandGreen700).toBe('#0B6B4A')
    expect(palette.brandOrange700).toBe('#9A4A10')
  })

  it('текстовые -700-версии НЕ совпадают с заливочными -500-версиями', () => {
    expect(palette.brandGreen700).not.toBe(palette.brandGreen)
    expect(palette.brandOrange700).not.toBe(palette.brandOrange)
  })

  it('типографика: Open Sans для интерфейса, JetBrains Mono — для идентификаторов', () => {
    expect(fonts.body).toContain('Open Sans')
    expect(fonts.heading).toContain('Open Sans')
    expect(fonts.mono).toContain('JetBrains Mono')
  })

  it('форма элементов: 4px для плотных зон, 40px-пилюля для основных действий, 0 для сетки', () => {
    expect(radii.compact).toBe('4px')
    expect(radii.pill).toBe('40px')
    expect(radii.none).toBe('0')
  })

  it('базовый шаг сетки — 4px', () => {
    expect(gridStep).toBe(4)
  })
})