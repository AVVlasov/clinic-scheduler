import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, Flex, Stack, Text } from '@chakra-ui/react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { resolveSection } from '../../__data__/arm-nav'
import {
  getAppointments,
  getDoctors,
  getDurationRules,
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
import { defaultVisitTypeForService, resolveBookingDuration, serviceOfferedByDoctor } from '../../__data__/booking'
import type {
  Appointment,
  Doctor,
  DurationRule,
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
  const [searchParams] = useSearchParams()
  const selectedDate = parseArmDate(location.search)
  const section = resolveSection('operator', searchParams.get('section'))

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
  const [durationRules, setDurationRules] = useState<DurationRule[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [waitlistOpenCount, setWaitlistOpenCount] = useState(0)
  const [actionNotice, setActionNotice] = useState<string | null>(null)

  /**
   * Сетка всегда показывает день из шапки. «Сегодня» и «Завтра» — не отдельные
   * режимы просмотра, а быстрый переход по датам: раньше «Завтра» считалось от
   * системного дня, и после стрелок в шапке заголовок показывал одно число, а
   * сетка — другое.
   */
  const viewDates = useMemo(() => {
    if (range === 'week') return weekDates(selectedDate)
    return [selectedDate]
  }, [range, selectedDate])

  /** Какая вкладка диапазона подсвечена — выводится из даты, а не хранится отдельно. */
  const activeRange: OperatorRange | null = useMemo(() => {
    if (range === 'week') return 'week'
    if (selectedDate === todayDate()) return 'today'
    if (selectedDate === shiftDate(todayDate(), 1)) return 'tomorrow'
    return null
  }, [range, selectedDate])

  const primaryDate = viewDates[0]

  const load = useCallback(async () => {
    const dates = range === 'week' ? weekDates(selectedDate) : [selectedDate]

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

  /**
   * Правила длительности грузятся отдельно от смены: справочник администратора
   * не должен закрывать оператору сетку. Без него действует резервный норматив
   * приёма из `resolveBookingDuration` — тот же, что был до появления правил.
   */
  useEffect(() => {
    let cancelled = false
    Promise.resolve()
      .then(() => getDurationRules())
      .then((res) => {
        if (!cancelled) setDurationRules(res.items)
      })
      .catch(() => {
        if (!cancelled) setDurationRules([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Зелёная плашка «Запись создана» не должна висеть весь день: она про
  // последнее действие, а после смены дня относится уже не к тому, что на экране.
  useEffect(() => {
    setActionNotice(null)
  }, [selectedDate, range])

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

  /**
   * В сетке — только врачи, у которых в этот день есть смена. Справочник
   * содержит и тех, кому расписание ещё не завели: их пустая колонка занимает
   * место и читается как «врач весь день свободен».
   */
  const doctorsOnDuty = useMemo(() => {
    const onDuty = new Set<string>()
    for (const schedule of schedules) {
      if (!viewDates.includes(schedule.date)) continue
      for (const slot of schedule.slots) {
        for (const cell of slot.doctors) onDuty.add(cell.id)
      }
    }
    return onDuty.size > 0 ? doctors.filter((d) => onDuty.has(d.id)) : doctors
  }, [doctors, schedules, viewDates])

  const visibleDoctors = useMemo(() => {
    if (!filterService) return doctorsOnDuty
    return doctorsOnDuty.filter((d) => serviceOfferedByDoctor(filterService, d.id))
  }, [doctorsOnDuty, filterService])

  const serviceFitDuration = useMemo(() => {
    if (!filterService) return null
    // Тип приёма берётся из услуги, а не приколочен к «повторному»: иначе зона
    // занятости в сетке считается по чужой длительности и «не влезет»
    // появляется там, где на самом деле влезает.
    return resolveBookingDuration(filterService, defaultVisitTypeForService(filterService), {
      rules: durationRules,
      requiresEquipment: filterService.requiresEquipment,
    })
  }, [filterService, durationRules])

  const handleServiceFilter = useCallback((serviceId: string | null) => {
    setFilterServiceId(serviceId)
    setSelected(null)
    setRescheduleTarget(null)
    setFitDurationMin(null)
  }, [])

  /**
   * Подбор по услуге — фильтр «Расписания», а не отдельный экран: раньше на это
   * же место вёл второй пункт меню с точно такой же сеткой. Уходя со сетки,
   * фильтр снимаем: иначе он молча сужал бы список врачей.
   */
  useEffect(() => {
    if (section === 'grid') return
    setFilterServiceId(null)
    setPickerOpen(false)
  }, [section])

  const isGridScreen = section === 'grid'

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
          bg="brandGreenDark"
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
    // Пустое состояние называет ВЫБРАННЫЙ день, а не «сегодня»: оператор
    // листает даты стрелками, и «сегодня» на 14 августа читается как ошибка.
    const label = formatShortDate(primaryDate)
    const weekday = weekdayOf(primaryDate)
    if (weekday === 0 || weekday === 6) {
      return `${label} — выходной, смена не опубликована.`
    }
    return `Смена на ${label} не опубликована.`
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
      {waitlistOpenCount > 0 && section !== 'waitlist' ? (
        <Text fontSize="12px" color="textSecondary" data-testid="operator-waitlist-hint">
          В листе ожидания открытых заявок: {waitlistOpenCount}
        </Text>
      ) : null}

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
          durationRules={durationRules}
          onOpenCountChange={setWaitlistOpenCount}
        />
      ) : null}

      {section === 'mass-reschedule' ? (
        <MassReschedulePanel doctors={doctors} />
      ) : null}

      {isGridScreen && refreshError ? (
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
      {isGridScreen ? (
        <Flex direction="column" gap="3" flex="1" minH="0">
          <Flex gap="3" align="stretch" flex="1" minH="0" order={2}>
            <Stack
              gap="3"
              flex="1"
              minW="0"
              minH="0"
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
                    {daySchedules[0] ? `, шаг ${daySchedules[0].stepMinutes} мин` : null}
                  </Text>
                </Box>
                {/* Подбор по услуге — здесь же, на сетке: отдельный экран с той
                    же сеткой был вторым входом в ту же работу. */}
                <Box
                  as="button"
                  data-testid="service-picker-toggle"
                  aria-expanded={pickerOpen || Boolean(filterServiceId)}
                  onClick={() => setPickerOpen((v) => !v)}
                  h="32px"
                  px="12px"
                  borderRadius="compact"
                  borderWidth="1px"
                  borderColor={filterServiceId ? 'brandGreen' : 'borderLight'}
                  bg={filterServiceId ? 'brandGreenFaint' : 'white'}
                  color={filterServiceId ? 'brandGreen700' : 'textPrimary'}
                  fontSize="13px"
                  cursor="pointer"
                >
                  {filterService ? `Услуга: ${filterService.name}` : 'Подбор по услуге'}
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
                    const idx = RANGE_ITEMS.findIndex((i) => i.id === (activeRange ?? range))
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
                    const active = activeRange === item.id
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
                        bg={active ? 'brandGreenDark' : 'transparent'}
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
                  Выберите свободное время — туда и переедет запись.
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
                <Stack
                  gap="4"
                  data-testid={range === 'week' ? 'schedule-week' : undefined}
                  flex="1"
                  minH="0"
                  /* Полоса прокрутки одна. День: её держит сама сетка. Неделя:
                     сеток семь, поэтому прокручивается колонка, а сетки внутри
                     рисуются целиком. Раньше прокручивались обе — рядом стояли
                     две полосы, и внешняя не двигала таблицу. */
                  overflowY={range === 'week' ? 'auto' : 'hidden'}
                  display="flex"
                  flexDirection="column"
                >
                  {daySchedules.map((schedule) => (
                    schedule.slots.length === 0 && !schedule.holiday ? null : (
                      <Box
                        key={schedule.date}
                        data-testid={`schedule-day-${schedule.date}`}
                        flex={range === 'week' ? undefined : '1'}
                        minH={range === 'week' ? undefined : '0'}
                        display="flex"
                        flexDirection="column"
                      >
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
                          scroll={range === 'week' ? 'page' : 'self'}
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

            {/* Колонка карточки прокручивается сама: она выше сетки, и без
                собственной прокрутки её низ — «Записать», «Перенести»,
                «Отменить» — просто обрезался краем экрана. */}
            <Box w="320px" flex="none" minH="0" overflowY="auto" data-testid="slot-card-column">
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
                  rescheduleTargetDate={rescheduleTarget?.date ?? null}
                  onClearRescheduleTarget={() => setRescheduleTarget(null)}
                  onFitDurationChange={setFitDurationMin}
                  preferredServiceId={filterServiceId}
                  durationRules={durationRules}
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
          {pickerOpen || filterServiceId ? (
            <Box order={1}>
              <ServicePicker
                services={services}
                selectedId={filterServiceId}
                onSelect={(id) => {
                  handleServiceFilter(id)
                  if (id === null) setPickerOpen(false)
                }}
                onClose={() => {
                  handleServiceFilter(null)
                  setPickerOpen(false)
                }}
              />
            </Box>
          ) : null}
        </Flex>
      ) : null}
    </Flex>
  )
}
