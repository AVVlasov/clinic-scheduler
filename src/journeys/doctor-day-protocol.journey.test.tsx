// Сквозной сценарий: врач ведёт день scheduled → arrived → in_progress → completed.

import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { URLs } from '../__data__/urls'
import { todayDate, shiftDate, weekStartOf, withArmDate } from '../__data__/dates'

import { apiGet, apiPatch, apiPost, startJourneyServer, type JourneyServer } from './journey-server'

interface AppointmentsResponse {
  date: string
  items: Array<{ id: string; doctorId: string; start: string; status: string; serviceId: string | null }>
}

interface ServicesResponse {
  items: Array<{ id: string; name: string; doctorIds: string[] }>
}

interface WaitlistResponse {
  items: Array<{ id: string; kind: string; serviceId: string | null; dateFrom: string }>
  openCount: number
}

interface ScheduleResponse {
  date: string
  slots: Array<{ time: string; doctors: Array<{ id: string; busy: boolean }> }>
}

let server: JourneyServer

const findDoctorWithScheduled = async (): Promise<{ date: string; doctorId: string; appointmentId: string }> => {
  const start = weekStartOf(todayDate())
  for (let i = 0; i < 14; i += 1) {
    const date = shiftDate(start, i)
    const list = await apiGet<AppointmentsResponse>(server, `/appointments?date=${date}`)
    const scheduled = list.items.find((a) => a.status === 'scheduled')
    if (scheduled) {
      return { date, doctorId: scheduled.doctorId, appointmentId: scheduled.id }
    }
  }
  // создаём запись, если в демо нет scheduled
  const date = todayDate()
  const schedule = await apiGet<ScheduleResponse>(server, `/schedule/${date}`)
  const free = schedule.slots
    .flatMap((s) => s.doctors.filter((d) => !d.busy).map((d) => ({ time: s.time, doctorId: d.id })))[0]
  if (!free) throw new Error('нет свободного слота для создания записи врача')
  const created = await apiPost<{ id: string; doctorId: string; status: string }>(server, '/appointments', {
    doctorId: free.doctorId,
    patientId: 'p-001',
    start: `${date}T${free.time}:00+03:00`,
    durationMin: 30,
    serviceId: 's-001',
  })
  expect(created.status).toBe(201)
  return { date, doctorId: created.body.doctorId, appointmentId: created.body.id }
}

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-10T10:00:00'))
  server = await startJourneyServer()
})

afterEach(async () => {
  // Экран опрашивает сервер каждые три секунды. Автоочистка @testing-library
  // зарегистрирована раньше и сработает уже после этого хука, поэтому гасим
  // разметку сами: иначе `server.close()` ждёт живых соединений до таймаута хука.
  cleanup()
  await server.close()
  vi.useRealTimers()
})

