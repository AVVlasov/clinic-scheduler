'use strict';

const { Router } = require('express');
const {
  state,
  newId,
  overlaps,
  weekStartOf,
  ensureWeekTemplates,
  normalizeStartIso,
  dateOnly,
  findEquipmentConflict,
} = require('./data');
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

// Занятость слота на сетке (buildSlots) считается по обоим спискам сразу. Проверка коллизии
// обязана смотреть туда же: иначе оператор видит слот занятым, а POST/PATCH пускает в него
// второго пациента — расхождение живёт ровно на границе «экран ↔ сервер».
const appointmentPool = () => state.appointments.concat(state.demoAppointments || []);

const ensureHistory = (a) => {
  if (!Array.isArray(a.history)) a.history = [];
  return a.history;
};

const appendHistory = (a, fromStatus, toStatus, actor) => {
  ensureHistory(a).push({
    from: fromStatus,
    to: toStatus,
    at: new Date().toISOString(),
    actor: actor || 'system',
  });
};


/** Поля, которые допустимы в запросе на выход из терминального статуса. */
const REOPEN_FIELDS = new Set(['status', 'actor']);

const PROTOCOL_STRING_FIELDS = ['complaints', 'diagnosis'];
const PROTOCOL_STRING_LIST_FIELDS = ['performedServiceIds', 'recommendations'];
const PROTOCOL_VISIT_TYPES = new Set(['first', 'repeat']);

const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [y, m, d] = String(value).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

const normalizeNextVisit = (raw) => {
  if (raw === null) return { ok: true, value: null };
  if (raw === undefined) return { ok: true, value: undefined };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, field: 'nextVisit' };
  }
  const date = raw.date != null ? String(raw.date) : '';
  const serviceId = raw.serviceId != null ? String(raw.serviceId) : '';
  if (!isDate(date) || !serviceId) {
    return { ok: false, field: 'nextVisit' };
  }
  if (!state.services.some((s) => s.id === serviceId)) {
    return { ok: false, field: 'nextVisit' };
  }
  return { ok: true, value: { date, serviceId } };
};

