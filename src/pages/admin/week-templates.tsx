import React from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import type {
  PublishWeekResult,
  WeekTemplateInterval,
  WeekTemplateKind,
  WeekTemplates as WeekTemplatesData,
} from '../../__data__/types'

const DOCTOR_COL_WIDTH = '220px'
const CELL_MIN_WIDTH = '118px'

/** Легенда режимов из макета ARM-admin: подпись и оформление ячейки. */
const KIND_LABEL: Record<WeekTemplateKind, string> = {
  work: 'Приём по шаблону',
  block: 'Блокировка',
  break: 'Сокращённый день',
  absent: 'Отсутствие',
  off: 'Нет приёма',
}

const KIND_STYLE: Record<WeekTemplateKind, { bg: string; bar: string; ink: string }> = {
  work: { bg: 'brandGreenTint', bar: 'brandGreen', ink: 'brandGreen700' },
  block: { bg: 'surfaceLight', bar: 'brandOrange', ink: 'brandOrange700' },
  break: { bg: 'white', bar: 'brandOrange', ink: 'brandOrange700' },
  absent: { bg: 'surfaceLight', bar: 'borderLight', ink: 'textSecondary' },
  off: { bg: 'surfaceLight', bar: 'transparent', ink: 'textSecondary' },
}

/**
 * Разряды числа разделяются пробелом без опоры на локаль окружения: итог
 * публикации обязан читаться одинаково и в браузере, и в тесте.
 */
const formatCount = (value: number): string =>
  String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

const formatDayDate = (date: string): string => {
  const [, mm, dd] = date.split('-')
  return `${dd}.${mm}`
}

/**
 * Интервалы с нулевой длительностью («отсутствие», «нет приёма») временем не
 * подписываются: у такого режима нет границ, и «00:00–00:00» был бы ложью.
 */
const intervalText = (interval: WeekTemplateInterval): string => {
  if (interval.start === interval.end) return KIND_LABEL[interval.kind]
  return `${interval.start}–${interval.end}`
}

interface WeekTemplatesProps {
  data: WeekTemplatesData | null
  isLoading: boolean
  templatesError: string | null
  weekStart: string
  canGoPrev: boolean
  canGoNext: boolean
  onWeekPrev: () => void
  onWeekNext: () => void
  publishState: 'idle' | 'confirming' | 'publishing'
  publishResult: PublishWeekResult | null
  publishError: string | null
  onPublishClick: () => void
  onPublishConfirm: () => void
  onPublishCancel: () => void
}

