'use strict';

const { Router } = require('express');
const {
  state,
  buildSlots,
  stepMinutes,
  dayStart,
  dayEnd,
  today,
  weekStartOf,
  buildWeekTemplates,
  countWeekSlots,
  saveWeekTemplateInterval,
  unpublishWeek,
  findHoliday,
  findAffectedAppointments,
  applyAbsence,
} = require('./data');

const router = Router();

const isDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  const [y, m, d] = String(value).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

router.get('/week-templates', (req, res) => {
  const raw = req.query.weekStart ? String(req.query.weekStart) : today();
  if (!isDate(raw)) {
    res.status(400).json({ error: 'invalid_week_start', message: 'Начало недели должно быть датой в формате ГГГГ-ММ-ДД' });
    return;
  }
  res.json(buildWeekTemplates(weekStartOf(raw)));
});

router.post('/week-templates/publish', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const raw = body.weekStart ? String(body.weekStart) : '';
  if (!isDate(raw)) {
    res.status(400).json({ error: 'invalid_week_start', message: 'Начало недели должно быть датой в формате ГГГГ-ММ-ДД' });
    return;
  }

  const weekStart = weekStartOf(raw);
  if (state.publishedWeeks.includes(weekStart)) {
    res.status(409).json({ error: 'week_already_published', message: 'Эта неделя уже опубликована' });
    return;
  }

  const { slotsCreated, doctorsAffected } = countWeekSlots(weekStart);
  if (slotsCreated === 0) {
    res.status(409).json({ error: 'empty_week', message: 'В шаблонах недели нет рабочих интервалов: публиковать нечего' });
    return;
  }

  state.publishedWeeks.push(weekStart);

  // Публикация создаёт СЛОТЫ, а не записи (решение владельца, TASK-36 п.4). Посев записей
  // здесь делал только что опубликованную неделю частично распроданной: администратор
  // открывал неделю ради свободных слотов и получал занятые, а бронь в видимо свободный
  // слот отвечала 409. Демо-записи живут в окне вокруг текущей даты и заводятся в buildState.
  res.json({ weekStart, slotsCreated, doctorsAffected, publishedAt: new Date().toISOString() });
});

router.patch('/week-templates/interval', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const weekStart = body.weekStart != null ? String(body.weekStart) : '';
  const doctorId = body.doctorId != null ? String(body.doctorId) : '';
  const date = body.date != null ? String(body.date) : '';
  if (!isDate(weekStart) || !isDate(date) || !doctorId) {
    res.status(400).json({
      error: 'invalid_interval_patch',
      message: 'Нужны weekStart, date (ГГГГ-ММ-ДД) и doctorId',
    });
    return;
  }
  const result = saveWeekTemplateInterval({
    weekStart,
    doctorId,
    date,
    intervals: body.intervals,
    confirmed: body.confirmed === true,
  });
  if (!result.ok) {
    res.status(result.status).json({
      error: result.error,
      message: result.message,
      ...(result.affected != null ? { affected: result.affected } : {}),
    });
    return;
  }
  res.json(result.templates);
});

router.post('/week-templates/unpublish', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const raw = body.weekStart ? String(body.weekStart) : '';
  if (!isDate(raw)) {
    res.status(400).json({ error: 'invalid_week_start', message: 'Начало недели должно быть датой в формате ГГГГ-ММ-ДД' });
    return;
  }
  const result = unpublishWeek(raw, { confirmed: body.confirmed === true });
  if (!result.ok) {
    res.status(result.status).json({
      error: result.error,
      message: result.message,
      ...(result.affected != null ? { affected: result.affected } : {}),
    });
    return;
  }
  res.json({ ...result.templates, affected: result.affected });
});

router.get('/schedule/:date', (req, res) => {
  const date = req.params.date;
  if (!isDate(date)) {
    res.status(400).json({ error: 'invalid_date', message: 'Дата должна быть в формате ГГГГ-ММ-ДД' });
    return;
  }
  const holiday = findHoliday(date);
  res.json({
    date,
    startTime: dayStart,
    endTime: dayEnd,
    stepMinutes,
    holiday: holiday ? { name: holiday.name } : null,
    slots: buildSlots(date),
  });
});

const ABSENCE_REASONS = new Set(['vacation', 'sick', 'repair', 'conference', 'training', 'tech_break']);

router.get('/absences/preview', (req, res) => {
  const doctorId = req.query.doctorId != null ? String(req.query.doctorId) : '';
  const dateFrom = req.query.dateFrom != null ? String(req.query.dateFrom) : '';
  const dateTo = req.query.dateTo != null ? String(req.query.dateTo) : '';
  if (!isDate(dateFrom) || !isDate(dateTo)) {
    res.status(400).json({ error: 'invalid_date', message: 'Нужны dateFrom и dateTo (ГГГГ-ММ-ДД)' });
    return;
  }
  if (dateFrom > dateTo) {
    res.status(400).json({ error: 'invalid_range', message: 'dateFrom не может быть позже dateTo' });
    return;
  }
  if (doctorId && !state.doctors.some((d) => d.id === doctorId)) {
    res.status(400).json({ error: 'doctor_not_found', message: 'Врач не найден' });
    return;
  }
  const affected = findAffectedAppointments(doctorId || null, dateFrom, dateTo);
  res.json({
    affectedCount: affected.length,
    appointmentIds: affected.map((a) => a.id),
  });
});

router.post('/absences', (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const doctorId = body.doctorId != null && body.doctorId !== '' ? String(body.doctorId) : null;
  const equipmentId = body.equipmentId != null && body.equipmentId !== '' ? String(body.equipmentId) : null;
  const dateFrom = body.dateFrom != null ? String(body.dateFrom) : '';
  const dateTo = body.dateTo != null ? String(body.dateTo) : '';
  const reason = body.reason != null ? String(body.reason) : '';

  if (!doctorId && !equipmentId) {
    res.status(400).json({ error: 'validation', message: 'Укажите врача или оборудование' });
    return;
  }
  if (!isDate(dateFrom) || !isDate(dateTo) || dateFrom > dateTo) {
    res.status(400).json({ error: 'invalid_range', message: 'Период задан неверно' });
    return;
  }
  if (!ABSENCE_REASONS.has(reason)) {
    res.status(400).json({ error: 'invalid_reason', message: 'Неизвестная причина отсутствия' });
    return;
  }
  if (doctorId && !state.doctors.some((d) => d.id === doctorId)) {
    res.status(400).json({ error: 'doctor_not_found', message: 'Врач не найден' });
    return;
  }

  const result = applyAbsence({ doctorId, equipmentId, dateFrom, dateTo, reason });
  res.status(201).json(result);
});

router.get('/absences/:id/affected', (req, res) => {
  const id = req.params.id;
  const pool = [...state.appointments, ...(state.demoAppointments || [])];
  const items = pool
    .filter((a) => a.affectedByAbsenceId === id)
    .map((a) => ({
      id: a.id,
      status: a.status,
      cancelReason: a.cancelReason || null,
      doctorId: a.doctorId,
      start: a.start,
      patientId: a.patientId,
    }));
  res.json({ items });
});

module.exports = router;
