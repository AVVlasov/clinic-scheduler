// Карта заводится и иностранцу: отчество не обязательно, а телефон и дата
// рождения проверяются до отправки в картотеку.

import React from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../__data__/api', () => ({
  createPatient: vi.fn(),
  createAppointment: vi.fn(),
  getSchedule: vi.fn(),
  ApiError: class ApiError extends Error {
    constructor(message: string, public readonly status: number, public readonly code: string) {
      super(message)
      this.name = 'ApiError'
    }
  },
}))

import { createPatient, getSchedule } from '../../__data__/api'
import { Provider } from '../../theme'
import type { Doctor, Patient, Service } from '../../__data__/types'

import { PatientCardForm, validatePatientFields } from './patient-card-form'

const SHIFT_DATE = '2026-08-10'

const DOCTORS: Doctor[] = [
  { id: 'd-001', name: 'Иванова Елена Сергеевна', specialty: 'Терапевт', cabinet: '201' },
]

const SERVICES: Service[] = [
  { id: 's-001', name: 'Первичная консультация', duration: 30, category: 'Приём', price: 2500, doctorIds: ['d-001'] },
]

const mockedCreatePatient = vi.mocked(createPatient)
const mockedGetSchedule = vi.mocked(getSchedule)

const renderForm = () => render(
  <Provider>
    <PatientCardForm
      doctors={DOCTORS}
      services={SERVICES}
      durationRules={[]}
      selectedDate={SHIFT_DATE}
      onCreated={vi.fn()}
      onOpenExisting={vi.fn()}
      onCancel={vi.fn()}
    />
  </Provider>,
)

const fill = (form: HTMLElement, values: Record<string, string>) => {
  for (const [testId, value] of Object.entries(values)) {
    fireEvent.change(within(form).getByTestId(testId), { target: { value } })
  }
}

const CREATED: Patient = {
  id: 'p-100',
  name: 'Нгуен Ань',
  phone: '+7 900 777-00-11',
  birthDate: '1991-04-15',
  cardNumber: 'UID 0100 9100',
}

beforeEach(() => {
  vi.clearAllMocks()
  mockedGetSchedule.mockResolvedValue({ date: SHIFT_DATE, stepMinutes: 15, slots: [] })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('Карта заводится без отчества', () => {
  it('форма отправляет карту с пустым отчеством и не требует его', async () => {
    mockedCreatePatient.mockResolvedValue(CREATED)

    const form = renderForm().getByTestId('patient-card-form')
    fill(form, {
      'patient-last-name': 'Нгуен',
      'patient-first-name': 'Ань',
      'patient-birth-date': '1991-04-15',
      'patient-phone': '+7 900 777-00-11',
    })

    fireEvent.click(within(form).getByTestId('patient-create-submit'))

    await waitFor(() => {
      expect(mockedCreatePatient).toHaveBeenCalledTimes(1)
    })
    expect(mockedCreatePatient.mock.calls[0][0]).toMatchObject({
      lastName: 'Нгуен',
      firstName: 'Ань',
      middleName: '',
    })
    expect(await screen.findByTestId('patient-card-created')).toHaveTextContent('Нгуен Ань')
  })

  it('у поля «Отчество» нет звёздочки обязательности', () => {
    const { container } = renderForm()
    const middleInput = screen.getByTestId('patient-middle-name')
    const field = middleInput.closest('div')
    expect(field?.textContent).toContain('Отчество')
    expect(field?.textContent).not.toContain('*')
    // Контрольная точка: у фамилии звёздочка на месте.
    const lastNameField = screen.getByTestId('patient-last-name').closest('div')
    expect(lastNameField?.textContent).toContain('*')
    expect(container).toBeTruthy()
  })
})

describe('Телефон и дата рождения проверяются', () => {
  it('телефон «123» не уходит на сервер, ошибка стоит рядом с полем', async () => {
    mockedCreatePatient.mockResolvedValue(CREATED)

    const form = renderForm().getByTestId('patient-card-form')
    fill(form, {
      'patient-last-name': 'Козлова',
      'patient-first-name': 'Мария',
      'patient-birth-date': '1991-04-15',
      'patient-phone': '123',
    })

    fireEvent.click(within(form).getByTestId('patient-create-submit'))

    await waitFor(() => {
      expect(within(form).getByTestId('patient-error-phone')).toHaveTextContent('Телефон из 11 цифр')
    })
    expect(mockedCreatePatient).not.toHaveBeenCalled()
  })

  it('год рождения из будущего не сохраняется', async () => {
    mockedCreatePatient.mockResolvedValue(CREATED)

    const form = renderForm().getByTestId('patient-card-form')
    fill(form, {
      'patient-last-name': 'Козлова',
      'patient-first-name': 'Мария',
      'patient-birth-date': '2099-04-15',
      'patient-phone': '+7 900 777-00-11',
    })

    fireEvent.click(within(form).getByTestId('patient-create-submit'))

    await waitFor(() => {
      expect(within(form).getByTestId('patient-error-birth-date'))
        .toHaveTextContent('Дата рождения не может быть в будущем')
    })
    expect(mockedCreatePatient).not.toHaveBeenCalled()
  })

  it('исправленные поля пропускают карту дальше', async () => {
    mockedCreatePatient.mockResolvedValue(CREATED)

    const form = renderForm().getByTestId('patient-card-form')
    fill(form, {
      'patient-last-name': 'Козлова',
      'patient-first-name': 'Мария',
      'patient-birth-date': '2099-04-15',
      'patient-phone': '123',
    })
    fireEvent.click(within(form).getByTestId('patient-create-submit'))
    await waitFor(() => {
      expect(within(form).getByTestId('patient-error-phone')).toBeInTheDocument()
    })

    fill(form, {
      'patient-birth-date': '1991-04-15',
      'patient-phone': '+7 900 777-00-11',
    })
    fireEvent.click(within(form).getByTestId('patient-create-submit'))

    await waitFor(() => {
      expect(mockedCreatePatient).toHaveBeenCalledTimes(1)
    })
  })
})

describe('validatePatientFields — правила без экрана', () => {
  const valid = {
    lastName: 'Козлова',
    firstName: 'Мария',
    birthDate: '1991-04-15',
    phone: '+7 900 777-00-11',
  }

  it('корректные данные ошибок не дают', () => {
    expect(validatePatientFields(valid, SHIFT_DATE)).toEqual({})
  })

  it('отчество в правилах не участвует', () => {
    expect(validatePatientFields({ ...valid }, SHIFT_DATE)).toEqual({})
  })

  it('«123» — не телефон, 2099 — не дата рождения', () => {
    const errors = validatePatientFields({ ...valid, phone: '123', birthDate: '2099-01-01' }, SHIFT_DATE)
    expect(errors.phone).toBe('Телефон из 11 цифр, например +7 900 000-00-00')
    expect(errors.birthDate).toBe('Дата рождения не может быть в будущем')
  })

  it('«сегодня» берётся из даты смены, а не из системных часов', () => {
    expect(validatePatientFields({ ...valid, birthDate: '2026-08-11' }, '2026-08-10').birthDate)
      .toBe('Дата рождения не может быть в будущем')
    expect(validatePatientFields({ ...valid, birthDate: '2026-08-11' }, '2026-08-12').birthDate)
      .toBeUndefined()
  })
})
