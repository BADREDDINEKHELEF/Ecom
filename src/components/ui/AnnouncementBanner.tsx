import { createAdminClient } from '@/lib/supabase/admin'

const COLOR_STYLES: Record<string, string> = {
  amber:  'bg-amber-400 text-amber-950',
  green:  'bg-emerald-500 text-white',
  red:    'bg-red-500 text-white',
  blue:   'bg-blue-500 text-white',
  indigo: 'bg-indigo-600 text-white',
}

async function getAnnouncement(): Promise<{ text: string; active: boolean; color: string } | null> {
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('store_settings')
      .select('announcement_text, announcement_active, announcement_color')
      .eq('id', 1)
      .single()
    if (!data?.announcement_active || !data.announcement_text?.trim()) return null
    return {
      text:   data.announcement_text,
      active: data.announcement_active,
      color:  data.announcement_color ?? 'amber',
    }
  } catch {
    return null
  }
}

export default async function AnnouncementBanner() {
  const announcement = await getAnnouncement()
  if (!announcement) return null

  const style = COLOR_STYLES[announcement.color] ?? COLOR_STYLES.amber

  return (
    <div className={`w-full text-center text-sm font-semibold py-2 px-4 ${style}`}>
      {announcement.text}
    </div>
  )
}
