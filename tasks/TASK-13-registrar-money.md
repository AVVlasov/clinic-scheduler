# TASK-13 — АРМ регистратора: суммы из данных, а не из константы

Находка приёмки (критик «склейка», высокая): касса смены показана константой
`284 700 ₽`, а подготовленный `totals` не используется — [registrar-page.tsx:10],
[registrar-page.tsx:72]. Экран выглядит рабочим и врёт про деньги: это худший вид
зелёного гейта.

## Файлы

- `src/pages/registrar/registrar-page.tsx`
- `src/pages/registrar/visit-card.tsx`
- `src/pages/registrar/queue-table.tsx`
- `src/pages/registrar/registrar-page.test.tsx`

## Вход

TASK-10

## Готовность

1. Касса за смену, счётчики очереди и сумма к оплате в карточке визита считаются по
   данным API; констант с деньгами в компонентах нет.
2. Стоимость услуг берётся из справочника (TASK-10) — тем же источником, что у АРМ врача.
3. Тест доказывает: изменение набора записей в ответе API меняет кассу смены и сумму
   визита; тест падает, если вернуть константу.

## Проверки

```
npx --no-install tsc --noEmit
npx --no-install eslint ./src --max-warnings=0
npx --no-install vitest run src/pages/registrar
```
