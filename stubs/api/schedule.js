'use strict';

const { Router } = require('express');
const { state, buildSlots, stepMinutes, dayStart, dayEnd } = require('./data');

const router = Router();

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
