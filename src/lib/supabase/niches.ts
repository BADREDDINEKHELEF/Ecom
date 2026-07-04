import { unstable_cache } from 'next/cache'
import { createAdminClient } from './admin'
import { Niche } from '@/types'

function dbToNiche(row: Record<string, unknown>): Niche {
  return {
    id:          String(row.id),
    name:        String(row.name),
    description: String(row.description ?? ''),
    emoji:       String(row.emoji ?? '🛒'),
    gradient:    String(row.gradient ?? 'from-slate-900 via-slate-800 to-zinc-800'),
    accentColor: String(row.accent_color ?? 'bg-indigo-500'),
    textAccent:  String(row.text_accent ?? 'text-indigo-400'),
    banner:      String(row.banner ?? ''),
    categories:  (row.categories as string[]) ?? [],
  }
}

export const getNichesFromDB = unstable_cache(
  async (): Promise<Niche[]> => {
    // Public cached read; admin client avoids browser-client issues in SSR.
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('niches')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []).map(dbToNiche)
  },
  ['niches-list'],
  { revalidate: 300, tags: ['niches'] }
)

export async function upsertNiche(niche: Niche): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('niches').upsert({
    id:          niche.id,
    name:        niche.name,
    description: niche.description,
    emoji:       niche.emoji,
    gradient:    niche.gradient,
    accent_color: niche.accentColor,
    text_accent:  niche.textAccent,
    banner:      niche.banner,
    categories:  niche.categories,
    updated_at:  new Date().toISOString(),
  })
  if (error) throw error
}

export async function deleteNiche(id: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('niches').delete().eq('id', id)
  if (error) throw error
}
