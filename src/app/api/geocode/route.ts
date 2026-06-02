import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const lat = searchParams.get('lat')
  const lon = searchParams.get('lon')

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Missing lat/lon' }, { status: 400 })
  }

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`,
    {
      headers: {
        'User-Agent': 'CasbahStore/1.0 (support@casbahstore.dz)',
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
    street: [addr.house_number, addr.road].filter(Boolean).join(' '),
    city: addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.municipality ?? '',
    state: addr.state ?? addr.county ?? addr.region ?? '',
    countryCode: addr.country_code ?? 'dz',
  })
}
