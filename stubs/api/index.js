'use strict';

const router = require('express').Router();
const { resetState } = require('./data');

const timer = (time = 300) => (req, res, next) => setTimeout(next, time);

router.use(timer());

/** Вернуть демо-стенд к исходному состоянию без перезапуска процесса. */
router.post('/demo/reset', (req, res) => {
  const state = resetState();
  res.json({
    ok: true,
    sysDate: state.sysDate,
    publishedWeeks: [...state.publishedWeeks],
    demoAppointments: state.demoAppointments.length,
  });
});

router.use(require('./schedule'));
router.use(require('./appointments'));
router.use(require('./directories'));
router.use(require('./catalog'));
router.use(require('./waitlist'));
router.use(require('./mass-cancel'));

router.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

module.exports = router;
