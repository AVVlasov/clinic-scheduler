import React, { useEffect, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import { getPatientAppointments } from '../../__data__/api'
import { appointmentStatusLabel } from '../../__data__/status-labels'
import type { Appointment, Patient } from '../../__data__/types'

interface PatientCardViewProps {
  patient: Patient
  onBack: () => void
  onCreateNew: () => void
}

/** ГГГГ-ММ-ДД → ДД.ММ.ГГГГ. */
const formatBirth = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

const formatStart = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()} ${hh}:${mi}`
}

/**
 * Сколько визитов показывать в карте. Лента выводилась целиком, и у пациента с
 * длинной историей карточка превращалась в простыню, где последний визит —
 * где-то внизу. На стойке нужны последние.
 */
const VISIT_FEED_LIMIT = 5

export const PatientCardView = ({ patient, onBack, onCreateNew }: PatientCardViewProps) => {
  const [items, setItems] = useState<Appointment[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getPatientAppointments(patient.id)
      .then((res) => {
        if (!cancelled) {
          setItems(res.items)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Не удалось загрузить записи')
          setItems([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [patient.id])

  // Сервер отдаёт записи по возрастанию времени; в карте первым нужен последний
  // визит, а не первый в истории.
  const visible = [...items]
    .sort((a, b) => b.start.localeCompare(a.start))
    .slice(0, VISIT_FEED_LIMIT)

  return (
    <Stack
      gap="3"
      data-testid="patient-card-view"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      p="4"
      flex="1"
      minH="0"
      overflowY="auto"
    >
      <Flex align="center" gap="2" wrap="wrap">
        <Text fontSize="18px" fontWeight="700" data-testid="patient-card-name">{patient.name}</Text>
        <Text fontSize="12px" fontFamily="mono" color="textSecondary" data-testid="patient-card-uid">
          {patient.cardNumber}
        </Text>
        <Box flex="1" />
        <Button size="sm" variant="outline" onClick={onBack} data-testid="patient-card-back">К очереди</Button>
        <Button size="sm" bg="brandGreenDark" color="white" onClick={onCreateNew} data-testid="section-new-patient">
          Новая карта
        </Button>
      </Flex>
      <Text fontSize="13px" color="textSecondary" data-testid="patient-card-meta">
        {formatBirth(patient.birthDate)}, {patient.phone}
      </Text>

      <Text fontSize="14px" fontWeight="700">Последние записи пациента</Text>
      {error ? (
        <Text fontSize="12px" color="danger">{error}</Text>
      ) : null}
      {visible.length < items.length ? (
        <Text fontSize="12px" color="textSecondary" data-testid="patient-appointments-limit">
          Показаны последние {visible.length} из {items.length}
        </Text>
      ) : null}
      <Stack gap="1" data-testid="patient-appointments-list">
        {items.length === 0 ? (
          <Text fontSize="12px" color="textSecondary" data-testid="patient-appointments-empty">
            Записей пока нет
          </Text>
        ) : (
          visible.map((a) => (
            <Box
              key={a.id}
              data-testid={`patient-appointment-${a.id}`}
              borderWidth="1px"
              borderColor="borderLight"
              borderRadius="4px"
              px="10px"
              py="8px"
            >
              <Text fontSize="13px" fontFamily="mono">{formatStart(a.start)}</Text>
              <Text fontSize="12px" color="textSecondary">
                {a.doctorName ?? '—'}, {appointmentStatusLabel(a.status)}
              </Text>
            </Box>
          ))
        )}
      </Stack>
    </Stack>
  )
}
