import React, { useState } from 'react'
import { Box, Button, Flex, Input, Stack, Text } from '@chakra-ui/react'

import type { DoctorCard, DoctorServiceWindow, SaveDoctorCardInput } from '../../__data__/types'

/**
 * Черновик карточки: те же поля, что и в карточке, но без серверной части записи
 * врача. Отдельный тип нужен, чтобы правка жила в состоянии страницы, а на сервер
 * уходили только изменённые поля — иначе PATCH затирал бы чужие правки целиком.
 */
export interface DoctorCardDraft {
  specialties: string[]
  site: string
  cabinet: string
  temporarySites: string[]
  admissionRules: string[]
  equipmentAccess: string[]
  patientAge: string
  preferentialLimit: string
  pairWork: string
  serviceWindows: DoctorServiceWindow[]
  specializationTags: string[]
}

export const draftFromCard = (card: DoctorCard): DoctorCardDraft => ({
  specialties: [...card.specialties],
  site: card.site,
  cabinet: card.cabinet,
  temporarySites: [...card.temporarySites],
  admissionRules: [...card.admissionRules],
  equipmentAccess: [...card.equipmentAccess],
  patientAge: card.patientAge ?? '',
  preferentialLimit: card.preferentialLimit ?? '',
  pairWork: card.pairWork ?? '',
  serviceWindows: (card.serviceWindows ?? []).map((w) => ({ ...w })),
  specializationTags: [...(card.specializationTags ?? [])],
})

const sameList = (a: string[], b: string[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i])

const sameWindows = (a: DoctorServiceWindow[], b: DoctorServiceWindow[]): boolean =>
  a.length === b.length
  && a.every((value, i) => value.what === b[i].what && value.when === b[i].when)

/** Только изменённые поля: пустой объект означает, что сохранять нечего. */
export const draftDiff = (card: DoctorCard, draft: DoctorCardDraft): SaveDoctorCardInput => {
  const diff: SaveDoctorCardInput = {}
  if (!sameList(card.specialties, draft.specialties)) diff.specialties = draft.specialties
  if (card.site !== draft.site) diff.site = draft.site
  if (card.cabinet !== draft.cabinet) diff.cabinet = draft.cabinet
  if (!sameList(card.temporarySites, draft.temporarySites)) diff.temporarySites = draft.temporarySites
  if (!sameList(card.admissionRules, draft.admissionRules)) diff.admissionRules = draft.admissionRules
  if (!sameList(card.equipmentAccess, draft.equipmentAccess)) diff.equipmentAccess = draft.equipmentAccess
  if ((card.patientAge ?? '') !== draft.patientAge) diff.patientAge = draft.patientAge
  if ((card.preferentialLimit ?? '') !== draft.preferentialLimit) {
    diff.preferentialLimit = draft.preferentialLimit
  }
  if ((card.pairWork ?? '') !== draft.pairWork) diff.pairWork = draft.pairWork
  if (!sameWindows(card.serviceWindows ?? [], draft.serviceWindows)) {
    diff.serviceWindows = draft.serviceWindows
  }
  if (!sameList(card.specializationTags ?? [], draft.specializationTags)) {
    diff.specializationTags = draft.specializationTags
  }
  return diff
}

export const isDraftDirty = (card: DoctorCard, draft: DoctorCardDraft): boolean =>
  Object.keys(draftDiff(card, draft)).length > 0

/** Сравнение двух черновиков — чтобы не затирать правки, введённые во время save. */
export const sameDraft = (a: DoctorCardDraft, b: DoctorCardDraft): boolean =>
  sameList(a.specialties, b.specialties)
  && a.site === b.site
  && a.cabinet === b.cabinet
  && sameList(a.temporarySites, b.temporarySites)
  && sameList(a.admissionRules, b.admissionRules)
  && sameList(a.equipmentAccess, b.equipmentAccess)
  && a.patientAge === b.patientAge
  && a.preferentialLimit === b.preferentialLimit
  && a.pairWork === b.pairWork
  && sameWindows(a.serviceWindows, b.serviceWindows)
  && sameList(a.specializationTags, b.specializationTags)

