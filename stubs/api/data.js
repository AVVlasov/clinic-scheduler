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
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём' },
  { id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём' },
  { id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика' },
  { id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика' },
  { id: 's-005', name: 'Анализ крови общий', duration: 10, category: 'Лаборатория' },
  { id: 's-006', name: 'Биохимия крови', duration: 15, category: 'Лаборатория' },
  { id: 's-007', name: 'Консультация по результатам', duration: 20, category: 'Приём' },
];

const patients = [
  { id: 'p-001', name: 'Алексеев Игорь Николаевич', phone: '+7 900 100-00-01', birthDate: '1985-03-12' },
  { id: 'p-002', name: 'Белова Татьяна Викторовна', phone: '+7 900 100-00-02', birthDate: '1992-07-21' },
  { id: 'p-003', name: 'Григорьев Артём Дмитриевич', phone: '+7 900 100-00-03', birthDate: '1978-11-05' },
  { id: 'p-004', name: 'Дмитриева Анна Сергеевна', phone: '+7 900 100-00-04', birthDate: '2001-01-30' },
];

const seedAppointments = (date) => {
  const base = [
    {
      doctorId: 'd-001', patientId: 'p-001',
      start: isoAt(date, '09', '00'), durationMin: 30,
      status: 'scheduled', paymentType: 'cash', serviceId: 's-001',
    },
    {
      doctorId: 'd-001', patientId: 'p-002',
      start: isoAt(date, '10', '30'), durationMin: 20,
      status: 'arrived', paymentType: 'card', serviceId: 's-002',
    },
    {
      doctorId: 'd-002', patientId: 'p-003',
      start: isoAt(date, '11', '00'), durationMin: 30,
      status: 'in_progress', paymentType: 'insurance', serviceId: 's-001',
    },
    {
      doctorId: 'd-003', patientId: 'p-004',
      start: isoAt(date, '12', '15'), durationMin: 30,
      status: 'scheduled', paymentType: 'cash', serviceId: 's-001',
    },
    {
      doctorId: 'd-004', patientId: 'p-001',
      start: isoAt(date, '14', '00'), durationMin: 30,
      status: 'completed', paymentType: 'card', serviceId: 's-007',
    },
    {
      doctorId: 'd-005', patientId: 'p-002',
      start: isoAt(date, '15', '30'), durationMin: 30,
      status: 'no_show', paymentType: 'cash', serviceId: 's-001',
    },
  ];
  return base.map((a, i) => ({ id: `a-${String(i + 1).padStart(3, '0')}`, ...a }));
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
  { id: 'd-004', specialties: [], site: '', temporarySites: [], admissionRules: [], equipmentAccess: [] },
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
const countWeekSlots = (weekStart) => {
  const { rows } = buildWeekTemplates(weekStart);
  let slotsCreated = 0;
  const doctors = new Set();

  for (const row of rows) {
    for (const day of row.days) {
      for (const interval of day.intervals) {
        if (interval.kind !== 'work') continue;
        const span = toMinutes(interval.end) - toMinutes(interval.start);
        if (span <= 0) continue;
        slotsCreated += Math.floor(span / stepMinutes);
        doctors.add(row.doctorId);
      }
    }
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
    publishedWeeks: [],
    seq: 7,
  };
};

const state = buildState();

const newId = () => {
  state.seq += 1;
  return `a-${String(state.seq).padStart(3, '0')}`;
};

const stepMinutes = 15;
const dayStart = '08:00';
const dayEnd = '20:00';

const buildSlots = (date) => {
  const startTotal = 8 * 60;
  const endTotal = 20 * 60;
  const slots = [];
  for (let m = startTotal; m < endTotal; m += stepMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    const slotStart = new Date(`${date}T${hh}:${mm}:00`);
    const slotEnd = new Date(slotStart.getTime() + stepMinutes * 60000);
    const doctorsForSlot = state.doctors.map((doc) => {
      const collision = state.appointments.find((a) => {
        if (a.doctorId !== doc.id) return false;
        const aStart = new Date(a.start).getTime();
        const aEnd = aStart + a.durationMin * 60000;
        return aStart < slotEnd.getTime() && aEnd > slotStart.getTime();
      });
      return {
        id: doc.id,
        name: doc.name,
        busy: Boolean(collision),
        appointmentId: collision ? collision.id : undefined,
      };
    });
    slots.push({ time: `${hh}:${mm}`, doctors: doctorsForSlot });
  }
  return slots;
};

const overlaps = (a, doctorId, startTime, durationMin, excludeId) => {
  if (a.id === excludeId) return false;
  if (a.doctorId !== doctorId) return false;
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
  overlaps,
  isoAt,
  weekStartOf,
  buildWeekTemplates,
  countWeekSlots,
};
