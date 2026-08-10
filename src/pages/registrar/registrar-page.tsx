import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { useLocation } from 'react-router-dom'

import { confirmAppointment, getAppointments, getDoctors, getServices, payAppointment, rescheduleAppointment } from '../../__data__/api'
import { formatShortDate, parseArmDate } from '../../__data__/dates'
import type { Appointment, AppointmentStatus, Doctor, Patient, Service } from '../../__data__/types'

import { PatientCardForm } from './patient-card-form'
import { PatientCardView } from './patient-card-view'
import { PatientSearch } from './patient-search'
import { QueueFilter, QueueTable } from './queue-table'
import { TicketPrint } from './ticket-print'
import { VisitCard } from './visit-card'

/** Интервал фонового обновления очереди (мс). В тестах можно ускорить vi.setSystemTime + advanceTimers. */
export const REGISTRAR_POLL_MS = 3000

const countByStatus = (items: Appointment[], status: AppointmentStatus): number =>
  items.reduce((acc, a) => (a.status === status ? acc + 1 : acc), 0)

const applyFilter = (items: Appointment[], filter: QueueFilter): Appointment[] => {
  if (filter === 'all') return items
  return items.filter((a) => a.status === filter)
}

const formatRub = (amount: number): string =>
  `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`

const buildPriceMap = (services: Service[]): Map<string, number> => {
  const map = new Map<string, number>()
  for (const s of services) map.set(s.id, s.price)
  return map
}

