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

export type PaymentType = 'cash' | 'card' | 'insurance'

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
export interface DoctorCard extends Doctor {
  specialties: string[]
  site: string
  temporarySites: string[]
  admissionRules: string[]
  equipmentAccess: string[]
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

export interface Patient {
  id: string
  name: string
  phone: string
  birthDate: string
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
}

export interface SlotResource {
  id: string
  name: string
  busy: boolean
  appointmentId?: string
}

export interface ScheduleSlot {
  time: string
  doctors: SlotResource[]
}

export interface Schedule {
  date: string
  startTime: string
  endTime: string
  stepMinutes: number
  slots: ScheduleSlot[]
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
  patientName: string | null
  patientPhone: string | null
  patientBirthDate: string | null
  patientUid: string | null
  complaints: string | null
  diagnosis: string | null
  visitType: VisitType | null
  performedServiceIds: string[]
  recommendations: string[]
  nextVisit: string | null
}

export interface AppointmentList {
  items: Appointment[]
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
  nextVisit?: string
}

export interface RescheduleAppointmentInput {
  doctorId?: string
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
  nextVisit?: string
}
