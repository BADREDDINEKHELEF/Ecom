'use client'

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { useToastStore } from '@/lib/store/toastStore'
import { useRTL } from '@/lib/store/langStore'
import { cn } from '@/lib/utils'

const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />,
  error:   <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
  info:    <Info className="w-4 h-4 text-indigo-500 flex-shrink-0" />,
}

export default function Toaster() {
  const { toasts, remove } = useToastStore()
  const isRTL = useRTL()

  if (toasts.length === 0) return null

  return (
    <div className={`fixed bottom-5 ${isRTL ? 'left-5' : 'right-5'} z-[100] flex flex-col gap-2 pointer-events-none`}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 bg-white rounded-xl shadow-lg border px-4 py-3 min-w-[260px] max-w-sm pointer-events-auto animate-fade-in',
            toast.type === 'error' ? 'border-red-100' : toast.type === 'info' ? 'border-indigo-100' : 'border-green-100'
          )}
        >
          {ICONS[toast.type]}
          <p className="text-sm font-medium text-gray-800 flex-1">{toast.message}</p>
          <button
            onClick={() => remove(toast.id)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
