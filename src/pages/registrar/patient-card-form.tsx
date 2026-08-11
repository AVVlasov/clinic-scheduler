import React, { useMemo, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import { ApiError, createAppointment, createPatient, getSchedule } from '../../__data__/api'
import { defaultVisitTypeForService, resolveBookingDuration } from '../../__data__/booking'
import { fieldStyle } from '../field-style'
import type {
  CreatePatientInput,
  Doctor,
  DurationRule,
  Schedule,
  Patient,
  PatientDocumentType,
  Service,
} from '../../__data__/types'

const CONSENT_OPTIONS = [
  'Обработка персональных данных',
  'Информирование по СМС и push',
  'Передача данных страховой компании',
] as const

const DOCUMENT_OPTIONS: Array<{ id: PatientDocumentType; label: string }> = [
  { id: 'passport_rf', label: 'Паспорт РФ' },
  { id: 'birth_cert', label: 'Свидетельство о рождении' },
  { id: 'foreign', label: 'Иностранный документ' },
]

/** ГГГГ-ММ-ДД → ДД.ММ.ГГГГ. */
const formatBirthDate = (iso: string): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  const [y, m, d] = iso.split('-')
  return `${d}.${m}.${y}`
}

/** Поле формы: одна ячейка сетки, ширина от колонки, а не от содержимого. */
const formFieldStyle: React.CSSProperties = { ...fieldStyle, maxWidth: '100%' }

const FormField = ({
  label, required = false, error, errorTestId, children,
}: {
  label: string
  required?: boolean
  /** Сообщение стоит под своим полем: «что-то не так в форме» не говорит, где именно. */
  error?: string
  errorTestId?: string
  children: React.ReactNode
}) => (
  <Stack gap="4px" minW="0">
    <Text fontSize="11px" color="textSecondary">
      {label}
      {required ? <Text as="span" color="danger"> *</Text> : null}
    </Text>
    {children}
    {error ? (
      <Text fontSize="11px" color="danger" data-testid={errorTestId}>{error}</Text>
    ) : null}
  </Stack>
)

type PatientFieldKey = 'lastName' | 'firstName' | 'birthDate' | 'phone'

const PHONE_HINT = 'Телефон из 11 цифр, например +7 900 000-00-00'

/**
 * Телефон и дата рождения проверяются на стойке, а не в МИС: «123» и 2099 год
 * уезжали в картотеку молча, и пациента потом не найти и не дозвониться.
 * «Сегодня» берётся из даты смены, а не из системных часов.
 */
export const validatePatientFields = (
  values: { lastName: string; firstName: string; birthDate: string; phone: string },
  today: string,
): Partial<Record<PatientFieldKey, string>> => {
  const errors: Partial<Record<PatientFieldKey, string>> = {}
  if (!values.lastName.trim()) errors.lastName = 'Укажите фамилию'
  if (!values.firstName.trim()) errors.firstName = 'Укажите имя'

  const birthDate = values.birthDate.trim()
  if (!birthDate) {
    errors.birthDate = 'Укажите дату рождения'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    errors.birthDate = 'Дата рождения в формате ДД.ММ.ГГГГ'
  } else if (birthDate > today) {
    errors.birthDate = 'Дата рождения не может быть в будущем'
  } else if (Number(birthDate.slice(0, 4)) < 1900) {
    errors.birthDate = 'Проверьте год рождения'
  }

  const digits = values.phone.replace(/\D/g, '')
  if (!values.phone.trim()) {
    errors.phone = 'Укажите телефон'
  } else if (!/^[78]\d{10}$/.test(digits)) {
    errors.phone = PHONE_HINT
  }
  return errors
}

interface PatientCardFormProps {
  doctors: Doctor[]
  services: Service[]
  durationRules?: DurationRule[]
  selectedDate: string
  onCreated: (patient: Patient) => void
  onOpenExisting: (patient: Patient) => void
  onCancel: () => void
}

