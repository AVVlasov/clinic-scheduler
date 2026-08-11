import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { resolveSection } from '../../__data__/arm-nav'
import { confirmAppointment, getAppointments, getDoctorCards, getDoctors, getDurationRules, getServices, payAppointment, rescheduleAppointment } from '../../__data__/api'
import { formatShortDate, parseArmDate, withArmSection } from '../../__data__/dates'
import type { Appointment, AppointmentStatus, Doctor, DurationRule, Patient, Service } from '../../__data__/types'

import { buildPriceMap, cashDue, formatRub, servicesTotal, shiftCashTotal } from './payment'
import { matchesQueueQuery } from './queue-search'
import { PatientCardForm } from './patient-card-form'
import { PatientCardView } from './patient-card-view'
import { PatientSearch } from './patient-search'
import { QueueFilter, QueueTable } from './queue-table'
import { StatTile } from '../ui-kit'
import { TicketPrint } from './ticket-print'
import { VisitCard } from './visit-card'

/** Интервал фонового обновления очереди (мс). В тестах можно ускорить vi.setSystemTime + advanceTimers. */
export const REGISTRAR_POLL_MS = 3000

/**
 * Автор действий стойки в истории записи. История видна врачу и оператору, и
 * подпись «operator» под приходом, отмеченным регистратором, — неправда.
 */
const REGISTRAR_ACTOR = 'Регистратура'

const countByStatus = (items: Appointment[], status: AppointmentStatus): number =>
  items.reduce((acc, a) => (a.status === status ? acc + 1 : acc), 0)

const applyFilter = (items: Appointment[], filter: QueueFilter): Appointment[] => {
  if (filter === 'all') return items
  return items.filter((a) => a.status === filter)
}

