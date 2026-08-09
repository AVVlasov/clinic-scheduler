'use strict';

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const express = require('express');

const apiRouter = require('./index');
const data = require('./data');
const lifecycle = require('./lifecycle');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
  return app;
};

const shiftDate = (from, days) => {
  const [y, m, d] = from.split('-').map(Number);
  const date = new Date(y, m - 1, d + days);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const fetchAppointment = async (app, id) => {
  const res = await request(app).get(`/appointments/${id}`);
  expect(res.status).toBe(200);
  return res.body;
};

const fetchList = async (app, date) => {
  const url = date ? `/appointments?date=${date}` : '/appointments';
  const res = await request(app).get(url);
  expect(res.status).toBe(200);
  return res.body.items;
};

const snapshot = (a) => ({
  doctorId: a.doctorId,
  patientId: a.patientId,
  start: a.start,
  durationMin: a.durationMin,
  status: a.status,
  paymentType: a.paymentType,
  serviceId: a.serviceId,
});

const createScheduled = async (app, doctorId, patientId, start, durationMin = 30) => {
  const res = await request(app)
    .post('/appointments')
    .send({ doctorId, patientId, start, durationMin });
  expect(res.status).toBe(201);
  return res.body.id;
};

const bringToCompleted = async (app, id) => {
  const r1 = await request(app).patch(`/appointments/${id}`).send({ status: 'arrived' });
  expect(r1.status).toBe(200);
  const r2 = await request(app).patch(`/appointments/${id}`).send({ status: 'completed' });
  expect(r2.status).toBe(200);
};

describe('stubs/api/delete-guard — DELETE уважает терминальность', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2030-12-02', '2030-12-09', '2030-11-24']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('DELETE на completed-записи отклоняется 409 terminal_status и не удаляет запись', async () => {
    const id = await createScheduled(app, 'd-001', 'p-001', '2030-12-09T09:00:00');
    await bringToCompleted(app, id);
    const before = await fetchAppointment(app, id);
    expect(before.status).toBe('completed');

    const del = await request(app).delete(`/appointments/${id}`);
    expect(del.status).toBe(409);
    expect(del.body.error).toBe('terminal_status');
    expect(typeof del.body.message).toBe('string');
    expect(del.body.message.length).toBeGreaterThan(0);

    const after = await fetchAppointment(app, id);
    expect(snapshot(after)).toEqual(snapshot(before));
  });

  test('DELETE на cancelled-записи отклоняется 409 terminal_status', async () => {
    const id = await createScheduled(app, 'd-002', 'p-001', '2030-12-09T09:00:00');
    const cancel = await request(app).patch(`/appointments/${id}`).send({ status: 'cancelled' });
    expect(cancel.status).toBe(200);
    const before = await fetchAppointment(app, id);
    expect(before.status).toBe('cancelled');

    const del = await request(app).delete(`/appointments/${id}`);
    expect(del.status).toBe(409);
    expect(del.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(snapshot(after)).toEqual(snapshot(before));
  });

  test('DELETE на no_show-записи отклоняется 409 terminal_status', async () => {
    const id = await createScheduled(app, 'd-003', 'p-002', '2030-12-09T08:00:00');
    const noShow = await request(app).patch(`/appointments/${id}`).send({ status: 'no_show' });
    expect(noShow.status).toBe(200);
    const before = await fetchAppointment(app, id);

    const del = await request(app).delete(`/appointments/${id}`);
    expect(del.status).toBe(409);
    expect(del.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(snapshot(after)).toEqual(snapshot(before));
  });

  test('DELETE на scheduled-записи физически удаляет запись (204, пропадает из списка)', async () => {
    const id = await createScheduled(app, 'd-004', 'p-003', '2030-12-09T10:00:00');
    const listBefore = await fetchList(app, '2030-12-09');
    expect(listBefore.some((a) => a.id === id)).toBe(true);

    const del = await request(app).delete(`/appointments/${id}`);
    expect(del.status).toBe(204);

    const listAfter = await fetchList(app, '2030-12-09');
    expect(listAfter.some((a) => a.id === id)).toBe(false);

    const get404 = await request(app).get(`/appointments/${id}`);
    expect(get404.status).toBe(404);
  });

  test('DELETE на arrived/in_progress-записи проходит (это НЕ терминальные)', async () => {
    const idA = await createScheduled(app, 'd-005', 'p-004', '2030-12-09T11:00:00');
    const arrived = await request(app).patch(`/appointments/${idA}`).send({ status: 'arrived' });
    expect(arrived.status).toBe(200);
    const delA = await request(app).delete(`/appointments/${idA}`);
    expect(delA.status).toBe(204);

    const idB = await createScheduled(app, 'd-006', 'p-001', '2030-12-09T12:00:00');
    const inProg = await request(app).patch(`/appointments/${idB}`).send({ status: 'in_progress' });
    expect(inProg.status).toBe(200);
    const delB = await request(app).delete(`/appointments/${idB}`);
    expect(delB.status).toBe(204);
  });

  test('DELETE несуществующей записи возвращает 404', async () => {
    const del = await request(app).delete('/appointments/a-does-not-exist');
    expect(del.status).toBe(404);
    expect(del.body.error).toBe('not_found');
  });
});

describe('stubs/api/delete-guard — проверка терминальности живёт в lifecycle.js', () => {
  test('lifecycle.js экспортирует isTerminalStatus', () => {
    expect(typeof lifecycle.isTerminalStatus).toBe('function');
    expect(lifecycle.isTerminalStatus('completed')).toBe(true);
    expect(lifecycle.isTerminalStatus('cancelled')).toBe(true);
    expect(lifecycle.isTerminalStatus('no_show')).toBe(true);
    expect(lifecycle.isTerminalStatus('scheduled')).toBe(false);
    expect(lifecycle.isTerminalStatus('arrived')).toBe(false);
    expect(lifecycle.isTerminalStatus('in_progress')).toBe(false);
  });

  test('appointments.js использует isTerminalStatus из lifecycle.js (а не локальный Set)', () => {
    const src = fs.readFileSync(path.join(__dirname, 'appointments.js'), 'utf8');
    expect(/require\(['"]\.\/lifecycle['"]\)/.test(src)).toBe(true);
    expect(/isTerminalStatus/.test(src)).toBe(true);
  });

  test('терминальная проверка в DELETE стоит ДО splice, до любых мутаций', () => {
    const src = fs.readFileSync(path.join(__dirname, 'appointments.js'), 'utf8');
    const deleteStart = src.indexOf("router.delete('/appointments/:id'");
    expect(deleteStart).toBeGreaterThan(-1);
    const terminalIdx = src.indexOf('isTerminalStatus(', deleteStart);
    const spliceIdx = src.indexOf('.splice(', deleteStart);
    expect(terminalIdx).toBeGreaterThan(deleteStart);
    expect(terminalIdx).toBeGreaterThan(-1);
    expect(spliceIdx).toBeGreaterThan(-1);
    expect(terminalIdx).toBeLessThan(spliceIdx);
  });
});

describe('stubs/api/delete-guard — гонка: DELETE на завершённой между чтением и удалением отклоняется', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2030-12-02', '2030-12-09']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('DELETE после внешнего перевода в completed отклоняется', async () => {
    const id = await createScheduled(app, 'd-004', 'p-004', '2030-12-09T15:30:00');
    const ref = data.state.appointments.find((x) => x.id === id);
    expect(ref.status).toBe('scheduled');

    ref.status = 'completed';

    const del = await request(app).delete(`/appointments/${id}`);
    expect(del.status).toBe(409);
    expect(del.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(after.status).toBe('completed');
  });
});
