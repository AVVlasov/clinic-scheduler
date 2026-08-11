import React from 'react'
import { Box, HStack, Text } from '@chakra-ui/react'

import type { Appointment } from '../../__data__/types'
import { StatTile } from '../ui-kit'

interface ShiftOverviewProps {
  appointments: Appointment[]
}

/**
 * Средняя длительность приёма — это минуты, а не время суток. Формат ЧЧ:ММ
 * читался как «00:22», то есть как момент, и подпись «Среднее время записи»
 * это подтверждала: показатель понимали неправильно оба раза.
 */
const formatMinutes = (total: number) => `${Math.round(total)} мин`

export const ShiftOverview = ({ appointments }: ShiftOverviewProps) => {
  const total = appointments.length
  const durations = appointments.map((a) => a.durationMin)
  const avg = durations.length
    ? durations.reduce((s, v) => s + v, 0) / durations.length
    : 0
  const needsAction = appointments.filter(
    (a) => a.status === 'no_show' || a.status === 'arrived',
  ).length


  return (
    <Box
      bg="surfaceLight"
      borderWidth="1px"
      borderColor="borderLight"
      p="4"
      borderRadius="compact"
      flex="none"
      data-testid="shift-overview"
      data-arm-section="shift"
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
        <StatTile
          value={String(total)}
          label="Записей в смене"
          testId="shift-stat-total"
        />
        <StatTile
          value={avg > 0 ? formatMinutes(avg) : '—'}
          label="Средняя длительность приёма"
          testId="shift-stat-avg"
        />
        <StatTile
          value={needsAction > 0 ? String(needsAction) : '0'}
          label="Требуют действия"
          testId="shift-stat-needs-action"
        />
      </HStack>
    </Box>
  )
}
