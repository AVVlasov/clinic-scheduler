'use strict';

/**
 * Ключевые проверки стаба не зависят от TZ процесса.
 * Прогоняется отдельно с TZ=Europe/Moscow, Asia/Vladivostok, America/New_York.
 */

const request = require('supertest');
const express = require('express');

const apiRouter = require('./index');
const data = require('./data');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
  return app;
};

describe(`TASK-47 — timezone invariance (TZ=${process.env.TZ || 'unset'})`, () => {
  let app;

  beforeEach(() => {
    data.resetState();
    app = buildApp();
  });

  test('isoAt даёт +03:00, а не UTC-сдвиг зоны процесса', () => {
    expect(data.isoAt('2030-06-15', 8, 0)).toBe('2030-06-15T08:00:00+03:00');
    expect(data.dateOnly(data.isoAt('2030-06-15', 8, 0))).toBe('2030-06-15');
  });

  test('weekStartOf/dayIndex стабильны для календарной даты', () => {
    expect(data.weekStartOf('2026-08-09')).toBe('2026-08-03'); // вс → пн
    expect(data.weekStartOf('2026-08-10')).toBe('2026-08-10');
    expect(data.dayIndex('2026-08-10')).toBe(0); // пн
    expect(data.dayIndex('2026-08-09')).toBe(6); // вс
  });

  test('запись с +03:00 видна в GET /appointments?date= и проходит shift-check', async () => {
    const weekStart = '2030-06-03'; // пн
    const day = '2030-06-04'; // вт
    const start = `${day}T10:00:00+03:00`;

    const pub = await request(app).post('/week-templates/publish').send({ weekStart });
    expect([200, 409]).toContain(pub.status);

    const create = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start,
      durationMin: 30,
    });
    expect(create.status).toBe(201);
    expect(create.body.start).toBe(start);

    const list = await request(app).get(`/appointments?date=${day}`);
    expect(list.status).toBe(200);
    expect(list.body.items.some((a) => a.id === create.body.id)).toBe(true);

    const schedule = await request(app).get(`/schedule/${day}`);
    expect(schedule.status).toBe(200);
    expect(schedule.body.slots.length).toBeGreaterThan(0);
    const slot = schedule.body.slots.find((s) => s.time === '10:00');
    expect(slot).toBeTruthy();
    const doc = slot.doctors.find((d) => d.id === 'd-001');
    expect(doc).toBeTruthy();
    expect(doc.busy).toBe(true);
  });
});
