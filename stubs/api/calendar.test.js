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
      const res = await request(app).get(`/schedule/${sunday}`);
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
    test('GET /appointments без ?date= → 400 missing_date', async () => {
      const res = await request(app).get('/appointments');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('missing_date');
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
          doctorId: 'd-006',
          patientId: 'p-001',
          start: `${targetDate}T19:30:00`,
          durationMin: 30,
          status: 'scheduled',
          paymentType: 'regular',
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

  describe('демо-данные не теряются: state засеян на любое окно sysDate-2..sysDate+7', () => {
    test('state.sysDate — системная дата в формате ГГГГ-ММ-ДД', () => {
      expect(typeof data.state.sysDate).toBe('string');
      expect(data.state.sysDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('state.date совпадает с sysDate (сдвига effectiveDate больше нет)', () => {
      expect(typeof data.state.date).toBe('string');
      expect(data.state.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(data.state.date).toBe(data.state.sysDate);
    });

    test('seedAppointments посеял данные: на каждый день окна есть записи state.demoAppointments', () => {
      expect(Array.isArray(data.state.appointments)).toBe(true);
      expect(Array.isArray(data.state.demoAppointments)).toBe(true);
      expect(data.state.demoAppointments.length).toBeGreaterThan(0);
      const addDays = (s, n) => {
        const d = new Date(`${s}T00:00:00`);
        d.setDate(d.getDate() + n);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dd}`;
      };
      const seen = new Set();
      for (const a of data.state.demoAppointments) {
        seen.add(dateOnly(a.start));
      }
      let workingDaysWithRecords = 0;
      for (let i = -2; i <= 7; i += 1) {
        const dt = addDays(data.state.sysDate, i);
        const dayIdx = data.dayIndex(dt);
        const hasWorking = data.state.doctors.some((doc) => {
          const ivs = data.weekTemplateSeed[doc.id] || [];
          const arr = ivs[dayIdx] || [];
          return arr.some((iv) => data.isWorkingInterval(iv));
        });
        if (hasWorking) {
          expect(seen.has(dt)).toBe(true);
          workingDaysWithRecords += 1;
        }
      }
      expect(workingDaysWithRecords).toBeGreaterThan(0);
    });

    test('GET /appointments по state.date возвращает только записи этой даты', async () => {
      const res = await request(app).get(`/appointments?date=${data.state.date}`);
      expect(res.status).toBe(200);
      for (const a of res.body.items) {
        expect(dateOnly(a.start)).toBe(data.state.date);
      }
    });
  });

  describe('демо-стенд живёт в любой день окна sysDate-2..sysDate+7', () => {
    test('R1: для каждого рабочего дня окна GET /schedule?date=d возвращает непустой slots', async () => {
      let checkedWorkingDays = 0;
      for (let i = -2; i <= 7; i += 1) {
        const dt = addDays(data.state.sysDate, i);
        const dayIdx = data.dayIndex(dt);
        const hasWorking = data.state.doctors.some((doc) => {
          const ivs = data.weekTemplateSeed[doc.id] || [];
          const arr = ivs[dayIdx] || [];
          return arr.some((iv) => data.isWorkingInterval(iv));
        });
        if (!hasWorking) continue;
        const res = await request(app).get(`/schedule/${dt}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.slots)).toBe(true);
        expect(res.body.slots.length).toBeGreaterThan(0);
        checkedWorkingDays += 1;
      }
      expect(checkedWorkingDays).toBeGreaterThan(0);
    });

    test('R1: для каждого рабочего дня окна GET /appointments?date=d возвращает ≥5 записей', async () => {
      let checkedWorkingDays = 0;
      for (let i = -2; i <= 7; i += 1) {
        const dt = addDays(data.state.sysDate, i);
        const dayIdx = data.dayIndex(dt);
        const hasWorking = data.state.doctors.some((doc) => {
          const ivs = data.weekTemplateSeed[doc.id] || [];
          const arr = ivs[dayIdx] || [];
          return arr.some((iv) => data.isWorkingInterval(iv));
        });
        if (!hasWorking) continue;
        const res = await request(app).get(`/appointments?date=${dt}`);
        expect(res.status).toBe(200);
        expect(res.body.items.length).toBeGreaterThanOrEqual(5);
        checkedWorkingDays += 1;
      }
      expect(checkedWorkingDays).toBeGreaterThan(0);
    });

    test('R1a: статусы правдоподобны относительно sysDate (прошедшие=терминальные, будущие=scheduled, сегодня=смесь)', async () => {
      const sysDate = data.state.sysDate;
      const collect = async (offset) => {
        const dt = addDays(sysDate, offset);
        const res = await request(app).get(`/appointments?date=${dt}`);
        expect(res.status).toBe(200);
        return res.body.items;
      };

      const past = await collect(-2);
      for (const a of past) {
        expect(['completed', 'no_show', 'cancelled']).toContain(a.status);
      }

      const future = await collect(+7);
      for (const a of future) {
        expect(a.status).toBe('scheduled');
      }

      const today = await collect(0);
      const todayStatuses = new Set(today.map((a) => a.status));
      expect(todayStatuses.size).toBeGreaterThan(1);
      // Среди статусов сегодня как минимум должен быть in_progress (статус «на приёме»).
      expect(todayStatuses.has('in_progress')).toBe(true);
    });

    // Решение владельца (TASK-36 п.4, редакция от 2026-08-10): публикация создаёт СЛОТЫ,
    // а не записи. Первая редакция требовала обратного, и посеянная запись выдавала только
    // что опубликованную неделю за частично распроданную: администратор публикует ради
    // свободных слотов, а получает занятые. Демо-записи живут в окне вокруг текущей даты.
    test('R4: POST /week-templates/publish на неопубликованной неделе создаёт свободные слоты, а не записи', async () => {
      const targetWeekStart = '2031-01-06';
      const beforePub = await request(app).get(`/appointments?date=2031-01-09`);
      expect(beforePub.status).toBe(200);
      expect(beforePub.body.items.length).toBe(0);

      const pub = await request(app)
        .post('/week-templates/publish')
        .send({ weekStart: targetWeekStart });
      expect(pub.status).toBe(200);

      const checkDays = ['2031-01-06', '2031-01-07', '2031-01-08', '2031-01-09', '2031-01-10'];
      let checked = 0;
      for (const dt of checkDays) {
        const dayIdx = data.dayIndex(dt);
        const hasWorking = data.state.doctors.some((doc) => {
          const ivs = data.weekTemplateSeed[doc.id] || [];
          const arr = ivs[dayIdx] || [];
          return arr.some((iv) => data.isWorkingInterval(iv));
        });
        if (!hasWorking) continue;

        const schedule = await request(app).get(`/schedule/${dt}`);
        expect(schedule.status).toBe(200);
        expect(schedule.body.slots.length).toBeGreaterThan(0);
        // Занятыми могут быть только обед и блокировка из шаблона — они часть расписания,
        // а не проданное время. Записи не должно быть ни одной.
        const cells = schedule.body.slots.flatMap((s) => s.doctors);
        expect(cells.length).toBeGreaterThan(0);
        expect(cells.every((c) => c.occupancyKind !== 'appointment')).toBe(true);
        expect(cells.some((c) => c.busy === false)).toBe(true);

        const res = await request(app).get(`/appointments?date=${dt}`);
        expect(res.status).toBe(200);
        expect(res.body.items.length).toBe(0);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(0);
    });
  });
});