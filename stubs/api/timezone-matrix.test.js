'use strict';

/**
 * TASK-47 п.2: ключевые проверки стаба прогоняются под тремя часовыми поясами и дают
 * ОДИН И ТОТ ЖЕ результат.
 *
 * Один процесс vitest живёт в одной зоне, поэтому проверка запускает stubs/api/tz-invariants.js
 * отдельным процессом на зону и сверяет отпечатки. До этого зона проверялась только тем,
 * что человек вручную выставит TZ перед прогоном: в обычном `npm test` два из трёх поясов
 * не проверялись вовсе.
 */

const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ZONES = ['Europe/Moscow', 'Asia/Vladivostok', 'America/New_York'];

const INVARIANTS = path.join(__dirname, 'tz-invariants.js');

const runUnderZone = (tz) => {
  const res = spawnSync(process.execPath, [INVARIANTS], {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, TZ: tz },
    encoding: 'utf8',
    timeout: 120000,
  });
  return res;
};

describe('TASK-47 — инварианты стаба одинаковы в любом часовом поясе', () => {
  const fingerprints = new Map();

  for (const tz of ZONES) {
    test(`TZ=${tz}: инварианты выполняются`, () => {
      const res = runUnderZone(tz);
      expect(
        res.status,
        `процесс под TZ=${tz} завершился с кодом ${res.status}\n${res.stderr || ''}`,
      ).toBe(0);
      expect(res.stdout, `под TZ=${tz} нет отпечатка`).toBeTruthy();
      fingerprints.set(tz, JSON.parse(res.stdout));
    });
  }

  test('отпечатки трёх зон совпадают между собой', () => {
    expect(fingerprints.size, 'не все зоны отработали').toBe(ZONES.length);
    const [base, ...rest] = ZONES.map((tz) => fingerprints.get(tz));
    for (let i = 0; i < rest.length; i += 1) {
      expect(rest[i], `${ZONES[i + 1]} расходится с ${ZONES[0]}`).toEqual(base);
    }
    // Отпечаток должен быть содержательным, иначе «совпали» ничего не значит.
    expect(Object.keys(base).length).toBeGreaterThanOrEqual(8);
    expect(base.storedStart).toBe('2030-06-04T10:00:00+03:00');
  });
});
