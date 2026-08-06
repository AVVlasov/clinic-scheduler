import React from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

import { URLs } from '../__data__/urls'

interface ArmDescriptor {
  slug: 'operator' | 'doctor' | 'registrar' | 'admin'
  label: string
  path: string
  testId: string
}

const ARMS: ArmDescriptor[] = [
  { slug: 'operator', label: 'Оператор', path: URLs.arms.operator, testId: 'switcher-operator' },
  { slug: 'doctor', label: 'Врач', path: URLs.arms.doctor, testId: 'switcher-doctor' },
  { slug: 'registrar', label: 'Регистратор', path: URLs.arms.registrar, testId: 'switcher-registrar' },
  { slug: 'admin', label: 'Администратор', path: URLs.arms.admin, testId: 'switcher-admin' },
]

const ARM_LABEL: Record<ArmDescriptor['slug'], string> = {
  operator: 'АРМ оператора',
  doctor: 'АРМ врача',
  registrar: 'АРМ регистратора',
  admin: 'АРМ администратора',
}

const SITE_LABEL = 'Динамо'

const formatToday = (): string => {
  const months = [
    'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
    'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
  ]
  const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота']
  const d = new Date()
  return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`
}

const matchArm = (pathname: string): ArmDescriptor['slug'] | null => {
  if (pathname.startsWith(URLs.arms.operator)) return 'operator'
  if (pathname.startsWith(URLs.arms.doctor)) return 'doctor'
  if (pathname.startsWith(URLs.arms.registrar)) return 'registrar'
  if (pathname.startsWith(URLs.arms.admin)) return 'admin'
  return null
}

const SwitcherItem: React.FC<ArmDescriptor & { active: boolean }> = ({ label, path, testId, active }) => (
  <NavLink
    to={path}
    className="sm-seg__item"
    aria-selected={active}
    data-testid={testId}
    data-active={active}
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '32px',
      padding: '0 12px',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: 400,
      textDecoration: 'none',
      color: active ? 'white' : 'var(--chakra-colors-textPrimary, #1F1F1F)',
      background: active ? 'var(--chakra-colors-brandGreen, #0D9B6C)' : 'transparent',
      transition: 'background-color 120ms ease, color 120ms ease',
    }}
  >
    {label}
  </NavLink>
)

export const AppShell: React.FC = () => {
  const location = useLocation()
  const activeArm = matchArm(location.pathname)
  const activeLabel = activeArm ? ARM_LABEL[activeArm] : 'Стартовый экран'

  return (
    <Flex direction="column" h="100vh" minH="0" bg="surfaceLight" data-testid="app-shell">
      <Flex
        as="header"
        align="center"
        gap="3"
        flex="none"
        h="56px"
        px="4"
        bg="white"
        borderBottomWidth="1px"
        borderBottomStyle="solid"
        borderBottomColor="borderLight"
      >
        <Stack gap="0" flex="none" minW="160px">
          <Text
            fontSize="16px"
            fontWeight="700"
            lineHeight="20px"
            letterSpacing="-0.022em"
            color="brandGreen700"
            data-testid="app-shell-brand"
          >
            СМ-Клиника
          </Text>
          <Text fontSize="12px" lineHeight="16px" color="textSecondary" data-testid="app-shell-arm-label">
            {activeLabel}
          </Text>
        </Stack>

        <Flex
          align="center"
          gap="6px"
          px="10px"
          h="32px"
          bg="surfaceLight"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="borderLight"
          borderRadius="compact"
          data-testid="app-shell-site"
        >
          <Text fontSize="12px" color="textSecondary">Площадка</Text>
          <Text fontSize="13px" fontWeight="700" color="textPrimary">{SITE_LABEL}</Text>
        </Flex>

        <Text
          fontSize="12px"
          color="textSecondary"
          flex="none"
          data-testid="app-shell-date"
        >
          {formatToday()}
        </Text>

        <Box flex="1" />

        <Flex
          role="tablist"
          aria-label="Переключатель рабочих мест"
          gap="2px"
          align="center"
          h="32px"
          px="2px"
          bg="surfaceLight"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="borderLight"
          borderRadius="compact"
          data-testid="app-shell-switcher"
        >
          {ARMS.map((arm) => (
            <SwitcherItem
              key={arm.slug}
              slug={arm.slug}
              label={arm.label}
              path={arm.path}
              testId={arm.testId}
              active={activeArm === arm.slug}
            />
          ))}
        </Flex>

        <Flex
          align="center"
          gap="8px"
          px="2"
          h="32px"
          bg="surfaceLight"
          borderWidth="1px"
          borderStyle="solid"
          borderColor="borderLight"
          borderRadius="compact"
          data-testid="app-shell-user"
        >
          <Flex
            align="center"
            justify="center"
            w="24px"
            h="24px"
            borderRadius="pill"
            bg="brandGreenTint"
            color="brandGreen700"
            fontSize="11px"
            fontWeight="700"
            aria-hidden="true"
          >
            ЕТ
          </Flex>
          <Text fontSize="13px" color="textPrimary">Ефимова Т. С.</Text>
        </Flex>
      </Flex>

      <Box flex="1" minH="0" overflow="hidden" data-testid="app-shell-content">
        <Outlet />
      </Box>
    </Flex>
  )
}
