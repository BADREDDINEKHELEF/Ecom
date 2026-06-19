export interface OrderInfo {
  id: string
  fullName: string
  phone: string
  wilaya: string
  total: number
  status: string
  items?: string
  yalidineTracking?: string | null
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) return '213' + digits.slice(1)
  if (digits.startsWith('213')) return digits
  return '213' + digits
}

function buildMessage(order: OrderInfo): string {
  const storeName = process.env.NEXT_PUBLIC_STORE_NAME ?? 'StoreDz'
  const id = order.id.slice(0, 8).toUpperCase()

  switch (order.status) {
    case 'confirmed':
      return (
        `مرحباً ${order.fullName}،\n\n` +
        `✅ تم تأكيد طلبك رقم *#${id}* بنجاح!\n\n` +
        `📦 المنتجات: ${order.items || 'انظر الطلب'}\n` +
        `💰 المبلغ الإجمالي: ${order.total.toLocaleString()} دج\n` +
        `📍 التوصيل إلى: ${order.wilaya}\n\n` +
        `سنتواصل معك قريباً لتأكيد موعد التوصيل.\n\n` +
        `شكراً لتسوقك مع ${storeName}! 🛒`
      )
    case 'shipped':
      return (
        `مرحباً ${order.fullName}،\n\n` +
        `🚚 طلبك رقم *#${id}* في الطريق إليك!\n\n` +
        `📍 التوصيل إلى: ${order.wilaya}\n` +
        (order.yalidineTracking
          ? `🔍 رقم التتبع: *${order.yalidineTracking}*\n`
          : '') +
        `⏱️ الوقت المتوقع: 2–5 أيام عمل\n\n` +
        `شكراً لتسوقك مع ${storeName}! 🎉`
      )
    case 'delivered':
      return (
        `مرحباً ${order.fullName}،\n\n` +
        `✅ تم توصيل طلبك رقم *#${id}* بنجاح!\n\n` +
        `نأمل أن تكون راضياً عن منتجاتك. 😊\n` +
        `لا تتردد في التواصل معنا إذا كان لديك أي استفسار.\n\n` +
        `شكراً لتسوقك مع ${storeName}! ⭐`
      )
    case 'cancelled':
      return (
        `مرحباً ${order.fullName}،\n\n` +
        `❌ نأسف لإبلاغك أن طلبك رقم *#${id}* تم إلغاؤه.\n\n` +
        `للمزيد من المعلومات، يرجى التواصل معنا.\n\n` +
        `${storeName}`
      )
    default:
      return (
        `مرحباً ${order.fullName}،\n\n` +
        `شكراً لطلبك رقم *#${id}* من ${storeName}.\n\n` +
        `سنتواصل معك قريباً. 🛒`
      )
  }
}

export function buildWhatsAppLink(order: OrderInfo): string {
  const phone = formatPhone(order.phone)
  const message = buildMessage(order)
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}

export function buildWhatsAppMessage(order: OrderInfo): string {
  return buildMessage(order)
}

export const WA_STATUS_LABELS: Record<string, string> = {
  confirmed: '✅ Order Confirmed',
  shipped:   '🚚 Order Shipped',
  delivered: '🎉 Order Delivered',
  cancelled: '❌ Order Cancelled',
}
