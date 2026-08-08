'use strict';

const today = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const isoAt = (date, hh, mm) => {
  const d = new Date(`${date}T${hh}:${mm}:00`);
  return d.toISOString();
};

const doctors = [
  { id: 'd-001', name: 'Иванова Елена Сергеевна', specialty: 'Терапевт', cabinet: '201' },
  { id: 'd-002', name: 'Петров Андрей Викторович', specialty: 'Кардиолог', cabinet: '305' },
  { id: 'd-003', name: 'Сидорова Мария Александровна', specialty: 'Педиатр', cabinet: '104' },
  { id: 'd-004', name: 'Кузнецов Дмитрий Олегович', specialty: 'Невролог', cabinet: '412' },
  { id: 'd-005', name: 'Морозова Ольга Игоревна', specialty: 'Эндокринолог', cabinet: '207' },
  { id: 'd-006', name: 'Волков Сергей Петрович', specialty: 'Хирург', cabinet: '001' },
];

const services = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500 },
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём', price: 1800 },
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200 },
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика', price: 2800 },
  { id: 's-005', name: 'Анализ крови общий', duration: 10, category: 'Лаборатория', price: 650 },
  { id: 's-006', name: 'Биохимия крови', duration: 15, category: 'Лаборатория', price: 1500 },
  { id: 's-007', name: 'Консультация по результатам', duration: 20, category: 'Приём', price: 1700 },
];

const patients = [
  { id: 'p-001', name: 'Алексеев Игорь Николаевич', phone: '+7 900 100-00-01', birthDate: '1985-03-12' },
  { id: 'p-002', name: 'Белова Татьяна Викторовна', phone: '+7 900 100-00-02', birthDate: '1992-07-21' },
  { id: 'p-003', name: 'Григорьев Артём Дмитриевич', phone: '+7 900 100-00-03', birthDate: '1978-11-05' },
  { id: 'p-004', name: 'Дмитриева Анна Сергеевна', phone: '+7 900 100-00-04', birthDate: '2001-01-30' },
];

const stepMinutes = 15;
const dayStart = '08:00';
const dayEnd = '20:00';

const findSeedSlot = (date, doctorId, dayIdx, durationMin, usedMinutes) => {
  const intervals = (weekTemplateSeed[doctorId] || [])[dayIdx] || [];
  for (const interval of intervals) {
    if (interval.kind !== 'work' && interval.kind !== 'break') continue;
    const ivStart = toMinutes(interval.start);
    const ivEnd = toMinutes(interval.end);
    for (let m = ivStart; m + durationMin <= ivEnd; m += stepMinutes) {
      const conflict = usedMinutes.some((u) => u.doctorId === doctorId && m < u.endMin && m + durationMin > u.startMin);
      if (!conflict) return m;
    }
  }
  return null;
};

const seedAppointments = (date) => {
  const d = new Date(`${date}T00:00:00`);
  const js = d.getDay();
  const dayIdx = js === 0 ? 6 : js - 1;

  const plan = [
    { doctorId: 'd-001', patientId: 'p-001', status: 'scheduled',   paymentType: 'cash',      serviceId: 's-001', durationMin: 30 },
    { doctorId: 'd-002', patientId: 'p-002', status: 'arrived',     paymentType: 'card',      serviceId: 's-002', durationMin: 20 },
    { doctorId: 'd-002', patientId: 'p-003', status: 'in_progress', paymentType: 'insurance', serviceId: 's-001', durationMin: 30 },
    { doctorId: 'd-003', patientId: 'p-004', status: 'scheduled',   paymentType: 'cash',      serviceId: 's-001', durationMin: 30 },
    { doctorId: 'd-004', patientId: 'p-001', status: 'completed',   paymentType: 'card',      serviceId: 's-007', durationMin: 30 },
    { doctorId: 'd-005', patientId: 'p-002', status: 'no_show',     paymentType: 'cash',      serviceId: 's-001', durationMin: 30 },
    { doctorId: 'd-002', patientId: 'p-004', status: 'completed',   paymentType: 'cash',      serviceId: 's-007', durationMin: 20 },
    { doctorId: 'd-002', patientId: 'p-001', status: 'cancelled',   paymentType: 'card',      serviceId: 's-001', durationMin: 30 },
  ];

  const usedMinutes = [];
  const base = plan.map((p) => {
    const startMin = findSeedSlot(date, p.doctorId, dayIdx, p.durationMin, usedMinutes);
    if (startMin == null) return null;
    usedMinutes.push({ doctorId: p.doctorId, startMin, endMin: startMin + p.durationMin });
    const hh = String(Math.floor(startMin / 60)).padStart(2, '0');
    const mm = String(startMin % 60).padStart(2, '0');
    return {
      doctorId: p.doctorId,
      patientId: p.patientId,
      start: isoAt(date, hh, mm),
      durationMin: p.durationMin,
      status: p.status,
      paymentType: p.paymentType,
      serviceId: p.serviceId,
    };
  }).filter(Boolean);

  return base.map((a, i) => ({
    id: `a-${String(i + 1).padStart(3, '0')}`,
    ...a,
    complaints: null,
    diagnosis: null,
    visitType: null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
  }));
};

