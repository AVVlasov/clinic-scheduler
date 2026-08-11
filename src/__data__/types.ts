export type AppointmentStatus =
  | 'scheduled'
  | 'arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

/**
 * Статусы, в которых запись реально занимает слот в расписании.
 * `cancelled` и `no_show` слот освобождают: их нельзя перезаписать,
 * но и блокировать соседние слоты они не должны.
 */
export const ACTIVE_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'scheduled',
  'arrived',
  'in_progress',
  'completed',
]

/**
 * Статусы, в которых запись уже завершила свой жизненный цикл:
 * менять её нельзя — ни переносить, ни отменять. `completed` слот
 * по-прежнему занимает, но как исторический факт. Дубликат stubs/api/lifecycle.js,
 * чтобы фронт не тянул Node-модуль; сервер это правило всё равно проверяет.
 */
export const TERMINAL_APPOINTMENT_STATUSES: readonly AppointmentStatus[] = [
  'completed',
  'cancelled',
  'no_show',
]

export const isTerminalAppointmentStatus = (
  status: AppointmentStatus | undefined | null,
): boolean => !!status && TERMINAL_APPOINTMENT_STATUSES.includes(status)

export type PaymentType = 'regular' | 'dms' | 'promo' | 'discount' | 'certificate'

export type VisitType = 'first' | 'repeat'

export interface Resource {
  id: string
  name: string
}

export interface Doctor extends Resource {
  specialty: string
  cabinet: string
}

/**
 * Карточка врача в справочнике администратора: врач из общих справочников плюс поля,
 * которыми площадка управляет сама. Отдельный тип, а не расширение Doctor, потому что
 * остальные АРМы читают короткую запись врача и не должны знать про состав карточки.
 */
export interface DoctorServiceWindow {
  what: string
  when: string
}

export interface DoctorCard extends Doctor {
  specialties: string[]
  site: string
  temporarySites: string[]
  admissionRules: string[]
  equipmentAccess: string[]
  /** Возраст пациента, которого принимает врач (макет ARM-admin). */
  patientAge: string
  /** Лимит льготных приёмов на смену. */
  preferentialLimit: string
  /** Условие работы в паре. */
  pairWork: string
  /** Доступность услуг/ресурсов во времени. */
  serviceWindows: DoctorServiceWindow[]
  /** Теги специализации. */
  specializationTags: string[]
}

export interface DoctorCardList {
  items: DoctorCard[]
}

export interface SaveDoctorCardInput {
  specialties?: string[]
  site?: string
  cabinet?: string
  temporarySites?: string[]
  admissionRules?: string[]
  equipmentAccess?: string[]
  patientAge?: string
  preferentialLimit?: string
  pairWork?: string
  serviceWindows?: DoctorServiceWindow[]
  specializationTags?: string[]
}

/**
 * Режим интервала в шаблоне приёма. Значения — легенда макета ARM-admin:
 * приём по шаблону, блокировка, сокращённый день, отсутствие, нет приёма.
 */
export type WeekTemplateKind = 'work' | 'block' | 'break' | 'absent' | 'off'

export interface WeekTemplateInterval {
  start: string
  end: string
  kind: WeekTemplateKind
}

export interface WeekTemplateDay {
  date: string
  weekday: string
  intervals: WeekTemplateInterval[]
}

export interface WeekTemplateRow {
  doctorId: string
  doctorName: string
  specialty: string
  days: WeekTemplateDay[]
}

export interface WeekTemplates {
  weekStart: string
  weekEnd: string
  days: { date: string; weekday: string }[]
  rows: WeekTemplateRow[]
  published: boolean
}

export interface SaveWeekTemplateIntervalInput {
  weekStart: string
  doctorId: string
  date: string
  intervals: WeekTemplateInterval[]
}

/**
 * Итог публикации недели. Числа считает сервер по шаблонам: на экране их
 * нечем подменить, поэтому «нарезано N слотов на M врачей» — не строка статуса.
 */
export interface PublishWeekResult {
  weekStart: string
  slotsCreated: number
  doctorsAffected: number
  publishedAt: string
}

export type PatientDocumentType = 'passport_rf' | 'birth_cert' | 'foreign'

export interface Patient {
  id: string
  name: string
  phone: string
  birthDate: string
  /** Номер карты / UID для поиска. */
  cardNumber: string
  lastName?: string | null
  firstName?: string | null
  middleName?: string | null
  email?: string | null
  documentType?: PatientDocumentType | null
  documentNumber?: string | null
  consents?: string[]
}

export interface CreatePatientInput {
  lastName: string
  firstName: string
  middleName: string
  birthDate: string
  phone: string
  email?: string
  documentType?: PatientDocumentType | null
  documentNumber?: string
  consents?: string[]
}

export interface PatientList {
  items: Patient[]
}

