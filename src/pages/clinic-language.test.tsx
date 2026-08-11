// Язык интерфейса — проверкой, а не осмотром.
//
// ЗАЧЕМ СТАТИЧЕСКИЙ ТЕСТ. Слова живут в разметке всех четырёх АРМ, и поймать их
// рендером каждого экрана в каждом состоянии нельзя: часть строк показывается
// только после действия. Поэтому читаем исходники, вырезаем комментарии (в них
// причины правок как раз и объясняются словами вроде «снос») и ищем то, что
// заказчик увидеть не должен.

import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const PAGES_DIR = path.resolve(__dirname)
const DATA_DIR = path.resolve(__dirname, '..', '__data__')

const sourceFiles = (dir: string): string[] => {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full))
      continue
    }
    if (!/\.tsx?$/.test(entry.name)) continue
    if (/\.test\.tsx?$/.test(entry.name)) continue
    out.push(full)
  }
  return out
}

/** Комментарии объясняют причины правок и не попадают на экран. */
const stripComments = (code: string): string => code
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const productSources = (): Array<{ file: string; code: string }> =>
  [...sourceFiles(PAGES_DIR), ...sourceFiles(DATA_DIR)].map((file) => ({
    file: path.relative(path.resolve(__dirname, '..', '..'), file).replace(/\\/g, '/'),
    code: stripComments(fs.readFileSync(file, 'utf8')),
  }))

describe('язык интерфейса — клиника, а не разработка', () => {
  it('в интерфейсе нет слов не из речи клиники', () => {
    // Каждое слово здесь — из живого снимка экранов перед демо.
    const banned: Array<{ pattern: RegExp; why: string }> = [
      { pattern: /Снос расписания|Снести|снести|Причина сноса/, why: 'в клинике это массовая отмена приёма' },
      { pattern: /не влезет/, why: 'разговорная форма в ячейке сетки' },
      { pattern: /Техперерыв/, why: 'слово из другой отрасли; в шаблонах тот же интервал звался иначе' },
      { pattern: /сервер не пустит|сервер отклонит|расчёт общий/, why: 'объяснение для приёмщика, а не для сотрудника' },
      { pattern: /Клик по /, why: 'жаргон интерфейсостроителя' },
      { pattern: /Подтвердить необратимо/, why: 'подтверждение должно называть само действие' },
      { pattern: /ID страховочной записи/, why: 'требование, вставленное в плейсхолдер дословно' },
      { pattern: /Ретенированный зуб|Снятие швов/, why: 'текст из стоматологического макета — на площадке нет стоматологов' },
    ]

    const hits: string[] = []
    for (const { file, code } of productSources()) {
      for (const { pattern, why } of banned) {
        const match = pattern.exec(code)
        if (match) hits.push(`${file}: «${match[0]}» — ${why}`)
      }
    }
    expect(hits, `запрещённые формулировки:\n${hits.join('\n')}`).toEqual([])
  })

  it('на экране нет машинных дат и служебных ключей в подписях', () => {
    /**
     * Так на экран попадали «Заявка W-0001», «Пакет b-002», «Отсутствие abs-001
     * применено» и «Выгрузка mass-cancel-2026-08-12.csv»: подпись склеивалась с
     * внутренним ключом, который сотруднику ничего не говорит.
     */
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      const isoLiteral = /['"`][^'"`]*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}[^'"`]*['"`]/.exec(code)
      if (isoLiteral) hits.push(`${file}: ISO-дата в строке — ${isoLiteral[0]}`)

      for (const m of code.matchAll(/(Заявка|Пакет|Отсутствие|Выгрузка)\s*\{/g)) {
        hits.push(`${file}: служебный ключ в подписи — «${m[1]} {…}»`)
      }
    }
    expect(hits, `машинные значения на экране:\n${hits.join('\n')}`).toEqual([])
  })

  it('счётчики согласованы с числом, а не склеены с одной формой слова', () => {
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      for (const m of code.matchAll(/\{[^{}]*\.length\}\s*(врач|врача|врачей|колонок|записей|записи|запись|слот|слота|слотов)\b/g)) {
        hits.push(`${file}: «${m[0].trim()}» — форма слова не согласована с числом`)
      }
    }
    expect(hits, `несогласованные счётчики:\n${hits.join('\n')}`).toEqual([])
  })

  it('подписи одного значения не заведены вторым словарём', () => {
    /**
     * У врача лежал собственный `payerLabel` с теми же пятью строками, что и
     * общий `paymentTypeLabel`. Два словаря одного значения расходятся не
     * «когда-нибудь», а на первой же правке: экраны начинают называть одно и то
     * же по-разному, и сотрудники не могут обсудить это по телефону.
     */
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      if (file.endsWith('__data__/booking.ts')) continue
      if (file.endsWith('__data__/status-labels.ts')) continue
      // Признак второго словаря — не сам switch, а возврат ровно тех же подписей.
      if (/case 'dms':\s*return 'ДМС'/.test(code)) hits.push(`${file}: свой словарь оснований оплаты`)
      if (/case 'no_show':\s*return 'Не пришёл'/.test(code)) hits.push(`${file}: свой словарь статусов записи`)
      if (/'dms':\s*'ДМС'/.test(code)) hits.push(`${file}: свой словарь оснований оплаты`)
    }
    expect(hits, hits.join('\n')).toEqual([])
  })

  it('роль автора перехода выводится по-русски', () => {
    const labels = fs.readFileSync(path.join(DATA_DIR, 'status-labels.ts'), 'utf8')
    for (const actor of ['operator', 'doctor', 'registrar', 'admin', 'system']) {
      expect(labels, `нет русской подписи для роли ${actor}`).toContain(`${actor}:`)
    }
    // И ни один экран не печатает сырое значение actor рядом со статусом.
    const hits: string[] = []
    for (const { file, code } of productSources()) {
      if (/\{entry\.actor\}/.test(code)) hits.push(`${file}: печатает entry.actor без словаря`)
    }
    expect(hits, hits.join('\n')).toEqual([])
  })
})
