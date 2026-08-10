'use strict';

const request = require('supertest');
const express = require('express');

const apiRouter = require('./index');
const { resetState, state } = require('./data');

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use(apiRouter);
  return app;
};

describe('stubs/api — пациенты: поиск, создание, дубликаты', () => {
  let app;

  beforeEach(() => {
    resetState();
    app = buildApp();
  });

  test('GET /patients?q= ищет по фамилии, телефону и номеру карты', async () => {
    const byName = await request(app).get('/patients?q=Алексеев');
    expect(byName.status).toBe(200);
    expect(byName.body.items.some((p) => p.id === 'p-001')).toBe(true);

    const byPhone = await request(app).get('/patients?q=9001000002');
    expect(byPhone.body.items.some((p) => p.id === 'p-002')).toBe(true);

    const byCard = await request(app).get('/patients?q=UID 0003');
    expect(byCard.body.items.some((p) => p.id === 'p-003')).toBe(true);
  });

  test('POST /patients создаёт карту и отдаёт cardNumber', async () => {
    const res = await request(app)
      .post('/patients')
      .send({
        lastName: 'Новикова',
        firstName: 'Елена',
        middleName: 'Павловна',
        birthDate: '1995-06-01',
        phone: '+7 900 555-00-01',
        email: 'novikova@example.com',
        documentType: 'passport_rf',
        documentNumber: '4500 123456',
        consents: ['Обработка персональных данных'],
      });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Новикова Елена Павловна');
    expect(res.body.cardNumber).toMatch(/^UID /);
    expect(state.patients.some((p) => p.id === res.body.id)).toBe(true);
  });

  test('POST /patients с теми же ФИО и датой рождения → 409 duplicate_patient', async () => {
    const first = await request(app)
      .post('/patients')
      .send({
        lastName: 'Сидоров',
        firstName: 'Пётр',
        middleName: 'Ильич',
        birthDate: '1988-02-02',
        phone: '+7 900 555-00-02',
      });
    expect(first.status).toBe(201);

    const dup = await request(app)
      .post('/patients')
      .send({
        lastName: 'Сидоров',
        firstName: 'Пётр',
        middleName: 'Ильич',
        birthDate: '1988-02-02',
        phone: '+7 900 555-99-99',
      });
    expect(dup.status).toBe(409);
    expect(dup.body.error).toBe('duplicate_patient');
    expect(dup.body.patient.id).toBe(first.body.id);
  });

  test('POST /patients без обязательных полей → 400 с перечислением', async () => {
    const res = await request(app).post('/patients').send({ lastName: 'Только' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('validation');
    expect(res.body.message).toContain('имя');
  });

  test('GET /patients/:id/appointments отдаёт записи пациента', async () => {
    const res = await request(app).get('/patients/p-001/appointments');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.items.every((a) => a.patientId === 'p-001')).toBe(true);
  });
});
