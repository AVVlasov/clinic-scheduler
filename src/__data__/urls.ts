import { getNavigation, getNavigationValue } from '@brojs/cli'

import pkg from '../../package.json'

const baseUrl = getNavigationValue(`${pkg.name}.main`)
const navs = getNavigation()
const makeUrl = (url: string) => baseUrl + url

export const ARM_SLUGS = {
  operator: 'operator',
  doctor: 'doctor',
  registrar: 'registrar',
  admin: 'admin',
} as const

export type ArmSlug = (typeof ARM_SLUGS)[keyof typeof ARM_SLUGS]

export const URLs = {
  baseUrl,
  auth: {
    url: makeUrl(navs[`link.${pkg.name}.auth`]),
    isOn: Boolean(navs[`link.${pkg.name}.auth`])
  },
  arms: {
    operator: `${baseUrl}/operator`,
    doctor: `${baseUrl}/doctor`,
    registrar: `${baseUrl}/registrar`,
    admin: `${baseUrl}/admin`,
  },
}
