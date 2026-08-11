'use strict';

/**
 * Правдоподобие демо-стенда. Проверяется не «данные есть», а «данные похожи на
 * день настоящей клиники»: до этой волны все гейты были зелёными на стенде, где
 * касса смены равна нулю, три календарные недели совпадали посимвольно, а один
 * пациент был записан к четырём врачам за одно утро.
 */

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

const dayOf = (date) => data.state.demoAppointments.filter((a) => a.start.slice(0, 10) === date);

const workingDatesIn = (fromShift, toShift) => {
  const out = [];
  for (let i = fromShift; i <= toShift; i += 1) {
    const date = data.addDays(data.state.sysDate, i);
    if (dayOf(date).length > 0) out.push(date);
  }
  return out;
};

const minutesOfDay = (iso) => {
  const hhmm = iso.slice(11, 16).split(':').map(Number);
  return hhmm[0] * 60 + hhmm[1];
};

describe('stubs/api/data — демо-стенд похож на настоящий день клиники', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  test('приёмы занимают 45–78% рабочего времени врача, и стоят в обеих половинах смены', () => {
    /**
     * Считаем долю ЗАПИСЕЙ в БРОНИРУЕМОМ времени: перерыв и блокировка — не
     * занятость врача пациентами, а отменённая запись и неявка слот
     * освобождают. Полоса нужна с двух сторон: на пустом дне не показать поиск
     * времени, на забитом — саму запись.
     */
    const dates = [0, 1, 2, 3, 7].map((shift) => data.addDays(data.state.sysDate, shift));
    let checkedShifts = 0;

    for (const date of dates) {
      const rows = data.buildSlots(date);
      const perDoctor = new Map();
      for (const row of rows) {
        for (const cell of row.doctors || []) {
          if (cell.occupancyKind === 'blocked' || cell.occupancyKind === 'tech_break') continue;
          const acc = perDoctor.get(cell.id) || { slots: 0, busy: 0, first: null, last: null };
          acc.slots += 1;
          if (cell.occupancyKind === 'appointment') acc.busy += 1;
          if (acc.first == null) acc.first = row.time;
          acc.last = row.time;
          perDoctor.set(cell.id, acc);
        }
      }

      for (const [doctorId, acc] of perDoctor) {
        // Короткие смены (меньше четырёх часов) в полосу не укладываются по
        // гранулярности: одна услуга там весит до 25% дня.
        if (acc.slots < 16) continue;
        checkedShifts += 1;
        const percent = Math.round((acc.busy * 100) / acc.slots);
        expect(percent, `${date} ${doctorId}: загрузка ${percent}%`).toBeGreaterThanOrEqual(45);
        expect(percent, `${date} ${doctorId}: загрузка ${percent}%`).toBeLessThanOrEqual(78);

        const own = dayOf(date).filter((a) => a.doctorId === doctorId);
        const startMin = Number(acc.first.slice(0, 2)) * 60 + Number(acc.first.slice(3));
        const endMin = Number(acc.last.slice(0, 2)) * 60 + Number(acc.last.slice(3));
        const middle = (startMin + endMin) / 2;
        expect(own.some((a) => minutesOfDay(a.start) <= middle), `${date} ${doctorId}: первая половина смены пуста`).toBe(true);
        expect(own.some((a) => minutesOfDay(a.start) > middle), `${date} ${doctorId}: вторая половина смены пуста`).toBe(true);
      }
    }

    expect(checkedShifts, 'не нашлось ни одной полноценной смены для проверки').toBeGreaterThanOrEqual(8);
  });

  test('пациентов не меньше пятнадцати, и ни один не приходит больше двух раз в день', () => {
    expect(data.state.patients.length).toBeGreaterThanOrEqual(15);
    for (const date of workingDatesIn(-7, 7)) {
      const perPatient = new Map();
      for (const a of dayOf(date)) {
        perPatient.set(a.patientId, (perPatient.get(a.patientId) || 0) + 1);
      }
      for (const [patientId, count] of perPatient) {
        expect(count, `${patientId} записан ${count} раз(а) на ${date}`).toBeLessThanOrEqual(2);
      }
    }
  });

  test('каждый пациент картотеки участвует в стенде: справочник не декоративный', () => {
    const used = new Set(data.state.demoAppointments.map((a) => a.patientId));
    const idle = data.state.patients.filter((p) => !used.has(p.id)).map((p) => p.id);
    expect(idle, `пациенты без единой записи: ${idle.join(', ')}`).toEqual([]);
  });

  test('соседние дни не совпадают: стенд — не один день, размноженный по календарю', () => {
    const dates = workingDatesIn(0, 20);
    expect(dates.length).toBeGreaterThanOrEqual(3);
    const fingerprint = (date) => dayOf(date)
      .map((a) => `${a.start.slice(11, 16)}|${a.doctorId}|${a.patientId}|${a.serviceId}`)
      .sort()
      .join(',');
    const seen = new Map();
    for (const date of dates) {
      const fp = fingerprint(date);
      expect(seen.has(fp), `${date} совпадает с ${seen.get(fp)} посимвольно`).toBe(false);
      seen.set(fp, date);
    }
  });

  test('касса смены не ноль: у завершённых визитов есть оплата по прайсу', async () => {
    const res = await request(app).get(`/appointments?date=${data.state.sysDate}`);
    expect(res.status).toBe(200);
    const completed = res.body.items.filter((a) => a.status === 'completed');
    expect(completed.length, 'в демо-дне нет ни одного завершённого приёма').toBeGreaterThan(0);
    for (const a of completed) {
      expect(a.paidAt, `${a.id} завершён и не оплачен`).toBeTruthy();
      expect(typeof a.paidAmount).toBe('number');
    }
    const cash = completed.reduce((sum, a) => sum + (a.paidAmount || 0), 0);
    expect(cash, 'касса смены равна нулю').toBeGreaterThan(0);
  });

  test('история переходов не пуста у всех записей, кроме только что созданных', () => {
    const notFresh = data.state.demoAppointments.filter((a) => a.status !== 'scheduled');
    expect(notFresh.length).toBeGreaterThan(0);
    for (const a of notFresh) {
      expect(Array.isArray(a.history), `${a.id}: истории нет`).toBe(true);
      expect(a.history.length, `${a.id}: в истории меньше двух шагов`).toBeGreaterThanOrEqual(2);
      expect(a.history[a.history.length - 1].to).toBe(a.status);
      for (let i = 1; i < a.history.length; i += 1) {
        expect(new Date(a.history[i].at).getTime())
          .toBeGreaterThanOrEqual(new Date(a.history[i - 1].at).getTime());
      }
    }
  });

  test('у завершённого визита заполнен протокол, и услуги — из допусков врача', () => {
    const completed = data.state.demoAppointments.filter((a) => a.status === 'completed');
    expect(completed.length).toBeGreaterThan(0);
    for (const a of completed) {
      expect(a.complaints, `${a.id}: жалобы пусты`).toBeTruthy();
      expect(a.diagnosis, `${a.id}: диагноз пуст`).toBeTruthy();
      expect(['first', 'repeat']).toContain(a.visitType);
      expect(a.performedServiceIds.length, `${a.id}: услуги не отмечены`).toBeGreaterThan(0);
      for (const serviceId of a.performedServiceIds) {
        const svc = data.state.services.find((s) => s.id === serviceId);
        expect(svc, `${a.id}: услуга ${serviceId} не из справочника`).toBeTruthy();
        expect(svc.doctorIds, `${a.id}: услуга ${serviceId} вне допуска ${a.doctorId}`).toContain(a.doctorId);
      }
    }
  });

  test('лист ожидания не пуст и показывает разные типы заявок', async () => {
    const res = await request(app).get('/waitlist');
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThanOrEqual(5);
    expect(res.body.openCount).toBeGreaterThanOrEqual(4);
    const kinds = new Set(res.body.items.map((w) => w.kind));
    expect(kinds.size, 'все заявки одного типа').toBeGreaterThanOrEqual(3);
    expect(res.body.items.some((w) => w.status === 'fulfilled'), 'нет ни одной закрытой заявки').toBe(true);
  });

  test('телефоны и номера карт не выглядят счётчиком цикла', () => {
    const digits = (s) => String(s).replace(/\D/g, '');
    const phones = data.state.patients.map((p) => digits(p.phone));
    expect(new Set(phones).size).toBe(phones.length);
    const sorted = [...phones].sort();
    for (let i = 1; i < sorted.length; i += 1) {
      const diff = Math.abs(Number(sorted[i]) - Number(sorted[i - 1]));
      expect(diff, `телефоны ${sorted[i - 1]} и ${sorted[i]} идут подряд`).not.toBe(1);
    }
    for (const p of data.state.patients) {
      expect(p.cardNumber, `${p.id}: номер карты содержит служебное слово`).not.toMatch(/UID/i);
      const seq = String(data.state.patients.indexOf(p) + 1).padStart(4, '0');
      expect(digits(p.cardNumber).startsWith(seq), `${p.id}: номер карты повторяет порядковый номер`).toBe(false);
    }
  });

  test('площадка называется одинаково в справочнике врачей и в шапке приложения', async () => {
    const res = await request(app).get('/doctor-cards');
    expect(res.status).toBe(200);
    const sites = new Set(res.body.items.map((c) => c.site).filter(Boolean));
    expect(sites.size, `площадка названа по-разному: ${[...sites].join(' / ')}`).toBe(1);
    expect([...sites][0]).toBe('Динамо');
  });

  test('незаполненная карточка врача ровно одна: счётчик считает по данным', async () => {
    const res = await request(app).get('/doctor-cards');
    const incomplete = res.body.items.filter((c) => !c.site || (c.specialties || []).length === 0);
    expect(incomplete.length).toBe(1);
  });

  test('длительность записи считают те же правила, что и запись из АРМ', () => {
    // Норматив справочника — только основание расчёта. Итог даёт движок правил:
    // если посев считает по-своему, «Первичная консультация» на стенде идёт
    // 30 минут, а такая же новая запись из АРМ — 60, и экран администратора врёт.
    const rules = data.state.durationRules;
    const applies = (rule, service, ageYears) => {
      const m = rule.match || {};
      const visitType = /первичн/i.test(service.name)
        ? 'first'
        : (/повторн|результат/i.test(service.name) ? 'repeat' : 'first');
      if (service.category !== 'Приём' && m.visitType != null) return false;
      if (m.serviceCategory != null && m.serviceCategory !== service.category) return false;
      if (m.visitType != null && m.visitType !== visitType) return false;
      if (m.requiresEquipment === true && !service.requiresEquipment) return false;
      if (m.patientAgeFrom != null && (ageYears == null || ageYears < m.patientAgeFrom)) return false;
      return true;
    };
    const expected = (service, ageYears) => {
      let total = service.duration;
      for (const rule of [...rules].sort((a, b) => a.priority - b.priority)) {
        if (!rule.enabled && !rule.locked) continue;
        if (!applies(rule, service, ageYears)) continue;
        if (rule.effect.kind === 'base') total = service.duration;
        else if (rule.effect.kind === 'set') total = rule.effect.minutes;
        else total += rule.effect.minutes;
      }
      return total;
    };
    const ageOn = (birthDate, onDate) => {
      const [by, bm, bd] = birthDate.split('-').map(Number);
      const [ny, nm, nd] = onDate.split('-').map(Number);
      let years = ny - by;
      if (nm < bm || (nm === bm && nd < bd)) years -= 1;
      return years;
    };

    for (const a of data.state.demoAppointments) {
      if (!a.serviceId) continue;
      const svc = data.state.services.find((s) => s.id === a.serviceId);
      if (!svc) continue;
      const patient = data.state.patients.find((p) => p.id === a.patientId);
      const ageYears = patient ? ageOn(patient.birthDate, a.start.slice(0, 10)) : null;
      expect(a.durationMin, `${a.id} (${svc.name}): ${a.durationMin} мин`).toBe(expected(svc, ageYears));
    }
  });

  test('окно стенда переживает сдвиг показа: две недели назад и четыре вперёд', async () => {
    // Выходной с пустой сеткой — нормальный день, поэтому проверяем не каждую
    // дату подряд, а что в каждой крайней неделе окна есть рабочие дни.
    for (const [from, to] of [[-14, -8], [-7, -1], [1, 7], [14, 20], [21, 27]]) {
      const working = workingDatesIn(from, to);
      expect(working.length, `в диапазоне ${from}…${to} дней от сегодня стенд пуст`).toBeGreaterThanOrEqual(4);
      const res = await request(app).get(`/schedule/${working[0]}`);
      expect(res.status, `нет сетки на ${working[0]}`).toBe(200);
      expect(res.body.slots.length, `сетка на ${working[0]} пуста`).toBeGreaterThan(0);
    }
    const dates = workingDatesIn(-13, 26);
    expect(dates.length, 'в окне мало рабочих дней').toBeGreaterThanOrEqual(25);
    for (const date of dates) {
      // Короткая смена (одинокая суббота на три часа) физически не вмещает
      // пятерых: там всего двенадцать пятнадцатиминутных слотов.
      const capacity = data.buildSlots(date).length;
      const minimum = capacity >= 16 ? 5 : 3;
      expect(dayOf(date).length, `${date}: записей меньше ${minimum}`).toBeGreaterThanOrEqual(minimum);
    }
  });

  test('приём начинается на границе шага сетки', () => {
    for (const a of data.state.demoAppointments) {
      expect(minutesOfDay(a.start) % data.stepMinutes, `${a.id} начинается в ${a.start.slice(11, 16)}`).toBe(0);
    }
  });
});
