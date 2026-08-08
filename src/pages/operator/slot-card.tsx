import React, { useMemo, useState } from 'react'
import { Box, Button, HStack, Input, Stack, Text } from '@chakra-ui/react'

import {
  ApiError,
  createAppointment,
  rescheduleAppointment,
} from '../../__data__/api'
import type {
  Appointment,
  Doctor,
  Patient,
  Service,
  SlotResource,
} from '../../__data__/types'
import { isTerminalAppointmentStatus } from '../../__data__/types'

interface SlotCardProps {
  scheduleDate: string
  time: string
  doctor: Doctor
  doctorResource: SlotResource
  appointment?: Appointment
  services: Service[]
  patients: Patient[]
  onBookingDone?: () => void
  onSelectRescheduleTarget?: (time: string, doctorId: string) => void
  rescheduleTargetTime?: string | null
  rescheduleTargetDoctorId?: string | null
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

const buildStartIso = (date: string, time: string) =>
  `${date}T${time}:00+03:00`

export const SlotCard = ({
  scheduleDate,
  time,
  doctor,
  doctorResource,
  appointment,
  services,
  patients,
  onBookingDone,
  onSelectRescheduleTarget,
  rescheduleTargetTime,
  rescheduleTargetDoctorId,
}: SlotCardProps) => {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [patientQuery, setPatientQuery] = useState('')
  const [patientId, setPatientId] = useState<string | null>(
    appointment?.patientId ?? null,
  )

  const isBusy = doctorResource.busy
  const isTerminal = isTerminalAppointmentStatus(appointment?.status)
  const canReschedule = isBusy && !!appointment && !isTerminal
  const startIso = buildStartIso(scheduleDate, time)

  const filteredPatients = useMemo(() => {
    const q = patientQuery.trim().toLowerCase()
    if (!q) return patients
    return patients.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      )
    })
  }, [patientQuery, patients])

  const selectedPatient = useMemo(
    () => (patientId ? patients.find((p) => p.id === patientId) : undefined),
    [patientId, patients],
  )

  const handleBook = async () => {
    if (!patientId) {
      setError('Выберите пациента для записи')
      return
    }
    setError(null)
    setBusy(true)
    try {
      await createAppointment({
        doctorId: doctor.id,
        patientId,
        start: startIso,
        durationMin: 30,
        serviceId: services[0]?.id ?? null,
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
    if (isTerminalAppointmentStatus(appointment.status)) {
      setError('Запись уже завершена — перенос невозможен')
      return
    }
    if (!rescheduleTargetTime || !rescheduleTargetDoctorId) {
      setError('Выберите свободный слот для переноса')
      return
    }
    const targetIso = buildStartIso(scheduleDate, rescheduleTargetTime)
    setError(null)
    setBusy(true)
    try {
      await rescheduleAppointment(appointment.id, {
        doctorId: rescheduleTargetDoctorId,
        start: targetIso,
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

  const handlePickTarget = () => {
    if (!onSelectRescheduleTarget) return
    setError(null)
    onSelectRescheduleTarget(time, doctor.id)
  }

  const statusLabel = appointment?.status ?? (isBusy ? 'Занят' : 'Свободен')
  const statusTone = isBusy ? 'brandGreenTint' : 'brandGreenFaint'

  const isTarget =
    isBusy &&
    rescheduleTargetTime === time &&
    rescheduleTargetDoctorId === doctor.id

  const rescheduleHint = !rescheduleTargetTime
    ? 'Выберите целевой слот'
    : isTarget
      ? 'Этот слот выбран как цель'
      : `Цель: ${rescheduleTargetTime}`

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
          <Text fontSize="12px" color="textSecondary" data-testid="card-date">
            {scheduleDate}
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

        {!isBusy && (
          <Stack gap="2" data-testid="patient-picker">
            <Text
              fontSize="12px"
              color="textSecondary"
              textTransform="uppercase"
              letterSpacing="0.04em"
            >
              Пациент
            </Text>
            <Input
              size="sm"
              placeholder="Поиск по имени, телефону или UID"
              value={patientQuery}
              onChange={(e) => setPatientQuery(e.target.value)}
              bg="white"
              borderColor="borderLight"
              borderRadius="compact"
              data-testid="patient-search"
            />
            {selectedPatient && (
              <Text
                fontSize="13px"
                color="brandGreen700"
                fontWeight="700"
                data-testid="patient-selected"
              >
                Выбран: {selectedPatient.name} · {selectedPatient.phone}
              </Text>
            )}
            <Stack
              gap="1"
              maxH="160px"
              overflowY="auto"
              borderWidth="1px"
              borderColor="borderLight"
              borderRadius="compact"
              p="1"
            >
              {filteredPatients.length === 0 && (
                <Text
                  fontSize="12px"
                  color="textSecondary"
                  px="2"
                  py="2"
                  data-testid="patient-empty"
                >
                  Ничего не найдено
                </Text>
              )}
              {filteredPatients.map((p) => (
                <Box
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  px="2"
                  py="2"
                  borderRadius="compact"
                  bg={patientId === p.id ? 'brandGreenFaint' : 'transparent'}
                  cursor="pointer"
                  onClick={() => {
                    setPatientId(p.id)
                    setError(null)
                  }}
                  data-testid={`patient-option-${p.id}`}
                  data-selected={patientId === p.id ? 'true' : 'false'}
                >
                  <Text fontSize="13px" color="textPrimary" lineHeight="18px">
                    {p.name}
                  </Text>
                  <Text fontSize="11px" color="textSecondary" lineHeight="14px">
                    {p.phone} · {p.id}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Stack>
        )}

        {isBusy && appointment && (
          <Stack gap="2">
            <Field
              label="Пациент"
              value={appointment.patientName ?? '—'}
            />
            <Field
              label="Услуга"
              value={
                services.find((s) => s.id === appointment.serviceId)?.name ?? '—'
              }
            />
            <Field label="Кабинет" value={doctor.cabinet} />
            <Field label="Автор" value="—" />
            <Field
              label="Длительность"
              value={`${appointment.durationMin} мин`}
            />
            <Field
              label="Цель переноса"
              value={
                isTarget
                  ? `${time} (${doctor.name})`
                  : rescheduleTargetTime
                    ? `${rescheduleTargetTime}`
                    : 'не выбрана'
              }
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
            canReschedule ? (
              <>
                <Button
                  onClick={handlePickTarget}
                  disabled={busy}
                  size="sm"
                  variant="outline"
                  bg="white"
                  color="textPrimary"
                  borderColor="borderDark"
                  borderRadius="compact"
                  fontWeight="400"
                  data-testid="card-pick-target"
                >
                  Выбрать целью
                </Button>
                <Button
                  onClick={handleReschedule}
                  disabled={busy || !rescheduleTargetTime}
                  size="sm"
                  variant="outline"
                  bg="white"
                  color="textPrimary"
                  borderColor="borderDark"
                  borderRadius="compact"
                  fontWeight="400"
                  data-testid="card-reschedule"
                  title={rescheduleHint}
                >
                  {busy ? 'Перенос…' : 'Перенести'}
                </Button>
              </>
            ) : (
              <Text
                fontSize="12px"
                color="textSecondary"
                data-testid="card-reschedule-blocked"
              >
                Запись завершена — перенос недоступен
              </Text>
            )
          ) : (
            <Button
              onClick={handleBook}
              disabled={busy || !patientId}
              size="sm"
              bg="brandGreen"
              color="white"
              borderRadius="pill"
              fontWeight="700"
              data-testid="card-book"
              title={!patientId ? 'Выберите пациента' : undefined}
            >
              {busy ? 'Запись…' : 'Записать'}
            </Button>
          )}
        </HStack>
      </Stack>
    </Box>
  )
}
