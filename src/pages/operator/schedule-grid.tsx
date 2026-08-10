import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Text } from '@chakra-ui/react'

import type {
  Appointment,
  Doctor,
  Schedule,
  ScheduleSlot,
  SlotResource,
} from '../../__data__/types'

const SLOT_HEIGHT_PX = 28
const SLOT_HEIGHT = `${SLOT_HEIGHT_PX}px`
const TIME_COL_WIDTH = '80px'
const DOCTOR_COL_WIDTH = '140px'
/** Высота «экрана» строк внутри сетки — для окна виртуализации (≤2 экрана в DOM). */
const VIEWPORT_ROWS = 20
const WINDOW_ROWS = VIEWPORT_ROWS * 2

interface ScheduleGridProps {
  schedule: Schedule
  doctors: Doctor[]
  appointments: Appointment[]
  selectedTime: string | null
  selectedDoctorId: string | null
  rescheduleTargetTime?: string | null
  rescheduleTargetDoctorId?: string | null
  fitDurationMin?: number | null
  fitDoctorId?: string | null
  onSlotClick: (slot: ScheduleSlot, doctor: SlotResource) => void
}

const cellFits = (
  schedule: Schedule,
  doctorId: string,
  time: string,
  durationMin: number,
): boolean => {
  const times = schedule.slots.map((s) => s.time)
  const startIdx = times.indexOf(time)
  if (startIdx < 0) return false
  const steps = Math.max(1, Math.ceil(durationMin / schedule.stepMinutes))
  for (let i = 0; i < steps; i += 1) {
    const slot = schedule.slots[startIdx + i]
    if (!slot) return false
    const cell = slot.doctors.find((d) => d.id === doctorId)
    if (!cell) return false
    if (i > 0 && cell.busy) return false
  }
  return true
}

const appointmentFor = (
  appointments: Appointment[],
  doctorId: string,
  appointmentId?: string,
): Appointment | undefined => {
  if (!appointmentId) return undefined
  return appointments.find((a) => a.id === appointmentId && a.doctorId === doctorId)
}

/** Второй (нецветовой) признак занятости — ФТ ДМИР12 / DS. */
const occupancyPresentation = (
  doctor: SlotResource,
  appointment: Appointment | undefined,
  unavailable: boolean,
): {
  kind: string | null
  label: string
  bg: string
  barColor: string
  borderStyle: 'solid' | 'dashed'
  hatch: boolean
} => {
  const kind = doctor.occupancyKind ?? null
  if (kind === 'blocked') {
    return {
      kind: 'blocked',
      label: doctor.occupancyLabel ?? 'Блокировка',
      bg: 'slotBookedFill',
      barColor: 'textSecondary',
      borderStyle: 'solid',
      hatch: true,
    }
  }
  if (kind === 'tech_break') {
    return {
      kind: 'tech_break',
      label: doctor.occupancyLabel ?? 'Техперерыв',
      bg: 'surfaceLight',
      barColor: 'brandOrange700',
      borderStyle: 'dashed',
      hatch: false,
    }
  }
  if (kind === 'appointment' || (doctor.busy && (appointment || doctor.appointmentId))) {
    return {
      kind: 'appointment',
      label: appointment?.patientName ?? doctor.occupancyLabel ?? doctor.name,
      bg: 'slotBookedFill',
      barColor: 'brandGreen',
      borderStyle: 'solid',
      hatch: false,
    }
  }
  if (unavailable) {
    return {
      kind: null,
      label: 'не влезет',
      bg: 'surfaceLight',
      barColor: 'danger',
      borderStyle: 'solid',
      hatch: false,
    }
  }
  return {
    kind: null,
    label: '',
    bg: 'white',
    barColor: 'transparent',
    borderStyle: 'solid',
    hatch: false,
  }
}

type SlotCellProps = {
  slot: ScheduleSlot
  doctor: SlotResource
  appointment?: Appointment
  selected: boolean
  isRescheduleTarget: boolean
  unavailable: boolean
  tabIndex: number
  onActivate: (time: string, doctorId: string) => void
  onArrowNav: (time: string, doctorId: string, key: string) => void
}

