import React, { useState } from 'react'
import { Badge, Box, Flex, Table } from '@chakra-ui/react'

import { paymentTypeLabel } from '../../__data__/booking'
import { appointmentStatusLabel } from '../../__data__/status-labels'
import type { Appointment, AppointmentStatus, PaymentType } from '../../__data__/types'
import { isRegistrarTerminal } from '../../__data__/lifecycle'

export type QueueFilter = 'all' | 'scheduled' | 'arrived' | 'no_show'

export interface QueueTableProps {
  items: Appointment[]
  serviceNames: Map<string, string>
  selectedId: string | null
  filter: QueueFilter
  onFilterChange: (next: QueueFilter) => void
  onSelect: (id: string) => void
  onMarkArrived: (id: string) => void
  onMarkWaiting: (id: string) => void
  onMarkNoShow: (id: string) => void
  onPrintTicket: (id: string) => void
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const statusPalette = (s: AppointmentStatus): { bg: string; fg: string } => {
  switch (s) {
    case 'scheduled': return { bg: 'gray.100', fg: 'textSecondary' }
    case 'arrived': return { bg: 'brandGreenTint', fg: 'brandGreen700' }
    case 'in_progress': return { bg: 'brandOrange', fg: 'textOnOrange' }
    case 'completed': return { bg: 'gray.200', fg: 'textPrimary' }
    case 'cancelled': return { bg: 'gray.200', fg: 'textSecondary' }
    case 'no_show': return { bg: 'danger', fg: 'white' }
  }
}

const paymentPalette = (p: PaymentType): { bg: string; fg: string } => {
  switch (p) {
    case 'regular': return { bg: 'gray.100', fg: 'textPrimary' }
    case 'dms': return { bg: 'brandOrange', fg: 'textOnOrange' }
    case 'promo': return { bg: 'brandGreenFaint', fg: 'brandGreen700' }
    case 'discount': return { bg: 'brandGreenTint', fg: 'brandGreen700' }
    case 'certificate': return { bg: 'gray.200', fg: 'textPrimary' }
  }
}

const FILTERS: Array<{ id: QueueFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'scheduled', label: 'Ожидают' },
  { id: 'arrived', label: 'Пришли' },
  { id: 'no_show', label: 'Не пришёл' },
]

type RowActionTone = 'neutral' | 'primary' | 'danger' | 'outlineGreen'

const rowActionStyles: Record<RowActionTone, Record<string, string>> = {
  neutral: {
    bg: 'white',
    color: 'textPrimary',
    borderColor: 'borderLight',
  },
  primary: {
    bg: 'brandGreen',
    color: 'white',
    borderColor: 'brandGreen',
  },
  outlineGreen: {
    bg: 'white',
    color: 'brandGreen700',
    borderColor: 'brandGreen',
  },
  danger: {
    bg: 'white',
    color: 'danger',
    borderColor: 'danger',
  },
}

/** Кнопка действия в строке очереди: одна высота, без переноса текста. */
const RowActionButton = ({
  children,
  tone,
  onClick,
  title,
  testId,
}: {
  children: React.ReactNode
  tone: RowActionTone
  onClick: (e: React.MouseEvent) => void
  title?: string
  testId?: string
}) => {
  const toneStyles = rowActionStyles[tone]
  return (
    <Box
      as="button"
      onClick={onClick}
      title={title}
      data-testid={testId}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      flexShrink={0}
      h="28px"
      minH="28px"
      px="10px"
      borderRadius="compact"
      borderWidth="1px"
      borderStyle="solid"
      bg={toneStyles.bg}
      color={toneStyles.color}
      borderColor={toneStyles.borderColor}
      fontSize="12px"
      fontWeight={tone === 'neutral' ? '400' : '600'}
      lineHeight="1"
      whiteSpace="nowrap"
      cursor="pointer"
    >
      {children}
    </Box>
  )
}