export const WeekTemplates = ({
  data,
  isLoading,
  templatesError,
  weekStart,
  canGoPrev,
  canGoNext,
  onWeekPrev,
  onWeekNext,
  publishState,
  publishResult,
  publishError,
  onPublishClick,
  onPublishConfirm,
  onPublishCancel,
}: WeekTemplatesProps) => (
  <Stack
    flex="1"
    minW="0"
    gap="0"
    bg="white"
    borderWidth="1px"
    borderColor="borderLight"
    borderRadius="compact"
    data-testid="week-templates"
  >
    {isLoading && !templatesError && !data ? (
      <Box p="6" data-testid="week-templates-loading">
        <Text fontSize="13px" color="textSecondary">
          Загрузка шаблонов…
        </Text>
      </Box>
    ) : templatesError ? (
      <Box
        m="12px 16px"
        p="8px 14px"
        bg="danger"
        color="white"
        borderRadius="compact"
        fontSize="13px"
        data-testid="week-templates-error"
      >
        {templatesError}
      </Box>
    ) : data ? (
      <>
        <Flex
          align="center"
          gap="10px"
          flexWrap="wrap"
          p="12px 16px"
          borderBottomWidth="1px"
          borderColor="borderLight"
        >
          <Flex
            align="center"
            gap="4px"
            bg="surfaceLight"
            borderWidth="1px"
            borderColor="borderLight"
            borderRadius="compact"
            p="2px"
            data-testid="week-selector"
          >
            <Button
              type="button"
              size="sm"
              variant="outline"
              borderRadius="compact"
              borderColor="transparent"
              bg="transparent"
              color="textPrimary"
              _hover={{ bg: 'white' }}
              onClick={onWeekPrev}
              disabled={!canGoPrev}
              data-testid="week-prev"
              aria-label="Предыдущая неделя"
            >
              ←
            </Button>
            <Text
              fontSize="13px"
              fontWeight="700"
              color="brandGreen700"
              px="10px"
              data-testid="week-current"
            >
              {weekStart}
            </Text>
            <Button
              type="button"
              size="sm"
              variant="outline"
              borderRadius="compact"
              borderColor="transparent"
              bg="transparent"
              color="textPrimary"
              _hover={{ bg: 'white' }}
              onClick={onWeekNext}
              disabled={!canGoNext}
              data-testid="week-next"
              aria-label="Следующая неделя"
            >
              →
            </Button>
          </Flex>
          <Stack gap="0">
            <Text fontSize="18px" lineHeight="24px" fontWeight="700" letterSpacing="-0.022em">
              Шаблоны приёма на неделю
            </Text>
            <Text fontSize="12px" color="textSecondary" data-testid="week-range">
              {formatDayDate(data.weekStart)} – {formatDayDate(data.weekEnd)} · применяется к сетке
              при публикации
            </Text>
          </Stack>
          <Box flex="1" />
          {data.published ? (
            <Text
              fontSize="12px"
              fontWeight="700"
              color="brandGreen700"
              data-testid="week-published-badge"
            >
              Неделя опубликована
            </Text>
          ) : null}
          <Button
            size="sm"
            bg="brandGreen"
            color="white"
            borderRadius="compact"
            _hover={{ bg: 'brandGreenDark' }}
            disabled={publishState === 'publishing' || data.published}
            onClick={onPublishClick}
            data-testid="publish-week"
          >
            Опубликовать неделю
          </Button>
        </Flex>

        {templatesError ? (
          <Box
            m="12px 16px 0"
            p="8px 14px"
            bg="danger"
            color="white"
            borderRadius="compact"
            fontSize="13px"
            data-testid="week-templates-error"
          >
            {templatesError}
          </Box>
        ) : null}

        {publishState === 'confirming' ? (
          <Box
            role="dialog"
            aria-label="Подтверждение публикации недели"
            m="12px 16px 0"
            p="12px 14px"
            bg="surfaceLight"
            borderWidth="1px"
            borderColor="brandOrange"
            borderRadius="compact"
            data-testid="publish-confirm"
          >
            <Text fontSize="14px" fontWeight="700" color="brandOrange700" mb="1">
              Опубликовать неделю {formatDayDate(data.weekStart)} – {formatDayDate(data.weekEnd)}?
            </Text>
            <Text fontSize="13px" color="textPrimary" lineHeight="18px" mb="3">
              Публикация нарежет слоты по шаблонам и применится к сетке приёма. Отменить
              публикацию нельзя.
            </Text>
            <Flex gap="2">
              <Button
                size="sm"
                bg="brandGreen"
                color="white"
                borderRadius="compact"
                _hover={{ bg: 'brandGreenDark' }}
                onClick={onPublishConfirm}
                data-testid="publish-confirm-yes"
              >
                Подтвердить публикацию
              </Button>
              <Button
                size="sm"
                variant="outline"
                borderColor="borderLight"
                borderRadius="compact"
                onClick={onPublishCancel}
                data-testid="publish-confirm-no"
              >
                Отмена
              </Button>
            </Flex>
          </Box>
        ) : null}

        {publishError ? (
          <Box
            m="12px 16px 0"
            p="8px 14px"
            bg="danger"
            color="white"
            borderRadius="compact"
            fontSize="13px"
            data-testid="publish-error"
          >
            {publishError}
          </Box>
        ) : null}

        {publishResult ? (
          <Box
            m="12px 16px 0"
            p="10px 14px"
            bg="brandGreenTint"
            borderWidth="1px"
            borderColor="brandGreen"
            borderRadius="compact"
            data-testid="publish-result"
          >
            <Text fontSize="14px" fontWeight="700" color="brandGreen700">
              Неделя опубликована
            </Text>
            <Text fontSize="13px" color="textPrimary" lineHeight="18px">
              Нарезано {formatCount(publishResult.slotsCreated)} слотов на{' '}
              {formatCount(publishResult.doctorsAffected)} врачей.
            </Text>
          </Box>
        ) : null}

        <Box flex="1" overflow="auto" p="16px">
          <Flex gap="8px" align="flex-end" pb="8px">
            <Box w={DOCTOR_COL_WIDTH} flex="none" fontSize="11px" color="textSecondary">
              Врач
            </Box>
            {data.days.map((day) => (
              <Stack key={day.date} flex="1 1 0" minW={CELL_MIN_WIDTH} gap="1px">
                <Text fontSize="13px" lineHeight="17px" fontWeight="500">
                  {day.weekday}
                </Text>
                <Text fontSize="11px" lineHeight="14px" color="textSecondary">
                  {formatDayDate(day.date)}
                </Text>
              </Stack>
            ))}
          </Flex>

          <Stack gap="6px">
            {data.rows.map((row) => (
              <Flex key={row.doctorId} gap="8px" align="stretch" data-testid={`tpl-row-${row.doctorId}`}>
                <Stack
                  w={DOCTOR_COL_WIDTH}
                  flex="none"
                  gap="1px"
                  justify="center"
                  pr="8px"
                  minW="0"
                >
                  <Text
                    fontSize="13px"
                    lineHeight="17px"
                    fontWeight="500"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    {row.doctorName}
                  </Text>
                  <Text
                    fontSize="11px"
                    lineHeight="14px"
                    color="textSecondary"
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                  >
                    {row.specialty}
                  </Text>
                </Stack>
                {row.days.map((day) => {
                  const primary = day.intervals[0]
                  const style = KIND_STYLE[primary ? primary.kind : 'off']
                  return (
                    <Stack
                      key={`${row.doctorId}-${day.date}`}
                      flex="1 1 0"
                      minW={CELL_MIN_WIDTH}
                      gap="2px"
                      justify="center"
                      position="relative"
                      minH="52px"
                      px="9px 11px"
                      pl="11px"
                      bg={style.bg}
                      borderWidth="1px"
                      borderColor="borderLight"
                      borderLeftWidth="3px"
                      borderLeftColor={style.bar}
                      borderRadius="compact"
                      overflow="hidden"
                      data-testid={`tpl-cell-${row.doctorId}-${day.date}`}
                    >
                      {primary ? (
                        <>
                          <Text fontSize="12px" lineHeight="15px" color={style.ink}>
                            {intervalText(primary)}
                          </Text>
                          <Text fontSize="11px" lineHeight="14px" color="textSecondary">
                            {KIND_LABEL[primary.kind]}
                          </Text>
                          {day.intervals.slice(1).map((extra) => (
                            <Text
                              key={`${extra.start}-${extra.end}-${extra.kind}`}
                              fontSize="11px"
                              lineHeight="14px"
                              color="textSecondary"
                            >
                              {intervalText(extra)}
                            </Text>
                          ))}
                        </>
                      ) : (
                        <Text fontSize="11px" lineHeight="14px" color="textSecondary">
                          {KIND_LABEL.off}
                        </Text>
                      )}
                    </Stack>
                  )
                })}
              </Flex>
            ))}
          </Stack>
        </Box>
      </>
    ) : null}
  </Stack>
)
