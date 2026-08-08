import React from 'react'
import { Box, HStack, Stack, Text } from '@chakra-ui/react'

import type { Appointment } from '../../__data__/types'

interface ShiftOverviewProps {
  appointments: Appointment[]
}

const formatMinutes = (total: number) => {
  const mm = Math.round(total)
  const h = Math.floor(mm / 60)
  const rest = mm % 60
  return `${String(h).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
}

export const ShiftOverview = ({ appointments }: ShiftOverviewProps) => {
  const total = appointments.length
  const durations = appointments.map((a) => a.durationMin)
  const avg = durations.length
    ? durations.reduce((s, v) => s + v, 0) / durations.length
    : 0
  const needsAction = appointments.filter(
    (a) => a.status === 'no_show' || a.status === 'arrived',
  ).length

  const Stat = ({
    value,
    label,
    testId,
  }: {
    value: string
    label: string
    testId: string
  }) => (
    <Stack gap="2px">
      <Text
        fontSize="24px"
        lineHeight="30px"
        fontWeight="600"
        letterSpacing="-0.02em"
        fontFamily="mono"
        data-testid={testId}
      >
        {value}
      </Text>
      <Text fontSize="12px" lineHeight="16px" color="textSecondary">
        {label}
      </Text>
    </Stack>
  )

  return (
    <Box
      bg="surfaceLight"
      borderWidth="1px"
      borderColor="borderLight"
      p="4"
      borderRadius="compact"
      data-testid="shift-overview"
    >
      <Text
        fontSize="13px"
        lineHeight="18px"
        color="textSecondary"
        mb="3"
        textTransform="uppercase"
        letterSpacing="0.04em"
      >
        Обзор смены
      </Text>
      <HStack gap="6" align="flex-start">
        <Stat
          value={String(total)}
          label="Записей в смене"
          testId="shift-stat-total"
        />
        <Stat
          value={avg > 0 ? formatMinutes(avg) : '—'}
          label="Среднее время записи"
          testId="shift-stat-avg"
        />
        <Stat
          value={needsAction > 0 ? String(needsAction) : '0'}
          label="Требуют действия"
          testId="shift-stat-needs-action"
        />
      </HStack>
    </Box>
  )
}
