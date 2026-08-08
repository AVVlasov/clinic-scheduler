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

const fetchAppointment = async (app, id) => {
  const res = await request(app).get(`/appointments/${id}`);
  expect(res.status).toBe(200);
  return res.body;
};

const snapshotCoreFields = (a) => ({
  doctorId: a.doctorId,
  start: a.start,
  durationMin: a.durationMin,
  status: a.status,
  paymentType: a.paymentType,
  serviceId: a.serviceId,
  complaints: a.complaints,
  diagnosis: a.diagnosis,
  visitType: a.visitType,
  performedServiceIds: [...a.performedServiceIds],
  recommendations: [...a.recommendations],
  nextVisit: a.nextVisit,
});

describe('stubs/api — атомарность PATCH /appointments/:id', () => {
  let app;
  let stateRef;

  beforeAll(async () => {
    app = buildApp();
    stateRef = require('./data').state;
    for (const weekStart of ['2030-11-04', '2030-11-11', '2030-12-01', '2030-12-08']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('PATCH с невалидным протоколом (visitType=unknown) не оставляет следов в записи', async () => {
    const create = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-001',
        patientId: 'p-001',
        start: '2030-11-11T09:00:00',
        durationMin: 30,
        status: 'scheduled',
      });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const before = await fetchAppointment(app, id);

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({
        doctorId: 'd-002',
        start: '2030-11-11T10:30:00',
        visitType: 'unknown',
      });
    expect(patch.status).toBe(400);
    expect(patch.body.error).toBe('invalid_field');

    const after = await fetchAppointment(app, id);
    expect(snapshotCoreFields(after)).toEqual(snapshotCoreFields(before));
  });

  test('PATCH: валидный status=completed вместе с невалидным visitType — ни status, ни что-либо ещё не применяется', async () => {
    const create = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-001',
        patientId: 'p-002',
        start: '2030-11-11T10:00:00',
        durationMin: 30,
        status: 'arrived',
      });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const before = await fetchAppointment(app, id);
    expect(before.status).toBe('arrived');

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({
        status: 'completed',
        visitType: 'invalid-type',
      });
    expect(patch.status).toBe(400);
    expect(patch.body.error).toBe('invalid_field');

    const after = await fetchAppointment(app, id);
    expect(snapshotCoreFields(after)).toEqual(snapshotCoreFields(before));
    expect(after.status).toBe('arrived');
  });

  test('PATCH: коллизия слота отклоняется, запись не мутируется (doctorId/start/durationMin не применяются)', async () => {
    const first = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-002',
        patientId: 'p-003',
        start: '2030-11-12T09:00:00',
        durationMin: 30,
      });
    const second = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-002',
        patientId: 'p-004',
        start: '2030-11-12T10:00:00',
        durationMin: 30,
      });
    expect(first.status).toBe(201);
    expect(second.status).toBe(201);

    const before = await fetchAppointment(app, second.body.id);

    const patch = await request(app)
      .patch(`/appointments/${second.body.id}`)
      .send({
        start: '2030-11-12T09:15:00',
        durationMin: 30,
      });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('slot_taken');

    const after = await fetchAppointment(app, second.body.id);
    expect(snapshotCoreFields(after)).toEqual(snapshotCoreFields(before));
  });

  test('PATCH: валидный doctorId + невалидный протокол — doctorId не применяется', async () => {
    const create = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-001',
        patientId: 'p-001',
        start: '2030-11-11T13:00:00',
        durationMin: 30,
      });
    expect(create.status).toBe(201);
    const id = create.body.id;

    const before = await fetchAppointment(app, id);
    expect(before.doctorId).toBe('d-001');

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({
        doctorId: 'd-002',
        complaints: 12345,
      });
    expect(patch.status).toBe(400);
    expect(patch.body.error).toBe('invalid_field');

    const after = await fetchAppointment(app, id);
    expect(after.doctorId).toBe('d-001');
    expect(after.complaints).toBe(before.complaints);
  });
});

