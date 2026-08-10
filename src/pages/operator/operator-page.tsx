import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'
import { useLocation, useNavigate } from 'react-router-dom'

import {
  getAppointments,
  getDoctors,
  getPatients,
  getSchedule,
  getServices,
  getWaitlist,
} from '../../__data__/api'
import {
  formatShortDate,
  parseArmDate,
  shiftDate,
  todayDate,
  weekDates,
  withArmDate,
} from '../../__data__/dates'
import { resolveBookingDuration, serviceOfferedByDoctor } from '../../__data__/booking'
import type {
  Appointment,
  Doctor,
  Patient,
  Schedule,
  ScheduleSlot,
  Service,
  SlotResource,
} from '../../__data__/types'
import { isTerminalAppointmentStatus } from '../../__data__/types'
import { URLs } from '../../__data__/urls'

import { ScheduleGrid } from './schedule-grid'
import { ServicePicker } from './service-picker'
import { ShiftOverview } from './shift-overview'
import { SlotCard, type SlotActionNotice } from './slot-card'
import { WaitlistPanel } from './waitlist'
import { MassReschedulePanel } from './mass-reschedule'

type OperatorRange = 'today' | 'tomorrow' | 'week'

interface SelectedSlot {
  time: string
  doctorId: string
  date: string
}

const RANGE_ITEMS: Array<{ id: OperatorRange; label: string }> = [
  { id: 'today', label: 'Сегодня' },
  { id: 'tomorrow', label: 'Завтра' },
  { id: 'week', label: 'Неделя' },
]

