'use strict';

const { Router } = require('express');
const { PAYMENT_TYPES } = require('./lifecycle');
/** Возраст пациента на дату — возрастное правило удлиняет приём. */
const patientAgeOn = (birthDate, onDate) => {
  const [by, bm, bd] = String(birthDate).split('-').map(Number);
  const [ny, nm, nd] = String(onDate).split('-').map(Number);
  let years = ny - by;
  if (nm < bm || (nm === bm && nd < bd)) years -= 1;
  return years;
};

const {
  state,
  buildSlots,
  addDays,
  seedDurationFor,
  seedVisitTypeFor,
} = require('./data');

const router = Router();

const KINDS = new Set(['from_doctor', 'distant', 'reschedule', 'nearest']);
const PRIORITIES = new Set(['normal', 'high']);

const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [y, m, d] = String(value).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const findPatient = (id) => state.patients.find((p) => p.id === id) || null;

const findAppointment = (id) => {
  const live = state.appointments.find((a) => a.id === id);
  if (live) return live;
  return (state.demoAppointments || []).find((a) => a.id === id) || null;
};

const enrich = (entry) => {
  const patient = findPatient(entry.patientId);
  return {
    ...entry,
    patientName: patient ? patient.name : entry.patientName || null,
    patientPhone: patient ? patient.phone : entry.patientPhone || null,
  };
};

const openCount = () => (state.waitlist || []).filter((w) => w.status === 'open').length;

const nextWaitlistId = () => {
  state.waitlistSeq = (state.waitlistSeq || 0) + 1;
  return `W-${String(state.waitlistSeq).padStart(4, '0')}`;
};

const createEntry = (body) => {
  const kind = body.kind != null ? String(body.kind) : '';
  const patientId = body.patientId != null ? String(body.patientId) : '';
  const dateFrom = body.dateFrom != null ? String(body.dateFrom) : '';
  const dateTo = body.dateTo != null ? String(body.dateTo) : '';
  const priority = body.priority != null ? String(body.priority) : 'normal';
  const comment = body.comment != null ? String(body.comment) : '';
  const serviceId = body.serviceId != null && body.serviceId !== '' ? String(body.serviceId) : null;
  const doctorId = body.doctorId != null && body.doctorId !== '' ? String(body.doctorId) : null;
  const insuranceAppointmentId = body.insuranceAppointmentId != null && body.insuranceAppointmentId !== ''
    ? String(body.insuranceAppointmentId)
    : null;
  const createdBy = body.createdBy != null ? String(body.createdBy) : 'operator';
  const paymentType = body.paymentType != null && body.paymentType !== '' ? String(body.paymentType) : 'regular';

  if (!KINDS.has(kind)) {
    return { ok: false, status: 400, error: 'invalid_kind', message: 'Неизвестный тип заявки' };
  }
  if (!PRIORITIES.has(priority)) {
    return { ok: false, status: 400, error: 'invalid_priority', message: 'Неизвестный приоритет' };
  }
  if (!PAYMENT_TYPES.includes(paymentType)) {
    return { ok: false, status: 400, error: 'invalid_payment_type', message: 'Неизвестное основание оплаты' };
  }
  if (!findPatient(patientId)) {
    return { ok: false, status: 400, error: 'patient_not_found', message: 'Пациент не найден' };
  }
  if (!isDate(dateFrom) || !isDate(dateTo) || dateFrom > dateTo) {
    return { ok: false, status: 400, error: 'invalid_range', message: 'Окно дат задано неверно' };
  }
  if (!serviceId && !doctorId) {
    return { ok: false, status: 400, error: 'validation', message: 'Укажите услугу или врача' };
  }
  if (serviceId && !state.services.some((s) => s.id === serviceId)) {
    return { ok: false, status: 400, error: 'service_not_found', message: 'Услуга не найдена' };
  }
  if (doctorId && !state.doctors.some((d) => d.id === doctorId)) {
    return { ok: false, status: 400, error: 'doctor_not_found', message: 'Врач не найден' };
  }

  let insuranceAppt = null;
  if (insuranceAppointmentId) {
    insuranceAppt = findAppointment(insuranceAppointmentId);
    if (!insuranceAppt) {
      return { ok: false, status: 400, error: 'appointment_not_found', message: 'Страховочная запись не найдена' };
    }
    if (insuranceAppt.patientId !== patientId) {
      return { ok: false, status: 400, error: 'patient_mismatch', message: 'Запись принадлежит другому пациенту' };
    }
  }

  if (!state.waitlist) state.waitlist = [];
  const id = nextWaitlistId();
  const entry = {
    id,
    kind,
    status: 'open',
    priority,
    patientId,
    patientName: null,
    patientPhone: null,
    serviceId,
    doctorId,
    dateFrom,
    dateTo,
    comment,
    paymentType,
    insuranceAppointmentId,
    createdAt: new Date().toISOString(),
    createdBy,
    fulfilledAppointmentId: null,
    fulfilledAt: null,
  };

  // ФТ С10: страховочная запись не отменяется — только помечается.
  if (insuranceAppt) {
    insuranceAppt.insuranceForWaitlistId = id;
  }

  state.waitlist.push(entry);
  return { ok: true, entry: enrich(entry) };
};

