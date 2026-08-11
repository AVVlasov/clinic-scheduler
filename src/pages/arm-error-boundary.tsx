import React from 'react'
import { Box, Button, Stack, Text } from '@chakra-ui/react'

/**
 * Граница ошибки рабочего места.
 *
 * ЗАЧЕМ. Одна ошибка в одном компоненте гасила ВЕСЬ АРМ: клик по ячейке
 * «Блокировка» читал поле у несуществующей записи, React размонтировал дерево —
 * и оператор получал белую страницу без единой надписи. Дальше работать нельзя
 * ничем, кроме F5, а на показе заказчику это конец эпизода.
 *
 * Граница не «прячет баг»: сообщение честно говорит, что сломалось именно это
 * место, оставляет шапку с переключателем рабочих мест и даёт вернуться.
 * Сама ошибка при этом уходит в консоль целиком — разбирать её по-прежнему есть по чему.
 */
interface ArmErrorBoundaryProps {
  children: React.ReactNode
  /** Имя рабочего места для сообщения: «АРМ оператора». */
  armLabel?: string
}

interface ArmErrorBoundaryState {
  error: Error | null
}

export class ArmErrorBoundary extends React.Component<ArmErrorBoundaryProps, ArmErrorBoundaryState> {
  constructor(props: ArmErrorBoundaryProps) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): ArmErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // Экран показывает человеческую фразу, журнал — всё остальное.
    console.error('Ошибка рабочего места:', error, info.componentStack)
  }

  private reset = (): void => {
    this.setState({ error: null })
  }

  render(): React.ReactNode {
    const { error } = this.state
    const { children, armLabel } = this.props
    if (!error) return children

    return (
      <Box p="6" data-testid="arm-error">
        <Stack gap="3" maxW="520px">
          <Text fontSize="18px" fontWeight="700" color="textPrimary">
            {armLabel ? `${armLabel} не открылся` : 'Экран не открылся'}
          </Text>
          <Text fontSize="14px" color="textPrimary" lineHeight="20px">
            Действие не удалось выполнить, и экран пришлось закрыть. Данные не потеряны:
            всё, что было сохранено, осталось на сервере. Попробуйте вернуться к работе —
            если повторится, перейдите на другое рабочее место в шапке.
          </Text>
          <Box>
            <Button
              size="sm"
              bg="brandGreenDark"
              color="white"
              borderRadius="compact"
              _hover={{ bg: 'brandGreen700' }}
              onClick={this.reset}
              data-testid="arm-error-retry"
            >
              Вернуться к работе
            </Button>
          </Box>
        </Stack>
      </Box>
    )
  }
}
