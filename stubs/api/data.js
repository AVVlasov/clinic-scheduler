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
  { id: 'd-006', name: 'Волков Сергей Петрович', specialty: 'Хирург', cabinet: '118' },
  // Врач принят на площадку, карточка ещё не заполнена и смен в шаблоне нет.
  // На нём проверяется счётчик «Незаполненных карточек»; в сетке смены его быть
  // не должно — врач без графика не занимает колонку.
  { id: 'd-007', name: 'Соловьёв Артур Вадимович', specialty: '', cabinet: '' },
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

/**
 * Картотека демо-стенда. Правдоподобие здесь — не украшение: на пяти пациентах
 * с телефонами-счётчиками любой день смены выглядит подделкой, а поиск по
 * фамилии и по номеру карты проверить нечем. Возрасты разведены намеренно:
 * есть дети (педиатр), есть пациенты старше 70 (правило длительности).
 */
const patients = [
  { id: 'p-001', lastName: 'Алексеев',   firstName: 'Игорь',     middleName: 'Николаевич',  phone: '+7 916 482-31-07', birthDate: '1985-03-12', cardNumber: '0041-2187' },
  { id: 'p-002', lastName: 'Белова',     firstName: 'Татьяна',   middleName: 'Викторовна',  phone: '+7 903 155-64-28', birthDate: '1992-07-21', cardNumber: '0128-7734' },
  { id: 'p-003', lastName: 'Григорьев',  firstName: 'Артём',     middleName: 'Дмитриевич',  phone: '+7 925 703-19-45', birthDate: '1978-11-05', cardNumber: '0093-4410' },
  { id: 'p-004', lastName: 'Дмитриева',  firstName: 'Анна',      middleName: 'Сергеевна',   phone: '+7 909 264-88-13', birthDate: '2001-01-30', cardNumber: '0215-6602' },
  { id: 'p-005', lastName: 'Кузьмин',    firstName: 'Пётр',      middleName: 'Ильич',       phone: '+7 926 341-70-52', birthDate: '1949-06-18', cardNumber: '0007-9931' },
  { id: 'p-006', lastName: 'Соколова',   firstName: 'Марина',    middleName: 'Олеговна',    phone: '+7 962 818-27-04', birthDate: '1969-09-14', cardNumber: '0154-3078' },
  { id: 'p-007', lastName: 'Николаев',   firstName: 'Виктор',    middleName: 'Павлович',    phone: '+7 985 220-56-91', birthDate: '1953-02-27', cardNumber: '0019-8845' },
  { id: 'p-008', lastName: 'Тарасова',   firstName: 'Юлия',      middleName: 'Андреевна',   phone: '+7 917 604-12-38', birthDate: '1988-12-03', cardNumber: '0187-2261' },
  { id: 'p-009', lastName: 'Захаров',    firstName: 'Михаил',    middleName: 'Юрьевич',     phone: '+7 906 379-45-60', birthDate: '1996-05-19', cardNumber: '0233-5517' },
  { id: 'p-010', lastName: 'Лебедева',   firstName: 'Ольга',     middleName: 'Ивановна',    phone: '+7 964 512-83-77', birthDate: '1961-08-08', cardNumber: '0062-1194' },
  { id: 'p-011', lastName: 'Фомин',      firstName: 'Денис',     middleName: 'Аркадьевич',  phone: '+7 999 147-92-26', birthDate: '1983-04-25', cardNumber: '0176-4083' },
  { id: 'p-012', lastName: 'Крылова',    firstName: 'Светлана',  middleName: 'Борисовна',   phone: '+7 915 836-05-49', birthDate: '1974-10-11', cardNumber: '0108-7726' },
  { id: 'p-013', lastName: 'Панкратов',  firstName: 'Алексей',   middleName: 'Романович',   phone: '+7 977 263-71-84', birthDate: '2016-06-02', cardNumber: '0248-3390' },
  { id: 'p-014', lastName: 'Игнатьева',  firstName: 'Вера',      middleName: 'Степановна',  phone: '+7 903 690-24-15', birthDate: '1947-01-23', cardNumber: '0004-6658' },
  { id: 'p-015', lastName: 'Романов',    firstName: 'Кирилл',    middleName: 'Сергеевич',   phone: '+7 926 458-13-70', birthDate: '2014-03-17', cardNumber: '0251-1029' },
  { id: 'p-016', lastName: 'Ковалёва',   firstName: 'Наталья',   middleName: 'Викторовна',  phone: '+7 910 725-38-62', birthDate: '1990-11-29', cardNumber: '0139-8874' },
  { id: 'p-017', lastName: 'Стрельцов',  firstName: 'Егор',      middleName: '',            phone: '+7 968 314-07-95', birthDate: '1999-07-06', cardNumber: '0224-4517' },
  { id: 'p-018', lastName: 'Мельникова', firstName: 'Ирина',     middleName: 'Геннадьевна', phone: '+7 985 561-49-23', birthDate: '1966-02-15', cardNumber: '0077-2340' },
].map((p) => ({
  ...p,
  name: [p.lastName, p.firstName, p.middleName].filter(Boolean).join(' '),
}));

