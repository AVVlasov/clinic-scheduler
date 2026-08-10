'use strict';

const { Router } = require('express');
const { state, newPatientId } = require('./data');

const router = Router();

const DOCUMENT_TYPES = new Set(['passport_rf', 'birth_cert', 'foreign']);

const normalizeName = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, ' ');

const fullNameFromParts = (lastName, firstName, middleName) =>
  [lastName, firstName, middleName].map((p) => String(p || '').trim()).filter(Boolean).join(' ');

const toPatient = (p) => ({
  id: p.id,
  name: p.name,
  phone: p.phone,
  birthDate: p.birthDate,
  cardNumber: p.cardNumber || '',
  lastName: p.lastName || null,
  firstName: p.firstName || null,
  middleName: p.middleName || null,
  email: p.email != null ? p.email : null,
  documentType: p.documentType != null ? p.documentType : null,
  documentNumber: p.documentNumber != null ? p.documentNumber : null,
  consents: Array.isArray(p.consents) ? p.consents.slice() : [],
});

const matchQuery = (p, q) => {
  const needle = normalizeName(q);
  if (!needle) return true;
  const phoneDigits = String(p.phone || '').replace(/\D/g, '');
  const needleDigits = String(q).replace(/\D/g, '');
  if (needleDigits.length >= 4 && phoneDigits.includes(needleDigits)) return true;
  const hay = [
    p.name,
    p.lastName,
    p.firstName,
    p.middleName,
    p.phone,
    p.cardNumber,
    p.id,
  ].map((v) => normalizeName(v)).join(' ');
  return hay.includes(needle);
};

// Карточка справочника = запись врача из общих справочников + поля площадки.
const toCard = (card) => {
  const doctor = state.doctors.find((d) => d.id === card.id);
  if (!doctor) return null;
  return {
    ...doctor,
    ...card,
    patientAge: card.patientAge != null ? card.patientAge : '',
    preferentialLimit: card.preferentialLimit != null ? card.preferentialLimit : '',
    pairWork: card.pairWork != null ? card.pairWork : '',
    serviceWindows: Array.isArray(card.serviceWindows)
      ? card.serviceWindows.map((w) => ({ what: w.what, when: w.when }))
      : [],
    specializationTags: Array.isArray(card.specializationTags) ? [...card.specializationTags] : [],
  };
};

const STRING_LIST_FIELDS = ['specialties', 'temporarySites', 'admissionRules', 'equipmentAccess', 'specializationTags'];
const STRING_FIELDS = ['site', 'cabinet', 'patientAge', 'preferentialLimit', 'pairWork'];

const isStringList = (value) => Array.isArray(value) && value.every((v) => typeof v === 'string');

const isServiceWindows = (value) =>
  Array.isArray(value)
  && value.every((w) => w && typeof w === 'object'
    && typeof w.what === 'string'
    && typeof w.when === 'string');

router.get('/doctors', (req, res) => {
  res.json({ items: state.doctors });
});

router.get('/doctor-cards', (req, res) => {
  res.json({ items: state.doctorCards.map(toCard).filter(Boolean) });
});

router.patch('/doctor-cards/:id', (req, res) => {
  const card = state.doctorCards.find((c) => c.id === req.params.id);
  if (!card) {
    res.status(404).json({ error: 'not_found', message: 'Карточка врача не найдена' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};

  for (const field of STRING_LIST_FIELDS) {
    if (body[field] !== undefined && !isStringList(body[field])) {
      res.status(400).json({ error: 'invalid_field', message: `Поле «${field}» должно быть списком строк` });
      return;
    }
  }
  for (const field of STRING_FIELDS) {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      res.status(400).json({ error: 'invalid_field', message: `Поле «${field}» должно быть строкой` });
      return;
    }
  }
  if (body.serviceWindows !== undefined && !isServiceWindows(body.serviceWindows)) {
    res.status(400).json({ error: 'invalid_field', message: 'Поле «serviceWindows» должно быть списком { what, when }' });
    return;
  }

  for (const field of STRING_LIST_FIELDS) {
    if (body[field] !== undefined) card[field] = [...body[field]];
  }
  if (body.site !== undefined) card.site = body.site;
  if (body.patientAge !== undefined) card.patientAge = body.patientAge;
  if (body.preferentialLimit !== undefined) card.preferentialLimit = body.preferentialLimit;
  if (body.pairWork !== undefined) card.pairWork = body.pairWork;
  if (body.serviceWindows !== undefined) {
    card.serviceWindows = body.serviceWindows.map((w) => ({ what: w.what, when: w.when }));
  }

  const doctor = state.doctors.find((d) => d.id === card.id);
  if (doctor) {
    if (body.cabinet !== undefined) doctor.cabinet = body.cabinet;
    if (body.specialties !== undefined) {
      doctor.specialty = body.specialties.length > 0 ? body.specialties[0] : '';
    }
  }

  res.json(toCard(card));
});

router.get('/services', (req, res) => {
  res.json({ items: state.services });
});

router.get('/patients', (req, res) => {
  const q = req.query.q != null ? String(req.query.q) : '';
  const items = state.patients
    .filter((p) => matchQuery(p, q))
    .map(toPatient);
  res.json({ items });
});

router.get('/patients/:id', (req, res) => {
  const patient = state.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    res.status(404).json({ error: 'not_found', message: 'Пациент не найден' });
    return;
  }
  res.json(toPatient(patient));
});

