// ════════════════════════════════════════════════════════════════════
//  analytics.js — Punto único de analítica de producto (PostHog)
//
//  Inicializa PostHog una sola vez al importar este módulo y expone
//  captureEvent / captureException para el resto de la app. Así los
//  componentes no dependen de un global `posthog` ni lo inicializan.
//
//  El token se lee de una variable de entorno con prefijo VITE_ para que
//  Vite lo exponga al cliente. Si falta, la app sigue funcionando sin
//  analítica.
// ════════════════════════════════════════════════════════════════════

import posthog from 'posthog-js'

const token = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN
const enabled = Boolean(token)

if (enabled) {
  posthog.init(token, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
    defaults: '2026-05-30',
  })
} else if (import.meta.env.DEV) {
  console.error(
    'VITE_POSTHOG_PROJECT_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_POSTHOG_PROJECT_TOKEN is configured',
  )
}

export function captureEvent(event, properties) {
  if (!enabled) return
  posthog.capture(event, properties)
}

export function captureException(error, properties) {
  if (!enabled) return
  posthog.captureException(error, properties)
}
