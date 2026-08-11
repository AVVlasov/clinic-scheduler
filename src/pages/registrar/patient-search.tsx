import React, { useEffect, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

import { getPatients } from '../../__data__/api'
import type { Patient } from '../../__data__/types'

/** ГГГГ-ММ-ДД → ДД.ММ.ГГГГ: в картотеке дата читается по-русски. */
const formatBirthDate = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

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
      {/* Вход в заведение карты один — раздел «Новая карта» в шапке. Здесь
          кнопка появляется только тогда, когда поиск ничего не нашёл: это
          продолжение пути, а не второй такой же вход. */}
      <Flex align="center" gap="2" wrap="wrap">
        <Text fontSize="14px" fontWeight="700">Поиск пациента</Text>
        <Text fontSize="12px" color="textSecondary">по всей картотеке</Text>
      </Flex>
      {/* Подпись поля — одна: подсказка в placeholder, дубля строкой выше нет. */}
      <input
        data-testid="patient-search-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Фамилия, телефон или номер карты"
        aria-label="Поиск пациента по фамилии, телефону или номеру карты"
        style={{
          height: '32px',
          padding: '0 10px',
          border: '1px solid var(--chakra-colors-borderLight, #E2E8F0)',
          borderRadius: '4px',
          fontSize: '13px',
          width: '100%',
          maxWidth: '420px',
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
            <Flex align="center" gap="10px" wrap="wrap">
              <Text fontSize="12px" color="textSecondary" data-testid="patient-search-empty">
                Никого не нашли
              </Text>
              <Box
                as="button"
                data-testid="section-new-patient"
                onClick={onCreateNew}
                h="28px"
                px="10px"
                borderRadius="4px"
                bg="brandGreenDark"
                color="white"
                fontSize="12px"
                fontWeight="700"
                cursor="pointer"
              >
                Завести карту
              </Box>
            </Flex>
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
                <Flex gap="16px" wrap="wrap" fontSize="12px" color="textSecondary" fontFamily="mono">
                  <Box>{p.cardNumber}</Box>
                  <Box>{p.phone}</Box>
                  <Box>{formatBirthDate(p.birthDate)}</Box>
                </Flex>
              </Box>
            ))
          )}
        </Stack>
      ) : null}
    </Stack>
  )
}
