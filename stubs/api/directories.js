'use strict';

const { Router } = require('express');
const { state } = require('./data');

const router = Router();

// Карточка справочника = запись врача из общих справочников + поля площадки.
const toCard = (card) => {
  const doctor = state.doctors.find((d) => d.id === card.id);
  if (!doctor) return null;
  return { ...doctor, ...card };
};

const STRING_LIST_FIELDS = ['specialties', 'temporarySites', 'admissionRules', 'equipmentAccess'];
const STRING_FIELDS = ['site', 'cabinet'];

const isStringList = (value) => Array.isArray(value) && value.every((v) => typeof v === 'string');

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

  for (const field of STRING_LIST_FIELDS) {
    if (body[field] !== undefined) card[field] = [...body[field]];
  }
  if (body.site !== undefined) card.site = body.site;

  const doctor = state.doctors.find((d) => d.id === card.id);
  // Кабинет и специальность живут в общей записи врача: их читают остальные АРМы.
  if (doctor) {
    if (body.cabinet !== undefined) doctor.cabinet = body.cabinet;
    if (body.specialties !== undefined && body.specialties.length > 0) {
      doctor.specialty = body.specialties[0];
    }
  }

  res.json(toCard(card));
});

router.get('/services', (req, res) => {
  res.json({ items: state.services });
});

router.get('/patients', (req, res) => {
  res.json({ items: state.patients });
});

module.exports = router;
