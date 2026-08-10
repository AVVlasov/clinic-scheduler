'use strict';

const request = require('supertest');
const express = require('express');

const apiRouter = require('./index');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
  return app;
};

const doctorCell = (scheduleBody, time, doctorId) => {
  const slot = scheduleBody.slots.find((s) => s.time === time);
  if (!slot) return null;
  return slot.doctors.find((d) => d.id === doctorId) || null;
};

// Свободную ячейку берём из настоящей сетки, а не назначаем константой: демо-данные дня
// правдоподобны и занимают часть слотов, поэтому «09:00 у d-001» — это не «свободно», а
// совпадение. Тест, который этого не различает, проверяет удачу, а не освобождение слота.
const findFreeCell = (scheduleBody) => {
  for (const slot of scheduleBody.slots) {
    const free = slot.doctors.find((d) => d.busy === false);
    if (free) return { time: slot.time, doctorId: free.id };
  }
  return null;
};

// По одной ячейке на врача: шаг сетки 15 минут, а запись в тесте длится 30 — два соседних
// свободных слота одного врача не независимы, и вторая запись легально упрётся в первую.
const findFreeCells = (scheduleBody, count) => {
  const cells = [];
  const takenDoctors = new Set();
  for (const slot of scheduleBody.slots) {
    for (const doc of slot.doctors) {
      if (doc.busy !== false || takenDoctors.has(doc.id)) continue;
      takenDoctors.add(doc.id);
      cells.push({ time: slot.time, doctorId: doc.id });
      if (cells.length === count) return cells;
    }
  }
  return cells;
};

const findBusyCell = (scheduleBody) => {
  for (const slot of scheduleBody.slots) {
    const taken = slot.doctors.find((d) => d.occupancyKind === 'appointment');
    if (taken) return { time: slot.time, doctorId: taken.id, appointmentId: taken.appointmentId };
  }
  return null;
};

const startIsoOf = (date, time) => `${date}T${time}:00`;

