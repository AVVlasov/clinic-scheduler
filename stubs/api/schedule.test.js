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

describe('stubs/api/schedule — сетка строится по опубликованным шаблонам недели', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  describe('GET /schedule — слоты только в work-интервалах шаблона', () => {
    test('сетка на сегодня не повторяет захардкоженный 08:00–20:00 для всех', async () => {
      const ws = data.weekStartOf(data.state.date);
      const friday = (() => {
        const d = new Date(`${ws}T00:00:00`);
        d.setDate(d.getDate() + 4);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();

      const res = await request(app).get(`/schedule/${friday}`);
      expect(res.status).toBe(200);
      expect(res.body.stepMinutes).toBe(15);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots.length).toBeGreaterThan(0);

      const times = res.body.slots.map((s) => s.time);
      const uniq = new Set(times);
      expect(uniq.size).toBe(times.length);
      expect(uniq.size).toBeGreaterThan(0);

      const hasDoctorColumn = (doctorId, time) => {
        const slot = res.body.slots.find((s) => s.time === time);
        return Boolean(slot && slot.doctors.some((d) => d.id === doctorId));
      };

      expect(hasDoctorColumn('d-005', '08:30')).toBe(false);
      const noD005Anywhere = res.body.slots.every((s) => !s.doctors.some((d) => d.id === 'd-005'));
      expect(noD005Anywhere).toBe(true);
    });

    test('шаг между слотами ровно 15 минут', async () => {
      const res = await request(app).get(`/schedule/${data.state.date}`);
      expect(res.status).toBe(200);
      expect(res.body.slots.length).toBeGreaterThanOrEqual(2);
      for (let i = 1; i < res.body.slots.length; i++) {
        const [ph, pm] = res.body.slots[i - 1].time.split(':').map(Number);
        const [ch, cm] = res.body.slots[i].time.split(':').map(Number);
        const delta = (ch * 60 + cm) - (ph * 60 + pm);
        expect(delta).toBe(15);
      }
    });

    test('buildSlots в data.js не использует литералы 8*60/20*60', () => {
      const src = require('fs').readFileSync(require('path').join(__dirname, 'data.js'), 'utf8');
      const lines = src.split('\n');
      const buildSlotsLines = [];
      let inFn = false;
      let depth = 0;
      for (const line of lines) {
        if (!inFn && /const buildSlots\s*=/.test(line)) {
          inFn = true;
        }
        if (inFn) {
          buildSlotsLines.push(line);
          for (const ch of line) {
            if (ch === '{') depth++;
            if (ch === '}') depth--;
          }
          if (inFn && depth === 0 && line.includes('};')) break;
        }
      }
      const body = buildSlotsLines.join('\n');
      expect(/8\s*\*\s*60/.test(body)).toBe(false);
      expect(/20\s*\*\s*60/.test(body)).toBe(false);
    });

    test('buildSlots в data.js использует isWorkingInterval (единый предикат с lifecycle.js)', () => {
      const src = require('fs').readFileSync(require('path').join(__dirname, 'data.js'), 'utf8');
      expect(/isWorkingInterval\s*\(/.test(src)).toBe(true);
      expect(/Math\.floor\(/.test(src)).toBe(true);
      expect(/stepMinutes\s*\)/.test(src)).toBe(true);
    });
  });

  describe('buildSlots — неопубликованная неделя', () => {
    test('GET /schedule?date=<будущая неделя> возвращает пустую сетку', async () => {
      const date = '2099-01-01';
      const res = await request(app).get(`/schedule/${date}`);
      expect(res.status).toBe(200);
      expect(res.body.date).toBe(date);
      expect(Array.isArray(res.body.slots)).toBe(true);
      expect(res.body.slots).toEqual([]);
    });

    test('GET /schedule/:date (будущая неделя) — тоже пусто', async () => {
      const res = await request(app).get('/schedule/2099-01-01');
      expect(res.status).toBe(200);
      expect(res.body.slots).toEqual([]);
    });

    test('будущая неделя возвращает остальные поля без busy', async () => {
      const res = await request(app).get('/schedule/2099-01-01');
      expect(res.status).toBe(200);
      expect(res.body.date).toBe('2099-01-01');
      expect(typeof res.body.stepMinutes).toBe('number');
    });
  });

  describe('buildSlots — урезанный рабочий день (absent)', () => {
    test('d-005 в пятницу (absent) — нет ни одного слота с d-005', async () => {
      const ws = data.weekStartOf(data.state.date);
      const friday = (() => {
        const d = new Date(`${ws}T00:00:00`);
        d.setDate(d.getDate() + 4);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();

      const dayIndex = data.dayIndex(friday);
      const seed = data.weekTemplateSeed['d-005'];
      const interval = seed[dayIndex];
      expect(interval).toBeDefined();
      expect(interval.every((iv) => iv.kind !== 'work')).toBe(true);

      const res = await request(app).get(`/schedule/${friday}`);
      expect(res.status).toBe(200);
      const d005 = res.body.slots.flatMap((s) => s.doctors.filter((d) => d.id === 'd-005'));
      expect(d005).toEqual([]);
    });

    test('d-006 во вторник (off) — нет ни одного слота с d-006 во вторник', async () => {
      const ws = data.weekStartOf(data.state.date);
      const tuesday = (() => {
        const d = new Date(`${ws}T00:00:00`);
        d.setDate(d.getDate() + 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();

      const res = await request(app).get(`/schedule/${tuesday}`);
      expect(res.status).toBe(200);
      const slots = res.body.slots;
      const d006 = slots.flatMap((s) => s.doctors.filter((d) => d.id === 'd-006'));
      expect(d006).toEqual([]);
    });
  });

  describe('POST /week-templates/publish ↔ GET /schedule — симметрия слотов', () => {
    test('число slotsCreated в publish равно сумме длин slots.doctors по дням недели', async () => {
      const testWeekStart = '2098-12-29';
      const before = (await request(app).get(`/week-templates?weekStart=${testWeekStart}`)).body;

      const publish = await request(app)
        .post('/week-templates/publish')
        .send({ weekStart: testWeekStart });
      expect(publish.status).toBe(200);
      const { slotsCreated, doctorsAffected } = publish.body;
      expect(slotsCreated).toBeGreaterThan(0);
      expect(doctorsAffected).toBeGreaterThan(0);

      const days = before.days;
      let sum = 0;
      for (const day of days) {
        const dayRes = await request(app).get(`/schedule/${day.date}`);
        expect(dayRes.status).toBe(200);
        sum += dayRes.body.slots.reduce((acc, s) => acc + s.doctors.length, 0);
      }
      expect(sum).toBe(slotsCreated);
    });

    test('повторная публикация той же недели → 409 week_already_published', async () => {
      const date = '2097-11-24';
      const first = await request(app)
        .post('/week-templates/publish')
        .send({ weekStart: date });
      expect(first.status).toBe(200);
      const second = await request(app)
        .post('/week-templates/publish')
        .send({ weekStart: date });
      expect(second.status).toBe(409);
      expect(second.body.error).toBe('week_already_published');
    });

    test('правка интервала в одной неделе не меняет соседнюю', async () => {
      const weekA = '2096-01-01';
      const weekB = '2096-01-08';
      const beforeB = (await request(app).get(`/week-templates?weekStart=${weekB}`)).body;
      const tplA = (await request(app).get(`/week-templates?weekStart=${weekA}`)).body;
      const doctorId = tplA.rows[0].doctorId;
      const dateA = tplA.days[0].date;
      const patch = await request(app)
        .patch('/week-templates/interval')
        .send({
          weekStart: weekA,
          doctorId,
          date: dateA,
          intervals: [{ start: '10:00', end: '11:00', kind: 'work' }],
        });
      expect(patch.status).toBe(200);
      const cellA = patch.body.rows.find((r) => r.doctorId === doctorId).days[0].intervals[0];
      expect(cellA).toEqual({ start: '10:00', end: '11:00', kind: 'work' });

      const afterB = (await request(app).get(`/week-templates?weekStart=${weekB}`)).body;
      const cellB = afterB.rows.find((r) => r.doctorId === doctorId).days[0].intervals;
      const expectedB = beforeB.rows.find((r) => r.doctorId === doctorId).days[0].intervals;
      expect(cellB).toEqual(expectedB);
    });

    test('unpublish снимает неделю и позволяет опубликовать снова', async () => {
      const weekStart = '2095-06-06';
      const first = await request(app).post('/week-templates/publish').send({ weekStart });
      expect(first.status).toBe(200);
      const unpub = await request(app).post('/week-templates/unpublish').send({ weekStart });
      expect(unpub.status).toBe(200);
      expect(unpub.body.published).toBe(false);
      const day = unpub.body.days[0].date;
      const empty = await request(app).get(`/schedule/${day}`);
      expect(empty.status).toBe(200);
      expect(empty.body.slots).toEqual([]);
      const second = await request(app).post('/week-templates/publish').send({ weekStart });
      expect(second.status).toBe(200);
      expect(second.body.slotsCreated).toBeGreaterThan(0);
    });
  });

  describe('тип и формат ответа', () => {
    test('поля date/startTime/endTime/stepMinutes присутствуют и корректного типа', async () => {
      const res = await request(app).get(`/schedule/${data.state.date}`);
      expect(res.status).toBe(200);
      expect(typeof res.body.date).toBe('string');
      expect(typeof res.body.startTime).toBe('string');
      expect(typeof res.body.endTime).toBe('string');
      expect(typeof res.body.stepMinutes).toBe('number');
      expect(res.body.stepMinutes).toBe(15);
      expect(res.body.slots.length).toBeGreaterThan(0);
      expect(res.body.slots.every((s) => /^\d{2}:\d{2}$/.test(s.time))).toBe(true);
      expect(res.body.slots.every((s) => s.doctors.every((d) => typeof d.busy === 'boolean'))).toBe(true);
      expect(res.body.slots.every((s) => s.doctors.every((d) => typeof d.id === 'string'))).toBe(true);
    });
  });

  describe('регресс — старая «08:00–20:00 всем» падает на новых тестах', () => {
    test('d-005 в пятницу не должен иметь 48 слотов в своей колонке', async () => {
      const ws = data.weekStartOf(data.state.date);
      const friday = (() => {
        const d = new Date(`${ws}T00:00:00`);
        d.setDate(d.getDate() + 4);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();

      const fridayIdx = data.dayIndex(friday);
      const seed = data.weekTemplateSeed['d-005'][fridayIdx];
      const isWork = seed.some((iv) => iv.kind === 'work');
      expect(isWork).toBe(false);

      const res = await request(app).get(`/schedule/${friday}`);
      expect(res.status).toBe(200);
      const d005 = res.body.slots.flatMap((s) => s.doctors.filter((d) => d.id === 'd-005'));
      expect(d005.length).toBe(0);
    });
  });

  describe('R5 — мусор в дате → 400 invalid_date', () => {
    test('GET /schedule?date=мусор → 400 invalid_date (не 200 c пустым массивом)', async () => {
      const res = await request(app).get('/schedule/мусор');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_date');
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
    });

    test('GET /schedule?date=not-a-date → 400 invalid_date', async () => {
      const res = await request(app).get('/schedule/not-a-date');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_date');
    });

    test('GET /schedule?date=2026-13-99 → 400 invalid_date', async () => {
      const res = await request(app).get('/schedule/2026-13-99');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_date');
    });

    test('GET /schedule/мусор → 400 invalid_date', async () => {
      const res = await request(app).get('/schedule/мусор');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_date');
    });

    test('GET /schedule/garbage → 400 invalid_date', async () => {
      const res = await request(app).get('/schedule/garbage');
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_date');
    });
  });

  describe('TASK-52 — отсутствия, праздник, occupancyKind', () => {
    beforeEach(() => {
      data.resetState();
    });

    test('праздник холдинга: slots=[], holiday.name задан', async () => {
      const sunday = (() => {
        const ws = data.weekStartOf(data.state.date);
        const d = new Date(`${ws}T00:00:00`);
        d.setDate(d.getDate() + 6);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();
      const res = await request(app).get(`/schedule/${sunday}`);
      expect(res.status).toBe(200);
      expect(res.body.slots).toEqual([]);
      expect(res.body.holiday).toEqual({ name: 'Праздник холдинга' });
    });

    test('block/break дают occupancyKind blocked / tech_break с разными подписями', async () => {
      const ws = data.weekStartOf(data.state.date);
      const wednesday = (() => {
        const d = new Date(`${ws}T00:00:00`);
        d.setDate(d.getDate() + 2);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();
      const thursday = (() => {
        const d = new Date(`${ws}T00:00:00`);
        d.setDate(d.getDate() + 3);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      })();

      const wed = await request(app).get(`/schedule/${wednesday}`);
      expect(wed.status).toBe(200);
      const blocked = wed.body.slots.flatMap((s) => s.doctors.filter((d) => d.occupancyKind === 'blocked'));
      expect(blocked.length).toBeGreaterThan(0);
      expect(blocked[0].occupancyLabel).toBe('Блокировка');
      expect(blocked[0].busy).toBe(true);

      const thu = await request(app).get(`/schedule/${thursday}`);
      expect(thu.status).toBe(200);
      const breaks = thu.body.slots.flatMap((s) => s.doctors.filter((d) => d.occupancyKind === 'tech_break'));
      expect(breaks.length).toBeGreaterThan(0);
      expect(breaks[0].occupancyLabel).toBe('Техперерыв');
      expect(breaks[0].occupancyLabel).not.toBe(blocked[0].occupancyLabel);
    });

    test('POST /absences отменяет записи и убирает слоты врача; GET /absences/:id/affected их показывает', async () => {
      const date = data.state.date;
      const list = await request(app).get(`/appointments?date=${date}`);
      expect(list.status).toBe(200);
      const active = list.body.items.filter((a) =>
        ['scheduled', 'arrived', 'in_progress'].includes(a.status),
      );
      expect(active.length).toBeGreaterThanOrEqual(2);
      const doctorId = active[0].doctorId;
      const sameDoctor = active.filter((a) => a.doctorId === doctorId);
      expect(sameDoctor.length).toBeGreaterThanOrEqual(1);

      const preview = await request(app)
        .get('/absences/preview')
        .query({ doctorId, dateFrom: date, dateTo: date });
      expect(preview.status).toBe(200);
      expect(preview.body.affectedCount).toBeGreaterThanOrEqual(sameDoctor.length);

      const before = await request(app).get(`/schedule/${date}`);
      const beforeCount = before.body.slots.reduce(
        (n, s) => n + s.doctors.filter((d) => d.id === doctorId).length,
        0,
      );
      expect(beforeCount).toBeGreaterThan(0);

      const created = await request(app).post('/absences').send({
        doctorId,
        dateFrom: date,
        dateTo: date,
        reason: 'sick',
      });
      expect(created.status).toBe(201);
      expect(created.body.absence.id).toMatch(/^abs-/);
      expect(created.body.affected.length).toBe(preview.body.affectedCount);

      const after = await request(app).get(`/schedule/${date}`);
      const afterCount = after.body.slots.reduce(
        (n, s) => n + s.doctors.filter((d) => d.id === doctorId).length,
        0,
      );
      expect(afterCount).toBe(0);

      const affected = await request(app).get(`/absences/${created.body.absence.id}/affected`);
      expect(affected.status).toBe(200);
      expect(affected.body.items.length).toBe(created.body.affected.length);
      expect(affected.body.items.every((a) => a.status === 'cancelled')).toBe(true);
      expect(affected.body.items.every((a) => /Отсутствие/.test(a.cancelReason || ''))).toBe(true);
    });
  });

});