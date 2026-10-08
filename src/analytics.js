import posthog from 'posthog-js'

const token = import.meta.env.VITE_PUBLIC_POSTHOG_TOKEN
const host = import.meta.env.VITE_PUBLIC_POSTHOG_HOST
const isConfigured = Boolean(token && host)

if (!token && import.meta.env.DEV) {
  throw new Error('VITE_PUBLIC_POSTHOG_TOKEN variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_TOKEN is configured')
}

if (!host && import.meta.env.DEV) {
  throw new Error('VITE_PUBLIC_POSTHOG_HOST variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once VITE_PUBLIC_POSTHOG_HOST is configured')
}

if (isConfigured) {
  posthog.init(token, {
    api_host: host,
    defaults: '2026-05-30',
    person_profiles: 'identified_only', // Solo crea perfil si identificas al usuario explícitamente
    // Como no hay login, todos los eventos quedan anónimos

  })
}

export function captureEvent(eventName, properties) {
  if (isConfigured) posthog.capture(eventName, properties)
}

export function captureException(error, properties) {
  if (isConfigured) posthog.captureException(error, properties)
}
