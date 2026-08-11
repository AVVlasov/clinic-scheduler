import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'
import { useSearchParams } from 'react-router-dom'

import { resolveSection } from '../../__data__/arm-nav'
import { formatShortDate } from '../../__data__/dates'
import { ApiError, getAbsenceAffected, getDoctorCards, getDoctors, getPatients, getWeekTemplates, publishWeek, saveDoctorCard, saveWeekTemplateInterval, unpublishWeek } from '../../__data__/api'
import type {
  AffectedAppointment,
  Doctor,
  DoctorCard,
  PublishWeekResult,
  WeekTemplateInterval,
  WeekTemplates as WeekTemplatesData,
} from '../../__data__/types'

import { AbsenceDialog } from './absence-dialog'
import { CompetencyMatrixScreen } from './competency-matrix'
import { DurationRulesScreen } from './duration-rules'
import { EquipmentSchedule } from './equipment-schedule'
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

/** Сегодняшняя дата в формате ГГГГ-ММ-ДД (лента оборудования — про день). */
const todayDate = (): string => {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

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
  const [searchParams] = useSearchParams()
  const section = resolveSection('admin', searchParams.get('section'))
  const [templates, setTemplates] = useState<WeekTemplatesData | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(true)
  const [publishState, setPublishState] = useState<PublishState>('idle')
  const [publishResult, setPublishResult] = useState<PublishWeekResult | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [unpublishBusy, setUnpublishBusy] = useState(false)
  const [unpublishAffected, setUnpublishAffected] = useState<number | null>(null)
  const [intervalAffected, setIntervalAffected] = useState<AffectedAppointment[] | null>(null)
  const [saveIntervalBusy, setSaveIntervalBusy] = useState(false)
  const [saveIntervalError, setSaveIntervalError] = useState<string | null>(null)
  const [absenceOpen, setAbsenceOpen] = useState(false)
  const [absenceDoctors, setAbsenceDoctors] = useState<Doctor[]>([])
  const [absenceNotice, setAbsenceNotice] = useState<string | null>(null)
  const [absenceAffected, setAbsenceAffected] = useState<
    Array<{ id: string; start?: string; patientName: string }> | null
  >(null)
  const patientsRef = useRef<Record<string, string>>({})
  const patientNameById = (id?: string): string => (id ? patientsRef.current[id] ?? 'Пациент' : 'Пациент')

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

  /**
   * Снятие публикации спрашивает, если на неделе есть записи. Сервер отвечает
   * 409 с их числом — оно и показывается в подтверждении: администратор должен
   * узнать о последствиях до действия, а не после.
   */
  useEffect(() => {
    // Имена пациентов нужны, чтобы разбор отсутствия читался по-человечески,
    // а не списком идентификаторов записей.
    let alive = true
    void getPatients()
      .then((res) => {
        if (!alive) return
        patientsRef.current = Object.fromEntries(res.items.map((p) => [p.id, p.name]))
      })
      .catch(() => undefined)
    return () => { alive = false }
  }, [])

  const handleUnpublish = useCallback((confirmed = false) => {
    const targetWeekStart = weekStart
    setUnpublishBusy(true)
    setPublishError(null)
    setPublishResult(null)
    unpublishWeek(targetWeekStart, confirmed)
      .then((templatesNext) => {
        if (weekStartRef.current !== targetWeekStart) return
        setTemplates(templatesNext)
        setUnpublishAffected(null)
        setUnpublishBusy(false)
      })
      .catch((err: unknown) => {
        if (weekStartRef.current !== targetWeekStart) return
        if (err instanceof ApiError && err.code === 'week_has_appointments') {
          const affected = (err.payload as { affected?: number } | undefined)?.affected ?? 0
          setUnpublishAffected(affected)
          setUnpublishBusy(false)
          return
        }
        setPublishError(err instanceof Error ? err.message : 'Не удалось снять публикацию')
        setUnpublishBusy(false)
      })
  }, [weekStart])

  const handleSaveInterval = useCallback(async (input: {
    doctorId: string
    date: string
    intervals: WeekTemplateInterval[]
    confirmed?: boolean
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
        confirmed: input.confirmed === true,
      })
      if (weekStartRef.current !== targetWeekStart) return
      setTemplates(next)
      setIntervalAffected(null)
    } catch (err: unknown) {
      if (weekStartRef.current !== targetWeekStart) return
      // Сужение графика поверх записанных пациентов сервер не пропускает без
      // согласия: показываем, кто попадёт под изменение, поимённо.
      if (err instanceof ApiError && err.code === 'interval_has_appointments') {
        const affected = (err.payload as { affected?: AffectedAppointment[] } | undefined)?.affected ?? []
        setIntervalAffected(affected)
        throw err
      }
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
            Расписание и справочники площадки
          </Text>
        </Stack>
        <Box flex="1" />
        <Flex align="center" gap="8px" fontSize="12px" color="textSecondary">
          <Text>Незаполненных карточек</Text>
          <Text fontWeight="700" color="brandOrange700" data-testid="incomplete-cards">
            {countIncompleteCards(cards)}
          </Text>
        </Flex>
        {section === 'templates' ? (
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
            Отпуск, больничный, ремонт
          </Button>
        ) : null}
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

      {absenceAffected && absenceAffected.length > 0 ? (
        <Box
          bg="white"
          borderWidth="1px"
          borderColor="brandOrange"
          borderRadius="compact"
          px="12px"
          py="8px"
          data-testid="absence-affected-list"
        >
          <Text fontSize="13px" fontWeight="700" color="brandOrange700" mb="1">
            Записи, снятые отсутствием
          </Text>
          <Stack gap="0.5">
            {absenceAffected.map((item) => (
              <Text key={item.id} fontSize="13px" color="textPrimary">
                {item.start ? `${formatShortDate(item.start.slice(0, 10))}, ${item.start.slice(11, 16)} — ` : ''}
                {item.patientName}
              </Text>
            ))}
          </Stack>
        </Box>
      ) : null}

      <AbsenceDialog
        open={absenceOpen}
        doctors={absenceDoctors}
        onClose={() => setAbsenceOpen(false)}
        onApplied={({ absenceId, affectedCount }) => {
          // Строка «Отсутствие abs-001 применено. Отменено записей: 4» не говорит
          // администратору главного: кого именно он отменил и кому теперь звонить.
          setAbsenceNotice(
            affectedCount > 0
              ? `Отсутствие применено. Отменено записей: ${affectedCount}. Этим пациентам нужно предложить другое время.`
              : 'Отсутствие применено. Записей на это время не было.',
          )
          setAbsenceAffected(null)
          if (affectedCount > 0) {
            void getAbsenceAffected(absenceId)
              .then((res) => {
                setAbsenceAffected(res.items.map((item) => ({
                  id: item.id,
                  start: item.start,
                  patientName: patientNameById(item.patientId),
                })))
              })
              .catch(() => setAbsenceAffected(null))
          }
        }}
      />

      <Flex flex="1" gap="12px" minH="0" data-section={section}>
        {section === 'equipment' ? <EquipmentSchedule date={todayDate()} /> : null}
        {section === 'matrix' ? <CompetencyMatrixScreen /> : null}
        {section === 'duration-rules' ? <DurationRulesScreen /> : null}
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
            unpublishAffected={unpublishAffected}
            intervalAffected={intervalAffected}
            unpublishBusy={unpublishBusy}
            onSaveInterval={handleSaveInterval}
            saveIntervalBusy={saveIntervalBusy}
            saveIntervalError={saveIntervalError}
          />
        ) : null}
        {section === 'doctors' ? (
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
        ) : null}
      </Flex>
    </Stack>
  )
}
