/**
 * Человеческие формулировки отказов сервера.
 *
 * ЗАЧЕМ. Сервер собирает сообщение для разработчика: «Слот
 * 2026-08-11T13:00:00+03:00 у врача d-003 уже занят (запись a-013)», «Запись a-013
 * в статусе „no_show“ неизменяема». Клиент печатал это дословно, потому что
 * подставлял свои заготовки только когда сервер молчал. На экране регистратуры
 * такие строки читаются как поломка, а CLAUDE.md требует русского языка в
 * сообщениях об ошибках — не «текста на кириллице», а речи сотрудника.
 *
 * Правило: текст выбирается по КОДУ ошибки. Серверное сообщение остаётся в
 * `ApiError.payload` — для журнала, не для экрана.
 */
export const ERROR_MESSAGE_BY_CODE: Readonly<Record<string, string>> = {
  // Расписание и запись
  slot_taken: 'Это время уже занято — выберите другое',
  outside_shift: 'Врач в это время не принимает',
  service_not_offered: 'Врач не оказывает эту услугу',
  equipment_busy: 'Аппарат в это время занят другим приёмом',
  invalid_duration: 'Такая длительность приёма не подходит',
  missing_date: 'Укажите дату',
  invalid_date: 'Дата указана неверно',
  invalid_field: 'Поле заполнено неверно',
  invalid_status: 'Такого статуса записи не бывает',
  invalid_state_transition: 'Из текущего состояния так перейти нельзя',
  terminal_status: 'Запись уже закрыта — изменить её нельзя',
  invalid_payment_type: 'Такой способ оплаты не поддерживается',
  invalid_amount: 'Сумма указана неверно',
  already_paid: 'Приём уже оплачен',
  missing_cancel_reason: 'Укажите причину отмены',
  invalid_reason: 'Причина указана неверно',
  nothing_to_cancel: 'Отменять нечего: записей за этот период нет',
  foreign_doctor: 'Запись принадлежит другому врачу',

  // Справочники
  doctor_not_found: 'Врач не найден',
  patient_not_found: 'Пациент не найден',
  service_not_found: 'Услуга не найдена',
  appointment_not_found: 'Запись не найдена',
  item_not_found: 'Строка не найдена',
  item_not_pending: 'Эта строка уже обработана',
  already_handled: 'Строка уже обработана',
  not_found: 'Не найдено',
  duplicate_patient: 'Такой пациент уже есть в картотеке',

  // Неделя и шаблоны
  empty_week: 'В шаблонах недели нет рабочих интервалов — публиковать нечего',
  week_already_published: 'Неделя уже опубликована',
  week_not_published: 'Неделя не опубликована',
  week_has_appointments: 'На этой неделе есть записи',
  interval_has_appointments: 'На это время уже записаны пациенты',
  invalid_week_start: 'Начало недели указано неверно',
  invalid_interval_patch: 'Не хватает данных для изменения графика',
  date_outside_week: 'Дата не относится к этой неделе',

  // Лист ожидания
  invalid_kind: 'Такого типа заявки не бывает',
  invalid_priority: 'Такого приоритета не бывает',
  invalid_range: 'Проверьте период: начало позже конца',
  patient_mismatch: 'Запись оформлена на другого пациента',
  not_open: 'Заявка уже закрыта',

  // Общее
  validation: 'Проверьте заполнение полей',
  network_error: 'Нет связи с сервером — повторите попытку',
  invalid_response: 'Сервер ответил непонятно — повторите попытку',
  request_failed: 'Не удалось выполнить запрос',
}

/** Формулировка по коду; если код незнаком — по статусу ответа. */
export const messageForError = (code: string, status: number): string => {
  const known = ERROR_MESSAGE_BY_CODE[code]
  if (known) return known
  if (status === 400) return 'Проверьте заполнение полей'
  if (status === 404) return 'Не найдено'
  if (status === 409) return 'Действие сейчас невозможно'
  if (status >= 500) return 'Сервер не отвечает — повторите попытку'
  return 'Не удалось выполнить запрос'
}

/**
 * Годится ли сообщение сервера для показа сотруднику.
 *
 * Часть отказов сервер объясняет по-человечески и точнее нас — «Основная
 * площадка не может быть пустой» полезнее общего «Проверьте заполнение полей».
 * А часть собрана для разработчика: «Слот 2026-08-11T13:00:00+03:00 у врача
 * d-003 уже занят (запись a-013)». Разделяем их по признакам машинного текста,
 * а не по коду: латиница, внутренние идентификаторы, ISO-даты и смещения зон.
 */
export const isHumanReadable = (text: string | undefined): text is string => {
  if (!text) return false
  const trimmed = text.trim()
  if (trimmed.length === 0) return false
  if (!/[а-яё]/i.test(trimmed)) return false
  if (/[A-Za-z]/.test(trimmed)) return false
  if (/\b[a-z]-\d{2,}\b/i.test(trimmed)) return false
  if (/\d{4}-\d{2}-\d{2}/.test(trimmed)) return false
  if (/[+-]\d{2}:\d{2}/.test(trimmed)) return false
  return true
}
