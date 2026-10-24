'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Image from 'next/image'
import { useLanguage } from '@/context/LanguageContext'
import { AMAZON_STORES, BOOK_QR_IMAGE } from './BookPurchaseBanner'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function BookPurchaseModal({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false)
  const { language } = useLanguage()
  const [selectedStoreCode, setSelectedStoreCode] = useState<string>(
    language === 'pt' ? 'BR' : 'IN'
  )
  const [showAllStores, setShowAllStores] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (!isOpen) return
    const original = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = original
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const selectedStore = AMAZON_STORES.find(s => s.code === selectedStoreCode) || AMAZON_STORES[0]

  const isHindi = language === 'hi'
  const isPt = language === 'pt'

  const labels = {
    badge: isHindi ? '📖 स्वाध्याय ग्रंथ' : isPt ? '📖 Livro Sagrado' : '📖 Sacred Literature',
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
      ? 'इस ग्रंथ में समुदाय, सहिष्णुता, सेवा-भाव और आध्यात्मिक सौहार्द के लिए अत्यंत महत्वपूर्ण 64 सिद्धांत एवं उनके विस्तृत अमृतमय चिंतन प्रस्तुत किए गए हैं।'
      : isPt
      ? 'Neste volume sagrado, Sua Santidade Bhakti Tirtha Swami ilumina os 64 princípios eternos de harmonia comunitária e serviço dedicado dados por Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura.'
      : 'In this sacred volume, His Holiness Bhakti Tirtha Swami illuminates the 64 foundational principles given by Śrīla Bhaktisiddhānta Sarasvatī Ṭhākura for spiritual community development, selfless cooperation, and loving service.',
    scanTitle: isHindi ? 'फोन कैमरे से स्कैन करें' : isPt ? 'Escaneie com a câmera do celular' : 'Scan to Order on Mobile',
    scanSub: isHindi ? 'सीधे अमेज़न पेज पर जाने के लिए' : isPt ? 'Para abrir a página na Amazon' : 'Point smartphone camera at the code below',
    orderBtn: isHindi ? `अमेज़न पर खरीदें (${selectedStore.flag} ${selectedStore.name}) ↗` : isPt ? `Comprar na Amazon (${selectedStore.flag} ${selectedStore.name}) ↗` : `Open on Amazon (${selectedStore.flag} ${selectedStore.name}) ↗`,
    chooseStore: isHindi ? 'अमेज़न स्टोर चुनें:' : isPt ? 'Selecione a loja Amazon:' : 'Select Amazon Store:',
    close: isHindi ? 'बंद करें' : isPt ? 'Fechar' : 'Close',
  }

  return createPortal(
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(12, 9, 24, 0.88)',
        backdropFilter: 'blur(10px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.25rem',
      }}
      onClick={onClose}
    >
      <div
        className="book-purchase-modal animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="btn btn-ghost btn-sm"
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            padding: '0.35rem 0.65rem',
            borderRadius: 8,
            color: 'var(--color-muted)',
            fontSize: '0.85rem',
          }}
          aria-label="Close modal"
        >
          ✕
        </button>

        {/* Badge */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--color-gold)',
              background: 'rgba(240, 199, 78, 0.15)',
              border: '1px solid rgba(240, 199, 78, 0.3)',
              padding: '0.25rem 0.75rem',
              borderRadius: 9999,
            }}
          >
            {labels.badge}
          </span>
        </div>

        {/* Title */}
        <h3 className="book-purchase-title" style={{ fontSize: '1.35rem', fontWeight: 900, marginBottom: '0.35rem' }}>
          {labels.title}
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--color-gold)', fontWeight: 600, marginBottom: '0.35rem' }}>
          {labels.subtitle}
        </p>
        <p className="book-purchase-author" style={{ fontSize: '0.8rem', marginBottom: '1.25rem' }}>
          {labels.author}
        </p>

        {/* QR Code Highlight Area */}
        <div
          style={{
            background: 'var(--color-surface-2)',
            border: '1px solid var(--color-border-gold)',
            borderRadius: 14,
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '1.25rem',
            textAlign: 'center',
          }}
        >
          <div
            className="book-qr-box"
            style={{
              marginBottom: '0.75rem',
            }}
          >
            <Image
              src={BOOK_QR_IMAGE}
              alt="Scan QR code to buy 64 Principles Book on Amazon"
              width={150}
              height={150}
              style={{ display: 'block', borderRadius: 8 }}
              priority
            />
          </div>
          <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gold)', marginBottom: '0.15rem' }}>
            📷 {labels.scanTitle}
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {labels.scanSub}
          </p>
        </div>

        {/* Store Selector */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {labels.chooseStore}
          </p>
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
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
              {showAllStores ? '▲ Less' : `+${AMAZON_STORES.length - 6} More`}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <a
            href={selectedStore.url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-lg w-full"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              fontSize: '0.92rem',
              borderRadius: 10,
            }}
          >
            <span>🛒</span> {labels.orderBtn}
          </a>

          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm w-full"
            style={{ color: 'var(--color-muted)', fontSize: '0.82rem' }}
          >
            {labels.close}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
