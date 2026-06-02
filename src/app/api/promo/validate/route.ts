import { NextRequest, NextResponse } from 'next/server'
import { validatePromoCode } from '@/lib/supabase/queries'

export async function POST(req: NextRequest) {
  try {
    const { code, orderTotal } = await req.json()
    if (!code || typeof orderTotal !== 'number') {
      return NextResponse.json({ valid: false, message: 'invalid' }, { status: 400 })
    }
    const result = await validatePromoCode(code, orderTotal)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ valid: false, message: 'invalid' }, { status: 500 })
  }
}
