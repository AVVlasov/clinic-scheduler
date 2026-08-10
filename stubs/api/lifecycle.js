'use strict';

const data = require('./data');

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
  arrived: new Set(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']),
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

const isValidDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value)) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());

const isWithinPublishedShift = (
  date,
  startIso,
  durationMin,
  doctorId,
  weekStart,
  weekTemplateSeed,
  publishedWeeks,
) => {
  if (!isValidDate(date)) return false;
  if (!publishedWeeks.includes(weekStart)) return false;
  const seed = weekTemplateSeed[doctorId];
  if (!seed) return false;

  const dayIndex = data.dayIndex(date);
  if (dayIndex < 0 || dayIndex > 6) return false;

  const intervals = seed[dayIndex] || [];
  if (intervals.length === 0) return false;

  const startTime = new Date(startIso);
  const endTime = new Date(startTime.getTime() + Number(durationMin) * 60000);
  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) return false;

  // Единая предикатная проверка с data.buildSlots: рабочий интервал = kind=work И
  // положительная длительность. off/absent/block/break здесь НЕ считаются сменой,
  // и data.js, и lifecycle.js спрашивают один и тот же isWorkingInterval.
  for (const interval of intervals) {
    if (!data.isWorkingInterval(interval)) continue;
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
  isValidDate,
};