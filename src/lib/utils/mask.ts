export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return ''
  const clean = phone.replace(/[\s\-().+]/g, '')
  if (clean.length < 6) return '***'
  return clean.slice(0, 4) + '****' + clean.slice(-2)
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return ''
  const [local, domain] = email.split('@')
  if (!domain) return '***'
  return local.slice(0, 2) + '***@' + domain
}
