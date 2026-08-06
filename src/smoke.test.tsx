import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'

import App from './app'

describe('App', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/clinic-scheduler')
  })

  it('рендерит главную страницу без падения', async () => {
    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('main')).toBeInTheDocument()
    })

    expect(screen.getByText('header')).toBeInTheDocument()
    expect(screen.getByText('aside')).toBeInTheDocument()
    expect(screen.getByText('footer')).toBeInTheDocument()
  })
})
