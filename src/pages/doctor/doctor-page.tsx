import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { useLocation, useNavigate } from 'react-router-dom'

import { getAppointments, getAppointmentHistory, getDoctors, getServices, createWaitlist, rescheduleAppointment } from '../../__data__/api'
import { parseArmDate, parseArmDoctorId, withArmDate } from '../../__data__/dates'
import { plural } from '../../__data__/plural'
import { appointmentStatusLabel } from '../../__data__/status-labels'
import type { Appointment, AppointmentHistoryEntry, Doctor, Service } from '../../__data__/types'
import { URLs } from '../../__data__/urls'

import { DayList } from './day-list'
import {
  emptyVisitFormState,
  isVisitFormValid,
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
  return `${b.getFullYear()} г. р. · ${years} ${plural(years, 'год', 'года', 'лет')}`
}

const formatRange = (start: string, durationMin: number): string => {
  const s = new Date(start)
  const e = new Date(s.getTime() + durationMin * 60000)
  const dd = s.getDate()
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  return `${dd} ${months[s.getMonth()]}, ${fmt(s)}–${fmt(e)}`
}

const payerLabel = (paymentType: Appointment['paymentType']): string => {
  switch (paymentType) {
    case 'regular': return 'Обычный (платный)'
    case 'dms': return 'ДМС'
    case 'promo': return 'Акция'
    case 'discount': return 'Скидка'
    case 'certificate': return 'Сертификат'
    default: return paymentType
  }
}