export const QueueTable = (props: QueueTableProps) => {
  const {
    items,
    serviceNames,
    selectedId,
    filter,
    onFilterChange,
    onSelect,
    onMarkArrived,
    onMarkWaiting,
    onMarkNoShow,
    onPrintTicket,
  } = props
  const [confirmNoShowId, setConfirmNoShowId] = useState<string | null>(null)

  return (
    <Box flex="1" minW="0" bg="white" borderWidth="1px" borderColor="borderLight" borderRadius="compact" data-arm-section="queue">
      <Flex
        align="center"
        gap="10px"
        p="12px 16px"
        borderBottomWidth="1px"
        borderColor="borderLight"
        wrap="wrap"
      >
        <Box as="h1" fontSize="18px" lineHeight="24px" fontWeight="700">
          Очередь смены
        </Box>
        <Box flex="1" />
        {FILTERS.map((f) => {
          const isOn = f.id === filter
          return (
            <Box
              as="button"
              key={f.id}
              tabIndex={-1}
              onClick={() => onFilterChange(f.id)}
              px="10px"
              h="26px"
              borderRadius="pill"
              borderWidth="1px"
              borderColor={isOn ? 'brandGreen' : 'borderLight'}
              bg={isOn ? 'brandGreenTint' : 'white'}
              color={isOn ? 'brandGreen700' : 'textPrimary'}
              fontSize="13px"
              fontWeight={isOn ? '600' : '400'}
              cursor="pointer"
              aria-pressed={isOn}
              data-testid={`filter-${f.id}`}
            >
              {f.label}
            </Box>
          )
        })}
      </Flex>
      <Box maxH="560px" overflowY="auto">
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader width="76px">Время</Table.ColumnHeader>
              <Table.ColumnHeader>Пациент</Table.ColumnHeader>
              <Table.ColumnHeader>Врач и услуга</Table.ColumnHeader>
              <Table.ColumnHeader width="130px">Оплата</Table.ColumnHeader>
              <Table.ColumnHeader width="150px">Статус</Table.ColumnHeader>
              <Table.ColumnHeader width="190px"></Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {items.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={6}>
                  <Box py="16px" textAlign="center" color="textSecondary" fontSize="14px">
                    Записей нет
                  </Box>
                </Table.Cell>
              </Table.Row>
            ) : (
              items.map((a) => {
                const sp = statusPalette(a.status)
                const pp = paymentPalette(a.paymentType)
                const isSelected = a.id === selectedId
                const confirmingNoShow = confirmNoShowId === a.id
                return (
                  <Table.Row
                    key={a.id}
                    bg={isSelected ? 'brandGreenFaint' : undefined}
                    onClick={() => onSelect(a.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onSelect(a.id)
                      }
                    }}
                    tabIndex={0}
                    role="row"
                    style={{ cursor: 'pointer' }}
                    aria-selected={isSelected}
                    data-testid={`queue-row-${a.id}`}
                    data-arm-primary-target={isSelected ? 'true' : undefined}
                    outline="none"
                    _focusVisible={{
                      outline: '2px solid',
                      outlineColor: 'brandGreen700',
                      outlineOffset: '-2px',
                    }}
                  >
                    <Table.Cell>
                      <Box fontFamily="mono" fontWeight="700">
                        {formatTime(a.start)}
                      </Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Box fontWeight="500">{a.patientName ?? '—'}</Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Box>{a.doctorName ?? '—'}</Box>
                      <Box fontSize="11px" color="textSecondary">
                        {(a.serviceId ? (serviceNames.get(a.serviceId) ?? 'Услуга') : '—')}
                      </Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge bg={pp.bg} color={pp.fg} px="8px" borderRadius="compact">
                        {paymentTypeLabel(a.paymentType)}
                      </Badge>
                    </Table.Cell>
                    {/* Статус приёма — плашка, подтверждение — подпись под ней.
                        Две плашки в строку разной ширины при переносе вставали
                        лесенкой: колонка читалась как сломанная. */}
                    <Table.Cell verticalAlign="top">
                      <Flex direction="column" align="flex-start" gap="2px">
                        <Badge bg={sp.bg} color={sp.fg} px="8px" borderRadius="compact">
                          {appointmentStatusLabel(a.status)}
                        </Badge>
                        <Box
                          fontSize="11px"
                          lineHeight="14px"
                          color={a.confirmed ? 'brandGreen700' : 'textSecondary'}
                          data-testid={a.confirmed ? `confirmed-${a.id}` : `unconfirmed-${a.id}`}
                        >
                          {a.confirmed ? 'Подтверждена пациентом' : 'Не подтверждена'}
                        </Box>
                      </Flex>
                    </Table.Cell>
                    <Table.Cell minW="280px" whiteSpace="nowrap">
                      <Flex gap="6px" justify="flex-end" align="center" wrap="nowrap">
                        {isRegistrarTerminal(a.status) ? (
                          <RowActionButton
                            tone="neutral"
                            testId={`print-ticket-${a.id}`}
                            onClick={(e) => {
                              e.stopPropagation()
                              onPrintTicket(a.id)
                            }}
                          >
                            Талон
                          </RowActionButton>
                        ) : (
                          <>
                            <RowActionButton
                              tone="neutral"
                              testId={`print-ticket-${a.id}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                onPrintTicket(a.id)
                              }}
                            >
                              Талон
                            </RowActionButton>
                            {a.status === 'arrived' ? (
                              <RowActionButton
                                tone="outlineGreen"
                                testId={`mark-waiting-${a.id}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onMarkWaiting(a.id)
                                }}
                              >
                                Отменить приход
                              </RowActionButton>
                            ) : a.status === 'no_show' ? null : (
                              <RowActionButton
                                tone="primary"
                                testId={`mark-arrived-${a.id}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onMarkArrived(a.id)
                                }}
                              >
                                Отметить приход
                              </RowActionButton>
                            )}
                            {a.status !== 'no_show' ? (
                              <RowActionButton
                                tone="danger"
                                testId={`mark-noshow-${a.id}`}
                                title={
                                  confirmingNoShow
                                    ? `Подтвердите неявку: ${a.patientName ?? 'пациент'}`
                                    : 'Отметить неявку'
                                }
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (confirmNoShowId !== a.id) {
                                    setConfirmNoShowId(a.id)
                                    return
                                  }
                                  setConfirmNoShowId(null)
                                  onMarkNoShow(a.id)
                                }}
                              >
                                {confirmingNoShow
                                  ? `Да, неявка (${formatTime(a.start)})`
                                  : 'Не пришёл'}
                              </RowActionButton>
                            ) : null}
                          </>
                        )}
                      </Flex>
                    </Table.Cell>
                  </Table.Row>
                )
              })
            )}
          </Table.Body>
        </Table.Root>
      </Box>
    </Box>
  )
}
