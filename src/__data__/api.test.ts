import { getConfigValue } from '@brojs/cli'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, createAppointment, getAppointments, getSchedule, rescheduleAppointment } from './api'
import type { Appointment, CreateAppointmentInput, Schedule } from './types'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

describe('API client', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('разбирает успешный ответ расписания в доменные типы', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
    const schedule: Schedule = {
      date: '2026-08-06',
      startTime: '08:00',
      endTime: '20:00',
      stepMinutes: 30,
      slots: [{
        time: '08:00',
        doctors: [{ id: 'doctor-1', name: 'Иванов Иван Иванович', busy: false }],
      }],
    }
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(schedule), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const result = await getSchedule('2026-08-06')

    expect(result).toEqual(schedule)
    expect(result.slots[0].doctors[0].busy).toBe(false)
    expect(fetchMock).toHaveBeenCalledWith('https://clinic.test/api/schedule/2026-08-06', undefined)
  })

  it('getAppointments передаёт date и сверяет ответ с запросом', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      date: '2026-08-10',
      items: [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    const result = await getAppointments('2026-08-10')
    expect(result.date).toBe('2026-08-10')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://clinic.test/api/appointments?date=2026-08-10',
      undefined,
    )
  })

  it('getAppointments при date_mismatch бросает ApiError', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      date: '2026-08-11',
      items: [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))

    await expect(getAppointments('2026-08-10')).rejects.toMatchObject({
      code: 'date_mismatch',
    })
    await expect(getAppointments('2026-08-10')).rejects.toBeInstanceOf(ApiError)
  })

  it('409 slot_taken: машинный код в code, человеческий текст — в message', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: 'slot_taken',
      message: 'Слот 2030-01-01T09:00 у врача d-001 уже занят (запись a-007)',
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    }))
    const input: CreateAppointmentInput = {
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2030-01-01T09:00:00+03:00',
      durationMin: 30,
    }

    const request = createAppointment(input)

    await expect(request).rejects.toMatchObject({
      status: 409,
      code: 'slot_taken',
      message: 'Слот 2030-01-01T09:00 у врача d-001 уже занят (запись a-007)',
    })
    await expect(request).rejects.toBeInstanceOf(ApiError)
  })

  it('400 validation: код validation отделён от текста', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: 'validation',
      message: 'Поля doctorId, patientId, start и durationMin обязательны',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }))

    const request = createAppointment({
      doctorId: '',
      patientId: '',
      start: '',
      durationMin: 0,
    })

    await expect(request).rejects.toMatchObject({
      status: 400,
      code: 'validation',
      message: 'Поля doctorId, patientId, start и durationMin обязательны',
    })
  })

  it('400 без server-message: возвращает осмысленный message, а не пустоту', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: 'validation',
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    }))

    const request = createAppointment({
      doctorId: '',
      patientId: '',
      start: '',
      durationMin: 0,
    })

    await expect(request).rejects.toBeInstanceOf(ApiError)
    const err = await request.catch((e: unknown) => e)
    expect((err as ApiError).code).toBe('validation')
    expect((err as ApiError).message.length).toBeGreaterThan(0)
  })

  it('network failure: code="network_error", status=0', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api')
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))

    const request = createAppointment({
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2030-01-01T09:00:00+03:00',
      durationMin: 30,
    })

    await expect(request).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    })
    await expect(request).rejects.toBeInstanceOf(ApiError)
  })

  it('PATCH /appointments/:id передаёт и принимает протокол приёма (round-trip)', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api')
    const updated: Appointment = {
      id: 'a-042',
      doctorId: 'd-001',
      patientId: 'p-001',
      start: '2030-04-15T09:00:00+03:00',
      durationMin: 30,
      status: 'completed',
      paymentType: 'promo',
      serviceId: 's-001',
      doctorName: 'Иванова',
      patientName: 'Иванов',
      patientPhone: '+7 900 000-00-00',
      patientBirthDate: '1985-03-12',
      patientUid: 'UID-1',
      complaints: 'Боль в области 38 зуба третьи сутки',
      diagnosis: 'K01.1 Ретенированный зуб',
      visitType: 'first',
      performedServiceIds: ['s-001', 's-003'],
      recommendations: ['Контрольный осмотр через 7 дней'],
      nextVisit: { date: '2030-04-22', serviceId: 's-002' },
    }
    let sentBody: unknown = null
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      sentBody = init?.body
      return new Response(JSON.stringify(updated), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    })

    const result = await rescheduleAppointment('a-042', {
      complaints: 'Боль в области 38 зуба третьи сутки',
      diagnosis: 'K01.1 Ретенированный зуб',
      visitType: 'first',
      performedServiceIds: ['s-001', 's-003'],
      recommendations: ['Контрольный осмотр через 7 дней'],
      nextVisit: { date: '2030-04-22', serviceId: 's-002' },
    })

    expect(result.complaints).toBe('Боль в области 38 зуба третьи сутки')
    expect(result.diagnosis).toBe('K01.1 Ретенированный зуб')
    expect(result.performedServiceIds).toEqual(['s-001', 's-003'])
    expect(result.recommendations).toEqual(['Контрольный осмотр через 7 дней'])

    const parsed = JSON.parse(String(sentBody))
    expect(parsed.complaints).toBe('Боль в области 38 зуба третьи сутки')
    expect(parsed.diagnosis).toBe('K01.1 Ретенированный зуб')
    expect(parsed.visitType).toBe('first')
    expect(parsed.performedServiceIds).toEqual(['s-001', 's-003'])
    expect(parsed.recommendations).toEqual(['Контрольный осмотр через 7 дней'])
    expect(parsed.nextVisit).toEqual({ date: '2030-04-22', serviceId: 's-002' })
  })
})
