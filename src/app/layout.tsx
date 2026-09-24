import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  metadataBase: new URL('https://brahma-jijnasa.vercel.app'),
  title: 'Brahma Jijñāsā — Sanātana Dharma Quiz Platform',
  description:
    'An inquiry into Brahman through scripture. Test your knowledge of the Bhagavad Gītā, Upaniṣads, Vedas, Mahābhārata, and more.',
  keywords: ['Sanātana Dharma', 'Bhagavad Gita', 'Vedas', 'Upanishads', 'Hindu scripture quiz'],
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/logo.jpg', sizes: '1024x1024' },
    ],
  },
  openGraph: {
    title: 'Brahma Jijñāsā',
    description: 'अथातो ब्रह्म जिज्ञासा — Now, therefore, the inquiry into Brahman.',
    url: 'https://brahma-jijnasa.vercel.app',
    siteName: 'Brahma Jijñāsā',
    type: 'website',
    images: [
      {
        url: '/logo.jpg',
        width: 1024,
        height: 1024,
        alt: 'Brahma Jijñāsā — Vedic & Shastric Quiz Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brahma Jijñāsā',
    description: 'अथातो ब्रह्म जिज्ञासा — Now, therefore, the inquiry into Brahman.',
    images: ['/logo.jpg'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <main style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                  {children}
                </main>
                <Footer />
              </div>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
