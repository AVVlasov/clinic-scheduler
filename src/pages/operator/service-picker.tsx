import React, { useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

import { filterServicesByQuery } from '../../__data__/booking'
import { doctorsWord } from '../../__data__/plural'
import type { Service } from '../../__data__/types'

interface ServicePickerProps {
  services: Service[]
  selectedId: string | null
  onSelect: (serviceId: string | null) => void
}

export const ServicePicker = ({ services, selectedId, onSelect }: ServicePickerProps) => {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => filterServicesByQuery(services, query), [services, query])
  const selected = selectedId ? services.find((s) => s.id === selectedId) : undefined

  return (
    <Stack
      gap="2"
      data-testid="service-picker"
      data-arm-section="book-by-service"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      p="3"
    >
      <Flex align="center" gap="2" wrap="wrap">
        <Text fontSize="14px" fontWeight="700" color="textPrimary">
          Запись от услуги
        </Text>
        <Box flex="1" />
        {selected ? (
          <Box
            as="button"
            tabIndex={-1}
            data-testid="service-picker-clear"
            onClick={() => onSelect(null)}
            fontSize="12px"
            color="brandGreen700"
            cursor="pointer"
            bg="transparent"
            borderWidth="0"
          >
            Сбросить фильтр
          </Box>
        ) : null}
      </Flex>
      <Text fontSize="12px" color="textSecondary">
        Поиск по названию и категории. После выбора в сетке останутся только подходящие врачи.
      </Text>
      <input
        data-testid="service-picker-search"
        tabIndex={-1}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Название или категория…"
        style={{
          height: '32px',
          padding: '0 10px',
          border: '1px solid var(--chakra-colors-borderLight, #E2E8F0)',
          borderRadius: '4px',
          fontSize: '13px',
          width: '100%',
        }}
      />
      <Stack gap="1" maxH="180px" overflowY="auto" data-testid="service-picker-list">
        {filtered.length === 0 ? (
          <Text fontSize="12px" color="textSecondary" data-testid="service-picker-empty">
            Ничего не найдено
          </Text>
        ) : (
          filtered.map((s) => {
            const active = s.id === selectedId
            return (
              <Box
                as="button"
                key={s.id}
                tabIndex={-1}
                data-testid={`service-option-${s.id}`}
                data-selected={active ? 'true' : 'false'}
                onClick={() => onSelect(active ? null : s.id)}
                textAlign="left"
                px="10px"
                py="8px"
                borderRadius="4px"
                borderWidth="1px"
                borderColor={active ? 'brandGreen' : 'borderLight'}
                bg={active ? 'brandGreenTint' : 'white'}
                cursor="pointer"
              >
                <Text fontSize="13px" fontWeight={active ? '700' : '500'} color={active ? 'brandGreen700' : 'textPrimary'}>
                  {s.name}
                </Text>
                <Text fontSize="12px" color="textSecondary">
                  {s.category} · {s.duration} мин · {s.doctorIds.length} {doctorsWord(s.doctorIds.length)}
                </Text>
              </Box>
            )
          })
        )}
      </Stack>
      {selected ? (
        <Text fontSize="12px" color="brandGreen700" data-testid="service-picker-active">
          Выбрано: {selected.name} — в сетке {selected.doctorIds.length} колонок
        </Text>
      ) : null}
    </Stack>
  )
}
