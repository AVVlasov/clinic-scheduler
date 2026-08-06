'use strict';

const { Router } = require('express');
const { state, newId, overlaps } = require('./data');

const router = Router();

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
    return res.status(400).json({ error: 'doctorId, patientId, start и durationMin обязательны' });
  }
  if (!state.doctors.find((d) => d.id === doctorId)) {
    return res.status(400).json({ error: 'doctor_not_found' });
  }
  if (!state.patients.find((p) => p.id === patientId)) {
    return res.status(400).json({ error: 'patient_not_found' });
  }

  const numericDuration = Number(durationMin);
  if (!Number.isFinite(numericDuration) || numericDuration <= 0) {
    return res.status(400).json({ error: 'invalid_duration' });
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
  };
  state.appointments.push(record);
  res.status(201).json(decorate(record));
});

router.patch('/appointments/:id', (req, res) => {
  const id = req.params.id;
  const a = state.appointments.find((x) => x.id === id);
  if (!a) return res.status(404).json({ error: 'not_found' });

  const body = req.body || {};
  const nextDoctorId = body.doctorId || a.doctorId;
  const nextStart = body.start || a.start;
  const nextDuration = body.durationMin != null ? Number(body.durationMin) : a.durationMin;

  if (!Number.isFinite(nextDuration) || nextDuration <= 0) {
    return res.status(400).json({ error: 'invalid_duration' });
  }
  if (!state.doctors.find((d) => d.id === nextDoctorId)) {
    return res.status(400).json({ error: 'doctor_not_found' });
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

  a.doctorId = nextDoctorId;
  a.start = nextStart;
  a.durationMin = nextDuration;
  if (body.status) a.status = body.status;
  if (body.paymentType) a.paymentType = body.paymentType;
  if (body.serviceId !== undefined) a.serviceId = body.serviceId;

  res.status(200).json(decorate(a));
});

router.delete('/appointments/:id', (req, res) => {
  const idx = state.appointments.findIndex((x) => x.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not_found' });
  state.appointments.splice(idx, 1);
  res.status(204).send();
});

module.exports = router;
