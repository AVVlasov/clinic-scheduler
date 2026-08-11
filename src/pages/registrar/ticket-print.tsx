import React from 'react'
import { Box, Button, Flex, Text } from '@chakra-ui/react'

import { paymentTypeLabel } from '../../__data__/booking'
import type { Appointment, Doctor, Service } from '../../__data__/types'

export interface TicketPrintProps {
  visit: Appointment
  doctor: Doctor | null
  service: Service | null
  /** Площадка приёма из справочника врачей: на бланке пациент видит, куда идти. */
  site?: string | null
  onClose: () => void
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatDate = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}.${d.getFullYear()}`
}

/**
 * Номер талона — только порядковый номер записи. Внутренний идентификатор
 * («a-013») на бланк не попадает: пациенту он ничего не говорит, а в клинике
 * читается как техническая ошибка.
 */
export const ticketNumber = (appointmentId: string): string => {
  const digits = appointmentId.replace(/\D/g, '')
  return digits ? digits.padStart(4, '0') : '—'
}

/**
 * Печатная разметка бланка. Печатает браузер, поэтому на печать уходит именно
 * страница, а не картинка модалки: всё, кроме бланка, скрывается, бланк
 * разворачивается на лист, кнопки с листа убираются.
 */
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  [data-print-sheet], [data-print-sheet] * { visibility: visible !important; }
  [data-print-overlay] { position: static !important; background: none !important; }
  [data-print-sheet] {
    position: absolute !important;
    left: 0; top: 0;
    width: 100%; max-width: 100%;
    box-shadow: none !important;
    border: none !important;
  }
  [data-print-hide] { display: none !important; }
}
`

const TicketRow = ({ label, value, testId }: { label: string; value: string; testId: string }) => (
  <Flex gap="8px">
    <Text minW="130px" color="textSecondary">{label}</Text>
    <Text fontWeight="600" data-testid={testId}>{value}</Text>
  </Flex>
)

/** Талон на приём: состав по макету — кто, когда, к кому, куда и по какому основанию. */
export const TicketPrint = ({ visit, doctor, service, site, onClose }: TicketPrintProps) => (
  <Box
    position="fixed"
    inset="0"
    bg="blackAlpha.600"
    zIndex={50}
    display="flex"
    alignItems="center"
    justifyContent="center"
    data-testid="ticket-print"
    data-print-overlay="true"
  >
    <style data-testid="ticket-print-styles">{PRINT_CSS}</style>
    <Box
      bg="white"
      borderRadius="compact"
      p="6"
      maxW="420px"
      w="90%"
      data-testid="ticket-print-sheet"
      data-print-sheet="true"
    >
      <Flex align="baseline" gap="8px" mb="4">
        <Text fontSize="18px" fontWeight="700">Талон на приём</Text>
        <Text fontSize="14px" fontFamily="mono" color="textSecondary" data-testid="ticket-number">
          № {ticketNumber(visit.id)}
        </Text>
      </Flex>
      <Box display="grid" gap="2" fontSize="14px" mb="5">
        <TicketRow label="Пациент" value={visit.patientName ?? '—'} testId="ticket-patient" />
        <TicketRow label="Дата приёма" value={formatDate(visit.start)} testId="ticket-date" />
        <TicketRow label="Время" value={formatTime(visit.start)} testId="ticket-time" />
        <TicketRow label="Врач" value={visit.doctorName ?? doctor?.name ?? '—'} testId="ticket-doctor" />
        <TicketRow label="Услуга" value={service?.name ?? '—'} testId="ticket-service" />
        <TicketRow label="Кабинет" value={doctor?.cabinet ?? visit.doctorCabinet ?? '—'} testId="ticket-cabinet" />
        <TicketRow label="Площадка" value={site?.trim() ? site : '—'} testId="ticket-site" />
        <TicketRow label="Оплата" value={paymentTypeLabel(visit.paymentType)} testId="ticket-payment" />
      </Box>
      <Flex gap="8px" data-print-hide="true">
        <Button
          data-testid="ticket-print-button"
          onClick={() => window.print()}
          bg="brandGreenDark"
          color="white"
          borderRadius="pill"
          _hover={{ bg: 'brandGreen700' }}
        >
          Печать
        </Button>
        <Button
          data-testid="ticket-print-close"
          onClick={onClose}
          variant="outline"
          borderRadius="pill"
        >
          Закрыть
        </Button>
      </Flex>
    </Box>
  </Box>
)
