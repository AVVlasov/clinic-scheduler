// Падение одного компонента не гасит рабочее место целиком.
//
// ЗАЧЕМ. Клик по ячейке «Блокировка» читал поле у несуществующей записи —
// React размонтировал дерево, и АРМ оператора превращался в белую страницу.
// Уйти с неё нельзя было даже в другое рабочее место: шапка с переключателем
// размонтировалась вместе с содержимым. На показе заказчику это конец эпизода.

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Provider } from '../theme'
import { ArmErrorBoundary } from './arm-error-boundary'

const Explodes = ({ boom }: { boom: boolean }) => {
  if (boom) throw new TypeError("Cannot read properties of undefined (reading 'confirmed')")
  return <div data-testid="работает">Экран работает</div>
}

describe('ArmErrorBoundary — рабочее место переживает ошибку компонента', () => {
  beforeEach(() => {
    // Ошибка обязана попасть в журнал целиком: экран показывает фразу,
    // разбираться разработчик идёт в консоль.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('вместо белого экрана — объяснение по-русски и способ вернуться', () => {
    render(
      <Provider>
        <ArmErrorBoundary armLabel="АРМ оператора">
          <Explodes boom />
        </ArmErrorBoundary>
      </Provider>,
    )

    const block = screen.getByTestId('arm-error')
    expect(block).toHaveTextContent('АРМ оператора не открылся')
    expect(block).toHaveTextContent('Данные не потеряны')
    expect(block.textContent ?? '', 'машинный текст ошибки на экране').not.toMatch(/[A-Za-z]{4,}/)
    expect(screen.getByTestId('arm-error-retry')).toBeInTheDocument()
  })

  it('ошибка уходит в журнал, а не проглатывается', () => {
    render(
      <Provider>
        <ArmErrorBoundary armLabel="АРМ врача">
          <Explodes boom />
        </ArmErrorBoundary>
      </Provider>,
    )
    const logged = vi.mocked(console.error).mock.calls
      .some((call) => call.some((arg) => String(arg).includes('Ошибка рабочего места')))
    expect(logged, 'ошибка не записана в журнал').toBe(true)
  })

  it('«Вернуться к работе» снова монтирует экран, когда причина устранена', () => {
    // Тот же экземпляр границы: сначала ребёнок падает, потом перестаёт —
    // ровно так это и выглядит у оператора, который выбрал другую ячейку.
    let broken = true
    const Child = () => <Explodes boom={broken} />

    render(
      <Provider>
        <ArmErrorBoundary armLabel="АРМ оператора">
          <Child />
        </ArmErrorBoundary>
      </Provider>,
    )
    expect(screen.getByTestId('arm-error')).toBeInTheDocument()
    expect(screen.queryByTestId('работает')).toBeNull()

    broken = false
    fireEvent.click(screen.getByTestId('arm-error-retry'))
    expect(screen.getByTestId('работает')).toBeInTheDocument()
    expect(screen.queryByTestId('arm-error')).toBeNull()
  })

  it('исправный экран граница не трогает', () => {
    render(
      <Provider>
        <ArmErrorBoundary armLabel="АРМ регистратора">
          <Explodes boom={false} />
        </ArmErrorBoundary>
      </Provider>,
    )
    expect(screen.getByTestId('работает')).toBeInTheDocument()
    expect(screen.queryByTestId('arm-error')).toBeNull()
  })
})
