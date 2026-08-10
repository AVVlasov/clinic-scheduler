import { getConfigValue } from '@brojs/cli'

import type {
  Appointment,
  AppointmentHistoryList,
  AppointmentList,
  CancelAppointmentInput,
  CreateAbsenceInput,
  CreateAbsenceResult,
  CreateAppointmentInput,
  CreatePatientInput,
  AbsenceAffectedList,
  AbsencePreview,
  DoctorCard,
  DoctorCardList,
  DoctorList,
  Patient,
  PatientList,
  PayAppointmentInput,
  PublishWeekResult,
  RescheduleAppointmentInput,
  SaveDoctorCardInput,
  SaveWeekTemplateIntervalInput,
  Schedule,
  ServiceList,
  WaitlistEntry,
  WaitlistList,
  WaitlistMatches,
  WeekTemplates,
  CreateWaitlistInput,
  CreateMassCancelInput,
  MassCancelBatch,
  MassCancelExport,
  MassCancelMatches,
  MassCancelPreview,
  MassCancelRescheduleInput,
} from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly payload?: unknown,
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

    throw new ApiError(message, response.status, code, errorBody)
  }

  if (body === undefined) {
    throw new ApiError('Сервер вернул некорректный ответ', response.status, 'invalid_response')
  }

  return body as T
}

export const getSchedule = (date: string) => request<Schedule>(`/schedule/${encodeURIComponent(date)}`)

export const previewAbsence = (input: { doctorId: string; dateFrom: string; dateTo: string }) => {
  const q = new URLSearchParams({
    doctorId: input.doctorId,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  })
  return request<AbsencePreview>(`/absences/preview?${q.toString()}`)
}

export const createAbsence = (input: CreateAbsenceInput) => request<CreateAbsenceResult>('/absences', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
})

export const getAbsenceAffected = (id: string) =>
  request<AbsenceAffectedList>(`/absences/${encodeURIComponent(id)}/affected`)

export const previewMassCancel = (input: CreateMassCancelInput) =>
  request<MassCancelPreview>('/mass-cancel/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

export const createMassCancel = (input: CreateMassCancelInput) =>
  request<MassCancelBatch>('/mass-cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

export const getMassCancelBatch = (batchId: string, handling?: string) => {
  if (handling) {
    return request<MassCancelBatch>(
      `/mass-cancel/${encodeURIComponent(batchId)}?handling=${encodeURIComponent(handling)}`,
    )
  }
  return request<MassCancelBatch>(`/mass-cancel/${encodeURIComponent(batchId)}`)
}

export const exportMassCancelBatch = (batchId: string) =>
  request<MassCancelExport>(`/mass-cancel/${encodeURIComponent(batchId)}/export`)

export const getMassCancelMatches = (batchId: string, itemId: string) =>
  request<MassCancelMatches>(
    `/mass-cancel/${encodeURIComponent(batchId)}/matches?itemId=${encodeURIComponent(itemId)}`,
  )

export const rescheduleMassCancelItem = (
  batchId: string,
  itemId: string,
  input: MassCancelRescheduleInput,
) => request<{ item: MassCancelBatch['items'][number]; batch: MassCancelBatch }>(
  `/mass-cancel/${encodeURIComponent(batchId)}/items/${encodeURIComponent(itemId)}/reschedule`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  },
)

export const getWaitlist = (params?: { kind?: string; status?: string }) => {
  const q = new URLSearchParams()
  if (params?.kind) q.set('kind', params.kind)
  if (params?.status) q.set('status', params.status)
  const qs = q.toString()
  if (qs) {
    return request<WaitlistList>(`/waitlist?${qs}`)
  }
  return request<WaitlistList>('/waitlist')
}

export const createWaitlist = (input: CreateWaitlistInput) => request<WaitlistEntry>('/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
})

export const copyWaitlist = (id: string) => request<WaitlistEntry>(
  `/waitlist/${encodeURIComponent(id)}/copy`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
)

export const getWaitlistMatches = (id: string) =>
  request<WaitlistMatches>(`/waitlist/${encodeURIComponent(id)}/matches`)

export const fulfillWaitlist = (id: string, appointmentId: string) =>
  request<WaitlistEntry>(`/waitlist/${encodeURIComponent(id)}/fulfill`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ appointmentId }),
  })

export const getAppointments = async (
  date: string,
  doctorId?: string,
): Promise<AppointmentList> => {
  const params = new URLSearchParams({ date })
  if (doctorId) params.set('doctorId', doctorId)
  const result = await request<AppointmentList>(`/appointments?${params.toString()}`)
  if (result.date !== date) {
    throw new ApiError(
      `Сервер вернул записи за ${result.date}, запрошена ${date}`,
      500,
      'date_mismatch',
    )
  }
  if (doctorId && result.doctorId != null && result.doctorId !== doctorId) {
    throw new ApiError(
      `Сервер вернул записи врача ${result.doctorId}, запрошен ${doctorId}`,
      500,
      'doctor_mismatch',
    )
  }
  return result
}

export const getDoctors = () => request<DoctorList>('/doctors')

export const getServices = () => request<ServiceList>('/services')

export const getPatients = (query?: string) => {
  const q = query?.trim()
  if (q) {
    return request<PatientList>(`/patients?q=${encodeURIComponent(q)}`)
  }
  return request<PatientList>('/patients')
}

export const getPatient = (id: string) =>
  request<Patient>(`/patients/${encodeURIComponent(id)}`)

export const getPatientAppointments = (id: string) =>
  request<AppointmentList>(`/patients/${encodeURIComponent(id)}/appointments`)

export const createPatient = (input: CreatePatientInput) => request<Patient>('/patients', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(input),
})

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

export const unpublishWeek = (weekStart: string) => request<WeekTemplates>('/week-templates/unpublish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ weekStart }),
})

export const saveWeekTemplateInterval = (input: SaveWeekTemplateIntervalInput) =>
  request<WeekTemplates>('/week-templates/interval', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
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

export const getAppointment = (id: string) =>
  request<Appointment>(`/appointments/${encodeURIComponent(id)}`)

export const getAppointmentHistory = (id: string) =>
  request<AppointmentHistoryList>(`/appointments/${encodeURIComponent(id)}/history`)

export const cancelAppointment = (id: string, input: CancelAppointmentInput) =>
  rescheduleAppointment(id, {
    status: 'cancelled',
    cancelReason: input.cancelReason,
    cancelledBy: input.cancelledBy ?? 'operator',
    actor: input.actor ?? 'operator',
  })

export const payAppointment = (id: string, input: PayAppointmentInput) =>
  request<Appointment>(`/appointments/${encodeURIComponent(id)}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

export const confirmAppointment = (id: string) =>
  request<Appointment>(`/appointments/${encodeURIComponent(id)}/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })

/** Сброс демо-стенда к исходному состоянию (без перезапуска процесса). */
export const resetDemo = () =>
  request<{ ok: boolean; sysDate: string; publishedWeeks: string[]; demoAppointments: number }>(
    '/demo/reset',
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  )