const SlotCell = React.memo(({
  slot,
  doctor,
  appointment,
  selected,
  isRescheduleTarget,
  unavailable,
  tabIndex,
  onActivate,
  onArrowNav,
}: SlotCellProps) => {
  const isBusy = doctor.busy
  const presentation = occupancyPresentation(doctor, appointment, unavailable)
  const barColor = isRescheduleTarget ? 'brandOrange' : presentation.barColor
  const ariaBusy = presentation.kind
    ? ` занят (${presentation.label})`
    : isBusy
      ? ' занят'
      : unavailable
        ? ' недоступен для выбранной услуги'
        : ' свободен'
  const ariaLabel = `${slot.time} ${doctor.name}${ariaBusy}`

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onActivate(slot.time, doctor.id)
      return
    }
    if (
      e.key === 'ArrowUp'
      || e.key === 'ArrowDown'
      || e.key === 'ArrowLeft'
      || e.key === 'ArrowRight'
    ) {
      e.preventDefault()
      e.stopPropagation()
      onArrowNav(slot.time, doctor.id, e.key)
    }
  }

  return (
    <Box
      role="button"
      tabIndex={tabIndex}
      aria-label={ariaLabel}
      data-testid={`slot-${doctor.id}-${slot.time}`}
      data-busy={isBusy ? 'true' : 'false'}
      data-occupancy={presentation.kind ?? undefined}
      data-working="true"
      data-unavailable={unavailable ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      data-grid-cell="true"
      onClick={() => onActivate(slot.time, doctor.id)}
      onKeyDown={handleKeyDown}
      cursor="pointer"
      bg={presentation.bg}
      backgroundImage={
        presentation.hatch
          ? 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.1) 3px, rgba(0,0,0,0.1) 6px)'
          : undefined
      }
      borderWidth="1px"
      borderColor="borderLight"
      borderStyle={presentation.borderStyle}
      borderLeftWidth="3px"
      borderLeftColor={barColor}
      borderRadius="none"
      height={SLOT_HEIGHT}
      display="flex"
      alignItems="center"
      px="2"
      overflow="hidden"
      data-reschedule-target={isRescheduleTarget ? 'true' : 'false'}
      _hover={{ bg: 'brandGreenFaint' }}
      _focusVisible={{
        outline: '2px solid',
        outlineColor: 'brandGreen700',
        outlineOffset: '-2px',
      }}
    >
      <Text
        fontSize="12px"
        lineHeight="15px"
        color="textPrimary"
        whiteSpace="nowrap"
        overflow="hidden"
        textOverflow="ellipsis"
        data-testid={isBusy || presentation.label ? 'busy-label' : undefined}
        data-occupancy-label={presentation.kind ?? undefined}
      >
        {presentation.label}
      </Text>
    </Box>
  )
})
SlotCell.displayName = 'SlotCell'

const OffStateCell = ({
  slot,
  doctor,
}: {
  slot: ScheduleSlot
  doctor: Doctor
}) => {
  const ariaLabel = `${slot.time} ${doctor.name} не работает`
  return (
    <Box
      role="presentation"
      tabIndex={-1}
      aria-label={ariaLabel}
      data-testid={`slot-${doctor.id}-${slot.time}`}
      data-working="false"
      data-busy="false"
      cursor="default"
      bg="surfaceLight"
      borderWidth="1px"
      borderColor="borderLight"
      borderLeftWidth="3px"
      borderLeftColor="#C8C8C8"
      borderStyle="dashed"
      borderRadius="none"
      height={SLOT_HEIGHT}
      display="flex"
      alignItems="center"
      px="2"
    />
  )
}

