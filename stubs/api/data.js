'use strict';

/** Клинический оффсет: все «наивные» даты/времена демо — Москва (+03:00), не зона процесса. */
const CLINIC_OFFSET = '+03:00';

const today = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

/** Локальное время клиники → ISO со смещением +03:00 (без Date в зоне процесса). */
const isoAt = (date, hh, mm) => {
  const h = String(hh).padStart(2, '0');
  const m = String(mm).padStart(2, '0');
  return `${date}T${h}:${m}:00${CLINIC_OFFSET}`;
};

/** Момент «дата + ЧЧ:ММ» в зоне клиники — для сравнения границ смены. */
const clinicDateTimeMs = (date, hhmm) => new Date(`${date}T${hhmm}:00${CLINIC_OFFSET}`).getTime();

/** Если старт без зоны — считаем его московским, иначе оставляем как есть. */
const normalizeStartIso = (raw) => {
  const s = String(raw).trim();
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2}))?/);
  if (!m) return s;
  const withSec = m[2] != null ? `${m[1]}:${m[2]}` : `${m[1]}:00`;
  return `${withSec}${CLINIC_OFFSET}`;
};

const dateOnly = (isoOrDate) => String(isoOrDate).slice(0, 10);


const doctors = [
  { id: 'd-001', name: 'Иванова Елена Сергеевна', specialty: 'Терапевт', cabinet: '201' },
  { id: 'd-002', name: 'Петров Андрей Викторович', specialty: 'Кардиолог', cabinet: '305' },
  { id: 'd-003', name: 'Сидорова Мария Александровна', specialty: 'Педиатр', cabinet: '104' },
  { id: 'd-004', name: 'Кузнецов Дмитрий Олегович', specialty: 'Невролог', cabinet: '412' },
  { id: 'd-005', name: 'Морозова Ольга Игоревна', specialty: 'Эндокринолог', cabinet: '207' },
  { id: 'd-006', name: 'Волков Сергей Петрович', specialty: '', cabinet: '001' },
];

const services = [
  {
    id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500,
    doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006'],
  },
  {
    id: 's-002', name: 'Повторная консультация', duration: 20, category: 'Приём', price: 1800,
    doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005'],
  },
  // Два врача из шести — эталон для сценария «запись от услуги».
  {
    id: 's-003', name: 'ЭКГ', duration: 15, category: 'Диагностика', price: 1200,
    doctorIds: ['d-002', 'd-004'],
  },
  {
    id: 's-004', name: 'УЗИ брюшной полости', duration: 30, category: 'Диагностика', price: 2800,
    doctorIds: ['d-002', 'd-006'],
    // Матрица компетенций: допуск есть, но с ограничением — оператор увидит предупреждение.
    limitedDoctorIds: ['d-006'],
  },
  {
    id: 's-005', name: 'Анализ крови общий', duration: 10, category: 'Лаборатория', price: 650,
    doctorIds: ['d-003', 'd-005'],
  },
  {
    id: 's-006', name: 'Биохимия крови', duration: 15, category: 'Лаборатория', price: 1500,
    doctorIds: ['d-004', 'd-005'],
  },
  {
    id: 's-007', name: 'Консультация по результатам', duration: 20, category: 'Приём', price: 1700,
    doctorIds: ['d-001', 'd-002', 'd-003', 'd-004', 'd-005', 'd-006'],
  },
  {
    id: 's-008', name: 'Расширенный приём', duration: 60, category: 'Приём', price: 4500,
    doctorIds: ['d-001', 'd-002', 'd-004'],
    limitedDoctorIds: ['d-004'],
  },
];

/**
 * Оборудование и кабинеты — второй ресурс записи (ФТ 3.1.1, 3.1.2).
 * `serviceIds` — услуги, которые без этого ресурса не выполняются: занятость
 * ресурса считается по реальным записям на эти услуги, а не отдельным списком.
 * `kind`: apparatus — аппарат, room — кабинет (в одном кабинете могут стоять
 * разные аппараты, и тогда кабинет становится общим ограничением).
 */
const equipment = [
  {
    id: 'eq-001',
    name: 'Электрокардиограф Schiller AT-102',
    code: 'EQ.ECG.01',
    kind: 'apparatus',
    type: 'Функциональная диагностика',
    cabinet: '305',
    hours: { start: '08:00', end: '20:00' },
    maintenance: '10 мин после каждого исследования',
    serviceIds: ['s-003'],
  },
  {
    id: 'eq-002',
    name: 'УЗИ-сканер Mindray Resona 7',
    code: 'EQ.USG.04',
    kind: 'apparatus',
    type: 'Ультразвуковая диагностика',
    cabinet: '118',
    hours: { start: '08:00', end: '20:00' },
    maintenance: 'обработка датчиков 5 мин',
    serviceIds: ['s-004'],
  },
  {
    id: 'eq-003',
    name: 'Гематологический анализатор Sysmex XN-550',
    code: 'EQ.LAB.02',
    kind: 'apparatus',
    type: 'Лаборатория',
    cabinet: '104',
    hours: { start: '08:00', end: '16:00' },
    maintenance: 'калибровка 08:00–08:15',
    serviceIds: ['s-005'],
  },
  {
    id: 'eq-004',
    name: 'Биохимический анализатор Mindray BS-240',
    code: 'EQ.LAB.07',
    kind: 'apparatus',
    type: 'Лаборатория',
    cabinet: '104',
    hours: { start: '08:00', end: '16:00' },
    maintenance: 'промывка 30 мин после 20 проб',
    serviceIds: ['s-006'],
  },
  {
    id: 'eq-005',
    name: 'Процедурный кабинет 104 (забор крови)',
    code: 'ROOM.104',
    kind: 'room',
    type: 'Кабинет',
    cabinet: '104',
    hours: { start: '08:00', end: '16:00' },
    maintenance: 'кварцевание 12:00–12:15',
    serviceIds: ['s-005', 's-006'],
  },
];

/**
 * Правила длительности (ФТ 1.6, 2.1). Применяются по приоритету сверху вниз:
 * `base` берёт длительность услуги из справочника, `set` задаёт норматив,
 * `add` двигает результат. Выключение правила меняет длительность реальной
 * записи — правила читает и АРМ оператора, а не только экран администратора.
 */
