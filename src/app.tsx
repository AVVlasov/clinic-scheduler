import React from 'react'
import { BrowserRouter } from 'react-router-dom'

import './assets/smclinic-fonts.css'
import { Dashboard } from './dashboard'
import { Provider } from './theme'

const App = () => {
  return (
    <BrowserRouter>
      <Provider>
        <Dashboard />
      </Provider>
    </BrowserRouter>
  )
}

export default App
