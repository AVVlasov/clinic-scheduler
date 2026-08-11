'use strict';

/**
 * Поиск свободного окна в сетке — для тестов стаба.
 *
 * Тесты приколачивали время записи константой («10 августа, 11:00 у d-001»), и
 * любое изменение демо-данных валило половину набора с 409: тест падал не потому,
 * что сломалось поведение, а потому что в этот час теперь стоит пациент.
 * Время берётся из той же сетки, которую видит оператор, — тест проверяет
 * поведение сервера, а не совпадение с посевом.
 */

const { buildSlots, state } = require('./data');

/**
 * @returns {{ time: string, start: string }} первое окно нужной длительности
 * @throws если у врача в этот день нет свободного окна — молчаливый возврат null
 *         превратил бы падение в «expected 400 to be 201» на следующей строке.
 */
const findFreeSlot = (date, doctorId, durationMin = 30) => {
  const rows = buildSlots(date);
  const stepMinutes = 15;
  const needed = Math.ceil(durationMin / stepMinutes);
  for (let i = 0; i + needed <= rows.length; i += 1) {
    let free = true;
    for (let k = 0; k < needed; k += 1) {
      const cell = (rows[i + k].doctors || []).find((d) => d.id === doctorId);
      if (!cell || cell.busy || cell.occupancyKind != null || cell.available === false) {
        free = false;
        break;
      }
    }
    if (!free) continue;
    const time = rows[i].time;
    return { time, start: `${date}T${time}:00` };
  }
  throw new Error(`Свободного окна ${durationMin} мин у врача ${doctorId} на ${date} нет`);
};

/** Нет ли у пациента своей записи в этом интервале — сервер такую бы отклонил. */
const isPatientFree = (patientId, startIso, durationMin = 30) => {
  const startMs = new Date(`${startIso}${/[zZ]|[+-]\d{2}:?\d{2}$/.test(startIso) ? '' : '+03:00'}`).getTime();
  const endMs = startMs + durationMin * 60000;
  const pool = state.appointments.concat(state.demoAppointments || []);
  return !pool.some((a) => a.patientId === patientId
    && !['cancelled', 'no_show'].includes(a.status)
    && new Date(a.start).getTime() < endMs
    && new Date(a.start).getTime() + a.durationMin * 60000 > startMs);
};

/** Пациент, у которого в этот момент нет другой записи. */
const findFreePatient = (startIso, durationMin = 30) => {
  const free = state.patients.find((p) => isPatientFree(p.id, startIso, durationMin));
  if (!free) throw new Error(`Свободного пациента на ${startIso} нет`);
  return free.id;
};

/** Помещается ли запись нужной длительности в сетку врача начиная с этого времени. */
const isDoctorFree = (date, doctorId, time, durationMin = 30) => {
  const rows = buildSlots(date);
  const stepMinutes = 15;
  const i = rows.findIndex((r) => r.time === time);
  if (i < 0) return false;
  const needed = Math.ceil(durationMin / stepMinutes);
  if (i + needed > rows.length) return false;
  return rows.slice(i, i + needed).every((row) => {
    const cell = (row.doctors || []).find((d) => d.id === doctorId);
    return cell && !cell.busy && cell.occupancyKind == null;
  });
};

/** Готовое тело POST /appointments, которое сервер обязан принять. */
const findFreeBooking = (date, doctorId, durationMin = 30) => {
  const slot = findFreeSlot(date, doctorId, durationMin);
  return { doctorId, patientId: findFreePatient(slot.start, durationMin), start: slot.start, durationMin };
};

module.exports = { findFreeSlot, findFreePatient, findFreeBooking, isPatientFree, isDoctorFree };
