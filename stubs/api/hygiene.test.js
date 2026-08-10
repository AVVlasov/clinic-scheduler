'use strict';

const fs = require('fs');
const path = require('path');
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

describe('TASK-47 — гигиена стаба: reset, nextVisit, контракт маршрутов', () => {
  let app;

  beforeEach(async () => {
    data.resetState();
    app = buildApp();
  });

  test('POST /demo/reset возвращает стенд к исходному состоянию: два одинаковых сценария подряд совпадают', async () => {
    const weekStart = '2035-01-01'; // понедельник
    const day = '2035-01-02'; // вторник
    const start = `${day}T10:00:00+03:00`;

    const runOnce = async () => {
      const pub = await request(app).post('/week-templates/publish').send({ weekStart });
      expect([200, 409]).toContain(pub.status);
      if (pub.status === 409) {
        await request(app).post('/week-templates/unpublish').send({ weekStart });
        const again = await request(app).post('/week-templates/publish').send({ weekStart });
        expect(again.status).toBe(200);
      }
      const create = await request(app).post('/appointments').send({
        doctorId: 'd-001',
        patientId: 'p-001',
        start,
        durationMin: 30,
      });
      expect(create.status).toBe(201);
      const list = await request(app).get(`/appointments?date=${day}`);
      expect(list.status).toBe(200);
      return {
        createdId: create.body.id,
        status: create.body.status,
        start: create.body.start,
        count: list.body.items.filter((a) => a.id === create.body.id).length,
      };
    };

    const first = await runOnce();
    const reset = await request(app).post('/demo/reset').send({});
    expect(reset.status).toBe(200);
    expect(reset.body.ok).toBe(true);
    expect(reset.body.sysDate).toBe(data.state.sysDate);

    const second = await runOnce();
    expect(second.status).toBe(first.status);
    expect(second.start).toBe(first.start);
    expect(second.count).toBe(first.count);
  });

  test('unpublish снимает неделю и позволяет опубликовать снова после сброса', async () => {
    const weekStart = '2035-01-08'; // пн
    const pub1 = await request(app).post('/week-templates/publish').send({ weekStart });
    expect(pub1.status).toBe(200);
    const unpub = await request(app).post('/week-templates/unpublish').send({ weekStart });
    expect(unpub.status).toBe(200);
    const pub2 = await request(app).post('/week-templates/publish').send({ weekStart });
    expect(pub2.status).toBe(200);
    expect(pub2.body.slotsCreated).toBe(pub1.body.slotsCreated);
  });

  test('nextVisit сохраняется как {date, serviceId} и читается обратно', async () => {
    const weekStart = '2035-01-15'; // пн
    await request(app).post('/week-templates/publish').send({ weekStart });
    const create = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2035-01-16T09:00:00+03:00',
      durationMin: 30,
    });
    expect(create.status).toBe(201);
    const id = create.body.id;
    await request(app).patch(`/appointments/${id}`).send({ status: 'arrived' });
    await request(app).patch(`/appointments/${id}`).send({ status: 'in_progress' });
    const patch = await request(app).patch(`/appointments/${id}`).send({
      status: 'completed',
      complaints: 'контроль',
      diagnosis: 'ОРВИ',
      visitType: 'repeat',
      performedServiceIds: ['s-002'],
      recommendations: [],
      nextVisit: { date: '2035-01-30', serviceId: 's-002' },
    });
    expect(patch.status).toBe(200);
    expect(patch.body.nextVisit).toEqual({ date: '2035-01-30', serviceId: 's-002' });
    const got = await request(app).get(`/appointments/${id}`);
    expect(got.status).toBe(200);
    expect(got.body.nextVisit).toEqual({ date: '2035-01-30', serviceId: 's-002' });
  });

  test('свободный текст в nextVisit отклоняется 400 invalid_field', async () => {
    const weekStart = '2035-01-22'; // пн
    await request(app).post('/week-templates/publish').send({ weekStart });
    const create = await request(app).post('/appointments').send({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2035-01-23T09:00:00+03:00',
      durationMin: 30,
    });
    expect(create.status).toBe(201);
    const patch = await request(app).patch(`/appointments/${create.body.id}`).send({
      nextVisit: 'через 14 дней',
    });
    expect(patch.status).toBe(400);
    expect(patch.body.error).toBe('invalid_field');
  });

  test('каждый маршрут сервера есть в клиенте api.ts (и наоборот по путям)', () => {
    const stubsDir = __dirname;
    const clientPath = path.join(__dirname, '..', '..', 'src', '__data__', 'api.ts');
    const clientSrc = fs.readFileSync(clientPath, 'utf8');

    const routeFiles = ['schedule.js', 'appointments.js', 'directories.js', 'waitlist.js', 'mass-cancel.js', 'index.js']
      .map((f) => fs.readFileSync(path.join(stubsDir, f), 'utf8'))
      .join('\n');

    const routeRe = /router\.(get|post|patch|put|delete)\(\s*['`]([^'`]+)['`]/g;
    const routes = new Set();
    let m;
    while ((m = routeRe.exec(routeFiles))) {
      routes.add(`${m[1].toUpperCase()} ${m[2]}`);
    }

    // Клиентские вызовы: method из options или GET по умолчанию + path template
    const clientPaths = new Set();
    const callRe = /request(?:<[^>]+>)?\(\s*[`'"]([^`'"]+)[`'"]/g;
    while ((m = callRe.exec(clientSrc))) {
      let p = m[1]
        .replace(/\$\{[^}]+\}/g, ':id')
        .replace(/\/appointments\/:id(?=\?|$)/, '/appointments/:id');
      // normalize encodeURIComponent wrappers already expanded in template strings
      p = p.replace(/\/appointments\/:id\/(history|pay|confirm)/, '/appointments/:id/$1');
      if (p.includes('?')) p = p.split('?')[0];
      clientPaths.add(p);
    }
    // method-aware: look for nearby method
    const methodCalls = [];
    const blockRe = /request(?:<[^>]+>)?\(\s*[`'"]([^`'"]+)[`'"]\s*(?:,\s*\{([^}]*)\})?/g;
    while ((m = blockRe.exec(clientSrc))) {
      let p = m[1].replace(/\$\{[^}]+\}/g, ':param');
      if (p.includes('?')) p = p.split('?')[0];
      // normalize :param for id-like segments
      p = p.replace(/:param/g, ':id');
      const opts = m[2] || '';
      const methodMatch = opts.match(/method:\s*['"](\w+)['"]/);
      const method = (methodMatch ? methodMatch[1] : 'GET').toUpperCase();
      methodCalls.push(`${method} ${p}`);
    }

    const normalizeRoute = (r) => r
      .replace(/:date\b/g, ':id')
      .replace(/:weekStart\b/g, ':id')
      .replace(/:batchId\b/g, ':id')
      .replace(/:itemId\b/g, ':id');

    const serverNorm = [...routes].map(normalizeRoute).sort();
    const clientNorm = methodCalls.map(normalizeRoute).sort();

    const missingInClient = serverNorm.filter((r) => !clientNorm.includes(r));
    const missingOnServer = clientNorm.filter((r) => !serverNorm.includes(r));

    expect({ missingInClient, missingOnServer, serverNorm, clientNorm }).toEqual({
      missingInClient: [],
      missingOnServer: [],
      serverNorm,
      clientNorm,
    });
  });
});
