/* eslint-disable react/display-name */
import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './app'

export default () => <App />

let rootElement: ReactDOM.Root | undefined

export const mount = (Component: React.ComponentType, element: HTMLElement | null = document.getElementById('app')) => {
  if (!element) {
    throw new Error('Mount target #app not found')
  }
  rootElement = ReactDOM.createRoot(element)
  rootElement.render(<Component />)

  if (module.hot) {
    module.hot.accept('./app', () => {
      rootElement?.render(<Component />)
    })
  }
}

export const unmount = () => {
  rootElement?.unmount()
  rootElement = undefined
}
