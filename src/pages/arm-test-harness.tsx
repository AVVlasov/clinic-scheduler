import React from 'react'
import { MemoryRouter, useSearchParams } from 'react-router-dom'

/**
 * Обвязка для тестов отдельных экранов рабочего места.
 *
 * Раздел АРМ живёт в адресе (`?section=`) — так его открывает шапка и так его
 * можно дать ссылкой. Тест страницы шапку не рендерит, поэтому переключается
 * тем же способом: правит адрес. Кнопки здесь — инструмент теста, а не элемент
 * продукта; настоящую навигацию проверяют app-shell.test.tsx и сценарии.
 */

interface SectionNavProps {
  sections: string[]
}

export const SectionNav = ({ sections }: SectionNavProps) => {
  const [, setSearchParams] = useSearchParams()
  return (
    <>
      {sections.map((id) => (
        <button
          key={id}
          type="button"
          data-testid={`section-${id}`}
          onClick={() => {
            setSearchParams((prev) => {
              const next = new URLSearchParams(prev)
              next.set('section', id)
              return next
            })
          }}
        >
          {id}
        </button>
      ))}
    </>
  )
}

interface ArmRouterProps {
  children: React.ReactNode
  path?: string
  section?: string
}

export const ArmRouter = ({ children, path = '/clinic-scheduler/admin', section }: ArmRouterProps) => (
  <MemoryRouter initialEntries={[section ? `${path}?section=${section}` : path]}>
    {children}
  </MemoryRouter>
)
