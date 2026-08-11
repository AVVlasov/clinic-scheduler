import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getAppointments, getAppointmentHistory, getDoctors, getServices, createWaitlist, rescheduleAppointment } from '../../__data__/api'
import { paymentTypeLabel } from '../../__data__/booking'
import { parseArmDate, parseArmDoctorId, withArmDate } from '../../__data__/dates'
import { plural } from '../../__data__/plural'
import { appointmentStatusLabel, appointmentStatusTone } from '../../__data__/status-labels'
import type { Appointment, AppointmentHistoryEntry, CreateWaitlistInput, Service } from '../../__data__/types'
import { URLs } from '../../__data__/urls'

import { DayList } from './day-list'
import { formatDayMonth, formatVisitRange, historyActorLabel } from './labels'
import { serviceNameById } from './service-access'
import {
  emptyVisitFormState,
  isVisitFormValid,
  visitDayOf,
  VisitForm,
  type VisitFormState,
} from './visit-form'

export const computeAgeYears = (birthDate: string | null): string | null => {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years -= 1
  // Прежнее правило (`years < 5 ? 'года' : 'лет'`) верно только до 5: 34 давало «34 лет».
  return `${b.getFullYear()} г. р., ${years} ${plural(years, 'год', 'года', 'лет')}`
}

/** Факт карточки визита: подпись сверху, значение снизу. */
const VisitFact = ({
  label, testId, mono = false, children,
}: {
  label: string
  testId: string
  mono?: boolean
  children: React.ReactNode
}) => (
  <Stack gap="2px" minW="0">
    <Text fontSize="11px" lineHeight="14px" color="textSecondary">{label}</Text>
    <Text
      fontSize="13px"
      lineHeight="18px"
      color="textPrimary"
      fontFamily={mono ? 'mono' : undefined}
      data-testid={testId}
    >
      {children}
    </Text>
  </Stack>
)

const fromAppointment = (a: Appointment): VisitFormState => ({
  complaints: a.complaints ?? '',
  diagnosis: a.diagnosis ?? '',
  visitType: a.visitType ?? 'first',
  selectedServiceIds: Array.isArray(a.performedServiceIds) ? [...a.performedServiceIds] : [],
  recommendations: Array.isArray(a.recommendations) ? [...a.recommendations] : [],
  nextVisitDate: a.nextVisit?.date ?? '',
  nextVisitServiceId: a.nextVisit?.serviceId ?? '',
})

/**
 * Заявка на повторный визит, отправленная после закрытия приёма. Хранится целиком,
 * потому что повтор после отказа сервера не должен требовать правки протокола:
 * приём уже завершён, форма заблокирована, и собрать заявку заново в ней нечем.
 */
interface FollowUpRequest {
  appointmentId: string
  serviceName: string
  date: string
  input: CreateWaitlistInput
}

type FollowUpPhase = 'idle' | 'sending' | 'created' | 'failed'

const isDoctorActionable = (status: Appointment['status']): boolean =>
  status === 'scheduled' || status === 'arrived' || status === 'in_progress'

const pickInitialAppointmentId = (items: Appointment[], prev: string | null): string | null => {
  if (prev && items.some((a) => a.id === prev)) return prev
  const actionable = items.find((a) => isDoctorActionable(a.status))
  return actionable?.id ?? items[0]?.id ?? null
}

