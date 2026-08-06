'use strict';

const router = require('express').Router();

const timer = (time = 300) => (req, res, next) => setTimeout(next, time);

router.use(timer());

router.use(require('./schedule'));
router.use(require('./appointments'));
router.use(require('./directories'));

router.use((req, res) => {
  res.status(404).json({ error: 'not_found', path: req.path });
});

module.exports = router;
