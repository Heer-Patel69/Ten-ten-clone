import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Manrope, Inter } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';

const playfair = Playfair_Display({ 
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic']
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'BLINK — Meet. Talk. Disappear.',
  description: 'Meet new people, talk instantly, and watch messages vanish. Add friends with a 4-digit code and start chatting — your secrets are safe.',
  keywords: ['blink', 'ephemeral chat', 'disappearing messages', 'voice chat', 'pwa', 'anonymous'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BLINK',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#ed3379',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BLINK" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
      </head>
      <body className={`${playfair.variable} ${manrope.variable} ${inter.variable}`}>
        <div className="bg-mesh" />
        <SocketProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
