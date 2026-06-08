/**
 * Structured JSON logger.
 * All output is machine-parseable JSON — works with Vercel log drains, Logtail, etc.
 * Replace console.log/error throughout the codebase with logger.info/error.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'
type LogContext = Record<string, unknown>

function log(level: LogLevel, message: string, ctx?: LogContext) {
  const entry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    ...ctx,
  }

  const line = JSON.stringify(entry)

  switch (level) {
    case 'error': console.error(line); break
    case 'warn':  console.warn(line);  break
    case 'debug': if (process.env.NODE_ENV !== 'production') console.debug(line); break
    default:      console.log(line)
  }
}

export const logger = {
  debug: (msg: string, ctx?: LogContext) => log('debug', msg, ctx),
  info:  (msg: string, ctx?: LogContext) => log('info',  msg, ctx),
  warn:  (msg: string, ctx?: LogContext) => log('warn',  msg, ctx),
  error: (msg: string, ctx?: LogContext) => log('error', msg, ctx),
}
