// Живой стаб-сервер для сквозных сценариев.
//
// ЗАЧЕМ ОТДЕЛЬНАЯ ОБВЯЗКА. Все тесты экранов в src/pages/** начинаются со строки
// `vi.mock('../../__data__/api')` — и это правильно для юнит-теста экрана: он про экран,
// а не про сеть. Но из этого следует, что контракт «экран ↔ сервер» не проверяется
// НИЧЕМ. Ровно там и оказались все дефекты, которые видел заказчик: сервер научился
// выборке по дате, клиент дату не передаёт; сервер отдаёт пустую сетку, экран говорит
// «выходной» и одновременно показывает «8 записей в смене».
//
// Сценарный тест поднимает НАСТОЯЩИЙ express-роутер стабов на свободном порту и не
// мокает `__data__/api` вообще. Мокается ровно одно — адрес API в конфиге brojs: в jsdom
// относительный `/api` некуда разрешать. Всё остальное — живое: fetch, JSON, коды ошибок,
// состояние сервера между запросами.

import http from 'node:http'
import type { AddressInfo } from 'node:net'

import express from 'express'

export interface JourneyServer {
  url: string
  close: () => Promise<void>
}

const CONFIG_KEY = 'clinic-scheduler.api'

/**
 * Поднимает стабы на свободном порту и переключает на них конфиг brojs.
 *
 * Состояние записей у стабов живёт в памяти модуля и переживает вызовы внутри одного
 * файла тестов: сценарий обязан считать эффект от СВОЕГО действия (было N — стало N+1),
 * а не полагаться на абсолютные числа. Изоляция между файлами обеспечивается тем, что
 * vitest грузит их в разных воркерах.
 */
export const startJourneyServer = async (): Promise<JourneyServer> => {
  const app = express()
  app.use(express.json())

  const mod = (await import('../../stubs/api/index.js')) as unknown as {
    default?: express.Router
  }
  const apiRouter = (mod.default ?? mod) as express.Router
  app.use('/api', apiRouter)

  const server = http.createServer(app)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const { port } = server.address() as AddressInfo
  const url = `http://127.0.0.1:${port}/api`

  const win = globalThis as unknown as {
    window?: { __BROJS_CONFIG__?: { config?: Record<string, string> } }
  }
  const cfg = win.window?.__BROJS_CONFIG__
  if (cfg?.config) {
    cfg.config[CONFIG_KEY] = url
  }

  return {
    url,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve())
      }),
  }
}

/** Прямой запрос к тем же стабам — чтобы проверять эффект на сервере, а не только на экране. */
export const apiGet = async <T>(server: JourneyServer, path: string): Promise<T> => {
  const res = await fetch(`${server.url}${path}`)
  return (await res.json()) as T
}

export const apiPatch = async <T>(
  server: JourneyServer,
  path: string,
  body: unknown,
): Promise<{ status: number; body: T }> => {
  const res = await fetch(`${server.url}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as T
  return { status: res.status, body: json }
}

export const apiPost = async <T>(
  server: JourneyServer,
  path: string,
  body: unknown,
): Promise<{ status: number; body: T }> => {
  const res = await fetch(`${server.url}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as T
  return { status: res.status, body: json }
}