export interface Service {
  id: string
  name: string
  duration: number
  category: string
  price: number
  /** Врачи с допуском к услуге — матрица компетенций (ФТ 1.5). */
  doctorIds: string[]
  /** Подмножество doctorIds с допуском «с ограничением»: запись возможна с предупреждением. */
  limitedDoctorIds?: string[]
  /** Услуга выполняется на аппарате или в кабинете из справочника оборудования. */
  requiresEquipment?: boolean
}

/** Значение клетки матрицы компетенций «врач × услуга». */
export type CompetencyValue = 'yes' | 'limited' | 'no'

export interface CompetencyMatrix {
  doctors: Array<{ id: string; name: string; specialty: string }>
  services: Array<{ id: string; name: string; category: string }>
  cells: Array<{
    serviceId: string
    values: Array<{ doctorId: string; value: CompetencyValue }>
  }>
}

export interface CompetencyPatchResult {
  serviceId: string
  doctorId: string
  value: CompetencyValue
  matrix: CompetencyMatrix
}

/** Ресурс расписания помимо врача: аппарат или кабинет (ФТ 3.1.1, 3.1.2). */
export interface Equipment {
  id: string
  name: string
  code: string
  kind: 'apparatus' | 'room'
  type: string
  cabinet: string
  hours: { start: string; end: string }
  maintenance: string
  serviceIds: string[]
  serviceNames: string[]
}

export interface EquipmentList {
  items: Equipment[]
}

export type EquipmentSlotState = 'free' | 'booked' | 'repair' | 'closed'

export interface EquipmentSlot {
  time: string
  state: EquipmentSlotState
  label: string | null
  appointmentId?: string
  doctorName?: string | null
  serviceName?: string | null
  isStart?: boolean
}

export interface EquipmentDayItem extends Equipment {
  sharedWith: string[]
  repair: { from: string; to: string; reason: string } | null
  bookedCount: number
  slots: EquipmentSlot[]
}

export interface EquipmentDay {
  date: string
  stepMinutes: number
  startTime: string
  endTime: string
  items: EquipmentDayItem[]
}

/** Правило длительности приёма (ФТ 1.6, 2.1). */
export interface DurationRule {
  id: string
  priority: number
  condition: string
  factor: string
  effectLabel: string
  enabled: boolean
  locked: boolean
  match: {
    serviceCategory?: string
    visitType?: 'first' | 'repeat'
    doctorId?: string
    requiresEquipment?: boolean
    patientAgeFrom?: number
  }
  effect:
    | { kind: 'base' }
    | { kind: 'set'; minutes: number }
    | { kind: 'add'; minutes: number }
}

export interface DurationRuleList {
  items: DurationRule[]
}

export type SlotOccupancyKind =
  | 'appointment'
  | 'blocked'
  | 'tech_break'
  | 'absence'
  | 'holiday'

export type AbsenceReason =
  | 'vacation'
  | 'sick'
  | 'repair'
  | 'conference'
  | 'training'
  | 'tech_break'

export interface SlotResource {
  id: string
  name: string
  busy: boolean
  appointmentId?: string
  /** Причина занятости (ФТ ДМИР12): не только цвет. */
  occupancyKind?: SlotOccupancyKind | null
  /** Текст/подпись второго признака. */
  occupancyLabel?: string | null
}

export interface ScheduleSlot {
  time: string
  doctors: SlotResource[]
}

export interface ScheduleHoliday {
  name: string
}

export interface Schedule {
  date: string
  startTime: string
  endTime: string
  stepMinutes: number
  slots: ScheduleSlot[]
  holiday?: ScheduleHoliday | null
}

export interface Absence {
  id: string
  doctorId: string | null
  equipmentId: string | null
  dateFrom: string
  dateTo: string
  reason: AbsenceReason
  createdAt: string
}

export interface AbsencePreview {
  affectedCount: number
  appointmentIds: string[]
}

export interface CreateAbsenceInput {
  doctorId?: string | null
  equipmentId?: string | null
  dateFrom: string
  dateTo: string
  reason: AbsenceReason
}

export interface CreateAbsenceResult {
  absence: Absence
  affected: Array<{ id: string; status: AppointmentStatus; cancelReason: string | null }>
}

export interface AbsenceAffectedList {
  items: Array<{
    id: string
    status: string
    cancelReason: string | null
    doctorId?: string
    start?: string
    patientId?: string
  }>
}

export type MassCancelHandlingStatus = 'pending' | 'rescheduled'

export interface MassCancelItem {
  id: string
  appointmentId: string
  patientId: string
  patientName: string | null
  patientPhone: string | null
  originalStart: string
  /** Длительность снесённой записи: перезапись резервирует её, а не стандартные 30 минут. */
  durationMin: number
  originalDoctorId: string
  originalDoctorName: string | null
  serviceId: string | null
  /** Статус обработки разбора: pending = «под отмену / нужен перенос». */
  handlingStatus: MassCancelHandlingStatus
  newAppointmentId: string | null
  newStart: string | null
}

export interface MassCancelBatch {
  id: string
  doctorId: string
  doctorName: string | null
  dateFrom: string
  dateTo: string
  reason: string
  createdAt: string
  items: MassCancelItem[]
  pendingCount: number
}

