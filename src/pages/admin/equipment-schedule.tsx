import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

import { getEquipmentDay } from '../../__data__/api'
import type { EquipmentDay, EquipmentDayItem, EquipmentSlot } from '../../__data__/types'

/**
 * «Оборудование и кабинеты» (ФТ 3.1.1, 3.1.2, 3.8.2) — расписание в разрезе
 * второго ресурса. Занятость не ведётся отдельным журналом: она считается по
 * записям на услуги ресурса, поэтому лента аппарата и сетка врача не могут
 * разойтись.
 */

const VIEWS = [
  { id: 'day', label: 'Лента дня' },
  { id: 'list', label: 'Список ресурсов' },
] as const

type ViewId = (typeof VIEWS)[number]['id']

const SLOT_STYLE: Record<EquipmentSlot['state'], { bg: string; border: string; label: string }> = {
  free: { bg: 'white', border: 'borderLight', label: 'свободно' },
  booked: { bg: 'brandGreenTint', border: 'brandGreen', label: 'занято записью' },
  repair: { bg: 'brandOrange', border: 'brandOrangeDark', label: 'ремонт' },
  closed: { bg: 'surfaceLight', border: 'borderLight', label: 'вне графика' },
}

const KIND_LABEL: Record<EquipmentDayItem['kind'], string> = {
  apparatus: 'Аппарат',
  room: 'Кабинет',
}

const formatDate = (date: string): string => {
  const [, mm, dd] = date.split('-')
  return `${dd}.${mm}`
}

const hourMarks = (slots: EquipmentSlot[]): Array<{ time: string; span: number }> => {
  const marks: Array<{ time: string; span: number }> = []
  for (const slot of slots) {
    const hour = slot.time.slice(0, 2)
    const last = marks[marks.length - 1]
    if (last && last.time.slice(0, 2) === hour) {
      last.span += 1
      continue
    }
    marks.push({ time: `${hour}:00`, span: 1 })
  }
  return marks
}

/** Пары «общий кабинет» без повторов A↔B: иначе одна связь печатается дважды. */
const sharedPairs = (items: EquipmentDayItem[]): Array<{ cabinet: string; names: string[] }> => {
  const seen = new Set<string>()
  const pairs: Array<{ cabinet: string; names: string[] }> = []
  for (const item of items) {
    for (const other of item.sharedWith) {
      const key = [item.name, other].sort().join('|')
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ cabinet: `каб. ${item.cabinet}`, names: [item.name, other] })
    }
  }
  return pairs
}

interface EquipmentScheduleProps {
  date: string
}

