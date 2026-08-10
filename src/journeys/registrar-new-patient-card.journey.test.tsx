// СКВОЗНОЙ СЦЕНАРИЙ registrar-new-patient-card — завести карту и записать.
// Мока API нет: живые стабы + клики.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'
import { todayDate, shiftDate, weekStartOf } from '../__data__/dates'

import { apiGet, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean }> }>
}

interface PatientsResponse {
  items: Array<{ id: string; name: string; birthDate: string }>
}

interface AppointmentsResponse {
  date: string
  items: Array<{ id: string; patientId: string }>
}

let server: JourneyServer

const findBookableDate = async (): Promise<{ date: string; doctorId: string; time: string }> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
    for (const slot of schedule.slots) {
      const free = slot.doctors.find((d) => !d.busy)
      if (free) return { date, doctorId: free.id, time: slot.time }
    }
  }
  throw new Error('нет свободного слота')
}

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-10T10:00:00'))
  server = await startJourneyServer()
})

afterEach(async () => {
  await server.close()
  vi.useRealTimers()
})

const renderRegistrar = (date: string) =>
  render(
    <MemoryRouter initialEntries={[armPath('registrar', date)]}>
      <Provider>
        <Dashboard />
      </Provider>
    </MemoryRouter>,
  )

describe('journey registrar-new-patient-card', () => {
  it('поиск по картотеке, заведение карты, запись на смену', async () => {
    const { date, doctorId, time } = await findBookableDate()
    renderRegistrar(date)

    const search = await screen.findByTestId('patient-search', {}, { timeout: 8000 })
    fireEvent.change(within(search).getByTestId('patient-search-input'), {
      target: { value: 'Алексеев' },
    })
    await waitFor(() => {
      expect(within(search).getByTestId('patient-search-hit-p-001')).toBeInTheDocument()
    }, { timeout: 5000 })

    fireEvent.click(within(search).getByTestId('section-new-patient'))
    const form = await screen.findByTestId('patient-card-form', {}, { timeout: 5000 })

    fireEvent.change(within(form).getByTestId('patient-last-name'), { target: { value: 'Козлова' } })
    fireEvent.change(within(form).getByTestId('patient-first-name'), { target: { value: 'Мария' } })
    fireEvent.change(within(form).getByTestId('patient-middle-name'), { target: { value: 'Игоревна' } })
    fireEvent.change(within(form).getByTestId('patient-birth-date'), { target: { value: '1991-04-15' } })
    fireEvent.change(within(form).getByTestId('patient-phone'), { target: { value: '+7 900 777-00-11' } })

    fireEvent.click(within(form).getByTestId('patient-create-submit'))

    await waitFor(() => {
      expect(within(form).getByTestId('patient-card-created')).toBeInTheDocument()
    }, { timeout: 8000 })

    const before = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const bookPanel = within(form).getByTestId('patient-book-panel')

    await waitFor(() => {
      const timeSelect = within(bookPanel).getByTestId('patient-book-time') as HTMLSelectElement
      const values = Array.from(timeSelect.options).map((o) => o.value).filter(Boolean)
      expect(values.length, 'нет свободного времени после заведения карты').toBeGreaterThan(0)
      expect(timeSelect.value).not.toBe('')
    }, { timeout: 10000 })

    const doctorSelect = within(bookPanel).getByTestId('patient-book-doctor') as HTMLSelectElement
    if (Array.from(doctorSelect.options).some((o) => o.value === doctorId)) {
      fireEvent.change(doctorSelect, { target: { value: doctorId } })
      await waitFor(() => {
        const timeSelect = within(bookPanel).getByTestId('patient-book-time') as HTMLSelectElement
        expect(Array.from(timeSelect.options).map((o) => o.value)).toContain(time)
      }, { timeout: 8000 })
      fireEvent.change(within(bookPanel).getByTestId('patient-book-time'), {
        target: { value: time },
      })
    }
    fireEvent.change(within(bookPanel).getByTestId('patient-book-service'), {
      target: { value: 's-001' },
    })

    fireEvent.click(within(bookPanel).getByTestId('patient-book-submit'))

    await waitFor(async () => {
      expect(within(form).getByTestId('patient-book-done')).toBeInTheDocument()
      const after = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
      expect(after.items.length).toBe(before.items.length + 1)
    }, { timeout: 10000 })

    const patients = await apiGet<PatientsResponse>(server, '/patients?q=Козлова')
    expect(patients.items.some((p) => p.name.includes('Козлова'))).toBe(true)
  }, 30000)

  it('сервер не создаёт дубликат по ФИО и дате рождения', async () => {
    const first = await apiPost<{ id: string }>(server, '/patients', {
      lastName: 'Орлов',
      firstName: 'Иван',
      middleName: 'Сергеевич',
      birthDate: '1980-01-01',
      phone: '+7 900 111-22-33',
    })
    expect(first.status).toBe(201)

    const dup = await apiPost<{ error?: string; patient?: { id: string } }>(server, '/patients', {
      lastName: 'Орлов',
      firstName: 'Иван',
      middleName: 'Сергеевич',
      birthDate: '1980-01-01',
      phone: '+7 900 999-88-77',
    })
    expect(dup.status).toBe(409)
    expect(dup.body.error).toBe('duplicate_patient')
    expect(dup.body.patient?.id).toBe(first.body.id)
  })
})
