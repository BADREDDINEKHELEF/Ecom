import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '@/lib/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logs info as JSON to console.log', () => {
    logger.info('test message', { extra: 'data' })
    expect(console.log).toHaveBeenCalledOnce()
    const logged = JSON.parse((console.log as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(logged.level).toBe('info')
    expect(logged.message).toBe('test message')
    expect(logged.extra).toBe('data')
    expect(logged.timestamp).toBeDefined()
  })

  it('logs error to console.error', () => {
    logger.error('something broke')
    expect(console.error).toHaveBeenCalledOnce()
    const logged = JSON.parse((console.error as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(logged.level).toBe('error')
    expect(logged.message).toBe('something broke')
  })

  it('logs warn to console.warn', () => {
    logger.warn('be careful')
    expect(console.warn).toHaveBeenCalledOnce()
    const logged = JSON.parse((console.warn as ReturnType<typeof vi.fn>).mock.calls[0][0])
    expect(logged.level).toBe('warn')
  })

  it('logs debug to console.debug in non-production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    logger.debug('debug info')
    expect(console.debug).toHaveBeenCalledOnce()
    vi.unstubAllEnvs()
  })

  it('suppresses debug in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    logger.debug('should not show')
    expect(console.debug).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
