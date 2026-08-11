import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import {
  ApiError,
  copyWaitlist,
  createAppointment,
  createWaitlist,
  fulfillWaitlist,
  getWaitlist,
  getWaitlistMatches,
} from '../../__data__/api'
import type {
  Doctor,
  DurationRule,
  Patient,
  PaymentType,
  Service,
  WaitlistEntry,
  WaitlistKind,
  WaitlistMatchSlot,
  WaitlistPriority,
} from '../../__data__/types'
import { defaultVisitTypeForService, PAYMENT_TYPE_OPTIONS, paymentTypeLabel, resolveBookingDuration } from '../../__data__/booking'
import { formatShortDate } from '../../__data__/dates'
import { fieldStyle, wideFieldStyle } from '../field-style'
import { FilterChip } from '../ui-kit'

const KIND_LABEL: Record<WaitlistKind, string> = {
  from_doctor: 'От врача',
  distant: 'Далёкие слоты',
  reschedule: 'При переносе',
  nearest: 'Ближайший слот',
}

const KINDS: WaitlistKind[] = ['from_doctor', 'distant', 'reschedule', 'nearest']

interface WaitlistPanelProps {
  patients: Patient[]
  services: Service[]
  doctors: Doctor[]
  /** Правила администратора: длительность записи из заявки считается ими же. */
  durationRules?: DurationRule[]
  onOpenCountChange?: (count: number) => void
}

