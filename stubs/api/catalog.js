'use strict';

const { Router } = require('express');
const {
  state,
  buildEquipmentDay,
  buildCompetencies,
  setCompetency,
  setDurationRuleEnabled,
} = require('./data');

const router = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toEquipment = (e) => ({
  id: e.id,
  name: e.name,
  code: e.code,
  kind: e.kind,
  type: e.type,
  cabinet: e.cabinet,
  hours: { ...e.hours },
  maintenance: e.maintenance,
  serviceIds: e.serviceIds.slice(),
  serviceNames: e.serviceIds
    .map((id) => (state.services.find((s) => s.id === id) || {}).name)
    .filter(Boolean),
});

router.get('/equipment', (req, res) => {
  res.json({ items: (state.equipment || []).map(toEquipment) });
});

router.get('/equipment/schedule', (req, res) => {
  const date = req.query.date != null ? String(req.query.date) : '';
  if (!DATE_RE.test(date)) {
    res.status(400).json({
      error: 'invalid_date',
      message: 'Дата обязательна и задаётся в формате ГГГГ-ММ-ДД',
    });
    return;
  }
  res.json(buildEquipmentDay(date));
});

router.get('/competencies', (req, res) => {
  res.json(buildCompetencies());
});

router.patch('/competencies', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const serviceId = body.serviceId != null ? String(body.serviceId) : '';
  const doctorId = body.doctorId != null ? String(body.doctorId) : '';
  const value = body.value != null ? String(body.value) : '';

  const result = setCompetency(serviceId, doctorId, value);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.json({
    serviceId: result.serviceId,
    doctorId: result.doctorId,
    value: result.value,
    matrix: buildCompetencies(),
  });
});

router.get('/duration-rules', (req, res) => {
  res.json({
    items: (state.durationRules || []).map((r) => ({
      ...r,
      match: { ...r.match },
      effect: { ...r.effect },
    })),
  });
});

router.patch('/duration-rules/:id', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (typeof body.enabled !== 'boolean') {
    res.status(400).json({
      error: 'invalid_field',
      message: 'Поле «enabled» должно быть логическим',
    });
    return;
  }
  const result = setDurationRuleEnabled(req.params.id, body.enabled);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.json({
    items: (state.durationRules || []).map((r) => ({
      ...r,
      match: { ...r.match },
      effect: { ...r.effect },
    })),
  });
});

module.exports = router;
