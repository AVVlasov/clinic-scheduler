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

describe('stubs/api/mass-cancel — снос расписания', () => {
  let app;

  beforeEach(() => {
    data.resetState();
    app = buildApp();
  });

  test('preview → mass-cancel отменяет записи и создаёт batch с pending', async () => {
    const date = data.state.date;
    const list = await request(app).get(`/appointments?date=${date}`);
    const active = list.body.items.filter((a) =>
      ['scheduled', 'arrived', 'in_progress'].includes(a.status),
    );
    expect(active.length).toBeGreaterThanOrEqual(2);
    const doctorId = active[0].doctorId;
    const same = active.filter((a) => a.doctorId === doctorId);
    expect(same.length).toBeGreaterThanOrEqual(1);

    const preview = await request(app).post('/mass-cancel/preview').send({
      doctorId,
      dateFrom: date,
      dateTo: date,
    });
    expect(preview.status).toBe(200);
    expect(preview.body.affectedCount).toBeGreaterThanOrEqual(same.length);
    expect(preview.body.patients.length).toBe(preview.body.affectedCount);

    const created = await request(app).post('/mass-cancel').send({
      doctorId,
      dateFrom: date,
      dateTo: date,
      reason: 'Врач заболел',
    });
    expect(created.status).toBe(201);
    expect(created.body.id).toMatch(/^mc-/);
    expect(created.body.pendingCount).toBe(created.body.items.length);
    expect(created.body.items.every((i) => i.handlingStatus === 'pending')).toBe(true);

    const cancelled = await request(app).get(`/appointments/${same[0].id}`);
    expect(cancelled.body.status).toBe('cancelled');
    expect(cancelled.body.cancelReason).toMatch(/Врач заболел|Снос/);
  });

  test('reschedule одной из двух уменьшает pendingCount до 1; export содержит поля', async () => {
    const date = data.state.date;
    const list = await request(app).get(`/appointments?date=${date}`);
    const byDoctor = new Map();
    for (const a of list.body.items) {
      if (!['scheduled', 'arrived', 'in_progress'].includes(a.status)) continue;
      const arr = byDoctor.get(a.doctorId) || [];
      arr.push(a);
      byDoctor.set(a.doctorId, arr);
    }
    let doctorId = null;
    for (const [id, arr] of byDoctor) {
      if (arr.length >= 2) {
        doctorId = id;
        break;
      }
    }
    expect(doctorId).toBeTruthy();

    const created = await request(app).post('/mass-cancel').send({
      doctorId,
      dateFrom: date,
      dateTo: date,
    });
    expect(created.status).toBe(201);
    expect(created.body.items.length).toBeGreaterThanOrEqual(2);
    expect(created.body.pendingCount).toBe(created.body.items.length);

    const item = created.body.items[0];
    const matches = await request(app)
      .get(`/mass-cancel/${created.body.id}/matches`)
      .query({ itemId: item.id });
    expect(matches.status).toBe(200);
    expect(matches.body.items.length).toBeGreaterThan(0);
    const slot = matches.body.items[0];

    const booked = await request(app)
      .post(`/mass-cancel/${created.body.id}/items/${item.id}/reschedule`)
      .send({
        doctorId: slot.doctorId,
        start: `${slot.date}T${slot.time}:00+03:00`,
        durationMin: 30,
      });
    expect(booked.status).toBe(200);
    expect(booked.body.item.handlingStatus).toBe('rescheduled');
    expect(booked.body.item.newStart).toBeTruthy();
    expect(booked.body.batch.pendingCount).toBe(created.body.items.length - 1);

    const exported = await request(app).get(`/mass-cancel/${created.body.id}/export`);
    expect(exported.status).toBe(200);
    expect(exported.body.csv).toMatch(/patient;originalStart;doctor;handlingStatus/);
    expect(exported.body.csv).toMatch(/под_отмену|перезаписан/);
    expect(exported.body.csv).toMatch(item.patientName || item.patientId);
  });
});
