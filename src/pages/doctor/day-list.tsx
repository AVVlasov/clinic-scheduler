import React from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'

import { appointmentStatusLabel } from '../../__data__/status-labels'
import type { Appointment, AppointmentStatus } from '../../__data__/types'

interface DayListProps {
  appointments: Appointment[]
  selectedId: string | null
  onSelect: (id: string) => void
  doctorName?: string | null
  doctorSwitcher?: React.ReactNode
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

const statusTone = (s: AppointmentStatus): 'neutral' | 'attention' | 'booked' | 'danger' => {
  const map: { [K in AppointmentStatus]: 'neutral' | 'attention' | 'booked' | 'danger' } = {
    scheduled: 'neutral',
    arrived: 'attention',
    in_progress: 'attention',
    completed: 'booked',
    cancelled: 'danger',
    no_show: 'danger',
  }
  return map[s]
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

export const DayList = ({
  appointments, selectedId, onSelect, doctorName, doctorSwitcher,
}: DayListProps) => {
  const counted = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const doneCount = counted.filter((a) => a.status === 'completed').length
  const totalCount = counted.length

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
      data-arm-section="day"
    >
      <Flex
        align="center"
        gap="10px"
        px="4"
        py="3"
        borderBottomWidth="1px"
        borderBottomStyle="solid"
        borderBottomColor="borderLight"
        flexWrap="wrap"
      >
        <Text fontSize="18px" fontWeight="700" lineHeight="24px" letterSpacing="-0.022em">
          День приёма
        </Text>
        <Text fontSize="12px" color="textSecondary" data-testid="doctor-progress">
          {doneCount} из {totalCount} завершено
        </Text>
        {doctorSwitcher}
        {doctorName ? (
          <Text fontSize="12px" color="textSecondary" data-testid="doctor-day-subject">
            {doctorName}
          </Text>
        ) : null}
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
                {appointmentStatusLabel(a.status)}
              </Box>
            </button>
          )
        })}
      </Box>
    </Box>
  )
}