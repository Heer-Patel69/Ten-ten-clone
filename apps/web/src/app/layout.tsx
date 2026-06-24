import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Manrope, Inter } from 'next/font/google';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';
import TopNav from '@/components/TopNav';
import BottomNav from '@/components/BottomNav';

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
  title: 'Blink Meet Chat Disappear',
  description: 'Talk to your friends instantly — like a walkie-talkie on your phone. Add friends with a 4-digit code and start chatting live.',
  keywords: ['walkie-talkie', 'voice chat', 'pwa', 'live audio', 'friends', 'blink', 'meet', 'chat', 'disappear'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Blink',
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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="WalkieTalk" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
      </head>
      <body className={`${playfair.variable} ${manrope.variable} ${inter.variable}`}>
        <div className="bg-mesh" />
        <SocketProvider>
          <AuthProvider>
            <TopNav />
            {children}
            <BottomNav />
          </AuthProvider>
        </SocketProvider>
      </body>
    </html>
  );
}
