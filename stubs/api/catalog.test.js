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

/** Первый свободный слот у врача на дату — чтобы запись не падала на «слот занят». */
/**
 * Свободное окно нужной длительности, а не одна свободная ячейка: шаг сетки —
 * 15 минут, запись в тесте длится 30, и на плотном дне вторая ячейка уже занята.
 */
const findFreeSlot = (date, doctorId, minutes = 30) => {
  const slots = data.buildSlots(date);
  const steps = Math.ceil(minutes / data.stepMinutes);
  for (let i = 0; i + steps <= slots.length; i += 1) {
    const ok = slots.slice(i, i + steps).every((slot) => {
      const doc = slot.doctors.find((d) => d.id === doctorId);
      return doc && !doc.busy;
    });
    if (ok) return slots[i].time;
  }
  return null;
};

/**
 * Слот, свободный сразу у обоих врачей. Смены врачей в неделе пересекаются не
 * каждый день, поэтому ищем по всему опубликованному окну: иначе тест спорит о
 * графике смены, а не о занятости ресурса.
 */
const findSharedFreeSlot = (fromDate, doctorIds, minutes) => {
  const steps = Math.ceil(minutes / data.stepMinutes);
  for (let d = 0; d < 7; d += 1) {
    const date = data.addDays(fromDate, d);
    const slots = data.buildSlots(date);
    for (let i = 0; i + steps <= slots.length; i += 1) {
      const window = slots.slice(i, i + steps);
      const allFree = doctorIds.every((id) => window.every((slot) => {
        const doc = slot.doctors.find((one) => one.id === id);
        return doc && !doc.busy;
      }));
      if (allFree) return { date, time: slots[i].time };
    }
  }
  return null;
};

const isoAt = (date, time) => `${date}T${time}:00+03:00`;

/**
 * Окно, свободное у врача и не занятое аппаратом этой услуги. Аппарат —
 * второй ресурс: запись к свободному врачу законно отклоняется, если тот же
 * аппарат в это время занят у другого врача.
 */
const findFreeSlotWithEquipment = (date, doctorId, minutes, serviceId) => {
  const slots = data.buildSlots(date);
  const steps = Math.ceil(minutes / data.stepMinutes);
  const pool = data.state.appointments.concat(data.state.demoAppointments || []);
  const equipmentBusy = (startMs, endMs) => pool.some((a) => a.serviceId === serviceId
    && !['cancelled', 'no_show'].includes(a.status)
    && new Date(a.start).getTime() < endMs
    && new Date(a.start).getTime() + a.durationMin * 60000 > startMs);
  for (let i = 0; i + steps <= slots.length; i += 1) {
    const ok = slots.slice(i, i + steps).every((slot) => {
      const doc = slot.doctors.find((d) => d.id === doctorId);
      return doc && !doc.busy;
    });
    if (!ok) continue;
    const startMs = new Date(isoAt(date, slots[i].time)).getTime();
    if (equipmentBusy(startMs, startMs + minutes * 60000)) continue;
    return slots[i].time;
  }
  return null;
};

/**
 * Пациент без записи в этом интервале. Спор в тесте должен идти о ресурсе, а
 * не о том, что демо-пациент в это время уже сидит у другого врача.
 */
const freePatients = (date, time, minutes) => {
  const startMs = new Date(isoAt(date, time)).getTime();
  const endMs = startMs + minutes * 60000;
  const pool = [...data.state.appointments, ...(data.state.demoAppointments || [])];
  return data.state.patients
    .filter((p) => !pool.some((a) => {
      if (a.patientId !== p.id) return false;
      if (!['scheduled', 'arrived', 'in_progress', 'completed'].includes(a.status)) return false;
      const aStart = new Date(a.start).getTime();
      return aStart < endMs && aStart + a.durationMin * 60000 > startMs;
    }))
    .map((p) => p.id);
};