describe('stubs/api — машина состояний статуса записи', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2030-12-01', '2030-12-08']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  const createAt = async (start, patient = 'p-001', doctor = 'd-001') => {
    const res = await request(app)
      .post('/appointments')
      .send({
        doctorId: doctor,
        patientId: patient,
        start,
        durationMin: 30,
      });
    expect(res.status).toBe(201);
    return res.body.id;
  };

  test('completed → arrived отклоняется (409 terminal_status)', async () => {
    const id = await createAt('2030-11-25T09:00:00');

    const toArrived = await request(app).patch(`/appointments/${id}`).send({ status: 'arrived' });
    expect(toArrived.status).toBe(200);
    expect(toArrived.body.status).toBe('arrived');

    const toCompleted = await request(app)
      .patch(`/appointments/${id}`)
      .send({ status: 'completed' });
    expect(toCompleted.status).toBe(200);
    expect(toCompleted.body.status).toBe('completed');

    const after = await fetchAppointment(app, id);
    const beforeBack = snapshotCoreFields(after);

    const back = await request(app).patch(`/appointments/${id}`).send({ status: 'arrived' });
    expect(back.status).toBe(409);
    expect(back.body.error).toBe('terminal_status');
    expect(typeof back.body.message).toBe('string');
    expect(back.body.message.length).toBeGreaterThan(0);

    const afterBack = await fetchAppointment(app, id);
    expect(snapshotCoreFields(afterBack)).toEqual(beforeBack);
    expect(afterBack.status).toBe('completed');
  });

  test('completed → cancelled отклоняется (409 terminal_status)', async () => {
    const id = await createAt('2030-12-02T09:00:00', 'p-002', 'd-001');

    await request(app).patch(`/appointments/${id}`).send({ status: 'arrived' });
    await request(app).patch(`/appointments/${id}`).send({ status: 'completed' });

    const after = await fetchAppointment(app, id);
    const before = snapshotCoreFields(after);

    const patch = await request(app).patch(`/appointments/${id}`).send({ status: 'cancelled' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');

    const after2 = await fetchAppointment(app, id);
    expect(snapshotCoreFields(after2)).toEqual(before);
  });

  test('completed → in_progress отклоняется (терминальный статус)', async () => {
    const id = await createAt('2030-12-03T09:00:00', 'p-003', 'd-002');
    await request(app).patch(`/appointments/${id}`).send({ status: 'arrived' });
    await request(app).patch(`/appointments/${id}`).send({ status: 'in_progress' });
    await request(app).patch(`/appointments/${id}`).send({ status: 'completed' });

    const patch = await request(app).patch(`/appointments/${id}`).send({ status: 'in_progress' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');
  });

  test('scheduled → arrived → completed: разрешённая цепочка работает', async () => {
    const id = await createAt('2030-12-03T10:00:00', 'p-004', 'd-001');

    const r1 = await request(app).patch(`/appointments/${id}`).send({ status: 'arrived' });
    expect(r1.status).toBe(200);
    expect(r1.body.status).toBe('arrived');

    const r2 = await request(app).patch(`/appointments/${id}`).send({ status: 'completed' });
    expect(r2.status).toBe(200);
    expect(r2.body.status).toBe('completed');
  });

  test('scheduled → in_progress → completed: разрешённая цепочка работает', async () => {
    const id = await createAt('2030-12-02T09:00:00', 'p-001', 'd-003');

    const r1 = await request(app).patch(`/appointments/${id}`).send({ status: 'in_progress' });
    expect(r1.status).toBe(200);
    expect(r1.body.status).toBe('in_progress');

    const r2 = await request(app).patch(`/appointments/${id}`).send({ status: 'completed' });
    expect(r2.status).toBe(200);
    expect(r2.body.status).toBe('completed');
  });

  test('scheduled → no_show допустим, completed → no_show отклоняется', async () => {
    const idA = await createAt('2030-11-25T10:00:00', 'p-002', 'd-004');
    const r1 = await request(app).patch(`/appointments/${idA}`).send({ status: 'no_show' });
    expect(r1.status).toBe(200);
    expect(r1.body.status).toBe('no_show');

    const idB = await createAt('2030-11-25T09:00:00', 'p-003', 'd-005');
    await request(app).patch(`/appointments/${idB}`).send({ status: 'arrived' });
    await request(app).patch(`/appointments/${idB}`).send({ status: 'completed' });

    const r2 = await request(app).patch(`/appointments/${idB}`).send({ status: 'no_show' });
    expect(r2.status).toBe(409);
    expect(r2.body.error).toBe('terminal_status');
  });

  test('неизвестный статус → 400 invalid_status (а не молчаливое принятие)', async () => {
    const id = await createAt('2030-11-29T09:00:00', 'p-004', 'd-006');

    const before = await fetchAppointment(app, id);
    const patch = await request(app).patch(`/appointments/${id}`).send({ status: 'super_done' });
    expect(patch.status).toBe(400);
    expect(patch.body.error).toBe('invalid_status');

    const after = await fetchAppointment(app, id);
    expect(snapshotCoreFields(after)).toEqual(snapshotCoreFields(before));
  });

  test('PATCH без поля status на завершённой записи отклоняется (запись неизменяема целиком)', async () => {
    const id = await createAt('2030-12-02T10:00:00', 'p-001', 'd-001');
    await request(app).patch(`/appointments/${id}`).send({ status: 'arrived' });
    await request(app).patch(`/appointments/${id}`).send({ status: 'completed' });

    const before = await fetchAppointment(app, id);

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({ complaints: 'уточнение жалоб после закрытия' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(snapshotCoreFields(after)).toEqual(snapshotCoreFields(before));
    expect(after.complaints).toBe(before.complaints);
  });
});
