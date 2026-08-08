import React from 'react'
import { Box, Button, Flex, Grid, GridItem, Input, Text, Textarea } from '@chakra-ui/react'

import type { Appointment, Service } from '../../__data__/types'

export type VisitType = 'first' | 'repeat'

export interface VisitFormState {
  complaints: string
  diagnosis: string
  visitType: VisitType
  selectedServiceIds: string[]
  recommendations: string[]
  nextVisit: string
}

export const emptyVisitFormState: VisitFormState = {
  complaints: '',
  diagnosis: '',
  visitType: 'first',
  selectedServiceIds: [],
  recommendations: [],
  nextVisit: '',
}

interface VisitFormProps {
  appointment: Appointment | null
  services: Service[]
  state: VisitFormState
  onChange: (next: VisitFormState) => void
  onFinish: () => void
  isSubmitting: boolean
  alreadyCompleted: boolean
}

const FOLLOW_UP_PRESETS = [
  'Контрольный осмотр через 7 дней',
  'КТ контрольная через 14 дней',
  'Снятие швов через 10 дней',
  'Повторная консультация',
]

const formatPrice = (s: Service): string => `${s.price} ₽`

const formatCode = (s: Service): string => {
  const prefix = s.category === 'Приём' ? 'PRM' : s.category === 'Диагностика' ? 'DGN' : 'LAB'
  const id = s.id.replace(/^[a-z]-/, '')
  return `${prefix}.${id}`
}

export const isVisitFormValid = (state: VisitFormState): boolean =>
  state.complaints.trim().length > 0 && state.diagnosis.trim().length > 0

