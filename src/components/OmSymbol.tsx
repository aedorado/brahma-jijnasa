import React from 'react'

interface OmSymbolProps {
  size?: number | string
  className?: string
  glow?: boolean
  style?: React.CSSProperties
}

/**
 * Sacred Vedic Om (ॐ) component.
 * Uses authentic Devanagari typography with a luminous golden/saffron gradient
 * and radial aura, avoiding the OS emoji square glyph.
 */
export function OmSymbol({ size = 64, className = '', glow = true, style = {} }: OmSymbolProps) {
  const pixelSize = typeof size === 'number' ? size : parseInt(size as string, 10) || 64

  return (
    <div
      className={`om-symbol-container ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        userSelect: 'none',
        lineHeight: 1,
        ...style,
      }}
    >
      {/* Soft golden aura */}
      {glow && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: `${pixelSize * 1.5}px`,
            height: `${pixelSize * 1.5}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(242, 128, 20, 0.38) 0%, rgba(240, 199, 78, 0.18) 45%, transparent 70%)',
            filter: 'blur(12px)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />
      )}

      {/* Classical Devanagari Om with Luminous Golden Saffron Sheen */}
      <span
        style={{
          position: 'relative',
          zIndex: 1,
          fontFamily: "'Tiro Devanagari Sanskrit', 'Noto Serif Devanagari', 'Sanskrit Text', Georgia, serif",
          fontSize: typeof size === 'number' ? `${size}px` : size,
          lineHeight: 1,
          fontWeight: 700,
          background: 'linear-gradient(135deg, #FFF0A8 0%, #F59E0B 45%, #E65100 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          filter: 'drop-shadow(0 2px 12px rgba(242, 128, 20, 0.55)) drop-shadow(0 0 24px rgba(240, 199, 78, 0.35))',
          display: 'inline-block',
          transform: 'translateY(-2px)',
        }}
      >
        ॐ
      </span>
    </div>
  )
}