/**
 * В посеве участвует вся картотека: день, собранный на четырёх пациентах, ставит
 * одного человека к четырём врачам за утро — на стенде это видно глазами.
 */
const seedPatients = patients;

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

/**
 * Посев демо-стенда. Три требования, ради которых он собран именно так:
 *   1. соседние дни не должны совпадать — иначе «Завтра» и «Неделя» показывают копию;
 *   2. загрузка врача 45–75% — на пустом дне не показать поиск времени, на полном не записать;
 *   3. пациент не может быть у двух врачей одновременно и приходить трижды за день.
 * Всё детерминировано хешем: перезапуск процесса даёт тот же стенд.
 */
const seedHash = (str) => {
  let h = 2166136261;
  for (let i = 0; i < String(str).length; i += 1) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/** Услуги, к которым у врача есть допуск: запись вне допуска сервер бы не принял. */
const servicesOfDoctor = (doctorId) => services.filter((s) => (s.doctorIds || []).includes(doctorId));

const yearsBetween = (birthDate, onDate) => {
  const [by, bm, bd] = String(birthDate).split('-').map(Number);
  const [ny, nm, nd] = String(onDate).split('-').map(Number);
  let years = ny - by;
  if (nm < bm || (nm === bm && nd < bd)) years -= 1;
  return years;
};

/**
 * Тип приёма по услуге — то же правило, что и в карточке оператора: название
 * услуги говорит, первичный это приём или повторный. Для диагностики и
 * лаборатории тип не применяется.
 */
const seedVisitTypeFor = (service) => {
  if (!service || service.category !== 'Приём') return null;
  if (/первичн/i.test(service.name)) return 'first';
  if (/повторн|результат/i.test(service.name)) return 'repeat';
  return 'first';
};

/**
 * Длительность посевной записи считают ТЕ ЖЕ правила, что и запись из АРМ.
 * Иначе стенд показывает первичную консультацию на 30 минут, а оператор,
 * записывая такую же, получает 60 — и экран «Правила длительности» врёт.
 */
const seedDurationFor = (service, visitType, patientAgeYears) => {
  const ordered = [...durationRules].sort((a, b) => a.priority - b.priority);
  let total = service.duration;
  for (const rule of ordered) {
    if (!rule.enabled && !rule.locked) continue;
    const m = rule.match || {};
    if (m.serviceCategory != null && m.serviceCategory !== service.category) continue;
    if (m.visitType != null && m.visitType !== visitType) continue;
    if (m.requiresEquipment === true && !service.requiresEquipment) continue;
    if (m.patientAgeFrom != null) {
      if (patientAgeYears == null || patientAgeYears < m.patientAgeFrom) continue;
    }
    if (rule.effect.kind === 'base') total = service.duration;
    else if (rule.effect.kind === 'set') total = rule.effect.minutes;
    else total += rule.effect.minutes;
    if (total < 5) total = 5;
  }
  return total;
};

const PAYMENT_MIX = ['regular', 'regular', 'dms', 'promo', 'regular', 'discount', 'regular', 'dms', 'certificate', 'promo'];

/**
 * Заготовки протокола по специальности. Завершённый приём с пустым протоколом
 * превращает карточку врача в пустой бланк: проверять на ней нечего.
 */
const PROTOCOL_BY_SPECIALTY = {
  'Терапевт': [
    { complaints: 'Кашель пятый день, температура до 37,6', diagnosis: 'J06.9 Острая инфекция верхних дыхательных путей' },
    { complaints: 'Слабость, головная боль к вечеру', diagnosis: 'G44.2 Головная боль напряжённого типа' },
    { complaints: 'Профилактический осмотр, жалоб нет', diagnosis: 'Z00.0 Общий медицинский осмотр' },
  ],
  'Кардиолог': [
    { complaints: 'Перебои в работе сердца при нагрузке', diagnosis: 'I49.3 Преждевременная деполяризация желудочков' },
    { complaints: 'Давление 160/95 вторую неделю', diagnosis: 'I10 Эссенциальная гипертензия' },
    { complaints: 'Одышка при подъёме на третий этаж', diagnosis: 'I25.1 Атеросклеротическая болезнь сердца' },
  ],
  'Педиатр': [
    { complaints: 'Насморк и подкашливание третий день', diagnosis: 'J00 Острый назофарингит' },
    { complaints: 'Плановый осмотр перед детским садом', diagnosis: 'Z00.1 Обычный осмотр состояния здоровья ребёнка' },
    { complaints: 'Сыпь на предплечьях после нового питания', diagnosis: 'L20.8 Атопический дерматит' },
  ],
  'Невролог': [
    { complaints: 'Боль в пояснице отдаёт в ногу', diagnosis: 'M54.4 Люмбаго с ишиасом' },
    { complaints: 'Онемение пальцев правой руки по утрам', diagnosis: 'G56.0 Синдром запястного канала' },
    { complaints: 'Головокружение при повороте головы', diagnosis: 'H81.1 Доброкачественное пароксизмальное головокружение' },
  ],
  'Эндокринолог': [
    { complaints: 'Сухость во рту, жажда, вес снизился на 4 кг', diagnosis: 'E11.9 Сахарный диабет 2 типа' },
    { complaints: 'Утомляемость, зябкость, отёчность лица', diagnosis: 'E03.9 Гипотиреоз' },
    { complaints: 'Контроль терапии, самочувствие ровное', diagnosis: 'E11.9 Сахарный диабет 2 типа' },
  ],
  'Врач общей практики': [
    { complaints: 'Осмотр перед плановой операцией', diagnosis: 'Z01.8 Другое уточнённое специальное обследование' },
    { complaints: 'Боль в горле, глотать больно', diagnosis: 'J02.9 Острый фарингит' },
    { complaints: 'Оформление справки в бассейн', diagnosis: 'Z02.0 Обследование для поступления в учреждение' },
  ],
};

const PROTOCOL_FALLBACK = PROTOCOL_BY_SPECIALTY['Врач общей практики'];

const RECOMMENDATION_POOL = [
  'Контрольный осмотр через 7 дней',
  'Обильное питьё и домашний режим три дня',
  'Дневник артериального давления две недели',
  'Повторная консультация после анализов',
  'Ограничить соль до 5 г в сутки',
  'Явка с результатами обследования',
];

/**
 * Статус записи выводится из дня и часа, а не назначается списком: прошедший
 * день не может содержать «ожидает», а завтрашний — «приём идёт».
 */
const seedStatusFor = (date, sysDate, startMin, key) => {
  const cmp = compareDate(date, sysDate);
  const h = seedHash(key);
  if (cmp < 0) return ['completed', 'completed', 'completed', 'no_show', 'completed', 'cancelled'][h % 6];
  if (cmp > 0) return 'scheduled';
  if (startMin < 11 * 60) return ['completed', 'completed', 'no_show', 'completed'][h % 4];
  if (startMin < 12 * 60 + 30) return ['in_progress', 'arrived', 'arrived', 'completed'][h % 4];
  return ['scheduled', 'scheduled', 'scheduled', 'arrived', 'cancelled'][h % 5];
};

const SEED_AUTHORS = [
  { createdByName: 'Смирнова А.И.', createdByUnit: 'Колл-центр' },
  { createdByName: 'Орлова Н.В.', createdByUnit: 'Регистратура «Динамо»' },
  { createdByName: 'Гончарова Л.П.', createdByUnit: 'Колл-центр' },
];

/** Цепочка переходов под статус: журнал «Аудит изменений» не бывает пустым у прошедшей записи. */
const seedHistory = (status, startIso, durationMin, createdShiftMin) => {
  const shift = (min) => new Date(new Date(startIso).getTime() + min * 60000).toISOString();
  const created = { from: null, to: 'scheduled', at: shift(-createdShiftMin), actor: 'operator' };
  if (status === 'scheduled') return [created];
  if (status === 'cancelled') return [created, { from: 'scheduled', to: 'cancelled', at: shift(-60), actor: 'operator' }];
  if (status === 'no_show') return [created, { from: 'scheduled', to: 'no_show', at: shift(20), actor: 'registrar' }];
  const arrived = { from: 'scheduled', to: 'arrived', at: shift(-8), actor: 'registrar' };
  if (status === 'arrived') return [created, arrived];
  const inProgress = { from: 'arrived', to: 'in_progress', at: shift(2), actor: 'doctor' };
  if (status === 'in_progress') return [created, arrived, inProgress];
  return [created, arrived, inProgress, { from: 'in_progress', to: 'completed', at: shift(durationMin), actor: 'doctor' }];
};

const seedAppointments = (date, sysDate, seedMap) => {
  const dIdx = dayIndex(date);
  const source = seedMap || weekTemplateSeed;
  const placed = [];
  const used = [];
  const dayCount = new Map();

  const slotFree = (doctorId, startMin, durationMin) => !used.some((u) => u.doctorId === doctorId
    && startMin < u.endMin && startMin + durationMin > u.startMin);

  const patientFree = (patientId, startMin, durationMin) => {
    if ((dayCount.get(patientId) || 0) >= 2) return false;
    return !placed.some((a) => a.patientId === patientId
      && a.startMin < startMin + durationMin
      && a.startMin + a.durationMin > startMin);
  };

  /**
   * Пациент подбирается с оглядкой на возрастное правило приёма: педиатру —
   * дети, взрослым специалистам — совершеннолетние. Иначе в справочнике врача
   * написано «до 18 лет», а в его сетке стоят пенсионеры.
   */
  const pickPatient = (doctorId, startMin, durationMin, key) => {
    const wantsChild = doctorId === 'd-003';
    const offset = seedHash(key) % patients.length;
    const ordered = patients.map((_, i) => patients[(offset + i) % patients.length]);
    const fits = (p) => {
      const age = yearsBetween(p.birthDate, date);
      return wantsChild ? age < 18 : age >= 18;
    };
    return ordered.find((p) => fits(p) && patientFree(p.id, startMin, durationMin))
      ?? ordered.find((p) => patientFree(p.id, startMin, durationMin))
      ?? null;
  };

  for (const doc of doctors) {
    const intervals = (source[doc.id] || [])[dIdx] || [];
    const pool = servicesOfDoctor(doc.id);
    if (pool.length === 0) continue;
    // Целевая загрузка врача на день: 45–72%. Ниже — «в клинике никого»,
    // выше — оператору некуда записывать, а показывают именно запись.
    const fill = 55 + (seedHash(`fill|${date}|${doc.id}`) % 14);
    for (const interval of intervals) {
      if (!isWorkingInterval(interval)) continue;
      const ivStart = toMinutes(interval.start);
      const ivEnd = toMinutes(interval.end);
      const targetBusyMin = Math.round(((ivEnd - ivStart) * fill) / 100);
      let bookedMin = 0;
      let m = ivStart;
      let guard = 0;
      while (m < ivEnd && bookedMin < targetBusyMin && guard < 200) {
        guard += 1;
        const key = `${date}|${doc.id}|${m}`;
        const h = seedHash(key);
        // Услуга выбирается из тех, что помещаются до конца интервала: иначе
        // одна длинная услуга у края смены обрывала бы весь остаток дня.
        const durationOf = (service, patient) => seedDurationFor(
          service,
          seedVisitTypeFor(service),
          patient ? yearsBetween(patient.birthDate, date) : null,
        );
        const fitting = pool.filter((s) => m + durationOf(s, null) <= ivEnd);
        if (fitting.length === 0) break;
        const svc = fitting[h % fitting.length];
        const patient = pickPatient(doc.id, m, durationOf(svc, null), `p|${key}`);
        if (patient == null) { m += stepMinutes; continue; }
        const durationMin = durationOf(svc, patient);
        if (m + durationMin > ivEnd) { m += stepMinutes; continue; }
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        placed.push({
          doctorId: doc.id,
          patientId: patient.id,
          startMin: m,
          start: isoAt(date, hh, mm),
          durationMin,
          status: seedStatusFor(date, sysDate, m, key),
          paymentType: PAYMENT_MIX[(h >>> 5) % PAYMENT_MIX.length],
          serviceId: svc.id,
        });
        used.push({ doctorId: doc.id, startMin: m, endMin: m + durationMin });
        dayCount.set(patient.id, (dayCount.get(patient.id) || 0) + 1);
        bookedMin += durationMin;

        /**
         * Пауза считается из остатка смены и остатка плана: свободное время
         * распределяется равномерно до конца интервала. Постоянный коэффициент
         * давал разброс загрузки от 40% до 100% — то пустой день, в котором
         * нечего показывать, то полный, в который нечего записать.
         */
        const after = m + durationMin;
        const rawGap = (durationMin * (100 - fill)) / fill;
        const jitter = (((h >>> 11) % 3) - 1) * stepMinutes;
        // Приём начинается на границе пятнадцати минут: услуга на 10 минут,
        // начатая в 09:05, красит в сетке две ячейки вместо одной, и врач
        // с загрузкой 54% выглядит занятым весь день.
        const gap = Math.max(stepMinutes, Math.round((rawGap + jitter) / stepMinutes) * stepMinutes);
        m = Math.ceil((after + gap) / stepMinutes) * stepMinutes;
      }
    }
  }

  /**
   * Выравнивание загрузки. Шаг сетки — 15 минут, а услуги длятся от 10 до 75:
   * при постоянной паузе доля занятого времени гуляла от 8% до 100%, то есть
   * то день, в котором нечего показывать, то день, в который некуда записать.
   * Поэтому загрузка не только планируется, но и проверяется по факту.
   */
  const workSlotsOf = (doctorId) => {
    const intervals = (source[doctorId] || [])[dIdx] || [];
    let count = 0;
    for (const interval of intervals) {
      if (!isWorkingInterval(interval)) continue;
      count += Math.floor((toMinutes(interval.end) - toMinutes(interval.start)) / stepMinutes);
    }
    return count;
  };
  // Занятость считается по АКТИВНЫМ записям: отменённая и неявка освобождают
  // слот, поэтому в сетке их время выглядит свободным — и должно.
  const busySlotsOf = (doctorId) => {
    const marks = new Set();
    for (const a of placed) {
      if (a.doctorId !== doctorId) continue;
      if (a.status === 'cancelled' || a.status === 'no_show') continue;
      for (let t = Math.floor(a.startMin / stepMinutes) * stepMinutes; t < a.startMin + a.durationMin; t += stepMinutes) marks.add(t);
    }
    return marks.size;
  };

  for (const doc of doctors) {
    const workSlots = workSlotsOf(doc.id);
    // Короткая смена (три часа по субботам) в полосу не укладывается: одна
    // услуга там весит четверть дня, и выравнивать нечего.
    if (workSlots < 16) continue;
    const pool = servicesOfDoctor(doc.id);
    if (pool.length === 0) continue;

    // Перегруз: снимаем последние записи, пока день не перестанет быть «всё занято».
    let guardTrim = 0;
    while (busySlotsOf(doc.id) / workSlots > 0.72 && guardTrim < 40) {
      guardTrim += 1;
      const own = placed.filter((a) => a.doctorId === doc.id);
      if (own.length <= 2) break;
      const drop = own[own.length - 1];
      placed.splice(placed.indexOf(drop), 1);
      const usedIdx = used.findIndex((u) => u.doctorId === doc.id && u.startMin === drop.startMin);
      if (usedIdx >= 0) used.splice(usedIdx, 1);
      dayCount.set(drop.patientId, Math.max(0, (dayCount.get(drop.patientId) || 1) - 1));
    }

    // Недогруз: доливаем в самые широкие свободные окна.
    let guardAdd = 0;
    while (busySlotsOf(doc.id) / workSlots < 0.48 && guardAdd < 40) {
      guardAdd += 1;
      const intervals = (source[doc.id] || [])[dIdx] || [];
      let booked = false;
      for (const interval of intervals) {
        if (!isWorkingInterval(interval) || booked) continue;
        const ivStart = toMinutes(interval.start);
        const ivEnd = toMinutes(interval.end);
        for (let m = ivStart; m < ivEnd && !booked; m += stepMinutes) {
          const key = `balance|${date}|${doc.id}|${m}|${guardAdd}`;
          const h = seedHash(key);
          const nextBusy = used
            .filter((u) => u.doctorId === doc.id && u.startMin >= m)
            .reduce((min, u) => Math.min(min, u.startMin), ivEnd);
          const room = nextBusy - m;
          const withAge = (service, patient) => seedDurationFor(
            service,
            seedVisitTypeFor(service),
            patient ? yearsBetween(patient.birthDate, date) : null,
          );
          const fitting = pool.filter((sv) => withAge(sv, null) <= room);
          if (fitting.length === 0) continue;
          const svc = fitting[h % fitting.length];
          const patient = pickPatient(doc.id, m, withAge(svc, null), key);
          if (patient == null) continue;
          const durationMin = withAge(svc, patient);
          if (durationMin > room || !slotFree(doc.id, m, durationMin)) continue;
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          placed.push({
            doctorId: doc.id,
            patientId: patient.id,
            startMin: m,
            start: isoAt(date, hh, mm),
            durationMin,
            status: seedStatusFor(date, sysDate, m, key),
            paymentType: PAYMENT_MIX[(h >>> 5) % PAYMENT_MIX.length],
            serviceId: svc.id,
          });
          used.push({ doctorId: doc.id, startMin: m, endMin: m + durationMin });
          dayCount.set(patient.id, (dayCount.get(patient.id) || 0) + 1);
          booked = true;
        }
      }
      if (!booked) break;
    }
  }

  /**
   * Короткая смена (одна суббота с единственным работающим врачом) даёт три
   * записи, и день выглядит закрытым. Добираем до шести, уплотняя паузы:
   * это единственное место, где посев жертвует разрежённостью ради того,
   * чтобы в окне не было пустых рабочих дней.
   */
  let guardFill = 0;
  while (placed.length < 6 && guardFill < 60) {
    guardFill += 1;
    let grown = false;
    for (const doc of doctors) {
      if (placed.length >= 6) break;
      const intervals = (source[doc.id] || [])[dIdx] || [];
      const pool = servicesOfDoctor(doc.id);
      if (pool.length === 0) continue;
      for (const interval of intervals) {
        if (!isWorkingInterval(interval)) continue;
        const ivStart = toMinutes(interval.start);
        const ivEnd = toMinutes(interval.end);
        let booked = false;
        for (let m = ivStart; m < ivEnd && !booked; m += stepMinutes) {
          const key = `fill|${date}|${doc.id}|${m}|${guardFill}`;
          const h = seedHash(key);
          // Уплотнение идёт в оставшиеся окна, поэтому услуга подбирается под
          // размер окна: иначе шестидесятиминутная услуга не влезает в
          // получасовую дыру, и день так и остаётся полупустым.
          const nextBusy = used
            .filter((u) => u.doctorId === doc.id && u.startMin >= m)
            .reduce((min, u) => Math.min(min, u.startMin), ivEnd);
          const room = nextBusy - m;
          const durationOfService = (service, patient) => seedDurationFor(
            service,
            seedVisitTypeFor(service),
            patient ? yearsBetween(patient.birthDate, date) : null,
          );
          const fitting = pool.filter((s) => durationOfService(s, null) <= room);
          if (fitting.length === 0) continue;
          const svc = fitting[h % fitting.length];
          const patient = pickPatient(doc.id, m, durationOfService(svc, null), key);
          if (patient == null) continue;
          // Возрастное правило удлиняет приём, поэтому длительность считается
          // уже с пациентом — и окно проверяется заново.
          const durationMin = durationOfService(svc, patient);
          if (durationMin > room) continue;
          if (!slotFree(doc.id, m, durationMin)) continue;
          const hh = String(Math.floor(m / 60)).padStart(2, '0');
          const mm = String(m % 60).padStart(2, '0');
          placed.push({
            doctorId: doc.id,
            patientId: patient.id,
            startMin: m,
            start: isoAt(date, hh, mm),
            durationMin,
            status: seedStatusFor(date, sysDate, m, key),
            paymentType: PAYMENT_MIX[(h >>> 5) % PAYMENT_MIX.length],
            serviceId: svc.id,
          });
          used.push({ doctorId: doc.id, startMin: m, endMin: m + durationMin });
          dayCount.set(patient.id, (dayCount.get(patient.id) || 0) + 1);
          booked = true;
          grown = true;
        }
        if (booked) break;
      }
    }
    if (!grown) break;
  }

  placed.sort((a, b) => (a.startMin - b.startMin) || a.doctorId.localeCompare(b.doctorId));

  const out = placed.map(({ startMin, ...a }, idx) => {
    const doc = doctors.find((d) => d.id === a.doctorId);
    const svc = services.find((s) => s.id === a.serviceId) || null;
    const patient = patients.find((p) => p.id === a.patientId);
    const h = seedHash(`p|${a.start}|${a.doctorId}`);
    const done = a.status === 'completed';
    const bank = PROTOCOL_BY_SPECIALTY[doc && doc.specialty] || PROTOCOL_FALLBACK;
    const protocol = bank[h % bank.length];
    const visitType = seedVisitTypeFor(svc) ?? 'repeat';
    const extraService = servicesOfDoctor(a.doctorId).find((s) => s.id !== a.serviceId && s.category !== 'Приём');
    const performed = done
      ? [a.serviceId, ...(((h >>> 7) % 3 === 0) && extraService ? [extraService.id] : [])].filter(Boolean)
      : [];
    const performedSum = performed.reduce((sum, id) => {
      const s = services.find((x) => x.id === id);
      return sum + (s ? s.price : 0);
    }, 0);
    // По ДМС пациент в кассу не платит: счёт уходит страховой.
    const cashDue = a.paymentType === 'dms' ? 0 : performedSum;
    const author = SEED_AUTHORS[h % SEED_AUTHORS.length];
    const record = {
      ...a,
      complaints: done ? protocol.complaints : null,
      diagnosis: done ? protocol.diagnosis : null,
      visitType: done ? visitType : null,
      performedServiceIds: performed,
      recommendations: done ? [RECOMMENDATION_POOL[h % RECOMMENDATION_POOL.length]] : [],
      nextVisit: null,
      paidAt: done ? new Date(new Date(a.start).getTime() + (a.durationMin + 5) * 60000).toISOString() : null,
      paidAmount: done ? cashDue : null,
      createdByName: author.createdByName,
      createdByUnit: author.createdByUnit,
      confirmed: (h >>> 9) % 3 !== 0,
      history: seedHistory(a.status, a.start, a.durationMin, 60 * (24 + (h % 96))),
      patientAgeYears: patient ? yearsBetween(patient.birthDate, date) : null,
    };
    if (!svc) record.serviceId = null;
    record.seedIndex = idx;
    return record;
  });

  for (const r of out) {
    globalSeedSeq += 1;
    r.id = `a-${String(globalSeedSeq).padStart(3, '0')}`;
    delete r.seedIndex;
    delete r.patientAgeYears;
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
    site: 'Динамо',
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
    site: 'Динамо',
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
    site: 'Динамо',
    temporarySites: [],
    admissionRules: ['Приём по записи'],
    equipmentAccess: [],
    patientAge: 'до 18 лет',
    preferentialLimit: '6',
    pairWork: '',
    serviceWindows: [],
    specializationTags: ['дети'],
  },
  {
    id: 'd-004',
    specialties: ['Невролог'],
    site: 'Динамо',
    temporarySites: [],
    admissionRules: ['Приём по записи', 'Первичный приём 40 минут'],
    equipmentAccess: ['Электромиограф'],
    patientAge: 'с 14 лет',
    preferentialLimit: '3',
    pairWork: 'С массажистом по вторникам',
    serviceWindows: [{ what: 'Блокады', when: 'вт, чт до 13:00' }],
    specializationTags: ['боль в спине'],
  },
  {
    id: 'd-005',
    specialties: ['Эндокринолог'],
    site: 'Динамо',
    temporarySites: [],
    admissionRules: ['Приём по записи'],
    equipmentAccess: ['Глюкометр лабораторный'],
    patientAge: 'с 18 лет',
    preferentialLimit: '5',
    pairWork: '',
    serviceWindows: [{ what: 'Школа диабета', when: 'ср 15:00' }],
    specializationTags: ['диабет'],
  },
  {
    id: 'd-006',
    specialties: ['Хирург'],
    site: 'Динамо',
    temporarySites: [],
    admissionRules: ['Приём по записи', 'Перевязки без записи до 10:00'],
    equipmentAccess: ['Хирургический набор'],
    patientAge: 'с 16 лет',
    preferentialLimit: '2',
    pairWork: 'С перевязочной медсестрой',
    serviceWindows: [{ what: 'Перевязки', when: 'ежедневно до 10:00' }],
    specializationTags: ['амбулаторная хирургия'],
  },
  // Ровно одна карточка оставлена незаполненной: счётчик «Незаполненных карточек»
  // обязан считаться по данным, и на полностью заполненном наборе его нечем проверить.
  // Это новый врач — смен у него ещё нет, поэтому в сетке смены он не появляется.
  {
    id: 'd-007',
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
  // Новый врач: смен ещё нет, поэтому в сетке смены колонки у него не будет,
  // а в шаблоне недели видно, что расписание не заведено.
  'd-007': [
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
    [{ start: '00:00', end: '00:00', kind: 'off' }],
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

/**
 * Заявки листа ожидания на стенде. Пустой лист означает, что заявленную MUST HAVE
 * функцию показывают на экране «Заявок нет»: ни очереди, ни подбора слотов,
 * ни разницы между типами заявок увидеть нельзя.
 */
const seedWaitlist = (sysDate) => {
  const at = (days) => addDays(sysDate, days);
  const rows = [
    {
      kind: 'nearest', priority: 'high', patientId: 'p-007', serviceId: 's-002', doctorId: 'd-002', paymentType: 'dms',
      dateFrom: at(0), dateTo: at(3), comment: 'Просит любое окно, готов приехать в течение часа',
      createdBy: 'operator', status: 'open',
    },
    {
      kind: 'distant', priority: 'normal', patientId: 'p-012', serviceId: 's-004', doctorId: null, paymentType: 'regular',
      dateFrom: at(21), dateTo: at(35), comment: 'Хочет УЗИ после отпуска, вторая половина дня',
      createdBy: 'operator', status: 'open',
    },
    {
      kind: 'reschedule', priority: 'high', patientId: 'p-003', serviceId: 's-001', doctorId: 'd-001', paymentType: 'promo',
      dateFrom: at(1), dateTo: at(7), comment: 'Перенос из-за командировки, удобно до 11:00',
      createdBy: 'operator', status: 'open',
    },
    {
      kind: 'from_doctor', priority: 'normal', patientId: 'p-006', serviceId: 's-007', doctorId: 'd-005', paymentType: 'regular',
      dateFrom: at(7), dateTo: at(14), comment: 'Контроль по результатам анализов, назначил врач',
      createdBy: 'doctor', status: 'open',
    },
    {
      kind: 'nearest', priority: 'normal', patientId: 'p-014', serviceId: 's-002', doctorId: 'd-004', paymentType: 'regular',
      dateFrom: at(0), dateTo: at(10), comment: 'Пожилая пациентка, нужен сопровождающий',
      createdBy: 'operator', status: 'open',
    },
    {
      kind: 'from_doctor', priority: 'normal', patientId: 'p-010', serviceId: 's-003', doctorId: 'd-002', paymentType: 'dms',
      dateFrom: at(-5), dateTo: at(-1), comment: 'ЭКГ по назначению кардиолога',
      createdBy: 'doctor', status: 'fulfilled',
    },
  ];
  return rows.map((row, idx) => ({
    id: `W-${String(idx + 1).padStart(4, '0')}`,
    status: row.status,
    kind: row.kind,
    priority: row.priority,
    patientId: row.patientId,
    patientName: null,
    patientPhone: null,
    serviceId: row.serviceId,
    doctorId: row.doctorId,
    dateFrom: row.dateFrom,
    dateTo: row.dateTo,
    comment: row.comment,
    paymentType: row.paymentType,
    insuranceAppointmentId: null,
    createdAt: `${addDays(sysDate, -1 - (idx % 4))}T09:${String(10 + idx * 7).padStart(2, '0')}:00.000Z`,
    createdBy: row.createdBy,
    fulfilledAppointmentId: null,
    fulfilledAt: row.status === 'fulfilled' ? `${addDays(sysDate, -2)}T11:20:00.000Z` : null,
  }));
};

/** Привязать закрытые заявки к реальным записям того же пациента. */
const linkFulfilledWaitlist = (entries, appointments) => entries.map((entry) => {
  if (entry.status !== 'fulfilled') return entry;
  const match = appointments.find((a) => a.patientId === entry.patientId
    && a.start.slice(0, 10) >= entry.dateFrom
    && a.start.slice(0, 10) <= entry.dateTo);
  return match ? { ...entry, fulfilledAppointmentId: match.id } : entry;
});

const buildState = () => {
  const sysDate = today();
  const currentWeekStart = weekStartOf(sysDate);
  // Окно стенда: две недели назад и четыре вперёд. Трёхнедельное окно означало,
  // что сдвиг показа на две недели открывает продукт пустым, а на вопрос
  // «запишите на следующий месяц» отвечать нечем.
  const publishedWeeks = [];
  for (let w = -2; w <= 4; w += 1) publishedWeeks.push(addDays(currentWeekStart, w * 7));
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
  // Закрытая заявка обязана ссылаться на запись, которой она закрыта: иначе в
  // карточке заявки пусто, а «Закрыта записью в расписании» — надпись без опоры.
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
    waitlist: linkFulfilledWaitlist(seedWaitlist(sysDate), demoAppointments),
    waitlistSeq: 6,
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
  tech_break: 'Перерыв',
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

      // Запись ищется РАНЬШЕ перерыва и блокировки. Прежний порядок делал
      // обратное: администратор ставил перерыв на время, где уже стоят люди, и
      // пациенты просто пропадали из сетки, оставаясь в очереди регистратора.
      const pool = [...state.appointments, ...(state.demoAppointments || [])];
      const collision = pool.find((a) => {
        if (a.doctorId !== doc.id) return false;
        if (!ACTIVE_APPOINTMENT_STATUSES.has(a.status)) return false;
        const aStart = new Date(a.start).getTime();
        const aEnd = aStart + a.durationMin * 60000;
        return aStart < slotEndMs && aEnd > slotStartMs;
      });

      if (!collision && covering.kind === 'block') {
        slot.doctors.push({
          id: doc.id,
          name: doc.name,
          busy: true,
          occupancyKind: 'blocked',
          occupancyLabel: 'Блокировка',
        });
        continue;
      }
      if (!collision && covering.kind === 'break') {
        slot.doctors.push({
          id: doc.id,
          name: doc.name,
          busy: true,
          occupancyKind: 'tech_break',
          occupancyLabel: 'Перерыв',
        });
        continue;
      }

      if (collision) {
        const patient = state.patients.find((p) => p.id === collision.patientId);
        slot.doctors.push({
          id: doc.id,
          name: doc.name,
          busy: true,
          appointmentId: collision.id,
          occupancyKind: 'appointment',
          occupancyLabel: patient ? patient.name : 'Запись',
          // Запись стоит на времени, которое администратор закрыл: оператор
          // обязан видеть конфликт, а не чистую занятость.
          conflictWith: covering.kind === 'work' ? null : covering.kind,
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

const saveWeekTemplateInterval = ({ weekStart, doctorId, date, intervals, confirmed }) => {
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

  /**
   * Перед сужением графика считаем, кто под него попадёт. Прежняя версия
   * переписывала день врача целиком и ни разу не смотрела на записи: пациенты
   * оставались в базе, но исчезали из сетки — «записи-призраки» под перерывом.
   */
  const stillWorking = (startMs, endMs) => normalized.intervals.some((iv) => {
    if (iv.kind !== 'work') return false;
    return clinicDateTimeMs(day, iv.start) <= startMs && clinicDateTimeMs(day, iv.end) >= endMs;
  });
  const pool = [...state.appointments, ...(state.demoAppointments || [])];
  const affected = pool.filter((a) => {
    if (a.doctorId !== doctorId) return false;
    if (dateOnly(a.start) !== day) return false;
    if (!ACTIVE_APPOINTMENT_STATUSES.has(a.status)) return false;
    const aStart = new Date(a.start).getTime();
    return !stillWorking(aStart, aStart + a.durationMin * 60000);
  });
  if (affected.length > 0 && !confirmed) {
    return {
      ok: false,
      status: 409,
      error: 'interval_has_appointments',
      affected: affected.map((a) => {
        const patient = state.patients.find((p) => p.id === a.patientId);
        return {
          id: a.id,
          time: a.start.slice(11, 16),
          patientName: patient ? patient.name : 'Пациент',
        };
      }),
      message: `На это время уже записаны пациенты: ${affected.length}`,
    };
  }

  week[doctorId][di] = normalized.intervals.map((iv) => ({ ...iv }));
  return { ok: true, affected: affected.length, templates: buildWeekTemplates(ws) };
};

const clearWeekAppointments = (weekStart) => {
  const dates = new Set();
  for (let i = 0; i < 7; i += 1) dates.add(addDays(weekStart, i));
  const keep = (a) => !dates.has(dateOnly(a.start));
  state.appointments = state.appointments.filter(keep);
  state.demoAppointments = state.demoAppointments.filter(keep);
};

/** Активные записи недели — их считают перед снятием публикации. */
const weekAppointments = (weekStart) => {
  const dates = new Set();
  for (let i = 0; i < 7; i += 1) dates.add(addDays(weekStart, i));
  const pool = [...state.appointments, ...(state.demoAppointments || [])];
  return pool.filter((a) => dates.has(dateOnly(a.start)) && ACTIVE_APPOINTMENT_STATUSES.has(a.status));
};

/**
 * Снятие публикации закрывает неделю для новых записей и НЕ трогает уже
 * созданные. Прежняя версия молча удаляла записи всех статусов, включая
 * завершённые, и повторная публикация их не возвращала: один клик мышью
 * уничтожал смену без вопроса и без возможности отменить.
 */
const unpublishWeek = (weekStartRaw, options) => {
  const weekStart = weekStartOf(weekStartRaw);
  const idx = state.publishedWeeks.indexOf(weekStart);
  if (idx < 0) {
    return { ok: false, status: 409, error: 'week_not_published', message: 'Неделя не опубликована' };
  }
  const affected = weekAppointments(weekStart);
  if (affected.length > 0 && !(options && options.confirmed)) {
    return {
      ok: false,
      status: 409,
      error: 'week_has_appointments',
      affected: affected.length,
      message: `На неделе есть записи: ${affected.length}`,
    };
  }
  state.publishedWeeks.splice(idx, 1);
  return { ok: true, weekStart, affected: affected.length, templates: buildWeekTemplates(weekStart) };
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
  seedDurationFor,
  seedVisitTypeFor,
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
