import React, { useEffect, useMemo, useState } from 'react'
import { Box, Button, Flex, Grid, GridItem, Input, Text, Textarea } from '@chakra-ui/react'

import { formatRub } from '../../__data__/money'
import { palette } from '../../__data__/tokens'

import { todayDate } from '../../__data__/dates'
import type { Appointment, Service } from '../../__data__/types'

import { formatDayMonth } from './labels'
import { servicesAllowedForDoctor } from './service-access'

export type VisitType = 'first' | 'repeat'

export interface VisitFormState {
  complaints: string
  diagnosis: string
  visitType: VisitType
  selectedServiceIds: string[]
  recommendations: string[]
  nextVisitDate: string
  nextVisitServiceId: string
}

export const emptyVisitFormState: VisitFormState = {
  complaints: '',
  diagnosis: '',
  visitType: 'first',
  selectedServiceIds: [],
  recommendations: [],
  nextVisitDate: '',
  nextVisitServiceId: '',
}

interface VisitFormProps {
  appointment: Appointment | null
  services: Service[]
  state: VisitFormState
  onChange: (next: VisitFormState) => void
  onFinish: () => void
  isSubmitting: boolean
  alreadyCompleted: boolean
  blockReason: string | null
  submitError: string | null
  onDismissError: () => void
}

/**
 * Пресеты рекомендаций под специальности площадки: терапевт, кардиолог,
 * педиатр, невролог, эндокринолог, хирург. Прежний набор был перенесён из
 * стоматологического макета вместе с «Снятием швов через 10 дней» — врачу
 * такого профиля эта строка не нужна ни разу за смену.
 */
const FOLLOW_UP_PRESETS = [
  'Контрольный осмотр через 7 дней',
  'Явка с результатами анализов',
  'Контроль давления через 14 дней',
  'Повторная консультация',
]

// Цена строки и «Итого» проходят через один форматтер: иначе в одной
// таблице соседствуют «2500 ₽» и «2 500 ₽».
const formatPrice = (s: Service): string => formatRub(s.price)

const formatCode = (s: Service): string => {
  const prefix = s.category === 'Приём' ? 'PRM' : s.category === 'Диагностика' ? 'DGN' : 'LAB'
  const id = s.id.replace(/^[a-z]-/, '')
  return `${prefix}.${id}`
}

/** День приёма в формате ГГГГ-ММ-ДД — нижняя граница для даты следующего визита. */
export const visitDayOf = (appointment: Appointment | null): string | null => {
  if (!appointment) return null
  const start = new Date(appointment.start)
  if (Number.isNaN(start.getTime())) return null
  return todayDate(start)
}

/**
 * Причина, по которой дата следующего визита не годится. Без нижней границы заявка
 * уходила оператору задним числом: подобрать слот во вчерашнем дне нечем.
 */
export const nextVisitDateProblem = (
  state: VisitFormState,
  visitDay: string | null,
): string | null => {
  if (!state.nextVisitDate || !visitDay) return null
  if (state.nextVisitDate >= visitDay) return null
  return `Дата следующего визита не может быть раньше дня приёма — ${formatDayMonth(visitDay)}`
}

export const isVisitFormValid = (state: VisitFormState, visitDay: string | null = null): boolean =>
  state.complaints.trim().length > 0
  && state.diagnosis.trim().length > 0
  && nextVisitDateProblem(state, visitDay) === null

