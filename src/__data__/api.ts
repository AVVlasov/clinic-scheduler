import { getConfigValue } from '@brojs/cli'

import type {
  Appointment,
  AppointmentList,
  CreateAppointmentInput,
  DoctorCard,
  DoctorCardList,
  DoctorList,
  PatientList,
  PublishWeekResult,
  RescheduleAppointmentInput,
  SaveDoctorCardInput,
  Schedule,
  ServiceList,
  WeekTemplates,
} from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const getApiBaseUrl = () => getConfigValue('clinic-scheduler.api').replace(/\/$/, '')

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  let response: Response

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, init)
  } catch {
    throw new ApiError('Не удалось подключиться к серверу', 0, 'network_error')
  }

  const body: unknown = await response.json().catch(() => undefined)

  if (!response.ok) {
    const errorBody = body && typeof body === 'object' ? body as Record<string, unknown> : {}
    const code = typeof errorBody.error === 'string' ? errorBody.error : 'request_failed'
    const serverMessage = typeof errorBody.message === 'string' ? errorBody.message : undefined

    let message = serverMessage
    if (!message) {
      if (response.status === 409 && code === 'slot_taken') {
        message = 'Выбранный слот уже занят'
      } else if (response.status === 400) {
        message = 'Проверьте корректность данных'
      } else if (response.status === 404) {
        message = 'Не найдено'
      } else {
        message = 'Не удалось выполнить запрос'
      }
    }

    throw new ApiError(message, response.status, code)
  }

  if (body === undefined) {
    throw new ApiError('Сервер вернул некорректный ответ', response.status, 'invalid_response')
  }

  return body as T
}

export const getSchedule = (date: string) => request<Schedule>(`/schedule/${encodeURIComponent(date)}`)

export const getAppointments = () => request<AppointmentList>('/appointments')

export const getDoctors = () => request<DoctorList>('/doctors')

export const getServices = () => request<ServiceList>('/services')

export const getPatients = () => request<PatientList>('/patients')

export const getDoctorCards = () => request<DoctorCardList>('/doctor-cards')

export const saveDoctorCard = (id: string, input: SaveDoctorCardInput) => request<DoctorCard>(
  `/doctor-cards/${encodeURIComponent(id)}`,
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  },
)

export const getWeekTemplates = (weekStart: string) => request<WeekTemplates>(
  `/week-templates?weekStart=${encodeURIComponent(weekStart)}`,
)

export const publishWeek = (weekStart: string) => request<PublishWeekResult>('/week-templates/publish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ weekStart }),
})

export const createAppointment = (input: CreateAppointmentInput) => request<Appointment>('/appointments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
})

export const rescheduleAppointment = (id: string, input: RescheduleAppointmentInput) => request<Appointment>(
  `/appointments/${encodeURIComponent(id)}`,
  {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  },
)