router.get('/waitlist', (req, res) => {
  const kind = req.query.kind != null ? String(req.query.kind) : '';
  const status = req.query.status != null ? String(req.query.status) : '';
  let items = (state.waitlist || []).map(enrich);
  if (kind) items = items.filter((w) => w.kind === kind);
  if (status) items = items.filter((w) => w.status === status);
  res.json({ items, openCount: openCount() });
});

router.post('/waitlist', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const result = createEntry(body);
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.status(201).json(result.entry);
});

router.post('/waitlist/:id/copy', (req, res) => {
  const src = (state.waitlist || []).find((w) => w.id === req.params.id);
  if (!src) {
    res.status(404).json({ error: 'not_found', message: 'Заявка не найдена' });
    return;
  }
  const result = createEntry({
    kind: src.kind,
    patientId: src.patientId,
    serviceId: src.serviceId,
    doctorId: src.doctorId,
    dateFrom: src.dateFrom,
    dateTo: src.dateTo,
    priority: src.priority,
    paymentType: src.paymentType,
    comment: src.comment ? `${src.comment} (копия)` : 'Копия заявки',
    createdBy: 'operator',
  });
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message });
    return;
  }
  res.status(201).json(result.entry);
});

router.get('/waitlist/:id/matches', (req, res) => {
  const entry = (state.waitlist || []).find((w) => w.id === req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'not_found', message: 'Заявка не найдена' });
    return;
  }

  const service = entry.serviceId
    ? state.services.find((s) => s.id === entry.serviceId)
    : null;
  // Длительность считают те же правила, что и запись из АРМ: иначе подбор
  // предлагает окна под норматив справочника, а сервер отклоняет запись,
  // потому что реальный приём длиннее.
  const patient = state.patients.find((p) => p.id === entry.patientId) || null;
  const ageYears = patient ? patientAgeOn(patient.birthDate, entry.dateFrom) : null;
  const durationMin = service
    ? seedDurationFor(service, seedVisitTypeFor(service), ageYears)
    : 30;
  const stepMinutes = 15;
  const stepsNeeded = Math.max(1, Math.ceil(durationMin / stepMinutes));

  const doctorFilter = entry.doctorId
    ? [entry.doctorId]
    : (service && Array.isArray(service.doctorIds) && service.doctorIds.length > 0
      ? service.doctorIds
      : state.doctors.map((d) => d.id));

  const items = [];
  let cursor = entry.dateFrom;
  let guard = 0;
  while (cursor <= entry.dateTo && guard < 60) {
    guard += 1;
    const slots = buildSlots(cursor);
    for (let i = 0; i < slots.length; i += 1) {
      const slot = slots[i];
      for (const doc of slot.doctors) {
        if (doc.busy) continue;
        if (!doctorFilter.includes(doc.id)) continue;
        if (service && Array.isArray(service.doctorIds) && service.doctorIds.length > 0
          && !service.doctorIds.includes(doc.id)) continue;
        // Окно должно вмещать приём целиком, а не одну ячейку сетки.
        let fits = true;
        for (let k = 0; k < stepsNeeded; k += 1) {
          const cell = (slots[i + k] || { doctors: [] }).doctors.find((d) => d.id === doc.id);
          if (!cell || cell.busy) { fits = false; break; }
        }
        if (!fits) continue;
        items.push({
          date: cursor,
          time: slot.time,
          doctorId: doc.id,
          doctorName: doc.name,
          durationMin,
        });
      }
    }
    cursor = addDays(cursor, 1);
  }

  res.json({ items: items.slice(0, 40) });
});

router.post('/waitlist/:id/fulfill', (req, res) => {
  const entry = (state.waitlist || []).find((w) => w.id === req.params.id);
  if (!entry) {
    res.status(404).json({ error: 'not_found', message: 'Заявка не найдена' });
    return;
  }
  if (entry.status !== 'open') {
    res.status(409).json({ error: 'not_open', message: 'Заявка уже закрыта' });
    return;
  }
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const appointmentId = body.appointmentId != null ? String(body.appointmentId) : '';
  const appt = findAppointment(appointmentId);
  if (!appt) {
    res.status(400).json({ error: 'appointment_not_found', message: 'Запись не найдена' });
    return;
  }
  entry.status = 'fulfilled';
  entry.fulfilledAppointmentId = appointmentId;
  entry.fulfilledAt = new Date().toISOString();
  res.json(enrich(entry));
});

module.exports = router;
