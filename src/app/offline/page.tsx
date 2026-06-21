'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-gray-50">
      <div className="text-6xl mb-6">📡</div>

      <h1 className="text-2xl font-black text-gray-900 mb-3">
        Pas de connexion
      </h1>

      <p className="text-gray-500 mb-8 max-w-sm">
        Vous êtes hors ligne. Vérifiez votre connexion Internet et réessayez.
      </p>

      <button
        onClick={() => window.location.reload()}
        className="bg-indigo-600 text-white font-bold px-8 py-3.5 rounded-xl hover:bg-indigo-700 transition-colors"
      >
        Réessayer
      </button>
    </div>
  )
}