const fromAppointment = (a: Appointment): VisitFormState => ({
  complaints: a.complaints ?? '',
  diagnosis: a.diagnosis ?? '',
  visitType: a.visitType ?? 'first',
  selectedServiceIds: Array.isArray(a.performedServiceIds) ? [...a.performedServiceIds] : [],
  recommendations: Array.isArray(a.recommendations) ? [...a.recommendations] : [],
  nextVisitDate: a.nextVisit?.date ?? '',
  nextVisitServiceId: a.nextVisit?.serviceId ?? '',
})

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

  const [doctors, setDoctors] = useState<Doctor[]>([])
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
        setDoctors(res.items)
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

  const currentDoctor = useMemo(
    () => doctors.find((d) => d.id === doctorId) ?? null,
    [doctors, doctorId],
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

  const onFinish = useCallback(async () => {
    if (!selected || !doctorId) return
    const state = visitForm[selected.id] ?? emptyVisitFormState
    if (!isVisitFormValid(state) || selected.status === 'completed') return
    if (blockReasonFor(selected.status) !== null) return
    setIsSubmitting(true)
    setSubmitError(null)
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
      if (state.nextVisitDate && state.nextVisitServiceId) {
        await createWaitlist({
          kind: 'from_doctor',
          patientId: selected.patientId,
          serviceId: state.nextVisitServiceId,
          doctorId,
          dateFrom: state.nextVisitDate,
          dateTo: state.nextVisitDate,
          priority: 'high',
          comment: 'Рекомендация врача по следующему визиту',
          createdBy: 'doctor',
        })
      }
      setSubmitError(null)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Не удалось завершить приём')
    } finally {
      setIsSubmitting(false)
    }
  }, [selected, visitForm, doctorId])

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

  const onDoctorChange = (nextId: string) => {
    setDoctorId(nextId)
    navigate(withArmDate(URLs.arms.doctor, selectedDate, nextId), { replace: true })
  }

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
          bg="brandGreen"
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
        <Flex align="center" gap="3" mb="2">
          <Text fontSize="16px" fontWeight="700" color="textPrimary">АРМ врача</Text>
          <select
            data-testid="doctor-subject"
            value={doctorId}
            onChange={(e) => onDoctorChange(e.target.value)}
            style={{
              fontSize: '13px',
              height: '32px',
              border: '1px solid var(--chakra-colors-borderLight, #E2E8F0)',
              borderRadius: '4px',
              padding: '0 8px',
              background: 'white',
            }}
          >
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>
        </Flex>
        <Text fontSize="13px" color="textSecondary" data-testid="doctor-empty-reason">{reason}</Text>
      </Flex>
    )
  }

  return (
    <Flex h="100%" minH="0" bg="surfaceLight" p="3" gap="3" data-testid="doctor-page" data-date={selectedDate} data-doctor={doctorId}>
      <DayList
        appointments={sortedAppointments}
        selectedId={selectedId}
        doctorName={currentDoctor?.name ?? null}
        onSelect={(id) => {
          setSubmitError(null)
          setSelectedId(id)
        }}
        doctorSwitcher={(
          <select
            data-testid="doctor-subject"
            value={doctorId}
            onChange={(e) => onDoctorChange(e.target.value)}
            style={{
              fontSize: '13px',
              height: '28px',
              border: '1px solid var(--chakra-colors-borderLight, #E2E8F0)',
              borderRadius: '4px',
              padding: '0 8px',
              background: 'white',
            }}
          >
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>{doc.name}</option>
            ))}
          </select>
        )}
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
                  bg={
                    selected.status === 'completed'
                      ? 'brandGreenTint'
                      : selected.status === 'cancelled' || selected.status === 'no_show'
                        ? 'gray.200'
                        : selected.status === 'in_progress' || selected.status === 'arrived'
                          ? 'brandOrange'
                          : 'gray.100'
                  }
                  color={
                    selected.status === 'completed'
                      ? 'brandGreen700'
                      : selected.status === 'cancelled' || selected.status === 'no_show'
                        ? 'textSecondary'
                        : 'textPrimary'
                  }
                  data-testid="visit-status-badge"
                >
                  {appointmentStatusLabel(selected.status)}
                </Box>
                <Box flex="1" />
                <Text fontSize="12px" color="textSecondary" fontFamily="mono" data-testid="visit-uid">
                  {selected.patientUid ?? '—'}
                </Text>
              </Flex>
              <Flex align="center" gap="14px" flexWrap="wrap" fontSize="13px" color="textSecondary">
                <Text data-testid="visit-birth">{computeAgeYears(selected.patientBirthDate) ?? '—'}</Text>
                <Text>·</Text>
                <Text data-testid="visit-payer">Плательщик: {payerLabel(selected.paymentType)}</Text>
                <Text>·</Text>
                <Text data-testid="visit-phone">{selected.patientPhone ?? '—'}</Text>
              </Flex>
              <Flex align="center" gap="8px" flexWrap="wrap">
                <Box
                  fontSize="12px"
                  lineHeight="20px"
                  px="8px"
                  borderRadius="compact"
                  bg="surfaceLight"
                  color="brandGreen700"
                >
                  {formatRange(selected.start, selected.durationMin)}
                </Box>
              </Flex>
              <Flex align="center" gap="2" flexWrap="wrap" data-testid="visit-status-actions">
                {(() => {
                  const action = nextStatusAction(selected.status)
                  if (action) {
                    return (
                      <Button
                        data-testid="visit-advance-status"
                        onClick={() => { void onAdvanceStatus() }}
                        disabled={statusBusy}
                        size="sm"
                        bg="brandGreen"
                        color="white"
                        borderRadius="4px"
                        fontSize="13px"
                        _hover={{ bg: 'brandGreenDark' }}
                      >
                        {statusBusy ? 'Обновляем…' : action.label}
                      </Button>
                    )
                  }
                  return (
                    <Text fontSize="12px" color="textSecondary" data-testid="visit-status-guidance">
                      {guidanceFor(selected.status)}
                    </Text>
                  )
                })()}
                {nextStatusAction(selected.status) ? (
                  <Text fontSize="12px" color="textSecondary" data-testid="visit-status-guidance">
                    {guidanceFor(selected.status)}
                  </Text>
                ) : null}
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
                      {entry.from ? appointmentStatusLabel(entry.from) : '—'} → {appointmentStatusLabel(entry.to)} · {entry.actor}
                    </Text>
                  ))}
                </Box>
              )}
            </Box>

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
