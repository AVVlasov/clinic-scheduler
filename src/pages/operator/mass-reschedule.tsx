import React, { useEffect, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import {
  ApiError,
  createMassCancel,
  exportMassCancelBatch,
  getMassCancelMatches,
  previewMassCancel,
  rescheduleMassCancelItem,
} from '../../__data__/api'
import type { Doctor, MassCancelBatch, MassCancelItem } from '../../__data__/types'

const fieldStyle: React.CSSProperties = {
  height: '32px',
  padding: '0 10px',
  border: '1px solid var(--chakra-colors-borderLight, #E2E8F0)',
  borderRadius: '4px',
  fontSize: '13px',
  width: '100%',
}

const handlingLabel = (s: MassCancelItem['handlingStatus']) =>
  (s === 'pending' ? 'Под отмену' : 'Перезаписан')

interface MassReschedulePanelProps {
  doctors: Doctor[]
}

export const MassReschedulePanel = ({ doctors }: MassReschedulePanelProps) => {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reason, setReason] = useState('Снос расписания')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewPatients, setPreviewPatients] = useState<Array<{ patientName: string | null; start: string }>>([])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [batch, setBatch] = useState<MassCancelBatch | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'rescheduled'>('all')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [matches, setMatches] = useState<Array<{ date: string; time: string; doctorId: string; doctorName: string }>>([])
  const [exportNote, setExportNote] = useState<string | null>(null)

  useEffect(() => {
    if (!doctorId || !dateFrom || !dateTo || dateFrom > dateTo) {
      setPreviewCount(null)
      setPreviewPatients([])
      return undefined
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      previewMassCancel({ doctorId, dateFrom, dateTo })
        .then((res) => {
          if (cancelled) return
          setPreviewCount(res.affectedCount)
          setPreviewPatients(res.patients.map((p) => ({
            patientName: p.patientName,
            start: p.start,
          })))
        })
        .catch(() => {
          if (!cancelled) {
            setPreviewCount(null)
            setPreviewPatients([])
          }
        })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [doctorId, dateFrom, dateTo])

  const applyCancel = async () => {
    setError(null)
    if (!doctorId || !dateFrom || !dateTo) {
      setError('Укажите врача и период')
      return
    }
    if (!confirming) {
      setConfirming(true)
      return
    }
    setBusy(true)
    try {
      const created = await createMassCancel({ doctorId, dateFrom, dateTo, reason })
      setBatch(created)
      setConfirming(false)
      setSelectedItemId(created.items[0]?.id ?? null)
      setMatches([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось снести расписание')
    } finally {
      setBusy(false)
    }
  }

  const onPickMatches = async (itemId: string) => {
    if (!batch) return
    setSelectedItemId(itemId)
    setError(null)
    try {
      const res = await getMassCancelMatches(batch.id, itemId)
      setMatches(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось подобрать слоты')
      setMatches([])
    }
  }

  const onBook = async (slot: { date: string; time: string; doctorId: string }) => {
    if (!batch || !selectedItemId) return
    setError(null)
    // Длительность берётся у снесённой записи: константа возвращала приём на 20 минут
    // получасовым, а часовой — вдвое короче.
    const row = batch.items.find((i) => i.id === selectedItemId)
    try {
      const result = await rescheduleMassCancelItem(batch.id, selectedItemId, {
        doctorId: slot.doctorId,
        start: `${slot.date}T${slot.time}:00+03:00`,
        durationMin: row?.durationMin ?? 30,
      })
      setBatch(result.batch)
      setMatches([])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось перезаписать')
    }
  }

  const onExport = async () => {
    if (!batch) return
    setError(null)
    try {
      const res = await exportMassCancelBatch(batch.id)
      setExportNote(`Выгрузка ${res.filename}: ${res.csv.split('\n').length - 1} строк`)
      // Для стенда — отдаём файл через Blob, без внешнего сервиса.
      const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = res.filename
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось выгрузить')
    }
  }

  const visibleItems = (batch?.items ?? []).filter((i) => {
    if (filter === 'all') return true
    return i.handlingStatus === filter
  })

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      p="4"
      data-arm-section="mass-reschedule"
      data-testid="mass-reschedule-panel"
    >
      <Flex align="center" gap="3" mb="3" wrap="wrap">
        <Text fontSize="18px" fontWeight="700">Снос расписания</Text>
        {batch ? (
          <Box
            as="span"
            bg="brandOrange"
            color="textPrimary"
            px="8px"
            h="24px"
            display="inline-flex"
            alignItems="center"
            borderRadius="pill"
            fontSize="12px"
            fontWeight="700"
            data-testid="mass-pending-count"
          >
            Осталось необработанных: {batch.pendingCount}
          </Box>
        ) : null}
      </Flex>

      {!batch ? (
        <Stack gap="2" data-testid="mass-cancel-form">
          <Text fontSize="13px" color="textSecondary">
            Массовая отмена по врачу и периоду. Действие необратимо.
          </Text>
          <Flex gap="2" wrap="wrap">
            <select
              data-testid="mass-doctor"
              style={{ ...fieldStyle, maxWidth: 260 }}
              value={doctorId}
              onChange={(e) => { setDoctorId(e.target.value); setConfirming(false) }}
            >
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <input
              type="date"
              data-testid="mass-date-from"
              style={fieldStyle}
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setConfirming(false) }}
            />
            <input
              type="date"
              data-testid="mass-date-to"
              style={fieldStyle}
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setConfirming(false) }}
            />
          </Flex>
          <input
            data-testid="mass-reason"
            style={fieldStyle}
            value={reason}
            onChange={(e) => { setReason(e.target.value); setConfirming(false) }}
          />
          {previewCount != null ? (
            <Box bg="brandOrange" color="textPrimary" borderRadius="compact" px="3" py="2" data-testid="mass-preview">
              <Text fontSize="13px" fontWeight="700">Записей под отмену: {previewCount}</Text>
              <Stack gap="0" mt="1" data-testid="mass-preview-patients">
                {previewPatients.slice(0, 8).map((p) => (
                  <Text key={`${p.start}-${p.patientName}`} fontSize="12px">
                    {p.patientName ?? 'Пациент'} · {p.start}
                  </Text>
                ))}
              </Stack>
              <Text fontSize="12px" mt="1">
                {confirming ? 'Подтвердите ещё раз — отменить будет нельзя.' : 'Проверьте список, затем нажмите «Снести».'}
              </Text>
            </Box>
          ) : null}
          <Flex justify="flex-end">
            <Button
              bg="brandGreen"
              color="white"
              disabled={busy}
              onClick={() => { void applyCancel() }}
              data-testid="mass-apply"
            >
              {busy ? 'Снос…' : (confirming ? 'Подтвердить необратимо' : 'Снести')}
            </Button>
          </Flex>
        </Stack>
      ) : (
        <Stack gap="3">
          <Flex gap="6px" wrap="wrap" align="center">
            <Text fontSize="13px">Пакет {batch.id} · {batch.doctorName}</Text>
            <Box flex="1" />
            <FilterChip active={filter === 'all'} onClick={() => setFilter('all')} label="Все" testId="mass-filter-all" />
            <FilterChip active={filter === 'pending'} onClick={() => setFilter('pending')} label="Под отмену" testId="mass-filter-pending" />
            <FilterChip active={filter === 'rescheduled'} onClick={() => setFilter('rescheduled')} label="Перезаписаны" testId="mass-filter-rescheduled" />
            <Button size="sm" variant="outline" onClick={() => { void onExport() }} data-testid="mass-export">
              Выгрузить список
            </Button>
          </Flex>
          {exportNote ? (
            <Text fontSize="12px" color="brandGreen700" data-testid="mass-export-note">{exportNote}</Text>
          ) : null}

          <Flex gap="4" align="start" wrap="wrap">
            <Stack flex="1" minW="280px" gap="1" data-testid="mass-items">
              {visibleItems.map((item) => (
                <Box
                  key={item.id}
                  as="button"
                  textAlign="left"
                  p="2"
                  borderWidth="1px"
                  borderColor={selectedItemId === item.id ? 'brandGreen' : 'borderLight'}
                  borderRadius="compact"
                  bg={selectedItemId === item.id ? 'brandGreenFaint' : 'white'}
                  onClick={() => {
                    setSelectedItemId(item.id)
                    if (item.handlingStatus === 'pending') void onPickMatches(item.id)
                    else setMatches([])
                  }}
                  data-testid={`mass-item-${item.id}`}
                  data-handling={item.handlingStatus}
                >
                  <Flex gap="2" align="center">
                    <Text fontSize="13px" fontWeight="600">{item.patientName ?? '—'}</Text>
                    <Box flex="1" />
                    <Text fontSize="12px" data-testid={`mass-handling-${item.id}`}>
                      {handlingLabel(item.handlingStatus)}
                    </Text>
                  </Flex>
                  <Text fontSize="12px" color="textSecondary">
                    Было: {item.originalStart} · {item.originalDoctorName}
                  </Text>
                  {item.newStart ? (
                    <Text fontSize="12px" color="brandGreen700" data-testid={`mass-new-start-${item.id}`}>
                      Новое время: {item.newStart}
                    </Text>
                  ) : null}
                </Box>
              ))}
            </Stack>

            <Box w="320px" flex="none" data-testid="mass-match-panel">
              {selectedItemId && matches.length > 0 ? (
                <Stack gap="1">
                  <Text fontSize="13px" fontWeight="700">Подобрать слот</Text>
                  {matches.map((m) => (
                    <Flex
                      key={`${m.date}-${m.time}-${m.doctorId}`}
                      align="center"
                      gap="2"
                      p="1"
                      borderWidth="1px"
                      borderColor="borderLight"
                      borderRadius="compact"
                    >
                      <Text fontSize="12px" flex="1">{m.date} {m.time} · {m.doctorName}</Text>
                      <Button
                        size="xs"
                        onClick={() => { void onBook(m) }}
                        data-testid={`mass-book-${m.date}-${m.time}-${m.doctorId}`}
                      >
                        Записать
                      </Button>
                    </Flex>
                  ))}
                </Stack>
              ) : (
                <Text fontSize="13px" color="textSecondary">
                  Выберите строку «Под отмену», чтобы перезаписать в два действия.
                </Text>
              )}
            </Box>
          </Flex>
        </Stack>
      )}

      {error ? (
        <Text color="danger" fontSize="13px" mt="2" data-testid="mass-error">{error}</Text>
      ) : null}
    </Box>
  )
}

const FilterChip = ({
  active,
  onClick,
  label,
  testId,
}: {
  active: boolean
  onClick: () => void
  label: string
  testId?: string
}) => (
  <Box
    as="button"
    onClick={onClick}
    px="10px"
    h="26px"
    borderRadius="pill"
    borderWidth="1px"
    borderColor={active ? 'brandGreen' : 'borderLight'}
    bg={active ? 'brandGreenTint' : 'white'}
    color={active ? 'brandGreen700' : 'textPrimary'}
    fontSize="12px"
    fontWeight={active ? '600' : '400'}
    data-testid={testId}
  >
    {label}
  </Box>
)
