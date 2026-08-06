'use strict';

const { Router } = require('express');
const { state } = require('./data');

const router = Router();

router.get('/doctors', (req, res) => {
  res.json({ items: state.doctors });
});

router.get('/services', (req, res) => {
  res.json({ items: state.services });
});

module.exports = router;
