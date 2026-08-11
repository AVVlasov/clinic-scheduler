import React, { useState } from 'react'
import { Badge, Box, Button, Flex, Stack } from '@chakra-ui/react'

import { paymentTypeLabel } from '../../__data__/booking'
import { appointmentStatusLabel } from '../../__data__/status-labels'
import type { Appointment } from '../../__data__/types'
import { isRegistrarTerminal } from '../../__data__/lifecycle'

export interface VisitCardProps {
  visit: Appointment | null
  priceMap: Map<string, number>
  serviceNames: Map<string, string>
  onMarkArrived: () => void
  onMarkWaiting: () => void
  onMarkNoShow: () => void
  onPay: () => void
  onPrintTicket: () => void
  onConfirm: () => void
  payBusy?: boolean
  confirmBusy?: boolean
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const formatBirth = (iso: string | null): string => {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  return `${m[3]}.${m[2]}.${m[1]}`
}

const formatAuthor = (name?: string | null, unit?: string | null): string => {
  const n = (name ?? '').trim()
  const u = (unit ?? '').trim()
  if (n && u) return `${n}, ${u}`
  if (n) return n
  if (u) return u
  return '—'
}

const formatRub = (amount: number): string =>
  `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} ₽`

const visitAmount = (visit: Appointment, priceMap: Map<string, number>): number => {
  const ids = visit.performedServiceIds.length > 0
    ? visit.performedServiceIds
    : visit.serviceId
      ? [visit.serviceId]
      : []
  let sum = 0
  for (const id of ids) {
    const price = priceMap.get(id)
    if (typeof price === 'number') sum += price
  }
  return sum
}

export const VisitCard = (props: VisitCardProps) => {
  const {
    visit, priceMap, serviceNames, onMarkArrived, onMarkWaiting, onMarkNoShow, onPay, onPrintTicket,
    onConfirm, payBusy = false, confirmBusy = false,
  } = props
  const [confirmNoShow, setConfirmNoShow] = useState(false)

  React.useEffect(() => {
    setConfirmNoShow(false)
  }, [visit?.id])

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

  const isTerminalVisit = isRegistrarTerminal(visit.status)

  const primaryLabel =
    visit.status === 'arrived' ? 'Отменить приход' : 'Отметить приход'
  const primaryAction =
    visit.status === 'arrived' ? onMarkWaiting : onMarkArrived
  const noShowDisabled = visit.status === 'no_show'

  const amount = visitAmount(visit, priceMap)
  const amountText = amount > 0 ? formatRub(amount) : '—'

  return (
    <Box
      width="340px"
      flex="none"
      maxH="100%"
      minH="0"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      display="flex"
      flexDirection="column"
      overflowY="auto"
      data-testid="visit-card"
      data-arm-section="visit"
      data-visit-id={visit.id}
      data-scrollable="true"
    >
      <Box p="14px 16px" borderBottomWidth="1px" borderColor="borderLight">
        <Flex align="center" gap="8px">
          <Box fontSize="20px" lineHeight="26px" fontWeight="700" data-testid="visit-patient">
            {visit.patientName ?? '—'}
          </Box>
          <Box flex="1" />
          <Badge
            bg={visit.status === 'arrived' ? 'brandGreenTint' : 'gray.100'}
            color={visit.status === 'arrived' ? 'brandGreen700' : 'textSecondary'}
            px="8px"
            borderRadius="compact"
            data-testid="visit-status-badge"
          >
            {appointmentStatusLabel(visit.status)}
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
          <Box fontSize="13px" data-testid="visit-doctor">{visit.doctorName ?? '—'}</Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Услуга</Box>
          <Box fontSize="13px" data-testid="visit-service">
            {visit.serviceId ? (serviceNames.get(visit.serviceId) ?? 'Услуга') : '—'}
          </Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">UID</Box>
          <Box fontSize="13px" fontFamily="mono" data-testid="visit-uid">{visit.patientUid ?? '—'}</Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Дата рождения</Box>
          <Box fontSize="13px" data-testid="visit-birth">{formatBirth(visit.patientBirthDate)}</Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Кабинет</Box>
          <Box fontSize="13px" data-testid="visit-cabinet">{visit.doctorCabinet ?? '—'}</Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Автор</Box>
          <Box fontSize="13px" data-testid="visit-author">
            {formatAuthor(visit.createdByName, visit.createdByUnit)}
          </Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Подтверждение</Box>
          <Box fontSize="13px" data-testid="visit-confirmed">
            {visit.confirmed ? 'Запись подтверждена' : 'Не подтверждена'}
          </Box>
        </Flex>
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">Оплата</Box>
          <Box fontSize="13px">{paymentTypeLabel(visit.paymentType)}</Box>
        </Flex>
        {visit.operatorComment ? (
          <Flex gap="10px" align="baseline">
            <Box w="104px" color="textSecondary" fontSize="12px">Комментарий</Box>
            <Box fontSize="13px" data-testid="visit-operator-comment">{visit.operatorComment}</Box>
          </Flex>
        ) : null}
        <Flex gap="10px" align="baseline">
          <Box w="104px" color="textSecondary" fontSize="12px">К оплате</Box>
          <Box fontSize="13px" fontFamily="mono" fontWeight="700" data-testid="visit-amount">
            {visit.paidAt ? `оплачено ${formatRub(visit.paidAmount ?? amount)}` : amountText}
          </Box>
        </Flex>
      </Stack>

      <Box p="14px 16px" display="flex" flexDirection="column" gap="6px" borderTopWidth="1px" borderColor="borderLight" mt="auto">
        {isTerminalVisit ? (
          <Flex gap="6px">
            <Button
              variant="outline"
              flex="1"
              size="sm"
              onClick={onPrintTicket}
              data-testid="visit-print-button"
            >
              Талон
            </Button>
          </Flex>
        ) : (
          <>
            <Button
              colorPalette="green"
              bg="brandGreenDark"
              color="white"
              _hover={{ bg: 'brandGreenDark' }}
              size="lg"
              width="100%"
              onClick={primaryAction}
              data-testid="visit-primary-action"
              data-arm-primary-target="true"
            >
              {primaryLabel}
            </Button>
            <Flex gap="6px" data-arm-section="pay">
              <Button
                variant="outline"
                flex="1"
                size="sm"
                onClick={onPay}
                disabled={Boolean(visit.paidAt) || payBusy || amount <= 0}
                title={visit.paidAt ? 'Уже оплачено' : (amount <= 0 ? 'Нет суммы к оплате' : undefined)}
                data-testid="visit-pay-button"
              >
                {payBusy ? 'Оплата…' : (visit.paidAt ? 'Оплачено' : 'К оплате')}
              </Button>
              <Button
                variant="outline"
                flex="1"
                size="sm"
                onClick={onPrintTicket}
                data-testid="visit-print-button"
              >
                Талон
              </Button>
            </Flex>
            <Button
              variant="outline"
              size="sm"
              width="100%"
              onClick={onConfirm}
              disabled={Boolean(visit.confirmed) || confirmBusy}
              data-testid="visit-confirm-button"
            >
              {visit.confirmed ? 'Запись подтверждена' : (confirmBusy ? 'Подтверждение…' : 'Подтвердить запись')}
            </Button>
            <Button
              variant="outline"
              color="danger"
              borderColor="danger"
              _hover={{ bg: 'danger', color: 'white' }}
              size="sm"
              width="100%"
              onClick={() => {
                if (!confirmNoShow) {
                  setConfirmNoShow(true)
                  return
                }
                setConfirmNoShow(false)
                onMarkNoShow()
              }}
              disabled={noShowDisabled}
              aria-disabled={noShowDisabled}
              data-testid="visit-noshow-button"
              data-confirming={confirmNoShow ? 'true' : 'false'}
            >
              {confirmNoShow
                ? `Да, отметить неявку (${formatTime(visit.start)})`
                : 'Не пришёл'}
            </Button>
          </>
        )}
      </Box>
    </Box>
  )
}