'use strict';

const { Router } = require('express');
const { state, newId, overlaps, weekStartOf, weekTemplateSeed } = require('./data');
const {
  APPOINTMENT_STATUSES,
  PAYMENT_TYPES,
  isStatusTransitionAllowed,
  isAppointmentStatus,
  isPaymentType,
  isWithinPublishedShift,
  isTerminalStatus,
} = require('./lifecycle');

const router = Router();

const PROTOCOL_STRING_FIELDS = ['complaints', 'diagnosis', 'nextVisit'];
const PROTOCOL_STRING_LIST_FIELDS = ['performedServiceIds', 'recommendations'];
const PROTOCOL_VISIT_TYPES = new Set(['first', 'repeat']);

const checkShift = (doctorId, start, durationMin) => {
  const date = String(start).slice(0, 10);
  const weekStart = weekStartOf(date);
  if (!isWithinPublishedShift(
    date,
    start,
    durationMin,
    doctorId,
    weekStart,
    weekTemplateSeed,
    state.publishedWeeks,
  )) {
    return {
      ok: false,
      body: {
        error: 'outside_shift',
        message: `Интервал ${start}+${durationMin}м не попадает в опубликованный рабочий шаблон врача ${doctorId}`,
      },
    };
  }
  return { ok: true };
};

const tryApplyProtocolPatch = (draft, body) => {
  for (const field of PROTOCOL_STRING_FIELDS) {
    if (body[field] !== undefined) {
      if (body[field] !== null && typeof body[field] !== 'string') {
        return { ok: false, field };
      }
      draft[field] = body[field];
    }
  }
  for (const field of PROTOCOL_STRING_LIST_FIELDS) {
    if (body[field] !== undefined) {
      if (!Array.isArray(body[field]) || !body[field].every((v) => typeof v === 'string')) {
        return { ok: false, field };
      }
      draft[field] = [...body[field]];
    }
  }
  if (body.visitType !== undefined && body.visitType !== null) {
    if (!PROTOCOL_VISIT_TYPES.has(body.visitType)) {
      return { ok: false, field: 'visitType' };
    }
    draft.visitType = body.visitType;
  } else if (body.visitType === null) {
    draft.visitType = null;
  }
  return { ok: true };
};

const decorate = (a) => {
  const doctor = state.doctors.find((d) => d.id === a.doctorId);
  const patient = state.patients.find((p) => p.id === a.patientId);
  return {
    ...a,
    doctorName: doctor ? doctor.name : null,
    patientName: patient ? patient.name : null,
    patientPhone: patient ? patient.phone : null,
    patientBirthDate: patient ? patient.birthDate : null,
    patientUid: patient ? `UID ${patient.id.replace(/^[a-z]-/, '').padStart(4, '0')} ${Math.abs(hashCode(patient.id)).toString().padStart(4, '0')}` : null,
  };
};

const hashCode = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h;
};

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

router.get('/appointments', (req, res) => {
  const rawDate = req.query.date;
  const requested = rawDate != null && rawDate !== '' ? String(rawDate) : state.date;
  if (!isDate(requested)) {
    res.status(400).json({ error: 'invalid_date', message: 'Дата должна быть в формате ГГГГ-ММ-ДД' });
    return;
  }
  const items = state.appointments
    .concat(state.demoAppointments || [])
    .filter((a) => String(a.start).slice(0, 10) === requested)
    .map(decorate);
  res.json({ items, date: requested });
});

router.get('/appointments/:id', (req, res) => {
  const a = state.appointments.find((x) => x.id === req.params.id)
    || (state.demoAppointments || []).find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found' });
  res.json(decorate(a));
});

