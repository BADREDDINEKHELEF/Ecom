'use client'

import { useEffect, useState, useRef } from 'react'

const NAMES = ['Ahmed', 'Fatima', 'Youssef', 'Amina', 'Karim', 'Sara', 'Mohamed', 'Nadia', 'Bilal', 'Yasmine', 'Hamza', 'Meriem']
const WILAYAS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Blida', 'Tlemcen', 'Sétif', 'Batna', 'Béjaïa', 'Tizi Ouzou']
const PRODUCTS = [
  'Kit phares LED', 'Croquettes Royal Canin', 'Trottinette électrique',
  'Poussette bébé', 'Tableau décoratif', 'Coussin orthopédique chat',
  'Batterie de voiture', 'Jouets d\'éveil', 'Lampe de salon', 'Collier GPS chien',
  'Siège auto bébé', 'Pneus Michelin', 'Aquarium 60L', 'Lit enfant Montessori',
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomMinutes(): number {
  return Math.floor(Math.random() * 12) + 1
}

interface Notification {
  id: number
  text: string
}

export default function SocialProofTicker() {
  const [notif, setNotif] = useState<Notification | null>(null)
  const [visible, setVisible] = useState(false)
  const idRef = useRef(0)

  useEffect(() => {
    let id = idRef.current

    function show() {
      const name = randomItem(NAMES)
      const wilaya = randomItem(WILAYAS)
      const product = randomItem(PRODUCTS)
      const mins = randomMinutes()

      id++
      idRef.current = id
      setNotif({
        id,
        text: `${name} de ${wilaya} a commandé "${product}" il y a ${mins} min`,
      })
      setVisible(true)

      setTimeout(() => setVisible(false), 4000)
    }

    // First show after 8 seconds, then every 25–40 seconds
    const initial = setTimeout(show, 8000)
    const interval = setInterval(show, 25000 + Math.random() * 15000)

    return () => {
      clearTimeout(initial)
      clearInterval(interval)
    }
  }, [])

  if (!notif) return null

  return (
    <div
      className={`fixed bottom-32 sm:bottom-24 left-4 z-40 max-w-xs transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-4 py-3 flex items-start gap-3">
        <span className="text-2xl flex-shrink-0">🛒</span>
        <div>
          <p className="text-xs text-gray-800 font-semibold leading-snug">{notif.text}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Achat vérifié</p>
        </div>
      </div>
    </div>
  )
}
