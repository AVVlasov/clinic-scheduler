import React, { useCallback, useEffect, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import { getDoctorCards, getWeekTemplates, publishWeek, saveDoctorCard } from '../../__data__/api'
import type {
  DoctorCard,
  PublishWeekResult,
  WeekTemplates as WeekTemplatesData,
} from '../../__data__/types'

import {
  countIncompleteCards,
  draftDiff,
  draftFromCard,
  DoctorsDirectory,
  type DoctorCardDraft,
} from './doctors-directory'
import { WeekTemplates } from './week-templates'

/** Понедельник недели, в которую попадает дата. */
const weekStartOf = (date: Date): string => {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

type PublishState = 'idle' | 'confirming' | 'publishing'

type Section = 'templates' | 'doctors'

export const AdminPage = () => {
  const [weekStart] = useState(() => weekStartOf(new Date()))
  const [section, setSection] = useState<Section>('templates')
  const [templates, setTemplates] = useState<WeekTemplatesData | null>(null)
  const [templatesError, setTemplatesError] = useState<string | null>(null)
  const [isTemplatesLoading, setIsTemplatesLoading] = useState(true)
  const [publishState, setPublishState] = useState<PublishState>('idle')
  const [publishResult, setPublishResult] = useState<PublishWeekResult | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  const [cards, setCards] = useState<DoctorCard[]>([])
  const [cardsError, setCardsError] = useState<string | null>(null)
  const [isCardsLoading, setIsCardsLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<DoctorCardDraft | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setIsTemplatesLoading(true)
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
    },
    [cards],
  )

  const handleSaveDoctor = useCallback(() => {
    if (!selectedId || !draft) return
    const card = cards.find((c) => c.id === selectedId)
    if (!card) return

    const input = draftDiff(card, draft)
    if (Object.keys(input).length === 0) return

    setIsSaving(true)
    setSaveError(null)
    saveDoctorCard(selectedId, input)
      .then((saved) => {
        setCards((prev) => prev.map((c) => (c.id === saved.id ? saved : c)))
        setDraft(draftFromCard(saved))
        setIsSaving(false)
      })
      .catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : 'Не удалось сохранить карточку врача')
        setIsSaving(false)
      })
  }, [cards, draft, selectedId])

  const handlePublishClick = useCallback(() => {
    setPublishError(null)
    setPublishState('confirming')
  }, [])

  const handlePublishCancel = useCallback(() => {
    setPublishState('idle')
  }, [])

  const handlePublishConfirm = useCallback(() => {
    setPublishState('publishing')
    setPublishError(null)
    publishWeek(weekStart)
      .then((result) => {
        setPublishResult(result)
        setPublishState('idle')
        setTemplates((prev) => (prev ? { ...prev, published: true } : prev))
      })
      .catch((err: unknown) => {
        setPublishError(err instanceof Error ? err.message : 'Не удалось опубликовать неделю')
        setPublishState('idle')
      })
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
        </Flex>
      </Flex>

      <Flex flex="1" gap="12px" minH="0">
        {section === 'templates' ? (
          <WeekTemplates
            data={templates}
            isLoading={isTemplatesLoading}
            templatesError={templatesError}
            publishState={publishState}
            publishResult={publishResult}
            publishError={publishError}
            onPublishClick={handlePublishClick}
            onPublishConfirm={handlePublishConfirm}
            onPublishCancel={handlePublishCancel}
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
