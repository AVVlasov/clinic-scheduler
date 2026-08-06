import { getConfigValue } from '@brojs/cli'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, createAppointment, getSchedule } from './api'
import type { CreateAppointmentInput, Schedule } from './types'

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

  it('преобразует конфликт занятого слота в понятную ApiError', async () => {
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api')
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      error: 'slot_taken',
    }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' },
    }))
    const input: CreateAppointmentInput = {
      doctorId: 'doctor-1',
      patientId: 'patient-1',
      start: '2026-08-06T08:00:00+03:00',
      durationMin: 30,
    }

    const request = createAppointment(input)

    await expect(request).rejects.toMatchObject({
      status: 409,
      code: 'slot_taken',
      message: 'Выбранный слот уже занят',
    })
    await expect(request).rejects.toBeInstanceOf(ApiError)
  })
})
