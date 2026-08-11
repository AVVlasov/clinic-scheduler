import React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { getConfigValue } from '@brojs/cli'

import { Provider } from '../../theme'
import { AbsenceDialog } from './absence-dialog'
import type { Doctor } from '../../__data__/types'

vi.mock('@brojs/cli', () => ({
  getConfigValue: vi.fn(),
}))

const mockedGetConfigValue = vi.mocked(getConfigValue)

const doctors: Doctor[] = [
  { id: 'd-001', name: 'Иванова Е.С.', specialty: 'Терапевт', cabinet: '201' },
  { id: 'd-002', name: 'Петров А.В.', specialty: 'Кардиолог', cabinet: '305' },
]

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))

describe('AbsenceDialog — превью и необратимое подтверждение', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    mockedGetConfigValue.mockReturnValue('https://clinic.test/api/')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('показывает число записей под отмену и требует второе нажатие', async () => {
    const onApplied = vi.fn()
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock.mockImplementation((input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      const method = init?.method ?? 'GET'
      if (url.includes('/absences/preview')) {
        return json({ affectedCount: 3, appointmentIds: ['a-1', 'a-2', 'a-3'] })
      }
      if (url.includes('/absences') && method === 'POST') {
        return json({
          absence: {
            id: 'abs-001',
            doctorId: 'd-001',
            equipmentId: null,
            dateFrom: '2026-08-10',
            dateTo: '2026-08-12',
            reason: 'vacation',
            createdAt: '2026-08-10T10:00:00.000Z',
          },
          affected: [
            { id: 'a-1', status: 'cancelled', cancelReason: 'Отсутствие: Отпуск' },
            { id: 'a-2', status: 'cancelled', cancelReason: 'Отсутствие: Отпуск' },
            { id: 'a-3', status: 'cancelled', cancelReason: 'Отсутствие: Отпуск' },
          ],
        }, 201)
      }
      return json({ error: 'not_found' }, 404)
    })

    render(
      <Provider>
        <AbsenceDialog
          open
          doctors={doctors}
          onClose={() => undefined}
          onApplied={onApplied}
        />
      </Provider>,
    )

    const dialog = screen.getByTestId('absence-dialog')
    fireEvent.change(within(dialog).getByTestId('absence-date-from'), { target: { value: '2026-08-10' } })
    fireEvent.change(within(dialog).getByTestId('absence-date-to'), { target: { value: '2026-08-12' } })

    await waitFor(() => {
      expect(within(dialog).getByTestId('absence-preview')).toHaveTextContent('3')
    })

    fireEvent.click(within(dialog).getByTestId('absence-apply'))
    expect(onApplied).not.toHaveBeenCalled()
    expect(within(dialog).getByTestId('absence-apply')).toHaveTextContent(/Да, отменить записи/)

    fireEvent.click(within(dialog).getByTestId('absence-apply'))
    await waitFor(() => {
      expect(onApplied).toHaveBeenCalledWith({ absenceId: 'abs-001', affectedCount: 3 })
    })
  })
})
