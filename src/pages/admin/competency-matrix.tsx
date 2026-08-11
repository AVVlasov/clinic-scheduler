import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

import { getCompetencies, setCompetency } from '../../__data__/api'
import type { CompetencyMatrix as Matrix, CompetencyValue } from '../../__data__/types'

/**
 * «Матрица компетенций» (ФТ 1.5, С7, С12, ДКЦ3) — врач × услуга.
 *
 * Клетка правится в тот же справочник, по которому сервер отказывает в записи:
 * снятый допуск сразу убирает врача из «Записи от услуги» и из карточки слота.
 * Матрица «для галочки», не влияющая на запись, скрывала бы ровно ту ошибку,
 * ради которой её и завели.
 */

const NEXT_VALUE: Record<CompetencyValue, CompetencyValue> = {
  no: 'yes',
  yes: 'limited',
  limited: 'no',
}

const MARK: Record<CompetencyValue, string> = {
  yes: '✓',
  limited: '!',
  no: '·',
}

const VALUE_LABEL: Record<CompetencyValue, string> = {
  yes: 'выполняет',
  limited: 'выполняет с ограничением',
  no: 'не выполняет',
}

const CELL_STYLE: Record<CompetencyValue, { bg: string; color: string }> = {
  yes: { bg: 'brandGreenTint', color: 'brandGreen700' },
  limited: { bg: 'brandOrange', color: 'textOnOrange' },
  no: { bg: 'surfaceLight', color: 'textSecondary' },
}

