import type { Metadata } from 'next'
import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Brahma Jijñāsā — Sanātana Dharma Quiz Platform',
  description:
    'An inquiry into Brahman through scripture. Test your knowledge of the Bhagavad Gītā, Upaniṣads, Vedas, Mahābhārata, and more.',
  keywords: ['Sanātana Dharma', 'Bhagavad Gita', 'Vedas', 'Upanishads', 'Hindu scripture quiz'],
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'Brahma Jijñāsā',
    description: 'अथातो ब्रह्म जिज्ञासा — Now, therefore, the inquiry into Brahman.',
    type: 'website',
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
