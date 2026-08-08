import React from 'react'
import { Badge, Box, Flex, Table } from '@chakra-ui/react'

import type { Appointment, AppointmentStatus, PaymentType } from '../../__data__/types'

export type QueueFilter = 'all' | 'scheduled' | 'arrived' | 'no_show'

export interface QueueTableProps {
  items: Appointment[]
  selectedId: string | null
  filter: QueueFilter
  onFilterChange: (next: QueueFilter) => void
  onSelect: (id: string) => void
  onMarkArrived: (id: string) => void
  onMarkWaiting: (id: string) => void
  onMarkNoShow: (id: string) => void
}

const formatTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

const statusLabel = (s: AppointmentStatus): string => {
  switch (s) {
    case 'scheduled': return 'Ожидает'
    case 'arrived': return 'Пришёл'
    case 'in_progress': return 'На приёме'
    case 'completed': return 'Завершён'
    case 'cancelled': return 'Отменён'
    case 'no_show': return 'Не пришёл'
  }
}

const statusPalette = (s: AppointmentStatus): { bg: string; fg: string } => {
  switch (s) {
    case 'scheduled': return { bg: 'gray.100', fg: 'textSecondary' }
    case 'arrived': return { bg: 'brandGreenTint', fg: 'brandGreen700' }
    case 'in_progress': return { bg: 'brandOrange', fg: 'white' }
    case 'completed': return { bg: 'gray.200', fg: 'textPrimary' }
    case 'cancelled': return { bg: 'gray.200', fg: 'textSecondary' }
    case 'no_show': return { bg: 'danger', fg: 'white' }
  }
}

const paymentLabel = (p: PaymentType): string => {
  switch (p) {
    case 'cash': return 'Наличные'
    case 'card': return 'Карта'
    case 'insurance': return 'Страховка'
  }
}

const paymentPalette = (p: PaymentType): { bg: string; fg: string } => {
  switch (p) {
    case 'cash': return { bg: 'gray.100', fg: 'textPrimary' }
    case 'card': return { bg: 'brandGreenFaint', fg: 'brandGreen700' }
    case 'insurance': return { bg: 'brandOrange', fg: 'white' }
  }
}

const isTerminalForRegistrar = (status: AppointmentStatus): boolean =>
  status === 'completed' || status === 'in_progress'

const FILTERS: Array<{ id: QueueFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'scheduled', label: 'Ожидают' },
  { id: 'arrived', label: 'Пришли' },
  { id: 'no_show', label: 'Не пришёл' },
]

export const QueueTable = (props: QueueTableProps) => {
  const {
    items,
    selectedId,
    filter,
    onFilterChange,
    onSelect,
    onMarkArrived,
    onMarkWaiting,
    onMarkNoShow,
  } = props

  return (
    <Box flex="1" minW="0" bg="white" borderWidth="1px" borderColor="borderLight" borderRadius="compact">
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
                return (
                  <Table.Row
                    key={a.id}
                    bg={isSelected ? 'brandGreenFaint' : undefined}
                    onClick={() => onSelect(a.id)}
                    style={{ cursor: 'pointer' }}
                    aria-selected={isSelected}
                    data-testid={`queue-row-${a.id}`}
                  >
                    <Table.Cell>
                      <Box fontFamily="mono" fontWeight="700">
                        {formatTime(a.start)}
                      </Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Box fontWeight="500">{a.patientName ?? a.patientId}</Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Box>{a.doctorName ?? a.doctorId}</Box>
                      <Box fontSize="11px" color="textSecondary">
                        {a.serviceId ?? '—'}
                      </Box>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge bg={pp.bg} color={pp.fg} px="8px" borderRadius="compact">
                        {paymentLabel(a.paymentType)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge bg={sp.bg} color={sp.fg} px="8px" borderRadius="compact">
                        {statusLabel(a.status)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Flex gap="6px" justify="flex-end">
                        {isTerminalForRegistrar(a.status) ? (
                          <Box
                            as="button"
                            aria-disabled
                            data-disabled
                            title="Печать талона недоступна"
                            px="10px"
                            h="26px"
                            borderRadius="compact"
                            borderWidth="1px"
                            borderColor="borderLight"
                            color="textSecondary"
                            bg="white"
                            fontSize="12px"
                            opacity="0.5"
                            cursor="not-allowed"
                          >
                            Талон
                          </Box>
                        ) : (
                          <>
                            <Box
                              as="button"
                              aria-disabled
                              data-disabled
                              title="Печать талона недоступна"
                              px="10px"
                              h="26px"
                              borderRadius="compact"
                              borderWidth="1px"
                              borderColor="borderLight"
                              color="textSecondary"
                              bg="white"
                              fontSize="12px"
                              opacity="0.5"
                              cursor="not-allowed"
                            >
                              Талон
                            </Box>
                            {a.status === 'arrived' ? (
                              <Box
                                as="button"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  onMarkWaiting(a.id)
                                }}
                                px="10px"
                                h="26px"
                                borderRadius="compact"
                                bg="white"
                                color="brandGreen700"
                                borderWidth="1px"
                                borderColor="brandGreen"
                                fontSize="12px"
                                fontWeight="600"
                                cursor="pointer"
                                data-testid={`mark-waiting-${a.id}`}
                              >
                                Отменить приход
                              </Box>
                            ) : a.status === 'no_show' ? null : (
                              <Box
                                as="button"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  onMarkArrived(a.id)
                                }}
                                px="10px"
                                h="26px"
                                borderRadius="compact"
                                bg="brandGreen"
                                color="white"
                                fontSize="12px"
                                fontWeight="600"
                                cursor="pointer"
                                data-testid={`mark-arrived-${a.id}`}
                              >
                                Отметить приход
                              </Box>
                            )}
                            {a.status !== 'no_show' ? (
                              <Box
                                as="button"
                                onClick={(e: React.MouseEvent) => {
                                  e.stopPropagation()
                                  onMarkNoShow(a.id)
                                }}
                                px="10px"
                                h="26px"
                                borderRadius="compact"
                                bg="white"
                                color="danger"
                                borderWidth="1px"
                                borderColor="danger"
                                fontSize="12px"
                                fontWeight="600"
                                cursor="pointer"
                                title="Отметить неявку"
                              >
                                Не пришёл
                              </Box>
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
