import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { ARM_NAV, type ArmNavItem } from '../__data__/arm-nav'
import { formatArmDateLabel, parseArmDate, parseArmDoctorId, shiftDate, todayDate, withArmDate } from '../__data__/dates'
import { getDoctors } from '../__data__/api'
import type { Doctor } from '../__data__/types'
import { URLs } from '../__data__/urls'

interface ArmDescriptor {
  slug: 'operator' | 'doctor' | 'registrar' | 'admin'
  label: string
  path: string
  testId: string
  dateBound: boolean
}

const ARMS: ArmDescriptor[] = [
  { slug: 'operator', label: 'Оператор', path: URLs.arms.operator, testId: 'switcher-operator', dateBound: true },
  { slug: 'doctor', label: 'Врач', path: URLs.arms.doctor, testId: 'switcher-doctor', dateBound: true },
  { slug: 'registrar', label: 'Регистратор', path: URLs.arms.registrar, testId: 'switcher-registrar', dateBound: true },
  { slug: 'admin', label: 'Администратор', path: URLs.arms.admin, testId: 'switcher-admin', dateBound: false },
]

const ARM_LABEL: Record<ArmDescriptor['slug'], string> = {
  operator: 'АРМ оператора',
  doctor: 'АРМ врача',
  registrar: 'АРМ регистратора',
  admin: 'АРМ администратора',
}

const SITE_LABEL = 'Динамо'

const matchArm = (pathname: string): ArmDescriptor | null =>
  ARMS.find((arm) => pathname.startsWith(arm.path)) ?? null

const focusArmSection = (slug: ArmDescriptor['slug'], item: ArmNavItem) => {
  if (item.status !== 'available' || !item.section) return
  const sectionBtn = document.querySelector(`[data-testid="section-${item.section}"]`) as HTMLElement | null
  if (sectionBtn) {
    sectionBtn.click()
    return
  }
  const target = document.querySelector(`[data-arm-section="${item.section}"]`) as HTMLElement | null
  target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
}

const ArmWorkspaceNav: React.FC<{ slug: ArmDescriptor['slug'] }> = ({ slug }) => {
  const items = ARM_NAV[slug]
  const [notice, setNotice] = useState<string | null>(null)
  const [focusIdx, setFocusIdx] = useState(0)

  useEffect(() => {
    setNotice(null)
    setFocusIdx(0)
  }, [slug])

  const availableIdxs = items
    .map((item, idx) => (item.status === 'available' ? idx : -1))
    .filter((idx) => idx >= 0)

  return (
    <Box flex="none" borderBottomWidth="1px" borderBottomStyle="solid" borderBottomColor="borderLight" bg="white">
      <Flex
        as="nav"
        aria-label="Разделы рабочего места"
        data-testid="arm-nav"
        data-arm={slug}
        align="center"
        gap="2px"
        px="3"
        py="6px"
        overflowX="auto"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
          if (availableIdxs.length === 0) return
          const pos = availableIdxs.indexOf(focusIdx)
          const base = pos >= 0 ? pos : 0
          const nextPos = e.key === 'ArrowRight'
            ? Math.min(availableIdxs.length - 1, base + 1)
            : Math.max(0, base - 1)
          const nextIdx = availableIdxs[nextPos]
          setFocusIdx(nextIdx)
          requestAnimationFrame(() => {
            const el = document.querySelector(
              `[data-testid="arm-nav-${items[nextIdx].id}"]`,
            ) as HTMLElement | null
            el?.focus()
          })
        }}
      >
        {items.map((item, idx) => {
          const unavailable = item.status === 'unavailable'
          const label = unavailable && item.task ? `${item.label} · ${item.task}` : item.label
          const tabStop = !unavailable && idx === focusIdx
          return (
            <Box
              as="button"
              key={item.id}
              data-testid={`arm-nav-${item.id}`}
              data-status={item.status}
              aria-disabled={unavailable}
              tabIndex={unavailable ? -1 : (tabStop ? 0 : -1)}
              title={unavailable ? (item.reason ?? item.label) : item.label}
              onFocus={() => {
                if (!unavailable) setFocusIdx(idx)
              }}
              onClick={() => {
                if (unavailable) {
                  const taskBit = item.task ? ` (${item.task})` : ''
                  setNotice(`${item.reason ?? 'Раздел недоступен'}${taskBit}`)
                  return
                }
                setNotice(null)
                setFocusIdx(idx)
                focusArmSection(slug, item)
              }}
              h="28px"
              px="10px"
              flex="none"
              borderRadius="4px"
              borderWidth="1px"
              borderColor={unavailable ? 'borderLight' : 'brandGreen'}
              bg={unavailable ? 'surfaceLight' : 'white'}
              color={unavailable ? 'textSecondary' : 'brandGreen700'}
              fontSize="12px"
              fontWeight={unavailable ? '400' : '700'}
              cursor={unavailable ? 'not-allowed' : 'pointer'}
              opacity={unavailable ? 0.85 : 1}
              whiteSpace="nowrap"
            >
              {label}
            </Box>
          )
        })}
      </Flex>
      {notice ? (
        <Text
          px="3"
          pb="6px"
          fontSize="12px"
          color="textSecondary"
          data-testid="arm-nav-unavailable-reason"
        >
          {notice}
        </Text>
      ) : null}
    </Box>
  )
}

