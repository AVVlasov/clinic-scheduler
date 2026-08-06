# TASK-01 — зелёные гейты: типчек, линт, тестовый контур

Сейчас ни одна из трёх обязательных проверок не проходит на чистом репозитории:
`tsc --noEmit` падает на разрешении типов Chakra (`moduleResolution`) и на повторном
объявлении `__webpack_public_path__`, `eslint --max-warnings=0` спотыкается о неиспользуемую
директиву, а тестового раннера нет вовсе. Пока это так, гейт «фича доказана тестами» не
держится ни на чём, а красная быстрая проверка после каждой итерации заставляет агента
чинить несуществующее.

## Файлы

- `tsconfig.json`
- `types.d.ts`
- `package.json`
- `vitest.config.ts`
- `src/index.tsx`
- `src/setupTests.ts`
- `src/smoke.test.tsx`

## Вход

—

## Готовность

1. `npx --no-install tsc --noEmit` завершается кодом 0.
2. `npx --no-install eslint ./src --max-warnings=0` завершается кодом 0.
3. `npm test` запускает vitest в jsdom и проходит минимум один осмысленный тест
   (рендер `<App/>` или корневого компонента), а не `expect(true).toBe(true)`.

## Проверки

```
npx --no-install tsc --noEmit
npx --no-install eslint ./src --max-warnings=0
npm test
```

## Что учесть

- `moduleResolution` привести к `bundler` (сборка идёт вебпаком через `@brojs/cli`).
- Дубль `__webpack_public_path__` объявлен и в `types.d.ts`, и в `@types/webpack-env` —
  оставить один источник.
- vitest настроить на окружение `jsdom`, включить в область и `src`, и `stubs`:
  тесты стабов будут лежать рядом со стабами.
- В devDependencies добавить только то, без чего тесты не поедут: `vitest`, `jsdom`,
  `@testing-library/react`, `@testing-library/jest-dom`, `supertest`.
- Скрипт `test` в `package.json` обязан запускать vitest в неинтерактивном режиме (`run`),
  иначе прогон зависнет в watch-режиме и будет снят по тишине.
