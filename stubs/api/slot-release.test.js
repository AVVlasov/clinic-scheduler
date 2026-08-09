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
    const doctorId = 'd-001';
    const patientId = 'p-001';
    const start = '2031-03-04T09:00:00';
    const durationMin = 30;
    const slotTime = '09:00';
    const date = start.slice(0, 10);

    const scheduleBefore = await request(app).get(`/schedule?date=${date}`);
    expect(scheduleBefore.status).toBe(200);

    const create = await request(app)
      .post('/appointments')
      .send({ doctorId, patientId, start, durationMin });
    expect(create.status).toBe(201);
    const appointmentId = create.body.id;
    expect(create.body.status).toBe('scheduled');

    const scheduleOccupied = await request(app).get(`/schedule?date=${date}`);
    const occupiedCell = doctorCell(scheduleOccupied.body, slotTime, doctorId);
    expect(occupiedCell).not.toBeNull();
    expect(occupiedCell.busy).toBe(true);
    expect(occupiedCell.appointmentId).toBe(appointmentId);

    const cancel = await request(app)
      .patch(`/appointments/${appointmentId}`)
      .send({ status: 'cancelled' });
    expect(cancel.status).toBe(200);
    expect(cancel.body.status).toBe('cancelled');

    const scheduleFreed = await request(app).get(`/schedule?date=${date}`);
    const freedCell = doctorCell(scheduleFreed.body, slotTime, doctorId);
    expect(freedCell).not.toBeNull();
    expect(freedCell.busy).toBe(false);
    expect(freedCell.appointmentId).toBeUndefined();

    const rebook = await request(app)
      .post('/appointments')
      .send({ doctorId, patientId: 'p-002', start, durationMin });
    expect(rebook.status).toBe(201);
    expect(rebook.body.id).not.toBe(appointmentId);

    const scheduleRebooked = await request(app).get(`/schedule?date=${date}`);
    const rebookedCell = doctorCell(scheduleRebooked.body, slotTime, doctorId);
    expect(rebookedCell).not.toBeNull();
    expect(rebookedCell.busy).toBe(true);
    expect(rebookedCell.appointmentId).toBe(rebook.body.id);
  });

  test('no_show тоже освобождает слот (симметрия с cancelled)', async () => {
    const doctorId = 'd-002';
    const patientId = 'p-001';
    const start = '2031-03-04T10:00:00';
    const durationMin = 30;
    const slotTime = '10:00';
    const date = start.slice(0, 10);

    const create = await request(app)
      .post('/appointments')
      .send({ doctorId, patientId, start, durationMin });
    expect(create.status).toBe(201);
    const id = create.body.id;

    let cell = doctorCell((await request(app).get(`/schedule?date=${date}`)).body, slotTime, doctorId);
    expect(cell.busy).toBe(true);

    const noShow = await request(app)
      .patch(`/appointments/${id}`)
      .send({ status: 'no_show' });
    expect(noShow.status).toBe(200);

    cell = doctorCell((await request(app).get(`/schedule?date=${date}`)).body, slotTime, doctorId);
    expect(cell.busy).toBe(false);
    expect(cell.appointmentId).toBeUndefined();

    const rebook = await request(app)
      .post('/appointments')
      .send({ doctorId, patientId: 'p-002', start, durationMin });
    expect(rebook.status).toBe(201);
  });

  test('активные записи (scheduled/arrived/in_progress/completed) по-прежнему блокируют слот — регрессия', async () => {
    const cases = [
      { id: 'scheduled-status',   doctorId: 'd-003', start: '2031-04-01T13:00:00', slotTime: '13:00', status: 'scheduled' },
      { id: 'arrived-status',     doctorId: 'd-003', start: '2031-04-01T14:00:00', slotTime: '14:00', status: 'arrived' },
      { id: 'in-progress-status', doctorId: 'd-003', start: '2031-04-01T15:00:00', slotTime: '15:00', status: 'in_progress' },
      { id: 'completed-status',   doctorId: 'd-003', start: '2031-04-01T16:00:00', slotTime: '16:00', status: 'completed' },
    ];

    for (const c of cases) {
      const date = c.start.slice(0, 10);

      const create = await request(app).post('/appointments').send({
        doctorId: c.doctorId,
        patientId: 'p-001',
        start: c.start,
        durationMin: 30,
        status: c.status,
      });
      expect(create.status).toBe(201);
      expect(create.body.status).toBe(c.status);

      const cell = doctorCell((await request(app).get(`/schedule?date=${date}`)).body, c.slotTime, c.doctorId);
      expect(cell).not.toBeNull();
      expect(cell.busy).toBe(true);

      const collides = await request(app)
        .post('/appointments')
        .send({ doctorId: c.doctorId, patientId: 'p-002', start: c.start, durationMin: 30 });
      expect(collides.status).toBe(409);
      expect(collides.body.error).toBe('slot_taken');
    }
  });

  test('GET /appointments после отмены всё ещё содержит запись со статусом cancelled (не удалена, а переведена)', async () => {
    const create = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-004',
        patientId: 'p-001',
        start: '2031-05-01T11:00:00',
        durationMin: 30,
      });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const cancel = await request(app)
      .patch(`/appointments/${id}`)
      .send({ status: 'cancelled' });
    expect(cancel.status).toBe(200);

    const list = await request(app).get('/appointments?date=2031-05-01');
    expect(list.status).toBe(200);
    const found = list.body.items.find((a) => a.id === id);
    expect(found).toBeDefined();
    expect(found.status).toBe('cancelled');
  });

  test('POST /appointments в слот, занятый только cancelled-записью → 201 (а не 409)', async () => {
    const start = '2031-05-02T09:00:00';
    const date = start.slice(0, 10);

    const create = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-002',
        patientId: 'p-001',
        start,
        durationMin: 30,
      });
    expect(create.status).toBe(201);

    const cancel = await request(app)
      .patch(`/appointments/${create.body.id}`)
      .send({ status: 'cancelled' });
    expect(cancel.status).toBe(200);

    const rebook = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-002',
        patientId: 'p-002',
        start,
        durationMin: 30,
      });
    expect(rebook.status).toBe(201);
    expect(rebook.body.id).not.toBe(create.body.id);
  });
});