export interface MassCancelPreview {
  affectedCount: number
  patients: Array<{ patientId: string; patientName: string | null; appointmentId: string; start: string }>
}

export interface CreateMassCancelInput {
  doctorId: string
  dateFrom: string
  dateTo: string
  reason?: string
}

export interface MassCancelRescheduleInput {
  doctorId: string
  start: string
  durationMin: number
  serviceId?: string | null
}

export interface MassCancelMatchSlot {
  date: string
  time: string
  doctorId: string
  doctorName: string
}

export interface MassCancelMatches {
  items: MassCancelMatchSlot[]
}

export interface MassCancelExport {
  filename: string
  csv: string
}

export interface AppointmentHistoryEntry {
  from: AppointmentStatus | null
  to: AppointmentStatus
  at: string
  actor: string
}

export interface NextVisit {
  date: string
  serviceId: string
}

export interface Appointment {
  id: string
  doctorId: string
  patientId: string
  start: string
  durationMin: number
  status: AppointmentStatus
  paymentType: PaymentType
  serviceId: string | null
  doctorName: string | null
  doctorCabinet?: string | null
  patientName: string | null
  patientPhone: string | null
  patientBirthDate: string | null
  patientUid: string | null
  complaints: string | null
  diagnosis: string | null
  visitType: VisitType | null
  performedServiceIds: string[]
  recommendations: string[]
  nextVisit: NextVisit | null
  cancelReason?: string | null
  cancelledAt?: string | null
  cancelledBy?: string | null
  operatorComment?: string | null
  paidAmount?: number | null
  paidAt?: string | null
  /** Сотрудник, создавший запись (ФТ 3.8.1). */
  createdByName?: string | null
  /** Подразделение, создавшее запись. */
  createdByUnit?: string | null
  /** Отметка «Запись подтверждена» (ФТ 3.6.6). */
  confirmed?: boolean
  /**
   * Страховочная запись при заявке «улучшение даты» (ФТ С10):
   * не отменяется при создании заявки; ссылка на заявку листа ожидания.
   */
  insuranceForWaitlistId?: string | null
}

export type WaitlistKind = 'from_doctor' | 'distant' | 'reschedule' | 'nearest'

export type WaitlistPriority = 'normal' | 'high'

export type WaitlistStatus = 'open' | 'fulfilled' | 'cancelled'

export interface WaitlistEntry {
  id: string
  kind: WaitlistKind
  status: WaitlistStatus
  priority: WaitlistPriority
  patientId: string
  patientName: string | null
  patientPhone: string | null
  serviceId: string | null
  doctorId: string | null
  dateFrom: string
  dateTo: string
  comment: string
  /** Существующая страховочная запись (улучшение даты) — не отменяется. */
  insuranceAppointmentId: string | null
  createdAt: string
  createdBy: string
  fulfilledAppointmentId: string | null
  fulfilledAt: string | null
}

export interface WaitlistList {
  items: WaitlistEntry[]
  openCount: number
}

export interface CreateWaitlistInput {
  kind: WaitlistKind
  patientId: string
  serviceId?: string | null
  doctorId?: string | null
  dateFrom: string
  dateTo: string
  priority?: WaitlistPriority
  comment?: string
  insuranceAppointmentId?: string | null
  createdBy?: string
}

export interface WaitlistMatchSlot {
  date: string
  time: string
  doctorId: string
  doctorName: string
}

export interface WaitlistMatches {
  items: WaitlistMatchSlot[]
}

export interface AppointmentList {
  items: Appointment[]
  date: string
  doctorId?: string | null
}

export interface DoctorList {
  items: Doctor[]
}

export interface ServiceList {
  items: Service[]
}

export interface CreateAppointmentInput {
  doctorId: string
  patientId: string
  start: string
  durationMin: number
  status?: AppointmentStatus
  paymentType?: PaymentType
  serviceId?: string | null
  complaints?: string
  diagnosis?: string
  visitType?: VisitType
  performedServiceIds?: string[]
  recommendations?: string[]
  nextVisit?: NextVisit | null
  operatorComment?: string | null
  createdByName?: string | null
  createdByUnit?: string | null
}

export interface PayAppointmentInput {
  amount: number
  paymentType?: PaymentType
}

export interface RescheduleAppointmentInput {
  doctorId?: string
  /** Актёр АРМ врача: сервер отклонит PATCH чужой записи. */
  asDoctorId?: string
  start?: string
  durationMin?: number
  status?: AppointmentStatus
  paymentType?: PaymentType
  serviceId?: string | null
  complaints?: string
  diagnosis?: string
  visitType?: VisitType
  performedServiceIds?: string[]
  recommendations?: string[]
  nextVisit?: NextVisit | null
  cancelReason?: string
  cancelledBy?: string
  actor?: string
}

export interface AppointmentHistoryList {
  items: AppointmentHistoryEntry[]
}

export interface CancelAppointmentInput {
  cancelReason: string
  cancelledBy?: string
  actor?: string
}
