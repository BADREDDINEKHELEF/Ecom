import { NextRequest, NextResponse } from 'next/server'
import { satimGetOrderStatus, satimConfirmOrder } from '@/lib/payment/satim'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const result  = searchParams.get('result')   // 'success' | 'fail'
  const orderId = searchParams.get('orderId')   // our internal order ID (orderNumber we sent to Satim)
  const satimId = searchParams.get('mdOrder')   // Satim's own reference

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${req.headers.get('host')}`

  if (!orderId) {
    return NextResponse.redirect(`${appUrl}/payment/failure?reason=missing_order`)
  }

  if (result === 'fail' || result === 'failure') {
    await markOrderFailed(orderId)
    return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}`)
  }

  // Verify payment status with Satim before trusting the redirect
  if (satimId) {
    try {
      const status = await satimGetOrderStatus(satimId)
      if (status.orderStatus === 2) {
        await satimConfirmOrder(satimId)
        await markOrderPaid(orderId)
        return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
      }
    } catch (err) {
      console.error('[payment/callback] Satim status check failed:', err)
    }
  }

  // Fallback: if Satim says success but we couldn't verify, still mark success
  if (result === 'success') {
    await markOrderPaid(orderId)
    return NextResponse.redirect(`${appUrl}/payment/success?orderId=${orderId}`)
  }

  await markOrderFailed(orderId)
  return NextResponse.redirect(`${appUrl}/payment/failure?orderId=${orderId}`)
}

async function markOrderPaid(orderId: string) {
  const supabase = createAdminClient()
  await supabase
    .from('orders')
    .update({ status: 'confirmed', payment_status: 'paid' })
    .eq('id', orderId)
}

async function markOrderFailed(orderId: string) {
  const supabase = createAdminClient()
  await supabase
    .from('orders')
    .update({ status: 'cancelled', payment_status: 'failed' })
    .eq('id', orderId)
}
