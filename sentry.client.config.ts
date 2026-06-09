import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance tracing: capture 10% of transactions in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Session replays: capture 1% of sessions, 100% of sessions with errors
  replaysSessionSampleRate: 0.01,
  replaysOnErrorSampleRate: 1.0,

  // Silence Sentry in development unless DSN is explicitly set
  enabled: process.env.NODE_ENV === 'production' || !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Integrations are auto-detected by @sentry/nextjs
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: false,
    }),
  ],
})
