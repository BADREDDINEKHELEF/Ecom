import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { copyCookies } from '@/lib/supabase/server'
import { requireVendorPermission } from '@/lib/auth/vendorAuth'
import { isAssignableRole } from '@/lib/auth/permissions'
import { createAdminClient } from '@/lib/supabase/admin'
import { logSecurityEvent, SEC_EVENT } from '@/lib/auth/securityEvents'
import { checkSellerRateLimit } from '@/lib/auth/rateLimit'
import { getClientIp } from '@/lib/utils/ip'
import { logger } from '@/lib/logger'

const InviteSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  role:  z.string().refine(isAssignableRole, { message: 'Role must be manager, support, or readonly' }),
})

const UpdateRoleSchema = z.object({
  userId: z.string().uuid(),
  role:   z.string().refine(isAssignableRole, { message: 'Role must be manager, support, or readonly' }),
})

// GET /api/seller/team — list all team members for the vendor
export async function GET(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'team_list')
  if (!rl.allowed) return copyCookies(response, NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 }))

  const result = await requireVendorPermission(req, 'members:read', response)
  if (result instanceof NextResponse) return result
  const { ctx } = result

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('vendor_members')
      .select('id, user_id, role, created_at, invited_by')
      .eq('vendor_id', ctx.vendor.id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return copyCookies(response, NextResponse.json(data ?? []))
  } catch (err) {
    logger.error('[GET /api/seller/team]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// POST /api/seller/team — invite a user by email with a role
export async function POST(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'team_invite', 10, 3600)
  if (!rl.allowed) return copyCookies(response, NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 }))

  const result = await requireVendorPermission(req, 'members:invite', response)
  if (result instanceof NextResponse) return result
  const { ctx } = result

  let body: unknown
  try { body = await req.json() } catch {
    return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
  }

  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Données invalides' }, { status: 400 }))

  try {
    const admin = createAdminClient()

    // Resolve user_id from email via Supabase admin auth
    const { data: { users }, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) throw listErr

    const targetUser = users.find((u) => u.email?.toLowerCase() === parsed.data.email)
    if (!targetUser) {
      return copyCookies(response, NextResponse.json({ error: 'Aucun compte trouvé avec cet email' }, { status: 404 }))
    }

    // Cannot add oneself
    if (targetUser.id === ctx.user.id) {
      return copyCookies(response, NextResponse.json({ error: 'Vous ne pouvez pas vous ajouter vous-même' }, { status: 400 }))
    }

    // Cannot add the platform owner (vendors.user_id of another vendor)
    const { data: existingOwner } = await admin
      .from('vendors')
      .select('id')
      .eq('user_id', targetUser.id)
      .maybeSingle()

    if (existingOwner && existingOwner.id !== ctx.vendor.id) {
      return copyCookies(response, NextResponse.json({ error: 'Cet utilisateur est déjà propriétaire d\'une autre boutique' }, { status: 409 }))
    }

    const { error: upsertErr } = await admin.from('vendor_members').upsert({
      vendor_id:  ctx.vendor.id,
      user_id:    targetUser.id,
      role:       parsed.data.role,
      invited_by: ctx.user.id,
    }, { onConflict: 'vendor_id,user_id' })

    if (upsertErr) throw upsertErr

    void logSecurityEvent({
      actorType: 'seller',
      actorId:   ctx.vendor.id,
      action:    SEC_EVENT.TEAM_MEMBER_INVITED,
      resource:  `user:${targetUser.id}`,
      ipAddress: ip,
      result:    'success',
      meta:      { role: parsed.data.role, invitedBy: ctx.user.id },
    })

    return copyCookies(response, NextResponse.json({ ok: true }, { status: 201 }))
  } catch (err) {
    logger.error('[POST /api/seller/team]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// PATCH /api/seller/team — change a member's role
export async function PATCH(req: NextRequest) {
  const response = NextResponse.next()
  const ip = getClientIp(req)
  const rl = await checkSellerRateLimit(ip, 'team_update', 20, 60)
  if (!rl.allowed) return copyCookies(response, NextResponse.json({ error: 'Trop de requêtes.' }, { status: 429 }))

  const result = await requireVendorPermission(req, 'members:invite', response)
  if (result instanceof NextResponse) return result
  const { ctx } = result

  let body: unknown
  try { body = await req.json() } catch {
    return copyCookies(response, NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }))
  }

  const parsed = UpdateRoleSchema.safeParse(body)
  if (!parsed.success) return copyCookies(response, NextResponse.json({ error: 'Validation failed' }, { status: 400 }))

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('vendor_members')
      .update({ role: parsed.data.role })
      .eq('vendor_id', ctx.vendor.id)
      .eq('user_id', parsed.data.userId)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) return copyCookies(response, NextResponse.json({ error: 'Membre introuvable' }, { status: 404 }))

    void logSecurityEvent({
      actorType: 'seller',
      actorId:   ctx.vendor.id,
      action:    SEC_EVENT.TEAM_ROLE_CHANGED,
      resource:  `user:${parsed.data.userId}`,
      ipAddress: ip,
      result:    'success',
      meta:      { newRole: parsed.data.role },
    })

    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[PATCH /api/seller/team]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}

// DELETE /api/seller/team?userId=xxx — remove a team member
export async function DELETE(req: NextRequest) {
  const response = NextResponse.next()
  const result = await requireVendorPermission(req, 'members:remove', response)
  if (result instanceof NextResponse) return result
  const { ctx } = result

  const { searchParams } = new URL(req.url)
  const targetUserId = searchParams.get('userId')

  if (!targetUserId || !/^[0-9a-f-]{36}$/.test(targetUserId)) {
    return copyCookies(response, NextResponse.json({ error: 'userId invalide' }, { status: 400 }))
  }

  // Owner cannot remove themselves — they are not in vendor_members anyway
  if (targetUserId === ctx.user.id) {
    return copyCookies(response, NextResponse.json({ error: 'Vous ne pouvez pas vous retirer vous-même' }, { status: 400 }))
  }

  const ip = getClientIp(req)

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('vendor_members')
      .delete()
      .eq('vendor_id', ctx.vendor.id)
      .eq('user_id', targetUserId)

    if (error) throw error

    void logSecurityEvent({
      actorType: 'seller',
      actorId:   ctx.vendor.id,
      action:    SEC_EVENT.TEAM_MEMBER_REMOVED,
      resource:  `user:${targetUserId}`,
      ipAddress: ip,
      result:    'success',
      meta:      { removedBy: ctx.user.id },
    })

    return copyCookies(response, NextResponse.json({ ok: true }))
  } catch (err) {
    logger.error('[DELETE /api/seller/team]', { error: err instanceof Error ? err.message : String(err) })
    return copyCookies(response, NextResponse.json({ error: 'Internal server error' }, { status: 500 }))
  }
}
