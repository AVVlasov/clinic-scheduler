import React, { useMemo, useState } from 'react'
import { Box, Button, Flex, Stack, Text } from '@chakra-ui/react'

import { ApiError, createAppointment, createPatient, getSchedule } from '../../__data__/api'
import { fieldStyle } from '../field-style'
import type {
  CreatePatientInput,
  Doctor,
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
  label, required = false, children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) => (
  <Stack gap="4px" minW="0">
    <Text fontSize="11px" color="textSecondary">
      {label}
      {required ? <Text as="span" color="danger"> *</Text> : null}
    </Text>
    {children}
  </Stack>
)

interface PatientCardFormProps {
  doctors: Doctor[]
  services: Service[]
  selectedDate: string
  onCreated: (patient: Patient) => void
  onOpenExisting: (patient: Patient) => void
  onCancel: () => void
}

export const PatientCardForm = ({
  doctors,
  services,
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
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [duplicate, setDuplicate] = useState<Patient | null>(null)
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<Patient | null>(null)
  const [bookDoctorId, setBookDoctorId] = useState<string>('')
  const [bookServiceId, setBookServiceId] = useState<string>('')
  const [bookTime, setBookTime] = useState<string>('')
  const [freeTimes, setFreeTimes] = useState<string[]>([])
  const [bookBusy, setBookBusy] = useState(false)
  const [bookDoneId, setBookDoneId] = useState<string | null>(null)

  const missingRequired = useMemo(() => {
    const miss: string[] = []
    if (!lastName.trim()) miss.push('фамилия')
    if (!firstName.trim()) miss.push('имя')
    if (!middleName.trim()) miss.push('отчество')
    if (!birthDate.trim()) miss.push('дата рождения')
    if (!phone.trim()) miss.push('телефон')
    return miss
  }, [lastName, firstName, middleName, birthDate, phone])

  const toggleConsent = (label: string) => {
    setConsents((prev) => (prev.includes(label) ? prev.filter((c) => c !== label) : [...prev, label]))
  }

  const submit = async () => {
    setError(null)
    setDuplicate(null)
    if (missingRequired.length > 0) {
      setFieldErrors(missingRequired)
      setError(`Заполните обязательные поля: ${missingRequired.join(', ')}`)
      return
    }
    setFieldErrors([])
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
        if (free.length > 0) {
          setBookDoctorId(free[0].doctorId)
          setBookTime(free[0].time)
          setFreeTimes(
            schedule.slots
              .filter((s) => s.doctors.some((d) => d.id === free[0].doctorId && !d.busy))
              .map((s) => s.time),
          )
        } else {
          setBookDoctorId(doctors[0]?.id ?? '')
          setBookServiceId(services[0]?.id ?? '')
          if (doctors[0]?.id) await loadFreeTimes(doctors[0].id)
        }
        const docId = free[0]?.doctorId ?? doctors[0]?.id
        const offered = services.filter((s) => !s.doctorIds?.length || s.doctorIds.includes(docId ?? ''))
        setBookServiceId(offered[0]?.id ?? services[0]?.id ?? '')
        // Если слотов так и нет — ещё раз подтянуть (гонка с setState).
        if (free.length > 0) {
          await loadFreeTimes(free[0].doctorId)
        }
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

  const loadFreeTimes = async (doctorId: string) => {
    if (!doctorId) {
      setFreeTimes([])
      setBookTime('')
      return
    }
    try {
      const schedule = await getSchedule(selectedDate)
      const times = schedule.slots
        .filter((slot) => slot.doctors.some((d) => d.id === doctorId && !d.busy))
        .map((slot) => slot.time)
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
    setBookBusy(true)
    setError(null)
    try {
      const appt = await createAppointment({
        doctorId: bookDoctorId,
        patientId: created.id,
        start: `${selectedDate}T${bookTime}:00+03:00`,
        durationMin: svc?.duration ?? 30,
        serviceId: bookServiceId,
      })
      setBookDoneId(appt.id)
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
            <FormField label="Фамилия" required>
              <input data-testid="patient-last-name" aria-label="Фамилия" style={formFieldStyle} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </FormField>
            <FormField label="Имя" required>
              <input data-testid="patient-first-name" aria-label="Имя" style={formFieldStyle} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </FormField>
            <FormField label="Отчество" required>
              <input data-testid="patient-middle-name" aria-label="Отчество" style={formFieldStyle} value={middleName} onChange={(e) => setMiddleName(e.target.value)} />
            </FormField>

            <FormField label="Дата рождения" required>
              <input data-testid="patient-birth-date" aria-label="Дата рождения" type="date" style={formFieldStyle} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </FormField>
            <FormField label="Телефон" required>
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
              _hover={{ bg: 'brandGreenDark' }}
              onClick={() => { void submit() }}
              disabled={busy}
              data-testid="patient-create-submit"
            >
              {busy ? 'Сохранение…' : 'Завести карту'}
            </Button>
            {fieldErrors.length > 0 ? (
              <Text mt="3" fontSize="12px" color="danger" data-testid="patient-required-hint">
                Не заполнено: {fieldErrors.join(', ')}
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
                onChange={(e) => setBookServiceId(e.target.value)}
              >
                {services.map((s) => (
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
              _hover={{ bg: 'brandGreenDark' }}
              disabled={bookBusy || !bookTime}
              onClick={() => { void bookNow() }}
              data-testid="patient-book-submit"
            >
              {bookBusy ? 'Запись…' : 'Записать'}
            </Button>
          </Flex>
          {bookDoneId ? (
            <Text fontSize="12px" color="brandGreen700" data-testid="patient-book-done">
              Запись создана: {bookDoneId}
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
