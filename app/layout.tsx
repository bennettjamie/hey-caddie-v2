import './globals.css'
import type { Metadata, Viewport } from 'next'
import { VoiceProvider } from '@/context/VoiceContext'
import { GameProvider } from '@/context/GameContext'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import OfflineSyncProvider from '@/components/OfflineSyncProvider'

export const metadata: Metadata = {
    title: 'Hey Caddy',
    description: 'Voice-activated Disc Golf Caddy',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Hey Caddy',
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        type: 'website',
        siteName: 'Hey Caddy',
        title: 'Hey Caddy - Voice-activated Disc Golf Caddy',
        description: 'Score your rounds using voice commands, manage bets, and track your game history.',
    },
    icons: {
        icon: '/icon-192x192.png',
        apple: '/icon-192x192.png',
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    themeColor: '#00f260',
    viewportFit: 'cover',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <head>
                {/* iOS PWA Meta Tags */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="Hey Caddy" />
                <link rel="apple-touch-icon" href="/icon-192x192.png" />
                <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
                <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />
                
                {/* Android/Chrome PWA Meta Tags */}
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="application-name" content="Hey Caddy" />
            </head>
            <body suppressHydrationWarning>
                <ErrorBoundary>
                    <VoiceProvider>
                        <GameProvider>
                            <OfflineSyncProvider>
                                {children}
                            </OfflineSyncProvider>
                        </GameProvider>
                    </VoiceProvider>
                </ErrorBoundary>
            </body>
        </html>
    )
}