const durationRules = [
  {
    id: 'dr-base',
    priority: 0,
    condition: 'Базовая длительность',
    factor: 'Норматив услуги из справочника',
    effectLabel: 'база',
    enabled: true,
    locked: true,
    match: {},
    effect: { kind: 'base' },
  },
  {
    id: 'dr-visit-first',
    priority: 1,
    condition: 'Тип приёма',
    factor: 'Первичный, категория «Приём»',
    effectLabel: '60 мин',
    enabled: true,
    locked: false,
    match: { serviceCategory: 'Приём', visitType: 'first' },
    effect: { kind: 'set', minutes: 60 },
  },
  {
    id: 'dr-visit-repeat',
    priority: 2,
    condition: 'Тип приёма',
    factor: 'Повторный, категория «Приём»',
    effectLabel: '30 мин',
    enabled: true,
    locked: false,
    match: { serviceCategory: 'Приём', visitType: 'repeat' },
    effect: { kind: 'set', minutes: 30 },
  },
  {
    id: 'dr-equipment',
    priority: 3,
    condition: 'Оборудование',
    factor: 'Услуга выполняется на аппарате',
    effectLabel: '+10 мин',
    enabled: false,
    locked: false,
    match: { requiresEquipment: true },
    effect: { kind: 'add', minutes: 10 },
  },
  {
    id: 'dr-age-senior',
    priority: 4,
    condition: 'Возраст пациента',
    factor: 'Старше 70 лет',
    effectLabel: '+15 мин',
    enabled: true,
    locked: false,
    match: { patientAgeFrom: 70 },
    effect: { kind: 'add', minutes: 15 },
  },
];

const patients = [
  {
    id: 'p-001',
    name: 'Алексеев Игорь Николаевич',
    lastName: 'Алексеев',
    firstName: 'Игорь',
    middleName: 'Николаевич',
    phone: '+7 900 100-00-01',
    birthDate: '1985-03-12',
    cardNumber: 'UID 0001 1001',
  },
  {
    id: 'p-002',
    name: 'Белова Татьяна Викторовна',
    lastName: 'Белова',
    firstName: 'Татьяна',
    middleName: 'Викторовна',
    phone: '+7 900 100-00-02',
    birthDate: '1992-07-21',
    cardNumber: 'UID 0002 1002',
  },
  {
    id: 'p-003',
    name: 'Григорьев Артём Дмитриевич',
    lastName: 'Григорьев',
    firstName: 'Артём',
    middleName: 'Дмитриевич',
    phone: '+7 900 100-00-03',
    birthDate: '1978-11-05',
    cardNumber: 'UID 0003 1003',
  },
  {
    id: 'p-004',
    name: 'Дмитриева Анна Сергеевна',
    lastName: 'Дмитриева',
    firstName: 'Анна',
    middleName: 'Сергеевна',
    phone: '+7 900 100-00-04',
    birthDate: '2001-01-30',
    cardNumber: 'UID 0004 1004',
  },
  {
    id: 'p-005',
    name: 'Кузьмин Пётр Ильич',
    lastName: 'Кузьмин',
    firstName: 'Пётр',
    middleName: 'Ильич',
    phone: '+7 900 100-00-05',
    birthDate: '1949-06-18',
    cardNumber: 'UID 0005 1005',
  },
];

/**
 * Посев записей берёт первую четвёрку: состав демо-дня зафиксирован сценариями,
 * и пятый пациент не должен его двигать. В картотеке он нужен целиком — на нём
 * проверяется правило длительности «старше 70 лет».
 */
const seedPatients = patients.slice(0, 4);

const stepMinutes = 15;
const dayStart = '08:00';
const dayEnd = '20:00';

const dateMs = (date) => {
  const [y, m, d] = String(date).split('-').map(Number);
  return Date.UTC(y, m - 1, d);
};

const compareDate = (a, b) => {
  const ma = dateMs(a);
  const mb = dateMs(b);
  if (ma < mb) return -1;
  if (ma > mb) return 1;
  return 0;
};

const isWorkingInterval = (interval) => {
  if (!interval) return false;
  if (interval.kind !== 'work') return false;
  const span = toMinutes(interval.end) - toMinutes(interval.start);
  return span > 0;
};

const hasWorkingDay = (intervals) => {
  if (!Array.isArray(intervals) || intervals.length === 0) return false;
  return intervals.some(isWorkingInterval);
};

const findSeedSlot = (doctorId, dayIdx, durationMin, usedMinutes, seedMap) => {
  const source = seedMap || weekTemplateSeed;
  const intervals = (source[doctorId] || [])[dayIdx] || [];
  for (const interval of intervals) {
    if (!isWorkingInterval(interval)) continue;
    const ivStart = toMinutes(interval.start);
    const ivEnd = toMinutes(interval.end);
    for (let m = ivStart; m + durationMin <= ivEnd; m += stepMinutes) {
      const conflict = usedMinutes.some((u) => u.doctorId === doctorId && m < u.endMin && m + durationMin > u.startMin);
      if (!conflict) return m;
    }
  }
  return null;
};

