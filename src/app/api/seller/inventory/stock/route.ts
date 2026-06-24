import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient } from '@/lib/supabase/server'
import { getVendorByUserIdServer } from '@/lib/supabase/vendors'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { revalidateTag } from 'next/cache'

const UpdateSchema = z.object({
  productId: z.string().uuid(),
  newStock: z.number().int().min(0),
})

export async function PATCH(req: NextRequest) {
  try {
    const supabase = createRouteClient(req)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    const vendor = await getVendorByUserIdServer(user.id)
    if (!vendor) return new Response('Not a vendor', { status: 403 })

    const parsed = UpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }

    const { productId, newStock } = parsed.data

    // Verify ownership and update in one go
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId)
      .eq('vendor_id', vendor.id) // Critical ownership check

    if (error) throw error

    revalidateTag(`inventory-${vendor.id}`)
    revalidateTag(`products`)

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update stock'
    logger.error('[PATCH /api/seller/inventory/stock]', { error: message })
    return new Response(message, { status: 500 })
  }
}