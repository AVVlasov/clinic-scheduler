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

const baseDecorate = (a) => ({
  doctorId: a.doctorId,
  patientId: a.patientId,
  start: a.start,
  durationMin: a.durationMin,
  status: a.status,
  paymentType: a.paymentType,
  serviceId: a.serviceId,
});

const fetchAppointment = async (app, id) => {
  const res = await request(app).get(`/appointments/${id}`);
  expect(res.status).toBe(200);
  return res.body;
};

const fetchList = async (app) => {
  const res = await request(app).get('/appointments');
  expect(res.status).toBe(200);
  return res.body.items;
};

const fetchDoctorCards = async (app) => {
  const res = await request(app).get('/doctor-cards');
  expect(res.status).toBe(200);
  return res.body.items;
};

describe('stubs/api/lifecycle — единый источник правил жизни записи', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2026-08-03', '2026-08-10', '2026-08-17']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('lifecycle.js экспортирует все правила (one source of truth)', () => {
    expect(Array.isArray(lifecycle.APPOINTMENT_STATUSES)).toBe(true);
    expect(lifecycle.APPOINTMENT_STATUSES).toEqual([
      'scheduled', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show',
    ]);
    expect(lifecycle.TERMINAL_STATUSES.has('completed')).toBe(true);
    expect(lifecycle.TERMINAL_STATUSES.has('cancelled')).toBe(true);
    expect(lifecycle.TERMINAL_STATUSES.has('no_show')).toBe(true);
    expect(lifecycle.TERMINAL_STATUSES.has('scheduled')).toBe(false);
    expect(lifecycle.ACTIVE_APPOINTMENT_STATUSES.has('scheduled')).toBe(true);
    expect(lifecycle.ACTIVE_APPOINTMENT_STATUSES.has('completed')).toBe(true);
    expect(lifecycle.ACTIVE_APPOINTMENT_STATUSES.has('cancelled')).toBe(false);
    expect(lifecycle.PAYMENT_TYPES).toEqual(['cash', 'card', 'insurance']);
    expect(typeof lifecycle.isStatusTransitionAllowed).toBe('function');
    expect(typeof lifecycle.isTerminalStatus).toBe('function');
    expect(typeof lifecycle.isActiveStatus).toBe('function');
    expect(typeof lifecycle.isAppointmentStatus).toBe('function');
    expect(typeof lifecycle.isPaymentType).toBe('function');
    expect(typeof lifecycle.isWithinPublishedShift).toBe('function');
  });

  test('appointments.js импортирует правила из lifecycle.js', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(path.join(__dirname, 'appointments.js'), 'utf8');
    expect(/require\(['"]\.\/lifecycle['"]\)/.test(src)).toBe(true);
  });

  test('isStatusTransitionAllowed: completed → arrived запрещён', () => {
    expect(lifecycle.isStatusTransitionAllowed('completed', 'arrived')).toBe(false);
    expect(lifecycle.isStatusTransitionAllowed('completed', 'in_progress')).toBe(false);
    expect(lifecycle.isStatusTransitionAllowed('cancelled', 'scheduled')).toBe(false);
    expect(lifecycle.isStatusTransitionAllowed('no_show', 'scheduled')).toBe(false);
    expect(lifecycle.isStatusTransitionAllowed('scheduled', 'arrived')).toBe(true);
    expect(lifecycle.isStatusTransitionAllowed('arrived', 'in_progress')).toBe(true);
    expect(lifecycle.isStatusTransitionAllowed('arrived', 'scheduled')).toBe(true);
    expect(lifecycle.isStatusTransitionAllowed('in_progress', 'completed')).toBe(true);
    expect(lifecycle.isStatusTransitionAllowed('scheduled', 'cancelled')).toBe(true);
    expect(lifecycle.isStatusTransitionAllowed('scheduled', 'no_show')).toBe(true);
  });
});

describe('stubs/api/lifecycle — POST отклоняет выход за смену с outside_shift', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2026-08-10', '2026-08-17']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('POST {start=конец рабочего интервала+1ч, durationMin=60} → 409 outside_shift', async () => {
    const res = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2026-08-10T18:00:00',
      durationMin: 60,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('outside_shift');
    expect(typeof res.body.message).toBe('string');
    expect(res.body.message.length).toBeGreaterThan(0);
  });

  test('POST в неопубликованную неделю → 409 outside_shift', async () => {
    const res = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2099-01-05T10:00:00',
      durationMin: 30,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('outside_shift');
  });

  test('POST в день, когда врач absent → 409 outside_shift', async () => {
    const res = await request(app).post('/appointments').send({
      doctorId: 'd-002',
      patientId: 'p-001',
      start: '2026-08-13T11:00:00',
      durationMin: 30,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('outside_shift');
  });

  test('POST с интервалом, выходящим за смену вправо → 409 outside_shift', async () => {
    const res = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2026-08-10T13:30:00',
      durationMin: 60,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('outside_shift');
  });

  test('POST в смену, но на день off (воскресенье) → 409 outside_shift', async () => {
    const res = await request(app).post('/appointments').send({
      doctorId: 'd-002',
      patientId: 'p-001',
      start: '2026-08-09T11:00:00',
      durationMin: 30,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('outside_shift');
  });
});

describe('stubs/api/lifecycle — POST валидирует status и paymentType', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    const res = await request(app).post('/week-templates/publish').send({ weekStart: '2026-08-10' });
    expect([200, 409]).toContain(res.status);
  });

  test('POST с неизвестным status → 400 invalid_status (запись не создаётся)', async () => {
    const before = await fetchList(app);
    const res = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2026-08-10T09:00:00',
      durationMin: 30,
      status: 'super_done',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_status');
    const after = await fetchList(app);
    expect(after.length).toBe(before.length);
  });

  test('POST с неизвестным paymentType → 400 invalid_payment_type (запись не создаётся)', async () => {
    const before = await fetchList(app);
    const res = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2026-08-10T09:00:00',
      durationMin: 30,
      paymentType: 'bitcoin',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('invalid_payment_type');
    const after = await fetchList(app);
    expect(after.length).toBe(before.length);
  });

  test('POST с валидными status и paymentType проходит', async () => {
    const res = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2026-08-10T09:00:00',
      durationMin: 30,
      status: 'arrived',
      paymentType: 'card',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('arrived');
    expect(res.body.paymentType).toBe('card');
  });
});