export const ScheduleGrid = ({
  schedule,
  doctors,
  appointments,
  selectedTime,
  selectedDoctorId,
  rescheduleTargetTime,
  rescheduleTargetDoctorId,
  fitDurationMin = null,
  fitDoctorId = null,
  onSlotClick,
}: ScheduleGridProps) => {
  const slots = schedule.slots
  const scrollRef = useRef<HTMLDivElement>(null)
  const [windowStart, setWindowStart] = useState(0)
  const [focusCell, setFocusCell] = useState<{ time: string; doctorId: string } | null>(null)

  const workingCells = useMemo(() => {
    const cells: Array<{ time: string; doctorId: string }> = []
    for (const slot of slots) {
      const byId = new Map(slot.doctors.map((d) => [d.id, d]))
      for (const doctor of doctors) {
        if (byId.has(doctor.id)) {
          cells.push({ time: slot.time, doctorId: doctor.id })
        }
      }
    }
    return cells
  }, [slots, doctors])

  const activeFocus = focusCell
    ?? (selectedTime && selectedDoctorId
      ? { time: selectedTime, doctorId: selectedDoctorId }
      : workingCells[0] ?? null)

  useEffect(() => {
    if (focusCell) return
    if (selectedTime && selectedDoctorId) {
      setFocusCell({ time: selectedTime, doctorId: selectedDoctorId })
      return
    }
    if (workingCells[0]) {
      setFocusCell(workingCells[0])
    }
  }, [focusCell, selectedTime, selectedDoctorId, workingCells])

  const onActivate = useCallback(
    (time: string, doctorId: string) => {
      const slot = slots.find((s) => s.time === time)
      const doctor = slot?.doctors.find((d) => d.id === doctorId)
      if (slot && doctor) onSlotClick(slot, doctor)
      setFocusCell({ time, doctorId })
    },
    [slots, onSlotClick],
  )

  const onArrowNav = useCallback(
    (time: string, doctorId: string, key: string) => {
      const idx = workingCells.findIndex((c) => c.time === time && c.doctorId === doctorId)
      if (idx < 0) return
      const doctorCount = Math.max(1, doctors.length)
      let next = idx
      if (key === 'ArrowRight') next = Math.min(workingCells.length - 1, idx + 1)
      if (key === 'ArrowLeft') next = Math.max(0, idx - 1)
      if (key === 'ArrowDown') next = Math.min(workingCells.length - 1, idx + doctorCount)
      if (key === 'ArrowUp') next = Math.max(0, idx - doctorCount)
      const target = workingCells[next]
      if (!target) return
      setFocusCell(target)
      const rowIdx = slots.findIndex((s) => s.time === target.time)
      if (rowIdx >= 0) {
        setWindowStart((prev) => {
          if (rowIdx < prev) return rowIdx
          if (rowIdx >= prev + WINDOW_ROWS) return Math.max(0, rowIdx - WINDOW_ROWS + 1)
          return prev
        })
      }
      requestAnimationFrame(() => {
        const el = scrollRef.current?.querySelector(
          `[data-testid="slot-${target.doctorId}-${target.time}"]`,
        ) as HTMLElement | null
        el?.focus()
      })
    },
    [workingCells, doctors.length, slots],
  )

  const onScroll = useCallback(() => {
    const root = scrollRef.current
    if (!root) return
    const start = Math.max(0, Math.floor(root.scrollTop / SLOT_HEIGHT_PX) - 2)
    const maxStart = Math.max(0, slots.length - WINDOW_ROWS)
    setWindowStart(Math.min(start, maxStart))
  }, [slots.length])

  const windowEnd = Math.min(slots.length, windowStart + WINDOW_ROWS)
  const topPad = windowStart * SLOT_HEIGHT_PX
  const bottomPad = Math.max(0, (slots.length - windowEnd) * SLOT_HEIGHT_PX)
  const visibleSlots = slots.slice(windowStart, windowEnd)

  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${TIME_COL_WIDTH} repeat(${doctors.length}, minmax(${DOCTOR_COL_WIDTH}, 1fr))`,
    gridAutoRows: `minmax(${SLOT_HEIGHT}, auto)`,
    gap: 0,
  }

  if (schedule.holiday) {
    return (
      <Box
        data-testid="schedule-grid"
        data-doctor-count={doctors.length}
        data-holiday="true"
        bg="white"
        borderWidth="1px"
        borderColor="borderLight"
        borderRadius="none"
        p="4"
      >
        <Box
          bg="brandOrange"
          color="textPrimary"
          borderRadius="compact"
          px="3"
          py="2"
          data-testid="schedule-holiday"
        >
          <Text fontSize="14px" fontWeight="700" lineHeight="20px">
            {schedule.holiday.name}
          </Text>
          <Text fontSize="12px" lineHeight="16px" mt="1">
            Праздничный день — приём не ведётся, слотов нет.
          </Text>
        </Box>
      </Box>
    )
  }

  return (
    <Box
      data-testid="schedule-grid"
      data-arm-primary-target="true"
      data-doctor-count={doctors.length}
      data-window-rows={visibleSlots.length}
      data-window-max={WINDOW_ROWS}
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="none"
      overflow="auto"
      maxH={`${VIEWPORT_ROWS * SLOT_HEIGHT_PX}px`}
      ref={scrollRef}
      onScroll={onScroll}
    >
      <Box style={gridStyle}>
        <Box
          bg="surfaceLight"
          borderRightWidth="1px"
          borderColor="borderLight"
          height={SLOT_HEIGHT}
          position="sticky"
          top="0"
          left="0"
          zIndex={3}
          display="flex"
          alignItems="center"
          px="2"
        >
          <Text
            fontSize="12px"
            lineHeight="15px"
            color="textSecondary"
            textTransform="uppercase"
            letterSpacing="0.04em"
          >
            Время
          </Text>
        </Box>
        {doctors.map((d) => (
          <Box
            key={d.id}
            bg="surfaceLight"
            borderRightWidth="1px"
            borderColor="borderLight"
            height={SLOT_HEIGHT}
            position="sticky"
            top="0"
            zIndex={2}
            display="flex"
            alignItems="center"
            px="2"
          >
            <Text
              fontSize="13px"
              lineHeight="18px"
              color="textPrimary"
              whiteSpace="nowrap"
              overflow="hidden"
              textOverflow="ellipsis"
            >
              {d.name}
            </Text>
          </Box>
        ))}
        {topPad > 0 ? (
          <Box
            style={{ gridColumn: `1 / -1`, height: topPad }}
            aria-hidden="true"
            data-testid="grid-window-top-pad"
          />
        ) : null}
        {visibleSlots.map((slot) => {
          const slotDoctorById = new Map(slot.doctors.map((d) => [d.id, d]))
          return (
            <Box
              key={`time-${slot.time}`}
              display="contents"
              data-testid={`row-${slot.time}`}
            >
              <Box
                bg="surfaceLight"
                borderRightWidth="1px"
                borderTopWidth="1px"
                borderColor="borderLight"
                height={SLOT_HEIGHT}
                position="sticky"
                left="0"
                zIndex={1}
                display="flex"
                alignItems="center"
                px="2"
              >
                <Text
                  fontSize="12px"
                  fontFamily="mono"
                  lineHeight="15px"
                  color="textPrimary"
                >
                  {slot.time}
                </Text>
              </Box>
              {doctors.map((doctor) => {
                const doc = slotDoctorById.get(doctor.id)
                if (!doc) {
                  return (
                    <OffStateCell
                      key={`${slot.time}-${doctor.id}-off`}
                      slot={slot}
                      doctor={doctor}
                    />
                  )
                }
                const appt = appointmentFor(appointments, doc.id, doc.appointmentId)
                const selected =
                  selectedTime === slot.time && selectedDoctorId === doc.id
                const isRescheduleTarget =
                  rescheduleTargetTime === slot.time &&
                  rescheduleTargetDoctorId === doc.id
                const unavailable = Boolean(
                  !doc.busy
                  && fitDurationMin
                  && (fitDoctorId == null || fitDoctorId === doc.id)
                  && !cellFits(schedule, doc.id, slot.time, fitDurationMin),
                )
                const isFocus =
                  activeFocus?.time === slot.time && activeFocus?.doctorId === doc.id
                return (
                  <SlotCell
                    key={`${slot.time}-${doc.id}`}
                    slot={slot}
                    doctor={doc}
                    appointment={appt}
                    selected={selected}
                    isRescheduleTarget={isRescheduleTarget}
                    unavailable={unavailable}
                    tabIndex={isFocus ? 0 : -1}
                    onActivate={onActivate}
                    onArrowNav={onArrowNav}
                  />
                )
              })}
            </Box>
          )
        })}
        {bottomPad > 0 ? (
          <Box
            style={{ gridColumn: `1 / -1`, height: bottomPad }}
            aria-hidden="true"
            data-testid="grid-window-bottom-pad"
          />
        ) : null}
      </Box>
    </Box>
  )
}
