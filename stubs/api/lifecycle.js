'use strict';

const APPOINTMENT_STATUSES = Object.freeze([
  'scheduled',
  'arrived',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

const TERMINAL_STATUSES = new Set([
  'completed',
  'cancelled',
  'no_show',
]);

const STATUS_TRANSITIONS = {
  scheduled: new Set(['arrived', 'in_progress', 'cancelled', 'no_show']),
  arrived: new Set(['in_progress', 'completed', 'cancelled', 'no_show']),
  in_progress: new Set(['completed', 'cancelled', 'no_show']),
  completed: new Set(),
  cancelled: new Set(),
  no_show: new Set(),
};

const ACTIVE_APPOINTMENT_STATUSES = new Set([
  'scheduled',
  'arrived',
  'in_progress',
  'completed',
]);

const PAYMENT_TYPES = Object.freeze(['cash', 'card', 'insurance']);

const isStatusTransitionAllowed = (from, to) => {
  if (!STATUS_TRANSITIONS[from]) return false;
  return STATUS_TRANSITIONS[from].has(to);
};

const isTerminalStatus = (status) => TERMINAL_STATUSES.has(status);

const isActiveStatus = (status) => ACTIVE_APPOINTMENT_STATUSES.has(status);

const isAppointmentStatus = (status) => APPOINTMENT_STATUSES.includes(status);

const isPaymentType = (value) => PAYMENT_TYPES.includes(value);

const toMinutes = (hhmm) => {
  const [hh, mm] = String(hhmm).split(':').map(Number);
  return hh * 60 + mm;
};

const isWithinPublishedShift = (
  date,
  startIso,
  durationMin,
  doctorId,
  weekStart,
  weekTemplateSeed,
  publishedWeeks,
) => {
  if (!publishedWeeks.includes(weekStart)) return false;
  const seed = weekTemplateSeed[doctorId];
  if (!seed) return false;

  const d = new Date(`${date}T00:00:00`);
  const js = d.getDay();
  const dayIndex = js === 0 ? 6 : js - 1;
  if (dayIndex < 0 || dayIndex > 5) return false;

  const intervals = seed[dayIndex] || [];
  if (intervals.length === 0) return false;

  const startTime = new Date(startIso);
  const endTime = new Date(startTime.getTime() + Number(durationMin) * 60000);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) return false;

  for (const interval of intervals) {
    if (interval.kind !== 'work' && interval.kind !== 'break') continue;
    const span = toMinutes(interval.end) - toMinutes(interval.start);
    if (span <= 0) continue;
    const ivStart = new Date(`${date}T${interval.start}:00`).getTime();
    const ivEnd = new Date(`${date}T${interval.end}:00`).getTime();
    if (startTime.getTime() >= ivStart && endTime.getTime() <= ivEnd) {
      return true;
    }
  }
  return false;
};

module.exports = {
  APPOINTMENT_STATUSES,
  ACTIVE_APPOINTMENT_STATUSES,
  TERMINAL_STATUSES,
  STATUS_TRANSITIONS,
  PAYMENT_TYPES,
  isStatusTransitionAllowed,
  isTerminalStatus,
  isActiveStatus,
  isAppointmentStatus,
  isPaymentType,
  isWithinPublishedShift,
};