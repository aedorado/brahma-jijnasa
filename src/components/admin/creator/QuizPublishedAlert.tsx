'use client'

import Link from 'next/link'

interface QuizPublishedAlertProps {
  publishedId: string
  title: string
  copiedLink: boolean
  onCopyLink: () => void
  onSwitchToCatalog: () => void
}

export function QuizPublishedAlert({
  publishedId,
  title,
  copiedLink,
  onCopyLink,
  onSwitchToCatalog,
}: QuizPublishedAlertProps) {
  return (
    <div
      className="card-gold animate-fadeIn"
      style={{
        padding: '1.75rem',
        marginBottom: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
            <span className="badge badge-success">🎉 Quiz Published to Supabase CMS</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
              Immediately live for live classroom & self-study
            </span>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{title}</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
            URL: <code style={{ color: 'var(--color-gold)' }}>/q/{publishedId}</code>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCopyLink}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>{copiedLink ? '✓ Copied' : '🔗 Copy Student Link'}</span>
          </button>
          <Link
            href={`/q/${publishedId}`}
            target="_blank"
            className="btn btn-primary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>👁 Play Test Quiz ↗</span>
          </Link>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onSwitchToCatalog}
            style={{ border: '1px solid var(--color-border)' }}
          >
            Go to Catalog →
          </button>
        </div>
      </div>
    </div>
  )
}