const checkShift = (doctorId, start, durationMin) => {
  const date = dateOnly(start);
  const weekStart = weekStartOf(date);
  if (!isWithinPublishedShift(
    date,
    start,
    durationMin,
    doctorId,
    weekStart,
    ensureWeekTemplates(weekStart),
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
  if (body.nextVisit !== undefined) {
    const nv = normalizeNextVisit(body.nextVisit);
    if (!nv.ok) return { ok: false, field: 'nextVisit' };
    if (nv.value !== undefined) draft.nextVisit = nv.value;
  }
  return { ok: true };
};

const decorate = (a) => {
  const doctor = state.doctors.find((d) => d.id === a.doctorId);
  const patient = state.patients.find((p) => p.id === a.patientId);
  return {
    ...a,
    doctorName: doctor ? doctor.name : null,
    doctorCabinet: doctor ? doctor.cabinet : null,
    patientName: patient ? patient.name : null,
    patientPhone: patient ? patient.phone : null,
    patientBirthDate: patient ? patient.birthDate : null,
    patientUid: patient
      ? (patient.cardNumber || `UID ${patient.id.replace(/^[a-z]-/, '').padStart(4, '0')} ${Math.abs(hashCode(patient.id)).toString().padStart(4, '0')}`)
      : null,
    createdByName: a.createdByName != null ? a.createdByName : null,
    createdByUnit: a.createdByUnit != null ? a.createdByUnit : null,
    confirmed: Boolean(a.confirmed),
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
  const rawDate = req.query.date;
  if (rawDate == null || rawDate === '') {
    res.status(400).json({
      error: 'missing_date',
      message: 'Параметр date обязателен (ГГГГ-ММ-ДД)',
    });
    return;
  }
  const requested = String(rawDate);
  if (!isDate(requested)) {
    res.status(400).json({ error: 'invalid_date', message: 'Дата должна быть в формате ГГГГ-ММ-ДД' });
    return;
  }

  const rawDoctorId = req.query.doctorId;
  let doctorId = null;
  if (rawDoctorId != null && rawDoctorId !== '') {
    doctorId = String(rawDoctorId);
    if (!state.doctors.find((d) => d.id === doctorId)) {
      res.status(400).json({ error: 'doctor_not_found', message: 'Врач не найден' });
      return;
    }
  }

  const items = state.appointments
    .concat(state.demoAppointments || [])
    .filter((a) => dateOnly(a.start) === requested)
    .filter((a) => (doctorId == null ? true : a.doctorId === doctorId))
    .map(decorate);
  res.json({ items, date: requested, doctorId: doctorId || null });
});

router.get('/appointments/:id/history', (req, res) => {
  const a = state.appointments.find((x) => x.id === req.params.id)
    || (state.demoAppointments || []).find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found', message: 'Запись не найдена' });
  res.json({ items: ensureHistory(a).slice() });
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

  let resolvedServiceId = serviceId || null;
  if (resolvedServiceId) {
    const svc = state.services.find((s) => s.id === resolvedServiceId);
    if (!svc) {
      return res.status(400).json({
        error: 'service_not_found',
        message: `Услуга «${resolvedServiceId}» не найдена`,
      });
    }
    const allowed = Array.isArray(svc.doctorIds) ? svc.doctorIds : [];
    if (allowed.length > 0 && !allowed.includes(doctorId)) {
      return res.status(409).json({
        error: 'service_not_offered',
        message: `Врач ${doctorId} не оказывает услугу «${svc.name}»`,
      });
    }
  }

  const startIso = normalizeStartIso(start);

  const shift = checkShift(doctorId, startIso, numericDuration);
  if (!shift.ok) {
    return res.status(409).json(shift.body);
  }

  const collision = appointmentPool().find((a) => overlaps(a, doctorId, startIso, numericDuration));
  if (collision) {
    return res.status(409).json({
      error: 'slot_taken',
      message: `Слот ${startIso} у врача ${doctorId} уже занят (запись ${collision.id})`,
    });
  }

  // Оборудование и кабинет — второй ресурс записи (ФТ 3.1.1, 3.1.2): врач
  // свободен, а аппарат уже занят другим приёмом или стоит в ремонте.
  const equipmentConflict = findEquipmentConflict({
    serviceId: resolvedServiceId,
    startIso,
    durationMin: numericDuration,
  });
  if (equipmentConflict) {
    return res.status(409).json({
      error: 'equipment_busy',
      message: equipmentConflict.reason === 'repair'
        ? `«${equipmentConflict.equipment.name}» недоступен: ремонт до ${equipmentConflict.absence.dateTo}`
        : `«${equipmentConflict.equipment.name}» занят в это время (запись ${equipmentConflict.appointment.id})`,
      equipmentId: equipmentConflict.equipment.id,
    });
  }

  const initialStatus = status || 'scheduled';
  const record = {
    id: newId(),
    doctorId,
    patientId,
    start: startIso,
    durationMin: numericDuration,
    status: initialStatus,
    paymentType: paymentType || 'regular',
    serviceId: resolvedServiceId,
    complaints: null,
    diagnosis: null,
    visitType: body.visitType === 'first' || body.visitType === 'repeat' ? body.visitType : null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
    cancelReason: null,
    cancelledAt: null,
    cancelledBy: null,
    operatorComment: body.operatorComment != null ? String(body.operatorComment) : null,
    paidAmount: null,
    paidAt: null,
    createdByName: body.createdByName != null ? String(body.createdByName) : 'Оператор колл-центра',
    createdByUnit: body.createdByUnit != null ? String(body.createdByUnit) : 'Колл-центр',
    confirmed: Boolean(body.confirmed),
    history: [],
  };
  const protocol = tryApplyProtocolPatch(record, body);
  if (!protocol.ok) {
    return res.status(400).json({
      error: 'invalid_field',
      message: `Поле «${protocol.field}» имеет неверный формат`,
    });
  }
  appendHistory(record, null, initialStatus, body.actor || 'operator');
  state.appointments.push(record);
  res.status(201).json(decorate(record));
});

router.patch('/appointments/:id', (req, res) => {
  const id = req.params.id;
  const a = state.appointments.find((x) => x.id === id)
    || (state.demoAppointments || []).find((x) => x.id === id);
  if (!a) return res.status(404).json({ error: 'not_found', message: 'Запись не найдена' });

  const body = req.body || {};

  // Актёр врача (АРМ врача): нельзя менять чужую запись.
  const actorDoctorId = body.asDoctorId != null && body.asDoctorId !== ''
    ? String(body.asDoctorId)
    : (req.query.asDoctorId != null && req.query.asDoctorId !== '' ? String(req.query.asDoctorId) : null);
  if (actorDoctorId != null && actorDoctorId !== a.doctorId) {
    return res.status(409).json({
      error: 'foreign_doctor',
      message: `Запись принадлежит другому врачу (${a.doctorId}), актёр ${actorDoctorId}`,
    });
  }

  // Из терминального статуса наружу ведёт только явно разрешённый переход и
  // ничего кроме него: ошибочную неявку регистратор возвращает в очередь, но
  // переписать закрытую запись «заодно» нельзя — правка едет отдельным PATCH
  // уже по обычным правилам.
  const reopening = body.status != null
    && isStatusTransitionAllowed(a.status, body.status)
    && Object.keys(body).every((key) => REOPEN_FIELDS.has(key));
  if (isTerminalStatus(a.status) && !reopening) {
    return res.status(409).json({
      error: 'terminal_status',
      message: `Запись ${a.id} в статусе «${a.status}» неизменяема`,
    });
  }

  const draft = { ...a };
  draft.performedServiceIds = [...a.performedServiceIds];
  draft.recommendations = [...a.recommendations];

  const nextDoctorId = body.doctorId || a.doctorId;
  const nextStart = body.start != null ? normalizeStartIso(body.start) : a.start;
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

  const collision = appointmentPool().find((other) =>
    overlaps(other, nextDoctorId, nextStart, nextDuration, id),
  );
  if (collision) {
    return res.status(409).json({
      error: 'slot_taken',
      message: `Слот ${nextStart} у врача ${nextDoctorId} уже занят (запись ${collision.id})`,
    });
  }

  if (timeChanged) {
    const equipmentConflict = findEquipmentConflict({
      serviceId: body.serviceId !== undefined ? body.serviceId : a.serviceId,
      startIso: nextStart,
      durationMin: nextDuration,
      excludeId: id,
    });
    if (equipmentConflict) {
      return res.status(409).json({
        error: 'equipment_busy',
        message: equipmentConflict.reason === 'repair'
          ? `«${equipmentConflict.equipment.name}» недоступен: ремонт до ${equipmentConflict.absence.dateTo}`
          : `«${equipmentConflict.equipment.name}» занят в это время (запись ${equipmentConflict.appointment.id})`,
        equipmentId: equipmentConflict.equipment.id,
      });
    }
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
    if (body.status === 'cancelled') {
      const reason = body.cancelReason != null ? String(body.cancelReason).trim() : '';
      if (!reason) {
        return res.status(400).json({
          error: 'missing_cancel_reason',
          message: 'Укажите причину отмены',
        });
      }
      draft.cancelReason = reason;
      draft.cancelledAt = new Date().toISOString();
      draft.cancelledBy = body.cancelledBy != null && String(body.cancelledBy).trim()
        ? String(body.cancelledBy).trim()
        : (body.actor != null && String(body.actor).trim() ? String(body.actor).trim() : 'operator');
    }
    const fromStatus = a.status;
    draft.status = body.status;
    draft._historyPending = { from: fromStatus, to: body.status, actor: body.actor || body.cancelledBy || 'operator' };
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
  if (body.operatorComment !== undefined) {
    draft.operatorComment = body.operatorComment === null ? null : String(body.operatorComment);
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

  // Допуск врача (матрица компетенций, ФТ 1.5) решает не только запись, но и деньги:
  // отмеченная услуга уходит в «К оплате» регистратора. Проверяем правку, сделанную
  // врачом: терапевт не может закрыть приём услугой «УЗИ брюшной полости».
  const patchedByDoctor = actorDoctorId != null || body.actor === 'doctor';
  if (patchedByDoctor && body.performedServiceIds !== undefined) {
    const foreign = draft.performedServiceIds
      .map((serviceId) => state.services.find((s) => s.id === serviceId))
      .find((svc) => svc
        && Array.isArray(svc.doctorIds)
        && svc.doctorIds.length > 0
        && !svc.doctorIds.includes(draft.doctorId));
    if (foreign) {
      return res.status(409).json({
        error: 'service_not_offered',
        message: `Врач ${draft.doctorId} не оказывает услугу «${foreign.name}»`,
      });
    }
  }

  const historyPending = draft._historyPending;
  delete draft._historyPending;
  Object.assign(a, draft);
  ensureHistory(a);
  if (historyPending) {
    if (a.history.length === 0 && historyPending.from != null) {
      appendHistory(a, null, historyPending.from, 'system');
    }
    appendHistory(a, historyPending.from, historyPending.to, historyPending.actor);
  }
  res.status(200).json(decorate(a));
});


router.post('/appointments/:id/confirm', (req, res) => {
  const a = state.appointments.find((x) => x.id === req.params.id)
    || (state.demoAppointments || []).find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found', message: 'Запись не найдена' });
  a.confirmed = true;
  res.status(200).json(decorate(a));
});

router.post('/appointments/:id/pay', (req, res) => {
  const a = state.appointments.find((x) => x.id === req.params.id)
    || (state.demoAppointments || []).find((x) => x.id === req.params.id);
  if (!a) return res.status(404).json({ error: 'not_found', message: 'Запись не найдена' });
  if (a.paidAt) {
    return res.status(409).json({
      error: 'already_paid',
      message: `Запись ${a.id} уже оплачена`,
    });
  }
  const body = req.body || {};
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return res.status(400).json({ error: 'invalid_amount', message: 'Сумма оплаты должна быть числом ≥ 0' });
  }
  if (body.paymentType != null && body.paymentType !== '') {
    if (!isPaymentType(body.paymentType)) {
      return res.status(400).json({
        error: 'invalid_payment_type',
        message: `Тип оплаты «${body.paymentType}» не поддерживается`,
      });
    }
    a.paymentType = body.paymentType;
  }
  a.paidAmount = amount;
  a.paidAt = new Date().toISOString();
  res.status(200).json(decorate(a));
});

module.exports = router;