const weekStartOf = (date) => {
  const d = new Date(`${date}T00:00:00`);
  const shift = (d.getDay() + 6) % 7;
  const base = new Date(`${date}T00:00:00`);
  base.setDate(base.getDate() - shift);
  const yyyy = base.getFullYear();
  const mm = String(base.getMonth() + 1).padStart(2, '0');
  const dd = String(base.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

describe('stubs/api — освобождение слота после отмены/неявки', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of [
      weekStartOf('2031-03-04'),
      weekStartOf('2031-04-01'),
      weekStartOf('2031-05-01'),
      weekStartOf('2031-05-02'),
    ]) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('жизненный цикл: слот занят → cancelled → слот свободен → повторная запись успешна', async () => {
    const patientId = 'p-001';
    const durationMin = 30;
    const date = '2031-03-04';

    const scheduleBefore = await request(app).get(`/schedule/${date}`);
    expect(scheduleBefore.status).toBe(200);
    const free = findFreeCell(scheduleBefore.body);
    expect(free).not.toBeNull();
    const { doctorId, time: slotTime } = free;
    const start = startIsoOf(date, slotTime);

    const create = await request(app)
      .post('/appointments')
      .send({ doctorId, patientId, start, durationMin });
    expect(create.status).toBe(201);
    const appointmentId = create.body.id;
    expect(create.body.status).toBe('scheduled');

    const scheduleOccupied = await request(app).get(`/schedule/${date}`);
    const occupiedCell = doctorCell(scheduleOccupied.body, slotTime, doctorId);
    expect(occupiedCell).not.toBeNull();
    expect(occupiedCell.busy).toBe(true);
    expect(occupiedCell.appointmentId).toBe(appointmentId);

    const cancel = await request(app)
      .patch(`/appointments/${appointmentId}`)
      .send({ status: 'cancelled', cancelReason: 'тест' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');

    const scheduleFreed = await request(app).get(`/schedule/${date}`);
    const freedCell = doctorCell(scheduleFreed.body, slotTime, doctorId);
    expect(freedCell).not.toBeNull();
    expect(freedCell.busy).toBe(false);
    expect(freedCell.appointmentId).toBeUndefined();

    const rebook = await request(app)
      .post('/appointments')
      .send({ doctorId, patientId: 'p-002', start, durationMin });
    expect(rebook.status).toBe(201);
    expect(rebook.body.id).not.toBe(appointmentId);

    const scheduleRebooked = await request(app).get(`/schedule/${date}`);
    const rebookedCell = doctorCell(scheduleRebooked.body, slotTime, doctorId);
    expect(rebookedCell).not.toBeNull();
    expect(rebookedCell.busy).toBe(true);
    expect(rebookedCell.appointmentId).toBe(rebook.body.id);
  });

  test('no_show тоже освобождает слот (симметрия с cancelled)', async () => {
    const patientId = 'p-001';
    const durationMin = 30;
    const date = '2031-03-05';

    const scheduleBefore = await request(app).get(`/schedule/${date}`);
    expect(scheduleBefore.status).toBe(200);
    const free = findFreeCell(scheduleBefore.body);
    expect(free).not.toBeNull();
    const { doctorId, time: slotTime } = free;
    const start = startIsoOf(date, slotTime);

    const create = await request(app)
      .post('/appointments')
      .send({ doctorId, patientId, start, durationMin });
    expect(create.status).toBe(201);
    const id = create.body.id;

    let cell = doctorCell((await request(app).get(`/schedule/${date}`)).body, slotTime, doctorId);
    expect(cell.busy).toBe(true);

    const noShow = await request(app)
      .patch(`/appointments/${id}`)
      .send({ status: 'no_show' });
    expect(noShow.status).toBe(200);

    cell = doctorCell((await request(app).get(`/schedule/${date}`)).body, slotTime, doctorId);
    expect(cell.busy).toBe(false);
    expect(cell.appointmentId).toBeUndefined();

    const rebook = await request(app)
      .post('/appointments')
      .send({ doctorId, patientId: 'p-002', start, durationMin });
    expect(rebook.status).toBe(201);
  });

  test('активные записи (scheduled/arrived/in_progress/completed) по-прежнему блокируют слот — регрессия', async () => {
    const date = '2031-04-01';
    const statuses = ['scheduled', 'arrived', 'in_progress', 'completed'];

    const schedule = await request(app).get(`/schedule/${date}`);
    expect(schedule.status).toBe(200);
    const cells = findFreeCells(schedule.body, statuses.length);
    expect(cells).toHaveLength(statuses.length);

    for (let i = 0; i < statuses.length; i += 1) {
      const status = statuses[i];
      const cell = cells[i];
      const start = startIsoOf(date, cell.time);

      const create = await request(app).post('/appointments').send({
        doctorId: cell.doctorId,
        patientId: 'p-001',
        start,
        durationMin: 30,
        status,
      });
      expect(create.status).toBe(201);
      expect(create.body.status).toBe(status);

      const after = doctorCell((await request(app).get(`/schedule/${date}`)).body, cell.time, cell.doctorId);
      expect(after).not.toBeNull();
      expect(after.busy).toBe(true);

      const collides = await request(app)
        .post('/appointments')
        .send({ doctorId: cell.doctorId, patientId: 'p-002', start, durationMin: 30 });
      expect(collides.status).toBe(409);
      expect(collides.body.error).toBe('slot_taken');
    }
  });

  test('GET /appointments после отмены всё ещё содержит запись со статусом cancelled (не удалена, а переведена)', async () => {
    const date = '2031-05-01';
    const schedule = await request(app).get(`/schedule/${date}`);
    expect(schedule.status).toBe(200);
    const free = findFreeCell(schedule.body);
    expect(free).not.toBeNull();

    const create = await request(app)
      .post('/appointments')
      .send({
        doctorId: free.doctorId,
        patientId: 'p-001',
        start: startIsoOf(date, free.time),
        durationMin: 30,
      });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const cancel = await request(app)
      .patch(`/appointments/${id}`)
      .send({ status: 'cancelled', cancelReason: 'тест' });
    expect(cancel.status).toBe(200);

    const list = await request(app).get('/appointments?date=2031-05-01');
    expect(list.status).toBe(200);
    const found = list.body.items.find((a) => a.id === id);
    expect(found).toBeDefined();
    expect(found.status).toBe('cancelled');
  });

  test('POST /appointments в слот, занятый только cancelled-записью → 201 (а не 409)', async () => {
    const date = '2031-05-02';
    const schedule = await request(app).get(`/schedule/${date}`);
    expect(schedule.status).toBe(200);
    const free = findFreeCell(schedule.body);
    expect(free).not.toBeNull();
    const doctorId = free.doctorId;
    const start = startIsoOf(date, free.time);

    const create = await request(app)
      .post('/appointments')
      .send({
        doctorId,
        patientId: 'p-001',
        start,
        durationMin: 30,
      });
    expect(create.status).toBe(201);

    const cancel = await request(app)
      .patch(`/appointments/${create.body.id}`)
      .send({ status: 'cancelled', cancelReason: 'тест' });
    expect(cancel.status).toBe(200);

    const rebook = await request(app)
      .post('/appointments')
      .send({
        doctorId,
        patientId: 'p-002',
        start,
        durationMin: 30,
      });
    expect(rebook.status).toBe(201);
    expect(rebook.body.id).not.toBe(create.body.id);
  });

  // Регрессия: сетка считала занятость по обоим спискам записей, а проверка коллизии — только
  // по созданным через API. Слот, занятый записью дня, выглядел занятым и всё равно принимал
  // второго пациента: расхождение «экран ↔ сервер» ровно того рода, из-за которого заведён гейт.
  test('слот, занятый записью демо-окна, отдаёт 409 и на POST, и на PATCH-переносе', async () => {
    // Дату берём у настоящей записи демо-окна: далёкие недели теперь публикуются пустыми,
    // и «занятая ячейка» там не встречается по определению.
    const { state } = require('./data');
    const demo = (state.demoAppointments || []).find((a) => a.status === 'scheduled');
    expect(demo, 'демо-окно обязано содержать запланированную запись').toBeTruthy();
    const date = String(demo.start).slice(0, 10);

    const schedule = await request(app).get(`/schedule/${date}`);
    expect(schedule.status).toBe(200);

    const busy = findBusyCell(schedule.body);
    expect(busy).not.toBeNull();
    const busyStart = startIsoOf(date, busy.time);

    const collide = await request(app)
      .post('/appointments')
      .send({ doctorId: busy.doctorId, patientId: 'p-002', start: busyStart, durationMin: 30 });
    expect(collide.status).toBe(409);
    expect(collide.body.error).toBe('slot_taken');

    const free = findFreeCell(schedule.body);
    expect(free).not.toBeNull();
    const mine = await request(app).post('/appointments').send({
      doctorId: free.doctorId,
      patientId: 'p-002',
      start: startIsoOf(date, free.time),
      durationMin: 30,
    });
    expect(mine.status).toBe(201);

    const move = await request(app)
      .patch(`/appointments/${mine.body.id}`)
      .send({ doctorId: busy.doctorId, start: busyStart });
    expect(move.status).toBe(409);
    expect(move.body.error).toBe('slot_taken');
  });
});
