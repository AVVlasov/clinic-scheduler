import React from 'react'
import { Badge, Box, Button, Flex, Stack } from '@chakra-ui/react'

import type { Appointment } from '../../__data__/types'

export interface VisitCardProps {
  visit: Appointment | null
  onMarkArrived: () => void
  onMarkWaiting: () => void
  onMarkNoShow: () => void
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const statusLabel = (s: Appointment['status']): string => {
  switch (s) {
    case 'scheduled': return 'Ожидает'
    case 'arrived': return 'Пришёл'
    case 'in_progress': return 'На приёме'
    case 'completed': return 'Завершён'
    case 'no_show': return 'Не пришёл'
  }
}

const paymentLabel = (p: Appointment['paymentType']): string => {
  switch (p) {
    case 'cash': return 'Наличные'
    case 'card': return 'Карта'
    case 'insurance': return 'Страховка'
  }
}

export const VisitCard = (props: VisitCardProps) => {
  const { visit, onMarkArrived, onMarkWaiting, onMarkNoShow } = props

  if (!visit) {
    return (
      <Box
        width="340px"
        flex="none"
        bg="white"
        borderWidth="1px"
        borderColor="borderLight"
        borderRadius="compact"
        p="16px"
        data-testid="visit-card-empty"
      >
        <Box color="textSecondary" fontSize="14px">
          Выберите визит из очереди
        </Box>
      </Box>
    )
  }

  const primaryLabel =
    visit.status === 'arrived' ? 'Отменить приход' : 'Отметить приход'
  const primaryAction =
    visit.status === 'arrived' ? onMarkWaiting : onMarkArrived
  const noShowDisabled = visit.status === 'no_show'

  return (
    <Box
      width="340px"
      flex="none"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      display="flex"
      flexDirection="column"
      data-testid="visit-card"
      data-visit-id={visit.id}
    >
      <Box p="14px 16px" borderBottomWidth="1px" borderColor="borderLight">
        <Flex align="center" gap="8px">
          <Box fontSize="20px" lineHeight="26px" fontWeight="700" data-testid="visit-patient">
            {visit.patientName ?? visit.patientId}
          </Box>
          <Box flex="1" />
          <Badge
            bg={visit.status === 'arrived' ? 'brandGreenTint' : 'gray.100'}
            color={visit.status === 'arrived' ? 'brandGreen700' : 'textSecondary'}
            px="8px"
            borderRadius="compact"
            data-testid="visit-status-badge"
          >
            {statusLabel(visit.status)}
          </Badge>
        </Flex>
      </Box>

      <Stack gap="9px" p="14px 16px" borderBottomWidth="1px" borderColor="borderLight">
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Время</Box>
          <Box fontSize="13px" fontFamily="mono" data-testid="visit-time">{formatTime(visit.start)}</Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Врач</Box>
          <Box fontSize="13px">{visit.doctorName ?? visit.doctorId}</Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Услуга</Box>
          <Box fontSize="13px">{visit.serviceId ?? '—'}</Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Оплата</Box>
          <Box fontSize="13px">{paymentLabel(visit.paymentType)}</Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">К оплате</Box>
          <Box fontSize="13px" fontFamily="mono" fontWeight="700">—</Box>
        </Flex>
      </Stack>

      <Box p="14px 16px" display="flex" flexDirection="column" gap="6px" borderTopWidth="1px" borderColor="borderLight" mt="auto">
        <Button
          colorPalette="green"
          bg="brandGreen"
          color="white"
          _hover={{ bg: 'brandGreenDark' }}
          size="lg"
          width="100%"
          onClick={primaryAction}
          data-testid="visit-primary-action"
        >
          {primaryLabel}
        </Button>
        <Flex gap="6px">
          <Button
            variant="outline"
            flex="1"
            size="sm"
            disabled
            aria-disabled
            title="Оплата недоступна"
            data-testid="visit-pay-button"
          >
            К оплате
          </Button>
          <Button
            variant="outline"
            flex="1"
            size="sm"
            disabled
            aria-disabled
            title="Печать талона недоступна"
            data-testid="visit-print-button"
          >
            Талон
          </Button>
        </Flex>
        <Button
          variant="outline"
          color="danger"
          borderColor="danger"
          _hover={{ bg: 'danger', color: 'white' }}
          size="sm"
          width="100%"
          onClick={onMarkNoShow}
          disabled={noShowDisabled}
          aria-disabled={noShowDisabled}
          data-testid="visit-noshow-button"
        >
          Не пришёл
        </Button>
      </Box>
    </Box>
  )
}
