import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import { SocketProvider } from '@/contexts/SocketContext';

export const metadata: Metadata = {
  title: 'WalkieTalk — Live Voice Chat',
  description: 'Talk to your friends instantly — like a walkie-talkie on your phone. Add friends with a 4-digit code and start chatting live.',
  keywords: ['walkie-talkie', 'voice chat', 'pwa', 'live audio', 'friends'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WalkieTalk',
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
        <meta name="apple-mobile-web-app-title" content="WalkieTalk" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="HandheldFriendly" content="true" />
        <meta name="MobileOptimized" content="width" />
      </head>
      <body>
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