router.post('/appointments', (req, res) => {
  const body = req.body || {};
  const { doctorId, patientId, start, durationMin, status, paymentType, serviceId } = body;

  if (!doctorId || !patientId || !start || !durationMin) {
    return res.status(400).json({
      error: 'validation',
      message: 'Поля doctorId, patientId, start и durationMin обязательны',
    });
  }
  if (!state.doctors.find((d) => d.id === doctorId)) {
    return res.status(400).json({ error: 'doctor_not_found', message: 'Врач не найден' });
  }
  if (!state.patients.find((p) => p.id === patientId)) {
    return res.status(400).json({ error: 'patient_not_found', message: 'Пациент не найден' });
  }

  const numericDuration = Number(durationMin);
  if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
    return res.status(400).json({ error: 'invalid_duration', message: 'Длительность должна быть положительным числом' });
  }

  if (status !== undefined && status !== null) {
    if (!isAppointmentStatus(status)) {
      return res.status(400).json({
        error: 'invalid_status',
        message: `Статус «${status}» не поддерживается`,
      });
    }
  }
  if (paymentType !== undefined && paymentType !== null) {
    if (!isPaymentType(paymentType)) {
      return res.status(400).json({
        error: 'invalid_payment_type',
        message: `Тип оплаты «${paymentType}» не поддерживается`,
      });
    }
  }

  const shift = checkShift(doctorId, start, numericDuration);
  if (!shift.ok) {
    return res.status(409).json(shift.body);
  }

  const collision = state.appointments.find((a) => overlaps(a, doctorId, start, numericDuration));
  if (collision) {
    return res.status(409).json({
      error: 'slot_taken',
      message: `Слот ${start} у врача ${doctorId} уже занят (запись ${collision.id})`,
    });
  }

  const record = {
    id: newId(),
    doctorId,
    patientId,
    start,
    durationMin: numericDuration,
    status: status || 'scheduled',
    paymentType: paymentType || 'cash',
    serviceId: serviceId || null,
    complaints: null,
    diagnosis: null,
    visitType: null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
  };
  const protocol = tryApplyProtocolPatch(record, body);
  if (!protocol.ok) {
    return res.status(400).json({
      error: 'invalid_field',
      message: `Поле «${protocol.field}» имеет неверный формат`,
    });
  }
  state.appointments.push(record);
  res.status(201).json(decorate(record));
});

router.patch('/appointments/:id', (req, res) => {
  const id = req.params.id;
  const a = state.appointments.find((x) => x.id === id);
  if (!a) return res.status(404).json({ error: 'not_found', message: 'Запись не найдена' });

  const body = req.body || {};

  if (isTerminalStatus(a.status)) {
    return res.status(409).json({
      error: 'terminal_status',
      message: `Запись ${a.id} в статусе «${a.status}» неизменяема`,
    });
  }

  const draft = { ...a };
  draft.performedServiceIds = [...a.performedServiceIds];
  draft.recommendations = [...a.recommendations];

  const nextDoctorId = body.doctorId || a.doctorId;
  const nextStart = body.start || a.start;
  const nextDuration = body.durationMin != null ? Number(body.durationMin) : a.durationMin;

  if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
    return res.status(400).json({ error: 'invalid_duration', message: 'Длительность должна быть положительным числом' });
  }
  if (!state.doctors.find((d) => d.id === nextDoctorId)) {
    return res.status(400).json({ error: 'doctor_not_found', message: 'Врач не найден' });
  }

  const timeChanged = (
    nextDoctorId !== a.doctorId
    || nextStart !== a.start
    || nextDuration !== a.durationMin
  );
  if (timeChanged) {
    const shift = checkShift(nextDoctorId, nextStart, nextDuration);
    if (!shift.ok) {
      return res.status(409).json(shift.body);
    }
  }

  const collision = state.appointments.find((other) =>
    overlaps(other, nextDoctorId, nextStart, nextDuration, id),
  );
  if (collision) {
    return res.status(409).json({
      error: 'slot_taken',
      message: `Слот ${nextStart} у врача ${nextDoctorId} уже занят (запись ${collision.id})`,
    });
  }

  if (body.status !== undefined && body.status !== null) {
    if (!isAppointmentStatus(body.status)) {
      return res.status(400).json({
        error: 'invalid_status',
        message: `Статус «${body.status}» не поддерживается`,
      });
    }
    if (!isStatusTransitionAllowed(a.status, body.status)) {
      return res.status(409).json({
        error: 'invalid_state_transition',
        message: `Переход статуса из «${a.status}» в «${body.status}» запрещён`,
      });
    }
    draft.status = body.status;
  }

  if (body.paymentType !== undefined && body.paymentType !== null) {
    if (!isPaymentType(body.paymentType)) {
      return res.status(400).json({
        error: 'invalid_payment_type',
        message: `Тип оплаты «${body.paymentType}» не поддерживается`,
      });
    }
    draft.paymentType = body.paymentType;
  }

  draft.doctorId = nextDoctorId;
  draft.start = nextStart;
  draft.durationMin = nextDuration;
  if (body.serviceId !== undefined) draft.serviceId = body.serviceId;

  const protocol = tryApplyProtocolPatch(draft, body);
  if (!protocol.ok) {
    return res.status(400).json({
      error: 'invalid_field',
      message: `Поле «${protocol.field}» имеет неверный формат`,
    });
  }

  Object.assign(a, draft);
  res.status(200).json(decorate(a));
});

router.delete('/appointments/:id', (req, res) => {
  const a = state.appointments.find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found', message: 'Запись не найдена' });

  if (isTerminalStatus(a.status)) {
    return res.status(409).json({
      error: 'terminal_status',
      message: `Запись ${a.id} в статусе «${a.status}» неизменяема`,
    });
  }

  const idx = state.appointments.indexOf(a);
  state.appointments.splice(idx, 1);
  res.status(204).send();
});

module.exports = router;