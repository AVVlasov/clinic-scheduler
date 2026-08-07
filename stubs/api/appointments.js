'use strict';

const { Router } = require('express');
const { state, newId, overlaps } = require('./data');

const router = Router();

const PROTOCOL_STRING_FIELDS = ['complaints', 'diagnosis', 'nextVisit'];
const PROTOCOL_STRING_LIST_FIELDS = ['performedServiceIds', 'recommendations'];
const PROTOCOL_VISIT_TYPES = new Set(['first', 'repeat']);

const APPOINTMENT_STATUSES = ['scheduled', 'arrived', 'in_progress', 'completed', 'cancelled', 'no_show'];

const STATUS_TRANSITIONS = {
  scheduled:    new Set(['arrived', 'in_progress', 'cancelled', 'no_show']),
  arrived:      new Set(['in_progress', 'completed', 'cancelled', 'no_show']),
  in_progress:  new Set(['completed', 'cancelled', 'no_show']),
  completed:    new Set(),
  cancelled:    new Set(),
  no_show:      new Set(),
};

const isStatusTransitionAllowed = (from, to) => {
  if (!STATUS_TRANSITIONS[from]) return false;
  return STATUS_TRANSITIONS[from].has(to);
};

const tryApplyProtocolPatch = (draft, body) => {
  for (const field of PROTOCOL_STRING_FIELDS) {
    if (body[field] !== undefined) {
      if (typeof body[field] !== 'string') {
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

router.get('/appointments', (req, res) => {
  res.json({ items: state.appointments.map(decorate) });
});

router.get('/appointments/:id', (req, res) => {
  const a = state.appointments.find((x) => x.id === req.params.id);
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
    if (!APPOINTMENT_STATUSES.includes(body.status)) {
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

  draft.doctorId = nextDoctorId;
  draft.start = nextStart;
  draft.durationMin = nextDuration;
  if (body.paymentType) draft.paymentType = body.paymentType;
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
  const idx = state.appointments.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  state.appointments.splice(idx, 1);
  res.status(204).send();
});

module.exports = router;
