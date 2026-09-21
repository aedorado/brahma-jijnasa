'use client'

import { useState } from 'react'

interface UserAvatarProps {
  name?: string | null
  url?: string | null
  size?: number
  border?: string
  className?: string
  style?: React.CSSProperties
}

export function UserAvatar({
  name,
  url,
  size = 28,
  border = '1px solid var(--color-border)',
  className = '',
  style = {},
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const initial = (name || 'D').trim().charAt(0).toUpperCase()

  if (url && !imgError) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border,
          flexShrink: 0,
          display: 'inline-block',
          verticalAlign: 'middle',
          ...style,
        }}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, rgba(212,175,55,0.2) 0%, rgba(232,118,10,0.15) 100%)',
        border: border || '1px solid var(--color-border-gold)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 800,
        fontSize: Math.max(10, Math.round(size * 0.45)),
        color: 'var(--color-gold)',
        flexShrink: 0,
        verticalAlign: 'middle',
        ...style,
      }}
      title={name || 'User'}
    >
      {initial}
    </div>
  )
}