const formatUpdatedAt = (iso: string): string => {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

export const RegistrarPage = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const selectedDate = parseArmDate(location.search)
  const section = resolveSection('registrar', searchParams.get('section'))

  const [items, setItems] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  // Правила длительности нужны быстрой записи на стойке: расчёт общий с
  // оператором. Грузятся отдельно от очереди — очередь важнее, и её загрузка не
  // должна зависеть от справочника правил.
  const [durationRules, setDurationRules] = useState<DurationRule[]>([])
  /** Площадка приёма для бланка талона: справочник карточек врачей. */
  const [siteByDoctorId, setSiteByDoctorId] = useState<Map<string, string>>(new Map())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [query, setQuery] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [payBusy, setPayBusy] = useState(false)
  const [ticketVisitId, setTicketVisitId] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [openedPatient, setOpenedPatient] = useState<Patient | null>(null)

  const navigate = useNavigate()
  /** Переход между разделами регистратора — через адрес, как и в шапке АРМ. */
  const goSection = useCallback((next: string) => {
    navigate(withArmSection(location.search, next))
  }, [navigate, location.search])

  /**
   * Выбор карточки принадлежит человеку, а не опросу. Первая строка
   * подставляется только при открытии смены (`autoSelect`); фоновое обновление
   * лишь сохраняет уже выбранное и отпускает выбор, если запись из смены ушла.
   * Раньше опрос каждые три секунды открывал первую строку поверх закрытой
   * карточки, и регистратор терял место в очереди.
   */
  const applyAppointments = useCallback((next: Appointment[], options?: { autoSelect?: boolean }) => {
    setItems(next)
    setLastUpdatedAt(new Date().toISOString())
    setSelectedId((prev) => {
      if (prev) return next.some((a) => a.id === prev) ? prev : null
      return options?.autoSelect && next.length > 0 ? next[0].id : null
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    // Справочники — вспомогательные: их отказ не должен касаться очереди,
    // ради которой открыт экран. Поэтому вызов и его синхронные ошибки уходят в
    // цепочку промиса, а не в рендер.
    void Promise.resolve()
      .then(() => getDurationRules())
      .then((res) => {
        if (!cancelled) setDurationRules(res.items)
      })
      .catch(() => undefined)
    void Promise.resolve()
      .then(() => getDoctorCards())
      .then((res) => {
        if (cancelled) return
        const map = new Map<string, string>()
        for (const card of res.items) map.set(card.id, card.site)
        setSiteByDoctorId(map)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoaded(false)
    setLoadError(null)
    Promise.all([getAppointments(selectedDate), getServices(), getDoctors()])
      .then(([apptsRes, servicesRes, doctorsRes]) => {
        if (cancelled) return
        applyAppointments(apptsRes.items, { autoSelect: true })
        setServices(servicesRes.items)
        setDoctors(doctorsRes.items)
        setLoadError(null)
        setIsLoaded(true)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Не удалось загрузить очередь'
        setLoadError(message)
      })
    return () => {
      cancelled = true
    }
  }, [selectedDate, reloadToken, applyAppointments])

  const refreshSoft = useCallback(async () => {
    const [apptsRes, servicesRes] = await Promise.all([
      getAppointments(selectedDate),
      getServices(),
    ])
    applyAppointments(apptsRes.items)
    setServices(servicesRes.items)
  }, [applyAppointments, selectedDate])

  useEffect(() => {
    if (!isLoaded || loadError) return undefined
    let cancelled = false
    const id = window.setInterval(() => {
      if (cancelled) return
      refreshSoft().catch(() => {
        // мягкий poll не стирает экран
      })
    }, REGISTRAR_POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [isLoaded, loadError, refreshSoft])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setTicketVisitId(null)
      if (section !== 'queue') {
        setOpenedPatient(null)
        goSection('queue')
        return
      }
      setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [section, goSection])

  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    setBusy(true)
    setActionError(null)
    try {
      await rescheduleAppointment(id, { status, actor: REGISTRAR_ACTOR })
      await refreshSoft()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось обновить статус'
      setActionError(message)
      try {
        await refreshSoft()
      } catch {
        // ignore
      }
    } finally {
      setBusy(false)
    }
  }, [refreshSoft])

  const priceMap = useMemo(() => buildPriceMap(services), [services])

  const payVisit = useCallback(async (id: string) => {
    const visit = items.find((a) => a.id === id)
    if (!visit || visit.paidAt) return
    // Считать нечего, если в визите нет ни одной услуги. Ноль по ДМС — это не
    // «нечего считать», а результат расчёта: счёт уходит страховой, и визит
    // всё равно должен закрыться отметкой об оплате.
    if (servicesTotal(visit, priceMap) <= 0) {
      setActionError('В визите нет услуг — сумму оплаты определить не по чему')
      return
    }
    const amount = cashDue(visit, priceMap)
    setPayBusy(true)
    setActionError(null)
    try {
      await payAppointment(id, { amount, paymentType: visit.paymentType })
      await refreshSoft()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Не удалось провести оплату')
    } finally {
      setPayBusy(false)
    }
  }, [items, priceMap, refreshSoft])

  const [confirmBusy, setConfirmBusy] = useState(false)
  const confirmVisit = useCallback(async (id: string) => {
    const visit = items.find((a) => a.id === id)
    if (!visit || visit.confirmed) return
    setConfirmBusy(true)
    setActionError(null)
    try {
      await confirmAppointment(id)
      await refreshSoft()
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Не удалось подтвердить запись')
    } finally {
      setConfirmBusy(false)
    }
  }, [items, refreshSoft])

  const ticketVisit = useMemo(
    () => (ticketVisitId ? items.find((a) => a.id === ticketVisitId) ?? null : null),
    [ticketVisitId, items],
  )

  const serviceNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of services) map.set(s.id, s.name)
    return map
  }, [services])

  const visibleItems = useMemo(() => {
    const filtered = applyFilter(items, filter).filter((a) => matchesQueueQuery(a, query))
    return [...filtered].sort((a, b) => a.start.localeCompare(b.start))
  }, [items, filter, query])
  const selected = useMemo(
    () => items.find((a) => a.id === selectedId) ?? null,
    [items, selectedId],
  )

  const waitingCount = countByStatus(items, 'scheduled')
  const arrivedCount = countByStatus(items, 'arrived')
  const inProgressCount = countByStatus(items, 'in_progress')
  const completedCount = countByStatus(items, 'completed')
  const noShowCount = countByStatus(items, 'no_show')
  // Отменённые в счётчиках были пропущены, и семнадцать строк таблицы
  // складывались в шестнадцать по плиткам: разошлись — значит одна из двух
  // цифр врёт, а какая именно, на экране не видно.
  const cancelledCount = countByStatus(items, 'cancelled')

  const shiftCash = useMemo(() => shiftCashTotal(items, priceMap), [items, priceMap])

  if (loadError && !isLoaded) {
    return (
      <Stack h="100%" direction="column" gap="12px" p="12px" bg="surfaceLight" data-testid="registrar-error">
        <Text fontSize="16px" fontWeight="700" color="danger">Ошибка загрузки</Text>
        <Text fontSize="13px" color="textSecondary">{loadError}</Text>
        <Box
          as="button"
          data-testid="registrar-retry"
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
      </Stack>
    )
  }

  if (!isLoaded) {
    return (
      <Stack h="100%" direction="column" gap="12px" p="12px" bg="surfaceLight" data-testid="registrar-loading">
        <Text fontSize="16px" fontWeight="700" color="textPrimary">АРМ регистратора</Text>
        <Text fontSize="13px" color="textSecondary">Загрузка очереди…</Text>
      </Stack>
    )
  }

  const isEmpty = items.length === 0
  const emptyReason = 'Сегодня приёмов нет — очередь пуста.'

  return (
    <Stack h="100%" direction="column" gap="12px" p="12px" bg="surfaceLight" data-date={selectedDate} data-testid="registrar-page">
      <Flex
        align="center"
        gap="16px"
        bg="white"
        borderWidth="1px"
        borderColor="borderLight"
        borderRadius="compact"
        p="12px 16px"
      >
        <Stack gap="0">
          <Box fontSize="12px" color="textSecondary">АРМ регистратора</Box>
          <Box fontSize="18px" fontWeight="700" color="brandGreen700" data-testid="registrar-shift-date">
            Смена {formatShortDate(selectedDate)}
          </Box>
          {lastUpdatedAt ? (
            <Text fontSize="12px" color="textSecondary" data-testid="registrar-last-updated">
              Обновлено {formatUpdatedAt(lastUpdatedAt)}
            </Text>
          ) : null}
        </Stack>
        <Box flex="1" />
        <Stack direction="row" gap="24px" align="center">
          <StatTile label="Ожидают приёма" testId="counter-waiting" value={String(waitingCount)} />
          <StatTile label="Отмечено приходов" testId="counter-arrived" value={String(arrivedCount)} />
          <StatTile label="Касса смены" testId="counter-cash" value={formatRub(shiftCash)} />
          {/* Три разных счётчика — три колонки, а не строка «а · б · в»:
              под заголовком «Завершено» стояли и «на приёме», и «неявка». */}
          <StatTile label="На приёме" testId="counter-in-progress" value={String(inProgressCount)} />
          <StatTile label="Завершено" testId="counter-completed" value={String(completedCount)} />
          <StatTile label="Неявок" testId="counter-no-show" value={String(noShowCount)} />
          <StatTile label="Отменено" testId="counter-cancelled" value={String(cancelledCount)} />
        </Stack>
      </Flex>

      {actionError ? (
        <Box
          bg="danger"
          color="white"
          px="16px"
          py="8px"
          borderRadius="compact"
          fontSize="14px"
          data-testid="registrar-action-error"
        >
          {actionError}
        </Box>
      ) : null}

      {section === 'search' ? (
        openedPatient ? (
          <PatientCardView
            patient={openedPatient}
            onBack={() => setOpenedPatient(null)}
            onCreateNew={() => {
              setOpenedPatient(null)
              goSection('new-patient')
            }}
          />
        ) : (
          <PatientSearch
            onSelect={(patient) => setOpenedPatient(patient)}
            onCreateNew={() => {
              setOpenedPatient(null)
              goSection('new-patient')
            }}
          />
        )
      ) : null}

      {section === 'new-patient' ? (
        <PatientCardForm
          doctors={doctors}
          services={services}
          durationRules={durationRules}
          selectedDate={selectedDate}
          onCreated={(patient) => {
            setOpenedPatient(patient)
            void refreshSoft()
          }}
          onOpenExisting={(patient) => {
            setOpenedPatient(patient)
            goSection('search')
          }}
          onCancel={() => goSection('queue')}
        />
      ) : null}

      {section === 'queue' && isEmpty ? (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="borderLight"
          borderRadius="compact"
          p="16px"
          data-testid="registrar-empty"
        >
          <Text fontSize="13px" color="textSecondary" data-testid="registrar-empty-reason">
            {emptyReason}
          </Text>
        </Box>
      ) : null}

      {section === 'queue' ? (
        <Flex flex="1" gap="12px" minH="0">
          <QueueTable
            items={visibleItems}
            totalCount={items.length}
            serviceNames={serviceNames}
            priceMap={priceMap}
            selectedId={selectedId}
            filter={filter}
            query={query}
            onQueryChange={setQuery}
            onFilterChange={setFilter}
            onSelect={setSelectedId}
            onMarkArrived={(id) => { void updateStatus(id, 'arrived') }}
            onMarkWaiting={(id) => { void updateStatus(id, 'scheduled') }}
            onMarkNoShow={(id) => { void updateStatus(id, 'no_show') }}
            onReturnToQueue={(id) => { void updateStatus(id, 'scheduled') }}
            onPay={(id) => { void payVisit(id) }}
            onPrintTicket={(id) => setTicketVisitId(id)}
          />
          <VisitCard
            visit={selected}
            priceMap={priceMap}
            serviceNames={serviceNames}
            onMarkArrived={() => { if (selected) void updateStatus(selected.id, 'arrived') }}
            onMarkWaiting={() => { if (selected) void updateStatus(selected.id, 'scheduled') }}
            onMarkNoShow={() => { if (selected) void updateStatus(selected.id, 'no_show') }}
            onReturnToQueue={() => { if (selected) void updateStatus(selected.id, 'scheduled') }}
            onPay={() => { if (selected) void payVisit(selected.id) }}
            onPrintTicket={() => { if (selected) setTicketVisitId(selected.id) }}
            onConfirm={() => { if (selected) void confirmVisit(selected.id) }}
            payBusy={payBusy}
            confirmBusy={confirmBusy}
          />
        </Flex>
      ) : null}

      {ticketVisit ? (
        <TicketPrint
          visit={ticketVisit}
          doctor={doctors.find((d) => d.id === ticketVisit.doctorId) ?? null}
          service={services.find((s) => s.id === ticketVisit.serviceId) ?? null}
          site={siteByDoctorId.get(ticketVisit.doctorId) ?? null}
          onClose={() => setTicketVisitId(null)}
        />
      ) : null}

      {busy ? (
        <Box position="fixed" top="12px" right="12px" fontSize="12px" color="textSecondary">
          Обновление…
        </Box>
      ) : null}
    </Stack>
  )
}
