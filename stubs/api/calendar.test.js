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

const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const sundayOfWeek = (date) => {
  const ws = data.weekStartOf(date);
  return addDays(ws, 6);
};

const dateOnly = (iso) => String(iso).slice(0, 10);

describe('stubs/api/calendar — воскресенье как полноценный день и выборка записей по дате', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  describe('воскресенье — полноценный день модели', () => {
    test('weekTemplateSeed для каждого врача имеет 7 дней (Пн–Вс)', () => {
      for (const doc of data.state.doctors) {
        const seed = data.weekTemplateSeed[doc.id];
        expect(seed).toBeDefined();
        expect(Array.isArray(seed)).toBe(true);
        expect(seed.length).toBe(7);
      }
    });

    test('воскресный интервал для каждого врача — массив, не undefined', () => {
      for (const doc of data.state.doctors) {
        const seed = data.weekTemplateSeed[doc.id];
        const sundayIntervals = seed[6];
        expect(Array.isArray(sundayIntervals)).toBe(true);
        expect(sundayIntervals.length).toBeGreaterThan(0);
        for (const iv of sundayIntervals) {
          expect(typeof iv.kind).toBe('string');
        }
      }
    });

    test('dayIndex для воскресенья возвращает 6', () => {
      const sunday = sundayOfWeek(data.state.sysDate);
      expect(data.dayIndex(sunday)).toBe(6);
    });

    test('GET /schedule?date=<воскресенье> → 200 c пустой сеткой (явный выходной, а не падение)', async () => {
      const sunday = sundayOfWeek(data.state.sysDate);
      const res = await request(app).get(`/schedule?date=${sunday}`);
      expect(res.status).toBe(200);
      expect(res.body.date).toBe(sunday);
      expect(res.body.stepMinutes).toBe(15);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots).toEqual([]);
    });

    test('GET /schedule/:date для воскресенья → 200 c пустой сеткой', async () => {
      const sunday = sundayOfWeek(data.state.sysDate);
      const res = await request(app).get(`/schedule/${sunday}`);
      expect(res.status).toBe(200);
      expect(res.body.date).toBe(sunday);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots).toEqual([]);
    });

    test('buildSlots для воскресенья не падает: возвращает [] без исключений', () => {
      const sunday = sundayOfWeek(data.state.sysDate);
      const slots = data.buildSlots(sunday);
      expect(Array.isArray(slots)).toBe(true);
      expect(slots).toEqual([]);
    });
  });

  describe('GET /appointments — фильтрация по дате', () => {
    test('GET /appointments без ?date= возвращает только записи state.date', async () => {
      const res = await request(app).get('/appointments');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      for (const a of res.body.items) {
        expect(dateOnly(a.start)).toBe(data.state.date);
      }
    });

    test('GET /appointments?date=<воскресенье> → пустой массив items', async () => {
      const sunday = sundayOfWeek(data.state.sysDate);
      const res = await request(app).get(`/appointments?date=${sunday}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items).toEqual([]);
    });

    test('GET /appointments?date=YYYY-MM-DD возвращает только записи этой даты', async () => {
      const targetDate = '2031-07-15';
      const res = await request(app).get(`/appointments?date=${targetDate}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.items)).toBe(true);
      for (const a of res.body.items) {
        expect(dateOnly(a.start)).toBe(targetDate);
      }
    });

    test('записи, созданные на другую дату через POST, не попадают в выборку чужой даты', async () => {
      const targetDate = '2031-08-15';
      const otherDate = '2031-08-16';
      const beforeOther = '2031-08-14';

      const publish = await request(app).post('/week-templates/publish').send({ weekStart: data.weekStartOf(targetDate) });
      expect([200, 409]).toContain(publish.status);

      const create = await request(app)
        .post('/appointments')
        .send({
          doctorId: 'd-001',
          patientId: 'p-001',
          start: `${targetDate}T09:00:00`,
          durationMin: 30,
          status: 'scheduled',
          paymentType: 'cash',
        });
      expect(create.status).toBe(201);
      const id = create.body.id;

      const sameDay = await request(app).get(`/appointments?date=${targetDate}`);
      expect(sameDay.status).toBe(200);
      expect(sameDay.body.items.some((a) => a.id === id)).toBe(true);

      const otherDay = await request(app).get(`/appointments?date=${otherDate}`);
      expect(otherDay.status).toBe(200);
      expect(otherDay.body.items.some((a) => a.id === id)).toBe(false);

      const noDate = await request(app).get(`/appointments?date=${beforeOther}`);
      expect(noDate.status).toBe(200);
      expect(noDate.body.items.some((a) => a.id === id)).toBe(false);

      await request(app).delete(`/appointments/${id}`);
    });

    test('GET /appointments?date=invalid → 400 invalid_date', async () => {
      const res = await request(app).get('/appointments?date=not-a-date');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_date');
    });
  });

  describe('демо-данные не теряются: при системной дате-воскресенье state валиден', () => {
    test('state.sysDate — системная дата в формате ГГГГ-ММ-ДД', () => {
      expect(typeof data.state.sysDate).toBe('string');
      expect(data.state.sysDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('state.date — рабочий день (не воскресенье), даже если sysDate воскресенье', () => {
      expect(typeof data.state.date).toBe('string');
      expect(data.state.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const sysDateIdx = data.dayIndex(data.state.sysDate);
      const effDateIdx = data.dayIndex(data.state.date);
      if (sysDateIdx === 6) {
        expect(effDateIdx).toBe(0);
      } else {
        expect(effDateIdx).toBe(sysDateIdx);
      }
    });

    test('seedAppointments посеял данные для рабочего дня — в state.appointments есть записи', () => {
      expect(Array.isArray(data.state.appointments)).toBe(true);
      expect(data.state.appointments.length).toBeGreaterThan(0);
      for (const a of data.state.appointments) {
        expect(dateOnly(a.start)).toBe(data.state.date);
      }
    });

    test('GET /appointments по state.date возвращает посеянные данные', async () => {
      const res = await request(app).get(`/appointments?date=${data.state.date}`);
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(data.state.appointments.length);
    });
  });
});