interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
  dark?: boolean
}

export default function Logo({ size = 'md', variant = 'full', dark = false }: LogoProps) {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36

  const icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background tile */}
      <rect width="40" height="40" rx="10" fill="#4f46e5" />

      {/* Casbah arch door — main arch */}
      <path
        d="M20 8 C13 8 10 13 10 18 L10 32 L30 32 L30 18 C30 13 27 8 20 8 Z"
        fill="#6366f1"
      />

      {/* Inner arch cutout (door opening) */}
      <path
        d="M20 15 C16.5 15 14 17.5 14 21 L14 32 L26 32 L26 21 C26 17.5 23.5 15 20 15 Z"
        fill="#4f46e5"
      />

      {/* Door arch hole */}
      <path
        d="M20 16 C17.2 16 15 18.2 15 21 L15 32 L25 32 L25 21 C25 18.2 22.8 16 20 16 Z"
        fill="white"
        opacity="0.15"
      />

      {/* Left window */}
      <ellipse cx="13" cy="22" rx="2" ry="2.5" fill="white" opacity="0.5" />

      {/* Right window */}
      <ellipse cx="27" cy="22" rx="2" ry="2.5" fill="white" opacity="0.5" />

      {/* Roofline decorative dots */}
      <circle cx="20" cy="6" r="1.5" fill="#a5b4fc" />
      <circle cx="14" cy="8" r="1" fill="#a5b4fc" opacity="0.7" />
      <circle cx="26" cy="8" r="1" fill="#a5b4fc" opacity="0.7" />

      {/* Ground line */}
      <rect x="8" y="32" width="24" height="2" rx="1" fill="white" opacity="0.3" />
    </svg>
  )

  if (variant === 'icon') return icon

  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'

  return (
    <span className="flex items-center gap-2 select-none">
      {icon}
      <span className={`font-black tracking-tight leading-none ${textSize}`}>
        <span className={dark ? 'text-white' : 'text-gray-900'}>Casbah</span>
        <span className="text-indigo-500"> Store</span>
      </span>
    </span>
  )
}
