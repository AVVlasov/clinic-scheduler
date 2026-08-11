import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

import { getDurationRules, getEquipment, getPatients, getServices, setDurationRuleEnabled } from '../../__data__/api'
import { ageYearsOn, evaluateDuration } from '../../__data__/duration'
import type { DurationRule, Equipment, Patient, Service, VisitType } from '../../__data__/types'

/**
 * «Правила длительности» (ФТ 1.6, 2.1, С1, С3). Правила читает не только этот
 * экран: карточка слота в АРМ оператора считает длительность записи той же
 * функцией. Поэтому «Проверка расчёта» показывает ровно то число, которое
 * уйдёт в запись, а выключенное правило меняет реальную сетку.
 */

const VISIT_TYPES: Array<{ id: VisitType; label: string }> = [
  { id: 'first', label: 'Первичный' },
  { id: 'repeat', label: 'Повторный' },
]

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--chakra-colors-textSecondary, #6B7280)',
}

const selectStyle: React.CSSProperties = {
  height: '32px',
  padding: '0 8px',
  border: '1px solid var(--chakra-colors-borderLight, #E2E8F0)',
  borderRadius: '4px',
  fontSize: '13px',
  width: '100%',
  maxWidth: '320px',
  background: 'white',
}

export const DurationRulesScreen = () => {
  const [rules, setRules] = useState<DurationRule[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const [serviceId, setServiceId] = useState<string>('')
  const [visitType, setVisitType] = useState<VisitType>('first')
  const [patientId, setPatientId] = useState<string>('')

  useEffect(() => {
    let cancelled = false
    Promise.all([getDurationRules(), getServices(), getPatients(), getEquipment()])
      .then(([rulesRes, servicesRes, patientsRes, equipmentRes]) => {
        if (cancelled) return
        setRules(rulesRes.items)
        setServices(servicesRes.items)
        setPatients(patientsRes.items)
        setEquipment(equipmentRes.items)
        setServiceId((prev) => prev || servicesRes.items[0]?.id || '')
        setError(null)
        setIsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Не удалось загрузить правила длительности')
        setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleToggle = useCallback((rule: DurationRule) => {
    if (rule.locked || pendingId) return
    setPendingId(rule.id)
    setSaveError(null)
    setDurationRuleEnabled(rule.id, !rule.enabled)
      .then((res) => {
        setRules(res.items)
        setPendingId(null)
      })
      .catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : 'Не удалось изменить правило')
        setPendingId(null)
      })
  }, [pendingId])

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [services, serviceId],
  )
  const patient = useMemo(
    () => patients.find((p) => p.id === patientId) ?? null,
    [patients, patientId],
  )
  const requiresEquipment = useMemo(
    () => (serviceId ? equipment.some((e) => e.serviceIds.includes(serviceId)) : false),
    [equipment, serviceId],
  )

  const breakdown = useMemo(() => {
    if (!service) return null
    return evaluateDuration(rules, {
      service,
      visitType,
      patientAgeYears: ageYearsOn(patient?.birthDate),
      requiresEquipment,
    })
  }, [rules, service, visitType, patient, requiresEquipment])

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
      data-arm-section="duration-rules"
      data-testid="duration-screen"
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
          Правила длительности
        </Text>
        <Text fontSize="12px" color="textSecondary">
          Применяются по приоритету, сверху вниз
        </Text>
      </Flex>

      {isLoading ? (
        <Text p="16px" fontSize="13px" color="textSecondary" data-testid="duration-loading">
          Загрузка правил длительности…
        </Text>
      ) : null}

      {error ? (
        <Text p="16px" fontSize="13px" color="danger" data-testid="duration-error">
          {error}
        </Text>
      ) : null}

      {!isLoading && !error ? (
        <Flex flex="1" minH="0" overflow="auto" p="16px" gap="16px" align="flex-start" flexWrap="wrap">
          <Stack flex="1 1 520px" minW="0" gap="6px" data-testid="duration-rules-table">
            {saveError ? (
              <Box
                p="8px 14px"
                bg="danger"
                color="white"
                borderRadius="compact"
                fontSize="13px"
                data-testid="duration-save-error"
              >
                {saveError}
              </Box>
            ) : null}

            <Flex
              gap="8px"
              px="10px"
              pb="6px"
              fontSize="11px"
              color="textSecondary"
              borderBottomWidth="1px"
              borderBottomColor="borderLight"
            >
              <Box w="76px" flex="none">Приоритет</Box>
              <Box w="150px" flex="none">Условие</Box>
              <Box flex="1" minW="0">Фактор</Box>
              <Box w="90px" flex="none" textAlign="right">Эффект</Box>
              <Box w="92px" flex="none" textAlign="right">Включено</Box>
            </Flex>

            {[...rules].sort((a, b) => a.priority - b.priority).map((rule) => (
              <Flex
                key={rule.id}
                gap="8px"
                px="10px"
                py="8px"
                align="center"
                borderWidth="1px"
                borderColor="borderLight"
                borderRadius="compact"
                bg={rule.enabled ? 'white' : 'surfaceLight'}
                opacity={rule.enabled ? 1 : 0.75}
                data-testid={`duration-rule-${rule.id}`}
                data-enabled={rule.enabled}
              >
                <Box w="76px" flex="none" fontSize="13px" fontFamily="mono">
                  {rule.locked ? 'база' : rule.priority}
                </Box>
                <Box w="150px" flex="none" fontSize="12px" color="textSecondary">
                  {rule.condition}
                </Box>
                <Box flex="1" minW="0" fontSize="13px">
                  {rule.factor}
                </Box>
                <Box w="90px" flex="none" textAlign="right" fontSize="13px" fontFamily="mono">
                  {rule.effectLabel}
                </Box>
                <Box w="92px" flex="none" textAlign="right">
                  {rule.locked ? (
                    <Text fontSize="12px" color="textSecondary">всегда</Text>
                  ) : (
                    <Box
                      as="button"
                      role="switch"
                      aria-checked={rule.enabled}
                      aria-label={`Правило «${rule.factor}»`}
                      aria-busy={pendingId === rule.id}
                      onClick={() => handleToggle(rule)}
                      h="26px"
                      px="10px"
                      borderRadius="pill"
                      borderWidth="1px"
                      borderColor={rule.enabled ? 'brandGreen' : 'borderDark'}
                      bg={rule.enabled ? 'brandGreenFaint' : 'white'}
                      color={rule.enabled ? 'brandGreen700' : 'textSecondary'}
                      fontSize="12px"
                      cursor={pendingId != null ? 'progress' : 'pointer'}
                      data-testid={`duration-toggle-${rule.id}`}
                    >
                      {rule.enabled ? 'Включено' : 'Выключено'}
                    </Box>
                  )}
                </Box>
              </Flex>
            ))}
          </Stack>

          <Stack
            flex="0 1 340px"
            minW="280px"
            gap="10px"
            p="12px 14px"
            bg="surfaceLight"
            borderWidth="1px"
            borderColor="borderLight"
            borderRadius="compact"
            data-testid="duration-preview"
          >
            <Text fontSize="14px" fontWeight="700">Проверка расчёта</Text>

            <Stack gap="4px">
              <label htmlFor="duration-service" style={labelStyle}>Услуга</label>
              <select
                id="duration-service"
                data-testid="duration-service"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                style={selectStyle}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Stack>

            <Stack gap="4px">
              <label htmlFor="duration-visit-type" style={labelStyle}>Тип приёма</label>
              <select
                id="duration-visit-type"
                data-testid="duration-visit-type"
                value={visitType}
                onChange={(e) => setVisitType(e.target.value as VisitType)}
                style={selectStyle}
              >
                {VISIT_TYPES.map((v) => (
                  <option key={v.id} value={v.id}>{v.label}</option>
                ))}
              </select>
            </Stack>

            <Stack gap="4px">
              <label htmlFor="duration-patient" style={labelStyle}>Пациент</label>
              <select
                id="duration-patient"
                data-testid="duration-patient"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Не выбран</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Stack>

            {requiresEquipment ? (
              <Text fontSize="12px" color="textSecondary" data-testid="duration-equipment-note">
                Услуга выполняется на аппарате — правило «Оборудование» учитывается.
              </Text>
            ) : null}

            {breakdown ? (
              <Stack gap="6px" pt="4px">
                {breakdown.steps.map((step) => (
                  <Flex key={step.ruleId} align="baseline" gap="10px" fontSize="13px">
                    <Text flex="1" minW="0" color="textPrimary">
                      {step.condition}: {step.factor}
                    </Text>
                    <Text fontFamily="mono" color="textSecondary">{step.effectLabel}</Text>
                  </Flex>
                ))}
                <Flex
                  align="baseline"
                  gap="10px"
                  pt="10px"
                  borderTopWidth="1px"
                  borderTopColor="borderLight"
                >
                  <Text flex="1" fontSize="13px" fontWeight="700">Итоговая длительность</Text>
                  <Text fontSize="20px" fontWeight="700" fontFamily="mono" data-testid="duration-total">
                    {breakdown.totalMin} мин
                  </Text>
                </Flex>
                <Text fontSize="12px" color="textSecondary" lineHeight="18px">
                  Столько же займёт слот при записи из АРМ оператора: расчёт общий.
                </Text>
              </Stack>
            ) : null}
          </Stack>
        </Flex>
      ) : null}
    </Stack>
  )
}
