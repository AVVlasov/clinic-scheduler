// Талон печатается, а не только показывается: печать браузера, печатная
// разметка и полный состав бланка.

import React from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../../theme'
import type { Appointment, Doctor, Service } from '../../__data__/types'

import { TicketPrint, ticketNumber } from './ticket-print'

const VISIT: Appointment = {
  id: 'a-013',
  doctorId: 'd-002',
  patientId: 'p-001',
  start: '2026-08-10T11:30:00+03:00',
  durationMin: 30,
  status: 'scheduled',
  paymentType: 'dms',
  serviceId: 's-003',
  doctorName: 'Петров Андрей Викторович',
  doctorCabinet: '305',
  patientName: 'Алексеев Игорь Николаевич',
  patientPhone: '+7 900 100-00-01',
  patientBirthDate: '1985-03-12',
  patientUid: 'UID 0001 1234',
  complaints: null,
  diagnosis: null,
  visitType: null,
  performedServiceIds: [],
  recommendations: [],
  nextVisit: null,
}

const DOCTOR: Doctor = {
  id: 'd-002',
  name: 'Петров Андрей Викторович',
  specialty: 'Кардиолог',
  cabinet: '305',
}

const SERVICE: Service = {
  id: 's-003',
  name: 'ЭКГ',
  duration: 15,
  category: 'Диагностика',
  price: 1200,
  doctorIds: ['d-002'],
}

const renderTicket = (onClose = vi.fn()) => render(
  <Provider>
    <TicketPrint visit={VISIT} doctor={DOCTOR} service={SERVICE} site="Динамо" onClose={onClose} />
  </Provider>,
)

let printSpy: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  printSpy = vi.spyOn(window, 'print').mockImplementation(() => undefined)
})

afterEach(() => {
  printSpy.mockRestore()
})

describe('TicketPrint', () => {
  it('кнопка печати вызывает печать браузера', () => {
    renderTicket()

    fireEvent.click(screen.getByTestId('ticket-print-button'))

    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('на бланке есть печатная разметка @media print', () => {
    renderTicket()

    const styles = screen.getByTestId('ticket-print-styles')
    expect(styles.textContent).toContain('@media print')
    expect(styles.textContent).toContain('data-print-sheet')
  })

  it('состав бланка: пациент, дата и время приёма, врач, услуга, кабинет, площадка и номер', () => {
    renderTicket()

    const sheet = screen.getByTestId('ticket-print-sheet')
    expect(within(sheet).getByTestId('ticket-patient')).toHaveTextContent('Алексеев Игорь Николаевич')
    expect(within(sheet).getByTestId('ticket-date')).toHaveTextContent('10.08.2026')
    expect(within(sheet).getByTestId('ticket-time')).toHaveTextContent('11:30')
    expect(within(sheet).getByTestId('ticket-doctor')).toHaveTextContent('Петров Андрей Викторович')
    expect(within(sheet).getByTestId('ticket-service')).toHaveTextContent('ЭКГ')
    expect(within(sheet).getByTestId('ticket-cabinet')).toHaveTextContent('305')
    expect(within(sheet).getByTestId('ticket-site')).toHaveTextContent('Динамо')
    expect(within(sheet).getByTestId('ticket-number')).toHaveTextContent('0013')
  })

  it('на бланке нет ни ISO-даты, ни внутреннего идентификатора записи', () => {
    renderTicket()

    const text = screen.getByTestId('ticket-print-sheet').textContent ?? ''
    expect(text).not.toContain('a-013')
    expect(text).not.toContain('d-002')
    expect(text).not.toContain('s-003')
    expect(text).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('кнопка «Закрыть» закрывает бланк и не печатает', () => {
    const onClose = vi.fn()
    renderTicket(onClose)

    fireEvent.click(screen.getByTestId('ticket-print-close'))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(printSpy).not.toHaveBeenCalled()
  })

  it('номер талона берётся из номера записи, а не из её идентификатора', () => {
    expect(ticketNumber('a-013')).toBe('0013')
    expect(ticketNumber('a-1234')).toBe('1234')
    expect(ticketNumber('без-цифр')).toBe('—')
  })
})
