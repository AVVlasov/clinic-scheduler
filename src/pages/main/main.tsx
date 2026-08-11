import React from 'react'
import { Box, Button, Flex, Grid, Stack, Text } from '@chakra-ui/react'
import { useNavigate } from 'react-router-dom'

import { URLs } from '../../__data__/urls'

const formatToday = (): string => {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}.${mm}.${yyyy}`
}

const WEEKDAY = [
  'Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота',
]

const QUICK_ROUTES = [
  { slug: 'operator', title: 'АРМ оператора', path: URLs.arms.operator, hint: 'Сетка смены и запись пациентов' },
  { slug: 'doctor', title: 'АРМ врача', path: URLs.arms.doctor, hint: 'Карточка приёма и день врача' },
  { slug: 'registrar', title: 'АРМ регистратора', path: URLs.arms.registrar, hint: 'Очередь смены и отметки прихода' },
  { slug: 'admin', title: 'АРМ администратора', path: URLs.arms.admin, hint: 'Шаблоны приёма и справочник врачей' },
] as const

export const MainPage: React.FC = () => {
  const navigate = useNavigate()
  const today = new Date()

  return (
    <Flex
      h="100%"
      direction="column"
      align="stretch"
      gap="4"
      p="4"
      bg="surfaceLight"
      data-testid="main-page"
    >
      <Box
        bg="white"
        borderWidth="1px"
        borderStyle="solid"
        borderColor="borderLight"
        borderRadius="compact"
        p="5"
      >
        <Flex align="center" gap="4" flexWrap="wrap">
          <Stack gap="0">
            <Text fontSize="12px" color="textSecondary">Стартовый экран</Text>
            <Text
              fontSize="24px"
              fontWeight="700"
              lineHeight="32px"
              color="brandGreen700"
              data-testid="main-shift-date"
            >
              Начало смены: {WEEKDAY[today.getDay()].toLowerCase()}, {formatToday()}
            </Text>
          </Stack>
          <Box flex="1" />
          {/* Дата смены названа в заголовке — второй такой же плашки рядом быть не должно. */}
          <Stack gap="0" align="flex-end">
            <Text fontSize="12px" color="textSecondary">Площадка</Text>
            <Text fontSize="18px" fontWeight="700" color="textPrimary" data-testid="main-site">
              Динамо
            </Text>
          </Stack>
        </Flex>
      </Box>

      <Flex align="center" gap="2" px="1">
        <Text fontSize="18px" fontWeight="700" color="textPrimary">
          Открыть рабочее место
        </Text>
        <Text fontSize="13px" color="textSecondary">
          Выберите АРМ, на котором работает смена
        </Text>
      </Flex>

      <Grid
        templateColumns={{
          base: '1fr',
          md: 'repeat(2, minmax(0, 1fr))',
          lg: 'repeat(4, minmax(0, 1fr))',
        }}
        gap="3"
      >
        {QUICK_ROUTES.map((route) => (
          <Box
            key={route.slug}
            bg="white"
            borderWidth="1px"
            borderStyle="solid"
            borderColor="borderLight"
            borderRadius="compact"
            p="4"
            display="flex"
            flexDirection="column"
            gap="3"
            data-testid={`main-card-${route.slug}`}
          >
            {/* Название рабочего места — главное в карточке, подсказка вторична. */}
            <Stack gap="1">
              <Text fontSize="15px" fontWeight="700" color="textPrimary" lineHeight="20px">
                {route.title}
              </Text>
              <Text fontSize="13px" color="textSecondary" lineHeight="18px">
                {route.hint}
              </Text>
            </Stack>
            <Box flex="1" />
            <Button
              type="button"
              size="md"
              borderRadius="pill"
              bg="brandGreenDark"
              color="white"
              fontWeight="700"
              _hover={{ bg: 'brandGreen700' }}
              onClick={() => navigate(route.path)}
              data-testid={`main-card-${route.slug}-open`}
            >
              Открыть
            </Button>
          </Box>
        ))}
      </Grid>
    </Flex>
  )
}
