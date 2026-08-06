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
} = require('./data');

const router = Router();

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

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
  res.json({ weekStart, slotsCreated, doctorsAffected, publishedAt: new Date().toISOString() });
});

router.get('/schedule', (req, res) => {
  const date = (req.query.date && String(req.query.date)) || state.date;
  res.json({
    date,
    startTime: dayStart,
    endTime: dayEnd,
    stepMinutes,
    slots: buildSlots(date),
  });
});

router.get('/schedule/:date', (req, res) => {
  const date = req.params.date;
  res.json({
    date,
    startTime: dayStart,
    endTime: dayEnd,
    stepMinutes,
    slots: buildSlots(date),
  });
});

module.exports = router;
