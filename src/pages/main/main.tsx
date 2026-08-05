import React from 'react'
import { Grid, GridItem } from '@chakra-ui/react'

export const MainPage = () => {
  return (
    <Grid
      h="100%"
      bgColor="gray.300"
      templateAreas={{
        md: `"header header"
        "aside main"
        "footer footer"`,
        sm: `"header"
        "main"
        "aside"
        "footer"`,
      }}
      gridTemplateRows={{ sm: '1fr', md: '50px 1fr 30px' }}
      gridTemplateColumns={{ sm: '1fr', md: '150px 1fr' }}
      gap={4}
    >
      <GridItem bgColor="green.100" gridArea="header">header</GridItem>
      <GridItem bgColor="green.300" gridArea="aside">aside</GridItem>
      <GridItem bgColor="green.600" gridArea="main" h="100vh">main</GridItem>
      <GridItem bgColor="green.300" gridArea="footer">footer</GridItem>
    </Grid>
  )
}
