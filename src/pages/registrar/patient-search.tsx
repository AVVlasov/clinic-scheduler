import React, { useEffect, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

import { getPatients } from '../../__data__/api'
import type { Patient } from '../../__data__/types'

interface PatientSearchProps {
  onSelect: (patient: Patient) => void
  onCreateNew: () => void
}

export const PatientSearch = ({ onSelect, onCreateNew }: PatientSearchProps) => {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<Patient[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setItems([])
      setError(null)
      return undefined
    }
    let cancelled = false
    const timer = window.setTimeout(() => {
      setBusy(true)
      getPatients(q)
        .then((res) => {
          if (cancelled) return
          setItems(res.items)
          setError(null)
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setError(err instanceof Error ? err.message : 'Не удалось найти пациентов')
          setItems([])
        })
        .finally(() => {
          if (!cancelled) setBusy(false)
        })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <Stack
      gap="2"
      data-testid="patient-search"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      p="3"
    >
      <Flex align="center" gap="2" wrap="wrap">
        <Text fontSize="14px" fontWeight="700">Поиск пациента</Text>
        <Box flex="1" />
        <Box
          as="button"
          data-testid="section-new-patient"
          onClick={onCreateNew}
          h="28px"
          px="10px"
          borderRadius="4px"
          bg="brandGreen"
          color="white"
          fontSize="12px"
          fontWeight="700"
          cursor="pointer"
        >
          Новая карта
        </Box>
      </Flex>
      <Text fontSize="12px" color="textSecondary">
        Фамилия, телефон или номер карты — по всей картотеке
      </Text>
      <input
        data-testid="patient-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Фамилия, телефон или номер карты"
        style={{
          height: '32px',
          padding: '0 10px',
          border: '1px solid var(--chakra-colors-borderLight, #E2E8F0)',
          borderRadius: '4px',
          fontSize: '13px',
          width: '100%',
        }}
      />
      {busy ? (
        <Text fontSize="12px" color="textSecondary">Ищем…</Text>
      ) : null}
      {error ? (
        <Text fontSize="12px" color="danger" data-testid="patient-search-error">{error}</Text>
      ) : null}
      {query.trim().length >= 2 && !busy ? (
        <Stack gap="1" data-testid="patient-search-results" maxH="160px" overflowY="auto">
          {items.length === 0 ? (
            <Text fontSize="12px" color="textSecondary" data-testid="patient-search-empty">
              Никого не нашли — заведите новую карту
            </Text>
          ) : (
            items.map((p) => (
              <Box
                as="button"
                key={p.id}
                data-testid={`patient-search-hit-${p.id}`}
                onClick={() => onSelect(p)}
                textAlign="left"
                px="10px"
                py="8px"
                borderRadius="4px"
                borderWidth="1px"
                borderColor="borderLight"
                bg="white"
                cursor="pointer"
              >
                <Text fontSize="13px" fontWeight="700">{p.name}</Text>
                <Text fontSize="12px" color="textSecondary" fontFamily="mono">
                  {p.cardNumber} · {p.phone} · {p.birthDate}
                </Text>
              </Box>
            ))
          )}
        </Stack>
      ) : null}
    </Stack>
  )
}