// Фиксированный пул записей: достаточно разный, чтобы покрыть ≥5 записей
// на каждый рабочий день окна. Порядок важен — поздние записи «добивают»
// день до нужного минимума независимо от того, какие врачи работают.
const SEED_PLAN = [
  { doctorId: 'd-001', patientId: 'p-001', status: 'completed',   paymentType: 'regular',      serviceId: 's-007', durationMin: 30 },
  { doctorId: 'd-001', patientId: 'p-002', status: 'scheduled',   paymentType: 'promo',      serviceId: 's-001', durationMin: 30 },
  { doctorId: 'd-001', patientId: 'p-003', status: 'no_show',     paymentType: 'dms', serviceId: 's-002', durationMin: 20 },
  { doctorId: 'd-002', patientId: 'p-001', status: 'completed',   paymentType: 'promo',      serviceId: 's-007', durationMin: 20 },
  { doctorId: 'd-002', patientId: 'p-002', status: 'scheduled',   paymentType: 'regular',      serviceId: 's-001', durationMin: 30 },
  { doctorId: 'd-002', patientId: 'p-003', status: 'arrived',     paymentType: 'promo',      serviceId: 's-002', durationMin: 20 },
  { doctorId: 'd-002', patientId: 'p-004', status: 'in_progress', paymentType: 'dms', serviceId: 's-001', durationMin: 30 },
  { doctorId: 'd-002', patientId: 'p-001', status: 'cancelled',   paymentType: 'regular',      serviceId: 's-003', durationMin: 15 },
  { doctorId: 'd-003', patientId: 'p-002', status: 'scheduled',   paymentType: 'promo',      serviceId: 's-001', durationMin: 30 },
  { doctorId: 'd-003', patientId: 'p-003', status: 'completed',   paymentType: 'regular',      serviceId: 's-007', durationMin: 20 },
  { doctorId: 'd-003', patientId: 'p-004', status: 'no_show',     paymentType: 'dms', serviceId: 's-005', durationMin: 10 },
  { doctorId: 'd-004', patientId: 'p-001', status: 'scheduled',   paymentType: 'regular',      serviceId: 's-001', durationMin: 30 },
  { doctorId: 'd-004', patientId: 'p-002', status: 'arrived',     paymentType: 'promo',      serviceId: 's-006', durationMin: 15 },
  { doctorId: 'd-005', patientId: 'p-003', status: 'completed',   paymentType: 'regular',      serviceId: 's-007', durationMin: 20 },
  { doctorId: 'd-005', patientId: 'p-004', status: 'scheduled',   paymentType: 'dms', serviceId: 's-001', durationMin: 30 },
  { doctorId: 'd-006', patientId: 'p-001', status: 'scheduled',   paymentType: 'regular',      serviceId: 's-004', durationMin: 30 },
  { doctorId: 'd-006', patientId: 'p-002', status: 'completed',   paymentType: 'promo',      serviceId: 's-007', durationMin: 20 },
  // Приёмы на аппаратах: занятость оборудования считается по записям, и без
  // них лента ресурсов пуста — проверить её на стенде было бы нечем.
  { doctorId: 'd-004', patientId: 'p-004', status: 'scheduled',   paymentType: 'regular',    serviceId: 's-003', durationMin: 15 },
  { doctorId: 'd-005', patientId: 'p-001', status: 'scheduled',   paymentType: 'regular',    serviceId: 's-005', durationMin: 10 },
];

/**
 * Услуги на аппаратах, которыми добираются записи-заполнители. Заполнитель
 * приходит без услуги, и лента оборудования на демо-стенде оставалась пустой:
 * занятость аппарата считается по записям, а записей на аппаратные услуги
 * почти не было. Время и длительность заполнителя при этом не меняются —
 * услуга подбирается ровно под уже выбранную длительность и допуск врача.
 */
const EQUIPMENT_SERVICES = ['s-003', 's-004', 's-005', 's-006'];

const equipmentServiceFor = (doctorId, durationMin) => {
  const svc = services.find((s) => EQUIPMENT_SERVICES.includes(s.id)
    && s.duration === durationMin
    && s.doctorIds.includes(doctorId));
  return svc ? svc.id : null;
};

// Статусы, которые могут появиться на конкретном дне относительно sysDate.
// Прошедший день — только терминальные статусы; сегодня — смесь; будущий — scheduled.
const STATUS_POOL_FOR_DAY = (date, sysDate) => {
  const cmp = compareDate(date, sysDate);
  if (cmp < 0) return ['completed', 'no_show', 'completed', 'cancelled', 'completed'];
  if (cmp > 0) return ['scheduled', 'scheduled', 'scheduled', 'scheduled', 'scheduled', 'scheduled', 'scheduled'];
  return ['scheduled', 'arrived', 'in_progress', 'completed', 'scheduled', 'scheduled', 'completed', 'no_show', 'scheduled'];
};

const STATUSES_ALLOWED_IN_PAST = new Set(['completed', 'no_show', 'cancelled']);
const STATUSES_ALLOWED_IN_FUTURE = new Set(['scheduled']);

const clampStatusForDay = (date, sysDate, status) => {
  const cmp = compareDate(date, sysDate);
  if (cmp < 0 && !STATUSES_ALLOWED_IN_PAST.has(status)) return 'completed';
  if (cmp > 0 && !STATUSES_ALLOWED_IN_FUTURE.has(status)) return 'scheduled';
  return status;
};

const patientIds = seedPatients.map((p) => p.id);

const seedAppointments = (date, sysDate, seedMap) => {
  const dIdx = dayIndex(date);
  const statusPool = STATUS_POOL_FOR_DAY(date, sysDate);

  const usedMinutes = [];
  const placed = [];

  /**
   * Пациент, свободный в этом интервале. Раньше посев считал занятость только
   * по врачу, и один пациент оказывался в двух кабинетах в одно время: на
   * стенде это видно глазами, а сервер (ФТ 3.3.1) такую запись не принял бы.
   */
  const pickPatient = (preferredId, startMin, durationMin) => {
    const busy = (id) => placed.some((a) => a.patientId === id
      && a.startMin < startMin + durationMin
      && a.startMin + a.durationMin > startMin);
    if (!busy(preferredId)) return preferredId;
    return patientIds.find((id) => !busy(id)) ?? null;
  };

  for (let i = 0; i < SEED_PLAN.length; i += 1) {
    const p = SEED_PLAN[i];
    const startMin = findSeedSlot(p.doctorId, dIdx, p.durationMin, usedMinutes, seedMap);
    if (startMin == null) continue;
    const patientId = pickPatient(p.patientId, startMin, p.durationMin);
    if (patientId == null) continue;
    usedMinutes.push({ doctorId: p.doctorId, startMin, endMin: startMin + p.durationMin });
    const hh = String(Math.floor(startMin / 60)).padStart(2, '0');
    const mm = String(startMin % 60).padStart(2, '0');
    const status = clampStatusForDay(date, sysDate, p.status);
    placed.push({
      doctorId: p.doctorId,
      patientId,
      startMin,
      start: isoAt(date, hh, mm),
      durationMin: p.durationMin,
      status,
      paymentType: p.paymentType,
      serviceId: p.serviceId,
    });
  }

  // Добиваем минимум до 5 записей, повторно используя пациентов и укорачивая
  // длительность до первого доступного слота. Это страхует дни, когда в
  // SEED_PLAN почти все цели — врачи, которые в этот день не работают.
  let safety = 0;
  while (placed.length < 5 && safety < 200) {
    safety += 1;
    let grown = false;
    for (const doc of doctors) {
      for (const durationMin of [30, 20, 15, 10]) {
        const startMin = findSeedSlot(doc.id, dIdx, durationMin, usedMinutes, seedMap);
        if (startMin == null) continue;
        usedMinutes.push({ doctorId: doc.id, startMin, endMin: startMin + durationMin });
        const hh = String(Math.floor(startMin / 60)).padStart(2, '0');
        const mm = String(startMin % 60).padStart(2, '0');
        const status = clampStatusForDay(date, sysDate, statusPool[placed.length % statusPool.length]);
        const preferred = patientIds[(placed.length + safety) % patientIds.length];
        const patientId = pickPatient(preferred, startMin, durationMin);
        if (patientId == null) continue;
        placed.push({
          doctorId: doc.id,
          patientId,
          startMin,
          start: isoAt(date, hh, mm),
          durationMin,
          status,
          paymentType: 'regular',
          serviceId: equipmentServiceFor(doc.id, durationMin),
        });
        grown = true;
        break;
      }
      if (placed.length >= 5) break;
    }
    if (!grown) break;
  }

  const AUTHORS = [
    { createdByName: 'Смирнова А.И.', createdByUnit: 'Колл-центр' },
    { createdByName: 'Орлова Н.В.', createdByUnit: 'Регистратура Динамо' },
  ];
  const out = placed.map(({ startMin: _startMin, ...a }, idx) => ({
    ...a,
    complaints: null,
    diagnosis: null,
    visitType: null,
    performedServiceIds: [],
    recommendations: [],
    nextVisit: null,
    createdByName: AUTHORS[idx % AUTHORS.length].createdByName,
    createdByUnit: AUTHORS[idx % AUTHORS.length].createdByUnit,
    confirmed: idx % 3 === 0,
  }));
  for (const r of out) {
    globalSeedSeq += 1;
    r.id = `a-${String(globalSeedSeq).padStart(3, '0')}`;
  }
  for (const r of out) {
    pushDemoTarget(r);
  }
  return out;
};

