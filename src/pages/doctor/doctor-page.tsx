import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'

import { getAppointments, getServices, rescheduleAppointment } from '../../__data__/api'
import type { Appointment, Service } from '../../__data__/types'

import { DayList } from './day-list'
import {
  emptyVisitFormState,
  isVisitFormValid,
  VisitForm,
  type VisitFormState,
} from './visit-form'

const computeAgeYears = (birthDate: string | null): string | null => {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let years = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) years -= 1
  return `${b.getFullYear()} г. р. · ${years} ${years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}`
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
    case 'cash': return 'Наличные'
    case 'card': return 'Карта'
    case 'insurance': return 'ДМС'
    default: return paymentType
  }
}

export const DoctorPage = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [visitForm, setVisitForm] = useState<Record<string, VisitFormState>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const [appts, svcs] = await Promise.all([getAppointments(), getServices()])
        if (cancelled) return
        setAppointments(appts.items)
        setServices(svcs.items)
        if (appts.items.length > 0 && !selectedId) {
          setSelectedId(appts.items[0].id)
        }
      } catch (err) {
        if (cancelled) return
        setLoadError(err instanceof Error ? err.message : 'Не удалось загрузить данные')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const sortedAppointments = useMemo(
    () => [...appointments].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [appointments],
  )

  const selected = useMemo(
    () => sortedAppointments.find((a) => a.id === selectedId) ?? null,
    [sortedAppointments, selectedId],
  )

  const currentFormState: VisitFormState = selected
    ? visitForm[selected.id] ?? emptyVisitFormState
    : emptyVisitFormState

  const updateCurrentForm = useCallback(
    (next: VisitFormState) => {
      if (!selected) return
      setVisitForm((prev) => ({ ...prev, [selected.id]: next }))
    },
    [selected],
  )

  const onFinish = useCallback(async () => {
    if (!selected) return
    const state = visitForm[selected.id] ?? emptyVisitFormState
    if (!isVisitFormValid(state) || selected.status === 'completed') return
    setIsSubmitting(true)
    try {
      const updated = await rescheduleAppointment(selected.id, {
        status: 'completed',
        complaints: state.complaints,
        diagnosis: state.diagnosis,
        visitType: state.visitType,
        performedServiceIds: state.selectedServiceIds,
        recommendations: state.recommendations,
        nextVisit: state.nextVisit || null,
      })
      setAppointments((prev) => prev.map((a) => (a.id === updated.id ? updated : a)))
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Не удалось завершить приём')
    } finally {
      setIsSubmitting(false)
    }
  }, [selected, visitForm])

  if (loadError) {
    return (
      <Flex direction="column" p="4" gap="2">
        <Text fontSize="16px" fontWeight="700" color="danger">Ошибка загрузки</Text>
        <Text fontSize="13px" color="textSecondary">{loadError}</Text>
      </Flex>
    )
  }

  if (sortedAppointments.length === 0) {
    return (
      <Flex direction="column" p="4" gap="2">
        <Text fontSize="16px" fontWeight="700" color="textPrimary">АРМ врача</Text>
        <Text fontSize="13px" color="textSecondary">Загрузка приёмов…</Text>
      </Flex>
    )
  }

  return (
    <Flex h="100%" minH="0" bg="surfaceLight" p="3" gap="3" data-testid="doctor-page">
      <DayList
        appointments={sortedAppointments}
        selectedId={selectedId}
        onSelect={setSelectedId}
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
                  bg={selected.status === 'completed' ? 'brandGreenTint' : 'brandOrange'}
                  color={selected.status === 'completed' ? 'brandGreen700' : 'textPrimary'}
                  data-testid="visit-status-badge"
                >
                  {selected.status === 'completed' ? 'Завершён' : 'В работе'}
                </Box>
                <Box flex="1" />
                <Text fontSize="12px" color="textSecondary" fontFamily="mono" data-testid="visit-uid">
                  {selected.patientUid ?? `UID ${selected.patientId}`}
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
              />
            </Box>
          </>
        )}
      </Box>
    </Flex>
  )
}