/**
 * Карточка считается незаполненной, если у врача не назначена основная площадка
 * или не указано ни одной специальности: без этих двух полей врача нельзя
 * поставить в сетку приёма. Счётчик в шапке считается этой же функцией по
 * загруженным данным — фиксированного числа из макета в коде нет.
 */
export const isCardIncomplete = (card: DoctorCard): boolean =>
  card.site.trim().length === 0 || card.specialties.length === 0

export const countIncompleteCards = (cards: DoctorCard[]): number =>
  cards.filter(isCardIncomplete).length

const matchesQuery = (card: DoctorCard, query: string): boolean => {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return true
  if (card.name.toLowerCase().includes(q)) return true
  return card.specialties.some((s) => s.toLowerCase().includes(q))
}

interface ListFieldProps {
  label: string
  hint?: string
  testId: string
  values: string[]
  emptyText: string
  onChange: (next: string[]) => void
}

/**
 * Список строк карточки: значения приходят из данных, справочника допустимых
 * вариантов у площадки нет. Поэтому вместо чекбоксов по выдуманному каталогу —
 * добавление и удаление фактических значений.
 */
const ListField = ({ label, hint, testId, values, emptyText, onChange }: ListFieldProps) => {
  const [entry, setEntry] = useState('')

  const add = () => {
    const value = entry.trim()
    if (value.length === 0 || values.includes(value)) return
    onChange([...values, value])
    setEntry('')
  }

  return (
    <Stack gap="6px" data-testid={testId}>
      <Text fontSize="11px" color="textSecondary">
        {label}
      </Text>
      {values.length === 0 ? (
        <Text fontSize="12px" color="textSecondary" data-testid={`${testId}-empty`}>
          {emptyText}
        </Text>
      ) : (
        <Flex flexWrap="wrap" gap="6px">
          {values.map((value) => (
            <Flex
              key={value}
              align="center"
              gap="6px"
              px="9px"
              py="3px"
              bg="brandGreenFaint"
              borderWidth="1px"
              borderColor="borderLight"
              borderRadius="pill"
              data-testid={`${testId}-item`}
            >
              <Text fontSize="12px" color="textPrimary">
                {value}
              </Text>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                minW="auto"
                h="auto"
                p="0"
                color="textSecondary"
                aria-label={`Удалить «${value}» из поля «${label}»`}
                onClick={() => onChange(values.filter((v) => v !== value))}
              >
                ×
              </Button>
            </Flex>
          ))}
        </Flex>
      )}
      <Flex gap="6px">
        <Input
          size="sm"
          borderColor="borderDark"
          borderRadius="compact"
          value={entry}
          placeholder={`Добавить: ${label.toLowerCase()}`}
          aria-label={`Добавить значение в поле «${label}»`}
          onChange={(e) => setEntry(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            add()
          }}
          data-testid={`${testId}-input`}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          borderColor="borderDark"
          borderRadius="compact"
          onClick={add}
          data-testid={`${testId}-add`}
        >
          Добавить
        </Button>
      </Flex>
      {hint ? (
        <Text fontSize="11px" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </Stack>
  )
}

interface ServiceWindowsFieldProps {
  values: DoctorServiceWindow[]
  onChange: (next: DoctorServiceWindow[]) => void
}

const ServiceWindowsField = ({ values, onChange }: ServiceWindowsFieldProps) => {
  const [what, setWhat] = useState('')
  const [when, setWhen] = useState('')

  const add = () => {
    const wWhat = what.trim()
    const wWhen = when.trim()
    if (!wWhat || !wWhen) return
    if (values.some((v) => v.what === wWhat && v.when === wWhen)) return
    onChange([...values, { what: wWhat, when: wWhen }])
    setWhat('')
    setWhen('')
  }

  return (
    <Stack gap="6px" data-testid="field-service-windows">
      <Text fontSize="11px" color="textSecondary">
        Доступность услуг во времени
      </Text>
      {values.length === 0 ? (
        <Text fontSize="12px" color="textSecondary" data-testid="field-service-windows-empty">
          Ограничений по услугам нет
        </Text>
      ) : (
        <Stack gap="4px">
          {values.map((row) => (
            <Flex
              key={`${row.what}-${row.when}`}
              align="center"
              gap="8px"
              px="9px"
              py="4px"
              bg="brandGreenFaint"
              borderWidth="1px"
              borderColor="borderLight"
              borderRadius="compact"
              data-testid="field-service-windows-item"
            >
              <Text fontSize="12px" flex="1">{row.what}</Text>
              <Text fontSize="12px" color="textSecondary" fontFamily="mono">{row.when}</Text>
              <Button
                type="button"
                size="xs"
                variant="ghost"
                minW="auto"
                h="auto"
                p="0"
                color="textSecondary"
                aria-label={`Удалить «${row.what}»`}
                onClick={() => onChange(values.filter((v) => v !== row))}
              >
                ×
              </Button>
            </Flex>
          ))}
        </Stack>
      )}
      <Flex gap="6px" flexWrap="wrap">
        <Input
          size="sm"
          flex="1"
          minW="140px"
          borderColor="borderDark"
          borderRadius="compact"
          value={what}
          placeholder="Услуга или ресурс"
          aria-label="Услуга или ресурс"
          onChange={(e) => setWhat(e.target.value)}
          data-testid="field-service-windows-what"
        />
        <Input
          size="sm"
          w="150px"
          borderColor="borderDark"
          borderRadius="compact"
          value={when}
          placeholder="Когда"
          aria-label="Когда доступно"
          onChange={(e) => setWhen(e.target.value)}
          data-testid="field-service-windows-when"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          borderColor="borderDark"
          borderRadius="compact"
          onClick={add}
          data-testid="field-service-windows-add"
        >
          Добавить
        </Button>
      </Flex>
    </Stack>
  )
}

export interface DoctorsDirectoryProps {
  cards: DoctorCard[]
  cardsError: string | null
  isLoading: boolean
  selectedId: string | null
  draft: DoctorCardDraft | null
  isSaving: boolean
  saveError: string | null
  onSelect: (id: string) => void
  onDraftChange: (next: DoctorCardDraft) => void
  onSave: () => void
}

export const DoctorsDirectory = ({
  cards,
  cardsError,
  isLoading,
  selectedId,
  draft,
  isSaving,
  saveError,
  onSelect,
  onDraftChange,
  onSave,
}: DoctorsDirectoryProps) => {
  const [query, setQuery] = useState('')
  const selected = cards.find((c) => c.id === selectedId) ?? null
  const visible = cards.filter((card) => matchesQuery(card, query))
  const dirty = selected && draft ? isDraftDirty(selected, draft) : false

  const update = <K extends keyof DoctorCardDraft>(key: K, value: DoctorCardDraft[K]) => {
    if (!draft) return
    onDraftChange({ ...draft, [key]: value })
  }

  return (
    <>
      <Stack
        w="320px"
        flex="none"
        gap="0"
        bg="white"
        borderWidth="1px"
        borderColor="borderLight"
        borderRadius="compact"
        data-testid="doctors-list"
      >
        <Stack
          flex="none"
          gap="8px"
          p="12px 16px"
          borderBottomWidth="1px"
          borderColor="borderLight"
        >
          <Text fontSize="18px" lineHeight="24px" fontWeight="700" letterSpacing="-0.022em">
            Справочник врачей
          </Text>
          <Input
            size="sm"
            borderColor="borderDark"
            borderRadius="compact"
            value={query}
            placeholder="Фамилия или специальность"
            aria-label="Поиск врача по фамилии или специальности"
            onChange={(e) => setQuery(e.target.value)}
            data-testid="doctors-search"
          />
        </Stack>
        {cardsError ? (
          <Box
            m="12px 16px"
            p="8px 14px"
            bg="danger"
            color="white"
            borderRadius="compact"
            fontSize="13px"
            data-testid="doctors-list-error"
          >
            {cardsError}
          </Box>
        ) : null}
        <Box flex="1" overflow="auto" p="8px">
          {isLoading ? (
            <Text fontSize="12px" color="textSecondary" p="8px" data-testid="doctors-list-loading">
              Загрузка справочника…
            </Text>
          ) : visible.length === 0 ? (
            <Text fontSize="12px" color="textSecondary" p="8px" data-testid="doctors-list-empty">
              Врачи не найдены.
            </Text>
          ) : null}
          {visible.map((card) => {
            const active = card.id === selectedId
            return (
              <Stack
                key={card.id}
                as="button"
                w="100%"
                gap="3px"
                align="flex-start"
                textAlign="left"
                p="9px 10px"
                mb="2px"
                borderWidth="1px"
                borderColor={active ? 'brandGreen' : 'transparent'}
                borderRadius="compact"
                bg={active ? 'brandGreenFaint' : 'transparent'}
                _hover={{ bg: active ? 'brandGreenFaint' : 'surfaceLight' }}
                onClick={() => onSelect(card.id)}
                data-testid={`doctor-item-${card.id}`}
              >
                <Text fontSize="13px" fontWeight="500" letterSpacing="-0.006em">
                  {card.name}
                </Text>
                <Text fontSize="12px" color="textSecondary">
                  {card.specialties.length > 0
                    ? card.specialties.join(', ')
                    : 'Специальности не указаны'}
                </Text>
                <Text fontSize="11px" color="textSecondary">
                  {card.site.trim().length > 0 ? card.site : 'Основная площадка не назначена'}
                </Text>
              </Stack>
            )
          })}
        </Box>
      </Stack>

      <Stack
        flex="1"
        minW="0"
        gap="0"
        bg="white"
        borderWidth="1px"
        borderColor="borderLight"
        borderRadius="compact"
        overflow="auto"
        data-testid="doctor-card"
      >
        {!selected || !draft ? (
          <Box p="16px">
            <Text fontSize="14px" color="textSecondary" data-testid="doctor-card-empty">
              Выберите врача из справочника.
            </Text>
          </Box>
        ) : (
          <>
            <Flex
              flex="none"
              align="center"
              gap="10px"
              flexWrap="wrap"
              p="16px"
              borderBottomWidth="1px"
              borderColor="borderLight"
            >
              <Text fontSize="24px" lineHeight="32px" fontWeight="700" letterSpacing="-0.018em">
                {selected.name}
              </Text>
              <Text fontSize="12px" color="textSecondary" data-testid="doctor-card-specialty">
                {selected.specialties.length > 0
                  ? selected.specialties[0]
                  : 'Специальность не указана'}
              </Text>
              <Box flex="1" />
              <Button
                type="button"
                size="sm"
                bg="brandGreen"
                color="white"
                borderRadius="compact"
                _hover={{ bg: 'brandGreenDark' }}
                disabled={isSaving || !dirty}
                onClick={onSave}
                data-testid="doctor-save"
              >
                {isSaving ? 'Сохраняем…' : 'Сохранить'}
              </Button>
            </Flex>

            {saveError ? (
              <Box
                m="16px 16px 0"
                p="8px 14px"
                bg="danger"
                color="white"
                borderRadius="compact"
                fontSize="13px"
                data-testid="doctor-save-error"
              >
                {saveError}
              </Box>
            ) : null}

            <Stack p="16px" gap="20px">
              <ListField
                label="Специальности"
                hint="Первая в списке — основная: она уходит в общий справочник врачей и видна в сетке и списках."
                testId="field-specialties"
                values={draft.specialties}
                emptyText="Специальности не указаны"
                onChange={(next) => update('specialties', next)}
              />

              <Flex gap="12px" flexWrap="wrap">
                <Stack gap="6px" flex="1" minW="220px">
                  <Box as="label" fontSize="11px" color="textSecondary">
                    Основная площадка
                  </Box>
                  <Input
                    id="doctor-site"
                    size="sm"
                    borderColor="borderDark"
                    borderRadius="compact"
                    aria-label="Основная площадка"
                    value={draft.site}
                    onChange={(e) => update('site', e.target.value)}
                    data-testid="field-site"
                  />
                </Stack>
                <Stack gap="6px" w="170px" flex="none">
                  <Box as="label" fontSize="11px" color="textSecondary">
                    Кабинет
                  </Box>
                  <Input
                    id="doctor-cabinet"
                    size="sm"
                    borderColor="borderDark"
                    borderRadius="compact"
                    aria-label="Кабинет"
                    value={draft.cabinet}
                    onChange={(e) => update('cabinet', e.target.value)}
                    data-testid="field-cabinet"
                  />
                </Stack>
              </Flex>

              <ListField
                label="Временные площадки"
                hint="Период действия учитывается при подборе слота."
                testId="field-temporary-sites"
                values={draft.temporarySites}
                emptyText="Временных площадок нет"
                onChange={(next) => update('temporarySites', next)}
              />

              <Flex gap="12px" flexWrap="wrap">
                <Stack gap="6px" flex="1" minW="220px">
                  <Box as="label" fontSize="11px" color="textSecondary">
                    Возраст пациента
                  </Box>
                  <Input
                    size="sm"
                    borderColor="borderDark"
                    borderRadius="compact"
                    aria-label="Возраст пациента"
                    value={draft.patientAge}
                    onChange={(e) => update('patientAge', e.target.value)}
                    placeholder="Например, с 18 лет"
                    data-testid="field-patient-age"
                  />
                </Stack>
                <Stack gap="6px" w="190px" flex="none">
                  <Box as="label" fontSize="11px" color="textSecondary">
                    Лимит льготных на смену
                  </Box>
                  <Input
                    size="sm"
                    borderColor="borderDark"
                    borderRadius="compact"
                    fontFamily="mono"
                    aria-label="Лимит льготных на смену"
                    value={draft.preferentialLimit}
                    onChange={(e) => update('preferentialLimit', e.target.value)}
                    data-testid="field-preferential-limit"
                  />
                </Stack>
              </Flex>

              <ListField
                label="Правила приёма"
                testId="field-admission-rules"
                values={draft.admissionRules}
                emptyText="Правила приёма не заданы"
                onChange={(next) => update('admissionRules', next)}
              />

              <ListField
                label="Допуски к оборудованию"
                testId="field-equipment-access"
                values={draft.equipmentAccess}
                emptyText="Допусков к оборудованию нет"
                onChange={(next) => update('equipmentAccess', next)}
              />

              <Stack gap="6px">
                <Box as="label" fontSize="11px" color="textSecondary">
                  Работа в паре
                </Box>
                <Input
                  size="sm"
                  borderColor="borderDark"
                  borderRadius="compact"
                  aria-label="Работа в паре"
                  value={draft.pairWork}
                  onChange={(e) => update('pairWork', e.target.value)}
                  placeholder="Например, только с анестезиологом"
                  data-testid="field-pair-work"
                />
              </Stack>

              <ServiceWindowsField
                values={draft.serviceWindows}
                onChange={(next) => update('serviceWindows', next)}
              />

              <ListField
                label="Теги специализации"
                testId="field-specialization-tags"
                values={draft.specializationTags}
                emptyText="Теги не заданы"
                onChange={(next) => update('specializationTags', next)}
              />
            </Stack>
          </>
        )}
      </Stack>
    </>
  )
}