export const EquipmentSchedule = ({ date }: EquipmentScheduleProps) => {
  const [view, setView] = useState<ViewId>('day')
  const [room, setRoom] = useState<string>('all')
  const [day, setDay] = useState<EquipmentDay | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selected, setSelected] = useState<{ equipmentId: string; time: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setSelected(null)
    getEquipmentDay(date)
      .then((res) => {
        if (cancelled) return
        setDay(res)
        setError(null)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Не удалось загрузить расписание оборудования')
        setDay(null)
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [date])

  const rooms = useMemo(() => {
    const unique = Array.from(new Set((day?.items ?? []).map((e) => e.cabinet))).sort()
    return [{ id: 'all', label: 'Все кабинеты' }, ...unique.map((c) => ({ id: c, label: `каб. ${c}` }))]
  }, [day])

  const visible = useMemo(
    () => (day?.items ?? []).filter((e) => room === 'all' || e.cabinet === room),
    [day, room],
  )

  const selectedSlot = useMemo(() => {
    if (!selected) return null
    const item = visible.find((e) => e.id === selected.equipmentId)
    if (!item) return null
    const slot = item.slots.find((s) => s.time === selected.time)
    if (!slot) return null
    return { item, slot }
  }, [selected, visible])

  const handleSlotClick = useCallback((equipmentId: string, slot: EquipmentSlot) => {
    if (slot.state !== 'booked' && slot.state !== 'repair') {
      setSelected(null)
      return
    }
    setSelected({ equipmentId, time: slot.time })
  }, [])

  return (
    <Stack
      flex="1"
      minW="0"
      minH="0"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      gap="0"
      data-arm-section="equipment"
      data-testid="equipment-screen"
    >
      <Flex
        align="center"
        gap="10px"
        flexWrap="wrap"
        p="12px 16px"
        borderBottomWidth="1px"
        borderBottomColor="borderLight"
      >
        <Text fontSize="18px" lineHeight="24px" fontWeight="700" letterSpacing="-0.022em">
          Оборудование и кабинеты
        </Text>
        <Text fontSize="12px" color="textSecondary" data-testid="equipment-meta">
          {formatDate(date)}, ресурсов: {day?.items.length ?? 0}
        </Text>
        <Box flex="1" />
        <Flex
          role="tablist"
          aria-label="Представление ресурсов"
          gap="2px"
          align="center"
          h="32px"
          px="2px"
          bg="surfaceLight"
          borderWidth="1px"
          borderColor="borderLight"
          borderRadius="compact"
          data-testid="equipment-view"
        >
          {VIEWS.map((v) => {
            const active = view === v.id
            return (
              <Box
                as="button"
                key={v.id}
                role="tab"
                aria-selected={active}
                tabIndex={active ? 0 : -1}
                data-testid={`equipment-view-${v.id}`}
                onClick={() => setView(v.id)}
                h="28px"
                px="12px"
                borderRadius="4px"
                fontSize="13px"
                cursor="pointer"
                color={active ? 'white' : 'textPrimary'}
                bg={active ? 'brandGreen' : 'transparent'}
              >
                {v.label}
              </Box>
            )
          })}
        </Flex>
      </Flex>

      {isLoading ? (
        <Text p="16px" fontSize="13px" color="textSecondary" data-testid="equipment-loading">
          Загрузка расписания оборудования…
        </Text>
      ) : null}

      {error ? (
        <Text p="16px" fontSize="13px" color="danger" data-testid="equipment-error">
          {error}
        </Text>
      ) : null}

      {day && !isLoading && !error ? (
        <Stack flex="1" minH="0" gap="0">
          <Flex gap="6px" flexWrap="wrap" p="10px 16px" borderBottomWidth="1px" borderBottomColor="borderLight">
            {rooms.map((r) => {
              const active = room === r.id
              return (
                <Box
                  as="button"
                  key={r.id}
                  aria-pressed={active}
                  data-testid={`equipment-room-${r.id}`}
                  onClick={() => setRoom(r.id)}
                  h="26px"
                  px="10px"
                  borderRadius="pill"
                  borderWidth="1px"
                  borderColor={active ? 'brandGreen' : 'borderLight'}
                  bg={active ? 'brandGreenFaint' : 'white'}
                  color={active ? 'brandGreen700' : 'textPrimary'}
                  fontSize="12px"
                  cursor="pointer"
                >
                  {r.label}
                </Box>
              )
            })}
          </Flex>

          <Box flex="1" overflow="auto" p="16px">
            {visible.length === 0 ? (
              <Text fontSize="13px" color="textSecondary" data-testid="equipment-empty">
                В этом кабинете нет учтённого оборудования.
              </Text>
            ) : view === 'day' ? (
              <Stack gap="10px" data-testid="equipment-day">
                <Flex gap="8px" pl="220px" fontSize="11px" color="textSecondary">
                  {hourMarks(visible[0].slots).map((mark) => (
                    <Box key={mark.time} flex={`${mark.span} 1 0`} minW="0">
                      {mark.time}
                    </Box>
                  ))}
                </Flex>
                {visible.map((item) => (
                  <Flex key={item.id} gap="8px" align="stretch" data-testid={`equipment-row-${item.id}`}>
                    <Stack w="220px" flex="none" gap="1px" minW="0" justify="center">
                      <Text fontSize="13px" fontWeight="500" lineHeight="17px">
                        {item.name}
                      </Text>
                      <Flex gap="10px" fontSize="11px" color="textSecondary" fontFamily="mono">
                        <Box>{item.code}</Box>
                        <Box>каб. {item.cabinet}</Box>
                      </Flex>
                    </Stack>
                    <Flex flex="1" minW="0" gap="1px">
                      {item.slots.map((slot) => {
                        const style = SLOT_STYLE[slot.state]
                        const isSelected = selected?.equipmentId === item.id && selected.time === slot.time
                        return (
                          <Box
                            as="button"
                            key={slot.time}
                            flex="1 1 0"
                            minW="0"
                            h="34px"
                            bg={style.bg}
                            borderWidth="1px"
                            borderColor={isSelected ? 'brandGreen700' : style.border}
                            borderRadius="2px"
                            cursor={slot.state === 'booked' || slot.state === 'repair' ? 'pointer' : 'default'}
                            aria-label={`${item.name}, ${slot.time} — ${slot.label ?? style.label}`}
                            data-testid={`equipment-slot-${item.id}-${slot.time}`}
                            data-state={slot.state}
                            onClick={() => handleSlotClick(item.id, slot)}
                          />
                        )
                      })}
                    </Flex>
                  </Flex>
                ))}

                <Flex gap="16px" flexWrap="wrap" fontSize="12px" color="textSecondary" pt="4px">
                  {(Object.keys(SLOT_STYLE) as Array<EquipmentSlot['state']>).map((state) => (
                    <Flex key={state} align="center" gap="6px">
                      <Box
                        w="12px"
                        h="12px"
                        borderRadius="2px"
                        bg={SLOT_STYLE[state].bg}
                        borderWidth="1px"
                        borderColor={SLOT_STYLE[state].border}
                      />
                      {SLOT_STYLE[state].label}
                    </Flex>
                  ))}
                </Flex>

                {selectedSlot ? (
                  <Box
                    p="10px 14px"
                    bg="surfaceLight"
                    borderWidth="1px"
                    borderColor="borderLight"
                    borderRadius="compact"
                    maxW="560px"
                    data-testid="equipment-slot-details"
                  >
                    <Text fontSize="13px" fontWeight="700">
                      {selectedSlot.item.name}, {selectedSlot.slot.time}
                    </Text>
                    <Text fontSize="12px" color="textSecondary" lineHeight="18px">
                      {selectedSlot.slot.state === 'repair'
                        ? `Ресурс недоступен: ${selectedSlot.slot.label ?? 'ремонт'}`
                        : `${selectedSlot.slot.label ?? 'Запись'}, ${selectedSlot.slot.serviceName ?? 'услуга не указана'}, врач ${selectedSlot.slot.doctorName ?? 'не указан'}`}
                    </Text>
                  </Box>
                ) : null}
              </Stack>
            ) : (
              <Stack gap="6px" data-testid="equipment-list">
                <Flex
                  gap="8px"
                  px="10px"
                  fontSize="11px"
                  color="textSecondary"
                  borderBottomWidth="1px"
                  borderBottomColor="borderLight"
                  pb="6px"
                >
                  <Box flex="2" minW="0">Ресурс</Box>
                  <Box w="120px" flex="none">Тип</Box>
                  <Box w="90px" flex="none">Кабинет</Box>
                  <Box w="110px" flex="none">График</Box>
                  <Box flex="1.4" minW="0">Обслуживает</Box>
                  <Box w="150px" flex="none">Техперерыв</Box>
                  <Box w="90px" flex="none" textAlign="right">Занято</Box>
                </Flex>
                {visible.map((item) => (
                  <Flex
                    key={item.id}
                    gap="8px"
                    px="10px"
                    py="8px"
                    align="center"
                    borderWidth="1px"
                    borderColor="borderLight"
                    borderRadius="compact"
                    data-testid={`equipment-list-row-${item.id}`}
                  >
                    <Stack flex="2" minW="0" gap="1px">
                      <Text fontSize="13px" fontWeight="500">{item.name}</Text>
                      <Text fontSize="11px" color="textSecondary" fontFamily="mono">{item.code}</Text>
                    </Stack>
                    <Box w="120px" flex="none" fontSize="12px" color="textSecondary">
                      {KIND_LABEL[item.kind]}, {item.type.toLowerCase()}
                    </Box>
                    <Box w="90px" flex="none" fontSize="12px" fontFamily="mono">каб. {item.cabinet}</Box>
                    <Box w="110px" flex="none" fontSize="12px" fontFamily="mono">
                      {item.hours.start}–{item.hours.end}
                    </Box>
                    <Box flex="1.4" minW="0" fontSize="12px" color="textSecondary">
                      {item.serviceNames.length > 0 ? item.serviceNames.join(', ') : 'услуги не привязаны'}
                    </Box>
                    <Box w="150px" flex="none" fontSize="12px" color="textSecondary">{item.maintenance}</Box>
                    <Box
                      w="90px"
                      flex="none"
                      textAlign="right"
                      fontSize="13px"
                      fontFamily="mono"
                      data-testid={`equipment-booked-${item.id}`}
                    >
                      {item.repair ? 'ремонт' : item.bookedCount}
                    </Box>
                  </Flex>
                ))}
              </Stack>
            )}

            {visible.some((e) => e.sharedWith.length > 0) ? (
              <Box
                mt="14px"
                p="10px 14px"
                bg="brandGreenFaint"
                borderWidth="1px"
                borderColor="borderLight"
                borderRadius="compact"
                maxW="760px"
                data-testid="equipment-shared-note"
              >
                <Text fontSize="13px" fontWeight="700" color="brandGreen700">
                  Общий ресурс кабинета
                </Text>
                <Text fontSize="12px" color="textPrimary" lineHeight="18px">
                  {sharedPairs(visible).map((pair) => (
                    `${pair.cabinet}: ${pair.names.join(' и ')}`
                  )).join('; ')}
                  {' — '}
                  занятость одного закрывает время у другого: сервер не пустит вторую запись.
                </Text>
              </Box>
            ) : null}
          </Box>
        </Stack>
      ) : null}
    </Stack>
  )
}
