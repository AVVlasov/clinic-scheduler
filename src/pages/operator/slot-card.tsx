import React, { useState } from 'react'
import { Box, Button, HStack, Stack, Text } from '@chakra-ui/react'

import {
  ApiError,
  createAppointment,
  rescheduleAppointment,
} from '../../__data__/api'
import type {
  Appointment,
  Doctor,
  Service,
  SlotResource,
} from '../../__data__/types'

interface SlotCardProps {
  time: string
  doctor: Doctor
  doctorResource: SlotResource
  appointment?: Appointment
  services: Service[]
  onBookingDone?: () => void
}

const Field = ({ label, value }: { label: string; value: string }) => (
  <Box display="grid" gridTemplateColumns="96px 1fr" columnGap="2" rowGap="2">
    <Text fontSize="12px" color="textSecondary" lineHeight="18px">
      {label}
    </Text>
    <Text fontSize="13px" color="textPrimary" lineHeight="18px">
      {value}
    </Text>
  </Box>
)

export const SlotCard = ({
  time,
  doctor,
  doctorResource,
  appointment,
  services,
  onBookingDone,
}: SlotCardProps) => {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const isBusy = doctorResource.busy
  const today = new Date().toISOString().slice(0, 10)
  const startIso = `${today}T${time}:00+03:00`

  const handleBook = async () => {
    setError(null)
    setBusy(true)
    try {
      await createAppointment({
        doctorId: doctor.id,
        patientId: appointment?.patientId ?? 'p-001',
        start: startIso,
        durationMin: 30,
        serviceId: appointment?.serviceId ?? services[0]?.id ?? null,
      })
      onBookingDone?.()
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Не удалось записать пациента')
      }
    } finally {
      setBusy(false)
    }
  }

  const handleReschedule = async () => {
    if (!appointment) return
    setError(null)
    setBusy(true)
    try {
      await rescheduleAppointment(appointment.id, {
        start: startIso,
        durationMin: appointment.durationMin,
      })
      onBookingDone?.()
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message)
      } else {
        setError('Не удалось перенести запись')
      }
    } finally {
      setBusy(false)
    }
  }

  const statusLabel = appointment?.status ?? (isBusy ? 'Занят' : 'Свободен')
  const statusTone = isBusy ? 'brandGreenTint' : 'brandGreenFaint'

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      p="4"
      data-testid="slot-card"
      data-busy={isBusy ? 'true' : 'false'}
    >
      <Stack gap="3">
        <HStack align="baseline" gap="3">
          <Text
            fontSize="26px"
            lineHeight="30px"
            fontWeight="600"
            letterSpacing="-0.028em"
            fontFamily="mono"
            data-testid="card-time"
          >
            {time}
          </Text>
          <Text fontSize="12px" color="textSecondary">
            {today}
          </Text>
          <Box flex="1" />
          <Box
            bg={statusTone}
            px="2"
            py="1"
            borderRadius="compact"
            data-testid="card-status"
          >
            <Text
              fontSize="12px"
              color="brandGreen700"
              fontWeight="700"
              lineHeight="15px"
            >
              {statusLabel}
            </Text>
          </Box>
        </HStack>

        <HStack gap="2" align="center">
          <Text fontSize="13px" fontWeight="500" lineHeight="18px">
            {doctor.name}
          </Text>
          <Box
            bg="brandGreenTint"
            px="2"
            py="1"
            borderRadius="compact"
            data-testid="card-specialty"
          >
            <Text
              fontSize="11px"
              color="brandGreen700"
              fontWeight="700"
              lineHeight="14px"
            >
              {doctor.specialty}
            </Text>
          </Box>
        </HStack>

        {isBusy && appointment && (
          <Stack gap="2">
            <Field
              label="Пациент"
              value={appointment.patientName ?? '—'}
            />
            <Field label="Услуга" value={
              services.find((s) => s.id === appointment.serviceId)?.name ?? '—'
            } />
            <Field label="Кабинет" value={doctor.cabinet} />
            <Field label="Автор" value="—" />
            <Field
              label="Длительность"
              value={`${appointment.durationMin} мин`}
            />
          </Stack>
        )}

        {error && (
          <Box
            role="alert"
            data-testid="card-error"
            bg="surfaceLight"
            borderLeftWidth="3px"
            borderLeftColor="danger"
            borderRadius="compact"
            px="3"
            py="2"
          >
            <Text fontSize="13px" color="danger" lineHeight="18px">
              {error}
            </Text>
          </Box>
        )}

        <HStack gap="2">
          {isBusy ? (
            <>
              <Button
                onClick={handleReschedule}
                disabled={busy}
                size="sm"
                variant="outline"
                bg="white"
                color="textPrimary"
                borderColor="borderDark"
                borderRadius="compact"
                fontWeight="400"
                data-testid="card-reschedule"
              >
                {busy ? 'Перенос…' : 'Перенести'}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleBook}
              disabled={busy}
              size="sm"
              bg="brandGreen"
              color="white"
              borderRadius="pill"
              fontWeight="700"
              data-testid="card-book"
            >
              {busy ? 'Запись…' : 'Записать'}
            </Button>
          )}
        </HStack>
      </Stack>
    </Box>
  )
}
