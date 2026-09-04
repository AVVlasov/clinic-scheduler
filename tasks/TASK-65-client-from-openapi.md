# TASK-65 — клиент API генерируется из контракта, ручной fetch запрещён линтом

Фронтенд переезжает со стабов на боевой бэкенд. Единственный способ не разойтись
с сервером — клиент, сгенерированный из файла OpenAPI, и запрет на самодельные запросы.
Стабы остаются для локальной разработки и сквозных сценариев, но отвечают по тому же
контракту.

Контракт: `schedule-v0.yaml` из репозитория ядра (задача TASK-04 там). До его появления
задача работает на копии контракта в `openapi/schedule-v0.yaml` этого репозитория.

## Файлы

- `openapi/schedule-v0.yaml`
- `src/__data__/api-client/**` (генерируется, в git попадает)
- `src/__data__/api.ts` (переводится на сгенерированный клиент)
- `eslint.config.mjs` (правило запрета `fetch` вне `api-client`)
- `package.json` (скрипт `api:generate`; генератор только в devDependencies)
- `stubs/api/*.js` (пути и коды ответов по контракту v0)

## Вход

- TASK-64.

## Готовность

1. **Клиент воспроизводим.** `npm run api:generate` на чистом дереве не даёт изменений
   в `src/__data__/api-client/` (проверяется `git status --short` после генерации).
2. **Ручной fetch невозможен.** Файл с `fetch(` вне `src/__data__/api-client/` роняет
   `eslint --max-warnings=0`; негативный тест кладёт такой файл во временный каталог
   и ожидает красный линт.
3. **Сквозные пути живы на контракте.** Все 14 сценариев `src/journeys` зелёные, стабы
   отвечают по путям и кодам v0, `vi.mock` клиента в сценариях по-прежнему запрещён.

## Проверки

```
npm run api:generate && git status --short src/__data__/api-client
npx --no-install eslint ./src --max-warnings=0
npx --no-install vitest run src/journeys --reporter=basic
npx --no-install tsc --noEmit
```