export const VisitForm = ({
  appointment,
  services,
  state,
  onChange,
  onFinish,
  isSubmitting,
  alreadyCompleted,
}: VisitFormProps) => {
  const isValid = isVisitFormValid(state)
  const canSubmit = isValid && !isSubmitting && !alreadyCompleted && Boolean(appointment)

  const update = <K extends keyof VisitFormState>(key: K, value: VisitFormState[K]) => {
    onChange({ ...state, [key]: value })
  }

  const toggleService = (id: string) => {
    const has = state.selectedServiceIds.includes(id)
    update(
      'selectedServiceIds',
      has ? state.selectedServiceIds.filter((s) => s !== id) : [...state.selectedServiceIds, id],
    )
  }

  const toggleRecommendation = (label: string) => {
    const has = state.recommendations.includes(label)
    update(
      'recommendations',
      has ? state.recommendations.filter((r) => r !== label) : [...state.recommendations, label],
    )
  }

  const chosenServices = services.filter((s) => state.selectedServiceIds.includes(s.id))

  return (
    <Box display="flex" flexDirection="column" gap="5" maxW="760px">
      <Box display="flex" flexDirection="column" gap="1">
        <Text fontSize="13px" fontWeight="700" color="textPrimary">Жалобы</Text>
        <Textarea
          minH="64px"
          value={state.complaints}
          onChange={(e) => update('complaints', e.target.value)}
          placeholder="Опишите жалобы пациента"
          data-testid="visit-complaints"
          borderColor="borderDark"
        />
      </Box>

      <Flex gap="3" align="flex-start">
        <Box flex="1" display="flex" flexDirection="column" gap="1">
          <Text fontSize="13px" fontWeight="700" color="textPrimary">Диагноз по МКБ-10</Text>
          <Input
            value={state.diagnosis}
            onChange={(e) => update('diagnosis', e.target.value)}
            placeholder="Например, K01.1 Ретенированный зуб"
            data-testid="visit-diagnosis"
            borderColor="borderDark"
          />
        </Box>
        <Box w="220px" flex="none" display="flex" flexDirection="column" gap="1">
          <Text fontSize="13px" fontWeight="700" color="textPrimary">Тип приёма</Text>
          <Flex gap="6px">
            <Button
              type="button"
              size="sm"
              borderRadius="pill"
              variant={state.visitType === 'first' ? 'solid' : 'outline'}
              bg={state.visitType === 'first' ? 'brandGreen' : 'transparent'}
              color={state.visitType === 'first' ? 'white' : 'textPrimary'}
              borderColor="borderDark"
              onClick={() => update('visitType', 'first')}
              data-testid="visit-type-first"
              data-active={state.visitType === 'first' ? 'true' : 'false'}
              _hover={{ bg: state.visitType === 'first' ? 'brandGreenDark' : 'brandGreenFaint' }}
            >
              Первичный
            </Button>
            <Button
              type="button"
              size="sm"
              borderRadius="pill"
              variant={state.visitType === 'repeat' ? 'solid' : 'outline'}
              bg={state.visitType === 'repeat' ? 'brandGreen' : 'transparent'}
              color={state.visitType === 'repeat' ? 'white' : 'textPrimary'}
              borderColor="borderDark"
              onClick={() => update('visitType', 'repeat')}
              data-testid="visit-type-repeat"
              data-active={state.visitType === 'repeat' ? 'true' : 'false'}
              _hover={{ bg: state.visitType === 'repeat' ? 'brandGreenDark' : 'brandGreenFaint' }}
            >
              Повторный
            </Button>
          </Flex>
        </Box>
      </Flex>

      <Box display="flex" flexDirection="column" gap="2">
        <Text fontSize="13px" fontWeight="700" color="textPrimary">Выполненные услуги</Text>
        {services.length === 0 && (
          <Text fontSize="12px" color="textSecondary">
            Справочник услуг пуст — выберите услуги из загруженного списка.
          </Text>
        )}
        {services.length > 0 && (
          <Box borderWidth="1px" borderStyle="solid" borderColor="borderLight" borderRadius="compact">
            <Grid templateColumns="1fr 120px 110px" fontSize="12px" color="textSecondary" bg="surfaceLight">
              <GridItem px="3" py="2" borderBottomWidth="1px" borderBottomStyle="solid" borderBottomColor="borderLight">
                Услуга
              </GridItem>
              <GridItem px="3" py="2" borderBottomWidth="1px" borderBottomStyle="solid" borderBottomColor="borderLight">
                Код
              </GridItem>
              <GridItem px="3" py="2" textAlign="right" borderBottomWidth="1px" borderBottomStyle="solid" borderBottomColor="borderLight">
                Стоимость
              </GridItem>
              {services.map((s) => {
                const selected = state.selectedServiceIds.includes(s.id)
                return (
                  <React.Fragment key={s.id}>
                    <GridItem
                      px="3"
                      py="2"
                      borderTopWidth="1px"
                      borderTopStyle="solid"
                      borderTopColor="borderLight"
                      cursor="pointer"
                      onClick={() => toggleService(s.id)}
                      data-testid={`visit-service-${s.id}`}
                    >
                      <Flex align="center" gap="8px">
                        <Box
                          w="14px"
                          h="14px"
                          borderRadius="compact"
                          borderWidth="1px"
                          borderStyle="solid"
                          borderColor={selected ? 'brandGreen' : 'borderDark'}
                          bg={selected ? 'brandGreen' : 'white'}
                          color="white"
                          fontSize="10px"
                          lineHeight="12px"
                          textAlign="center"
                        >
                          {selected ? '✓' : ''}
                        </Box>
                        <Text fontSize="13px" color="textPrimary">{s.name}</Text>
                      </Flex>
                    </GridItem>
                    <GridItem
                      px="3"
                      py="2"
                      borderTopWidth="1px"
                      borderTopStyle="solid"
                      borderTopColor="borderLight"
                      fontFamily="mono"
                      fontSize="12px"
                      color="textPrimary"
                    >
                      {formatCode(s)}
                    </GridItem>
                    <GridItem
                      px="3"
                      py="2"
                      textAlign="right"
                      borderTopWidth="1px"
                      borderTopStyle="solid"
                      borderTopColor="borderLight"
                      fontSize="13px"
                      color="textPrimary"
                      fontVariantNumeric="tabular-nums"
                    >
                      {formatPrice(s)}
                    </GridItem>
                  </React.Fragment>
                )
              })}
              {chosenServices.length === 0 && (
                <GridItem
                  colSpan={3}
                  px="3"
                  py="2"
                  borderTopWidth="1px"
                  borderTopStyle="solid"
                  borderTopColor="borderLight"
                  fontSize="12px"
                  color="textSecondary"
                >
                  Ничего не выбрано — отметьте выполненные услуги.
                </GridItem>
              )}
              {chosenServices.length > 0 && (
                <GridItem
                  colSpan={2}
                  px="3"
                  py="2"
                  borderTopWidth="1px"
                  borderTopStyle="solid"
                  borderTopColor="borderLight"
                  fontSize="13px"
                  fontWeight="700"
                  color="textPrimary"
                >
                  Итого
                </GridItem>
              )}
              {chosenServices.length > 0 && (
                <GridItem
                  px="3"
                  py="2"
                  textAlign="right"
                  borderTopWidth="1px"
                  borderTopStyle="solid"
                  borderTopColor="borderLight"
                  fontSize="13px"
                  fontWeight="700"
                  color="textPrimary"
                  fontVariantNumeric="tabular-nums"
                >
                  {chosenServices
                    .reduce((acc, s) => acc + s.price, 0)
                    .toString()
                    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}{' '}
                  ₽
                </GridItem>
              )}
            </Grid>
          </Box>
        )}
      </Box>

      <Box display="flex" flexDirection="column" gap="2">
        <Text fontSize="13px" fontWeight="700" color="textPrimary">Рекомендации</Text>
        <Flex flexWrap="wrap" gap="6px">
          {FOLLOW_UP_PRESETS.map((label) => {
            const on = state.recommendations.includes(label)
            return (
              <Button
                key={label}
                type="button"
                size="sm"
                borderRadius="pill"
                variant={on ? 'solid' : 'outline'}
                bg={on ? 'brandGreen' : 'transparent'}
                color={on ? 'white' : 'textPrimary'}
                borderColor="borderDark"
                onClick={() => toggleRecommendation(label)}
                data-testid={`visit-rec-${label}`}
                data-active={on ? 'true' : 'false'}
                _hover={{ bg: on ? 'brandGreenDark' : 'brandGreenFaint' }}
              >
                {label}
              </Button>
            )
          })}
        </Flex>
      </Box>

      <Box display="flex" flexDirection="column" gap="1">
        <Text fontSize="13px" fontWeight="700" color="textPrimary">Следующий визит</Text>
        <Input
          type="text"
          value={state.nextVisit}
          onChange={(e) => update('nextVisit', e.target.value)}
          placeholder="Например, через 14 дней"
          data-testid="visit-next"
          borderColor="borderDark"
          maxW="320px"
        />
      </Box>

      <Flex align="center" gap="2" pt="2" borderTopWidth="1px" borderTopStyle="solid" borderTopColor="borderLight">
        <Text fontSize="12px" color="textSecondary">
          {alreadyCompleted
            ? 'Протокол закрыт и передан в МИС'
            : isValid
              ? 'Черновик сохраняется автоматически'
              : 'Заполните жалобы и диагноз, чтобы закрыть приём'}
        </Text>
        <Box flex="1" />
        <Button
          type="button"
          borderRadius="pill"
          bg="brandGreen"
          color="white"
          _hover={{ bg: 'brandGreenDark' }}
          onClick={onFinish}
          disabled={!canSubmit}
          data-testid="visit-finish"
        >
          {isSubmitting ? 'Завершаем…' : 'Завершить приём'}
        </Button>
      </Flex>
    </Box>
  )
}