const SwitcherItem: React.FC<ArmDescriptor & { active: boolean; to: string; tabIndex: number }> = ({
  label, to, testId, active, tabIndex,
}) => (
  <NavLink
    to={to}
    className="sm-seg__item"
    role="tab"
    aria-selected={active}
    tabIndex={tabIndex}
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

const DateSwitcher: React.FC<{ date: string; onChange: (next: string) => void }> = ({
  date,
  onChange,
}) => {
  const today = todayDate()
  return (
    <Flex
      align="center"
      gap="4px"
      data-testid="app-shell-date-switcher"
      role="group"
      aria-label="Выбор дня"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onChange(shiftDate(date, -1))
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          onChange(shiftDate(date, 1))
        }
        if (e.key === 'Home') {
          e.preventDefault()
          onChange(today)
        }
      }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'brandGreen700',
        outlineOffset: '2px',
      }}
    >
      <Box
        as="button"
        tabIndex={-1}
        data-testid="date-prev"
        aria-label="Предыдущий день"
        onClick={() => onChange(shiftDate(date, -1))}
        h="28px"
        w="28px"
        borderRadius="4px"
        borderWidth="1px"
        borderColor="borderLight"
        bg="white"
        fontSize="14px"
        lineHeight="1"
        cursor="pointer"
      >
        ‹
      </Box>
      <Text
        fontSize="12px"
        color="textSecondary"
        flex="none"
        minW="140px"
        textAlign="center"
        data-testid="app-shell-date"
      >
        {formatArmDateLabel(date)}
      </Text>
      <Box
        as="button"
        tabIndex={-1}
        data-testid="date-next"
        aria-label="Следующий день"
        onClick={() => onChange(shiftDate(date, 1))}
        h="28px"
        w="28px"
        borderRadius="4px"
        borderWidth="1px"
        borderColor="borderLight"
        bg="white"
        fontSize="14px"
        lineHeight="1"
        cursor="pointer"
      >
        ›
      </Box>
      <Box
        as="button"
        tabIndex={-1}
        data-testid="date-today"
        aria-label="Сегодня"
        onClick={() => onChange(today)}
        h="28px"
        px="8px"
        ml="4px"
        borderRadius="4px"
        borderWidth="1px"
        borderColor="borderLight"
        bg={date === today ? 'brandGreenTint' : 'white'}
        fontSize="12px"
        cursor="pointer"
        color={date === today ? 'brandGreen700' : 'textPrimary'}
      >
        Сегодня
      </Box>
    </Flex>
  )
}

export const AppShell: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const activeArm = matchArm(location.pathname)
  const activeLabel = activeArm ? ARM_LABEL[activeArm.slug] : 'Стартовый экран'
  const selectedDate = useMemo(
    () => parseArmDate(searchParams.toString() ? `?${searchParams.toString()}` : location.search),
    [searchParams, location.search],
  )

  const setDate = useCallback((next: string) => {
    if (!activeArm || !activeArm.dateBound) return
    const doctorId = activeArm.slug === 'doctor' ? parseArmDoctorId(location.search) ?? undefined : undefined
    navigate(withArmDate(activeArm.path, next, doctorId), { replace: true })
  }, [activeArm, navigate, location.search])

  const armLink = useCallback((arm: ArmDescriptor) => {
    if (!arm.dateBound) return arm.path
    const doctorId = arm.slug === 'doctor' ? parseArmDoctorId(location.search) ?? undefined : undefined
    return withArmDate(arm.path, selectedDate, doctorId)
  }, [selectedDate, location.search])

  const [doctors, setDoctors] = useState<Doctor[]>([])
  useEffect(() => {
    if (activeArm?.slug !== 'doctor') return
    let cancelled = false
    getDoctors()
      .then((res) => {
        if (!cancelled) setDoctors(res.items)
      })
      .catch(() => {
        if (!cancelled) setDoctors([])
      })
    return () => {
      cancelled = true
    }
  }, [activeArm?.slug])

  const shellUserLabel = useMemo(() => {
    if (activeArm?.slug === 'doctor') {
      const id = parseArmDoctorId(location.search)
      const doc = doctors.find((d) => d.id === id)
      if (doc) return doc.name
    }
    return 'Ефимова Т. С.'
  }, [activeArm?.slug, doctors, location.search])

  const shellUserInitials = useMemo(() => {
    const parts = shellUserLabel.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
    return shellUserLabel.slice(0, 2).toUpperCase()
  }, [shellUserLabel])

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

        {activeArm?.dateBound ? (
          <DateSwitcher date={selectedDate} onChange={setDate} />
        ) : (
          <Text
            fontSize="12px"
            color="textSecondary"
            flex="none"
            data-testid="app-shell-date"
          >
            {formatArmDateLabel(todayDate())}
          </Text>
        )}

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
          onKeyDown={(e) => {
            if (!activeArm) return
            const idx = ARMS.findIndex((a) => a.slug === activeArm.slug)
            if (e.key === 'ArrowRight' && idx < ARMS.length - 1) {
              e.preventDefault()
              navigate(armLink(ARMS[idx + 1]))
            }
            if (e.key === 'ArrowLeft' && idx > 0) {
              e.preventDefault()
              navigate(armLink(ARMS[idx - 1]))
            }
          }}
        >
          {ARMS.map((arm) => (
            <SwitcherItem
              key={arm.slug}
              slug={arm.slug}
              label={arm.label}
              path={arm.path}
              to={armLink(arm)}
              testId={arm.testId}
              active={activeArm?.slug === arm.slug}
              dateBound={arm.dateBound}
              tabIndex={activeArm?.slug === arm.slug ? 0 : -1}
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
            {shellUserInitials}
          </Flex>
          <Text fontSize="13px" color="textPrimary" data-testid="app-shell-user-name">{shellUserLabel}</Text>
        </Flex>
      </Flex>

      {activeArm ? <ArmWorkspaceNav slug={activeArm.slug} /> : null}

      <Box flex="1" minH="0" overflow="hidden" data-testid="app-shell-content">
        <Outlet />
      </Box>
    </Flex>
  )
}
