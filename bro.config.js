const pkg = require('./package')

module.exports = {
  apiPath: 'stubs/api',
  webpackConfig: {
    output: {
      publicPath: `/static/${pkg.name}/${process.env.VERSION || pkg.version}/`
    }
  },
  /* use https://admin.bro-js.ru/ to create config, navigations and features */
  navigations: {
    'clinic-scheduler.main': '/clinic-scheduler',
    'link.clinic-scheduler.auth': '/auth'
  },
  features: {
    'clinic-scheduler': {
      // add your features here in the format [featureName]: { value: string }
    },
  },
  config: {
    'clinic-scheduler.api': '/api'
  },
  // Путь к кастомному HTML-шаблону prom-режима (оставьте undefined чтобы использовать дефолт)
  htmlTemplatePath: undefined
}
