'use strict';

/**
 * Необратимые действия администратора спрашивают и показывают последствия.
 *
 * До этой волны «Снять публикацию» одним кликом без вопроса удаляла все записи
 * недели любых статусов, а повторная публикация их не возвращала: промах мышью
 * уничтожал смену. Правка интервала шаблона переписывала день врача целиком и не
 * смотрела на записи — пациенты оставались в базе, но пропадали из сетки, потому
 * что перерыв рисовался раньше, чем искалась запись.
 */

const request = require('supertest');
const express = require('express');

const apiRouter = require('./index');
const data = require('./data');
const { findFreeSlot, findFreePatient } = require('./free-slot.testkit');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
  return app;
};

describe('stubs/api — необратимое действие спрашивает и показывает последствия', () => {
  let app;

  beforeEach(() => {
    data.resetState();
    app = buildApp();
  });

  test('снятие публикации без подтверждения отказывает и называет число записей', async () => {
    const weekStart = data.weekStartOf(data.state.sysDate);
    const res = await request(app).post('/week-templates/unpublish').send({ weekStart });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('week_has_appointments');
    expect(res.body.affected).toBeGreaterThan(0);
    expect(data.state.publishedWeeks).toContain(weekStart);
  });

  test('снятие публикации с подтверждением не удаляет ни одной записи', async () => {
    const weekStart = data.weekStartOf(data.state.sysDate);
    const before = data.state.demoAppointments.concat(data.state.appointments).length;

    const res = await request(app)
      .post('/week-templates/unpublish')
      .send({ weekStart, confirmed: true });
    expect(res.status).toBe(200);
    expect(data.state.publishedWeeks).not.toContain(weekStart);

    const after = data.state.demoAppointments.concat(data.state.appointments).length;
    expect(after, 'снятие публикации не должно трогать записи').toBe(before);

    // И после повторной публикации записи те же — восстанавливать нечего.
    const again = await request(app).post('/week-templates/publish').send({ weekStart });
    expect(again.status).toBe(200);
    expect(data.state.demoAppointments.concat(data.state.appointments).length).toBe(before);
  });

  test('перевод интервала в перерыв поверх записанных пациентов отказывает и называет их', async () => {
    const date = data.state.sysDate;
    const withAppointments = data.state.demoAppointments.find((a) => a.start.slice(0, 10) === date
      && a.status !== 'cancelled' && a.status !== 'no_show');
    expect(withAppointments, 'в демо-дне нет активной записи').toBeTruthy();

    const res = await request(app).patch('/week-templates/interval').send({
      weekStart: data.weekStartOf(date),
      doctorId: withAppointments.doctorId,
      date,
      intervals: [{ kind: 'break', start: '08:00', end: '20:00' }],
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('interval_has_appointments');
    expect(Array.isArray(res.body.affected)).toBe(true);
    expect(res.body.affected.length).toBeGreaterThan(0);
    expect(res.body.affected[0]).toHaveProperty('patientName');
    expect(res.body.affected[0].patientName).not.toMatch(/^p-\d+$/);
    expect(res.body.affected[0].time).toMatch(/^\d{2}:\d{2}$/);
  });

  test('запись под перерывом видна в сетке как запись, а не исчезает', async () => {
    const date = data.state.sysDate;
    const target = data.state.demoAppointments.find((a) => a.start.slice(0, 10) === date
      && a.status !== 'cancelled' && a.status !== 'no_show');
    expect(target).toBeTruthy();

    const patch = await request(app).patch('/week-templates/interval').send({
      weekStart: data.weekStartOf(date),
      doctorId: target.doctorId,
      date,
      intervals: [{ kind: 'break', start: '08:00', end: '20:00' }],
      confirmed: true,
    });
    expect(patch.status).toBe(200);

    const schedule = await request(app).get(`/schedule/${date}`);
    expect(schedule.status).toBe(200);
    const cells = schedule.body.slots.flatMap((s) => s.doctors.filter((d) => d.id === target.doctorId));
    const shown = cells.filter((c) => c.appointmentId === target.id);
    expect(shown.length, 'запись пропала из сетки под перерывом').toBeGreaterThan(0);
    expect(shown[0].occupancyKind).toBe('appointment');
    expect(shown[0].conflictWith, 'конфликт «запись поверх перерыва» не помечен').toBe('break');
  });

  test('новая запись в закрытое перерывом время всё равно не создаётся', async () => {
    const date = data.state.sysDate;
    const doctorId = 'd-001';
    const slot = findFreeSlot(date, doctorId, 30);
    const patientId = findFreePatient(slot.start, 30);

    await request(app).patch('/week-templates/interval').send({
      weekStart: data.weekStartOf(date),
      doctorId,
      date,
      intervals: [{ kind: 'break', start: '08:00', end: '20:00' }],
      confirmed: true,
    });

    const res = await request(app).post('/appointments').send({
      doctorId,
      patientId,
      start: slot.start,
      durationMin: 30,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('outside_shift');
  });
});
