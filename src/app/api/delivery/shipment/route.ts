import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAdminToken } from '@/lib/auth/jwt'
import { updateShippingInfo, updateOrderStatus } from '@/lib/supabase/queries'
import { yalidineCreateShipment } from '@/lib/delivery/yalidine'
import { ShipmentInput } from '@/lib/delivery/types'
import { logger } from '@/lib/logger'

export async function POST(req: NextRequest) {
  // Require valid admin session
  const cookieStore = await cookies()
  const token = cookieStore.get('casbah_admin_token')?.value
  const payload = await verifyAdminToken(token ?? '')
  if (!payload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { orderId, provider, tracking, autoCreate, orderData } = body as {
      orderId: string
      provider: string
      tracking?: string
      autoCreate?: boolean
      orderData?: ShipmentInput
    }

    if (!orderId || !provider) {
      return NextResponse.json({ error: 'orderId and provider required' }, { status: 400 })
    }

    let finalTracking = tracking ?? ''
    let labelUrl: string | undefined

    if (provider === 'yalidine' && autoCreate && orderData) {
      const result = await yalidineCreateShipment(orderData)
      finalTracking = result.tracking
      labelUrl = result.labelUrl
    }

    if (!finalTracking) {
      return NextResponse.json({ error: 'Tracking number required' }, { status: 400 })
    }

    await updateShippingInfo(orderId, finalTracking, provider, labelUrl)
    await updateOrderStatus(orderId, 'shipped')

    return NextResponse.json({ tracking: finalTracking, labelUrl })
  } catch (err) {
    logger.error('[POST /api/delivery/shipment]', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: 'Failed to create shipment' }, { status: 500 })
  }
}
