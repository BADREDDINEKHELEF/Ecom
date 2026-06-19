'use client'

import { useState, useEffect } from 'react'
import { MessageCircle, ChevronDown, ChevronUp, Loader2, CheckCircle } from 'lucide-react'

interface Question {
  id: string
  author_name: string
  question: string
  answer: string | null
  answered_at: string | null
  created_at: string
}

interface Props {
  productId: string
}

export default function ProductQA({ productId }: Props) {
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ author_name: '', question: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError]         = useState('')
  const [expanded, setExpanded]   = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/questions/${productId}`)
      .then((r) => r.json())
      .then((d) => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false))
  }, [productId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.author_name.trim() || !form.question.trim()) return
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/questions/${productId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? 'Une erreur est survenue')
        return
      }
      const newQ = await res.json()
      setQuestions((prev) => [newQ, ...prev])
      setSubmitted(true)
      setShowForm(false)
      setForm({ author_name: '', question: '' })
    } catch {
      setError('Une erreur est survenue. Réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return null

  return (
    <section className="mb-16">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-black text-gray-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-indigo-600" />
          Questions & Réponses
          {questions.length > 0 && (
            <span className="text-sm font-normal text-gray-500">({questions.length})</span>
          )}
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Poser une question
        </button>
      </div>

      {submitted && (
        <div className="flex items-center gap-2 text-green-600 text-sm font-medium bg-green-50 rounded-xl px-4 py-3 mb-4">
          <CheckCircle className="w-4 h-4" />
          Votre question a été soumise. Le vendeur vous répondra bientôt.
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-indigo-50 rounded-2xl p-5 mb-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Votre nom</label>
            <input
              required
              value={form.author_name}
              onChange={(e) => setForm({ ...form, author_name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 bg-white"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Votre question</label>
            <textarea
              required
              value={form.question}
              onChange={(e) => setForm({ ...form, question: e.target.value })}
              rows={3}
              maxLength={500}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-400 resize-none bg-white"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 bg-indigo-600 text-white font-bold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60 transition-colors text-sm"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Envoyer
          </button>
        </form>
      )}

      {questions.length === 0 ? (
        <p className="text-gray-400 text-sm py-4">
          Aucune question pour l&apos;instant. Soyez le premier à poser une question !
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === q.id ? null : q.id)}
                className="w-full flex items-start gap-3 p-4 text-left"
              >
                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-indigo-600 font-bold text-sm">{(q.author_name?.[0] ?? 'U').toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{q.author_name}</p>
                  <p className="text-gray-700 text-sm mt-0.5">{q.question}</p>
                  {q.answer && (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium mt-1">
                      <CheckCircle className="w-3 h-3" /> Répondu
                    </span>
                  )}
                </div>
                {q.answer && (
                  expanded === q.id
                    ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                    : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                )}
              </button>
              {expanded === q.id && q.answer && (
                <div className="px-4 pb-4 border-t border-gray-50 pt-3">
                  <p className="text-xs font-bold text-gray-500 mb-1">Réponse du vendeur</p>
                  <p className="text-sm text-gray-700">{q.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
