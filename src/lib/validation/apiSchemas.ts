import { z } from 'zod'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TRACKING_REGEX = /^[A-Za-z0-9]{6,20}$/

export const PaymentCheckQuerySchema = z.object({
  orderId: z.string().regex(UUID_RE),
  token: z.string().min(1).max(512),
})

export const BaridiMobWebhookSchema = z.object({
  payment_id: z.string().min(1).max(200),
  order_id: z.string().regex(UUID_RE),
})

export const CompareQuerySchema = z.object({
  ids: z.string().regex(UUID_RE).array().min(1).max(3),
})

export const RelatedProductsQuerySchema = z.object({
  nicheId: z.string().regex(UUID_RE),
  excludeId: z.string().regex(UUID_RE).optional(),
  limit: z.number().int().min(1).max(20).default(8),
})

export const DeliveryRatesQuerySchema = z.object({
  storeSlug: z.string().min(1).max(100).optional(),
  vendorId: z.string().regex(UUID_RE).optional(),
  wilaya: z.string().min(1).max(60),
})

export const DeliveryCollectQuerySchema = z.object({
  wilaya: z.string().min(1).max(60),
  tracking: z.string().regex(TRACKING_REGEX).optional(),
  storeSlug: z.string().min(1).max(100).optional(),
})

export const TestIntegrationSchema = z.object({
  integrationName: z.enum([
    'yalidine', 'zr', 'maystro', 'procolis', 'colivraison', 'rex',
    'yassir', 'ecom', 'apec', 'meta_capi', 'tiktok_capi', 'google_capi',
  ]),
  action: z.enum(['test_connection', 'test_quote', 'send_test_event']),
  params: z.object({ wilaya: z.string().max(60) }).optional(),
})

export const VerifyEmailOtpSchema = z.object({
  email: z.string().email().max(320),
  otp: z.string().trim().length(6).regex(/^\d+$/),
})

export const VerifyOtpSchema = z.object({
  email: z.string().email().max(320).optional(),
  phone: z.string().max(30).optional(),
  otp: z.string().trim().length(6).regex(/^\d+$/),
  newPassword: z.string().min(8).max(128),
})

export const AdminLoginSchema = z.object({
  password: z.string().min(1).max(500),
  totpCode: z.string().trim().length(6).regex(/^\d+$/).optional(),
})

export const AdminTotpSchema = z.object({
  password: z.string().min(1).max(500),
})
