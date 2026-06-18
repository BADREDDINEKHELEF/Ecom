import { cookies } from 'next/headers'
import { translations, Lang } from './translations'

export async function getServerT() {
  const cookieStore = await cookies()
  const lang = (cookieStore.get('casbah-lang')?.value ?? 'fr') as Lang
  const validLang: Lang = ['ar', 'fr', 'en'].includes(lang) ? lang : 'fr'
  return translations[validLang]
}