export const VisitForm = ({
  appointment,
  services,
  state,
  onChange,
  onFinish,
  isSubmitting,
  alreadyCompleted,
  blockReason,
  submitError,
  onDismissError,
}: VisitFormProps) => {
  const visitDay = visitDayOf(appointment)
  const nextVisitProblem = nextVisitDateProblem(state, visitDay)
  const isValid = isVisitFormValid(state, visitDay)
  const canSubmit =
    isValid && !isSubmitting && !alreadyCompleted && blockReason === null && Boolean(appointment)

  const [isConfirming, setIsConfirming] = useState(false)
  // Подтверждение живёт ровно на том приёме, где его открыли: смена записи или
  // закрытие протокола делают вопрос бессмысленным.
  useEffect(() => {
    setIsConfirming(false)
  }, [appointment?.id, alreadyCompleted])

  const doctorId = appointment?.doctorId ?? null
  // Допуск врача решает не только запись, но и деньги: отмеченная услуга уходит
  // в «К оплате» регистратора, поэтому чужих позиций в списке быть не должно.
  const availableServices = useMemo(
    () => servicesAllowedForDoctor(services, doctorId),
    [services, doctorId],
  )
  const hiddenServicesCount = services.length - availableServices.length

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

  const chosenServices = availableServices.filter((s) => state.selectedServiceIds.includes(s.id))

  return (
    <Box display="flex" flexDirection="column" gap="5" maxW="760px" data-arm-section="protocol">
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
            placeholder="Например, J06.9 Острая инфекция верхних дыхательных путей"
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
              bg={state.visitType === 'first' ? 'brandGreenDark' : 'transparent'}
              color={state.visitType === 'first' ? 'textOnGreen' : 'textPrimary'}
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
              bg={state.visitType === 'repeat' ? 'brandGreenDark' : 'transparent'}
              color={state.visitType === 'repeat' ? 'textOnGreen' : 'textPrimary'}
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
        {availableServices.length === 0 && (
          <Text fontSize="12px" color="textSecondary" data-testid="visit-services-empty">
            {services.length === 0
              ? 'Справочник услуг пуст — отметить нечего.'
              : 'У врача этой записи нет допуска ни к одной услуге справочника.'}
          </Text>
        )}
        {availableServices.length > 0 && hiddenServicesCount > 0 && (
          <Text fontSize="12px" color="textSecondary" data-testid="visit-services-scope">
            Показаны только услуги из допуска врача: {availableServices.length} из {services.length}
          </Text>
        )}
        {availableServices.length > 0 && (
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
              {availableServices.map((s) => {
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
                          bg={selected ? 'brandGreenDark' : 'white'}
                          color={selected ? 'textOnGreen' : 'textPrimary'}
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
                  {formatRub(chosenServices.reduce((acc, s) => acc + s.price, 0))}
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
                bg={on ? 'brandGreenDark' : 'transparent'}
                color={on ? 'textOnGreen' : 'textPrimary'}
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

      <Box display="flex" flexDirection="column" gap="2">
        <Text fontSize="13px" fontWeight="700" color="textPrimary">Следующий визит</Text>
        <Flex gap="2" flexWrap="wrap" align="center">
          <Input
            type="date"
            value={state.nextVisitDate}
            onChange={(e) => update('nextVisitDate', e.target.value)}
            placeholder="Дата"
            data-testid="visit-next-date"
            borderColor={nextVisitProblem ? 'danger' : 'borderDark'}
            min={visitDay ?? undefined}
            aria-invalid={nextVisitProblem ? true : undefined}
            maxW="180px"
          />
          <select
            data-testid="visit-next-service"
            value={state.nextVisitServiceId}
            onChange={(e) => update('nextVisitServiceId', e.target.value)}
            style={{
              maxWidth: 280,
              padding: '4px 8px',
              border: `1px solid ${palette.borderDark}`,
              borderRadius: 6,
              background: 'white',
              fontSize: 13,
            }}
          >
            <option value="">Услуга повторного визита</option>
            {availableServices.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </Flex>
        {nextVisitProblem !== null && (
          <Text fontSize="12px" color="danger" data-testid="visit-next-date-error">
            {nextVisitProblem}
          </Text>
        )}
      </Box>

      <Flex align="center" gap="2" pt="2" borderTopWidth="1px" borderTopStyle="solid" borderTopColor="borderLight">
        <Text
          fontSize="12px"
          color="textSecondary"
          data-testid="visit-block-reason"
        >
          {alreadyCompleted
            ? 'Протокол закрыт'
            : blockReason !== null
              ? blockReason
              : nextVisitProblem !== null
                ? nextVisitProblem
                : isValid
                  ? 'Заполните протокол и завершите приём'
                  : 'Заполните жалобы и диагноз, чтобы закрыть приём'}
        </Text>
        <Box flex="1" />
        <Button
          type="button"
          borderRadius="pill"
          bg="brandGreenDark"
          color="textOnGreen"
          _hover={{ bg: 'brandGreen700' }}
          onClick={() => setIsConfirming(true)}
          disabled={!canSubmit}
          data-testid="visit-finish"
        >
          {isSubmitting ? 'Завершаем…' : 'Завершить приём'}
        </Button>
      </Flex>

      {/* Завершение — единственное необратимое действие врача: `completed` терминален,
          и после него протокол не правит никто. Спрашиваем до запроса, а не объясняем после. */}
      {isConfirming && !alreadyCompleted && (
        <Box
          role="alertdialog"
          aria-label="Подтверждение завершения приёма"
          data-testid="visit-finish-confirm"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="brandGreenDark"
          borderRadius="compact"
          bg="brandGreenFaint"
          px="3"
          py="3"
          display="flex"
          flexDirection="column"
          gap="2"
        >
          <Text fontSize="13px" color="textPrimary" data-testid="visit-finish-confirm-text">
            Завершить приём? После завершения протокол станет неизменяемым: жалобы, диагноз,
            услуги и рекомендации исправить будет нельзя.
          </Text>
          <Flex gap="2" flexWrap="wrap">
            <Button
              type="button"
              size="sm"
              borderRadius="pill"
              bg="brandGreenDark"
              color="textOnGreen"
              _hover={{ bg: 'brandGreen700' }}
              onClick={() => {
                setIsConfirming(false)
                onFinish()
              }}
              data-testid="visit-finish-confirm-yes"
            >
              Да, завершить приём
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              borderRadius="pill"
              borderColor="borderDark"
              color="textPrimary"
              bg="white"
              _hover={{ bg: 'surfaceLight' }}
              onClick={() => setIsConfirming(false)}
              data-testid="visit-finish-confirm-no"
            >
              Вернуться к протоколу
            </Button>
          </Flex>
        </Box>
      )}
      {submitError !== null && (
        <Flex
          align="center"
          gap="2"
          bg="surfaceLight"
          color="textPrimary"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="danger"
          borderRadius="compact"
          px="3"
          py="2"
          data-testid="visit-submit-error"
        >
          <Text fontSize="13px" flex="1" data-testid="visit-submit-error-text">
            {submitError}
          </Text>
          <Button
            type="button"
            size="sm"
            variant="outline"
            borderRadius="pill"
            borderColor="danger"
            color="danger"
            bg="white"
            _hover={{ bg: 'surfaceLight' }}
            onClick={onDismissError}
            data-testid="visit-submit-error-dismiss"
          >
            Закрыть
          </Button>
        </Flex>
      )}
    </Box>
  )
}