// Единство вёрстки — проверкой, а не осмотром.
//
// ЗАЧЕМ. Заказчик переключает четыре рабочих места за минуту. Один и тот же
// элемент, нарисованный в каждом АРМ заново, читается как четыре разных
// продукта — это и есть главный признак «делала не команда». Рендером такое не
// ловится: расхождение живёт в исходниках, а не в конкретном состоянии экрана.

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const SRC_DIR = path.resolve(__dirname, '..')
const ASSETS_DIR = path.join(SRC_DIR, 'assets')

const walk = (dir: string, filter: RegExp): string[] => {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'fonts' || entry.name === 'journeys') continue
      out.push(...walk(full, filter))
      continue
    }
    if (!filter.test(entry.name)) continue
    if (/\.test\.tsx?$/.test(entry.name)) continue
    out.push(full)
  }
  return out
}

const rel = (file: string): string =>
  path.relative(path.resolve(SRC_DIR, '..'), file).replace(/\\/g, '/')

const productSources = (): Array<{ file: string; code: string }> =>
  walk(SRC_DIR, /\.tsx?$/).map((file) => ({ file: rel(file), code: fs.readFileSync(file, 'utf8') }))

describe('вёрстка — один язык на четырёх АРМ', () => {
  it('общие примитивы существуют в одном экземпляре', () => {
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      if (file.endsWith('pages/ui-kit.tsx')) continue
      if (/const FilterChip\s*=/.test(code)) hits.push(`${file}: своя копия FilterChip`)
      if (/const StatTile\s*=/.test(code)) hits.push(`${file}: своя копия плитки показателя`)
    }
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('белый текст не ставится на зелёную заливку 500', () => {
    /**
     * Правило проекта (CLAUDE.md): на зелёном белый текст допустим только на
     * ступенях ≥600 или при кегле ≥18px. Кнопка «Отметить приход» в каждой
     * строке очереди давала контраст 3,55:1 — ниже порога, и это видно глазами.
     */
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      const lines = code.split('\n')
      lines.forEach((line, i) => {
        if (!/bg=[{"']?['"]?brandGreen['"]/.test(line)) return
        const around = lines.slice(Math.max(0, i - 2), i + 3).join(' ')
        if (/color=['"{ ]*['"]white['"]/.test(around) || /'white'/.test(around)) {
          hits.push(`${rel(file)}:${i + 1}: белый текст на brandGreen (ступень 500)`)
        }
      })
    }
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('ссылки на токены темы резолвятся', () => {
    /**
     * Chakra печатает CSS-переменные в kebab-case
     * (`--chakra-colors-border-light`). Запись camelCase не резолвилась никогда:
     * работало только запасное значение, то есть тема на эти места не влияла.
     */
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      for (const m of code.matchAll(/var\(--chakra-colors-([A-Za-z-]+)/g)) {
        if (/[A-Z]/.test(m[1])) hits.push(`${file}: var(--chakra-colors-${m[1]}) — camelCase не резолвится`)
      }
    }
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('шрифты самохостятся: внешних запросов в стилях нет', () => {
    for (const file of walk(ASSETS_DIR, /\.css$/)) {
      const css = fs.readFileSync(file, 'utf8')
      expect(css, `${rel(file)}: внешний запрос за шрифтом`).not.toMatch(/@import\s+url\(['"]?https?:/)
      expect(css, `${rel(file)}: внешний адрес в src`).not.toMatch(/src:\s*url\(['"]?https?:/)
    }
    // И файл шрифта интерфейса действительно лежит рядом.
    const fontsDir = path.join(ASSETS_DIR, 'fonts')
    const files = fs.readdirSync(fontsDir)
    expect(files.some((f) => /OpenSans/i.test(f)), 'нет локального файла Open Sans').toBe(true)
  })

  it('в разметке нет классов без единого правила стилей', () => {
    /**
     * Разметку из макета скопировали, стили не принесли: единственный
     * `className` во всём `src` (`sm-seg__item`) не имел ни одного правила.
     */
    const cssText = walk(ASSETS_DIR, /\.css$/).map((f) => fs.readFileSync(f, 'utf8')).join('\n')
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      for (const m of code.matchAll(/className="([^"]+)"/g)) {
        for (const cls of m[1].split(/\s+/).filter(Boolean)) {
          if (!cssText.includes(`.${cls}`)) hits.push(`${file}: класс «${cls}» без правила стилей`)
        }
      }
    }
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('цвета берутся из токенов дизайн-системы, а не из палитры Chakra', () => {
    /**
     * `gray.100` / `gray.200` — палитра библиотеки, а не СМ-Клиники: нейтральные
     * из `_ds` другие, и плашки на соседних экранах расходились по оттенку.
     */
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      const cleaned = code.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')
      for (const m of cleaned.matchAll(/'(gray|red|blue|green|orange|teal|purple)\.\d{2,3}'/g)) {
        hits.push(`${file}: чужая палитра ${m[0]}`)
      }
    }
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('первичные кнопки отвечают на наведение', () => {
    // `_hover={{ bg: 'brandGreenDark' }}` при уже установленном `bg="brandGreenDark"`
    // не меняет ничего: продукт ощущается картинкой.
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      const lines = code.split('\n')
      lines.forEach((line, i) => {
        const m = /_hover=\{\{\s*bg:\s*'([A-Za-z0-9]+)'/.exec(line)
        if (!m) return
        const around = lines.slice(Math.max(0, i - 4), i + 4).join(' ')
        const bg = new RegExp(`bg="${m[1]}"`).test(around)
        if (bg) hits.push(`${file}:${i + 1}: наведение повторяет фон «${m[1]}»`)
      })
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})
