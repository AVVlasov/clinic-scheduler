'use strict';

const request = require('supertest');
const express = require('express');

const apiRouter = require('./index');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
  return app;
};

describe('stubs/api — синхронизация specialties↔specialty (включая пустой список)', () => {
  let app;
  let stateRef;

  beforeAll(() => {
    app = buildApp();
    stateRef = require('./data').state;
  });

  test('PATCH specialties=[] → doctor.specialty сбрасывается (а не хранит прежнее значение)', async () => {
    const setupPatch = await request(app)
      .patch('/doctor-cards/d-006')
      .send({ specialties: ['Хирург'] });
    expect(setupPatch.status).toBe(200);

    const before = (await request(app).get('/doctors')).body.items
      .find((d) => d.id === 'd-006');
    const priorSpecialty = before.specialty;
    expect(priorSpecialty).toBe('Хирург');

    const cardBefore = (await request(app).get('/doctor-cards')).body.items
      .find((c) => c.id === 'd-006');
    expect(cardBefore.specialties).toEqual(['Хирург']);

    const patch = await request(app)
      .patch('/doctor-cards/d-006')
      .send({ specialties: [] });
    expect(patch.status).toBe(200);

    const cardsAfter = (await request(app).get('/doctor-cards')).body.items
      .find((c) => c.id === 'd-006');
    expect(cardsAfter.specialties).toEqual([]);

    const doctorsAfter = (await request(app).get('/doctors')).body.items
      .find((d) => d.id === 'd-006');
    expect(doctorsAfter.specialty).not.toBe(priorSpecialty);
    expect(doctorsAfter.specialty === '' || doctorsAfter.specialty == null).toBe(true);
  });

  test('round-trip: пусто → одна специальность → пусто → одна, /doctors и /doctor-cards согласованы на каждом шаге', async () => {
    const id = 'd-005';

    const a1 = await request(app).patch(`/doctor-cards/${id}`).send({ specialties: [] });
    expect(a1.status).toBe(200);
    const doc1 = (await request(app).get('/doctors')).body.items.find((d) => d.id === id);
    const card1 = (await request(app).get('/doctor-cards')).body.items.find((c) => c.id === id);
    expect(card1.specialties).toEqual([]);
    expect(doc1.specialty === '' || doc1.specialty == null).toBe(true);

    const a2 = await request(app)
      .patch(`/doctor-cards/${id}`)
      .send({ specialties: ['Эндокринолог'] });
    expect(a2.status).toBe(200);
    const doc2 = (await request(app).get('/doctors')).body.items.find((d) => d.id === id);
    const card2 = (await request(app).get('/doctor-cards')).body.items.find((c) => c.id === id);
    expect(card2.specialties).toEqual(['Эндокринолог']);
    expect(doc2.specialty).toBe('Эндокринолог');

    const a3 = await request(app)
      .patch(`/doctor-cards/${id}`)
      .send({ specialties: ['Терапевт', 'Врач общей практики'] });
    expect(a3.status).toBe(200);
    const doc3 = (await request(app).get('/doctors')).body.items.find((d) => d.id === id);
    const card3 = (await request(app).get('/doctor-cards')).body.items.find((c) => c.id === id);
    expect(card3.specialties).toEqual(['Терапевт', 'Врач общей практики']);
    expect(doc3.specialty).toBe('Терапевт');

    const a4 = await request(app).patch(`/doctor-cards/${id}`).send({ specialties: [] });
    expect(a4.status).toBe(200);
    const doc4 = (await request(app).get('/doctors')).body.items.find((d) => d.id === id);
    const card4 = (await request(app).get('/doctor-cards')).body.items.find((c) => c.id === id);
    expect(card4.specialties).toEqual([]);
    expect(doc4.specialty === '' || doc4.specialty == null).toBe(true);
  });

  test('PATCH specialties без изменений (undefined) — doctor.specialty не трогается (обратная совместимость)', async () => {
    const before = (await request(app).get('/doctors')).body.items
      .find((d) => d.id === 'd-001');
    expect(before.specialty).toBe('Терапевт');

    const patch = await request(app)
      .patch('/doctor-cards/d-001')
      .send({ cabinet: '999' });
    expect(patch.status).toBe(200);

    const after = (await request(app).get('/doctors')).body.items
      .find((d) => d.id === 'd-001');
    expect(after.cabinet).toBe('999');
    expect(after.specialty).toBe('Терапевт');
  });
});