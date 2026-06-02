import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#4f46e5',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Casbah arch building */}
        <svg width="24" height="24" viewBox="0 0 40 40" fill="none">
          <path d="M20 4 C12 4 8 10 8 16 L8 34 L32 34 L32 16 C32 10 28 4 20 4 Z" fill="#6366f1"/>
          <path d="M20 13 C16.5 13 13 16 13 20 L13 34 L27 34 L27 20 C27 16 23.5 13 20 13 Z" fill="#4f46e5"/>
          <path d="M20 14 C17 14 15 16.5 15 20 L15 34 L25 34 L25 20 C25 16.5 23 14 20 14 Z" fill="white" opacity="0.15"/>
          <ellipse cx="11" cy="22" rx="2" ry="2.5" fill="white" opacity="0.5"/>
          <ellipse cx="29" cy="22" rx="2" ry="2.5" fill="white" opacity="0.5"/>
          <rect x="6" y="34" width="28" height="2" rx="1" fill="white" opacity="0.3"/>
        </svg>
      </div>
    ),
    { ...size }
  )
}
