import React from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'

import type { Appointment, AppointmentStatus } from '../../__data__/types'

interface DayListProps {
  appointments: Appointment[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']
  return `${d.getDate()} ${months[d.getMonth()]}`
}

const statusLabel = (s: AppointmentStatus): string => {
  switch (s) {
    case 'scheduled': return 'Ожидает'
    case 'arrived': return 'Пришёл'
    case 'in_progress': return 'Идёт приём'
    case 'completed': return 'Завершён'
    case 'no_show': return 'Не явился'
    default: return s
  }
}

const statusTone = (s: AppointmentStatus): 'neutral' | 'attention' | 'booked' | 'danger' => {
  switch (s) {
    case 'scheduled': return 'neutral'
    case 'arrived': return 'attention'
    case 'in_progress': return 'attention'
    case 'completed': return 'booked'
    case 'no_show': return 'danger'
    default: return 'neutral'
  }
}

const toneBg = (tone: 'neutral' | 'attention' | 'booked' | 'danger'): string => {
  switch (tone) {
    case 'booked': return 'brandGreenTint'
    case 'attention': return 'brandOrange'
    case 'danger': return 'danger'
    case 'neutral':
    default: return 'transparent'
  }
}

const toneColor = (tone: 'neutral' | 'attention' | 'booked' | 'danger'): string => {
  switch (tone) {
    case 'booked': return 'brandGreen700'
    case 'attention': return 'textPrimary'
    case 'danger': return 'textPrimary'
    case 'neutral':
    default: return 'textPrimary'
  }
}

export const DayList = ({ appointments, selectedId, onSelect }: DayListProps) => {
  const doneCount = appointments.filter((a) => a.status === 'completed').length

  return (
    <Box
      w="360px"
      flex="none"
      bg="white"
      borderWidth="1px"
      borderStyle="solid"
      borderColor="borderLight"
      borderRadius="compact"
      display="flex"
      flexDirection="column"
    >
      <Flex
        align="center"
        gap="10px"
        px="4"
        py="3"
        borderBottomWidth="1px"
        borderBottomStyle="solid"
        borderBottomColor="borderLight"
      >
        <Text fontSize="18px" fontWeight="700" lineHeight="24px" letterSpacing="-0.022em">
          День приёма
        </Text>
        <Text fontSize="12px" color="textSecondary">
          {doneCount} из {appointments.length} завершено
        </Text>
      </Flex>
      <Box flex="1" overflowY="auto" p="2">
        {appointments.length === 0 && (
          <Text fontSize="13px" color="textSecondary" px="2" py="3">
            На сегодня приёмов нет
          </Text>
        )}
        {appointments.map((a) => {
          const tone = statusTone(a.status)
          const isSelected = a.id === selectedId
          return (
            <button
              key={a.id}
              type="button"
              data-testid={`day-visit-${a.id}`}
              onClick={() => onSelect(a.id)}
              style={{
                width: '100%',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start',
                padding: '9px 10px',
                marginBottom: '2px',
                border: 0,
                borderRadius: '4px',
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: isSelected ? 'var(--chakra-colors-brandGreenFaint)' : 'transparent',
                boxShadow: isSelected ? 'inset 0 0 0 1px var(--chakra-colors-brandGreenTint)' : 'none',
              }}
            >
              <Box
                flex="none"
                w="44px"
                fontFamily="mono"
                fontSize="13px"
                fontVariantNumeric="tabular-nums"
                color={isSelected ? 'brandGreen700' : 'textSecondary'}
                pt="1px"
              >
                {formatTime(a.start)}
              </Box>
              <Flex direction="column" gap="3px" flex="1" minW="0">
                <Text
                  fontSize="13px"
                  fontWeight="500"
                  letterSpacing="-0.006em"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  textDecoration={a.status === 'no_show' ? 'line-through' : 'none'}
                  color="textPrimary"
                >
                  {a.patientName ?? '—'}
                </Text>
                <Text
                  fontSize="12px"
                  color="textSecondary"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                >
                  {formatDate(a.start)} · {a.durationMin} мин
                </Text>
              </Flex>
              <Box
                flex="none"
                fontSize="12px"
                lineHeight="20px"
                px="8px"
                borderRadius="compact"
                bg={toneBg(tone)}
                color={toneColor(tone)}
                data-testid={`day-visit-status-${a.id}`}
              >
                {statusLabel(a.status)}
              </Box>
            </button>
          )
        })}
      </Box>
    </Box>
  )
}