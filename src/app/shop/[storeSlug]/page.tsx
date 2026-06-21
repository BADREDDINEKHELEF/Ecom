import { redirect } from 'next/navigation'

interface PageProps { params: Promise<{ storeSlug: string }> }

export default async function ShopRedirect({ params }: PageProps) {
  const { storeSlug } = await params
  redirect(`/store/${storeSlug}`)
}
