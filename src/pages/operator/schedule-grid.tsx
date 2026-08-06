import React from 'react'
import { Box, Text } from '@chakra-ui/react'

import type {
  Appointment,
  Doctor,
  Schedule,
  ScheduleSlot,
  SlotResource,
} from '../../__data__/types'

const SLOT_HEIGHT = '28px'
const TIME_COL_WIDTH = '80px'
const DOCTOR_COL_WIDTH = '140px'

interface ScheduleGridProps {
  schedule: Schedule
  doctors: Doctor[]
  appointments: Appointment[]
  selectedTime: string | null
  selectedDoctorId: string | null
  onSlotClick: (slot: ScheduleSlot, doctor: SlotResource) => void
}

const appointmentFor = (
  appointments: Appointment[],
  doctorId: string,
  appointmentId: string | undefined,
): Appointment | undefined => {
  if (!appointmentId) return undefined
  return appointments.find((a) => a.id === appointmentId && a.doctorId === doctorId)
}

const SlotCell = ({
  slot,
  doctor,
  appointment,
  selected,
  onClick,
}: {
  slot: ScheduleSlot
  doctor: SlotResource
  appointment?: Appointment
  selected: boolean
  onClick: () => void
}) => {
  const isBusy = doctor.busy
  const bg = isBusy ? 'brandGreenTint' : 'white'
  const barColor = isBusy ? 'brandGreen' : 'transparent'
  const label = isBusy && appointment ? appointment.patientName ?? doctor.name : ''
  const ariaLabel = `${slot.time} ${doctor.name}${isBusy ? ' занят' : ' свободен'}`

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onClick()
    }
  }

  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      data-testid={`slot-${doctor.id}-${slot.time}`}
      data-busy={isBusy ? 'true' : 'false'}
      data-selected={selected ? 'true' : 'false'}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      cursor="pointer"
      bg={bg}
      borderWidth="1px"
      borderColor="borderLight"
      borderLeftWidth="3px"
      borderLeftColor={barColor}
      borderRadius="none"
      height={SLOT_HEIGHT}
      display="flex"
      alignItems="center"
      px="2"
      overflow="hidden"
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
        data-testid={isBusy ? 'busy-label' : undefined}
      >
        {label}
      </Text>
    </Box>
  )
}

export const ScheduleGrid = ({
  schedule,
  doctors,
  appointments,
  selectedTime,
  selectedDoctorId,
  onSlotClick,
}: ScheduleGridProps) => {
  const slots = schedule.slots
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `${TIME_COL_WIDTH} repeat(${doctors.length}, minmax(${DOCTOR_COL_WIDTH}, 1fr))`,
    gridAutoRows: SLOT_HEIGHT,
    gap: 0,
  }

  return (
    <Box
      data-testid="schedule-grid"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="none"
      overflow="auto"
      maxH="640px"
    >
      <Box style={gridStyle}>
        <Box
          bg="surfaceLight"
          borderRightWidth="1px"
          borderColor="borderLight"
          height={SLOT_HEIGHT}
          position="sticky"
          left="0"
          zIndex={2}
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
        {slots.map((slot) => (
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
            {slot.doctors.map((doc) => {
              const appt = appointmentFor(appointments, doc.id, doc.appointmentId)
              const selected =
                selectedTime === slot.time && selectedDoctorId === doc.id
              return (
                <SlotCell
                  key={`${slot.time}-${doc.id}`}
                  slot={slot}
                  doctor={doc}
                  appointment={appt}
                  selected={selected}
                  onClick={() => onSlotClick(slot, doc)}
                />
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
