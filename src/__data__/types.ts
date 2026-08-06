export type AppointmentStatus = 'scheduled' | 'arrived' | 'in_progress' | 'completed' | 'no_show'

export type PaymentType = 'cash' | 'card' | 'insurance'

export interface Resource {
  id: string
  name: string
  type: 'doctor'
}

export interface Doctor extends Resource {
  type: 'doctor'
  specialty: string
  cabinet: string
}

export interface Patient {
  id: string
  name: string
  phone: string
  birthDate: string
}

export interface Service {
  id: string
  name: string
  duration: number
  category: string
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
}

export interface RescheduleAppointmentInput {
  doctorId?: string
  start?: string
  durationMin?: number
  status?: AppointmentStatus
  paymentType?: PaymentType
  serviceId?: string | null
}
