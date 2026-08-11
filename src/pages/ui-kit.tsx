import React from 'react'
import { Box, Stack, Text } from '@chakra-ui/react'

/**
 * Общие примитивы интерфейса АРМ.
 *
 * ЗАЧЕМ. `FilterChip` был объявлен дважды дословно (лист ожидания и массовая
 * отмена) плюс третьей копией внутри очереди регистратора, где кегль уже
 * разошёлся: 13px против 12px. Заказчик переключает рабочие места за минуту и
 * видит один и тот же элемент тремя разными. Копия примитива — это не экономия,
 * а гарантия расхождения.
 */

interface FilterChipProps {
  active: boolean
  onClick: () => void
  label: string
  testId?: string
  /** Чип внутри таблицы не должен перехватывать фокус у строк. */
  tabIndex?: number
}

export const FilterChip = ({ active, onClick, label, testId, tabIndex }: FilterChipProps) => (
  <Box
    as="button"
    onClick={onClick}
    tabIndex={tabIndex}
    px="10px"
    h="26px"
    borderRadius="pill"
    borderWidth="1px"
    borderColor={active ? 'brandGreen' : 'borderLight'}
    bg={active ? 'brandGreenTint' : 'white'}
    color={active ? 'brandGreen700' : 'textPrimary'}
    fontSize="12px"
    fontWeight={active ? '600' : '400'}
    _hover={{ borderColor: active ? 'brandGreen700' : 'borderDark' }}
    data-testid={testId}
    data-active={active}
  >
    {label}
  </Box>
)

interface StatTileProps {
  value: string
  label: string
  testId: string
  /** Идентификатор для подписи — когда значение и подпись проверяют раздельно. */
  labelTestId?: string
}

/**
 * Показатель смены.
 *
 * Плитка была нарисована дважды и по-разному: у оператора значение сверху
 * 24px/600 с выравниванием влево, у регистратора подпись сверху, значение снизу
 * 20px/700 и вправо. Заказчик переключает рабочие места за минуту — и видит два
 * разных продукта. Порядок «значение, под ним подпись» выбран потому, что
 * сотрудник читает цифру, а не заголовок.
 */
export const StatTile = ({ value, label, testId, labelTestId }: StatTileProps) => (
  <Stack gap="2px" minW="0">
    <Text
      fontSize="24px"
      lineHeight="30px"
      fontWeight="600"
      letterSpacing="-0.02em"
      fontFamily="mono"
      color="textPrimary"
      data-testid={testId}
    >
      {value}
    </Text>
    <Text fontSize="12px" lineHeight="16px" color="textSecondary" data-testid={labelTestId}>
      {label}
    </Text>
  </Stack>
)
