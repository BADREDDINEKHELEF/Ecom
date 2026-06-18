import { cookies } from 'next/headers'
import { translations } from './translations'
import type { Lang } from './translations'

const VALID_LANGS: Lang[] = ['fr', 'en', 'ar']

export async function getServerT() {
  const store = await cookies()
  const raw = store.get('casbah-lang')?.value ?? 'fr'
  const lang: Lang = VALID_LANGS.includes(raw as Lang) ? (raw as Lang) : 'fr'
  return translations[lang]
}
