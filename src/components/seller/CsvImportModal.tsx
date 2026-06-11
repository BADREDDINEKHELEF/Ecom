'use client'

import { useState, useRef } from 'react'
import { Upload, X, CheckCircle, AlertCircle, Loader2, Download } from 'lucide-react'

interface Props {
  onClose: () => void
  onImported: () => void
}

const SAMPLE_CSV = `name,description,price,compare_price,stock,category,niche,images,tags
Chaussures de sport,Chaussures légères et confortables,3500,4200,10,Chaussures,kids,https://example.com/img.jpg,sport|enfant
Sac en cuir,Sac élégant pour femmes,8900,,5,Sacs,deco,https://example.com/sac.jpg,sac|cuir`

export default function CsvImportModal({ onClose, onImported }: Props) {
  const fileRef    = useRef<HTMLInputElement>(null)
  const [csv, setCsv]             = useState('')
  const [fileName, setFileName]   = useState('')
  const [importing, setImporting] = useState(false)
  const [result, setResult]       = useState<{ imported: number; errors: string[] } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => setCsv((ev.target?.result as string) ?? '')
    reader.readAsText(file, 'UTF-8')
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'exemple_import.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!csv.trim()) return
    setImporting(true)
    try {
      const res = await fetch('/api/seller/products/import', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csv,
      })
      const data = await res.json()
      setResult(data)
      if (data.imported > 0) onImported()
    } catch {
      setResult({ imported: 0, errors: ['Erreur de connexion. Réessayez.'] })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-black text-gray-900">Importer des produits (CSV)</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <button
            onClick={downloadSample}
            className="flex items-center gap-2 text-sm text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
          >
            <Download className="w-4 h-4" /> Télécharger le modèle CSV
          </button>

          <p className="text-xs text-gray-500">
            Colonnes requises: <code className="bg-gray-100 px-1 py-0.5 rounded">name</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">price</code>.
            Optionnelles: description, compare_price, stock, category, niche, images (séparées par |), tags (séparés par |).
          </p>

          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-400 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            {fileName
              ? <p className="text-sm font-semibold text-gray-700">{fileName}</p>
              : <p className="text-sm text-gray-400">Cliquez pour choisir un fichier CSV</p>
            }
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} className="hidden" />
          </div>

          {result && (
            <div className={`rounded-xl p-4 ${result.imported > 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.imported > 0
                  ? <CheckCircle className="w-4 h-4 text-green-600" />
                  : <AlertCircle className="w-4 h-4 text-red-500" />
                }
                <span className="text-sm font-bold">
                  {result.imported} produit{result.imported !== 1 ? 's' : ''} importé{result.imported !== 1 ? 's' : ''}
                </span>
              </div>
              {result.errors.length > 0 && (
                <ul className="text-xs text-red-600 space-y-0.5 max-h-24 overflow-auto">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 pt-0">
          <button onClick={onClose} className="flex-1 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Fermer
          </button>
          <button
            onClick={handleImport}
            disabled={!csv.trim() || importing}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Importer
          </button>
        </div>
      </div>
    </div>
  )
}
