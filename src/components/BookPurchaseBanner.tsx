'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useLanguage } from '@/context/LanguageContext'

interface Props {
  variant?: 'card' | 'compact' | 'post-quiz'
  className?: string
}

export interface AmazonStore {
  code: string
  name: string
  flag: string
  url: string
}

export const AMAZON_STORES: AmazonStore[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', url: 'https://link.amazon/B0eg8BYaj' },
  { code: 'US', name: 'USA', flag: '🇺🇸', url: 'https://www.amazon.com/dp/B005F9I5TO' },
  { code: 'BR', name: 'Brazil (Brasil)', flag: '🇧🇷', url: 'https://www.amazon.com.br/dp/B005F9I5TO' },
  { code: 'GB', name: 'UK', flag: '🇬🇧', url: 'https://www.amazon.co.uk/dp/B005F9I5TO' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', url: 'https://www.amazon.ca/dp/B005F9I5TO' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', url: 'https://www.amazon.com.au/dp/B005F9I5TO' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', url: 'https://www.amazon.de/dp/B005F9I5TO' },
  { code: 'FR', name: 'France', flag: '🇫🇷', url: 'https://www.amazon.fr/dp/B005F9I5TO' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', url: 'https://www.amazon.it/dp/B005F9I5TO' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', url: 'https://www.amazon.es/dp/B005F9I5TO' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', url: 'https://www.amazon.nl/dp/B005F9I5TO' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', url: 'https://www.amazon.com.mx/dp/B005F9I5TO' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', url: 'https://www.amazon.co.jp/dp/B005F9I5TO' },
]

export const BOOK_AMAZON_URL = 'https://link.amazon/B0eg8BYaj'
export const BOOK_QR_IMAGE = '/64-principles-qr.png'

export function BookPurchaseBanner({ variant = 'card', className = '' }: Props) {
  const { language } = useLanguage()
  const [minimized, setMinimized] = useState(false)
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>(
    language === 'pt' ? 'BR' : 'IN'
  )
  const [showAllStores, setShowAllStores] = useState(false)

  const isHindi = language === 'hi'
  const isPt = language === 'pt'

  const selectedStore = AMAZON_STORES.find(s => s.code === selectedStoreCode) || AMAZON_STORES[0]

  const labels = {
    badge: isHindi
      ? '📖 प्रामाणिक स्वाध्याय ग्रंथ'
      : isPt
      ? '📖 Livro de Estudo Oficial'
      : '📖 Official Study Companion',
    title: 'Reflections on Sacred Teachings V',
    subtitle: isHindi
      ? 'श्रील भक्तिसिद्धांत सरस्वती ठाकुर के समाज निर्माण के 64 सिद्धांत'
      : isPt
      ? '64 Princípios de Harmonia Comunitária de Śrīla Bhaktisiddhānta'
      : 'Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura’s 64 Principles for Community',
    author: isHindi
      ? 'परम पूज्य भक्ति तीर्थ स्वामी महाराज द्वारा'
      : isPt
      ? 'Por Sua Santidade Bhakti Tirtha Swami'
      : 'By His Holiness Bhakti Tirtha Swami',
    desc: isHindi
      ? 'इस दैनिक प्रश्नोत्तरी की पूर्ण गहराई को समझने के लिए मूल पुस्तक का अध्ययन करें, जिसमें सभी 64 सिद्धांत एवं प्रामाणिक व्याख्याएं संकलित हैं।'
      : isPt
      ? 'Aprofunde sua reflexão diária com o livro original contendo todos os 64 princípios, comentários completos e instruções para a comunidade.'
      : 'Deepen your daily sadhana with the complete physical book containing all 64 original community principles, profound purports, and spiritual realizations.',
    scanPrompt: isHindi ? 'फोन कैमरे से स्कैन करें' : isPt ? 'Escaneie com a câmera do celular' : 'Scan with Phone Camera',
    orderBtn: isHindi ? `अमेज़न पर प्राप्त करें (${selectedStore.flag} ${selectedStore.name}) ↗` : isPt ? `Comprar na Amazon (${selectedStore.flag} ${selectedStore.name}) ↗` : `Order on Amazon (${selectedStore.flag} ${selectedStore.name}) ↗`,
    chooseRegion: isHindi ? 'क्षेत्र / देश चुनें:' : isPt ? 'Escolha sua região / país:' : 'Change Country / Store:',
    moreStores: isHindi ? 'अन्य अंतर्राष्ट्रीय अमेज़न स्टोर' : isPt ? 'Outras lojas internacionais' : 'Other International Stores',
    hide: isHindi ? 'छिपाएं' : isPt ? 'Ocultar' : 'Hide',
    show: isHindi ? 'पुस्तक विवरण देखें' : isPt ? 'Ver Livro' : 'View Book Companion',
    postQuizPrompt: isHindi
      ? '🌺 आज के सिद्धांत से प्रेरित हुए? मूल ग्रंथ से और गहराई से अध्ययन करें।'
      : isPt
      ? '🌺 Inspirado pelo princípio de hoje? Mergulhe ainda mais fundo na obra original.'
      : '🌺 Inspired by today’s study? Immerse deeper into the complete teachings in the original book.',
  }

  // If minimized in card mode
  if (minimized && variant === 'card') {
    return (
      <div
        className={`animate-fadeIn ${className}`}
        style={{
          background: 'rgba(240, 199, 78, 0.05)',
          border: '1px dashed rgba(240, 199, 78, 0.3)',
          borderRadius: 12,
          padding: '0.65rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '1.1rem' }}>📖</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--color-gold)', fontWeight: 600 }}>
            {labels.title} — {labels.badge}
          </span>
        </div>
        <button
          onClick={() => setMinimized(false)}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.78rem', color: 'var(--color-gold)' }}
        >
          {labels.show} ↓
        </button>
      </div>
    )
  }

  // Variant: Post-Quiz (Appears on ScoreCard)
  // Variant: Post-Quiz (Appears on ScoreCard)
  if (variant === 'post-quiz') {
    return (
      <div
        className={`book-purchase-card animate-fadeIn ${className}`}
        style={{
          padding: '1.5rem',
          margin: '1.5rem 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-gold)',
              background: 'rgba(240, 199, 78, 0.15)',
              padding: '0.2rem 0.6rem',
              borderRadius: 9999,
              border: '1px solid rgba(240, 199, 78, 0.3)',
            }}
          >
            {labels.badge}
          </span>
        </div>

        <p style={{ fontSize: '0.92rem', color: 'var(--color-text)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
          {labels.postQuizPrompt}
        </p>

        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1.25rem',
            flexWrap: 'wrap',
          }}
        >
          {/* QR Code Container */}
          <a
            href={selectedStore.url}
            target="_blank"
            rel="noopener noreferrer"
            className="book-qr-box"
            style={{ textDecoration: 'none', cursor: 'pointer' }}
            title={`Scan QR or click to open ${selectedStore.name} Amazon store`}
          >
            <Image
              src={BOOK_QR_IMAGE}
              alt="Scan QR code to buy 64 Principles Book on Amazon"
              width={110}
              height={110}
              style={{ display: 'block', borderRadius: 6 }}
              priority
            />
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                color: '#1a102f',
                marginTop: '4px',
                textAlign: 'center',
                letterSpacing: '0.02em',
              }}
            >
              {labels.scanPrompt}
            </span>
          </a>

          {/* Book Info & Direct Button */}
          <div style={{ flex: 1, minWidth: 220 }}>
            <h4 className="book-purchase-title" style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.2rem' }}>
              {labels.title}
            </h4>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-gold)', fontWeight: 600, marginBottom: '0.35rem' }}>
              {labels.subtitle}
            </p>
            <p className="book-purchase-author" style={{ fontSize: '0.78rem', marginBottom: '0.8rem' }}>
              {labels.author}
            </p>

            {/* Country Selector Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--color-muted)' }}>Store:</span>
              {(showAllStores ? AMAZON_STORES : AMAZON_STORES.slice(0, 5)).map(s => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setSelectedStoreCode(s.code)}
                  className={`book-store-pill ${selectedStoreCode === s.code ? 'selected' : ''}`}
                  title={`${s.name} (${s.code})`}
                >
                  {s.flag} {s.code}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAllStores(prev => !prev)}
                className="book-store-more-btn"
              >
                {showAllStores ? '▲ Less' : `+${AMAZON_STORES.length - 5} More`}
              </button>
            </div>

            <a
              href={selectedStore.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.82rem',
                padding: '0.55rem 1.15rem',
                borderRadius: 8,
              }}
            >
              <span>🛒</span> {labels.orderBtn}
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Variant: Standard Card (Used on Series Principles Tab)
  return (
    <div
      className={`book-purchase-card animate-fadeIn ${className}`}
      style={{
        padding: '1.75rem',
        marginBottom: '2rem',
      }}
    >
      {/* Top Header Row with Minimize Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.75rem',
            borderRadius: 9999,
            background: 'rgba(240, 199, 78, 0.15)',
            border: '1px solid rgba(240, 199, 78, 0.3)',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: 'var(--color-gold)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}
        >
          {labels.badge}
        </span>

        <button
          onClick={() => setMinimized(true)}
          className="btn btn-ghost btn-sm"
          style={{
            padding: '0.2rem 0.5rem',
            fontSize: '0.72rem',
            color: 'var(--color-muted)',
            opacity: 0.8,
          }}
          title="Minimize banner"
        >
          {labels.hide} ✕
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.75rem',
          alignItems: 'center',
        }}
      >
        {/* Left Side: Editorial Context */}
        <div>
          <h3 className="book-purchase-title" style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.35rem' }}>
            {labels.title}
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-gold)', fontWeight: 600, marginBottom: '0.35rem' }}>
            {labels.subtitle}
          </p>
          <p className="book-purchase-author" style={{ fontSize: '0.82rem', marginBottom: '0.85rem' }}>
            {labels.author}
          </p>
          <p style={{ fontSize: '0.88rem', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '1.15rem' }}>
            {labels.desc}
          </p>

          {/* Region / Country selector */}
          <div style={{ marginBottom: '1.15rem' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {labels.chooseRegion}
            </p>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(showAllStores ? AMAZON_STORES : AMAZON_STORES.slice(0, 6)).map(s => (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => setSelectedStoreCode(s.code)}
                  className={`book-store-pill ${selectedStoreCode === s.code ? 'selected' : ''}`}
                  title={`${s.name} (${s.code})`}
                >
                  {s.flag} {s.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAllStores(prev => !prev)}
                className="book-store-more-btn"
              >
                {showAllStores ? '▲ Less' : `▼ More (${AMAZON_STORES.length - 6} Countries)`}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a
              href={selectedStore.url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: '0.88rem',
                padding: '0.65rem 1.35rem',
                borderRadius: 10,
              }}
            >
              <span>🛒</span> {labels.orderBtn}
            </a>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
              Selected: {selectedStore.flag} Amazon {selectedStore.name}
            </span>
          </div>
        </div>

        {/* Right Side: QR Code Frame */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-gold)',
            borderRadius: 14,
            padding: '1.25rem',
            textAlign: 'center',
          }}
        >
          <a
            href={selectedStore.url}
            target="_blank"
            rel="noopener noreferrer"
            className="book-qr-box"
            style={{ textDecoration: 'none', cursor: 'pointer', marginBottom: '0.65rem' }}
            title={`Scan QR or click to open ${selectedStore.name} Amazon store`}
          >
            <Image
              src={BOOK_QR_IMAGE}
              alt="Scan QR code with phone camera to buy 64 Principles Book on Amazon"
              width={140}
              height={140}
              style={{ display: 'block', borderRadius: 8 }}
              priority
            />
          </a>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '0.2rem' }}>
            📷 {labels.scanPrompt}
          </p>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-muted)', maxWidth: 220 }}>
            Open camera on your smartphone to instantly access Amazon
          </p>
        </div>
      </div>
    </div>
  )
}