export const CompetencyMatrixScreen = () => {
  const [matrix, setMatrix] = useState<Matrix | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)
  const [lastChange, setLastChange] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    getCompetencies()
      .then((res) => {
        if (cancelled) return
        setMatrix(res)
        setError(null)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Не удалось загрузить матрицу компетенций')
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const valueOf = useCallback(
    (serviceId: string, doctorId: string): CompetencyValue => {
      const row = matrix?.cells.find((c) => c.serviceId === serviceId)
      return row?.values.find((v) => v.doctorId === doctorId)?.value ?? 'no'
    },
    [matrix],
  )

  const handleCellClick = useCallback(
    (serviceId: string, doctorId: string) => {
      if (!matrix) return
      const key = `${serviceId}:${doctorId}`
      if (pending) return
      const next = NEXT_VALUE[valueOf(serviceId, doctorId)]
      setPending(key)
      setSaveError(null)
      setCompetency({ serviceId, doctorId, value: next })
        .then((res) => {
          setMatrix(res.matrix)
          const doctor = res.matrix.doctors.find((d) => d.id === doctorId)
          const service = res.matrix.services.find((s) => s.id === serviceId)
          setLastChange(
            `${doctor?.name ?? doctorId}, ${service?.name ?? serviceId} — ${VALUE_LABEL[res.value]}`,
          )
          setPending(null)
        })
        .catch((err: unknown) => {
          setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить допуск')
          setPending(null)
        })
    },
    [matrix, pending, valueOf],
  )

  const counts = useMemo(() => {
    if (!matrix) return { yes: 0, limited: 0, no: 0 }
    const acc = { yes: 0, limited: 0, no: 0 }
    for (const row of matrix.cells) {
      for (const cell of row.values) acc[cell.value] += 1
    }
    return acc
  }, [matrix])

  return (
    <Stack
      flex="1"
      minW="0"
      minH="0"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      gap="0"
      data-arm-section="matrix"
      data-testid="matrix-screen"
    >
      <Flex
        align="center"
        gap="10px"
        flexWrap="wrap"
        p="12px 16px"
        borderBottomWidth="1px"
        borderBottomColor="borderLight"
      >
        <Text fontSize="18px" lineHeight="24px" fontWeight="700" letterSpacing="-0.022em">
          Матрица компетенций
        </Text>
        <Text fontSize="12px" color="textSecondary">
          Врач × услуга: допуск решает, кого предложит запись от услуги
        </Text>
        <Box flex="1" />
        <Flex gap="16px" fontSize="12px" color="textSecondary" data-testid="matrix-counts">
          <Box>Выполняют: {counts.yes}</Box>
          <Box>С ограничением: {counts.limited}</Box>
          <Box>Не выполняют: {counts.no}</Box>
        </Flex>
      </Flex>

      {isLoading ? (
        <Text p="16px" fontSize="13px" color="textSecondary" data-testid="matrix-loading">
          Загрузка матрицы компетенций…
        </Text>
      ) : null}

      {error ? (
        <Text p="16px" fontSize="13px" color="danger" data-testid="matrix-error">
          {error}
        </Text>
      ) : null}

      {matrix && !isLoading && !error ? (
        <Box flex="1" overflow="auto" p="16px">
          {saveError ? (
            <Box
              mb="10px"
              p="8px 14px"
              bg="danger"
              color="white"
              borderRadius="compact"
              fontSize="13px"
              data-testid="matrix-save-error"
            >
              {saveError}
            </Box>
          ) : null}

          <Box as="table" style={{ borderCollapse: 'collapse', width: 'auto', minWidth: '100%' }}>
            <Box as="thead">
              <Box as="tr">
                <Box
                  as="th"
                  style={{
                    minWidth: '210px',
                    textAlign: 'left',
                    verticalAlign: 'bottom',
                    padding: '0 8px 10px 0',
                    fontSize: '11px',
                    fontWeight: 400,
                  }}
                >
                  <Text fontSize="11px" color="textSecondary">Врач</Text>
                </Box>
                {matrix.services.map((service) => (
                  <Box
                    as="th"
                    key={service.id}
                    style={{
                      width: '46px',
                      height: '150px',
                      verticalAlign: 'bottom',
                      padding: '0 0 10px',
                    }}
                  >
                    <Box
                      as="span"
                      display="inline-block"
                      style={{
                        writingMode: 'vertical-rl',
                        transform: 'rotate(180deg)',
                        whiteSpace: 'nowrap',
                        fontSize: '11px',
                        fontWeight: 400,
                      }}
                      title={`${service.name}, ${service.category}`}
                    >
                      {service.name}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
            <Box as="tbody">
              {matrix.doctors.map((doctor) => (
                <Box as="tr" key={doctor.id} data-testid={`matrix-row-${doctor.id}`}>
                  <Box as="td" style={{ padding: '0 8px 0 0', whiteSpace: 'nowrap' }}>
                    <Text fontSize="13px" fontWeight="500">{doctor.name}</Text>
                    <Text fontSize="11px" color="textSecondary">
                      {doctor.specialty || 'специальность не указана'}
                    </Text>
                  </Box>
                  {matrix.services.map((service) => {
                    const value = valueOf(service.id, doctor.id)
                    const style = CELL_STYLE[value]
                    const key = `${service.id}:${doctor.id}`
                    return (
                      <Box as="td" key={service.id} style={{ padding: '1px' }}>
                        <Box
                          as="button"
                          w="100%"
                          h="34px"
                          bg={style.bg}
                          color={style.color}
                          borderWidth="1px"
                          borderColor="borderLight"
                          borderRadius="2px"
                          fontSize="13px"
                          cursor={pending ? 'progress' : 'pointer'}
                          opacity={pending === key ? 0.6 : 1}
                          data-testid={`matrix-cell-${doctor.id}-${service.id}`}
                          data-value={value}
                          aria-label={`${doctor.name}, ${service.name}: ${VALUE_LABEL[value]}. Нажмите, чтобы изменить допуск`}
                          onClick={() => handleCellClick(service.id, doctor.id)}
                        >
                          {MARK[value]}
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              ))}
            </Box>
          </Box>

          <Flex gap="18px" flexWrap="wrap" pt="14px" fontSize="12px" color="textSecondary">
            <span>✓ — выполняет</span>
            <span>! — выполняет с ограничением</span>
            <span>· — не выполняет</span>
            <span>Допуск меняется нажатием на клетку</span>
          </Flex>

          {lastChange ? (
            <Box
              mt="12px"
              p="8px 14px"
              bg="brandGreenFaint"
              borderWidth="1px"
              borderColor="brandGreen"
              borderRadius="compact"
              maxW="760px"
              data-testid="matrix-last-change"
            >
              <Text fontSize="13px" color="brandGreen700">
                Сохранено: {lastChange}
              </Text>
              <Text fontSize="12px" color="textSecondary" lineHeight="18px">
                Допуск действует сразу: закрытую услугу оператор больше не предложит,
                и записать к этому врачу на неё будет нельзя.
              </Text>
            </Box>
          ) : null}
        </Box>
      ) : null}
    </Stack>
  )
}
