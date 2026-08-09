import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

import { getAppointments, getServices, rescheduleAppointment } from '../../__data__/api'
import type { Appointment, AppointmentStatus, Service } from '../../__data__/types'

import { QueueFilter, QueueTable } from './queue-table'
import { VisitCard } from './visit-card'

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

export const RegistrarPage = () => {
  const [items, setItems] = useState<Appointment[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<QueueFilter>('all')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    Promise.all([getAppointments(), getServices()])
      .then(([apptsRes, servicesRes]) => {
        if (cancelled) return
        setItems(apptsRes.items)
        setServices(servicesRes.items)
        if (apptsRes.items.length > 0) setSelectedId(apptsRes.items[0].id)
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
  }, [])

  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    setBusy(true)
    try {
      const updated = await rescheduleAppointment(id, { status })
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)))
      setLoadError(null)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Не удалось обновить статус'
      setLoadError(message)
    } finally {
      setBusy(false)
    }
  }, [])

  const priceMap = useMemo(() => buildPriceMap(services), [services])

  const visibleItems = useMemo(() => applyFilter(items, filter), [items, filter])
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
      .filter((a) => a.status === 'completed')
      .reduce((acc, a) => acc + appointmentAmount(a, priceMap), 0),
    [items, priceMap],
  )

  if (loadError) {
    return (
      <Stack h="100%" direction="column" gap="12px" p="12px" bg="surfaceLight" data-testid="registrar-error">
        <Text fontSize="16px" fontWeight="700" color="danger">Ошибка загрузки</Text>
        <Text fontSize="13px" color="textSecondary">{loadError}</Text>
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
    <Stack h="100%" direction="column" gap="12px" p="12px" bg="surfaceLight">
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
          <Box fontSize="18px" fontWeight="700" color="brandGreen700">
            Смена · {new Date().toLocaleDateString('ru-RU')}
          </Box>
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

      {loadError ? (
        <Box
          bg="danger"
          color="white"
          px="16px"
          py="8px"
          borderRadius="compact"
          fontSize="14px"
          data-testid="registrar-error"
        >
          {loadError}
        </Box>
      ) : null}

      {isEmpty ? (
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

      <Flex flex="1" gap="12px" minH="0">
        <QueueTable
          items={visibleItems}
          selectedId={selectedId}
          filter={filter}
          onFilterChange={setFilter}
          onSelect={setSelectedId}
          onMarkArrived={(id) => { void updateStatus(id, 'arrived') }}
          onMarkWaiting={(id) => { void updateStatus(id, 'scheduled') }}
          onMarkNoShow={(id) => { void updateStatus(id, 'no_show') }}
        />
        <VisitCard
          visit={selected}
          priceMap={priceMap}
          onMarkArrived={() => { if (selected) void updateStatus(selected.id, 'arrived') }}
          onMarkWaiting={() => { if (selected) void updateStatus(selected.id, 'scheduled') }}
          onMarkNoShow={() => { if (selected) void updateStatus(selected.id, 'no_show') }}
        />
      </Flex>

      {busy ? (
        <Box position="fixed" top="12px" right="12px" fontSize="12px" color="textSecondary">
          Обновление…
        </Box>
      ) : null}
    </Stack>
  )
}