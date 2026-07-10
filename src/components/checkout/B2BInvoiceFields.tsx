'use client'

import { useState, useId } from 'react'
import { Building2, ChevronDown, ChevronUp } from 'lucide-react'

export interface B2BFields {
  isB2B: boolean
  companyName: string
  nif: string
  nis: string
  rc: string
}

interface Props {
  value: B2BFields
  onChange: (v: B2BFields) => void
}

export default function B2BInvoiceFields({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const fieldId = useId()

  const set = (k: keyof B2BFields, v: string | boolean) =>
    onChange({ ...value, [k]: v })

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="font-bold text-gray-900 text-sm">Facturation B2B (entreprise)</p>
            <p className="text-xs text-gray-500">Optionnel — pour une facture fiscale</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
          <label className="flex items-center gap-3 pt-4 cursor-pointer">
            <input
              type="checkbox"
              checked={value.isB2B}
              onChange={(e) => set('isB2B', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm font-semibold text-gray-800">Je commande pour une entreprise</span>
          </label>

          {value.isB2B && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {[
                { key: 'companyName', label: 'Raison sociale', placeholder: 'Ex: SARL Mon Entreprise' },
                { key: 'nif',        label: 'NIF',             placeholder: 'Numéro d\'Identification Fiscale' },
                { key: 'nis',        label: 'NIS',             placeholder: 'Numéro d\'Identification Statistique' },
                { key: 'rc',         label: 'RC',              placeholder: 'Registre de Commerce' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label htmlFor={`${fieldId}-${key}`} className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
                  <input
                    id={`${fieldId}-${key}`}
                    type="text"
                    value={value[key as keyof B2BFields] as string}
                    onChange={(e) => set(key as keyof B2BFields, e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