const appointmentAmount = (a: Appointment, priceMap: Map<string, number>): number => {
  const ids = a.performedServiceIds.length > 0 ? a.performedServiceIds : a.serviceId ? [a.serviceId] : []
  let sum = 0
  for (const id of ids) {
    const price = priceMap.get(id)
    if (typeof price === 'number') sum += price
  }
  return sum
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
  const selectedDate = parseArmDate(location.search)

  const [items, setItems] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [payBusy, setPayBusy] = useState(false)
  const [ticketVisitId, setTicketVisitId] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [panel, setPanel] = useState<'queue' | 'new' | 'card'>('queue')
  const [openedPatient, setOpenedPatient] = useState<Patient | null>(null)
  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId

  const applyAppointments = useCallback((next: Appointment[]) => {
    setItems(next)
    setLastUpdatedAt(new Date().toISOString())
    const keep = selectedIdRef.current
    if (keep && next.some((a) => a.id === keep)) {
      setSelectedId(keep)
    } else if (next.length > 0) {
      setSelectedId((prev) => (prev && next.some((a) => a.id === prev) ? prev : next[0].id))
    } else {
      setSelectedId(null)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoaded(false)
    setLoadError(null)
    Promise.all([getAppointments(selectedDate), getServices(), getDoctors()])
      .then(([apptsRes, servicesRes, doctorsRes]) => {
        if (cancelled) return
        applyAppointments(apptsRes.items)
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
      if (panel !== 'queue') {
        setPanel('queue')
        setOpenedPatient(null)
        return
      }
      setSelectedId(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panel])

  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    setBusy(true)
    setActionError(null)
    try {
      await rescheduleAppointment(id, { status })
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
    const amount = appointmentAmount(visit, priceMap)
    if (amount <= 0) {
      setActionError('Нет суммы к оплате')
      return
    }
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
    const filtered = applyFilter(items, filter)
    return [...filtered].sort((a, b) => a.start.localeCompare(b.start))
  }, [items, filter])
  const selected = useMemo(
    () => items.find((a) => a.id === selectedId) ?? null,
    [items, selectedId],
  )

  const waitingCount = countByStatus(items, 'scheduled')
  const arrivedCount = countByStatus(items, 'arrived')
  const inProgressCount = countByStatus(items, 'in_progress')
  const completedCount = countByStatus(items, 'completed')
  const noShowCount = countByStatus(items, 'no_show')

  const shiftCash = useMemo(
    () => items
      .filter((a) => a.paidAt != null)
      .reduce((acc, a) => acc + (typeof a.paidAmount === 'number' ? a.paidAmount : appointmentAmount(a, priceMap)), 0),
    [items, priceMap],
  )

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
          bg="brandGreen"
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
            Смена · {formatShortDate(selectedDate)}
          </Box>
          {lastUpdatedAt ? (
            <Text fontSize="12px" color="textSecondary" data-testid="registrar-last-updated">
              Обновлено {formatUpdatedAt(lastUpdatedAt)}
            </Text>
          ) : null}
        </Stack>
        <Box flex="1" />
        <Stack direction="row" gap="24px" align="center">
          <Stack gap="0" align="flex-end">
            <Text fontSize="12px" color="textSecondary">Ожидают приёма</Text>
            <Text fontSize="20px" fontWeight="700" fontFamily="mono" data-testid="counter-waiting">
              {waitingCount}
            </Text>
          </Stack>
          <Stack gap="0" align="flex-end">
            <Text fontSize="12px" color="textSecondary">Отмечено приходов</Text>
            <Text fontSize="20px" fontWeight="700" fontFamily="mono" data-testid="counter-arrived">
              {arrivedCount}
            </Text>
          </Stack>
          <Stack gap="0" align="flex-end">
            <Text fontSize="12px" color="textSecondary">Касса смены</Text>
            <Text fontSize="20px" fontWeight="700" fontFamily="mono" data-testid="counter-cash">
              {formatRub(shiftCash)}
            </Text>
          </Stack>
          <Stack gap="0" align="flex-end">
            <Text fontSize="12px" color="textSecondary">Завершено</Text>
            <Text fontSize="14px" fontFamily="mono">
              на приёме {inProgressCount} · готово {completedCount} · неявка {noShowCount}
            </Text>
          </Stack>
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

      <PatientSearch
        onSelect={(patient) => {
          setOpenedPatient(patient)
          setPanel('card')
        }}
        onCreateNew={() => {
          setOpenedPatient(null)
          setPanel('new')
        }}
      />

      {panel === 'new' ? (
        <PatientCardForm
          doctors={doctors}
          services={services}
          selectedDate={selectedDate}
          onCreated={(patient) => {
            setOpenedPatient(patient)
            void refreshSoft()
          }}
          onOpenExisting={(patient) => {
            setOpenedPatient(patient)
            setPanel('card')
          }}
          onCancel={() => setPanel('queue')}
        />
      ) : null}

      {panel === 'card' && openedPatient ? (
        <PatientCardView
          patient={openedPatient}
          onBack={() => {
            setPanel('queue')
            setOpenedPatient(null)
          }}
          onCreateNew={() => {
            setOpenedPatient(null)
            setPanel('new')
          }}
        />
      ) : null}

      {panel === 'queue' && isEmpty ? (
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

      {panel === 'queue' ? (
        <Flex flex="1" gap="12px" minH="0">
          <QueueTable
            items={visibleItems}
            serviceNames={serviceNames}
            selectedId={selectedId}
            filter={filter}
            onFilterChange={setFilter}
            onSelect={setSelectedId}
            onMarkArrived={(id) => { void updateStatus(id, 'arrived') }}
            onMarkWaiting={(id) => { void updateStatus(id, 'scheduled') }}
            onMarkNoShow={(id) => { void updateStatus(id, 'no_show') }}
            onPrintTicket={(id) => setTicketVisitId(id)}
          />
          <VisitCard
            visit={selected}
            priceMap={priceMap}
            serviceNames={serviceNames}
            onMarkArrived={() => { if (selected) void updateStatus(selected.id, 'arrived') }}
            onMarkWaiting={() => { if (selected) void updateStatus(selected.id, 'scheduled') }}
            onMarkNoShow={() => { if (selected) void updateStatus(selected.id, 'no_show') }}
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
