import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, HStack, Input, Stack, Text } from '@chakra-ui/react'

import {
  ApiError,
  cancelAppointment,
  confirmAppointment,
  createAppointment,
  getAppointmentHistory,
  rescheduleAppointment,
} from '../../__data__/api'
import {
  formatTimeRange,
  PAYMENT_TYPE_OPTIONS,
  paymentTypeLabel,
  resolveBookingDuration,
  serviceOfferedByDoctor,
} from '../../__data__/booking'
import type {
  Appointment,
  AppointmentHistoryEntry,
  Doctor,
  Patient,
  PaymentType,
  Schedule,
  Service,
  SlotResource,
  VisitType,
} from '../../__data__/types'
import { appointmentStatusLabel } from '../../__data__/status-labels'
import { isTerminalAppointmentStatus } from '../../__data__/types'

export type SlotActionNotice =
  | { kind: 'booked'; patientName: string; time: string }
  | { kind: 'cancelled'; time: string; doctorName: string }

interface SlotCardProps {
  scheduleDate: string
  time: string
  doctor: Doctor
  doctorResource: SlotResource
  appointment?: Appointment
  services: Service[]
  patients: Patient[]
  schedule: Schedule
  onBookingDone?: (notice?: SlotActionNotice) => void
  rescheduleTargetTime?: string | null
  rescheduleTargetDoctorId?: string | null
  onClearRescheduleTarget?: () => void
  onFitDurationChange?: (durationMin: number | null) => void
  /** Услуга, выбранная в режиме «запись от услуги» — фиксируется в карточке. */
  preferredServiceId?: string | null
}

