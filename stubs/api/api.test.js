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

  beforeAll(() => {
    app = buildApp();
    stateRef = require('./data').state;
  });

  describe('GET /schedule', () => {
    test('latency — ответ проходит через timer 300ms', async () => {
      const t0 = Date.now();
      const res = await request(app).get(`/schedule?date=${stateRef.date}`);
      const dt = Date.now() - t0;
      expect(res.status).toBe(200);
      expect(dt).toBeGreaterThanOrEqual(TIMER_MS - TIMER_TOLERANCE_MS);
    });

    test('schedule — отдаёт непустую сетку слотов с >=5 врачами и шагом 15 минут', async () => {
      const res = await request(app).get(`/schedule?date=${stateRef.date}`);
      expect(res.status).toBe(200);
      expect(res.body.date).toBe(stateRef.date);
      expect(res.body.stepMinutes).toBe(15);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots.length).toBeGreaterThanOrEqual(48);
      const first = res.body.slots[0];
      expect(typeof first.time).toBe('string');
      expect(Array.isArray(first.doctors)).toBe(true);
      expect(first.doctors.length).toBeGreaterThanOrEqual(5);
      expect(typeof first.doctors[0].busy).toBe('boolean');
    });

    test('schedule — хотя бы один слот имеет busy=true (visit на сегодня)', async () => {
      const res = await request(app).get(`/schedule?date=${stateRef.date}`);
      const anyBusy = res.body.slots.some((s) => s.doctors.some((d) => d.busy));
      expect(anyBusy).toBe(true);
    });

    test('schedule — пустая дата возвращает сетку без busy (нет коллизий)', async () => {
      const res = await request(app).get('/schedule/2099-01-01');
      expect(res.status).toBe(200);
      expect(res.body.slots.length).toBeGreaterThanOrEqual(48);
      const anyBusy = res.body.slots.some((s) => s.doctors.some((d) => d.busy));
      expect(anyBusy).toBe(false);
    });
  });

  describe('GET /appointments', () => {
    test('appointments list — возвращает непустой массив с разными status/paymentType', async () => {
      const res = await request(app).get('/appointments');
      expect(res.status).toBe(200);
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
      const before = (await request(app).get('/appointments')).body.items.length;
      const res = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-006',
          patientId: 'p-001',
          start: '2030-04-15T17:00:00',
          durationMin: 30,
          status: 'scheduled',
          paymentType: 'cash',
          serviceId: 's-001',
        });
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^a-\d{3}$/);
      expect(res.body.doctorName).toContain('Волков');

      const after = (await request(app).get('/appointments')).body.items;
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
          start: '2030-04-16T09:00:00',
          durationMin: 30,
        });
      expect(first.status).toBe(201);

      const dup = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-006',
          patientId: 'p-003',
          start: '2030-04-16T09:15:00',
          durationMin: 30,
        });
      expect(dup.status).toBe(409);
      expect(dup.body.error).toBe('slot_taken');
    });

    test('create appointment — параллельные слоты разных врачей не конфликтуют', async () => {
      const resA = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-001',
          patientId: 'p-003',
          start: '2030-04-17T09:00:00',
          durationMin: 30,
        });
      const resB = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-002',
          patientId: 'p-003',
          start: '2030-04-17T09:00:00',
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
          doctorId: 'd-005',
          patientId: 'p-004',
          start: '2030-05-01T09:00:00',
          durationMin: 30,
        });
      createdId = res.body.id;
    });

    test('patch appointment — перенос времени → 200, изменения видны в /appointments', async () => {
      const newStart = new Date('2030-05-01T11:30:00Z').toISOString();
      const patch = await request(app)
        .patch(`/appointments/${createdId}`)
        .send({ start: newStart });
      expect(patch.status).toBe(200);
      expect(new Date(patch.body.start).toISOString()).toBe(newStart);

      const list = await request(app).get('/appointments');
      const item = list.body.items.find((a) => a.id === createdId);
      expect(new Date(item.start).toISOString()).toBe(newStart);
    });

    test('patch appointment — перенос на другой врач и время → 200', async () => {
      const patch = await request(app)
        .patch(`/appointments/${createdId}`)
        .send({ doctorId: 'd-002', start: '2030-05-01T14:00:00' });
      expect(patch.status).toBe(200);
      expect(patch.body.doctorId).toBe('d-002');
    });

    test('patch collision — пересечение с другой записью → 409', async () => {
      const a = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-004',
          patientId: 'p-001',
          start: '2030-06-01T09:00:00',
          durationMin: 30,
        });
      const b = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-004',
          patientId: 'p-002',
          start: '2030-06-01T10:00:00',
          durationMin: 30,
        });
      expect(a.status).toBe(201);
      expect(b.status).toBe(201);

      const patch = await request(app)
        .patch(`/appointments/${b.body.id}`)
        .send({ start: '2030-06-01T09:15:00' });
      expect(patch.status).toBe(409);
      expect(patch.body.error).toBe('slot_taken');
    });

    test('patch not found — неизвестный id → 404', async () => {
      const res = await request(app)
        .patch('/appointments/a-9999')
        .send({ start: '2030-06-01T15:00:00' });
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

    test('directories services — массив >=6 и у каждой есть цена', async () => {
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
    });
  });

  describe('PATCH /appointments/:id — протокол приёма', () => {
    test('записал → прочитал: complaints, diagnosis, visitType, performedServiceIds, recommendations, nextVisit сохраняются и видны в GET', async () => {
      const create = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-001',
          patientId: 'p-002',
          start: '2030-09-01T09:00:00',
          durationMin: 30,
        });
      expect(create.status).toBe(201);
      const id = create.body.id;
      expect(id).toMatch(/^a-\d{3}$/);

      const patch = await request(app)
        .patch(`/appointments/${id}`)
        .send({
          complaints: 'Боль в области 38 зуба третьи сутки',
          diagnosis: 'K01.1 Ретенированный зуб',
          visitType: 'first',
          performedServiceIds: ['s-001', 's-003'],
          recommendations: ['Контрольный осмотр через 7 дней'],
          nextVisit: '2030-09-08',
        });
      expect(patch.status).toBe(200);
      expect(patch.body.complaints).toBe('Боль в области 38 зуба третьи сутки');
      expect(patch.body.diagnosis).toBe('K01.1 Ретенированный зуб');
      expect(patch.body.visitType).toBe('first');
      expect(patch.body.performedServiceIds).toEqual(['s-001', 's-003']);
      expect(patch.body.recommendations).toEqual(['Контрольный осмотр через 7 дней']);
      expect(patch.body.nextVisit).toBe('2030-09-08');

      const single = await request(app).get(`/appointments/${id}`);
      expect(single.status).toBe(200);
      expect(single.body.complaints).toBe('Боль в области 38 зуба третьи сутки');
      expect(single.body.diagnosis).toBe('K01.1 Ретенированный зуб');
      expect(single.body.performedServiceIds).toEqual(['s-001', 's-003']);

      const list = await request(app).get('/appointments');
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
        .send({ doctorId: 'd-006', patientId: 'p-001', start: '2030-10-01T09:00:00', durationMin: 30 });
      expect(a.status).toBe(201);
      const b = await request(app)
        .post('/appointments')
        .send({ doctorId: 'd-006', patientId: 'p-002', start: '2030-10-01T09:15:00', durationMin: 30 });
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
          start: '2030-07-01T13:00:00',
          durationMin: 15,
        });
      const dup = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-003',
          patientId: 'p-002',
          start: '2030-07-01T13:00:00',
          durationMin: 15,
        });
      expect(first.status).toBe(201);
      expect(dup.status).toBe(409);
    });
  });
});
