import React, { useEffect, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import { createAbsence, previewAbsence } from '../../__data__/api'
import type { AbsenceReason, Doctor } from '../../__data__/types'

const REASONS: Array<{ id: AbsenceReason; label: string }> = [
  { id: 'vacation', label: 'Отпуск' },
  { id: 'sick', label: 'Больничный' },
  { id: 'repair', label: 'Ремонт' },
  { id: 'conference', label: 'Конференция' },
  { id: 'training', label: 'Учебный день' },
  { id: 'tech_break', label: 'Техперерыв' },
]

const fieldStyle: React.CSSProperties = {
  height: '32px',
  padding: '0 10px',
  border: '1px solid var(--chakra-colors-borderLight, #E2E8F0)',
  borderRadius: '4px',
  fontSize: '13px',
  width: '100%',
}

interface AbsenceDialogProps {
  doctors: Doctor[]
  open: boolean
  onClose: () => void
  onApplied: (result: { absenceId: string; affectedCount: number }) => void
}

export const AbsenceDialog = ({ doctors, open, onClose, onApplied }: AbsenceDialogProps) => {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? '')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reason, setReason] = useState<AbsenceReason>('vacation')
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!open) return
    setDoctorId(doctors[0]?.id ?? '')
    setPreviewCount(null)
    setConfirming(false)
    setError(null)
  }, [open, doctors])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open || !doctorId || !dateFrom || !dateTo || dateFrom > dateTo) {
      setPreviewCount(null)
      return undefined
    }
    let cancelled = false
    const t = window.setTimeout(() => {
      previewAbsence({ doctorId, dateFrom, dateTo })
        .then((res) => {
          if (!cancelled) setPreviewCount(res.affectedCount)
        })
        .catch(() => {
          if (!cancelled) setPreviewCount(null)
        })
    }, 200)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [open, doctorId, dateFrom, dateTo])

  if (!open) return null

  const apply = async () => {
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
      const result = await createAbsence({
        doctorId,
        dateFrom,
        dateTo,
        reason,
      })
      onApplied({
        absenceId: result.absence.id,
        affectedCount: result.affected.length,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось поставить отсутствие')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Box
      position="fixed"
      inset="0"
      bg="blackAlpha.500"
      zIndex={40}
      display="flex"
      alignItems="center"
      justifyContent="center"
      data-testid="absence-dialog"
    >
      <Stack
        gap="3"
        bg="white"
        borderRadius="compact"
        p="4"
        w="480px"
        maxW="95vw"
        maxH="90vh"
        overflowY="auto"
      >
        <Text fontSize="18px" fontWeight="700">Блокировка расписания</Text>
        <Text fontSize="12px" color="textSecondary">
          Отсутствие диапазоном дат. Действие необратимо: записи в периоде будут отменены.
        </Text>

        <Stack gap="1">
          <Text fontSize="12px">Врач</Text>
          <select
            data-testid="absence-doctor"
            style={fieldStyle}
            value={doctorId}
            onChange={(e) => { setDoctorId(e.target.value); setConfirming(false) }}
          >
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </Stack>

        <Flex gap="2">
          <Stack gap="1" flex="1">
            <Text fontSize="12px">С</Text>
            <input
              type="date"
              data-testid="absence-date-from"
              style={fieldStyle}
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setConfirming(false) }}
            />
          </Stack>
          <Stack gap="1" flex="1">
            <Text fontSize="12px">По</Text>
            <input
              type="date"
              data-testid="absence-date-to"
              style={fieldStyle}
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setConfirming(false) }}
            />
          </Stack>
        </Flex>

        <Stack gap="1">
          <Text fontSize="12px">Причина</Text>
          <select
            data-testid="absence-reason"
            style={fieldStyle}
            value={reason}
            onChange={(e) => { setReason(e.target.value as AbsenceReason); setConfirming(false) }}
          >
            {REASONS.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </Stack>

        {previewCount != null ? (
          <Box
            bg="brandOrange"
            color="textPrimary"
            borderRadius="compact"
            px="3"
            py="2"
            data-testid="absence-preview"
          >
            <Text fontSize="13px" fontWeight="700">
              Под отмену попадёт записей: {previewCount}
            </Text>
            <Text fontSize="12px">
              {confirming
                ? 'Подтвердите ещё раз — отменить будет нельзя.'
                : 'Проверьте период, затем нажмите «Применить».'}
            </Text>
          </Box>
        ) : null}

        {error ? (
          <Text fontSize="13px" color="danger" data-testid="absence-error">{error}</Text>
        ) : null}

        <Flex gap="2" justify="flex-end">
          <Button variant="outline" onClick={onClose} data-testid="absence-cancel">Отмена</Button>
          <Button
            bg="brandGreen"
            color="white"
            _hover={{ bg: 'brandGreenDark' }}
            disabled={busy}
            onClick={() => { void apply() }}
            data-testid="absence-apply"
          >
            {busy ? 'Применение…' : (confirming ? 'Подтвердить необратимо' : 'Применить')}
          </Button>
        </Flex>
      </Stack>
    </Box>
  )
}
