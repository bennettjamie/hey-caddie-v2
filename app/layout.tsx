import './globals.css'
import type { Metadata, Viewport } from 'next'
import { VoiceProvider } from '@/context/VoiceContext'
import { GameProvider } from '@/context/GameContext'

export const metadata: Metadata = {
    title: 'Hey Caddy',
    description: 'Voice-activated Disc Golf Caddy',
    manifest: '/manifest.json',
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: '#000000',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>
                <VoiceProvider>
                    <GameProvider>
                        {children}
                    </GameProvider>
                </VoiceProvider>
            </body>
        </html>
    )
}
