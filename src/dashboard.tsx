import React, { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import { URLs } from './__data__/urls'
import { AppShell } from './pages/app-shell'
import { ArmErrorBoundary } from './pages/arm-error-boundary'

const MainPage = lazy(() => import(/* webpackChunkName: 'main' */ './pages/main'))
const OperatorPage = lazy(() => import(/* webpackChunkName: 'operator' */ './pages/operator'))
const DoctorPage = lazy(() => import(/* webpackChunkName: 'doctor' */ './pages/doctor'))
const RegistrarPage = lazy(() => import(/* webpackChunkName: 'registrar' */ './pages/registrar'))
const AdminPage = lazy(() => import(/* webpackChunkName: 'admin' */ './pages/admin'))

const PageFallback = () => <div data-testid="page-fallback">Загрузка…</div>

/**
 * Каждое рабочее место обёрнуто границей ошибки: падение одного компонента не
 * должно гасить весь АРМ в белый экран — с него не уйти даже в другое рабочее
 * место, потому что шапка размонтируется вместе с содержимым.
 */
const wrap = (Page: React.ComponentType, armLabel: string) => (
  <ArmErrorBoundary armLabel={armLabel}>
    <Suspense fallback={<PageFallback />}>
      <Page />
    </Suspense>
  </ArmErrorBoundary>
)

export const Dashboard = () => {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path={URLs.baseUrl} element={wrap(MainPage, 'Стартовый экран')} />
        <Route path={`${URLs.baseUrl}/`} element={wrap(MainPage, 'Стартовый экран')} />
        <Route path={`${URLs.baseUrl}/operator`} element={wrap(OperatorPage, 'АРМ оператора')} />
        <Route path={`${URLs.baseUrl}/doctor`} element={wrap(DoctorPage, 'АРМ врача')} />
        <Route path={`${URLs.baseUrl}/registrar`} element={wrap(RegistrarPage, 'АРМ регистратора')} />
        <Route path={`${URLs.baseUrl}/admin`} element={wrap(AdminPage, 'АРМ администратора')} />
      </Route>
    </Routes>
  )
}
