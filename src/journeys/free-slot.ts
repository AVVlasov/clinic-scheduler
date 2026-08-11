// Поиск свободного окна и свободного пациента для сквозных сценариев.
//
// ЗАЧЕМ. Сценарии сеяли свою запись в «первую свободную ячейку» сетки и бронировали
// 30 минут. Шаг сетки — 15 минут, поэтому свободная ячейка ничего не обещает: на
// плотном дне соседние 15 минут уже заняты, и сервер законно отвечает 409. Тест при
// этом падал не на проверяемом поведении, а на подготовке данных — и чинился
// подгонкой демо-стенда под тест вместо обратного.
//
// Здесь окно ищется на всю длительность записи, а пациент — тот, у кого в это время
// нет своей записи: спор в сценарии должен идти о переносе и отмене, а не о том,
// что демо-пациент в этот час сидит у другого врача.

import { apiGet } from './journey-server'
import type { JourneyServer } from './journey-server'
import type { Patient, Schedule } from '../__data__/types'

export interface FreeCell {
  doctorId: string
  time: string
}

const STEP_MINUTES = 15

/** Окна нужной длительности, по одному на врача: соседние окна одного врача не независимы. */
export const findFreeCells = (schedule: Schedule, count: number, durationMin = 30): FreeCell[] => {
  const needed = Math.ceil(durationMin / STEP_MINUTES)
  const slots = schedule.slots
  const out: FreeCell[] = []
  const takenDoctors = new Set<string>()
  for (let i = 0; i + needed <= slots.length; i += 1) {
    for (const doc of slots[i].doctors) {
      if (doc.busy || takenDoctors.has(doc.id)) continue
      const spanFree = slots.slice(i, i + needed).every((slot) => {
        const cell = slot.doctors.find((d) => d.id === doc.id)
        return cell != null && !cell.busy
      })
      if (!spanFree) continue
      takenDoctors.add(doc.id)
      out.push({ doctorId: doc.id, time: slots[i].time })
      if (out.length >= count) return out
    }
  }
  return out
}

/** День окна, в котором есть нужное число свободных окон нужной длительности. */
export const findDateWithFreeCells = async (
  server: JourneyServer,
  from: string,
  count: number,
  durationMin = 30,
): Promise<{ date: string; cells: FreeCell[]; schedule: Schedule }> => {
  for (let i = 0; i < 14; i += 1) {
    const date = shiftIsoDate(from, i)
    const schedule = await apiGet<Schedule>(server, `/schedule/${date}`)
    const cells = findFreeCells(schedule, count, durationMin)
    if (cells.length >= count) return { date, cells, schedule }
  }
  throw new Error(`в окне демо-данных нет дня с ${count} свободными окнами по ${durationMin} мин`)
}

/**
 * Пациент без своей записи в этом интервале. Занятость считается по записям дня
 * одним запросом: обход картотеки по одному пациенту укладывал сценарий в таймаут.
 */
export const findFreePatient = async (
  server: JourneyServer,
  date: string,
  time: string,
  durationMin = 30,
): Promise<string> => {
  const startMs = new Date(`${date}T${time}:00+03:00`).getTime()
  const endMs = startMs + durationMin * 60000
  const [patients, day] = await Promise.all([
    apiGet<{ items: Patient[] }>(server, '/patients'),
    apiGet<{ items: Array<{ patientId: string; start: string; durationMin: number; status: string }> }>(
      server,
      `/appointments?date=${date}`,
    ),
  ])
  const busy = new Set(
    day.items
      .filter((a) => {
        if (a.status === 'cancelled' || a.status === 'no_show') return false
        const s = new Date(a.start).getTime()
        return s < endMs && s + a.durationMin * 60000 > startMs
      })
      .map((a) => a.patientId),
  )
  const free = patients.items.find((p) => !busy.has(p.id))
  if (!free) throw new Error(`нет пациента, свободного ${date} в ${time}`)
  return free.id
}

const shiftIsoDate = (date: string, days: number): string => {
  const [y, m, d] = date.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
