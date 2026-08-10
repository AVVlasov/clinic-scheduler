'use strict';

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

describe('stubs/api/waitlist — лист ожидания', () => {
  let app;

  beforeEach(() => {
    data.resetState();
    app = buildApp();
  });

  test('POST /waitlist создаёт заявку; GET отдаёт её со счётчиком', async () => {
    const created = await request(app).post('/waitlist').send({
      kind: 'nearest',
      patientId: 'p-001',
      serviceId: 's-001',
      dateFrom: data.state.date,
      dateTo: data.state.date,
      priority: 'high',
      comment: 'нужен ближайший',
    });
    expect(created.status).toBe(201);
    expect(created.body.id).toMatch(/^W-/);
    expect(created.body.kind).toBe('nearest');
    expect(created.body.status).toBe('open');

    const list = await request(app).get('/waitlist');
    expect(list.status).toBe(200);
    expect(list.body.openCount).toBeGreaterThanOrEqual(1);
    expect(list.body.items.some((w) => w.id === created.body.id)).toBe(true);
  });

  test('четыре kind фильтруются отдельно', async () => {
    for (const kind of ['from_doctor', 'distant', 'reschedule', 'nearest']) {
      const res = await request(app).post('/waitlist').send({
        kind,
        patientId: 'p-002',
        doctorId: 'd-001',
        dateFrom: data.state.date,
        dateTo: data.state.date,
      });
      expect(res.status).toBe(201);
    }
    const distant = await request(app).get('/waitlist').query({ kind: 'distant' });
    expect(distant.body.items.every((w) => w.kind === 'distant')).toBe(true);
    expect(distant.body.items.length).toBe(1);
  });

  test('улучшение даты: страховочная запись не отменяется', async () => {
    const date = data.state.date;
    const list = await request(app).get(`/appointments?date=${date}`);
    const active = list.body.items.find((a) => a.status === 'scheduled' || a.status === 'arrived');
    expect(active).toBeTruthy();

    const created = await request(app).post('/waitlist').send({
      kind: 'reschedule',
      patientId: active.patientId,
      serviceId: active.serviceId || 's-001',
      dateFrom: date,
      dateTo: date,
      insuranceAppointmentId: active.id,
      comment: 'улучшение даты',
    });
    expect(created.status).toBe(201);
    expect(created.body.insuranceAppointmentId).toBe(active.id);

    const after = await request(app).get(`/appointments/${active.id}`);
    expect(after.status).toBe(200);
    expect(after.body.status).toBe(active.status);
    expect(after.body.insuranceForWaitlistId).toBe(created.body.id);
  });

  test('copy создаёт новую открытую заявку', async () => {
    const created = await request(app).post('/waitlist').send({
      kind: 'distant',
      patientId: 'p-001',
      doctorId: 'd-002',
      dateFrom: data.state.date,
      dateTo: data.state.date,
      comment: 'исходная',
    });
    const copy = await request(app).post(`/waitlist/${created.body.id}/copy`).send({});
    expect(copy.status).toBe(201);
    expect(copy.body.id).not.toBe(created.body.id);
    expect(copy.body.status).toBe('open');
    expect(copy.body.kind).toBe('distant');
  });

  test('matches → fulfill закрывает заявку записью', async () => {
    const created = await request(app).post('/waitlist').send({
      kind: 'nearest',
      patientId: 'p-003',
      serviceId: 's-001',
      dateFrom: data.state.date,
      dateTo: data.addDays(data.state.date, 2),
    });
    expect(created.status).toBe(201);

    const matches = await request(app).get(`/waitlist/${created.body.id}/matches`);
    expect(matches.status).toBe(200);
    expect(matches.body.items.length).toBeGreaterThan(0);
    const slot = matches.body.items[0];

    const booked = await request(app).post('/appointments').send({
      doctorId: slot.doctorId,
      patientId: 'p-003',
      start: `${slot.date}T${slot.time}:00+03:00`,
      durationMin: 30,
      serviceId: 's-001',
    });
    expect(booked.status).toBe(201);

    const fulfilled = await request(app)
      .post(`/waitlist/${created.body.id}/fulfill`)
      .send({ appointmentId: booked.body.id });
    expect(fulfilled.status).toBe(200);
    expect(fulfilled.body.status).toBe('fulfilled');
    expect(fulfilled.body.fulfilledAppointmentId).toBe(booked.body.id);
  });
});
