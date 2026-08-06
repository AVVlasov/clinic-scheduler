import React from 'react'
import { ChakraProvider as ChacraProv, createSystem, defaultConfig } from '@chakra-ui/react'
import type { PropsWithChildren } from 'react'

import { fonts, gridStep, palette, radii, spacing } from './__data__/tokens'

const ChacraProvider: React.ElementType = ChacraProv

const system = createSystem(defaultConfig, {
  theme: {
    tokens: {
      colors: {
        brandGreen: { value: palette.brandGreen },
        brandGreenDark: { value: palette.brandGreenDark },
        brandGreenTint: { value: palette.brandGreenTint },
        brandGreenFaint: { value: palette.brandGreenFaint },
        brandGreen700: { value: palette.brandGreen700 },
        brandOrange: { value: palette.brandOrange },
        brandOrangeDark: { value: palette.brandOrangeDark },
        brandOrange700: { value: palette.brandOrange700 },
        surfaceLight: { value: palette.surfaceLight },
        borderLight: { value: palette.borderLight },
        borderDark: { value: palette.borderDark },
        textPrimary: { value: palette.textPrimary },
        textSecondary: { value: palette.textSecondary },
        textPlaceholder: { value: palette.textPlaceholder },
        danger: { value: palette.danger },
      },
      fonts: {
        body: { value: fonts.body },
        heading: { value: fonts.heading },
        mono: { value: fonts.mono },
      },
      radii: {
        none: { value: radii.none },
        compact: { value: radii.compact },
        pill: { value: radii.pill },
      },
      spacing: {
        grid: { value: `${gridStep}px` },
        '0': { value: spacing[0] },
        '1': { value: spacing[1] },
        '2': { value: spacing[2] },
        '3': { value: spacing[3] },
        '4': { value: spacing[4] },
        '5': { value: spacing[5] },
        '6': { value: spacing[6] },
        '8': { value: spacing[8] },
        '10': { value: spacing[10] },
      },
    },
  },
})

export const Provider = (props: PropsWithChildren) => (
  <ChacraProvider value={system}>
    {props.children}
  </ChacraProvider>
)