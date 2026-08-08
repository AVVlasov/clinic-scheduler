'use strict';

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

const fetchAppointment = async (app, id) => {
  const res = await request(app).get(`/appointments/${id}`);
  expect(res.status).toBe(200);
  return res.body;
};

const snapshot = (a) => ({
  doctorId: a.doctorId,
  patientId: a.patientId,
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

describe('stubs/api/immutability — терминальная запись неизменяема при любом PATCH', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2030-12-02', '2030-12-09', '2030-11-24']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('PATCH без status на completed-записи отклоняется и не мутирует её', async () => {
    const id = await createScheduled(app, 'd-001', 'p-001', '2030-12-09T09:00:00');
    await bringToCompleted(app, id);
    const before = await fetchAppointment(app, id);
    expect(before.status).toBe('completed');

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({ complaints: 'уточнение после закрытия' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');
    expect(typeof patch.body.message).toBe('string');
    expect(patch.body.message.length).toBeGreaterThan(0);

    const after = await fetchAppointment(app, id);
    expect(snapshot(after)).toEqual(snapshot(before));
  });

  test('PATCH {doctorId: d-002} на completed-записи отклоняется (нельзя перебросить к другому врачу)', async () => {
    const id = await createScheduled(app, 'd-001', 'p-002', '2030-12-09T10:00:00');
    await bringToCompleted(app, id);
    const before = await fetchAppointment(app, id);

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({ doctorId: 'd-002' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(after.doctorId).toBe(before.doctorId);
  });

  test('PATCH {start: ...} на completed-записи отклоняется (нельзя сдвинуть время)', async () => {
    const id = await createScheduled(app, 'd-001', 'p-003', '2030-12-09T11:00:00');
    await bringToCompleted(app, id);
    const before = await fetchAppointment(app, id);

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({ start: '2030-12-09T12:00:00' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(after.start).toBe(before.start);
  });

  test('PATCH {paymentType: card} на cancelled-записи отклоняется', async () => {
    const id = await createScheduled(app, 'd-002', 'p-001', '2030-12-09T09:00:00');
    const cancel = await request(app).patch(`/appointments/${id}`).send({ status: 'cancelled' });
    expect(cancel.status).toBe(200);
    const before = await fetchAppointment(app, id);
    expect(before.status).toBe('cancelled');

    const patch = await request(app).patch(`/appointments/${id}`).send({ paymentType: 'card' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(snapshot(after)).toEqual(snapshot(before));
  });

  test('PATCH на no_show-записи отклоняется', async () => {
    const id = await createScheduled(app, 'd-003', 'p-002', '2030-12-09T08:00:00');
    const noShow = await request(app).patch(`/appointments/${id}`).send({ status: 'no_show' });
    expect(noShow.status).toBe(200);
    const before = await fetchAppointment(app, id);

    const patch = await request(app).patch(`/appointments/${id}`).send({ diagnosis: 'дошёл' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(snapshot(after)).toEqual(snapshot(before));
  });

  test('гонка: PATCH без status на записи, завершённой между чтением и записью, отклоняется', async () => {
    const id = await createScheduled(app, 'd-004', 'p-003', '2030-12-09T10:00:00');

    const ref = data.state.appointments.find((x) => x.id === id);
    expect(ref.status).toBe('scheduled');

    const before = await fetchAppointment(app, id);
    expect(before.status).toBe('scheduled');

    ref.status = 'completed';

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({ complaints: 'гонка: попытка править после чужого закрытия' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(after.status).toBe('completed');
    expect(after.complaints).toBeNull();
  });

  test('PATCH {status: "arrived"} на completed-записи отклоняется с той же ошибкой terminal_status', async () => {
    const id = await createScheduled(app, 'd-006', 'p-001', '2030-12-09T14:00:00');
    await bringToCompleted(app, id);
    const before = await fetchAppointment(app, id);
    expect(before.status).toBe('completed');

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({ status: 'arrived' });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('terminal_status');

    const after = await fetchAppointment(app, id);
    expect(after.status).toBe('completed');
    expect(snapshot(after)).toEqual(snapshot(before));
  });

  test('PATCH на не-терминальной записи с полями start/doctorId/protocol проходит как обычно', async () => {
    const id = await createScheduled(app, 'd-005', 'p-004', '2030-12-09T08:30:00');

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({ complaints: 'жалобы', diagnosis: 'ОРВИ', nextVisit: '2031-01-01' });
    expect(patch.status).toBe(200);
    expect(patch.body.complaints).toBe('жалобы');
    expect(patch.body.diagnosis).toBe('ОРВИ');
    expect(patch.body.nextVisit).toBe('2031-01-01');
  });
});

describe('stubs/api/immutability — проверка терминальности живёт в lifecycle.js (one source of truth)', () => {
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
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, 'appointments.js'), 'utf8');
    expect(/require\(['"]\.\/lifecycle['"]\)/.test(src)).toBe(true);
    expect(/isTerminalStatus/.test(src)).toBe(true);
  });

  test('терминальная проверка стоит до любых мутаций (вызов до draft = ...)', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, 'appointments.js'), 'utf8');
    const patchStart = src.indexOf("router.patch('/appointments/:id'");
    expect(patchStart).toBeGreaterThan(-1);
    const terminalIdx = src.indexOf('isTerminalStatus(a.status)', patchStart);
    const draftIdx = src.indexOf('const draft = { ...a }', patchStart);
    expect(terminalIdx).toBeGreaterThan(patchStart);
    expect(terminalIdx).toBeGreaterThan(-1);
    expect(draftIdx).toBeGreaterThan(-1);
    expect(terminalIdx).toBeLessThan(draftIdx);
  });
});

describe('stubs/api/immutability — newId() не даёт коллизий при произвольном составе демо-данных', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2030-12-09', '2030-11-24']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test(
    'после 12 последовательных POST все id уникальны и присутствуют в state',
    async () => {
      // 12 POST подряд через supertest + стабовый таймер 300мс = ~4с минимум;
      // добавляем запас на overhead и обход возможных 409 (slot_taken) в цикле.
      const seen = new Set();
      const baseSlots = [
        '2030-12-09T13:00:00',
        '2030-12-09T13:15:00',
        '2030-12-09T13:30:00',
        '2030-12-09T13:45:00',
      ];
      const doctors = ['d-006', 'd-001', 'd-002'];
      const patients = ['p-001', 'p-002', 'p-003', 'p-004'];

      let attempts = 0;
      outer:
      for (const start of baseSlots) {
        for (const doctorId of doctors) {
          for (const patientId of patients) {
            attempts += 1;
            const res = await request(app)
              .post('/appointments')
              .send({ doctorId, patientId, start, durationMin: 15 });
            expect([201, 409]).toContain(res.status);
            if (res.status !== 201) continue;
            const id = res.body.id;
            expect(seen.has(id)).toBe(false);
            seen.add(id);
            expect(/^a-\d{3,}$/.test(id)).toBe(true);
            if (seen.size >= 12) break outer;
          }
        }
      }
      expect(seen.size).toBeGreaterThanOrEqual(12);

      for (const id of seen) {
        const found = data.state.appointments.find((x) => x.id === id);
        expect(found).toBeDefined();
        expect(found.id).toBe(id);
      }
    },
    15000,
  );

  test('newId() стартует выше любого существующего id, даже если seed не подряд', () => {
    const before = data.state.appointments.map((a) => a.id);
    const max = before.reduce((acc, id) => {
      const m = /^a-(\d+)$/.exec(id);
      return m && Number(m[1]) > acc ? Number(m[1]) : acc;
    }, 0);
    const newOne = data.newId();
    const m = /^a-(\d+)$/.exec(newOne);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThan(max);
    expect(before).not.toContain(newOne);
  });
});

describe('stubs/api/immutability — null для необязательных полей протокола принимается', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2030-12-09', '2030-11-24']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('PATCH {nextVisit: null} принимается, поле становится null', async () => {
    const id = await createScheduled(app, 'd-001', 'p-001', '2030-12-09T12:00:00');

    const setValue = await request(app)
      .patch(`/appointments/${id}`)
      .send({ nextVisit: '2031-04-01' });
    expect(setValue.status).toBe(200);
    expect(setValue.body.nextVisit).toBe('2031-04-01');

    const clear = await request(app)
      .patch(`/appointments/${id}`)
      .send({ nextVisit: null });
    expect(clear.status).toBe(200);
    expect(clear.body.nextVisit).toBeNull();
  });

  test('PATCH {complaints: null} принимается, поле становится null', async () => {
    const id = await createScheduled(app, 'd-002', 'p-002', '2030-12-09T12:00:00');

    const setValue = await request(app)
      .patch(`/appointments/${id}`)
      .send({ complaints: 'головная боль' });
    expect(setValue.status).toBe(200);

    const clear = await request(app)
      .patch(`/appointments/${id}`)
      .send({ complaints: null });
    expect(clear.status).toBe(200);
    expect(clear.body.complaints).toBeNull();
  });

  test('PATCH {diagnosis: null} принимается, поле становится null', async () => {
    const id = await createScheduled(app, 'd-003', 'p-003', '2030-12-09T11:00:00');

    const clear = await request(app)
      .patch(`/appointments/${id}`)
      .send({ diagnosis: null });
    expect(clear.status).toBe(200);
    expect(clear.body.diagnosis).toBeNull();
  });

  test('PATCH {complaints: 12345} по-прежнему отклоняется как 400 invalid_field', async () => {
    const id = await createScheduled(app, 'd-004', 'p-004', '2030-12-09T11:00:00');

    const patch = await request(app)
      .patch(`/appointments/${id}`)
      .send({ complaints: 12345 });
    expect(patch.status).toBe(400);
    expect(patch.body.error).toBe('invalid_field');
    expect(patch.body.message).toContain('complaints');
  });

  test('POST с необязательными полями = null принимается при создании', async () => {
    const res = await request(app)
      .post('/appointments')
      .send({
        doctorId: 'd-005',
        patientId: 'p-001',
        start: '2030-12-09T11:00:00',
        durationMin: 30,
        complaints: null,
        diagnosis: null,
        nextVisit: null,
      });
    expect(res.status).toBe(201);
    expect(res.body.complaints).toBeNull();
    expect(res.body.diagnosis).toBeNull();
    expect(res.body.nextVisit).toBeNull();
  });
});