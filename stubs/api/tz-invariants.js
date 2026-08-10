'use strict';

/**
 * Инварианты стаба, которые обязаны совпадать в любом часовом поясе процесса.
 *
 * Вынесены из теста в обычный модуль намеренно: один процесс vitest живёт в одной зоне,
 * поэтому «тест прогоняет проверки под TZ=Asia/Vladivostok и America/New_York» (TASK-47 п.2)
 * нельзя выполнить внутри одного прогона. Матричный тест запускает этот модуль отдельным
 * процессом на зону и сверяет отпечатки между собой. Раньше зоны проверялись только тем, что
 * кто-то вручную выставит TZ перед прогоном, — то есть не проверялись.
 *
 * Модуль не знает про vitest: он бросает Error и печатает отпечаток в stdout.
 */

const request = require('supertest');
const express = require('express');

const apiRouter = require('./index');
const data = require('./data');

const assert = (condition, message) => {
  if (!condition) throw new Error(`инвариант нарушен: ${message}`);
};

const run = async () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);

  const fingerprint = {};

  // 1. Наивные времена демо — московские, а не в зоне процесса.
  fingerprint.isoAt = data.isoAt('2030-06-15', 8, 0);
  assert(fingerprint.isoAt === '2030-06-15T08:00:00+03:00', `isoAt дал ${fingerprint.isoAt}`);
  fingerprint.dateOnly = data.dateOnly(fingerprint.isoAt);
  assert(fingerprint.dateOnly === '2030-06-15', `dateOnly дал ${fingerprint.dateOnly}`);

  // 2. Календарная арифметика — по календарю, а не по моменту времени.
  fingerprint.weekStartSunday = data.weekStartOf('2026-08-09');
  fingerprint.weekStartMonday = data.weekStartOf('2026-08-10');
  fingerprint.dayIndexMonday = data.dayIndex('2026-08-10');
  fingerprint.dayIndexSunday = data.dayIndex('2026-08-09');
  assert(fingerprint.weekStartSunday === '2026-08-03', 'воскресенье относится к предыдущей неделе');
  assert(fingerprint.weekStartMonday === '2026-08-10', 'понедельник начинает свою неделю');
  assert(fingerprint.dayIndexMonday === 0 && fingerprint.dayIndexSunday === 6, 'индексы дней');

  // 3. Сквозной путь: публикация → запись → выборка по дате → занятость в сетке.
  const weekStart = '2030-06-03';
  const day = '2030-06-04';
  const start = `${day}T10:00:00+03:00`;

  const pub = await request(app).post('/week-templates/publish').send({ weekStart });
  assert([200, 409].includes(pub.status), `публикация дала ${pub.status}`);

  const create = await request(app).post('/appointments').send({
    doctorId: 'd-001', patientId: 'p-001', start, durationMin: 30,
  });
  assert(create.status === 201, `создание записи дало ${create.status}`);
  fingerprint.storedStart = create.body.start;
  assert(fingerprint.storedStart === start, `старт сохранён как ${fingerprint.storedStart}`);

  const list = await request(app).get(`/appointments?date=${day}`);
  assert(list.status === 200, `выборка дала ${list.status}`);
  assert(list.body.items.some((a) => a.id === create.body.id), 'запись не попала в свой день');

  const schedule = await request(app).get(`/schedule/${day}`);
  assert(schedule.status === 200, `сетка дала ${schedule.status}`);
  fingerprint.slots = schedule.body.slots.length;
  fingerprint.cells = schedule.body.slots.reduce((acc, s) => acc + s.doctors.length, 0);
  const slot = schedule.body.slots.find((s) => s.time === '10:00');
  assert(slot, 'слота 10:00 нет в сетке');
  const doctorCell = slot.doctors.find((d) => d.id === 'd-001');
  assert(doctorCell && doctorCell.busy === true, 'слот записи не помечен занятым');
  fingerprint.busyAt10 = true;

  return fingerprint;
};

module.exports = { run };

// Запуск отдельным процессом: печатает отпечаток одной строкой JSON.
if (require.main === module) {
  run()
    .then((fingerprint) => {
      process.stdout.write(JSON.stringify(fingerprint));
    })
    .catch((err) => {
      process.stderr.write(String(err && err.stack ? err.stack : err));
      process.exit(1);
    });
}