// Карточки врачей справочника администратора. Часть карточек намеренно неполная:
// счётчик «Незаполненных карточек» в АРМ администратора обязан считаться по данным,
// и на полностью заполненном наборе его нечем было бы проверить.
const doctorCards = [
  {
    id: 'd-001',
    specialties: ['Терапевт', 'Врач общей практики'],
    site: 'Площадка на Ленина, 15',
    temporarySites: ['Филиал на Гагарина, 3 — до 31 августа'],
    admissionRules: ['Приём по записи', 'Детей не принимает'],
    equipmentAccess: ['ЭКГ-аппарат', 'Тонометр суточный'],
  },
  {
    id: 'd-002',
    specialties: ['Кардиолог'],
    site: 'Площадка на Ленина, 15',
    temporarySites: [],
    admissionRules: ['Приём по записи', 'Первичный приём 40 минут'],
    equipmentAccess: ['ЭКГ-аппарат', 'УЗИ сердца'],
  },
  {
    id: 'd-003',
    specialties: ['Педиатр'],
    site: 'Площадка на Ленина, 15',
    temporarySites: [],
    admissionRules: ['Приём по записи'],
    equipmentAccess: [],
  },
  // Незаполненные карточки: без основной площадки и без специальностей.
  { id: 'd-004', specialties: ['Невролог'], site: '', temporarySites: [], admissionRules: [], equipmentAccess: [] },
  { id: 'd-005', specialties: ['Эндокринолог'], site: '', temporarySites: [], admissionRules: [], equipmentAccess: [] },
  { id: 'd-006', specialties: [], site: '', temporarySites: [], admissionRules: [], equipmentAccess: [] },
];

// Шаблоны приёма на неделю: интервалы «врач × день». Часть дней намеренно не рабочая
// (block/absent/off) — иначе итог публикации был бы равен простому произведению
// врачей на дни и не доказывал бы, что число посчитано по шаблонам.
const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