describe('stubs/api/catalog — оборудование, компетенции, длительность', () => {
  let app;
  let date;

  beforeEach(() => {
    data.resetState();
    app = buildApp();
    date = data.state.sysDate;
  });

  describe('оборудование и кабинеты', () => {
    test('GET /equipment отдаёт ресурсы с привязкой к услугам', async () => {
      const res = await request(app).get('/equipment');
      expect(res.status).toBe(200);
      expect(res.body.items.length).toBeGreaterThanOrEqual(4);

      const ecg = res.body.items.find((e) => e.id === 'eq-001');
      expect(ecg.cabinet).toBe('305');
      expect(ecg.serviceIds).toContain('s-003');
      expect(ecg.serviceNames).toContain('ЭКГ');
      expect(res.body.items.some((e) => e.kind === 'room')).toBe(true);
    });

    test('GET /equipment/schedule без даты — 400 с русским сообщением', async () => {
      const res = await request(app).get('/equipment/schedule');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Дата/);
    });

    test('лента ресурса показывает занятость реальной записью, а не отдельным журналом', async () => {
      const time = findFreeSlot(date, 'd-002');
      expect(time).not.toBeNull();

      const before = await request(app).get(`/equipment/schedule?date=${date}`);
      const ecgBefore = before.body.items.find((e) => e.id === 'eq-001');
      const bookedBefore = ecgBefore.slots.filter((s) => s.state === 'booked').length;

      const created = await request(app).post('/appointments').send({
        doctorId: 'd-002',
        patientId: 'p-001',
        start: isoAt(date, time),
        durationMin: 15,
        serviceId: 's-003',
      });
      expect(created.status).toBe(201);

      const after = await request(app).get(`/equipment/schedule?date=${date}`);
      const ecgAfter = after.body.items.find((e) => e.id === 'eq-001');
      const bookedAfter = ecgAfter.slots.filter((s) => s.state === 'booked').length;
      expect(bookedAfter).toBe(bookedBefore + 1);

      const busySlot = ecgAfter.slots.find((s) => s.time === time);
      expect(busySlot.state).toBe('booked');
      expect(busySlot.appointmentId).toBe(created.body.id);
      expect(busySlot.doctorName).toBe('Петров Андрей Викторович');
    });

    test('аппарат — второй ресурс: занят у одного врача, значит занят и у другого', async () => {
      const shared = findSharedFreeSlot(date, ['d-002', 'd-006'], 30);
      expect(shared).not.toBeNull();
      const free = freePatients(shared.date, shared.time, 30);
      expect(free.length, 'нет двух свободных пациентов').toBeGreaterThanOrEqual(2);
      const first = await request(app).post('/appointments').send({
        doctorId: 'd-002',
        patientId: free[0],
        start: isoAt(shared.date, shared.time),
        durationMin: 30,
        serviceId: 's-004',
      });
      expect(first.status).toBe(201);

      const second = await request(app).post('/appointments').send({
        doctorId: 'd-006',
        patientId: free[1],
        start: isoAt(shared.date, shared.time),
        durationMin: 30,
        serviceId: 's-004',
      });
      expect(second.status).toBe(409);
      expect(second.body.error).toBe('equipment_busy');
      expect(second.body.equipmentId).toBe('eq-002');
      expect(second.body.message).toMatch(/УЗИ-сканер/);
    });

    test('кабинет тоже ресурс: разные аппараты в одном кабинете не работают одновременно', async () => {
      const shared = findSharedFreeSlot(date, ['d-003', 'd-005'], 15);
      expect(shared).not.toBeNull();
      const free = freePatients(shared.date, shared.time, 15);
      expect(free.length, 'нет двух свободных пациентов').toBeGreaterThanOrEqual(2);
      const first = await request(app).post('/appointments').send({
        doctorId: 'd-003',
        patientId: free[0],
        start: isoAt(shared.date, shared.time),
        durationMin: 10,
        serviceId: 's-005',
      });
      expect(first.status).toBe(201);

      const second = await request(app).post('/appointments').send({
        doctorId: 'd-005',
        patientId: free[1],
        start: isoAt(shared.date, shared.time),
        durationMin: 15,
        serviceId: 's-006',
      });
      expect(second.status).toBe(409);
      expect(second.body.equipmentId).toBe('eq-005');
    });

    test('ремонт ресурса закрывает день: запись не создаётся, лента показывает причину', async () => {
      data.applyAbsence({
        equipmentId: 'eq-001',
        dateFrom: date,
        dateTo: date,
        reason: 'repair',
      });

      const schedule = await request(app).get(`/equipment/schedule?date=${date}`);
      const ecg = schedule.body.items.find((e) => e.id === 'eq-001');
      expect(ecg.repair).not.toBeNull();
      expect(ecg.slots.every((s) => s.state === 'repair')).toBe(true);

      const time = findFreeSlot(date, 'd-004');
      const res = await request(app).post('/appointments').send({
        doctorId: 'd-004',
        patientId: 'p-001',
        start: isoAt(date, time),
        durationMin: 15,
        serviceId: 's-003',
      });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('equipment_busy');
      expect(res.body.message).toMatch(/ремонт/);
    });

    test('услуга без аппарата ресурс не занимает', async () => {
      const time = findFreeSlot(date, 'd-001');
      const [patientId] = freePatients(date, time, 30);
      const res = await request(app).post('/appointments').send({
        doctorId: 'd-001',
        patientId,
        start: isoAt(date, time),
        durationMin: 30,
        serviceId: 's-001',
      });
      expect(res.status).toBe(201);
    });
  });

  describe('матрица компетенций', () => {
    test('GET /competencies отдаёт три значения допуска', async () => {
      const res = await request(app).get('/competencies');
      expect(res.status).toBe(200);
      expect(res.body.doctors.length).toBe(7);
      expect(res.body.services.length).toBe(8);

      const ecg = res.body.cells.find((c) => c.serviceId === 's-003');
      const value = (doctorId) => ecg.values.find((v) => v.doctorId === doctorId).value;
      expect(value('d-002')).toBe('yes');
      expect(value('d-001')).toBe('no');

      const usg = res.body.cells.find((c) => c.serviceId === 's-004');
      expect(usg.values.find((v) => v.doctorId === 'd-006').value).toBe('limited');
    });

    test('снятый допуск закрывает запись к этому врачу', async () => {
      const time = findFreeSlot(date, 'd-002');

      const patched = await request(app)
        .patch('/competencies')
        .send({ serviceId: 's-003', doctorId: 'd-002', value: 'no' });
      expect(patched.status).toBe(200);
      expect(patched.body.value).toBe('no');

      const services = await request(app).get('/services');
      const ecg = services.body.items.find((s) => s.id === 's-003');
      expect(ecg.doctorIds).not.toContain('d-002');

      const booking = await request(app).post('/appointments').send({
        doctorId: 'd-002',
        patientId: 'p-001',
        start: isoAt(date, time),
        durationMin: 15,
        serviceId: 's-003',
      });
      expect(booking.status).toBe(409);
      expect(booking.body.error).toBe('service_not_offered');
    });

    test('выданный допуск открывает запись, «с ограничением» её не запрещает', async () => {
      // Время нужно свободное и у врача, и у аппарата: ЭКГ — общий ресурс, и
      // занятость его у другого врача даст 409 equipment_busy, а спор в тесте
      // идёт о допуске.
      const time = findFreeSlotWithEquipment(date, 'd-001', 15, 's-003');
      expect(time, 'нет окна, свободного и у врача, и у аппарата').not.toBeNull();
      const [patientId] = freePatients(date, time, 15);

      const before = await request(app).post('/appointments').send({
        doctorId: 'd-001',
        patientId,
        start: isoAt(date, time),
        durationMin: 15,
        serviceId: 's-003',
      });
      expect(before.status).toBe(409);

      await request(app)
        .patch('/competencies')
        .send({ serviceId: 's-003', doctorId: 'd-001', value: 'limited' });

      const after = await request(app).post('/appointments').send({
        doctorId: 'd-001',
        patientId,
        start: isoAt(date, time),
        durationMin: 15,
        serviceId: 's-003',
      });
      expect(after.status).toBe(201);

      const services = await request(app).get('/services');
      const ecg = services.body.items.find((s) => s.id === 's-003');
      expect(ecg.limitedDoctorIds).toContain('d-001');
    });

    test('неизвестное значение допуска отклоняется', async () => {
      const res = await request(app)
        .patch('/competencies')
        .send({ serviceId: 's-003', doctorId: 'd-002', value: 'maybe' });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('invalid_value');
    });
  });

  describe('правила длительности', () => {
    test('GET /duration-rules отдаёт правила с приоритетом и машинным условием', async () => {
      const res = await request(app).get('/duration-rules');
      expect(res.status).toBe(200);

      const base = res.body.items.find((r) => r.id === 'dr-base');
      expect(base.locked).toBe(true);
      expect(base.effect.kind).toBe('base');

      const first = res.body.items.find((r) => r.id === 'dr-visit-first');
      expect(first.match).toEqual({ serviceCategory: 'Приём', visitType: 'first' });
      expect(first.effect).toEqual({ kind: 'set', minutes: 60 });

      const prios = res.body.items.map((r) => r.priority);
      expect(prios).toEqual([...prios].sort((a, b) => a - b));
    });

    test('правило выключается и включается обратно', async () => {
      const off = await request(app).patch('/duration-rules/dr-visit-first').send({ enabled: false });
      expect(off.status).toBe(200);
      expect(off.body.items.find((r) => r.id === 'dr-visit-first').enabled).toBe(false);

      const on = await request(app).patch('/duration-rules/dr-visit-first').send({ enabled: true });
      expect(on.body.items.find((r) => r.id === 'dr-visit-first').enabled).toBe(true);
    });

    test('базовое правило выключить нельзя', async () => {
      const res = await request(app).patch('/duration-rules/dr-base').send({ enabled: false });
      expect(res.status).toBe(409);
      expect(res.body.error).toBe('rule_locked');
    });

    test('несуществующее правило — 404, нелогическое значение — 400', async () => {
      expect((await request(app).patch('/duration-rules/dr-none').send({ enabled: true })).status).toBe(404);
      expect((await request(app).patch('/duration-rules/dr-base').send({ enabled: 'да' })).status).toBe(400);
    });
  });
});
