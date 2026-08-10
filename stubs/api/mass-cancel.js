'use strict';

const { Router } = require('express');
const {
  state,
  newId,
  overlaps,
  normalizeStartIso,
  weekStartOf,
  ensureWeekTemplates,
  findAffectedAppointments,
  buildSlots,
  addDays,
} = require('./data');
const {
  isWithinPublishedShift,
} = require('./lifecycle');

const router = Router();

const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [y, m, d] = String(value).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const findPatient = (id) => state.patients.find((p) => p.id === id) || null;
const findDoctor = (id) => state.doctors.find((d) => d.id === id) || null;

const pendingCount = (batch) =>
  (batch.items || []).filter((i) => i.handlingStatus === 'pending').length;

const decorateBatch = (batch) => ({
  ...batch,
  items: batch.items.map((i) => ({ ...i })),
  pendingCount: pendingCount(batch),
});

const ensureHistory = (a) => {
  if (!Array.isArray(a.history)) a.history = [];
  return a.history;
};

router.post('/mass-cancel/preview', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const doctorId = body.doctorId != null ? String(body.doctorId) : '';
  const dateFrom = body.dateFrom != null ? String(body.dateFrom) : '';
  const dateTo = body.dateTo != null ? String(body.dateTo) : '';
  if (!findDoctor(doctorId)) {
    res.status(400).json({ error: 'doctor_not_found', message: 'Врач не найден' });
    return;
  }
  if (!isDate(dateFrom) || !isDate(dateTo) || dateFrom > dateTo) {
    res.status(400).json({ error: 'invalid_range', message: 'Период задан неверно' });
    return;
  }
  const affected = findAffectedAppointments(doctorId, dateFrom, dateTo);
  res.json({
    affectedCount: affected.length,
    patients: affected.map((a) => {
      const p = findPatient(a.patientId);
      return {
        patientId: a.patientId,
        patientName: p ? p.name : a.patientName || null,
        appointmentId: a.id,
        start: a.start,
      };
    }),
  });
});

router.post('/mass-cancel', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const doctorId = body.doctorId != null ? String(body.doctorId) : '';
  const dateFrom = body.dateFrom != null ? String(body.dateFrom) : '';
  const dateTo = body.dateTo != null ? String(body.dateTo) : '';
  const reason = body.reason != null && String(body.reason).trim()
    ? String(body.reason).trim()
    : 'Снос расписания';

  const doctor = findDoctor(doctorId);
  if (!doctor) {
    res.status(400).json({ error: 'doctor_not_found', message: 'Врач не найден' });
    return;
  }
  if (!isDate(dateFrom) || !isDate(dateTo) || dateFrom > dateTo) {
    res.status(400).json({ error: 'invalid_range', message: 'Период задан неверно' });
    return;
  }

  const affected = findAffectedAppointments(doctorId, dateFrom, dateTo);
  if (affected.length === 0) {
    res.status(400).json({ error: 'nothing_to_cancel', message: 'Нет записей для сноса' });
    return;
  }

  state.massCancelSeq = (state.massCancelSeq || 0) + 1;
  const batchId = `mc-${String(state.massCancelSeq).padStart(3, '0')}`;
  const items = [];
  let itemSeq = 0;

  for (const a of affected) {
    const fromStatus = a.status;
    a.status = 'cancelled';
    a.cancelReason = reason;
    a.cancelledAt = new Date().toISOString();
    a.cancelledBy = 'operator';
    a.massCancelBatchId = batchId;
    ensureHistory(a).push({
      from: fromStatus,
      to: 'cancelled',
      at: a.cancelledAt,
      actor: 'operator',
    });

    itemSeq += 1;
    const patient = findPatient(a.patientId);
    items.push({
      id: `${batchId}-i${itemSeq}`,
      appointmentId: a.id,
      patientId: a.patientId,
      patientName: patient ? patient.name : a.patientName || null,
      patientPhone: patient ? patient.phone : a.patientPhone || null,
      originalStart: a.start,
      // Длительность снесённой записи. Без неё экран перезаписи не знает, сколько времени
      // резервировать, и подставляет константу: приём на 20 минут возвращался на 30.
      durationMin: a.durationMin,
      originalDoctorId: a.doctorId,
      originalDoctorName: doctor.name,
      serviceId: a.serviceId || null,
      handlingStatus: 'pending',
      newAppointmentId: null,
      newStart: null,
    });
  }

  const batch = {
    id: batchId,
    doctorId,
    doctorName: doctor.name,
    dateFrom,
    dateTo,
    reason,
    createdAt: new Date().toISOString(),
    items,
  };
  if (!state.massCancelBatches) state.massCancelBatches = [];
  state.massCancelBatches.push(batch);
  res.status(201).json(decorateBatch(batch));
});

router.get('/mass-cancel/:batchId', (req, res) => {
  const batch = (state.massCancelBatches || []).find((b) => b.id === req.params.batchId);
  if (!batch) {
    res.status(404).json({ error: 'not_found', message: 'Пакет сноса не найден' });
    return;
  }
  const handling = req.query.handling != null ? String(req.query.handling) : '';
  const decorated = decorateBatch(batch);
  if (handling) {
    decorated.items = decorated.items.filter((i) => i.handlingStatus === handling);
  }
  res.json(decorated);
});

