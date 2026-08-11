// Журнал записи читает человек, а не разработчик.
//
// ЗАЧЕМ ЭТОТ ТЕСТ. Блок «История статусов» показывал переходы конечного автомата:
//
//     — → Ожидает, оператор
//     Ожидает → Пришёл, регистратор
//     Пришёл → На приёме, врач
//
// Здесь неверно всё, кроме содержания: прочерк вместо события, стрелка из
// диаграммы, каждая строка наполовину повторяет предыдущую (хвост прошлого
// перехода и есть начало следующего) — и НЕТ ВРЕМЕНИ, то есть журнал не отвечает
// на единственный вопрос, ради которого его открывают: когда это случилось.
//
// Пережило это потому, что блок не был покрыт ничем: `history-entry` не
// встречался ни в одном тесте.

import { describe, expect, it } from 'vitest'

import { formatEventMoment } from '../__data__/dates'
import { actorLabel, historyEventLabel } from '../__data__/status-labels'
import type { AppointmentHistoryEntry, AppointmentStatus } from '../__data__/types'

const line = (entry: AppointmentHistoryEntry, onDate: string): string =>
  `${formatEventMoment(entry.at, onDate)} ${historyEventLabel(entry.from, entry.to)}, ${actorLabel(entry.actor)}`

const entry = (
  from: AppointmentStatus | null,
  to: AppointmentStatus,
  at: string,
  actor: string,
): AppointmentHistoryEntry => ({ from, to, at, actor })

describe('журнал записи — события, а не переходы автомата', () => {
  const day = '2026-08-11'
  const chain = [
    entry(null, 'scheduled', '2026-08-10T14:20:00+03:00', 'operator'),
    entry('scheduled', 'arrived', '2026-08-11T08:22:00+03:00', 'registrar'),
    entry('arrived', 'in_progress', '2026-08-11T08:31:00+03:00', 'doctor'),
    entry('in_progress', 'completed', '2026-08-11T09:04:00+03:00', 'doctor'),
  ]

  it('каждая строка называет событие, а не пару статусов со стрелкой', () => {
    const rendered = chain.map((e) => line(e, day))
    for (const text of rendered) {
      expect(text, `стрелка автомата в строке: ${text}`).not.toContain('→')
      expect(text, `прочерк вместо события: ${text}`).not.toMatch(/^\S+\s+—/)
    }
    expect(rendered[0]).toContain('Запись создана')
    expect(rendered[1]).toContain('Отмечен приход')
    expect(rendered[2]).toContain('Приём начат')
    expect(rendered[3]).toContain('Приём завершён')
  })

  it('у каждого события есть время', () => {
    for (const e of chain) {
      expect(line(e, day), 'в строке журнала нет времени').toMatch(/\d{2}:\d{2}/)
    }
    // Событие не в день приёма показывается вместе с датой — иначе «14:20»
    // выглядит как сегодняшнее, хотя запись создали накануне.
    expect(line(chain[0], day)).toMatch(/^10\.08, 14:20/)
    expect(line(chain[1], day)).toMatch(/^08:22/)
  })

  it('строки не повторяют друг друга наполовину', () => {
    // В прежней форме хвост строки был началом следующей: «… → Пришёл» и
    // «Пришёл → …». Половина текста журнала не несла ничего.
    const events = chain.map((e) => historyEventLabel(e.from, e.to))
    expect(new Set(events).size, 'события в цепочке повторяются').toBe(events.length)
  })

  it('роль автора — по-русски, незнакомая латиница не выходит на экран', () => {
    expect(actorLabel('registrar')).toBe('регистратор')
    expect(actorLabel('doctor')).toBe('врач')
    expect(actorLabel('Регистратура')).toBe('Регистратура')
    expect(actorLabel('unknown_service')).toBe('система')
    expect(actorLabel(null)).toBe('система')
  })

  it('у каждого статуса есть название события: новый статус не оставит пустоту', () => {
    const statuses: AppointmentStatus[] = [
      'scheduled', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show',
    ]
    for (const to of statuses) {
      const label = historyEventLabel('scheduled', to)
      expect(label, `нет названия события для перехода в ${to}`).toBeTruthy()
      expect(label, `латиница в названии события ${to}`).not.toMatch(/[A-Za-z]/)
    }
    // Возврат в очередь после ошибочной неявки — не «создание записи».
    expect(historyEventLabel('no_show', 'scheduled')).toBe('Возвращена в очередь')
    expect(historyEventLabel(null, 'scheduled')).toBe('Запись создана')
  })
})