describe('stubs/api/lifecycle — PATCH при смене start/doctor/duration тоже проверяет смену', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
    for (const weekStart of ['2026-08-03', '2026-08-10']) {
      const res = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(res.status);
    }
  });

  test('PATCH start на интервал вне смены → 409 outside_shift', async () => {
    const create = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2026-08-10T11:00:00',
      durationMin: 30,
    });
    expect(create.status).toBe(201);
    const id = create.body.id;
    const before = await fetchAppointment(app, id);

    const patch = await request(app).patch(`/appointments/${id}`).send({
      start: '2026-08-10T18:00:00',
    });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('outside_shift');

    const after = await fetchAppointment(app, id);
    expect(baseDecorate(after)).toEqual(baseDecorate(before));
  });

  test('PATCH смены doctorId на врача, который сегодня не работает → 409 outside_shift', async () => {
    const create = await request(app).post('/appointments').send({
      doctorId: 'd-002',
      patientId: 'p-001',
      start: '2026-08-08T12:00:00',
      durationMin: 30,
    });
    expect(create.status).toBe(201);
    const id = create.body.id;
    const before = await fetchAppointment(app, id);

    const patch = await request(app).patch(`/appointments/${id}`).send({
      doctorId: 'd-001',
    });
    expect(patch.status).toBe(409);
    expect(patch.body.error).toBe('outside_shift');

    const after = await fetchAppointment(app, id);
    expect(baseDecorate(after)).toEqual(baseDecorate(before));
  });

  test('PATCH с paymentType=bitcoin → 400 invalid_payment_type', async () => {
    const create = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2026-08-10T13:00:00',
      durationMin: 30,
    });
    expect(create.status).toBe(201);
    const id = create.body.id;
    const before = await fetchAppointment(app, id);

    const patch = await request(app).patch(`/appointments/${id}`).send({
      paymentType: 'bitcoin',
    });
    expect(patch.status).toBe(400);
    expect(patch.body.error).toBe('invalid_payment_type');

    const after = await fetchAppointment(app, id);
    expect(baseDecorate(after)).toEqual(baseDecorate(before));
  });
});

describe('stubs/api/lifecycle — согласованность демо-данных', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  test('seedAppointments: каждая посеянная запись попадает в опубликованный рабочий интервал своего врача на свой день', async () => {
    const items = await fetchList(app);

    // Демо-данные засеяны сразу по двум неделям (текущая + предыдущая),
    // поэтому id заполняют весь диапазон a-001..a-NNN без жёсткого шаблона.
    const seedRecords = items.filter((a) => /^a-\d+$/.test(a.id));
    expect(seedRecords.length).toBeGreaterThan(0);

    const today = data.state.date;
    const weekStart = data.weekStartOf(today);
    expect(data.state.publishedWeeks).toContain(weekStart);

    for (const a of seedRecords) {
      const aDate = String(a.start).slice(0, 10);
      const dayIdx = data.dayIndex(aDate);
      const intervals = data.weekTemplateSeed[a.doctorId][dayIdx] || [];
      const startTime = new Date(a.start).getTime();
      const endTime = startTime + a.durationMin * 60000;
      // Единая предикатная проверка: kind=work И положительная длительность.
      const fits = intervals.some((iv) => {
        if (!data.isWorkingInterval(iv)) return false;
        const ivStart = new Date(`${aDate}T${iv.start}:00`).getTime();
        const ivEnd = new Date(`${aDate}T${iv.end}:00`).getTime();
        return startTime >= ivStart && endTime <= ivEnd;
      });
      expect(fits).toBe(true);
    }
  });

  test('карточка d-004 содержит specialties: [Невролог] (а не пустой список)', async () => {
    const cards = await fetchDoctorCards(app);
    const d004 = cards.find((c) => c.id === 'd-004');
    expect(d004).toBeDefined();
    expect(d004.specialties).toEqual(['Невролог']);
  });
});

describe('stubs/api/lifecycle — обед отрезан от смены и от валидации', () => {
  let app;

  beforeAll(async () => {
    app = buildApp();
  });

  test('isWithinPublishedShift возвращает false для интервала внутри kind=break', () => {
    const date = '2026-08-13';
    const weekStart = data.weekStartOf(date);
    expect(lifecycle.isWithinPublishedShift(
      date,
      `${date}T10:00:00`,
      30,
      'd-001',
      weekStart,
      data.weekTemplateSeed,
      [weekStart],
    )).toBe(false);
  });

  test('break считается outside_shift: POST на обеде d-001 в четверг (08:00–12:00 break) отклоняется', async () => {
    const date = '2026-08-13';
    const weekStart = data.weekStartOf(date);
    const pubRes = await request(app)
      .post('/week-templates/publish')
      .send({ weekStart });
    expect([200, 409]).toContain(pubRes.status);

    const res = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: `${date}T10:00:00`,
      durationMin: 30,
    });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('outside_shift');
  });
});