const slotFitsDuration = (
  schedule: Schedule,
  doctorId: string,
  time: string,
  durationMin: number,
): { ok: boolean; reason: string | null } => {
  if (durationMin <= 0) return { ok: false, reason: 'Укажите услугу' }
  const times = schedule.slots.map((s) => s.time)
  const startIdx = times.indexOf(time)
  if (startIdx < 0) return { ok: false, reason: 'Слот отсутствует в сетке' }
  const steps = Math.max(1, Math.ceil(durationMin / schedule.stepMinutes))
  for (let i = 0; i < steps; i += 1) {
    const slot = schedule.slots[startIdx + i]
    if (!slot) {
      return { ok: false, reason: 'Услуга не помещается в смену с этого слота' }
    }
    const cell = slot.doctors.find((d) => d.id === doctorId)
    if (!cell) {
      return { ok: false, reason: 'Врач не ведёт приём на всём интервале услуги' }
    }
    if (i > 0 && cell.busy) {
      return { ok: false, reason: 'На пути услуги есть занятый слот' }
    }
  }
  return { ok: true, reason: null }
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
  schedule,
  onBookingDone,
  rescheduleTargetTime,
  rescheduleTargetDoctorId,
  onClearRescheduleTarget,
  onFitDurationChange,
  preferredServiceId = null,
}: SlotCardProps) => {
  const offeredServices = useMemo(
    () => services.filter((s) => serviceOfferedByDoctor(s, doctor.id)),
    [services, doctor.id],
  )

  const initialServiceId = (): string | null => {
    if (preferredServiceId && offeredServices.some((s) => s.id === preferredServiceId)) {
      return preferredServiceId
    }
    return offeredServices.find((s) => s.category !== 'Приём')?.id
      ?? offeredServices[0]?.id
      ?? null
  }

  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const busyRef = React.useRef(false)
  const [cancelConfirming, setCancelConfirming] = useState(false)

  const runBusy = async (fn: () => Promise<void>) => {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    try {
      await fn()
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }
  const [patientQuery, setPatientQuery] = useState('')
  const [patientId, setPatientId] = useState<string | null>(
    appointment?.patientId ?? null,
  )
  const [serviceId, setServiceId] = useState<string | null>(initialServiceId)
  const [visitType, setVisitType] = useState<VisitType>('repeat')
  const [paymentType, setPaymentType] = useState<PaymentType>('regular')
  const [operatorComment, setOperatorComment] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [history, setHistory] = useState<AppointmentHistoryEntry[]>([])

  useEffect(() => {
    if (preferredServiceId && offeredServices.some((s) => s.id === preferredServiceId)) {
      setServiceId(preferredServiceId)
      return
    }
    setServiceId((prev) => {
      if (prev && offeredServices.some((s) => s.id === prev)) return prev
      return offeredServices[0]?.id ?? null
    })
  }, [preferredServiceId, offeredServices])

  const isBusy = doctorResource.busy
  const isTerminal = isTerminalAppointmentStatus(appointment?.status)
  const canReschedule = isBusy && !!appointment && !isTerminal
  const canCancel = isBusy && !!appointment && !isTerminal
  const startIso = buildStartIso(scheduleDate, time)
  const hasRescheduleTarget = Boolean(rescheduleTargetTime && rescheduleTargetDoctorId)

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

  const selectedService = useMemo(
    () => (serviceId ? services.find((s) => s.id === serviceId) : undefined),
    [serviceId, services],
  )

  const durationMin = selectedService
    ? resolveBookingDuration(selectedService, visitType)
    : 0

  const fit = useMemo(
    () => (isBusy ? { ok: true, reason: null as string | null } : slotFitsDuration(schedule, doctor.id, time, durationMin)),
    [isBusy, schedule, doctor.id, time, durationMin],
  )

  React.useEffect(() => {
    if (isBusy) {
      onFitDurationChange?.(null)
      return undefined
    }
    onFitDurationChange?.(durationMin > 0 ? durationMin : null)
    return undefined
  }, [durationMin, isBusy, onFitDurationChange])

  const handleBook = async () => {
    if (!patientId) {
      setError('Выберите пациента для записи')
      return
    }
    if (!selectedService) {
      setError('Выберите услугу')
      return
    }
    if (!fit.ok) {
      setError(fit.reason ?? 'Услуга не помещается в этот слот')
      return
    }
    const patientName = patients.find((p) => p.id === patientId)?.name ?? 'Пациент'
    setError(null)
    await runBusy(async () => {
      try {
        await createAppointment({
          doctorId: doctor.id,
          patientId,
          start: startIso,
          durationMin,
          serviceId: selectedService.id,
          paymentType,
          visitType,
          operatorComment: operatorComment.trim() || null,
        })
        onBookingDone?.({ kind: 'booked', patientName, time })
      } catch (e) {
        if (e instanceof ApiError) {
          setError(e.message)
        } else {
          setError('Не удалось записать пациента')
        }
      }
    })
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
    if (
      rescheduleTargetTime === time &&
      rescheduleTargetDoctorId === doctor.id
    ) {
      setError('Выберите другой слот — текущий уже и есть исходный')
      return
    }
    const targetIso = buildStartIso(scheduleDate, rescheduleTargetTime)
    setError(null)
    await runBusy(async () => {
      try {
        await rescheduleAppointment(appointment.id, {
          doctorId: rescheduleTargetDoctorId,
          start: targetIso,
          durationMin: appointment.durationMin,
          actor: 'operator',
        })
        onBookingDone?.()
      } catch (e) {
        if (e instanceof ApiError) {
          setError(e.message)
        } else {
          setError('Не удалось перенести запись')
        }
      }
    })
  }

  const handleCancel = async () => {
    if (!appointment || !canCancel) return
    const reason = cancelReason.trim()
    if (!reason) {
      setError('Укажите причину отмены')
      return
    }
    if (!cancelConfirming) {
      setCancelConfirming(true)
      return
    }
    setError(null)
    await runBusy(async () => {
      try {
        await cancelAppointment(appointment.id, {
          cancelReason: reason,
          cancelledBy: 'operator',
          actor: 'operator',
        })
        const hist = await getAppointmentHistory(appointment.id)
        setHistory(hist.items)
        setCancelConfirming(false)
        onBookingDone?.({
          kind: 'cancelled',
          time,
          doctorName: doctor.name,
        })
      } catch (e) {
        if (e instanceof ApiError) {
          setError(e.message)
        } else {
          setError('Не удалось отменить запись')
        }
      }
    })
  }

  React.useEffect(() => {
    if (!appointment?.id) {
      setHistory([])
      return
    }
    let cancelled = false
    getAppointmentHistory(appointment.id)
      .then((res) => {
        if (!cancelled) setHistory(res.items)
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
    return () => {
      cancelled = true
    }
  }, [appointment?.id, appointment?.status])

  const handleConfirm = async () => {
    if (!appointment || appointment.confirmed) return
    setError(null)
    await runBusy(async () => {
      try {
        await confirmAppointment(appointment.id)
        onBookingDone?.()
      } catch (err: unknown) {
        const message = err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Не удалось подтвердить запись'
        setError(message)
      }
    })
  }

  const statusLabel = appointment
    ? appointmentStatusLabel(appointment.status)
    : (isBusy
      ? (doctorResource.occupancyLabel
        ?? (doctorResource.occupancyKind === 'blocked'
          ? 'Блокировка'
          : doctorResource.occupancyKind === 'tech_break'
            ? 'Техперерыв'
            : 'Занят'))
      : 'Свободен')
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

  const rescheduleBlockedReason = isTerminal
    ? appointment?.status === 'cancelled'
      ? 'Запись отменена — перенос недоступен'
      : 'Запись завершена — перенос недоступен'
    : null

  const cancelBlockedReason = isTerminal
    ? appointment?.status === 'cancelled'
      ? 'Запись уже отменена'
      : 'Терминальный статус — отмена недоступна'
    : null

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
          <Stack gap="2">
            <Text fontSize="13px" fontFamily="mono" data-testid="card-time-range">
              {formatTimeRange(time, durationMin || schedule.stepMinutes)}
            </Text>
            {!fit.ok && (
              <Text fontSize="12px" color="danger" data-testid="card-fit-blocked">
                {fit.reason}
              </Text>
            )}
            <Stack gap="1">
              <Text fontSize="12px" color="textSecondary">Услуга</Text>
              <select
                data-testid="card-service"
                value={serviceId ?? ''}
                disabled={Boolean(preferredServiceId)}
                onChange={(e) => setServiceId(e.target.value || null)}
                style={{ fontSize: '13px', height: '32px', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '0 8px' }}
              >
                {offeredServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.duration} мин</option>
                ))}
              </select>
            </Stack>
            <Stack gap="1">
              <Text fontSize="12px" color="textSecondary">Тип приёма</Text>
              <HStack gap="2">
                <Button size="sm" variant={visitType === 'first' ? 'solid' : 'outline'} bg={visitType === 'first' ? 'brandGreen' : 'white'} color={visitType === 'first' ? 'white' : 'textPrimary'} data-testid="card-visit-first" onClick={() => setVisitType('first')}>Первичный</Button>
                <Button size="sm" variant={visitType === 'repeat' ? 'solid' : 'outline'} bg={visitType === 'repeat' ? 'brandGreen' : 'white'} color={visitType === 'repeat' ? 'white' : 'textPrimary'} data-testid="card-visit-repeat" onClick={() => setVisitType('repeat')}>Повторный</Button>
              </HStack>
            </Stack>
            <Stack gap="1">
              <Text fontSize="12px" color="textSecondary">Основание оплаты</Text>
              <select
                data-testid="card-payment"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                style={{ fontSize: '13px', height: '32px', border: '1px solid #E2E8F0', borderRadius: '4px', padding: '0 8px' }}
              >
                {PAYMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </Stack>
            <Stack gap="1">
              <Text fontSize="12px" color="textSecondary">Комментарий оператора</Text>
              <Input
                size="sm"
                value={operatorComment}
                onChange={(e) => setOperatorComment(e.target.value)}
                placeholder="Например, пациент просит не звонить до 10:00"
                data-testid="card-operator-comment"
              />
            </Stack>
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
                      {p.phone}
                    </Text>
                  </Box>
                ))}
              </Stack>
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
            <Field label="Кабинет" value={appointment.doctorCabinet ?? doctor.cabinet} />
            <Box data-testid="card-author">
              <Field
                label="Автор"
                value={
                  [appointment.createdByName, appointment.createdByUnit]
                    .filter((x): x is string => Boolean(x && String(x).trim()))
                    .join(' · ') || '—'
                }
              />
            </Box>
            <Box data-testid={appointment.confirmed ? 'card-confirmed' : 'card-unconfirmed'}>
              <Field
                label="Подтверждение"
                value={appointment.confirmed ? 'Запись подтверждена' : 'Не подтверждена'}
              />
            </Box>
            <Field
              label="Длительность"
              value={`${appointment.durationMin} мин · ${formatTimeRange(time, appointment.durationMin)}`}
            />
            <Field
              label="Оплата"
              value={paymentTypeLabel(appointment.paymentType)}
            />
            {appointment.operatorComment ? (
              <Field label="Комментарий" value={appointment.operatorComment} />
            ) : null}
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
            {appointment.status === 'cancelled' && (
              <Field
                label="Причина отмены"
                value={appointment.cancelReason ?? '—'}
              />
            )}
            {history.length > 0 && (
              <Box data-testid="appointment-history">
                <Text fontSize="12px" color="textSecondary" mb="1">
                  История статусов
                </Text>
                <Stack gap="1">
                  {history.map((entry, idx) => (
                    <Text
                      key={`${entry.at}-${idx}`}
                      fontSize="12px"
                      color="textPrimary"
                      data-testid={`history-entry-${idx}`}
                    >
                      {entry.from ? appointmentStatusLabel(entry.from) : '—'} → {appointmentStatusLabel(entry.to)} · {entry.actor} · {entry.at.slice(11, 16)}
                    </Text>
                  ))}
                </Stack>
              </Box>
            )}
            {canCancel && (
              <Stack gap="1">
                <Text fontSize="12px" color="textSecondary">
                  Причина отмены
                </Text>
                <Input
                  value={cancelReason}
                  onChange={(e) => {
                    setCancelConfirming(false)
                    setCancelReason(e.target.value)
                  }}
                  placeholder="Например, пациент отказался"
                  data-testid="cancel-reason"
                  borderColor="borderDark"
                  size="sm"
                />
              </Stack>
            )}
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

        <HStack gap="2" flexWrap="wrap">
          {isBusy ? (
            <>
              {canReschedule ? (
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
              ) : (
                <Text
                  fontSize="12px"
                  color="textSecondary"
                  data-testid="card-reschedule-blocked"
                >
                  {rescheduleBlockedReason}
                </Text>
              )}
              {!appointment.confirmed ? (
                <Button
                  onClick={() => { void handleConfirm() }}
                  disabled={busy}
                  size="sm"
                  variant="outline"
                  bg="white"
                  color="textPrimary"
                  borderColor="borderDark"
                  borderRadius="compact"
                  fontWeight="400"
                  data-testid="card-confirm"
                >
                  {busy ? 'Подтверждение…' : 'Подтвердить запись'}
                </Button>
              ) : (
                <Text fontSize="12px" color="brandGreen700" data-testid="card-confirmed-mark">
                  Запись подтверждена
                </Text>
              )}
              {canCancel ? (
                <Button
                  onClick={() => { void handleCancel() }}
                  disabled={busy || !cancelReason.trim()}
                  size="sm"
                  variant="outline"
                  bg="white"
                  color="danger"
                  borderColor="danger"
                  borderRadius="compact"
                  fontWeight="400"
                  data-testid="card-cancel"
                  data-confirming={cancelConfirming ? 'true' : 'false'}
                  title={
                    !cancelReason.trim()
                      ? 'Укажите причину отмены'
                      : cancelConfirming
                        ? `Подтвердите отмену записи на ${time}`
                        : undefined
                  }
                >
                  {busy
                    ? 'Отмена…'
                    : cancelConfirming
                      ? `Да, отменить запись на ${time}`
                      : 'Отменить'}
                </Button>
              ) : (
                <Text
                  fontSize="12px"
                  color="textSecondary"
                  data-testid="card-cancel-blocked"
                >
                  {cancelBlockedReason}
                </Text>
              )}
              {hasRescheduleTarget ? (
                <Button
                  onClick={() => onClearRescheduleTarget?.()}
                  disabled={busy}
                  size="sm"
                  variant="ghost"
                  color="textSecondary"
                  borderRadius="compact"
                  fontWeight="400"
                  data-testid="card-clear-reschedule"
                >
                  Сбросить перенос
                </Button>
              ) : null}
              {canReschedule && !hasRescheduleTarget ? (
                <Text fontSize="12px" color="textSecondary" data-testid="card-reschedule-hint">
                  Выберите свободный слот — цель переноса, либо сбросьте выбор
                </Text>
              ) : null}
            </>
          ) : (
            <Button
              onClick={handleBook}
              disabled={busy || !patientId || !selectedService || !fit.ok}
              size="sm"
              bg="brandGreen"
              color="white"
              borderRadius="pill"
              fontWeight="700"
              data-testid="card-book"
              title={!patientId ? 'Выберите пациента' : (!fit.ok ? (fit.reason ?? undefined) : undefined)}
            >
              {busy ? 'Запись…' : 'Записать'}
            </Button>
          )}
        </HStack>
      </Stack>
    </Box>
  )
}
