interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'full' | 'icon'
  dark?: boolean
}

export default function Logo({ size = 'md', variant = 'full', dark = false }: LogoProps) {
  const iconSize = size === 'sm' ? 28 : size === 'lg' ? 44 : 36

  // Colors: on dark bg use white icon; on light bg use indigo icon
  const houseColor = dark ? 'white' : '#3730a3'
  const bagColor   = dark ? 'white' : '#3730a3'

  const icon = (
    <svg
      width={iconSize}
      height={iconSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Roof / chevron — open bottom */}
      <path
        d="M12 46 L50 12 L88 46"
        stroke={houseColor}
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Left wall */}
      <rect x="14" y="44" width="13" height="38" rx="3" fill={houseColor} />

      {/* Right wall */}
      <rect x="73" y="44" width="13" height="38" rx="3" fill={houseColor} />

      {/* Bottom bar */}
      <rect x="14" y="79" width="72" height="3" rx="1.5" fill={houseColor} />

      {/* Arch opening — two rounded pillars + arch top */}
      <path
        d="M33 82 L33 60 Q33 48 50 48 Q67 48 67 60 L67 82"
        stroke={houseColor}
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Shopping bag body */}
      <rect x="40" y="60" width="20" height="18" rx="3" fill={bagColor} />

      {/* Shopping bag handle */}
      <path
        d="M44 60 Q44 54 50 54 Q56 54 56 60"
        stroke={bagColor}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Orange accent dot */}
      <circle cx="72" cy="24" r="7" fill="#f59e0b" />
    </svg>
  )

  if (variant === 'icon') return icon

  const textSize =
    size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'

  return (
    <span className="flex items-center gap-2 select-none">
      {icon}
      <span className={`font-black tracking-tight leading-none ${textSize}`}>
        <span className={dark ? 'text-white' : 'text-gray-900'}>Store</span>
        <span className={dark ? 'text-amber-400' : 'text-indigo-600'}>Dz</span>
      </span>
    </span>
  )
}
