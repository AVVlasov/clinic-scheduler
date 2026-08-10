import React from 'react'
import { Box, Button, Text } from '@chakra-ui/react'

import { paymentTypeLabel } from '../../__data__/booking'
import type { Appointment, Doctor, Service } from '../../__data__/types'

export interface TicketPrintProps {
  visit: Appointment
  doctor: Doctor | null
  service: Service | null
  onClose: () => void
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Экран печати талона — состав по макету: пациент, врач, время, кабинет, услуга. */
export const TicketPrint = ({ visit, doctor, service, onClose }: TicketPrintProps) => (
  <Box
    position="fixed"
    inset="0"
    bg="blackAlpha.600"
    zIndex={50}
    display="flex"
    alignItems="center"
    justifyContent="center"
    data-testid="ticket-print"
  >
    <Box bg="white" borderRadius="compact" p="6" maxW="420px" w="90%" data-testid="ticket-print-sheet">
      <Text fontSize="18px" fontWeight="700" mb="4">Талон на приём</Text>
      <Box display="grid" gap="2" fontSize="14px" mb="5">
        <Text data-testid="ticket-patient">Пациент: {visit.patientName ?? '—'}</Text>
        <Text data-testid="ticket-doctor">Врач: {visit.doctorName ?? doctor?.name ?? '—'}</Text>
        <Text data-testid="ticket-time">Время: {formatTime(visit.start)}</Text>
        <Text data-testid="ticket-cabinet">Кабинет: {doctor?.cabinet ?? visit.doctorCabinet ?? '—'}</Text>
        <Text data-testid="ticket-service">Услуга: {service?.name ?? '—'}</Text>
        <Text data-testid="ticket-payment">Оплата: {paymentTypeLabel(visit.paymentType)}</Text>
      </Box>
      <Button
        data-testid="ticket-print-close"
        onClick={onClose}
        bg="brandGreen"
        color="white"
        borderRadius="pill"
        _hover={{ bg: 'brandGreenDark' }}
      >
        Закрыть
      </Button>
    </Box>
  </Box>
)