describe('journey doctor-day-protocol — цепочка статусов врача', () => {
  it('врач проходит scheduled → arrived → in_progress → completed без ухода с экрана', async () => {
    const target = await findDoctorWithScheduled()

    render(
      <MemoryRouter initialEntries={[withArmDate(URLs.arms.doctor, target.date, target.doctorId)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('doctor-page', {}, { timeout: 5000 })

    // экран открывается на рабочей записи, а не на терминальной первой попавшейся
    await waitFor(() => {
      const badge = screen.getByTestId('visit-status-badge')
      expect(['Ожидает', 'Пришёл', 'На приёме']).toContain(badge.textContent)
    })

    fireEvent.click(screen.getByTestId(`day-visit-${target.appointmentId}`))

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Ожидает')
    })

    fireEvent.click(screen.getByTestId('visit-advance-status'))
    await waitFor(async () => {
      const appt = await apiGet<{ status: string }>(server, `/appointments/${target.appointmentId}`)
      expect(appt.status).toBe('arrived')
    })

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Пришёл')
    })

    fireEvent.click(screen.getByTestId('visit-advance-status'))
    await waitFor(async () => {
      const appt = await apiGet<{ status: string }>(server, `/appointments/${target.appointmentId}`)
      expect(appt.status).toBe('in_progress')
    })

    fireEvent.change(screen.getByTestId('visit-complaints'), {
      target: { value: 'Боль в горле' },
    })
    fireEvent.change(screen.getByTestId('visit-diagnosis'), {
      target: { value: 'J02 Острый фарингит' },
    })

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    await waitFor(() => expect(finish.disabled).toBe(false))
    fireEvent.click(finish)
    fireEvent.click(await screen.findByTestId('visit-finish-confirm-yes'))

    await waitFor(async () => {
      const appt = await apiGet<{ status: string }>(server, `/appointments/${target.appointmentId}`)
      expect(appt.status).toBe('completed')
    }, { timeout: 5000 })

    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Завершён')
    })
  })

  it('услуга приёма видна врачу и в списке дня, и в шапке карточки', async () => {
    const target = await findDoctorWithScheduled()
    const services = await apiGet<ServicesResponse>(server, '/services')
    const list = await apiGet<AppointmentsResponse>(
      server,
      `/appointments?date=${target.date}&doctorId=${target.doctorId}`,
    )
    const appointment = list.items.find((a) => a.id === target.appointmentId)
    if (!appointment) throw new Error('запись врача пропала из выборки дня')
    const expectedName = appointment.serviceId
      ? services.items.find((s) => s.id === appointment.serviceId)?.name ?? 'Услуга не указана'
      : 'Услуга не указана'

    render(
      <MemoryRouter initialEntries={[withArmDate(URLs.arms.doctor, target.date, target.doctorId)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('doctor-page', {}, { timeout: 5000 })

    const row = await screen.findByTestId(`day-visit-service-${target.appointmentId}`)
    expect(row.textContent).toContain(expectedName)
    // дата у всех строк дня одна — она не может быть подписью записи
    expect(row.textContent).not.toContain(target.date)

    fireEvent.click(screen.getByTestId(`day-visit-${target.appointmentId}`))
    await waitFor(() => {
      expect(screen.getByTestId('visit-service').textContent).toBe(expectedName)
    })
  })

  it('услугу вне допуска врача не предлагает экран и не принимает сервер', async () => {
    const target = await findDoctorWithScheduled()
    const services = await apiGet<ServicesResponse>(server, '/services')
    const foreign = services.items.find(
      (s) => s.doctorIds.length > 0 && !s.doctorIds.includes(target.doctorId),
    )
    if (!foreign) throw new Error('в справочнике нет услуги вне допуска этого врача')
    const allowed = services.items.find((s) => s.doctorIds.includes(target.doctorId))
    if (!allowed) throw new Error('у врача нет ни одной допущенной услуги')

    render(
      <MemoryRouter initialEntries={[withArmDate(URLs.arms.doctor, target.date, target.doctorId)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('doctor-page', {}, { timeout: 5000 })
    fireEvent.click(screen.getByTestId(`day-visit-${target.appointmentId}`))

    await screen.findByTestId(`visit-service-${allowed.id}`)
    expect(screen.queryByTestId(`visit-service-${foreign.id}`)).toBeNull()

    // и это не только про экран: тем же запросом, что шлёт АРМ врача, сервер отказывает
    const arrived = await apiPatch(server, `/appointments/${target.appointmentId}`, {
      status: 'arrived', asDoctorId: target.doctorId, actor: 'doctor',
    })
    expect(arrived.status).toBe(200)
    const inProgress = await apiPatch(server, `/appointments/${target.appointmentId}`, {
      status: 'in_progress', asDoctorId: target.doctorId, actor: 'doctor',
    })
    expect(inProgress.status).toBe(200)

    const rejected = await apiPatch<{ error: string }>(
      server,
      `/appointments/${target.appointmentId}`,
      {
        status: 'completed',
        asDoctorId: target.doctorId,
        actor: 'doctor',
        complaints: 'Боль в горле',
        diagnosis: 'J02 Острый фарингит',
        performedServiceIds: [foreign.id],
      },
    )
    expect(rejected.status).toBe(409)
    expect(rejected.body.error).toBe('service_not_offered')

    const untouched = await apiGet<{ status: string; performedServiceIds: string[] }>(
      server,
      `/appointments/${target.appointmentId}`,
    )
    expect(untouched.status).toBe('in_progress')
    expect(untouched.performedServiceIds).not.toContain(foreign.id)

    const accepted = await apiPatch(server, `/appointments/${target.appointmentId}`, {
      status: 'completed',
      asDoctorId: target.doctorId,
      actor: 'doctor',
      complaints: 'Боль в горле',
      diagnosis: 'J02 Острый фарингит',
      performedServiceIds: [allowed.id],
    })
    expect(accepted.status).toBe(200)
  })

  it('заявка на повторный визит доходит до сервера, и врач видит подтверждение', async () => {
    const target = await findDoctorWithScheduled()
    const before = await apiGet<WaitlistResponse>(server, '/waitlist?kind=from_doctor')
    const nextVisitDate = shiftDate(target.date, 14)

    render(
      <MemoryRouter initialEntries={[withArmDate(URLs.arms.doctor, target.date, target.doctorId)]}>
        <Provider>
          <Dashboard />
        </Provider>
      </MemoryRouter>,
    )

    await screen.findByTestId('doctor-page', {}, { timeout: 5000 })
    fireEvent.click(screen.getByTestId(`day-visit-${target.appointmentId}`))
    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Ожидает')
    })

    fireEvent.click(screen.getByTestId('visit-advance-status'))
    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('Пришёл')
    })
    fireEvent.click(screen.getByTestId('visit-advance-status'))
    await waitFor(() => {
      expect(screen.getByTestId('visit-status-badge').textContent).toBe('На приёме')
    })

    fireEvent.change(screen.getByTestId('visit-complaints'), { target: { value: 'Боль в горле' } })
    fireEvent.change(screen.getByTestId('visit-diagnosis'), { target: { value: 'J02 Острый фарингит' } })

    // услуга повторного визита берётся из того же списка допуска, что видит врач
    const nextService = screen.getByTestId('visit-next-service') as HTMLSelectElement
    const option = Array.from(nextService.options).find((o) => o.value !== '')
    if (!option) throw new Error('в списке услуг повторного визита нет ни одной позиции')
    fireEvent.change(nextService, { target: { value: option.value } })
    fireEvent.change(screen.getByTestId('visit-next-date'), { target: { value: nextVisitDate } })

    const finish = screen.getByTestId('visit-finish') as HTMLButtonElement
    await waitFor(() => expect(finish.disabled).toBe(false))
    fireEvent.click(finish)
    fireEvent.click(await screen.findByTestId('visit-finish-confirm-yes'))

    const created = await screen.findByTestId('visit-followup-created', {}, { timeout: 5000 })
    expect(created.textContent).toContain(option.textContent ?? '')
    expect(created.textContent).not.toContain(nextVisitDate)

    const after = await apiGet<WaitlistResponse>(server, '/waitlist?kind=from_doctor')
    expect(after.items.length).toBe(before.items.length + 1)
    const fresh = after.items.find((w) => !before.items.some((b) => b.id === w.id))
    expect(fresh?.serviceId).toBe(option.value)
    expect(fresh?.dateFrom).toBe(nextVisitDate)
  })
})
