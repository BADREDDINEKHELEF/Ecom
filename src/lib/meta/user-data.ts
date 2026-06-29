/**
 * User data hashing utilities for Meta Conversions API.
 *
 * Meta requires SHA-256 hashing of PII fields before sending.
 * Non-PII fields (client_ip_address, client_user_agent, fbp, fbc) are sent raw.
 */

import crypto from 'crypto'
import type { MetaUserData } from './types'

// ── Hashing ────────────────────────────────────────────────────────────

export function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

// ── Normalization ──────────────────────────────────────────────────────

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('213')) return digits
  if (digits.startsWith('0')) return '213' + digits.slice(1)
  return digits
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function anonymizeIp(ip: string): string {
  if (!ip) return ''
  // IPv4: mask last octet
  if (ip.includes('.')) {
    const parts = ip.split('.')
    if (parts.length === 4) { parts[3] = '0'; return parts.join('.') }
  }
  // IPv6: mask last 80 bits
  if (ip.includes(':')) {
    const parts = ip.split(':')
    if (parts.length > 3) return parts.slice(0, 4).join(':') + '::'
  }
  return ip
}

// ── User data builder ──────────────────────────────────────────────────

export interface UserDataInput {
  email?:             string | null
  phone?:             string | null
  firstName?:         string | null
  lastName?:          string | null
  city?:              string | null
  state?:             string | null
  postalCode?:        string | null
  country?:           string | null
  externalId?:        string | null
  clientIp?:          string
  clientUserAgent?:   string
  fbp?:               string | null
  fbc?:               string | null
  eventSourceUrl?:    string
}

/**
 * Build a MetaUserData object with proper SHA-256 hashing.
 *
 * - PII fields (email, phone, name, address) → hashed
 * - Technical fields (IP, UA) → sent raw
 * - Tracking fields (fbp, fbc) → sent raw
 */
export function buildUserData(input: UserDataInput): MetaUserData {
  const data: MetaUserData = {}

  if (input.email)      data.email       = sha256(normalizeEmail(input.email))
  if (input.phone)      data.phone       = sha256(normalizePhone(input.phone))
  if (input.firstName)  data.first_name  = sha256(input.firstName.trim().toLowerCase())
  if (input.lastName)   data.last_name   = sha256(input.lastName.trim().toLowerCase())
  if (input.city)       data.city        = sha256(input.city.trim().toLowerCase())
  if (input.state)      data.state       = sha256(input.state.trim().toLowerCase())
  if (input.postalCode) data.postal_code = sha256(input.postalCode.trim().toLowerCase())
  if (input.country)    data.country     = sha256(input.country.trim().toLowerCase())
  if (input.externalId) data.external_id = sha256(input.externalId)

  // Non-PII fields — sent raw
  if (input.clientIp)        data.client_ip_address = anonymizeIp(input.clientIp)
  if (input.clientUserAgent) data.client_user_agent = input.clientUserAgent
  if (input.fbp)             data.fbp               = input.fbp
  if (input.fbc)             data.fbc               = input.fbc

  return data
}