export const WaitlistPanel = ({
  patients,
  services,
  doctors,
  durationRules = [],
  onOpenCountChange,
}: WaitlistPanelProps) => {
  const [items, setItems] = useState<WaitlistEntry[]>([])
  const [openCount, setOpenCount] = useState(0)
  const [kindFilter, setKindFilter] = useState<WaitlistKind | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [matches, setMatches] = useState<WaitlistMatchSlot[]>([])
  const [matchBusy, setMatchBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const [kind, setKind] = useState<WaitlistKind>('nearest')
  const [patientId, setPatientId] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [doctorId, setDoctorId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [priority, setPriority] = useState<WaitlistPriority>('normal')
  const [paymentType, setPaymentType] = useState<PaymentType>('regular')
  const [comment, setComment] = useState('')
  const [insuranceAppointmentId, setInsuranceAppointmentId] = useState('')

  const serviceName = (id: string | null) => (id ? services.find((sv) => sv.id === id)?.name ?? null : null)
  const doctorName = (id: string | null) => (id ? doctors.find((d) => d.id === id)?.name ?? null : null)

  const reload = useCallback(async () => {
    const res = await getWaitlist(kindFilter === 'all' ? undefined : { kind: kindFilter })
    setItems(res.items)
    setOpenCount(res.openCount)
    setLoaded(true)
    onOpenCountChange?.(res.openCount)
  }, [kindFilter, onOpenCountChange])

  useEffect(() => {
    let cancelled = false
    reload().catch((err) => {
      if (!cancelled) setError(err instanceof Error ? err.message : 'Не удалось загрузить лист')
    })
    return () => { cancelled = true }
  }, [reload])

  const selected = useMemo(
    () => items.find((w) => w.id === selectedId) ?? null,
    [items, selectedId],
  )

  const submitForm = async () => {
    setError(null)
    try {
      const created = await createWaitlist({
        kind,
        patientId,
        serviceId: serviceId || null,
        doctorId: doctorId || null,
        dateFrom,
        dateTo,
        priority,
        paymentType,
        comment,
        insuranceAppointmentId: insuranceAppointmentId.trim() || null,
        createdBy: 'operator',
      })
      setFormOpen(false)
      setInsuranceAppointmentId('')
      // Сначала список, потом выбор: при обратном порядке выбранной заявки ещё
      // нет в списке, карточка справа исчезает и появляется заново — мигание
      // на каждое действие.
      await reload()
      setSelectedId(created.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать заявку')
    }
  }

  const onCopy = async () => {
    if (!selected) return
    setError(null)
    try {
      const copy = await copyWaitlist(selected.id)
      await reload()
      setSelectedId(copy.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось скопировать')
    }
  }

  const onMatch = async () => {
    if (!selected || selected.status !== 'open') return
    setMatchBusy(true)
    setError(null)
    try {
      const res = await getWaitlistMatches(selected.id)
      setMatches(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подобрать слоты')
      setMatches([])
    } finally {
      setMatchBusy(false)
    }
  }

  const bookMatch = async (slot: WaitlistMatchSlot) => {
    if (!selected) return
    setError(null)
    try {
      const service = services.find((s) => s.id === selected.serviceId)
      // Длительность считают правила администратора — те же, что и в карточке
      // слота. Константа `?? 30` давала заявке чужой хронометраж и ломала
      // обещание экрана «Правила длительности».
      const visitType = defaultVisitTypeForService(service)
      const durationMin = service
        ? resolveBookingDuration(service, visitType, {
          rules: durationRules,
          requiresEquipment: service.requiresEquipment,
        })
        : 30
      const start = `${slot.date}T${slot.time}:00+03:00`
      const appt = await createAppointment({
        doctorId: slot.doctorId,
        patientId: selected.patientId,
        start,
        durationMin,
        serviceId: selected.serviceId,
        // Заявка помнит основание оплаты: без него запись по ДМС приезжала к
        // регистратору как платная.
        paymentType: selected.paymentType,
        visitType,
        createdByName: 'Оператор колл-центра',
        createdByUnit: 'Колл-центр, Динамо',
      })
      await fulfillWaitlist(selected.id, appt.id)
      setMatches([])
      await reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось записать по заявке')
    }
  }

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      p="4"
      data-arm-section="waitlist"
      data-testid="waitlist-panel"
    >
      <Flex align="center" gap="3" mb="3" wrap="wrap">
        <Text fontSize="18px" fontWeight="700">Лист ожидания</Text>
        <Box
          as="span"
          bg="brandGreenTint"
          color="brandGreen700"
          px="8px"
          h="24px"
          display="inline-flex"
          alignItems="center"
          borderRadius="pill"
          fontSize="12px"
          fontWeight="700"
          data-testid="waitlist-open-count"
        >
          Открыто: {openCount}
        </Box>
        {/* Кнопка рядом с заголовком, а не у правого края: она относится к
            списку, а не к пустому месту в шапке. */}
        <Button
          size="sm"
          variant={formOpen ? 'outline' : 'solid'}
          bg={formOpen ? 'white' : 'brandGreenDark'}
          color={formOpen ? 'textPrimary' : 'white'}
          _hover={{ bg: formOpen ? 'surfaceLight' : 'brandGreenDark' }}
          onClick={() => setFormOpen((v) => !v)}
          data-testid="waitlist-new"
        >
          {formOpen ? 'Отменить создание' : 'Новая заявка'}
        </Button>
      </Flex>

      {formOpen || (loaded && items.length === 0 && kindFilter === 'all') ? null : (
        <Flex gap="6px" mb="3" wrap="wrap" data-testid="waitlist-kind-filters">
          <FilterChip active={kindFilter === 'all'} onClick={() => setKindFilter('all')} label="Все" />
          {KINDS.map((k) => (
            <FilterChip
              key={k}
              active={kindFilter === k}
              onClick={() => setKindFilter(k)}
              label={KIND_LABEL[k]}
              testId={`waitlist-filter-${k}`}
            />
          ))}
        </Flex>
      )}

      {formOpen ? (
        <Stack gap="2" mb="4" p="3" borderWidth="1px" borderColor="borderLight" borderRadius="compact" data-testid="waitlist-form">
          <Text fontSize="14px" fontWeight="700">Новая заявка</Text>
          <Flex gap="2" wrap="wrap">
            <select data-testid="waitlist-kind" style={{ ...fieldStyle, maxWidth: 200 }} value={kind} onChange={(e) => setKind(e.target.value as WaitlistKind)}>
              {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
            <select data-testid="waitlist-patient" style={{ ...fieldStyle, maxWidth: 260 }} value={patientId} onChange={(e) => setPatientId(e.target.value)}>
              <option value="">Пациент</option>
              {patients.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select data-testid="waitlist-service" style={{ ...fieldStyle, maxWidth: 220 }} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
              <option value="">Услуга</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select data-testid="waitlist-doctor" style={{ ...fieldStyle, maxWidth: 220 }} value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
              <option value="">Врач</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </Flex>
          {/* Даты подписаны: «с» и «по» неразличимы, если рядом стоят два пустых поля. */}
          <Flex gap="3" wrap="wrap" align="flex-end">
            <Stack gap="1" flex="0 1 170px" minW="150px">
              <Text as="span" fontSize="11px" color="textSecondary" id="waitlist-date-from-label">Подойдёт с</Text>
              <input
                type="date"
                data-testid="waitlist-date-from"
                aria-labelledby="waitlist-date-from-label"
                style={{ ...fieldStyle, maxWidth: 170 }}
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </Stack>
            <Stack gap="1" flex="0 1 170px" minW="150px">
              <Text as="span" fontSize="11px" color="textSecondary" id="waitlist-date-to-label">По</Text>
              <input
                type="date"
                data-testid="waitlist-date-to"
                aria-labelledby="waitlist-date-to-label"
                style={{ ...fieldStyle, maxWidth: 170 }}
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </Stack>
            <Stack gap="1" flex="0 1 140px" minW="120px">
              <Text as="span" fontSize="11px" color="textSecondary" id="waitlist-priority-label">Приоритет</Text>
              <select
                data-testid="waitlist-priority"
                aria-labelledby="waitlist-priority-label"
                style={{ ...fieldStyle, maxWidth: 140 }}
                value={priority}
                onChange={(e) => setPriority(e.target.value as WaitlistPriority)}
              >
                <option value="normal">Обычный</option>
                <option value="high">Высокий</option>
              </select>
            </Stack>
            <Stack gap="1" flex="0 1 180px" minW="150px">
              <Text as="span" fontSize="11px" color="textSecondary" id="waitlist-payment-label">
                Основание оплаты
              </Text>
              <select
                data-testid="waitlist-payment"
                aria-labelledby="waitlist-payment-label"
                style={{ ...fieldStyle, maxWidth: 180 }}
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as PaymentType)}
              >
                {PAYMENT_TYPE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </Stack>
          </Flex>
          <input
            data-testid="waitlist-comment"
            style={wideFieldStyle}
            placeholder="Комментарий"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <input
            data-testid="waitlist-insurance-id"
            style={wideFieldStyle}
            placeholder="Номер уже существующей записи, если пациент ждёт время получше"
            value={insuranceAppointmentId}
            onChange={(e) => setInsuranceAppointmentId(e.target.value)}
          />
          <Flex gap="2" justify="flex-end">
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Отмена</Button>
            <Button size="sm" bg="brandGreenDark" color="white" onClick={() => { void submitForm() }} data-testid="waitlist-submit">
              Создать
            </Button>
          </Flex>
        </Stack>
      ) : null}

      {error ? (
        <Text color="danger" fontSize="13px" mb="2" data-testid="waitlist-error">{error}</Text>
      ) : null}

      {/* Экран показывает то, что нужно на текущем шаге: пока заполняется
          форма — только форму; пока заявок нет — только приглашение завести
          первую; панель «Выберите заявку» появляется, когда выбирать есть из
          чего. */}
      {formOpen ? null : loaded && items.length === 0 ? (
        <Text fontSize="13px" color="textSecondary" py="2" data-testid="waitlist-empty">
          Заявок нет
        </Text>
      ) : (
        <Flex gap="4" align="start" wrap="wrap">
          <Box flex="1" minW="280px">
            <Stack gap="1" data-testid="waitlist-list">
              {items.map((w) => (
                <Box
                  key={w.id}
                  as="button"
                  textAlign="left"
                  p="2"
                  borderWidth="1px"
                  borderColor={selectedId === w.id ? 'brandGreen' : 'borderLight'}
                  borderRadius="compact"
                  bg={selectedId === w.id ? 'brandGreenFaint' : 'white'}
                  onClick={() => { setSelectedId(w.id); setMatches([]) }}
                  data-testid={`waitlist-row-${w.id}`}
                  data-kind={w.kind}
                  data-status={w.status}
                >
                  <Flex gap="2" align="center">
                    {/* Служебный номер заявки оператору не нужен: он ищет по фамилии
                        и по тому, чего пациент ждёт. */}
                    <Text fontSize="13px" fontWeight="600">{w.patientName ?? '—'}</Text>
                    <Text fontSize="12px" color="textSecondary">{KIND_LABEL[w.kind]}</Text>
                    <Box flex="1" />
                    <Text fontSize="12px">{w.status === 'open' ? 'Открыта' : w.status === 'fulfilled' ? 'Закрыта' : 'Отменена'}</Text>
                  </Flex>
                  <Text fontSize="12px" color="textSecondary">
                    {serviceName(w.serviceId) ?? doctorName(w.doctorId) ?? 'Без услуги'}
                    {w.patientPhone ? `, ${w.patientPhone}` : ''}
                  </Text>
                  <Text fontSize="12px" color="textSecondary">
                    {formatShortDate(w.dateFrom)} – {formatShortDate(w.dateTo)}
                    {w.insuranceAppointmentId ? ', есть запасная запись' : ''}
                  </Text>
                </Box>
              ))}
            </Stack>
          </Box>

          <Box w="320px" flex="none" data-testid="waitlist-detail">
            {selected ? (
              <Stack gap="2">
                <Text fontSize="14px" fontWeight="700">{selected.patientName ?? 'Заявка'}</Text>
                <Text fontSize="13px">{KIND_LABEL[selected.kind]}, приоритет {selected.priority === 'high' ? 'высокий' : 'обычный'}</Text>
                <Text fontSize="13px" color="textSecondary">Оплата: {paymentTypeLabel(selected.paymentType)}</Text>
                <Text fontSize="13px">{selected.comment || 'Без комментария'}</Text>
                {selected.fulfilledAppointmentId ? (
                  <Text fontSize="12px" color="brandGreen700" data-testid="waitlist-fulfilled-by">
                    Закрыта записью в расписании
                  </Text>
                ) : null}
                <Flex gap="6px" wrap="wrap">
                  <Button size="sm" variant="outline" onClick={() => { void onCopy() }} data-testid="waitlist-copy">
                    Копировать
                  </Button>
                  {selected.status === 'open' ? (
                    <Button size="sm" bg="brandGreenDark" color="white" disabled={matchBusy} onClick={() => { void onMatch() }} data-testid="waitlist-match">
                      {matchBusy ? 'Подбор…' : 'Подобрать'}
                    </Button>
                  ) : null}
                </Flex>
                {matches.length > 0 ? (
                  <Stack gap="1" data-testid="waitlist-matches">
                    <Text fontSize="12px" fontWeight="700">Свободные слоты</Text>
                    {matches.map((m) => (
                      <Flex
                        key={`${m.date}-${m.time}-${m.doctorId}`}
                        align="center"
                        gap="2"
                        p="1"
                        borderWidth="1px"
                        borderColor="borderLight"
                        borderRadius="compact"
                        data-testid={`waitlist-match-${m.date}-${m.time}-${m.doctorId}`}
                      >
                        <Text fontSize="12px" flex="1">
                          {m.date} {m.time}, {m.doctorName}
                        </Text>
                        <Button size="xs" onClick={() => { void bookMatch(m) }} data-testid={`waitlist-book-${m.date}-${m.time}-${m.doctorId}`}>
                          Записать
                        </Button>
                      </Flex>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            ) : (
              <Text fontSize="13px" color="textSecondary" data-testid="waitlist-pick-hint">
                Выберите заявку слева, чтобы подобрать слот
              </Text>
            )}
          </Box>
        </Flex>
      )}
    </Box>
  )
}

