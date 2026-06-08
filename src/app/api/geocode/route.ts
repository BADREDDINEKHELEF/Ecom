import { NextRequest, NextResponse } from 'next/server'
import { getClientIp } from '@/lib/utils/ip'
import { checkGeocodeRateLimit } from '@/lib/auth/rateLimit'

export async function GET(req: NextRequest) {
  // Rate limit geocoding — Nominatim usage policy requires <= 1 req/sec per user
  const ip = getClientIp(req)
  const rl = await checkGeocodeRateLimit(ip)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, {
      status: 429,
      headers: { 'Retry-After': String(rl.retryAfterSeconds) },
    })
  }

  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 })
  }

  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)
  if (
    isNaN(latNum) || isNaN(lonNum) ||
    latNum < -90  || latNum > 90   ||
    lonNum < -180 || lonNum > 180
  ) {
    return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latNum}&lon=${lonNum}&format=json&accept-language=fr`,
      {
        headers: {
          'User-Agent':      'CasbahStore/1.0 (support@casbahstore.dz)',
          'Accept-Language': 'fr',
        },
        next: { revalidate: 0 },
      }
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'Geocoding failed' }, { status: 502 })
    }

    const data = await res.json()
    const addr = data.address ?? {}

    return NextResponse.json({
      street:      [addr.house_number, addr.road].filter(Boolean).join(' ') || '',
      city:        addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.municipality ?? '',
      state:       addr.state ?? addr.county ?? addr.region ?? '',
      countryCode: addr.country_code ?? 'dz',
    })
  } catch {
    return NextResponse.json({ error: 'Geocoding unavailable' }, { status: 502 })
  }
}