let globalSeedSeq = 0;

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
    patientAge: 'с 18 лет',
    preferentialLimit: '4',
    pairWork: '',
    serviceWindows: [
      { what: 'Приём по ДМС', when: 'до 14:00' },
    ],
    specializationTags: ['общая практика'],
  },
  {
    id: 'd-002',
    specialties: ['Кардиолог'],
    site: 'Площадка на Ленина, 15',
    temporarySites: [],
    admissionRules: ['Приём по записи', 'Первичный приём 40 минут'],
    equipmentAccess: ['ЭКГ-аппарат', 'УЗИ сердца'],
    patientAge: 'с 18 лет',
    preferentialLimit: '2',
    pairWork: '',
    serviceWindows: [{ what: 'УЗИ сердца', when: 'пн–пт' }],
    specializationTags: [],
  },
  {
    id: 'd-003',
    specialties: ['Педиатр'],
    site: 'Площадка на Ленина, 15',
    temporarySites: [],
    admissionRules: ['Приём по записи'],
    equipmentAccess: [],
    patientAge: 'до 18 лет',
    preferentialLimit: '6',
    pairWork: '',
    serviceWindows: [],
    specializationTags: ['дети'],
  },
  // Незаполненные карточки: без основной площадки и/или без специальностей.
  {
    id: 'd-004',
    specialties: ['Невролог'],
    site: '',
    temporarySites: [],
    admissionRules: [],
    equipmentAccess: [],
    patientAge: '',
    preferentialLimit: '',
    pairWork: '',
    serviceWindows: [],
    specializationTags: [],
  },
  {
    id: 'd-005',
    specialties: ['Эндокринолог'],
    site: '',
    temporarySites: [],
    admissionRules: [],
    equipmentAccess: [],
    patientAge: '',
    preferentialLimit: '',
    pairWork: '',
    serviceWindows: [],
    specializationTags: [],
  },
  {
    id: 'd-006',
    specialties: [],
    site: '',
    temporarySites: [],
    admissionRules: [],
    equipmentAccess: [],
    patientAge: '',
    preferentialLimit: '',
    pairWork: '',
    serviceWindows: [],
    specializationTags: [],
  },
];

// Шаблоны приёма на неделю: интервалы «врач × день». Часть дней намеренно не рабочая
// (block/absent/off) — иначе итог публикации был бы равен простому произведению
// врачей на дни и не доказывал бы, что число посчитано по шаблонам.
const WEEKDAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const WEEKDAYS_PER_WEEK = 7;