const weekTemplateSeed = {
  'd-001': [
    [{ start: '08:00', end: '14:00', kind: 'work' }],
    [{ start: '08:00', end: '14:00', kind: 'work' }],
    [{ start: '14:00', end: '20:00', kind: 'work' }],
    [{ start: '08:00', end: '12:00', kind: 'break' }],
    [{ start: '08:00', end: '14:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-002': [
    [{ start: '09:00', end: '15:00', kind: 'work' }],
    [{ start: '09:00', end: '15:00', kind: 'work' }],
    [{ start: '09:00', end: '15:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'absent' }],
    [{ start: '09:00', end: '15:00', kind: 'work' }],
    [{ start: '10:00', end: '13:00', kind: 'work' }],
  ],
  'd-003': [
    [{ start: '08:00', end: '13:00', kind: 'work' }],
    [{ start: '13:00', end: '18:00', kind: 'work' }],
    [{ start: '08:00', end: '13:00', kind: 'work' }],
    [{ start: '13:00', end: '18:00', kind: 'work' }],
    [{ start: '08:00', end: '11:00', kind: 'break' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-004': [
    [{ start: '10:00', end: '16:00', kind: 'work' }],
    [{ start: '10:00', end: '16:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'block' }],
    [{ start: '10:00', end: '16:00', kind: 'work' }],
    [{ start: '10:00', end: '16:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-005': [
    [{ start: '08:30', end: '12:30', kind: 'work' }],
    [{ start: '08:30', end: '12:30', kind: 'work' }],
    [{ start: '08:30', end: '12:30', kind: 'work' }],
    [{ start: '08:30', end: '12:30', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'absent' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-006': [
    [{ start: '08:00', end: '20:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '08:00', end: '20:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '08:00', end: '20:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
};

const toMinutes = (hhmm) => {
  const [hh, mm] = String(hhmm).split(':').map(Number);
  return hh * 60 + mm;
};

const addDays = (date, n) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Понедельник недели, в которую попадает date.
const weekStartOf = (date) => {
  const d = new Date(`${date}T00:00:00`);
  const shift = (d.getDay() + 6) % 7;
  return addDays(date, -shift);
};

const buildWeekTemplates = (weekStart) => {
  const days = WEEKDAYS.map((weekday, i) => ({ date: addDays(weekStart, i), weekday }));
  const rows = state.doctors.map((doc) => ({
    doctorId: doc.id,
    doctorName: doc.name,
    specialty: doc.specialty,
    days: days.map((day, i) => ({
      date: day.date,
      weekday: day.weekday,
      intervals: (weekTemplateSeed[doc.id] || [])[i] || [],
    })),
  }));
  return {
    weekStart,
    weekEnd: addDays(weekStart, WEEKDAYS.length - 1),
    days,
    rows,
    published: state.publishedWeeks.includes(weekStart),
  };
};

// Итог публикации: слоты нарезаются шагом сетки только из рабочих интервалов.
// Число слотов и число затронутых врачей считаются здесь, а не на экране.
// slotsCreated = суммарное количество временных слотов за неделю
// (каждый (день, время) — отдельный слот), совпадает с sum(slots.length) по дням из GET /schedule.
const countWeekSlots = (weekStart) => {
  const { rows } = buildWeekTemplates(weekStart);
  let slotsCreated = 0;
  const doctors = new Set();

  for (let dayIdx = 0; dayIdx < WEEKDAYS.length; dayIdx++) {
    const dayTimes = new Set();
    for (const row of rows) {
      const intervals = (row.days[dayIdx] && row.days[dayIdx].intervals) || [];
      for (const interval of intervals) {
        if (interval.kind !== 'work' && interval.kind !== 'break') continue;
        const span = toMinutes(interval.end) - toMinutes(interval.start);
        if (span <= 0) continue;
        doctors.add(row.doctorId);
        const workStart = toMinutes(interval.start);
        const workEnd = workStart + Math.floor(span / stepMinutes) * stepMinutes;
        for (let m = workStart; m < workEnd; m += stepMinutes) {
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          dayTimes.add(`${hh}:${mm}`);
        }
      }
    }
    slotsCreated += dayTimes.size;
  }

  return { slotsCreated, doctorsAffected: doctors.size };
};

const buildState = () => {
  const date = today();
  return {
    doctors: doctors.map((d) => ({ ...d })),
    doctorCards: doctorCards.map((c) => ({
      ...c,
      specialties: [...c.specialties],
      temporarySites: [...c.temporarySites],
      admissionRules: [...c.admissionRules],
      equipmentAccess: [...c.equipmentAccess],
    })),
    services: services.map((s) => ({ ...s })),
    patients: patients.map((p) => ({ ...p })),
    date,
    appointments: seedAppointments(date),
    publishedWeeks: [weekStartOf(date)],
    seq: 7,
  };
};

const state = buildState();

const newId = () => {
  let maxSeq = state.seq;
  const re = /^a-(\d+)$/;
  for (const a of state.appointments) {
    const m = re.exec(a.id);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  state.seq = maxSeq + 1;
  return `a-${String(state.seq).padStart(3, '0')}`;
};

// Статусы, в которых запись реально занимает слот в сетке расписания.
// `cancelled` и `no_show` — терминальные, но слот НЕ блокируют: их можно
// повторно продать. См. также ACTIVE_APPOINTMENT_STATUSES в src/__data__/types.ts.
const ACTIVE_APPOINTMENT_STATUSES = new Set([
  'scheduled',
  'arrived',
  'in_progress',
  'completed',
]);

const dayIndex = (date) => {
  const d = new Date(`${date}T00:00:00`);
  const js = d.getDay();
  return js === 0 ? 6 : js - 1;
};

const buildSlots = (date) => {
  const weekStart = weekStartOf(date);
  if (!state.publishedWeeks.includes(weekStart)) {
    return [];
  }
  const di = dayIndex(date);
  if (di < 0 || di > 5) {
    return [];
  }

  const intervalsByDoctor = new Map();
  for (const doc of state.doctors) {
    const dayIntervals = (weekTemplateSeed[doc.id] || [])[di] || [];
    intervalsByDoctor.set(doc.id, dayIntervals);
  }

  const slotMap = new Map();
  const addSlot = (hh, mm) => {
    const key = `${hh}:${mm}`;
    if (!slotMap.has(key)) {
      slotMap.set(key, { time: key, doctors: [] });
    }
    return slotMap.get(key);
  };

  for (const doc of state.doctors) {
    const intervals = intervalsByDoctor.get(doc.id) || [];
    for (const interval of intervals) {
      if (interval.kind !== 'work' && interval.kind !== 'break') continue;
      const span = toMinutes(interval.end) - toMinutes(interval.start);
      if (span <= 0) continue;
      const workStart = toMinutes(interval.start);
      const workEnd = workStart + Math.floor(span / stepMinutes) * stepMinutes;
      for (let m = workStart; m < workEnd; m += stepMinutes) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        addSlot(hh, mm);
      }
    }
  }

  const slots = Array.from(slotMap.values()).sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  for (const slot of slots) {
    const slotStart = new Date(`${date}T${slot.time}:00`);
    const slotEnd = new Date(slotStart.getTime() + stepMinutes * 60000);
    for (const doc of state.doctors) {
      const intervals = intervalsByDoctor.get(doc.id) || [];
      let inWork = false;
      for (const interval of intervals) {
        if (interval.kind !== 'work' && interval.kind !== 'break') continue;
        const span = toMinutes(interval.end) - toMinutes(interval.start);
        if (span <= 0) continue;
        const wStart = new Date(`${date}T${interval.start}:00`).getTime();
        const wEnd = new Date(`${date}T${interval.end}:00`).getTime();
        if (slotStart.getTime() >= wStart && slotEnd.getTime() <= wEnd) {
          inWork = true;
          break;
        }
      }
      if (!inWork) continue;
      const collision = state.appointments.find((a) => {
        if (a.doctorId !== doc.id) return false;
        if (!ACTIVE_APPOINTMENT_STATUSES.has(a.status)) return false;
        const aStart = new Date(a.start).getTime();
        const aEnd = aStart + a.durationMin * 60000;
        return aStart < slotEnd.getTime() && aEnd > slotStart.getTime();
      });
      slot.doctors.push({
        id: doc.id,
        name: doc.name,
        busy: Boolean(collision),
        appointmentId: collision ? collision.id : undefined,
      });
    }
  }

  return slots;
};

const overlaps = (a, doctorId, startTime, durationMin, excludeId) => {
  if (a.id === excludeId) return false;
  if (a.doctorId !== doctorId) return false;
  if (!ACTIVE_APPOINTMENT_STATUSES.has(a.status)) return false;
  const aStart = new Date(a.start).getTime();
  const aEnd = aStart + a.durationMin * 60000;
  const newStart = new Date(startTime).getTime();
  const newEnd = newStart + durationMin * 60000;
  return aStart < newEnd && aEnd > newStart;
};

module.exports = {
  state,
  today,
  newId,
  buildSlots,
  stepMinutes,
  dayStart,
  dayEnd,
  dayIndex,
  overlaps,
  isoAt,
  weekStartOf,
  buildWeekTemplates,
  countWeekSlots,
  weekTemplateSeed,
};
