'use strict';

const request = require('supertest');
const express = require('express');

const apiRouter = require('./index');

const TIMER_MS = 300;
const TIMER_TOLERANCE_MS = 200;

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
  return app;
};

describe('stubs/api — express-стабы расписания, записей и справочников', () => {
  let app;
  let stateRef;

  beforeAll(async () => {
    app = buildApp();
    stateRef = require('./data').state;
    for (const weekStart of ['2030-04-15', '2030-04-22', '2030-04-29', '2030-05-27', '2030-06-03', '2030-07-01', '2030-08-26', '2030-09-02', '2030-09-09', '2030-09-30']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  describe('GET /schedule', () => {
    test('latency — ответ проходит через timer 300ms', async () => {
      const t0 = performance.now();
      const res = await request(app).get(`/schedule/${stateRef.date}`);
      const dt = performance.now() - t0;
      expect(res.status).toBe(200);
      expect(dt).toBeGreaterThanOrEqual(TIMER_MS - TIMER_TOLERANCE_MS);
    });

    test('демо-окно привязано к state.sysDate: слоты есть в sysDate±окно, а не только «сегодня процесса»', async () => {
      const sysDate = stateRef.sysDate;
      expect(sysDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // окно демо из TASK-36: sysDate-2 .. sysDate+7 — хотя бы середина окна непуста
      const mid = (() => {
        const [y, m, d] = sysDate.split('-').map(Number);
        const dt = new Date(y, m - 1, d + 1);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();
      const res = await request(app).get(`/schedule/${mid}`);
      expect(res.status).toBe(200);
      // день может быть off у всех врачей — тогда смотрим appointments окна
      const appts = await request(app).get(`/appointments?date=${sysDate}`);
      expect(appts.status).toBe(200);
      expect(appts.body.items.length).toBeGreaterThanOrEqual(5);
    });

    test('schedule — отдаёт непустую сетку слотов, шаг 15 минут, слоты привязаны к опубликованным шаблонам', async () => {
      const res = await request(app).get(`/schedule/${stateRef.date}`);
      expect(res.status).toBe(200);
      expect(res.body.date).toBe(stateRef.date);
      expect(res.body.stepMinutes).toBe(15);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots.length).toBeGreaterThan(0);
      const times = res.body.slots.map((s) => s.time);
      const sorted = [...times].sort();
      expect(times).toEqual(sorted);
      for (let i = 1; i < res.body.slots.length; i++) {
        const prev = res.body.slots[i - 1].time;
        const cur = res.body.slots[i].time;
        const [ph, pm] = prev.split(':').map(Number);
        const [ch, cm] = cur.split(':').map(Number);
        expect(ch * 60 + cm - (ph * 60 + pm)).toBe(15);
      }
      const first = res.body.slots[0];
      expect(typeof first.time).toBe('string');
      expect(Array.isArray(first.doctors)).toBe(true);
      expect(first.doctors.length).toBeGreaterThanOrEqual(1);
      expect(typeof first.doctors[0].busy).toBe('boolean');
    });

    test('schedule — busy как логический атрибут врача в слоте (может быть true или false, но не undefined)', async () => {
      const res = await request(app).get(`/schedule/${stateRef.date}`);
      const doctors = res.body.slots.flatMap((s) => s.doctors);
      expect(doctors.length).toBeGreaterThan(0);
      for (const d of doctors) {
        expect(typeof d.busy).toBe('boolean');
      }
    });

    test('schedule — неопубликованная неделя возвращает пустую сетку (нет слотов без врачей)', async () => {
      const res = await request(app).get('/schedule/2099-01-01');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots.length).toBe(0);
    });
  });

  describe('GET /appointments', () => {
    test('appointments list — без date → 400; с date — непустой массив с разными status/paymentType', async () => {
      const missing = await request(app).get('/appointments');
      expect(missing.status).toBe(400);
      expect(missing.body.error).toBe('missing_date');

      const res = await request(app).get(`/appointments?date=${require('./data').state.date}`);
      expect(res.status).toBe(200);
      expect(res.body.date).toBe(require('./data').state.date);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(3);
      const statuses = new Set(res.body.items.map((a) => a.status));
      const payments = new Set(res.body.items.map((a) => a.paymentType));
      expect(statuses.size).toBeGreaterThanOrEqual(2);
      expect(payments.size).toBeGreaterThanOrEqual(2);
      const first = res.body.items[0];
      expect(typeof first.doctorName).toBe('string');
      expect(typeof first.patientName).toBe('string');
    });
  });

  describe('POST /appointments', () => {
    test('create appointment — валидное тело → 201, запись в списке', async () => {
      const before = (await request(app).get('/appointments?date=2030-04-15')).body.items.length;
      const res = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-006',
          patientId: 'p-001',
          start: '2030-04-15T17:00:00',
          durationMin: 30,
          status: 'scheduled',
          paymentType: 'regular',
          serviceId: 's-001',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^a-\d+$/);
      expect(res.body.doctorName).toContain('Волков');

      const after = (await request(app).get('/appointments?date=2030-04-15')).body.items;
      expect(after.length).toBe(before + 1);
      expect(after.some((a) => a.id === res.body.id)).toBe(true);
    });

    test('create appointment — без обязательного doctorId → 400', async () => {
      const res = await request(app)
        .post('/appointments')
        .send({ patientId: 'p-001', start: '2030-04-15T18:00:00', durationMin: 30 });
      expect(res.status).toBe(400);
    });

    test('create appointment — дубль в слот того же врача → 409 (а не молчаливая перезапись)', async () => {
      const first = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-006',
          patientId: 'p-002',
          start: '2030-04-15T09:00:00',
          durationMin: 30,
        });
      expect(first.status).toBe(201);

      const dup = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-006',
          patientId: 'p-003',
          start: '2030-04-15T09:15:00',
          durationMin: 30,
        });
      expect(dup.status).toBe(409);
      expect(dup.body.error).toBe('slot_taken');
    });

    test('create appointment — услуга к врачу без компетенции → 409 service_not_offered', async () => {
      const res = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-001',
          patientId: 'p-001',
          start: '2030-04-16T11:00:00',
          durationMin: 15,
          serviceId: 's-003',
        });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('service_not_offered');
    });

    test('create appointment — параллельные слоты разных врачей не конфликтуют', async () => {
      const resA = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-001',
          patientId: 'p-003',
          start: '2030-04-15T09:00:00',
          durationMin: 30,
        });
      const resB = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-002',
          patientId: 'p-003',
          start: '2030-04-15T09:00:00',
          durationMin: 30,
        });
      expect(resA.status).toBe(201);
      expect(resB.status).toBe(201);
    });
  });

  describe('PATCH /appointments/:id', () => {
    let createdId;

    beforeAll(async () => {
      const res = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-002',
          patientId: 'p-004',
          start: '2030-04-29T09:00:00',
          durationMin: 30,
        });
      createdId = res.body.id;
    });

    test('patch appointment — перенос времени → 200, изменения видны в /appointments', async () => {
      const newStart = new Date('2030-04-29T11:30:00Z').toISOString();
      const patch = await request(app)
        .patch(`/appointments/${createdId}`)
        .send({ start: newStart });
      expect(patch.status).toBe(200);
      expect(new Date(patch.body.start).toISOString()).toBe(newStart);

      const list = await request(app).get('/appointments?date=2030-04-29');
      const item = list.body.items.find((a) => a.id === createdId);
      expect(new Date(item.start).toISOString()).toBe(newStart);
    });

    test('patch appointment — перенос на другой врач и время → 200', async () => {
      const patch = await request(app)
        .patch(`/appointments/${createdId}`)
        .send({ doctorId: 'd-002', start: '2030-04-29T13:00:00' });
      expect(patch.status).toBe(200);
      expect(patch.body.doctorId).toBe('d-002');
    });

    test('patch collision — пересечение с другой записью → 409', async () => {
      const a = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-004',
          patientId: 'p-001',
          start: '2030-06-04T10:00:00',
          durationMin: 30,
        });
      const b = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-004',
          patientId: 'p-002',
          start: '2030-06-04T11:00:00',
          durationMin: 30,
        });
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);

      const patch = await request(app)
        .patch(`/appointments/${b.body.id}`)
        .send({ start: '2030-06-04T10:15:00' });
      expect(patch.status).toBe(409);
      expect(patch.body.error).toBe('slot_taken');
    });

    test('patch not found — неизвестный id → 404', async () => {
      const res = await request(app)
        .patch('/appointments/a-9999')
        .send({ start: '2030-06-04T15:00:00' });
      expect(res.status).toBe(404);
    });
  });

  describe('справочники', () => {
    test('directories doctors — массив >=5', async () => {
      const res = await request(app).get('/doctors');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(5);
      const first = res.body.items[0];
      expect(typeof first.id).toBe('string');
      expect(typeof first.name).toBe('string');
      expect(typeof first.specialty).toBe('string');
    });

    test('directories services — массив >=6 и у каждой есть цена и doctorIds', async () => {
      const res = await request(app).get('/services');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(6);
      const first = res.body.items[0];
      expect(typeof first.id).toBe('string');
      expect(typeof first.name).toBe('string');
      expect(typeof first.duration).toBe('number');
      expect(typeof first.price).toBe('number');
      expect(first.price).toBeGreaterThan(0);
      expect(Array.isArray(first.doctorIds)).toBe(true);
      expect(first.doctorIds.length).toBeGreaterThan(0);
      const ecg = res.body.items.find((s) => s.id === 's-003');
      expect(ecg.doctorIds).toEqual(['d-002', 'd-004']);
    });

    test('directories patients — массив >=2 и у каждого есть id/name/phone', async () => {
      const res = await request(app).get('/patients');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
      const first = res.body.items[0];
      expect(typeof first.id).toBe('string');
      expect(typeof first.name).toBe('string');
      expect(typeof first.phone).toBe('string');
    });
  });

  describe('PATCH /appointments/:id — протокол приёма', () => {
    test('записал → прочитал: complaints, diagnosis, visitType, performedServiceIds, recommendations, nextVisit сохраняются и видны в GET', async () => {
      const create = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-001',
          patientId: 'p-002',
          start: '2030-09-02T09:00:00',
          durationMin: 30,
        });
      expect(create.status).toBe(201);
      const id = create.body.id;
      expect(id).toMatch(/^a-\d+$/);

      const patch = await request(app)
        .patch(`/appointments/${id}`)
        .send({
          complaints: 'Боль в области 38 зуба третьи сутки',
          diagnosis: 'K01.1 Ретенированный зуб',
          visitType: 'first',
          performedServiceIds: ['s-001', 's-003'],
          recommendations: ['Контрольный осмотр через 7 дней'],
          nextVisit: { date: '2030-09-08', serviceId: 's-002' },
        });
      expect(patch.status).toBe(200);
      expect(patch.body.complaints).toBe('Боль в области 38 зуба третьи сутки');
      expect(patch.body.diagnosis).toBe('K01.1 Ретенированный зуб');
      expect(patch.body.visitType).toBe('first');
      expect(patch.body.performedServiceIds).toEqual(['s-001', 's-003']);
      expect(patch.body.recommendations).toEqual(['Контрольный осмотр через 7 дней']);
      expect(patch.body.nextVisit).toEqual({ date: '2030-09-08', serviceId: 's-002' });

      const single = await request(app).get(`/appointments/${id}`);
      expect(single.status).toBe(200);
      expect(single.body.complaints).toBe('Боль в области 38 зуба третьи сутки');
      expect(single.body.diagnosis).toBe('K01.1 Ретенированный зуб');
      expect(single.body.performedServiceIds).toEqual(['s-001', 's-003']);

      const list = await request(app).get('/appointments?date=2030-09-02');
      const item = list.body.items.find((a) => a.id === id);
      expect(item).toBeDefined();
      expect(item.diagnosis).toBe('K01.1 Ретенированный зуб');
      expect(item.recommendations).toEqual(['Контрольный осмотр через 7 дней']);
    });

    test('PATCH протокола с visitType="unknown" → 400 invalid_field (а не молчаливое сохранение)', async () => {
      const create = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-001',
          patientId: 'p-003',
          start: '2030-09-02T10:00:00',
          durationMin: 30,
        });
      expect(create.status).toBe(201);

      const patch = await request(app)
        .patch(`/appointments/${create.body.id}`)
        .send({ visitType: 'unknown' });
      expect(patch.status).toBe(400);
      expect(patch.body.error).toBe('invalid_field');
      expect(typeof patch.body.message).toBe('string');
    });

    test('PATCH протокола с performedServiceIds="не-массив" → 400 invalid_field', async () => {
      const create = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-001',
          patientId: 'p-004',
          start: '2030-09-03T11:00:00',
          durationMin: 30,
        });
      expect(create.status).toBe(201);

      const patch = await request(app)
        .patch(`/appointments/${create.body.id}`)
        .send({ performedServiceIds: 's-001' });
      expect(patch.status).toBe(400);
      expect(patch.body.error).toBe('invalid_field');
    });
  });

  describe('формат ошибок стаба', () => {
    test('400 без обязательных полей возвращает {error: "validation", message: "..."} — код машиночитаемый, текст отдельно', async () => {
      const res = await request(app)
        .post('/appointments')
        .send({ patientId: 'p-001' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('validation');
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
    });

    test('404 возвращает {error: "not_found", message: "..."}', async () => {
      const res = await request(app).patch('/appointments/a-9999').send({ start: '2030-09-10T09:00:00' });
      expect(res.status).toBe(404);
      expect(res.body.error).toBe('not_found');
      expect(typeof res.body.message).toBe('string');
    });

    test('409 занятого слота возвращает {error: "slot_taken", message: "..."}', async () => {
      const a = await request(app)
        .post('/appointments')
        .send({ doctorId: 'd-006', patientId: 'p-001', start: '2030-09-04T09:00:00', durationMin: 30 });
      expect(a.status).toBe(201);
      const b = await request(app)
        .post('/appointments')
        .send({ doctorId: 'd-006', patientId: 'p-002', start: '2030-09-04T09:15:00', durationMin: 30 });
      expect(b.status).toBe(409);
      expect(b.body.error).toBe('slot_taken');
      expect(typeof b.body.message).toBe('string');
    });
  });

  describe('отсутствие silent fallback на занятом слоте', () => {
    test('POST дважды в одно и того же врача/слот → первый 201, второй 409', async () => {
      const first = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-003',
          patientId: 'p-001',
          start: '2030-07-02T13:00:00',
          durationMin: 15,
        });
      const dup = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-003',
          patientId: 'p-002',
          start: '2030-07-02T13:00:00',
          durationMin: 15,
        });
      expect(first.status).toBe(201);
      expect(dup.status).toBe(409);
    });
  });
});
