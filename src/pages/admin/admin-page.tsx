import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import { getDoctorCards, getDoctors, getWeekTemplates, publishWeek, saveDoctorCard, saveWeekTemplateInterval, unpublishWeek } from '../../__data__/api'
import type {
  Doctor,
  DoctorCard,
  PublishWeekResult,
  WeekTemplateInterval,
  WeekTemplates as WeekTemplatesData,
} from '../../__data__/types'

import { AbsenceDialog } from './absence-dialog'
import {
  countIncompleteCards,
  draftDiff,
  draftFromCard,
  DoctorsDirectory,
  sameDraft,
  type DoctorCardDraft,
} from './doctors-directory'
import { WeekTemplates } from './week-templates'

/** Понедельник недели, в которую попадает дата. */
export const weekStartOf = (date: Date): string => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Сдвиг даты в формате ГГГГ-ММ-ДД на N дней. Локаль-независимо. */
export const shiftDate = (from: string, days: number): string => {
  const [y, m, d] = from.split('-').map(Number)
  const date = new Date(y, m - 1, d + days)
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Границы выбора недели: вперёд — запас на «опубликовать на 1–2 месяца вперёд»,
 * назад — только прошлая неделя: глубже шаблоны приёма уже не действуют.
 * Уход за границу запрещён, чтобы администратор не публиковал «несуществующую»
 * неделю по ошибке.
 */
const MAX_WEEKS_FORWARD = 8
const MAX_WEEKS_BACK = 1

type PublishState = 'idle' | 'confirming' | 'publishing'

type Section = 'templates' | 'doctors'

export const AdminPage = () => {
  const currentWeekStart = weekStartOf(new Date())
  const [weekStart, setWeekStart] = useState<string>(currentWeekStart)
  const weekStartRef = useRef<string>(currentWeekStart)
  weekStartRef.current = weekStart
  const minWeekStart = shiftDate(currentWeekStart, -7 * MAX_WEEKS_BACK)
  const maxWeekStart = shiftDate(currentWeekStart, 7 * MAX_WEEKS_FORWARD)
  const canGoPrev = weekStart > minWeekStart
  const canGoNext = weekStart < maxWeekStart
  const handleWeekPrev = useCallback(() => {
    setWeekStart((prev) => (prev > minWeekStart ? shiftDate(prev, -7) : prev))
  }, [minWeekStart])
  const handleWeekNext = useCallback(() => {
    setWeekStart((prev) => (prev < maxWeekStart ? shiftDate(prev, 7) : prev))
  }, [maxWeekStart])
  const [section, setSection] = useState<Section>('templates')
  const [templates, setTemplates] = useState<WeekTemplatesData | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(true)
  const [publishState, setPublishState] = useState<PublishState>('idle')
  const [publishResult, setPublishResult] = useState<PublishWeekResult | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [unpublishBusy, setUnpublishBusy] = useState(false)
  const [saveIntervalBusy, setSaveIntervalBusy] = useState(false)
  const [saveIntervalError, setSaveIntervalError] = useState<string | null>(null)
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [absenceDoctors, setAbsenceDoctors] = useState<Doctor[]>([])
  const [absenceNotice, setAbsenceNotice] = useState<string | null>(null)

  const [cards, setCards] = useState<DoctorCard[]>([])
  const [cardsError, setCardsError] = useState<string | null>(null)
  const [isCardsLoading, setIsCardsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DoctorCardDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const selectedIdRef = useRef<string | null>(null)
  selectedIdRef.current = selectedId
  const saveSeqRef = useRef(0)
  const currentSaveTokenRef = useRef(0)

  useEffect(() => {
    let cancelled = false
    setIsTemplatesLoading(true)
    setTemplates(null)
    setTemplatesError(null)
    setPublishResult(null)
    setPublishError(null)
    setPublishState('idle')
    setSaveIntervalError(null)
    getWeekTemplates(weekStart)
      .then((res) => {
        if (cancelled) return
        setTemplates(res)
        setTemplatesError(null)
        setIsTemplatesLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setTemplatesError(err instanceof Error ? err.message : 'Не удалось загрузить шаблоны приёма')
        setIsTemplatesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [weekStart])

  useEffect(() => {
    let cancelled = false
    setIsCardsLoading(true)
    getDoctorCards()
      .then((res) => {
        if (cancelled) return
        setCards(res.items)
        setCardsError(null)
        setIsCardsLoading(false)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setCardsError(err instanceof Error ? err.message : 'Не удалось загрузить справочник врачей')
        setIsCardsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleSelectDoctor = useCallback(
    (id: string) => {
      const card = cards.find((c) => c.id === id)
      if (!card) return
      setSelectedId(id)
      setDraft(draftFromCard(card))
      setSaveError(null)
      setIsSaving(false)
    },
    [cards],
  )

  const handleSaveDoctor = useCallback(() => {
    if (!selectedId || !draft) return
    const card = cards.find((c) => c.id === selectedId)
    if (!card) return

    const input = draftDiff(card, draft)
    if (Object.keys(input).length === 0) return

    const targetId = selectedId
    const snapshot = draft
    saveSeqRef.current += 1
    const myToken = saveSeqRef.current
    currentSaveTokenRef.current = myToken
    setIsSaving(true)
    setSaveError(null)
    saveDoctorCard(targetId, input)
      .then((saved) => {
        if (currentSaveTokenRef.current !== myToken) {
          setIsSaving(false)
          return
        }
        setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
        if (selectedIdRef.current !== targetId) {
          setIsSaving(false)
          return
        }
        setDraft((prev) => {
          if (!prev) return draftFromCard(saved)
          // правки, введённые после «Сохранить», не затираем ответом
          if (sameDraft(prev, snapshot)) return draftFromCard(saved)
          return prev
        })
        setIsSaving(false)
      })
      .catch((err: unknown) => {
        if (currentSaveTokenRef.current !== myToken) {
          setIsSaving(false)
          return
        }
        if (selectedIdRef.current !== targetId) {
          setIsSaving(false)
          return
        }
        setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить карточку врача')
        setIsSaving(false)
      })
  }, [cards, draft, selectedId])

  const handlePublishClick = useCallback(() => {
    if (isTemplatesLoading || templates === null) return
    setPublishError(null)
    setPublishState('confirming')
  }, [isTemplatesLoading, templates])

  const handlePublishCancel = useCallback(() => {
    setPublishState('idle')
  }, [])

  const handlePublishConfirm = useCallback(() => {
    const targetWeekStart = weekStart
    if (publishState !== 'confirming') return
    setPublishState('publishing')
    setPublishError(null)
    publishWeek(targetWeekStart)
      .then((result) => {
        if (weekStartRef.current !== targetWeekStart) return
        setPublishResult(result)
        setPublishState('idle')
        setTemplates((prev) => (prev ? { ...prev, published: true } : prev))
      })
      .catch((err: unknown) => {
        if (weekStartRef.current !== targetWeekStart) return
        setPublishError(err instanceof Error ? err.message : 'Не удалось опубликовать неделю')
        setPublishState('idle')
      })
  }, [publishState, weekStart])

  const handleUnpublish = useCallback(() => {
    const targetWeekStart = weekStart
    setUnpublishBusy(true)
    setPublishError(null)
    setPublishResult(null)
    unpublishWeek(targetWeekStart)
      .then((templatesNext) => {
        if (weekStartRef.current !== targetWeekStart) return
        setTemplates(templatesNext)
        setUnpublishBusy(false)
      })
      .catch((err: unknown) => {
        if (weekStartRef.current !== targetWeekStart) return
        setPublishError(err instanceof Error ? err.message : 'Не удалось снять публикацию')
        setUnpublishBusy(false)
      })
  }, [weekStart])

  const handleSaveInterval = useCallback(async (input: {
    doctorId: string
    date: string
    intervals: WeekTemplateInterval[]
  }) => {
    const targetWeekStart = weekStart
    setSaveIntervalBusy(true)
    setSaveIntervalError(null)
    try {
      const next = await saveWeekTemplateInterval({
        weekStart: targetWeekStart,
        doctorId: input.doctorId,
        date: input.date,
        intervals: input.intervals,
      })
      if (weekStartRef.current !== targetWeekStart) return
      setTemplates(next)
    } catch (err: unknown) {
      if (weekStartRef.current !== targetWeekStart) return
      setSaveIntervalError(err instanceof Error ? err.message : 'Не удалось сохранить интервал')
      throw err
    } finally {
      if (weekStartRef.current === targetWeekStart) setSaveIntervalBusy(false)
    }
  }, [weekStart])

  return (
    <Stack h="100%" gap="12px" p="12px" bg="surfaceLight" data-testid="admin-page">
      <Flex
        align="center"
        gap="16px"
        bg="white"
        borderWidth="1px"
        borderColor="borderLight"
        borderRadius="compact"
        p="12px 16px"
      >
        <Stack gap="0">
          <Text fontSize="12px" color="textSecondary">
            АРМ администратора
          </Text>
          <Text fontSize="18px" fontWeight="700" color="brandGreen700">
            Площадка · расписание и справочники
          </Text>
        </Stack>
        <Box flex="1" />
        <Flex align="center" gap="8px" fontSize="12px" color="textSecondary">
          <Text>Незаполненных карточек</Text>
          <Text fontWeight="700" color="brandOrange700" data-testid="incomplete-cards">
            {countIncompleteCards(cards)}
          </Text>
        </Flex>
        <Flex gap="6px">
          <Button
            type="button"
            size="sm"
            borderRadius="compact"
            variant={section === 'templates' ? 'solid' : 'outline'}
            bg={section === 'templates' ? 'brandGreen' : 'transparent'}
            color={section === 'templates' ? 'white' : 'textPrimary'}
            borderColor="borderLight"
            _hover={{ bg: section === 'templates' ? 'brandGreenDark' : 'surfaceLight' }}
            onClick={() => setSection('templates')}
            data-testid="section-templates"
          >
            Шаблоны приёма
          </Button>
          <Button
            type="button"
            size="sm"
            borderRadius="compact"
            variant={section === 'doctors' ? 'solid' : 'outline'}
            bg={section === 'doctors' ? 'brandGreen' : 'transparent'}
            color={section === 'doctors' ? 'white' : 'textPrimary'}
            borderColor="borderLight"
            _hover={{ bg: section === 'doctors' ? 'brandGreenDark' : 'surfaceLight' }}
            onClick={() => setSection('doctors')}
            data-testid="section-doctors"
          >
            Справочник врачей
          </Button>
          <Button
            type="button"
            size="sm"
            borderRadius="compact"
            variant="outline"
            borderColor="borderLight"
            onClick={() => {
              void getDoctors().then((res) => {
                setAbsenceDoctors(res.items)
                setAbsenceOpen(true)
              })
            }}
            data-testid="section-absence-block"
          >
            Блокировка расписания
          </Button>
        </Flex>
      </Flex>

      {absenceNotice ? (
        <Box
          bg="brandGreenTint"
          color="brandGreen700"
          px="12px"
          py="8px"
          borderRadius="compact"
          fontSize="13px"
          data-testid="absence-applied-notice"
        >
          {absenceNotice}
        </Box>
      ) : null}

      <AbsenceDialog
        open={absenceOpen}
        doctors={absenceDoctors}
        onClose={() => setAbsenceOpen(false)}
        onApplied={({ absenceId, affectedCount }) => {
          setAbsenceNotice(
            `Отсутствие ${absenceId} применено. Отменено записей: ${affectedCount}.`,
          )
        }}
      />

      <Flex flex="1" gap="12px" minH="0">
        {section === 'templates' ? (
          <WeekTemplates
            data={templates}
            isLoading={isTemplatesLoading}
            templatesError={templatesError}
            weekStart={weekStart}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onWeekPrev={handleWeekPrev}
            onWeekNext={handleWeekNext}
            publishState={publishState}
            publishResult={publishResult}
            publishError={publishError}
            onPublishClick={handlePublishClick}
            onPublishConfirm={handlePublishConfirm}
            onPublishCancel={handlePublishCancel}
            onUnpublish={handleUnpublish}
            unpublishBusy={unpublishBusy}
            onSaveInterval={handleSaveInterval}
            saveIntervalBusy={saveIntervalBusy}
            saveIntervalError={saveIntervalError}
          />
        ) : (
          <DoctorsDirectory
            cards={cards}
            cardsError={cardsError}
            isLoading={isCardsLoading}
            selectedId={selectedId}
            draft={draft}
            isSaving={isSaving}
            saveError={saveError}
            onSelect={handleSelectDoctor}
            onDraftChange={setDraft}
            onSave={handleSaveDoctor}
          />
        )}
      </Flex>
    </Stack>
  )
}
