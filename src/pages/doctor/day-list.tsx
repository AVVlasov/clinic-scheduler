import React from 'react'
import { Box, Flex, Text } from '@chakra-ui/react'

import { palette } from '../../__data__/tokens'

import { appointmentStatusLabel, appointmentStatusTone } from '../../__data__/status-labels'
import type { Appointment, Service } from '../../__data__/types'

import { serviceNameById } from './service-access'

interface DayListProps {
  appointments: Appointment[]
  /** Справочник услуг: в строке дня врач должен видеть, зачем пришёл человек. */
  services: Service[]
  selectedId: string | null
  onSelect: (id: string) => void
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}




export const DayList = ({
  appointments, services, selectedId, onSelect,
}: DayListProps) => {
  const counted = appointments.filter((a) => a.status !== 'cancelled' && a.status !== 'no_show')
  const doneCount = counted.filter((a) => a.status === 'completed').length
  const totalCount = counted.length
  // Знаменатель меньше числа строк: отменённые и неявки завершить нельзя. Пока
  // разница ничем не названа, «1 из 2» над списком из трёх читается как ошибка счёта.
  const skippedCount = appointments.length - counted.length

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
          {skippedCount > 0 ? ` · не состоялись: ${skippedCount}` : ''}
        </Text>
        <Box flex="1" />
      </Flex>
      <Box flex="1" overflowY="auto" p="2">
        {appointments.length === 0 && (
          <Text fontSize="13px" color="textSecondary" px="2" py="3">
            На сегодня приёмов нет
          </Text>
        )}
        {appointments.map((a) => {
          const tone = appointmentStatusTone(a.status)
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
                background: isSelected ? palette.brandGreenFaint : 'transparent',
                boxShadow: isSelected ? `inset 0 0 0 1px ${palette.brandGreenTint}` : 'none',
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
                {/* Услуга, а не дата: день у всех строк один, и подпись была
                    одинаковой у каждой записи — врач не видел, зачем пришёл человек. */}
                <Text
                  fontSize="12px"
                  color="textSecondary"
                  whiteSpace="nowrap"
                  overflow="hidden"
                  textOverflow="ellipsis"
                  data-testid={`day-visit-service-${a.id}`}
                >
                  {serviceNameById(services, a.serviceId)}, {a.durationMin} мин
                </Text>
              </Flex>
              <Box
                flex="none"
                fontSize="12px"
                lineHeight="20px"
                px="8px"
                borderRadius="compact"
                bg={tone.bg}
                color={tone.fg}
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