export const DoctorPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedDate = parseArmDate(location.search)
  const doctorIdFromUrl = parseArmDoctorId(location.search)

  const [doctorId, setDoctorId] = useState<string | null>(doctorIdFromUrl)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visitForm, setVisitForm] = useState<Record<string, VisitFormState>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isAppointmentsLoaded, setIsAppointmentsLoaded] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [history, setHistory] = useState<AppointmentHistoryEntry[]>([])
  const [statusBusy, setStatusBusy] = useState(false)
  const [followUp, setFollowUp] = useState<FollowUpRequest | null>(null)
  const [followUpPhase, setFollowUpPhase] = useState<FollowUpPhase>('idle')
  const [followUpError, setFollowUpError] = useState<string | null>(null)

  const blockReasonFor = (status: Appointment['status']): string | null => {
    switch (status) {
      case 'scheduled':
        return 'Сначала отметьте приход пациента'
      case 'arrived':
        return 'Сначала начните приём'
      case 'no_show':
        return 'Пациент не явился — закрыть приём нельзя'
      case 'cancelled':
        return 'Приём отменён — закрывать нечего'
      case 'completed':
        return 'Протокол уже закрыт'
      case 'in_progress':
      default:
        return null
    }
  }

  const nextStatusAction = (status: Appointment['status']): { to: Appointment['status']; label: string } | null => {
    if (status === 'scheduled') return { to: 'arrived', label: 'Пациент пришёл' }
    if (status === 'arrived') return { to: 'in_progress', label: 'Начать приём' }
    return null
  }

  const guidanceFor = (status: Appointment['status']): string => {
    switch (status) {
      case 'scheduled':
        return 'Отметьте приход, затем начните и завершите приём'
      case 'arrived':
        return 'Начните приём, заполните протокол и завершите'
      case 'in_progress':
        return 'Заполните жалобы и диагноз, затем завершите приём'
      case 'completed':
        return 'Приём закрыт — дальше действий нет'
      case 'cancelled':
        return 'Запись отменена оператором — действий нет'
      case 'no_show':
        return 'Пациент не явился — действий у врача нет'
      default:
        return 'Нет доступных действий'
    }
  }

  useEffect(() => {
    let cancelled = false
    getDoctors()
      .then((res) => {
        if (cancelled) return
        // Врача выбирает адрес, не экран: список нужен только чтобы понять,
        // существует ли врач из `?doctorId=`, и чем открыться, если его там нет.
        const preferred = doctorIdFromUrl && res.items.some((d) => d.id === doctorIdFromUrl)
          ? doctorIdFromUrl
          : (res.items[0]?.id ?? null)
        setDoctorId(preferred)
        if (preferred && preferred !== doctorIdFromUrl) {
          navigate(withArmDate(URLs.arms.doctor, selectedDate, preferred), { replace: true })
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить справочник врачей')
      })
    return () => {
      cancelled = true
    }
  }, [doctorIdFromUrl, navigate, selectedDate])

  useEffect(() => {
    if (!doctorId) return
    let cancelled = false
    setIsAppointmentsLoaded(false)
    const load = async () => {
      try {
        const [appts, svcs] = await Promise.all([
          getAppointments(selectedDate, doctorId),
          getServices(),
        ])
        if (cancelled) return
        setAppointments(appts.items)
        setServices(svcs.items)
        setVisitForm((prev) => {
          const next = { ...prev }
          for (const a of appts.items) {
            // Не затираем набранный и несохранённый протокол при повторной загрузке.
            if (!next[a.id]) next[a.id] = fromAppointment(a)
          }
          return next
        })
        if (appts.items.length > 0) {
          setSelectedId((prev) => pickInitialAppointmentId(appts.items, prev))
        } else {
          setSelectedId(null)
        }
        setLoadError(null)
        setIsAppointmentsLoaded(true)
      } catch (err) {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить данные')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [selectedDate, doctorId, reloadToken])

  useEffect(() => {
    if (!doctorId || !isAppointmentsLoaded || loadError) return undefined
    let cancelled = false
    const id = window.setInterval(() => {
      if (cancelled || !doctorId) return
      getAppointments(selectedDate, doctorId)
        .then((appts) => {
          if (cancelled) return
          setAppointments(appts.items)
          setVisitForm((prev) => {
            const next = { ...prev }
            for (const a of appts.items) {
              if (!next[a.id]) next[a.id] = fromAppointment(a)
            }
            return next
          })
          setSelectedId((prev) => pickInitialAppointmentId(appts.items, prev))
        })
        .catch(() => {
          // soft poll
        })
    }, 3000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [doctorId, isAppointmentsLoaded, loadError, selectedDate])

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [appointments],
  )

  const selected = useMemo(
    () => sortedAppointments.find((a) => a.id === selectedId) ?? null,
    [sortedAppointments, selectedId],
  )

  const currentFormState: VisitFormState = selected
    ? visitForm[selected.id] ?? fromAppointment(selected)
    : emptyVisitFormState

  const updateCurrentForm = useCallback(
    (next: VisitFormState) => {
      if (!selected) return
      setVisitForm((prev) => ({ ...prev, [selected.id]: next }))
    },
    [selected],
  )

  const sendFollowUp = useCallback(async (request: FollowUpRequest) => {
    setFollowUpPhase('sending')
    setFollowUpError(null)
    try {
      await createWaitlist(request.input)
      setFollowUpPhase('created')
    } catch (err) {
      setFollowUpPhase('failed')
      setFollowUpError(
        err instanceof Error ? err.message : 'Не удалось создать заявку на повторный визит',
      )
    }
  }, [])

  const onFinish = useCallback(async () => {
    if (!selected || !doctorId) return
    const state = visitForm[selected.id] ?? emptyVisitFormState
    if (!isVisitFormValid(state, visitDayOf(selected)) || selected.status === 'completed') return
    if (blockReasonFor(selected.status) !== null) return
    setIsSubmitting(true)
    setSubmitError(null)
    setFollowUp(null)
    setFollowUpPhase('idle')
    setFollowUpError(null)
    try {
      const updated = await rescheduleAppointment(selected.id, {
        status: 'completed',
        asDoctorId: doctorId,
        actor: 'doctor',
        complaints: state.complaints,
        diagnosis: state.diagnosis,
        visitType: state.visitType,
        performedServiceIds: state.selectedServiceIds,
        recommendations: state.recommendations,
        nextVisit: (state.nextVisitDate && state.nextVisitServiceId)
          ? { date: state.nextVisitDate, serviceId: state.nextVisitServiceId }
          : null,
      })
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
      setSubmitError(null)
      if (state.nextVisitDate && state.nextVisitServiceId) {
        // Заявка отправляется вторым запросом и уже после того, как приём закрыт:
        // её отказ — не отказ завершения, и объясняться он обязан отдельно.
        const request: FollowUpRequest = {
          appointmentId: selected.id,
          serviceName: serviceNameById(services, state.nextVisitServiceId),
          date: state.nextVisitDate,
          input: {
            kind: 'from_doctor',
            patientId: selected.patientId,
            serviceId: state.nextVisitServiceId,
            doctorId,
            dateFrom: state.nextVisitDate,
            dateTo: state.nextVisitDate,
            priority: 'high',
            comment: 'Рекомендация врача по следующему визиту',
            createdBy: 'doctor',
          },
        }
        setFollowUp(request)
        await sendFollowUp(request)
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось завершить приём')
    } finally {
      setIsSubmitting(false)
    }
  }, [selected, visitForm, doctorId, services, sendFollowUp])

  const onAdvanceStatus = useCallback(async () => {
    if (!selected || !doctorId) return
    const action = nextStatusAction(selected.status)
    if (!action) return
    setStatusBusy(true)
    setSubmitError(null)
    try {
      const updated = await rescheduleAppointment(selected.id, {
        status: action.to,
        asDoctorId: doctorId,
        actor: 'doctor',
      })
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось сменить статус')
    } finally {
      setStatusBusy(false)
    }
  }, [selected, doctorId])

  useEffect(() => {
    if (!selectedId) {
      setHistory([])
      return
    }
    let cancelled = false
    getAppointmentHistory(selectedId)
      .then((res) => {
        if (!cancelled) setHistory(res.items ?? [])
      })
      .catch(() => {
        if (!cancelled) setHistory([])
      })
    return () => {
      cancelled = true
    }
  }, [selectedId, selected?.status])

  if (loadError && !isAppointmentsLoaded) {
    return (
      <Flex direction="column" p="4" gap="2" data-testid="doctor-error">
        <Text fontSize="16px" fontWeight="700" color="danger">Ошибка загрузки</Text>
        <Text fontSize="13px" color="textSecondary">{loadError}</Text>
        <Box
          as="button"
          data-testid="doctor-retry"
          onClick={() => {
            setLoadError(null)
            setReloadToken((n) => n + 1)
          }}
          alignSelf="flex-start"
          h="32px"
          px="12px"
          borderRadius="4px"
          bg="brandGreenDark"
          color="white"
          fontSize="13px"
          cursor="pointer"
        >
          Повторить
        </Box>
      </Flex>
    )
  }

  if (!isAppointmentsLoaded || !doctorId) {
    return (
      <Flex direction="column" p="4" gap="2" data-testid="doctor-loading">
        <Text fontSize="16px" fontWeight="700" color="textPrimary">АРМ врача</Text>
        <Text fontSize="13px" color="textSecondary">Загрузка приёмов…</Text>
      </Flex>
    )
  }

  if (sortedAppointments.length === 0) {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const weekday = new Date(y, m - 1, d).getDay()
    const reason = weekday === 0 || weekday === 6
      ? 'Сегодня выходной — приёмов нет.'
      : 'На сегодня приёмов нет.'
    return (
      <Flex direction="column" p="4" gap="2" data-testid="doctor-empty" data-date={selectedDate} data-doctor={doctorId}>
        <Text fontSize="16px" fontWeight="700" color="textPrimary" mb="2">АРМ врача</Text>
        <Text fontSize="13px" color="textSecondary" data-testid="doctor-empty-reason">{reason}</Text>
      </Flex>
    )
  }

  return (
    <Flex h="100%" minH="0" bg="surfaceLight" p="3" gap="3" data-testid="doctor-page" data-date={selectedDate} data-doctor={doctorId}>
      <DayList
        appointments={sortedAppointments}
        services={services}
        selectedId={selectedId}
        onSelect={(id) => {
          setSubmitError(null)
          setSelectedId(id)
        }}
      />

      <Box
        flex="1"
        minW="0"
        bg="white"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="borderLight"
        borderRadius="compact"
        display="flex"
        flexDirection="column"
      >
        {selected && (
          <>
            <Box
              flex="none"
              px="4"
              py="4"
              borderBottomWidth="1px"
              borderBottomStyle="solid"
              borderBottomColor="borderLight"
              display="flex"
              flexDirection="column"
              gap="10px"
            >
              <Flex align="center" gap="10px" flexWrap="wrap">
                <Text fontSize="24px" fontWeight="700" lineHeight="32px" letterSpacing="-0.018em" color="textPrimary">
                  {selected.patientName ?? '—'}
                </Text>
                <Box
                  fontSize="12px"
                  lineHeight="20px"
                  px="8px"
                  borderRadius="compact"
                  bg={appointmentStatusTone(selected.status).bg}
                  color={appointmentStatusTone(selected.status).fg}
                  data-testid="visit-status-badge"
                >
                  {appointmentStatusLabel(selected.status)}
                </Box>
                <Box flex="1" />
                <Text fontSize="12px" color="textSecondary" fontFamily="mono" data-testid="visit-uid">
                  {selected.patientUid ?? '—'}
                </Text>
              </Flex>
              {/* Факты карточки — подпись над значением. Строка «значение ·
                  значение · значение» экономит место, но заставляет читателя
                  угадывать, что есть что, и выглядит как машинная склейка. */}
              <Flex gap="24px" flexWrap="wrap">
                {/* Услуга — первый факт приёма: врач должен знать, зачем пришёл
                    пациент, до того как читает телефон и плательщика. */}
                <VisitFact label="Услуга" testId="visit-service">
                  {serviceNameById(services, selected.serviceId)}
                </VisitFact>
                <VisitFact label="Пациент" testId="visit-birth">
                  {computeAgeYears(selected.patientBirthDate) ?? '—'}
                </VisitFact>
                <VisitFact label="Основание оплаты" testId="visit-payer">
                  {paymentTypeLabel(selected.paymentType)}
                </VisitFact>
                <VisitFact label="Телефон" testId="visit-phone" mono>
                  {selected.patientPhone ?? '—'}
                </VisitFact>
                <VisitFact label="Приём" testId="visit-slot" mono>
                  {formatVisitRange(selected.start, selected.durationMin)}
                </VisitFact>
              </Flex>
              {/* Кнопка говорит, что делать сейчас. Подсказка рядом повторяла
                  её же словами и дублировала строку у «Завершить приём» —
                  оставлена только там, где действия нет. */}
              <Flex align="center" gap="2" flexWrap="wrap" data-testid="visit-status-actions">
                {nextStatusAction(selected.status) ? (
                  <Button
                    data-testid="visit-advance-status"
                    onClick={() => { void onAdvanceStatus() }}
                    disabled={statusBusy}
                    size="sm"
                    bg="brandGreenDark"
                    color="white"
                    borderRadius="4px"
                    fontSize="13px"
                    _hover={{ bg: 'brandGreen700' }}
                  >
                    {statusBusy ? 'Обновляем…' : nextStatusAction(selected.status)?.label}
                  </Button>
                ) : (
                  <Text fontSize="12px" color="textSecondary" data-testid="visit-status-guidance">
                    {guidanceFor(selected.status)}
                  </Text>
                )}
              </Flex>
              {history.length > 0 && (
                <Box data-testid="appointment-history">
                  <Text fontSize="12px" color="textSecondary" mb="1">История статусов</Text>
                  {history.map((entry, idx) => (
                    <Text
                      key={`${entry.at}-${idx}`}
                      fontSize="12px"
                      color="textPrimary"
                      data-testid={`history-entry-${idx}`}
                    >
                      {entry.from ? appointmentStatusLabel(entry.from) : '—'} → {appointmentStatusLabel(entry.to)}, {historyActorLabel(entry.actor)}
                    </Text>
                  ))}
                </Box>
              )}
            </Box>

            {followUp !== null && followUp.appointmentId === selected.id && (
              <Box
                flex="none"
                mx="4"
                mt="3"
                px="3"
                py="2"
                borderWidth="1px"
                borderStyle="solid"
                borderColor={followUpPhase === 'failed' ? 'danger' : 'brandGreenTint'}
                borderRadius="compact"
                bg={followUpPhase === 'failed' ? 'white' : 'brandGreenFaint'}
                display="flex"
                flexDirection="column"
                gap="2"
                data-testid="visit-followup"
              >
                {followUpPhase === 'sending' && (
                  <Text fontSize="13px" color="textPrimary" data-testid="visit-followup-pending">
                    Создаём заявку на повторный визит…
                  </Text>
                )}
                {followUpPhase === 'created' && (
                  <Text fontSize="13px" color="textPrimary" data-testid="visit-followup-created">
                    Заявка на повторный визит создана: {followUp.serviceName}, {formatDayMonth(followUp.date)}
                  </Text>
                )}
                {followUpPhase === 'failed' && (
                  <>
                    <Text fontSize="13px" color="textPrimary" data-testid="visit-followup-error">
                      Приём завершён, но заявку на повторный визит создать не удалось:{' '}
                      {followUpError ?? 'причина неизвестна'}. Услуга: {followUp.serviceName},
                      дата: {formatDayMonth(followUp.date)}
                    </Text>
                    <Button
                      type="button"
                      size="sm"
                      alignSelf="flex-start"
                      borderRadius="pill"
                      bg="brandGreenDark"
                      color="white"
                      _hover={{ bg: 'brandGreen700' }}
                      onClick={() => { void sendFollowUp(followUp) }}
                      data-testid="visit-followup-retry"
                    >
                      Повторить заявку
                    </Button>
                  </>
                )}
              </Box>
            )}

            <Box flex="1" overflowY="auto" p="4">
              <VisitForm
                appointment={selected}
                services={services}
                state={currentFormState}
                onChange={updateCurrentForm}
                onFinish={onFinish}
                isSubmitting={isSubmitting}
                alreadyCompleted={selected.status === 'completed'}
                blockReason={blockReasonFor(selected.status)}
                submitError={submitError}
                onDismissError={() => setSubmitError(null)}
              />
            </Box>
          </>
        )}
      </Box>
    </Flex>
  )
}