export const PatientCardForm = ({
  doctors,
  services,
  durationRules = [],
  selectedDate,
  onCreated,
  onOpenExisting,
  onCancel,
}: PatientCardFormProps) => {
  const [lastName, setLastName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [middleName, setMiddleName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [documentType, setDocumentType] = useState<PatientDocumentType | ''>('')
  const [documentNumber, setDocumentNumber] = useState('')
  const [consents, setConsents] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<PatientFieldKey, string>>>({})
  const [duplicate, setDuplicate] = useState<Patient | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Patient | null>(null)
  const [bookDoctorId, setBookDoctorId] = useState<string>('')
  const [bookServiceId, setBookServiceId] = useState<string>('')
  const [bookTime, setBookTime] = useState<string>('')
  const [freeTimes, setFreeTimes] = useState<string[]>([])
  /** Услуги врача по допуску: список без фильтра предлагал ЭКГ у терапевта. */
  const offeredServices = useMemo(
    () => services.filter((s) => !s.doctorIds?.length || s.doctorIds.includes(bookDoctorId)),
    [services, bookDoctorId],
  )
  const [bookBusy, setBookBusy] = useState(false)
  /** Подтверждение записи — человеческими словами: идентификатор «a-023» пациенту ничего не говорит. */
  const [bookDone, setBookDone] = useState<{ time: string; doctorName: string } | null>(null)

  /**
   * Отчество не обязательно: у иностранных пациентов его нет, а форма сама
   * предлагает тип документа «Иностранный документ». В макете звёздочки у
   * отчества тоже нет.
   */
  const validationErrors = useMemo(
    () => validatePatientFields({ lastName, firstName, birthDate, phone }, selectedDate),
    [lastName, firstName, birthDate, phone, selectedDate],
  )

  const toggleConsent = (label: string) => {
    setConsents((prev) => (prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]))
  }

  const submit = async () => {
    setError(null)
    setDuplicate(null)
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setError('Проверьте поля карты: отмеченные красным заполнены неверно')
      return
    }
    setFieldErrors({})
    setBusy(true)
    const input: CreatePatientInput = {
      lastName: lastName.trim(),
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      birthDate: birthDate.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      documentType: documentType || null,
      documentNumber: documentNumber.trim() || undefined,
      consents,
    }
    try {
      const patient = await createPatient(input)
      setCreated(patient)
      onCreated(patient)
      try {
        const schedule = await getSchedule(selectedDate)
        const free: Array<{ doctorId: string; time: string }> = []
        for (const slot of schedule.slots) {
          for (const d of slot.doctors) {
            if (!d.busy) free.push({ doctorId: d.id, time: slot.time })
          }
        }
        /**
         * Предлагаем сочетание, которое реально существует: врач, его услуга и
         * окно, куда эта услуга помещается. Раньше подставлялись первый врач и
         * первая услуга по списку — и регистратор получал пустой список времени
         * либо отказ сервера при попытке записать.
         */
        const candidates = doctors.filter((d) => free.some((f) => f.doctorId === d.id))
        const pool = candidates.length > 0 ? candidates : doctors
        let picked: { doctorId: string; serviceId: string; times: string[] } | null = null
        for (const doc of pool) {
          const offered = services.filter((sv) => !sv.doctorIds?.length || sv.doctorIds.includes(doc.id))
          for (const service of offered) {
            const times = freeTimesFor(schedule, doc.id, service.id)
            if (times.length > 0) {
              picked = { doctorId: doc.id, serviceId: service.id, times }
              break
            }
          }
          if (picked) break
        }
        const docId = picked?.doctorId ?? pool[0]?.id ?? ''
        // Услуги — только те, к которым у врача есть допуск: иначе регистратор
        // выбирает ЭКГ у терапевта и читает отказ сервера вместо подсказки.
        const offeredForDoc = services.filter((sv) => !sv.doctorIds?.length || sv.doctorIds.includes(docId))
        setBookDoctorId(docId)
        setBookServiceId(picked?.serviceId ?? offeredForDoc[0]?.id ?? '')
        setFreeTimes(picked?.times ?? [])
        setBookTime(picked?.times[0] ?? '')
      } catch {
        setBookDoctorId(doctors[0]?.id ?? '')
        setBookServiceId(services[0]?.id ?? '')
      }
    } catch (err) {
      if (err instanceof ApiError && err.code === 'duplicate_patient') {
        const payload = err.payload as { patient?: Patient } | undefined
        if (payload?.patient) {
          setDuplicate(payload.patient)
          setError(err.message)
          return
        }
      }
      setError(err instanceof Error ? err.message : 'Не удалось завести карту')
    } finally {
      setBusy(false)
    }
  }

  /**
   * Свободные окна считаются под длительность выбранной услуги, а не по одной
   * ячейке сетки. Иначе регистратор выбирает время, жмёт «Записать» и получает
   * отказ: приём на 60 минут в свободные пятнадцать не помещается.
   */
  const freeTimesFor = (schedule: Schedule, doctorId: string, serviceId: string): string[] => {
    const service = services.find((s) => s.id === serviceId)
    const minutes = service
      ? resolveBookingDuration(service, defaultVisitTypeForService(service), { rules: durationRules })
      : 15
    const steps = Math.max(1, Math.ceil(minutes / schedule.stepMinutes))
    const out: string[] = []
    for (let i = 0; i + steps <= schedule.slots.length; i += 1) {
      const fits = schedule.slots.slice(i, i + steps).every((slot) => {
        const cell = slot.doctors.find((d) => d.id === doctorId)
        return cell != null && !cell.busy
      })
      if (fits) out.push(schedule.slots[i].time)
    }
    return out
  }

  const loadFreeTimes = async (doctorId: string, serviceId = bookServiceId) => {
    if (!doctorId) {
      setFreeTimes([])
      setBookTime('')
      return
    }
    try {
      const schedule = await getSchedule(selectedDate)
      const times = freeTimesFor(schedule, doctorId, serviceId)
      setFreeTimes(times)
      setBookTime((prev) => (prev && times.includes(prev) ? prev : (times[0] ?? '')))
    } catch {
      setFreeTimes([])
      setBookTime('')
    }
  }

  const onDoctorChange = (doctorId: string) => {
    setBookDoctorId(doctorId)
    void loadFreeTimes(doctorId)
  }

  const bookNow = async () => {
    if (!created || !bookDoctorId || !bookServiceId || !bookTime) {
      setError('Выберите врача, услугу и время для записи')
      return
    }
    const svc = services.find((s) => s.id === bookServiceId)
    const doc = doctors.find((d) => d.id === bookDoctorId)
    setBookBusy(true)
    setError(null)
    try {
      await createAppointment({
        doctorId: bookDoctorId,
        patientId: created.id,
        start: `${selectedDate}T${bookTime}:00+03:00`,
        // Расчёт общий с карточкой оператора: правила администратора действуют
        // на всех путях записи, а не только там, где о них вспомнили.
        durationMin: svc
          ? resolveBookingDuration(svc, defaultVisitTypeForService(svc), { rules: durationRules })
          : 30,
        serviceId: bookServiceId,
      })
      setBookDone({ time: bookTime, doctorName: doc?.name ?? '' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось записать пациента')
    } finally {
      setBookBusy(false)
    }
  }

  return (
    <Stack
      gap="3"
      data-testid="patient-card-form"
      data-arm-section="new-patient"
      bg="white"
      borderWidth="1px"
      borderColor="borderLight"
      borderRadius="compact"
      p="4"
      overflowY="auto"
      flex="1"
      minH="0"
    >
      <Flex align="center" gap="2">
        <Text fontSize="18px" fontWeight="700">Новая карта пациента</Text>
        <Text fontSize="12px" color="textSecondary">Заводится на стойке, уходит в картотеку МИС</Text>
        <Box flex="1" />
        <Button size="sm" variant="outline" onClick={onCancel} data-testid="patient-card-cancel">
          К очереди
        </Button>
      </Flex>

      {duplicate ? (
        <Box
          bg="brandOrange"
          color="textPrimary"
          borderRadius="compact"
          px="3"
          py="2"
          data-testid="patient-duplicate-notice"
        >
          <Text fontSize="13px" fontWeight="700">Похожая карта уже есть</Text>
          <Text fontSize="12px">
            {duplicate.name}, {formatBirthDate(duplicate.birthDate)}, {duplicate.phone}
          </Text>
          <Button
            mt="2"
            size="sm"
            bg="white"
            onClick={() => onOpenExisting(duplicate)}
            data-testid="patient-open-duplicate"
          >
            Открыть найденную карту
          </Button>
        </Box>
      ) : null}

      {created ? (
        <Box bg="brandGreenTint" borderRadius="compact" px="3" py="2" data-testid="patient-card-created">
          <Text fontSize="13px" fontWeight="700" color="brandGreen700">Карта заведена</Text>
          <Text fontSize="12px" color="brandGreen700">
            {created.name}, карта {created.cardNumber}
          </Text>
        </Box>
      ) : (
        /* Форма — сетка в три колонки фиксированной ширины и с ограничением по
           ширине целиком. Прежняя раскладка тянула поля резиновыми `flex="1"`:
           на широком мониторе «Серия и номер» уезжала к правому краю, а поля
           одной строки получали разную ширину — карточка выглядела рассыпанной. */
        <Stack gap="4" maxW="820px">
          <Box
            display="grid"
            gridTemplateColumns="repeat(auto-fit, minmax(220px, 260px))"
            gap="12px"
          >
            <FormField label="Фамилия" required error={fieldErrors.lastName} errorTestId="patient-error-last-name">
              <input data-testid="patient-last-name" aria-label="Фамилия" style={formFieldStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </FormField>
            <FormField label="Имя" required error={fieldErrors.firstName} errorTestId="patient-error-first-name">
              <input data-testid="patient-first-name" aria-label="Имя" style={formFieldStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </FormField>
            <FormField label="Отчество">
              <input data-testid="patient-middle-name" aria-label="Отчество" style={formFieldStyle} value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </FormField>

            <FormField label="Дата рождения" required error={fieldErrors.birthDate} errorTestId="patient-error-birth-date">
              <input data-testid="patient-birth-date" aria-label="Дата рождения" type="date" style={formFieldStyle} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </FormField>
            <FormField label="Телефон" required error={fieldErrors.phone} errorTestId="patient-error-phone">
              <input data-testid="patient-phone" aria-label="Телефон" style={formFieldStyle} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 900 000-00-00" />
            </FormField>
            <FormField label="Электронная почта">
              <input data-testid="patient-email" aria-label="Электронная почта" style={formFieldStyle} value={email} onChange={(e) => setEmail(e.target.value)} />
            </FormField>

            <FormField label="Документ">
              <select
                data-testid="patient-document-type"
                aria-label="Документ"
                style={formFieldStyle}
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as PatientDocumentType | '')}
              >
                <option value="">Не указан</option>
                {DOCUMENT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Серия и номер">
              <input data-testid="patient-document-number" aria-label="Серия и номер документа" style={formFieldStyle} value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </FormField>
          </Box>

          <Stack gap="6px">
            <Text fontSize="11px" color="textSecondary">Согласия пациента</Text>
            {CONSENT_OPTIONS.map((label) => (
              <label key={label} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13 }}>
                <input
                  type="checkbox"
                  data-testid={`patient-consent-${label.slice(0, 12)}`}
                  checked={consents.includes(label)}
                  onChange={() => toggleConsent(label)}
                />
                {label}
              </label>
            ))}
          </Stack>

          <Flex gap="3" align="center" wrap="wrap" pt="2" borderTopWidth="1px" borderColor="borderLight">
            <Button
              mt="3"
              bg="brandGreenDark"
              color="white"
              _hover={{ bg: 'brandGreen700' }}
              onClick={() => { void submit() }}
              disabled={busy}
              data-testid="patient-create-submit"
            >
              {busy ? 'Сохранение…' : 'Завести карту'}
            </Button>
            {Object.keys(fieldErrors).length > 0 ? (
              <Text mt="3" fontSize="12px" color="danger" data-testid="patient-required-hint">
                Проверьте поля, отмеченные красным
              </Text>
            ) : (
              <Text mt="3" fontSize="12px" color="textSecondary">
                Звёздочкой отмечены обязательные поля
              </Text>
            )}
          </Flex>
        </Stack>
      )}

      {created ? (
        <Stack gap="2" data-testid="patient-book-panel" borderTopWidth="1px" borderColor="borderLight" pt="3">
          <Text fontSize="14px" fontWeight="700">Записать сразу на смену</Text>
          <Flex gap="3" wrap="wrap" align="flex-end">
            <Stack gap="1">
              <Text as="span" fontSize="11px" color="textSecondary" id="patient-book-doctor-label">Врач</Text>
              <select
                data-testid="patient-book-doctor"
                aria-labelledby="patient-book-doctor-label"
                style={{ ...fieldStyle, width: 220 }}
                value={bookDoctorId}
                onChange={(e) => onDoctorChange(e.target.value)}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Stack>
            <Stack gap="1">
              <Text as="span" fontSize="11px" color="textSecondary" id="patient-book-service-label">Услуга</Text>
              <select
                data-testid="patient-book-service"
                aria-labelledby="patient-book-service-label"
                style={{ ...fieldStyle, width: 220 }}
                value={bookServiceId}
                onChange={(e) => {
                  setBookServiceId(e.target.value)
                  void loadFreeTimes(bookDoctorId, e.target.value)
                }}
              >
                {offeredServices.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Stack>
            <Stack gap="1">
              <Text as="span" fontSize="11px" color="textSecondary" id="patient-book-time-label">Время</Text>
              <select
                data-testid="patient-book-time"
                aria-labelledby="patient-book-time-label"
                style={{ ...fieldStyle, width: 120 }}
                value={bookTime}
                onChange={(e) => setBookTime(e.target.value)}
              >
                {freeTimes.length === 0 ? <option value="">Нет слотов</option> : null}
                {freeTimes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </Stack>
            <Button
              bg="brandGreenDark"
              color="white"
              _hover={{ bg: 'brandGreen700' }}
              disabled={bookBusy || !bookTime}
              onClick={() => { void bookNow() }}
              data-testid="patient-book-submit"
            >
              {bookBusy ? 'Запись…' : 'Записать'}
            </Button>
          </Flex>
          {bookDone ? (
            <Text fontSize="12px" color="brandGreen700" data-testid="patient-book-done">
              Пациент записан на {bookDone.time}{bookDone.doctorName ? `, ${bookDone.doctorName}` : ''}
            </Text>
          ) : null}
        </Stack>
      ) : null}

      {error ? (
        <Text fontSize="13px" color="danger" data-testid="patient-card-error">{error}</Text>
      ) : null}
    </Stack>
  )
}
