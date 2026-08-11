// СКВОЗНОЙ СЦЕНАРИЙ admin-doctor-card —
// заполнить неполную карточку → счётчик незаполненных уменьшается (эффект на сервере).

import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { Dashboard } from '../dashboard'
import { armPath } from '../__data__/urls'

import { apiGet, startJourneyServer, type JourneyServer } from './journey-server'

interface DoctorCardRow {
  id: string
  name: string
  specialty: string
  specialties: string[]
  site: string
}

interface DoctorCardsResponse {
  items: DoctorCardRow[]
}

interface DoctorsResponse {
  items: Array<{ id: string; specialty: string }>
}

let server: JourneyServer

const countIncomplete = (items: DoctorCardRow[]): number =>
  items.filter((c) => c.site.trim().length === 0 || c.specialties.length === 0).length

beforeEach(async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-08-10T10:00:00'))
  server = await startJourneyServer()
})

afterEach(async () => {
  await server.close()
  vi.useRealTimers()
})

describe('journey admin-doctor-card — заполнение карточки уменьшает счётчик', () => {
  it(
    'неполная карточка → специальность и площадка → save → счётчик и GET согласованы',
    async () => {
      const before = await apiGet<DoctorCardsResponse>(server, '/doctor-cards')
      const incompleteBefore = countIncomplete(before.items)
      expect(incompleteBefore).toBeGreaterThan(0)

      const target = before.items.find(
        (c) => c.specialties.length === 0 && c.site.trim().length === 0,
      )
      expect(target, 'нужен врач с пустыми специальностями и площадкой').toBeTruthy()

      const doctorsBefore = await apiGet<DoctorsResponse>(server, '/doctors')
      const doctorRow = doctorsBefore.items.find((d) => d.id === target!.id)
      expect(doctorRow?.specialty === '' || doctorRow?.specialty == null).toBe(true)

      render(
        <MemoryRouter initialEntries={[armPath('admin')]}>
          <Provider>
            <Dashboard />
          </Provider>
        </MemoryRouter>,
      )

      await screen.findByTestId('admin-page', {}, { timeout: 15000 })
      fireEvent.click(await screen.findByTestId('arm-nav-doctors'))
      await screen.findByTestId('doctors-list', {}, { timeout: 15000 })
      await screen.findByTestId(`doctor-item-${target!.id}`, {}, { timeout: 15000 })

      await waitFor(() => {
        expect(screen.getByTestId('incomplete-cards')).toHaveTextContent(String(incompleteBefore))
      }, { timeout: 15000 })

      fireEvent.click(await screen.findByTestId(`doctor-item-${target!.id}`))
      await screen.findByTestId('doctor-card')

      expect(screen.getByTestId('doctor-card-specialty')).toHaveTextContent('Специальность не указана')
      expect(screen.getByTestId('field-specialties')).toHaveTextContent(
        'Первая в списке — основная',
      )

      fireEvent.change(screen.getByTestId('field-specialties-input'), {
        target: { value: 'Хирург' },
      })
      fireEvent.click(screen.getByTestId('field-specialties-add'))
      fireEvent.change(screen.getByTestId('field-site'), {
        target: { value: 'Площадка на Ленина, 15' },
      })
      fireEvent.click(screen.getByTestId('doctor-save'))

      await waitFor(() => {
        expect(screen.getByTestId('incomplete-cards')).toHaveTextContent(
          String(incompleteBefore - 1),
        )
      }, { timeout: 15000 })

      const after = await apiGet<DoctorCardsResponse>(server, '/doctor-cards')
      const saved = after.items.find((c) => c.id === target!.id)
      expect(saved?.specialties).toEqual(['Хирург'])
      expect(saved?.site).toBe('Площадка на Ленина, 15')
      expect(countIncomplete(after.items)).toBe(incompleteBefore - 1)

      const doctorsAfter = await apiGet<DoctorsResponse>(server, '/doctors')
      expect(doctorsAfter.items.find((d) => d.id === target!.id)?.specialty).toBe('Хирург')
    },
    30000,
  )
})
