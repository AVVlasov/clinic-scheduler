import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'

import {
  getAppointments,
  getDoctors,
  getSchedule,
  getServices,
} from '../../__data__/api'
import type {
  Appointment,
  Doctor,
  Schedule,
  ScheduleSlot,
  Service,
  SlotResource,
} from '../../__data__/types'

import { ScheduleGrid } from './schedule-grid'
import { ShiftOverview } from './shift-overview'
import { SlotCard } from './slot-card'

const todayDate = () => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const formatRangeTitle = (date: string) => {
  const [, mm, dd] = date.split('-')
  return `${Number(dd)}.${Number(mm)}`
}

interface SelectedSlot {
  time: string
  doctorId: string
}

export const OperatorPage = () => {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selected, setSelected] = useState<SelectedSlot | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const date = todayDate()
    const [sched, appts, docs, svcs] = await Promise.all([
      getSchedule(date),
      getAppointments(),
      getDoctors(),
      getServices(),
    ])
    setSchedule(sched)
    setAppointments(appts.items)
    setDoctors(docs.items)
    setServices(svcs.items)
  }, [])

  useEffect(() => {
    load().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить данные')
    })
  }, [load])

  const selectedDoctor = useMemo<Doctor | undefined>(
    () => (selected ? doctors.find((d) => d.id === selected.doctorId) : undefined),
    [doctors, selected],
  )

  const selectedResource = useMemo<SlotResource | undefined>(() => {
    if (!schedule || !selected) return undefined
    const slot = schedule.slots.find((s) => s.time === selected.time)
    return slot?.doctors.find((d) => d.id === selected.doctorId)
  }, [schedule, selected])

  const selectedAppointment = useMemo<Appointment | undefined>(() => {
    if (!selectedResource?.appointmentId) return undefined
    return appointments.find(
      (a) => a.id === selectedResource.appointmentId && a.doctorId === selected.doctorId,
    )
  }, [appointments, selectedResource, selected])

  const handleSlotClick = useCallback(
    (slot: ScheduleSlot, doctor: SlotResource) => {
      setSelected({ time: slot.time, doctorId: doctor.id })
    },
    [],
  )

  const handleBookingDone = useCallback(() => {
    setSelected(null)
    load().catch(() => undefined)
  }, [load])

  if (error) {
    return (
      <Box p="6" data-testid="operator-error">
        <Text color="danger">{error}</Text>
      </Box>
    )
  }

  if (!schedule) {
    return (
      <Box p="6" data-testid="operator-loading">
        <Text color="textSecondary">Загрузка сетки…</Text>
      </Box>
    )
  }

  return (
    <Flex
      h="100%"
      bg="surfaceLight"
      data-testid="operator-page"
      direction="column"
      gap="3"
      p="3"
    >
      <Flex gap="3" align="stretch" flex="1" minH="0">
        <Stack
          gap="3"
          flex="1"
          minW="0"
          bg="white"
          borderWidth="1px"
          borderColor="borderLight"
          borderRadius="compact"
          p="4"
        >
          <Box>
            <Text
              fontSize="18px"
              lineHeight="24px"
              fontWeight="700"
              letterSpacing="-0.022em"
            >
              Сетка смены
            </Text>
            <Text fontSize="12px" color="textSecondary">
              {formatRangeTitle(schedule.date)} · шаг {schedule.stepMinutes} мин
            </Text>
          </Box>
          <ScheduleGrid
            schedule={schedule}
            doctors={doctors}
            appointments={appointments}
            selectedTime={selected?.time ?? null}
            selectedDoctorId={selected?.doctorId ?? null}
            onSlotClick={handleSlotClick}
          />
          <ShiftOverview appointments={appointments} />
        </Stack>

        <Box w="320px" flex="none">
          {selected && selectedDoctor && selectedResource ? (
            <SlotCard
              time={selected.time}
              doctor={selectedDoctor}
              doctorResource={selectedResource}
              appointment={selectedAppointment}
              services={services}
              onBookingDone={handleBookingDone}
            />
          ) : (
            <Box
              bg="white"
              borderWidth="1px"
              borderColor="borderLight"
              borderRadius="compact"
              p="4"
              data-testid="slot-card-empty"
            >
              <Text fontSize="13px" color="textSecondary" mb="2">
                Слот не выбран
              </Text>
              <Text fontSize="13px" color="textPrimary" lineHeight="20px">
                Выберите свободное время в сетке слева, чтобы открыть карточку
                и записать пациента.
              </Text>
            </Box>
          )}
        </Box>
      </Flex>
    </Flex>
  )
}
