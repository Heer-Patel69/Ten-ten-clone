'use client';

import { usePathname } from 'next/navigation';

export default function TopNav() {
  const pathname = usePathname();

  const hiddenRoutes = ['/', '/login', '/register'];
  if (hiddenRoutes.includes(pathname) || pathname.startsWith('/chat') || pathname.startsWith('/talk')) return null;

  return (
    <header className="fixed top-0 left-0 w-full z-40 card" style={{
      borderRadius: 0,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: '1rem',
      backgroundColor: 'var(--color-bg-glass)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)'
    }}>
      <h1 style={{
        fontFamily: 'var(--font-display)',
        color: 'var(--color-text-primary)',
        fontSize: '1.25rem',
        margin: 0,
        fontStyle: 'italic',
        letterSpacing: '0.05em'
      }}>
        Blink<span style={{ color: 'var(--color-accent)' }}>Meet</span>
      </h1>
    </header>
  );
}
