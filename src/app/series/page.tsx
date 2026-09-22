'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import type { QuizSeries } from '@/types/series'
import { DEFAULT_64_PRINCIPLES_SERIES } from '@/lib/series-data'

function formatDateRange(startIso?: string, endIso?: string): string {
  if (!startIso) return 'Upcoming'
  try {
    const start = new Date(startIso)
    const end = endIso ? new Date(endIso) : null
    const startStr = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(start)

    if (end) {
      const endStr = new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      }).format(end)
      return `${startStr} – ${endStr}`
    }
    return startStr
  } catch {
    return 'Upcoming'
  }
}

export default function SeriesDirectoryPage() {
  const { t } = useLanguage()
  const [seriesList, setSeriesList] = useState<QuizSeries[]>([DEFAULT_64_PRINCIPLES_SERIES])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await fetch('/api/series')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            setSeriesList(data)
          }
        }
      } catch (err) {
        console.warn('Could not fetch series list:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSeries()
  }, [])

  return (
    <div style={{ padding: '2.5rem 0 6rem' }}>
      <div className="container">
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>
          <Link href="/" style={{ color: 'var(--color-muted)' }}>Home</Link>
          <span style={{ margin: '0 0.5rem', color: 'var(--color-border)' }}>/</span>
          <span style={{ color: 'var(--color-gold)', fontWeight: 600 }}>All Scripture Series</span>
        </div>

        {/* Hero Section */}
        <div
          className="card-gold animate-fadeIn text-center"
          style={{
            padding: '3rem 2rem',
            marginBottom: '3rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.35rem 0.9rem',
              borderRadius: '9999px',
              background: 'rgba(240, 199, 78, 0.15)',
              border: '1px solid rgba(240, 199, 78, 0.35)',
              fontSize: '0.8rem',
              fontWeight: 700,
              color: 'var(--color-gold)',
              marginBottom: '1rem',
              textTransform: 'uppercase',
            }}
          >
            🪷 {t.series.featuredBadge}
          </span>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.75rem', lineHeight: 1.25 }}>
            {t.series.allSeriesTitle}
          </h1>
          <p className="text-muted" style={{ maxWidth: 640, margin: '0 auto', fontSize: '0.95rem', lineHeight: 1.6 }}>
            {t.series.allSeriesSubtitle}
          </p>
        </div>

        {/* Series List Grid */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 800 }}>
              {t.series.activeSeries}
            </h2>
            <span className="badge badge-gold" style={{ fontSize: '0.8rem' }}>
              {seriesList.length} {seriesList.length === 1 ? 'Series Available' : 'Series Available'}
            </span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <div className="spinner-gold" />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
              {seriesList.map((s) => {
                const isOngoing = s.start_date && new Date() >= new Date(s.start_date) && (!s.end_date || new Date() <= new Date(s.end_date))
                const isUpcoming = s.start_date && new Date() < new Date(s.start_date)

                return (
                  <div
                    key={s.id || s.slug}
                    className="card card-gold hover-glow animate-scaleIn"
                    style={{
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      borderRadius: 16,
                      border: '1px solid var(--color-gold-border, rgba(240, 199, 78, 0.25))',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            background: isOngoing
                              ? 'rgba(74, 222, 128, 0.15)'
                              : isUpcoming
                              ? 'rgba(240, 199, 78, 0.15)'
                              : 'rgba(255,255,255,0.05)',
                            color: isOngoing
                              ? '#4ade80'
                              : isUpcoming
                              ? 'var(--color-gold)'
                              : 'var(--color-muted)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                          }}
                        >
                          {isOngoing ? '🟢 Ongoing Daily Sadhana' : isUpcoming ? '⏳ Upcoming Kārtika Series' : '📚 Series'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                          {s.total_days} {t.series.roundsCount}
                        </span>
                      </div>

                      {/* Title & Subtitle */}
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.4rem', lineHeight: 1.35 }}>
                        {s.title}
                      </h3>
                      {s.subtitle && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600, marginBottom: '0.75rem' }}>
                          {s.subtitle}
                        </p>
                      )}

                      {/* Description */}
                      <p
                        className="text-muted"
                        style={{
                          fontSize: '0.85rem',
                          lineHeight: 1.5,
                          marginBottom: '1.5rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {s.description}
                      </p>
                    </div>

                    {/* Footer Info & Action Button */}
                    <div style={{ paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                        <span>📅 {formatDateRange(s.start_date, s.end_date)}</span>
                        <span>⚡ 1 Round / 24h</span>
                      </div>
                      <Link
                        href={`/series/${s.slug}`}
                        className="btn btn-primary btn-md w-full"
                        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                        id={`explore-series-${s.slug}`}
                      >
                        <span>{t.series.exploreSeries}</span>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