const weekdayOf = (isoDate: string): number => {
  const [y, m, d] = isoDate.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export const OperatorPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedDate = parseArmDate(location.search)

  const [range, setRange] = useState<OperatorRange>('today')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [selected, setSelected] = useState<SelectedSlot | null>(null)
  const [rescheduleTarget, setRescheduleTarget] = useState<SelectedSlot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [refreshError, setRefreshError] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [fitDurationMin, setFitDurationMin] = useState<number | null>(null)
  const [filterServiceId, setFilterServiceId] = useState<string | null>(null)
  const [section, setSection] = useState<'grid' | 'waitlist' | 'mass-reschedule'>('grid')
  const [waitlistOpenCount, setWaitlistOpenCount] = useState(0)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  const viewDates = useMemo(() => {
    if (range === 'week') return weekDates(selectedDate)
    if (range === 'tomorrow') return [shiftDate(todayDate(), 1)]
    return [selectedDate]
  }, [range, selectedDate])

  const primaryDate = viewDates[0]

  const load = useCallback(async () => {
    const dates = range === 'week'
      ? weekDates(selectedDate)
      : range === 'tomorrow'
        ? [shiftDate(todayDate(), 1)]
        : [selectedDate]

    const [schedResults, apptResults, docs, svcs, pats, waitlist] = await Promise.all([
      Promise.all(dates.map((d) => getSchedule(d))),
      Promise.all(dates.map((d) => getAppointments(d))),
      getDoctors(),
      getServices(),
      getPatients(),
      getWaitlist({ status: 'open' }),
    ])
    setSchedules(schedResults)
    setAppointments(apptResults.flatMap((a) => a.items))
    setDoctors(docs.items)
    setServices(svcs.items)
    setPatients(pats.items)
    setWaitlistOpenCount(waitlist.openCount)
    setIsLoaded(true)
  }, [range, selectedDate])

  useEffect(() => {
    setIsLoaded(false)
    setError(null)
    load().catch((e: unknown) => {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить данные')
    })
  }, [load])

  const handleRangeChange = (next: OperatorRange) => {
    setRange(next)
    setSelected(null)
    setRescheduleTarget(null)
    if (next === 'today') {
      navigate(withArmDate(URLs.arms.operator, todayDate()), { replace: true })
    } else if (next === 'tomorrow') {
      navigate(withArmDate(URLs.arms.operator, shiftDate(todayDate(), 1)), { replace: true })
    }
  }

  const scheduleFor = useCallback(
    (date: string) => schedules.find((s) => s.date === date) ?? null,
    [schedules],
  )

  const filterService = useMemo(
    () => (filterServiceId ? services.find((s) => s.id === filterServiceId) : undefined),
    [filterServiceId, services],
  )

  const visibleDoctors = useMemo(() => {
    if (!filterService) return doctors
    return doctors.filter((d) => serviceOfferedByDoctor(filterService, d.id))
  }, [doctors, filterService])

  const serviceFitDuration = useMemo(() => {
    if (!filterService) return null
    return resolveBookingDuration(filterService, 'repeat')
  }, [filterService])

  const handleServiceFilter = useCallback((serviceId: string | null) => {
    setFilterServiceId(serviceId)
    setSelected(null)
    setRescheduleTarget(null)
    setFitDurationMin(null)
  }, [])

  const selectedDoctor = useMemo<Doctor | undefined>(
    () => (selected ? doctors.find((d) => d.id === selected.doctorId) : undefined),
    [doctors, selected],
  )

  const selectedResource = useMemo<SlotResource | undefined>(() => {
    if (!selected) return undefined
    const schedule = scheduleFor(selected.date)
    if (!schedule) return undefined
    const slot = schedule.slots.find((s) => s.time === selected.time)
    return slot?.doctors.find((d) => d.id === selected.doctorId)
  }, [scheduleFor, selected])

  const selectedAppointment = useMemo<Appointment | undefined>(() => {
    if (!selectedResource?.appointmentId || !selected) return undefined
    return appointments.find(
      (a) => a.id === selectedResource.appointmentId && a.doctorId === selected.doctorId,
    )
  }, [appointments, selectedResource, selected])

  const handleSlotClick = useCallback(
    (date: string, slot: ScheduleSlot, doctor: SlotResource) => {
      const selectedTerminal = isTerminalAppointmentStatus(selectedAppointment?.status)
      const sameAsSelected = selected?.time === slot.time
        && selected?.doctorId === doctor.id
        && selected?.date === date
      if (selectedResource?.busy && !doctor.busy && !selectedTerminal && !sameAsSelected) {
        setRescheduleTarget({ time: slot.time, doctorId: doctor.id, date })
        return
      }

      setRescheduleTarget(null)
      setSelected({ time: slot.time, doctorId: doctor.id, date })
      setFitDurationMin(null)
    },
    [selectedResource, selectedAppointment, selected],
  )

  const handleBookingDone = useCallback((notice?: SlotActionNotice) => {
    if (notice?.kind === 'booked') {
      setActionNotice(`Запись создана: ${notice.patientName}, ${notice.time}`)
    } else if (notice?.kind === 'cancelled') {
      setActionNotice(`Слот освобождён: ${notice.time}, ${notice.doctorName}`)
    }
    setRefreshError(null)
    load()
      .then(() => {
        setSelected(null)
        setRescheduleTarget(null)
      })
      .catch((e: unknown) => {
        const message = e instanceof Error ? e.message : 'Не удалось обновить сетку после записи'
        setRefreshError(message)
      })
  }, [load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setSelected(null)
      setRescheduleTarget(null)
      setFitDurationMin(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (error) {
    return (
      <Box p="6" data-testid="operator-error">
        <Text color="danger" mb="3">{error}</Text>
        <Box
          as="button"
          data-testid="operator-retry"
          onClick={() => {
            setError(null)
            setIsLoaded(false)
            load().catch((e: unknown) => {
              setError(e instanceof Error ? e.message : 'Не удалось загрузить данные')
            })
          }}
          h="32px"
          px="12px"
          borderRadius="4px"
          bg="brandGreen"
          color="white"
          fontSize="13px"
          cursor="pointer"
        >
          Повторить
        </Box>
      </Box>
    )
  }

  if (!isLoaded) {
    return (
      <Box p="6" data-testid="operator-loading">
        <Text color="textSecondary">Загрузка сетки…</Text>
      </Box>
    )
  }

  const daySchedules = schedules.filter((s) => viewDates.includes(s.date))
  const isScheduleEmpty = daySchedules.every((s) => s.slots.length === 0 && !s.holiday)
  const emptyReason = (() => {
    const primary = daySchedules.find((s) => s.date === primaryDate)
    if (primary?.holiday) {
      return `${primary.holiday.name} — приём не ведётся.`
    }
    const weekday = weekdayOf(primaryDate)
    if (weekday === 0 || weekday === 6) {
      return 'Сегодня выходной — смена не опубликована.'
    }
    return 'Смена на сегодня не опубликована.'
  })()

  const overviewAppointments = appointments.filter(
    (a) => viewDates.includes(String(a.start).slice(0, 10)),
  )

  return (
    <Flex
      h="100%"
      bg="surfaceLight"
      data-testid="operator-page"
      data-date={selectedDate}
      data-range={range}
      data-section={section}
      direction="column"
      gap="3"
      p="3"
    >
      <Flex gap="6px" align="center" wrap="wrap">
        <Button
          type="button"
          size="sm"
          tabIndex={-1}
          borderRadius="compact"
          variant={section === 'grid' ? 'solid' : 'outline'}
          bg={section === 'grid' ? 'brandGreen' : 'transparent'}
          color={section === 'grid' ? 'white' : 'textPrimary'}
          borderColor="borderLight"
          onClick={() => setSection('grid')}
          data-testid="section-grid"
        >
          Сетка
        </Button>
        <Button
          type="button"
          size="sm"
          tabIndex={-1}
          borderRadius="compact"
          variant={section === 'waitlist' ? 'solid' : 'outline'}
          bg={section === 'waitlist' ? 'brandGreen' : 'transparent'}
          color={section === 'waitlist' ? 'white' : 'textPrimary'}
          borderColor="borderLight"
          onClick={() => setSection('waitlist')}
          data-testid="section-waitlist"
        >
          Лист ожидания{waitlistOpenCount > 0 ? ` (${waitlistOpenCount})` : ''}
        </Button>
        <Button
          type="button"
          size="sm"
          tabIndex={-1}
          borderRadius="compact"
          variant={section === 'mass-reschedule' ? 'solid' : 'outline'}
          bg={section === 'mass-reschedule' ? 'brandGreen' : 'transparent'}
          color={section === 'mass-reschedule' ? 'white' : 'textPrimary'}
          borderColor="borderLight"
          onClick={() => setSection('mass-reschedule')}
          data-testid="section-mass-reschedule"
        >
          Снос расписания
        </Button>
      </Flex>

      {actionNotice ? (
        <Box
          role="status"
          bg="brandGreenTint"
          color="brandGreen700"
          borderRadius="compact"
          px="3"
          py="2"
          fontSize="13px"
          data-testid="operator-action-notice"
        >
          {actionNotice}
        </Box>
      ) : null}

      {section === 'waitlist' ? (
        <WaitlistPanel
          patients={patients}
          services={services}
          doctors={doctors}
          onOpenCountChange={setWaitlistOpenCount}
        />
      ) : null}

      {section === 'mass-reschedule' ? (
        <MassReschedulePanel doctors={doctors} />
      ) : null}

      {section === 'grid' && refreshError ? (
        <Box
          bg="danger"
          color="white"
          borderRadius="compact"
          px="4"
          py="3"
          data-testid="operator-refresh-error"
        >
          <Text fontSize="14px" fontWeight="700" lineHeight="20px">
            Не удалось обновить сетку после записи
          </Text>
          <Text fontSize="12px" lineHeight="16px" mt="1">
            {refreshError}
          </Text>
          <Text fontSize="12px" lineHeight="16px" mt="2" data-testid="operator-refresh-error-hint">
            Запись создана на сервере, но локальная сетка устарела. Повторите действие или обновите страницу.
          </Text>
        </Box>
      ) : null}
      {section === 'grid' ? (
        <Flex direction="column" gap="3" flex="1" minH="0">
          <Flex gap="3" align="stretch" flex="1" minH="0" order={2}>
            <Stack
              gap="3"
              flex="1"
              minW="0"
              bg="white"
              borderWidth="1px"
              borderColor="borderLight"
              borderRadius="compact"
              p="4"
              data-arm-section="grid"
            >
              <Flex align="center" gap="3" wrap="wrap">
                <Box flex="1" minW="160px">
                  <Text
                    fontSize="18px"
                    lineHeight="24px"
                    fontWeight="700"
                    letterSpacing="-0.022em"
                  >
                    Сетка смены
                  </Text>
                  <Text fontSize="12px" color="textSecondary">
                    {range === 'week'
                      ? `${formatShortDate(viewDates[0])}–${formatShortDate(viewDates[6])}`
                      : formatShortDate(primaryDate)}
                    {daySchedules[0] ? ` · шаг ${daySchedules[0].stepMinutes} мин` : null}
                  </Text>
                </Box>
                <Flex
                  role="tablist"
                  aria-label="Диапазон сетки"
                  gap="2px"
                  align="center"
                  h="32px"
                  px="2px"
                  bg="surfaceLight"
                  borderWidth="1px"
                  borderColor="borderLight"
                  borderRadius="compact"
                  data-testid="operator-range"
                  onKeyDown={(e) => {
                    const idx = RANGE_ITEMS.findIndex((i) => i.id === range)
                    if (e.key === 'ArrowRight' && idx < RANGE_ITEMS.length - 1) {
                      e.preventDefault()
                      handleRangeChange(RANGE_ITEMS[idx + 1].id)
                    }
                    if (e.key === 'ArrowLeft' && idx > 0) {
                      e.preventDefault()
                      handleRangeChange(RANGE_ITEMS[idx - 1].id)
                    }
                  }}
                >
                  {RANGE_ITEMS.map((item) => {
                    const active = range === item.id
                    return (
                      <Box
                        as="button"
                        key={item.id}
                        role="tab"
                        tabIndex={active ? 0 : -1}
                        aria-selected={active}
                        data-testid={`operator-range-${item.id}`}
                        onClick={() => handleRangeChange(item.id)}
                        h="28px"
                        px="12px"
                        borderRadius="4px"
                        fontSize="13px"
                        cursor="pointer"
                        color={active ? 'white' : 'textPrimary'}
                        bg={active ? 'brandGreen' : 'transparent'}
                      >
                        {item.label}
                      </Box>
                    )
                  })}
                </Flex>
              </Flex>
              {selectedResource?.busy && (
                <Text
                  fontSize="12px"
                  color="textSecondary"
                  data-testid="reschedule-hint"
                >
                  Клик по свободному слоту выберет его целью переноса.
                </Text>
              )}
              {isScheduleEmpty ? (
                <Box
                  p="6"
                  borderRadius="compact"
                  borderWidth="1px"
                  borderStyle="dashed"
                  borderColor="borderLight"
                  data-testid="operator-empty"
                >
                  <Text fontSize="13px" color="textSecondary" data-testid="operator-empty-reason">
                    {emptyReason}
                  </Text>
                </Box>
              ) : (
                <Stack gap="4" data-testid={range === 'week' ? 'schedule-week' : undefined} overflowY="auto">
                  {daySchedules.map((schedule) => (
                    schedule.slots.length === 0 && !schedule.holiday ? null : (
                      <Box key={schedule.date} data-testid={`schedule-day-${schedule.date}`}>
                        {range === 'week' ? (
                          <Text fontSize="13px" fontWeight="700" mb="2" color="textPrimary">
                            {formatShortDate(schedule.date)}
                          </Text>
                        ) : null}
                        <ScheduleGrid
                          schedule={schedule}
                          doctors={visibleDoctors}
                          appointments={appointments.filter(
                            (a) => String(a.start).slice(0, 10) === schedule.date,
                          )}
                          selectedTime={selected?.date === schedule.date ? selected.time : null}
                          selectedDoctorId={selected?.date === schedule.date ? selected.doctorId : null}
                          rescheduleTargetTime={
                            rescheduleTarget?.date === schedule.date ? rescheduleTarget.time : null
                          }
                          rescheduleTargetDoctorId={
                            rescheduleTarget?.date === schedule.date
                              ? rescheduleTarget.doctorId
                              : null
                          }
                          fitDurationMin={
                            (selected?.date === schedule.date ? fitDurationMin : null)
                        ?? (filterService ? serviceFitDuration : null)
                          }
                          fitDoctorId={
                            filterService
                              ? null
                              : (
                                selected?.date === schedule.date && !selectedResource?.busy
                                  ? selected.doctorId
                                  : null
                              )
                          }
                          onSlotClick={(slot, doctor) => handleSlotClick(schedule.date, slot, doctor)}
                        />
                      </Box>
                    )
                  ))}
                </Stack>
              )}
              <ShiftOverview appointments={overviewAppointments} />
            </Stack>

            <Box w="320px" flex="none">
              {selected && selectedDoctor && selectedResource ? (
                <SlotCard
                  key={`${selected.date}:${selected.time}:${selected.doctorId}`}
                  scheduleDate={selected.date}
                  time={selected.time}
                  doctor={selectedDoctor}
                  doctorResource={selectedResource}
                  appointment={selectedAppointment}
                  services={services}
                  patients={patients}
                  schedule={
                    schedules.find((s) => s.date === selected.date)
                ?? {
                  date: selected.date,
                  startTime: '08:00',
                  endTime: '20:00',
                  stepMinutes: 15,
                  slots: [],
                }
                  }
                  rescheduleTargetTime={rescheduleTarget?.time ?? null}
                  rescheduleTargetDoctorId={rescheduleTarget?.doctorId ?? null}
                  onClearRescheduleTarget={() => setRescheduleTarget(null)}
                  onFitDurationChange={setFitDurationMin}
                  preferredServiceId={filterServiceId}
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
          <Box order={1}>
            <ServicePicker
              services={services}
              selectedId={filterServiceId}
              onSelect={handleServiceFilter}
            />
          </Box>
        </Flex>
      ) : null}
    </Flex>
  )
}