router.get('/mass-cancel/:batchId/export', (req, res) => {
  const batch = (state.massCancelBatches || []).find((b) => b.id === req.params.batchId);
  if (!batch) {
    res.status(404).json({ error: 'not_found', message: 'Пакет сноса не найден' });
    return;
  }
  const header = 'patient;originalStart;doctor;handlingStatus;newStart';
  const lines = batch.items.map((i) => {
    const handling = i.handlingStatus === 'pending' ? 'под_отмену' : 'перезаписан';
    const cells = [
      i.patientName || i.patientId,
      i.originalStart,
      i.originalDoctorName || i.originalDoctorId,
      handling,
      i.newStart || '',
    ];
    return cells.map((c) => String(c).replace(/;/g, ',')).join(';');
  });
  const csv = [header, ...lines].join('\n');
  res.json({
    filename: `mass-cancel-${batch.id}.csv`,
    csv,
  });
});

router.get('/mass-cancel/:batchId/matches', (req, res) => {
  const batch = (state.massCancelBatches || []).find((b) => b.id === req.params.batchId);
  if (!batch) {
    res.status(404).json({ error: 'not_found', message: 'Пакет сноса не найден' });
    return;
  }
  const itemId = req.query.itemId != null ? String(req.query.itemId) : '';
  const item = batch.items.find((i) => i.id === itemId);
  if (!item || item.handlingStatus !== 'pending') {
    res.status(400).json({ error: 'item_not_pending', message: 'Строка не требует переноса' });
    return;
  }

  const excludeDoctor = batch.doctorId;
  const dateFrom = batch.dateFrom;
  const dateTo = addDays(batch.dateTo, 7);
  const items = [];
  let cursor = dateFrom;
  let guard = 0;
  while (cursor <= dateTo && guard < 21) {
    guard += 1;
    const slots = buildSlots(cursor);
    for (const slot of slots) {
      for (const doc of slot.doctors) {
        if (doc.busy) continue;
        if (doc.id === excludeDoctor) continue;
        items.push({
          date: cursor,
          time: slot.time,
          doctorId: doc.id,
          doctorName: doc.name,
        });
      }
    }
    cursor = addDays(cursor, 1);
  }
  res.json({ items: items.slice(0, 40) });
});

router.post('/mass-cancel/:batchId/items/:itemId/reschedule', (req, res) => {
  const batch = (state.massCancelBatches || []).find((b) => b.id === req.params.batchId);
  if (!batch) {
    res.status(404).json({ error: 'not_found', message: 'Пакет сноса не найден' });
    return;
  }
  const item = batch.items.find((i) => i.id === req.params.itemId);
  if (!item) {
    res.status(404).json({ error: 'item_not_found', message: 'Строка не найдена' });
    return;
  }
  if (item.handlingStatus !== 'pending') {
    res.status(409).json({ error: 'already_handled', message: 'Строка уже обработана' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const doctorId = body.doctorId != null ? String(body.doctorId) : '';
  const start = body.start != null ? String(body.start) : '';
  // Умолчание — длительность снесённой записи, а не константа: перезапись возвращает
  // пациенту его приём, а не приём стандартного размера.
  const durationMin = body.durationMin != null ? Number(body.durationMin) : Number(item.durationMin);
  const serviceId = body.serviceId != null && body.serviceId !== ''
    ? String(body.serviceId)
    : item.serviceId;

  if (!findDoctor(doctorId)) {
    res.status(400).json({ error: 'doctor_not_found', message: 'Врач не найден' });
    return;
  }
  if (!Number.isFinite(durationMin) || durationMin <= 0) {
    res.status(400).json({ error: 'invalid_duration', message: 'Длительность задана неверно' });
    return;
  }

  const startIso = normalizeStartIso(start);
  const date = String(startIso).slice(0, 10);
  const weekStart = weekStartOf(date);
  if (!isWithinPublishedShift(
    date,
    startIso,
    durationMin,
    doctorId,
    weekStart,
    ensureWeekTemplates(weekStart),
    state.publishedWeeks,
  )) {
    res.status(409).json({ error: 'outside_shift', message: 'Слот вне опубликованной смены' });
    return;
  }
  const collision = state.appointments.find((a) => overlaps(a, doctorId, startIso, durationMin));
  if (collision) {
    res.status(409).json({
      error: 'slot_taken',
      message: `Слот уже занят (запись ${collision.id})`,
    });
    return;
  }

  const record = {
    id: newId(),
    doctorId,
    patientId: item.patientId,
    start: startIso,
    durationMin,
    status: 'scheduled',
    paymentType: 'regular',
    serviceId: serviceId || null,
    complaints: null,
    diagnosis: null,
    visitType: null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
    cancelReason: null,
    cancelledAt: null,
    cancelledBy: null,
    operatorComment: `Перезапись после сноса ${batch.id}`,
    paidAmount: null,
    paidAt: null,
    createdByName: 'Оператор колл-центра',
    createdByUnit: 'Колл-центр',
    confirmed: false,
    history: [{
      from: null,
      to: 'scheduled',
      at: new Date().toISOString(),
      actor: 'operator',
    }],
  };
  state.appointments.push(record);

  item.handlingStatus = 'rescheduled';
  item.newAppointmentId = record.id;
  item.newStart = record.start;

  res.json({
    item: { ...item },
    appointment: record,
    batch: decorateBatch(batch),
  });
});

module.exports = router;