const weekTemplateSeed = {
  'd-001': [
    [{ start: '08:00', end: '14:00', kind: 'work' }],
    [{ start: '08:00', end: '14:00', kind: 'work' }],
    [{ start: '14:00', end: '20:00', kind: 'work' }],
    [{ start: '08:00', end: '12:00', kind: 'break' }],
    [{ start: '08:00', end: '14:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-002': [
    [{ start: '09:00', end: '15:00', kind: 'work' }],
    [{ start: '09:00', end: '15:00', kind: 'work' }],
    [{ start: '09:00', end: '15:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'absent' }],
    [{ start: '09:00', end: '15:00', kind: 'work' }],
    [{ start: '10:00', end: '13:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-003': [
    [{ start: '08:00', end: '13:00', kind: 'work' }],
    [{ start: '13:00', end: '18:00', kind: 'work' }],
    [{ start: '08:00', end: '13:00', kind: 'work' }],
    [{ start: '13:00', end: '18:00', kind: 'work' }],
    [{ start: '08:00', end: '11:00', kind: 'break' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-004': [
    [{ start: '10:00', end: '16:00', kind: 'work' }],
    [{ start: '10:00', end: '16:00', kind: 'work' }],
    // Реальная блокировка (не zero-length): в сетке видны слоты с occupancyKind=blocked.
    [{ start: '10:00', end: '16:00', kind: 'block' }],
    [{ start: '10:00', end: '16:00', kind: 'work' }],
    [{ start: '10:00', end: '16:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-005': [
    [{ start: '08:30', end: '12:30', kind: 'work' }],
    [{ start: '08:30', end: '12:30', kind: 'work' }],
    [{ start: '08:30', end: '12:30', kind: 'work' }],
    [{ start: '08:30', end: '12:30', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'absent' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
  'd-006': [
    [{ start: '08:00', end: '20:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '08:00', end: '20:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '08:00', end: '20:00', kind: 'work' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
  ],
};

const toMinutes = (hhmm) => {
  const [hh, mm] = String(hhmm).split(':').map(Number);
  return hh * 60 + mm;
};

const addDays = (date, n) => {
  const [y, m, d] = String(date).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Понедельник недели, в которую попадает date (календарная арифметика UTC, без зоны процесса).
const weekStartOf = (date) => {
  const [y, m, d] = String(date).split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const shift = (js + 6) % 7;
  return addDays(date, -shift);
};

const cloneWeekSeed = () => {
  const out = {};
  for (const [doctorId, days] of Object.entries(weekTemplateSeed)) {
    out[doctorId] = days.map((day) => day.map((iv) => ({ ...iv })));
  }
  return out;
};

const buildWeekTemplates = (weekStart) => {
  const weekSeed = ensureWeekTemplates(weekStart);
  const days = WEEKDAYS.map((weekday, i) => ({ date: addDays(weekStart, i), weekday }));
  const rows = state.doctors.map((doc) => ({
    doctorId: doc.id,
    doctorName: doc.name,
    specialty: doc.specialty,
    days: days.map((day, i) => ({
      date: day.date,
      weekday: day.weekday,
      intervals: (weekSeed[doc.id] || [])[i] || [],
    })),
  }));
  return {
    weekStart,
    weekEnd: addDays(weekStart, WEEKDAYS_PER_WEEK - 1),
    days,
    rows,
    published: state.publishedWeeks.includes(weekStart),
  };
};

// Итог публикации: слоты нарезаются шагом сетки из интервалов, видимых в сетке
// (work + block + break). Число слотов и число затронутых врачей считаются здесь,
// а не на экране. Совпадает с суммой lengths slots.doctors по дням из GET /schedule
// (праздники и отсутствия врача в count не входят — как в buildSlots).
const occupiesTimelineInterval = (interval) => {
  if (!interval) return false;
  if (interval.kind !== 'work' && interval.kind !== 'block' && interval.kind !== 'break') return false;
  return toMinutes(interval.end) - toMinutes(interval.start) > 0;
};

const countWeekSlots = (weekStart) => {
  const { rows } = buildWeekTemplates(weekStart);
  let slotsCreated = 0;
  const doctors = new Set();

  for (let dayIdx = 0; dayIdx < WEEKDAYS_PER_WEEK; dayIdx++) {
    const date = addDays(weekStart, dayIdx);
    if (findHoliday(date)) continue;
    for (const row of rows) {
      if (doctorAbsentOn(row.doctorId, date)) continue;
      const intervals = (row.days[dayIdx] && row.days[dayIdx].intervals) || [];
      for (const interval of intervals) {
        if (!occupiesTimelineInterval(interval)) continue;
        doctors.add(row.doctorId);
        const workStart = toMinutes(interval.start);
        const workEnd = workStart + Math.floor((toMinutes(interval.end) - workStart) / stepMinutes) * stepMinutes;
        for (let m = workStart; m < workEnd; m += stepMinutes) {
          slotsCreated += 1;
        }
      }
    }
  }

  return { slotsCreated, doctorsAffected: doctors.size };
};

const buildState = () => {
  const sysDate = today();
  const currentWeekStart = weekStartOf(sysDate);
  const priorWeekStart = addDays(currentWeekStart, -7);
  const nextWeekStart = addDays(currentWeekStart, 7);
  const publishedWeeks = [priorWeekStart, currentWeekStart, nextWeekStart];
  const weekTemplatesByWeek = {};
  for (const ws of publishedWeeks) {
    weekTemplatesByWeek[ws] = cloneWeekSeed();
  }
  const demoAppointments = [];
  pushDemoTarget = (record) => { demoAppointments.push(record); };
  for (const ws of publishedWeeks) {
    for (let i = 0; i < 7; i += 1) {
      seedAppointments(addDays(ws, i), sysDate, weekTemplatesByWeek[ws]);
    }
  }
  pushDemoTarget = (record) => { state.demoAppointments.push(record); };
  let maxDemoSeq = 0;
  const re = /^a-(\d+)$/;
  for (const a of demoAppointments) {
    const m = re.exec(a.id);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > maxDemoSeq) maxDemoSeq = n;
  }
  return {
    doctors: doctors.map((d) => ({ ...d })),
    doctorCards: doctorCards.map((c) => ({
      ...c,
      specialties: [...c.specialties],
      temporarySites: [...c.temporarySites],
      admissionRules: [...c.admissionRules],
      equipmentAccess: [...c.equipmentAccess],
      specializationTags: [...(c.specializationTags || [])],
      serviceWindows: (c.serviceWindows || []).map((w) => ({ ...w })),
    })),
    services: services.map((s) => ({
      ...s,
      doctorIds: Array.isArray(s.doctorIds) ? s.doctorIds.slice() : [],
      // Матрица компетенций: «выполняет с ограничением» — врач в doctorIds,
      // но оператор обязан увидеть предупреждение при записи.
      limitedDoctorIds: Array.isArray(s.limitedDoctorIds) ? s.limitedDoctorIds.slice() : [],
    })),
    equipment: equipment.map((e) => ({
      ...e,
      hours: { ...e.hours },
      serviceIds: e.serviceIds.slice(),
    })),
    durationRules: durationRules.map((r) => ({
      ...r,
      match: { ...r.match },
      effect: { ...r.effect },
    })),
    patients: patients.map((p) => ({
      ...p,
      consents: Array.isArray(p.consents) ? p.consents.slice() : [],
    })),
    date: sysDate,
    sysDate,
    appointments: [],
    demoAppointments,
    publishedWeeks,
    weekTemplatesByWeek,
    seq: maxDemoSeq,
    absences: [],
    waitlist: [],
    waitlistSeq: 0,
    massCancelBatches: [],
    massCancelSeq: 0,
    // Праздник холдинга в окне демо — для видимости в сетке (не «пустой день»).
    holidays: [
      { date: addDays(currentWeekStart, 6), name: 'Праздник холдинга', scope: 'holding' },
    ],
  };
};

let pushDemoTarget;

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
  const [y, m, d] = String(date).split('-').map(Number);
  const js = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return js === 0 ? 6 : js - 1;
};

const state = buildState();

const ensureWeekTemplates = (weekStart) => {
  if (!state.weekTemplatesByWeek[weekStart]) {
    state.weekTemplatesByWeek[weekStart] = cloneWeekSeed();
  }
  return state.weekTemplatesByWeek[weekStart];
};

const getDoctorDayIntervals = (weekStart, doctorId, dayIdx) => {
  const week = ensureWeekTemplates(weekStart);
  return (week[doctorId] || [])[dayIdx] || [];
};


const newId = () => {
  let maxSeq = state.seq;
  const re = /^a-(\d+)$/;
  for (const a of state.appointments) {
    const m = re.exec(a.id);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  for (const a of state.demoAppointments) {
    const m = re.exec(a.id);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  state.seq = maxSeq + 1;
  return `a-${String(state.seq).padStart(3, '0')}`;
};

const newPatientId = () => {
  let maxSeq = 0;
  const re = /^p-(\d+)$/;
  for (const p of state.patients) {
    const m = re.exec(p.id);
    if (!m) continue;
    const n = Number(m[1]);
    if (Number.isFinite(n) && n > maxSeq) maxSeq = n;
  }
  return `p-${String(maxSeq + 1).padStart(3, '0')}`;
};

const ABSENCE_REASON_LABEL = {
  vacation: 'Отпуск',
  sick: 'Больничный',
  repair: 'Ремонт',
  conference: 'Конференция',
  training: 'Учебный день',
  tech_break: 'Техперерыв',
};

const compareDateStr = (a, b) => {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
};

const dateInRange = (date, from, to) =>
  compareDateStr(date, from) >= 0 && compareDateStr(date, to) <= 0;

const findHoliday = (date) => (state.holidays || []).find((h) => h.date === date) || null;

const doctorAbsentOn = (doctorId, date) =>
  (state.absences || []).find(
    (a) => a.doctorId === doctorId && dateInRange(date, a.dateFrom, a.dateTo),
  ) || null;

const findAffectedAppointments = (doctorId, dateFrom, dateTo) => {
  const pool = [...state.appointments, ...(state.demoAppointments || [])];
  return pool.filter((a) => {
    if (doctorId && a.doctorId !== doctorId) return false;
    if (!ACTIVE_APPOINTMENT_STATUSES.has(a.status)) return false;
    if (a.status === 'completed') return false;
    const day = String(a.start).slice(0, 10);
    return dateInRange(day, dateFrom, dateTo);
  });
};

const applyAbsence = ({ doctorId, equipmentId, dateFrom, dateTo, reason }) => {
  const id = `abs-${String((state.absences || []).length + 1).padStart(3, '0')}`;
  const absence = {
    id,
    doctorId: doctorId || null,
    equipmentId: equipmentId || null,
    dateFrom,
    dateTo,
    reason,
    createdAt: new Date().toISOString(),
  };
  if (!state.absences) state.absences = [];
  state.absences.push(absence);

  const reasonLabel = ABSENCE_REASON_LABEL[reason] || reason;
  const affected = findAffectedAppointments(doctorId, dateFrom, dateTo);
  const result = [];
  for (const a of affected) {
    const fromStatus = a.status;
    a.status = 'cancelled';
    a.cancelReason = `Отсутствие: ${reasonLabel}`;
    a.cancelledAt = new Date().toISOString();
    a.cancelledBy = 'admin';
    a.affectedByAbsenceId = id;
    if (!Array.isArray(a.history)) a.history = [];
    a.history.push({
      from: fromStatus,
      to: 'cancelled',
      at: a.cancelledAt,
      actor: 'admin',
    });
    result.push({
      id: a.id,
      status: a.status,
      cancelReason: a.cancelReason,
    });
  }
  return { absence, affected: result };
};

const buildSlots = (date) => {
  if (findHoliday(date)) {
    return [];
  }

  const weekStart = weekStartOf(date);
  if (!state.publishedWeeks.includes(weekStart)) {
    return [];
  }
  const di = dayIndex(date);
  if (di < 0 || di > 6) {
    return [];
  }

  const intervalsByDoctor = new Map();
  for (const doc of state.doctors) {
    if (doctorAbsentOn(doc.id, date)) {
      intervalsByDoctor.set(doc.id, []);
      continue;
    }
    const dayIntervals = getDoctorDayIntervals(weekStart, doc.id, di);
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

  const occupiesTimeline = (kind) => kind === 'work' || kind === 'block' || kind === 'break';

  for (const doc of state.doctors) {
    const intervals = intervalsByDoctor.get(doc.id) || [];
    for (const interval of intervals) {
      if (!occupiesTimeline(interval.kind)) continue;
      if (interval.kind !== 'work' && toMinutes(interval.end) <= toMinutes(interval.start)) continue;
      const workStart = toMinutes(interval.start);
      const workEnd = workStart + Math.floor((toMinutes(interval.end) - workStart) / stepMinutes) * stepMinutes;
      for (let m = workStart; m < workEnd; m += stepMinutes) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        addSlot(hh, mm);
      }
    }
  }

  const slots = Array.from(slotMap.values()).sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

  for (const slot of slots) {
    const slotStartMs = clinicDateTimeMs(date, slot.time);
    const slotEndMs = slotStartMs + stepMinutes * 60000;
    for (const doc of state.doctors) {
      const intervals = intervalsByDoctor.get(doc.id) || [];
      let covering = null;
      for (const interval of intervals) {
        if (!occupiesTimeline(interval.kind)) continue;
        const wStart = clinicDateTimeMs(date, interval.start);
        const wEnd = clinicDateTimeMs(date, interval.end);
        if (slotStartMs >= wStart && slotEndMs <= wEnd) {
          covering = interval;
          break;
        }
      }
      if (!covering) continue;

      if (covering.kind === 'block') {
        slot.doctors.push({
          id: doc.id,
          name: doc.name,
          busy: true,
          occupancyKind: 'blocked',
          occupancyLabel: 'Блокировка',
        });
        continue;
      }
      if (covering.kind === 'break') {
        slot.doctors.push({
          id: doc.id,
          name: doc.name,
          busy: true,
          occupancyKind: 'tech_break',
          occupancyLabel: 'Техперерыв',
        });
        continue;
      }

      const pool = [...state.appointments, ...(state.demoAppointments || [])];
      const collision = pool.find((a) => {
        if (a.doctorId !== doc.id) return false;
        if (!ACTIVE_APPOINTMENT_STATUSES.has(a.status)) return false;
        const aStart = new Date(a.start).getTime();
        const aEnd = aStart + a.durationMin * 60000;
        return aStart < slotEndMs && aEnd > slotStartMs;
      });
      if (collision) {
        const patient = state.patients.find((p) => p.id === collision.patientId);
        slot.doctors.push({
          id: doc.id,
          name: doc.name,
          busy: true,
          appointmentId: collision.id,
          occupancyKind: 'appointment',
          occupancyLabel: patient ? patient.name : 'Запись',
        });
      } else {
        slot.doctors.push({
          id: doc.id,
          name: doc.name,
          busy: false,
          occupancyKind: null,
          occupancyLabel: null,
        });
      }
    }
  }

  return slots;
};

/** Ресурсы, без которых услуга не выполняется (аппарат и/или кабинет). */
const equipmentForService = (serviceId) => {
  if (!serviceId) return [];
  return (state.equipment || []).filter((e) => e.serviceIds.includes(serviceId));
};

/** Ремонт/простой ресурса на дату — из тех же отсутствий, что и у врачей. */
const equipmentAbsentOn = (equipmentId, date) =>
  (state.absences || []).find(
    (a) => a.equipmentId === equipmentId && dateInRange(date, a.dateFrom, a.dateTo),
  ) || null;

/**
 * Записи, которые занимают ресурс в интервале. Оборудование — второй ресурс:
 * занятость считается по записям на услуги ресурса, а не отдельным журналом.
 */
const appointmentsOnEquipment = (equipmentId, date) => {
  const eq = (state.equipment || []).find((e) => e.id === equipmentId);
  if (!eq) return [];
  const pool = [...state.appointments, ...(state.demoAppointments || [])];
  return pool
    .filter((a) => ACTIVE_APPOINTMENT_STATUSES.has(a.status)
      && dateOnly(a.start) === date
      && a.serviceId
      && eq.serviceIds.includes(a.serviceId))
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
};

/**
 * Свободен ли ресурс под запись. Возвращает первый конфликт: занятость другой
 * записью или ремонт ресурса на эту дату.
 */
const findEquipmentConflict = ({ serviceId, startIso, durationMin, excludeId }) => {
  const needed = equipmentForService(serviceId);
  if (needed.length === 0) return null;
  const date = dateOnly(startIso);
  const newStart = new Date(startIso).getTime();
  const newEnd = newStart + durationMin * 60000;
  const pool = [...state.appointments, ...(state.demoAppointments || [])];

  for (const eq of needed) {
    const repair = equipmentAbsentOn(eq.id, date);
    if (repair) {
      return { equipment: eq, reason: 'repair', absence: repair };
    }
    const busy = pool.find((a) => {
      if (a.id === excludeId) return false;
      if (!ACTIVE_APPOINTMENT_STATUSES.has(a.status)) return false;
      if (!a.serviceId || !eq.serviceIds.includes(a.serviceId)) return false;
      const aStart = new Date(a.start).getTime();
      const aEnd = aStart + a.durationMin * 60000;
      return aStart < newEnd && aEnd > newStart;
    });
    if (busy) {
      return { equipment: eq, reason: 'busy', appointment: busy };
    }
  }
  return null;
};

/** Дневная лента ресурса: шаг сетки, реальные записи, ремонт и нерабочие часы. */
const buildEquipmentDay = (date) => {
  const items = (state.equipment || []).map((eq) => {
    const repair = equipmentAbsentOn(eq.id, date);
    const booked = appointmentsOnEquipment(eq.id, date);
    const dayStartMin = toMinutes(dayStart);
    const dayEndMin = toMinutes(dayEnd);
    const openStart = toMinutes(eq.hours.start);
    const openEnd = toMinutes(eq.hours.end);
    const slots = [];
    for (let m = dayStartMin; m < dayEndMin; m += stepMinutes) {
      const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const slotStart = clinicDateTimeMs(date, time);
      const slotEnd = slotStart + stepMinutes * 60000;
      if (repair) {
        slots.push({ time, state: 'repair', label: ABSENCE_REASON_LABEL[repair.reason] || repair.reason });
        continue;
      }
      if (m < openStart || m >= openEnd) {
        slots.push({ time, state: 'closed', label: null });
        continue;
      }
      const taken = booked.find((a) => {
        const aStart = new Date(a.start).getTime();
        const aEnd = aStart + a.durationMin * 60000;
        return aStart < slotEnd && aEnd > slotStart;
      });
      if (taken) {
        const patient = state.patients.find((p) => p.id === taken.patientId);
        const doctor = state.doctors.find((d) => d.id === taken.doctorId);
        const service = state.services.find((s) => s.id === taken.serviceId);
        slots.push({
          time,
          state: 'booked',
          label: patient ? patient.name : 'Запись',
          appointmentId: taken.id,
          doctorName: doctor ? doctor.name : null,
          serviceName: service ? service.name : null,
          isStart: new Date(taken.start).getTime() === slotStart,
        });
        continue;
      }
      slots.push({ time, state: 'free', label: null });
    }
    return {
      ...eq,
      hours: { ...eq.hours },
      serviceIds: eq.serviceIds.slice(),
      serviceNames: eq.serviceIds
        .map((id) => (state.services.find((s) => s.id === id) || {}).name)
        .filter(Boolean),
      sharedWith: (state.equipment || [])
        .filter((other) => other.id !== eq.id
          && other.cabinet === eq.cabinet
          && other.serviceIds.some((sid) => eq.serviceIds.includes(sid)))
        .map((other) => other.name),
      repair: repair
        ? { from: repair.dateFrom, to: repair.dateTo, reason: ABSENCE_REASON_LABEL[repair.reason] || repair.reason }
        : null,
      bookedCount: booked.length,
      slots,
    };
  });
  return { date, stepMinutes, startTime: dayStart, endTime: dayEnd, items };
};

const COMPETENCY_VALUES = new Set(['yes', 'limited', 'no']);

/** Значение матрицы компетенций для пары «услуга × врач». */
const competencyValue = (service, doctorId) => {
  const allowed = Array.isArray(service.doctorIds) ? service.doctorIds : [];
  if (!allowed.includes(doctorId)) return 'no';
  const limited = Array.isArray(service.limitedDoctorIds) ? service.limitedDoctorIds : [];
  return limited.includes(doctorId) ? 'limited' : 'yes';
};

/** Матрица компетенций целиком: врачи × услуги (ФТ 1.5). */
const buildCompetencies = () => ({
  doctors: state.doctors.map((d) => ({ id: d.id, name: d.name, specialty: d.specialty })),
  services: state.services.map((s) => ({ id: s.id, name: s.name, category: s.category })),
  cells: state.services.map((s) => ({
    serviceId: s.id,
    values: state.doctors.map((d) => ({ doctorId: d.id, value: competencyValue(s, d.id) })),
  })),
});

/**
 * Правка одной клетки матрицы. Пишет в тот же `doctorIds`, по которому сервер
 * отказывает в записи: снятый допуск сразу закрывает запись к этому врачу.
 */
const setCompetency = (serviceId, doctorId, value) => {
  const service = state.services.find((s) => s.id === serviceId);
  if (!service) {
    return { ok: false, status: 404, error: 'service_not_found', message: 'Услуга не найдена' };
  }
  if (!state.doctors.some((d) => d.id === doctorId)) {
    return { ok: false, status: 404, error: 'doctor_not_found', message: 'Врач не найден' };
  }
  if (!COMPETENCY_VALUES.has(value)) {
    return {
      ok: false,
      status: 400,
      error: 'invalid_value',
      message: 'Допуск принимает значения «yes», «limited» или «no»',
    };
  }
  if (!Array.isArray(service.limitedDoctorIds)) service.limitedDoctorIds = [];
  const withoutDoctor = (list) => list.filter((id) => id !== doctorId);

  if (value === 'no') {
    service.doctorIds = withoutDoctor(service.doctorIds);
    service.limitedDoctorIds = withoutDoctor(service.limitedDoctorIds);
  } else {
    if (!service.doctorIds.includes(doctorId)) service.doctorIds.push(doctorId);
    service.limitedDoctorIds = withoutDoctor(service.limitedDoctorIds);
    if (value === 'limited') service.limitedDoctorIds.push(doctorId);
  }
  return { ok: true, serviceId, doctorId, value: competencyValue(service, doctorId) };
};

/** Включение/выключение правила длительности. Базовое правило не выключается. */
const setDurationRuleEnabled = (id, enabled) => {
  const rule = (state.durationRules || []).find((r) => r.id === id);
  if (!rule) {
    return { ok: false, status: 404, error: 'rule_not_found', message: 'Правило не найдено' };
  }
  if (rule.locked) {
    return {
      ok: false,
      status: 409,
      error: 'rule_locked',
      message: 'Базовое правило длительности выключить нельзя',
    };
  }
  rule.enabled = Boolean(enabled);
  return { ok: true, rule };
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


const TIME_RE = /^\d{2}:\d{2}$/;
const KINDS = new Set(['work', 'block', 'break', 'absent', 'off']);

const normalizeIntervals = (raw) => {
  if (!Array.isArray(raw) || raw.length === 0) {
    return { ok: false, error: 'invalid_intervals', message: 'Нужен хотя бы один интервал' };
  }
  const out = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'invalid_intervals', message: 'Интервал задан неверно' };
    }
    const kind = String(item.kind || '');
    const start = String(item.start || '');
    const end = String(item.end || '');
    if (!KINDS.has(kind)) {
      return { ok: false, error: 'invalid_kind', message: 'Неизвестный тип интервала' };
    }
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      return { ok: false, error: 'invalid_time', message: 'Границы интервала — ЧЧ:ММ' };
    }
    if ((kind === 'work' || kind === 'break' || kind === 'block') && toMinutes(end) <= toMinutes(start)) {
      return { ok: false, error: 'invalid_span', message: 'Конец интервала должен быть позже начала' };
    }
    out.push({ start, end, kind });
  }
  return { ok: true, intervals: out };
};

const saveWeekTemplateInterval = ({ weekStart, doctorId, date, intervals }) => {
  const ws = weekStartOf(weekStart);
  const day = String(date);
  if (weekStartOf(day) !== ws) {
    return { ok: false, status: 400, error: 'date_outside_week', message: 'Дата не принадлежит этой неделе' };
  }
  if (!state.doctors.some((d) => d.id === doctorId)) {
    return { ok: false, status: 404, error: 'doctor_not_found', message: 'Врач не найден' };
  }
  const normalized = normalizeIntervals(intervals);
  if (!normalized.ok) {
    return { ok: false, status: 400, error: normalized.error, message: normalized.message };
  }
  const week = ensureWeekTemplates(ws);
  if (!week[doctorId]) {
    week[doctorId] = Array.from({ length: 7 }, () => [{ start: '00:00', end: '00:00', kind: 'off' }]);
  }
  const di = dayIndex(day);
  week[doctorId][di] = normalized.intervals.map((iv) => ({ ...iv }));
  return { ok: true, templates: buildWeekTemplates(ws) };
};

const clearWeekAppointments = (weekStart) => {
  const dates = new Set();
  for (let i = 0; i < 7; i += 1) dates.add(addDays(weekStart, i));
  const keep = (a) => !dates.has(dateOnly(a.start));
  state.appointments = state.appointments.filter(keep);
  state.demoAppointments = state.demoAppointments.filter(keep);
};

const unpublishWeek = (weekStartRaw) => {
  const weekStart = weekStartOf(weekStartRaw);
  const idx = state.publishedWeeks.indexOf(weekStart);
  if (idx < 0) {
    return { ok: false, status: 409, error: 'week_not_published', message: 'Неделя не опубликована' };
  }
  state.publishedWeeks.splice(idx, 1);
  clearWeekAppointments(weekStart);
  return { ok: true, weekStart, templates: buildWeekTemplates(weekStart) };
};

/** Вернуть стенд к исходному демо-состоянию без перезапуска процесса. */
const resetState = () => {
  const fresh = buildState();
  Object.keys(state).forEach((k) => {
    delete state[k];
  });
  Object.assign(state, fresh);
  return state;
};

module.exports = {
  state,
  today,
  newId,
  newPatientId,
  buildSlots,
  seedAppointments,
  stepMinutes,
  dayStart,
  dayEnd,
  dayIndex,
  overlaps,
  isoAt,
  clinicDateTimeMs,
  normalizeStartIso,
  dateOnly,
  CLINIC_OFFSET,
  weekStartOf,
  addDays,
  buildWeekTemplates,
  countWeekSlots,
  weekTemplateSeed,
  ensureWeekTemplates,
  getDoctorDayIntervals,
  saveWeekTemplateInterval,
  unpublishWeek,
  clearWeekAppointments,
  cloneWeekSeed,
  isWorkingInterval,
  hasWorkingDay,
  resetState,
  buildState,
  findHoliday,
  doctorAbsentOn,
  findAffectedAppointments,
  applyAbsence,
  ABSENCE_REASON_LABEL,
  equipmentForService,
  equipmentAbsentOn,
  appointmentsOnEquipment,
  findEquipmentConflict,
  buildEquipmentDay,
  buildCompetencies,
  competencyValue,
  setCompetency,
  setDurationRuleEnabled,
};
