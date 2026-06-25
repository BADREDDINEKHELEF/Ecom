import Link from 'next/link'
import { ArrowLeftRight } from 'lucide-react'

export default function ComparePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center px-4">
        <ArrowLeftRight className="w-16 h-16 text-gray-200 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-gray-900 mb-2">Compare products</h1>
        <p className="text-gray-500 mb-6">Coming soon. You will be able to compare products side by side here.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-indigo-700 transition-colors text-sm"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
