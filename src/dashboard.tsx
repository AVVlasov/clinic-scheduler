import React, { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { URLs } from './__data__/urls'
import { AppShell } from './pages/app-shell'

const MainPage = lazy(() => import(/* webpackChunkName: 'main' */ './pages/main'))
const OperatorPage = lazy(() => import(/* webpackChunkName: 'operator' */ './pages/operator'))
const DoctorPage = lazy(() => import(/* webpackChunkName: 'doctor' */ './pages/doctor'))
const RegistrarPage = lazy(() => import(/* webpackChunkName: 'registrar' */ './pages/registrar'))
const AdminPage = lazy(() => import(/* webpackChunkName: 'admin' */ './pages/admin'))

const PageFallback = () => <div data-testid="page-fallback">Загрузка…</div>

const wrap = (Page: React.ComponentType) => (
  <Suspense fallback={<PageFallback />}>
    <Page />
  </Suspense>
)

export const Dashboard = () => {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={URLs.baseUrl} element={wrap(MainPage)} />
        <Route path={`${URLs.baseUrl}/`} element={wrap(MainPage)} />
        <Route path={`${URLs.baseUrl}/operator`} element={wrap(OperatorPage)} />
        <Route path={`${URLs.baseUrl}/doctor`} element={wrap(DoctorPage)} />
        <Route path={`${URLs.baseUrl}/registrar`} element={wrap(RegistrarPage)} />
        <Route path={`${URLs.baseUrl}/admin`} element={wrap(AdminPage)} />
      </Route>
    </Routes>
  )
}