router.get('/patients/:id/appointments', (req, res) => {
  const patient = state.patients.find((p) => p.id === req.params.id);
  if (!patient) {
    res.status(404).json({ error: 'not_found', message: 'Пациент не найден' });
    return;
  }
  const items = [...state.appointments, ...(state.demoAppointments || [])]
    .filter((a) => a.patientId === patient.id)
    .map((a) => {
      const doctor = state.doctors.find((d) => d.id === a.doctorId);
      return {
        ...a,
        doctorName: doctor ? doctor.name : null,
        doctorCabinet: doctor ? doctor.cabinet : null,
        patientName: patient.name,
        patientPhone: patient.phone,
        patientBirthDate: patient.birthDate,
        patientUid: patient.cardNumber || null,
        createdByName: a.createdByName != null ? a.createdByName : null,
        createdByUnit: a.createdByUnit != null ? a.createdByUnit : null,
        confirmed: Boolean(a.confirmed),
      };
    })
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
  res.json({ date: state.sysDate || state.date, items });
});

router.post('/patients', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const lastName = body.lastName != null ? String(body.lastName).trim() : '';
  const firstName = body.firstName != null ? String(body.firstName).trim() : '';
  const middleName = body.middleName != null ? String(body.middleName).trim() : '';
  const birthDate = body.birthDate != null ? String(body.birthDate).trim() : '';
  const phone = body.phone != null ? String(body.phone).trim() : '';

  const missing = [];
  if (!lastName) missing.push('фамилия');
  if (!firstName) missing.push('имя');
  if (!middleName) missing.push('отчество');
  if (!birthDate) missing.push('дата рождения');
  if (!phone) missing.push('телефон');
  if (missing.length > 0) {
    res.status(400).json({
      error: 'validation',
      message: `Заполните обязательные поля: ${missing.join(', ')}`,
      fields: missing,
    });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    res.status(400).json({
      error: 'invalid_field',
      message: 'Дата рождения должна быть в формате ГГГГ-ММ-ДД',
    });
    return;
  }

  const name = fullNameFromParts(lastName, firstName, middleName);
  const nameKey = normalizeName(name);
  const duplicate = state.patients.find(
    (p) => normalizeName(p.name) === nameKey && p.birthDate === birthDate,
  );
  if (duplicate) {
    res.status(409).json({
      error: 'duplicate_patient',
      message: 'Карта с такими ФИО и датой рождения уже есть',
      patient: toPatient(duplicate),
    });
    return;
  }

  if (body.documentType != null && body.documentType !== '' && !DOCUMENT_TYPES.has(body.documentType)) {
    res.status(400).json({
      error: 'invalid_field',
      message: 'Неизвестный тип документа',
    });
    return;
  }

  const id = newPatientId();
  const seq = id.replace(/^p-/, '');
  const record = {
    id,
    name,
    lastName,
    firstName,
    middleName,
    phone,
    birthDate,
    cardNumber: `UID ${seq.padStart(4, '0')} ${String(9000 + Number(seq)).padStart(4, '0')}`,
    email: body.email != null && String(body.email).trim() ? String(body.email).trim() : null,
    documentType: body.documentType || null,
    documentNumber: body.documentNumber != null && String(body.documentNumber).trim()
      ? String(body.documentNumber).trim()
      : null,
    consents: Array.isArray(body.consents)
      ? body.consents.map((c) => String(c))
      : [],
  };
  state.patients.push(record);
  res.status(201).json(toPatient(record));
});

module.exports = router;
