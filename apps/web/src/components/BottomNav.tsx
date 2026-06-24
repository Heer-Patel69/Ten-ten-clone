'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // Do not show on landing page or auth pages
  const hiddenRoutes = ['/', '/login', '/register'];
  if (hiddenRoutes.includes(pathname) || pathname.startsWith('/chat') || pathname.startsWith('/talk')) return null;

  return (
    <nav style={{
      position: 'fixed',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      width: '100%',
      maxWidth: '400px',
      padding: '0 1rem'
    }}>
      <div className="card" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0.75rem 1.5rem',
        borderRadius: '2rem',
        backgroundColor: 'var(--color-bg-tertiary)',
        border: '1px solid var(--color-border)'
      }}>
        
        <Link href="/explore" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: pathname === '/explore' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          textDecoration: 'none'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>explore</span>
        </Link>
        
        <Link href="/add-friend" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: pathname === '/add-friend' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          textDecoration: 'none'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>group_add</span>
        </Link>

        {/* Action Button Center */}
        <Link href="/friends" style={{
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-text-primary)',
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid var(--color-bg-tertiary)',
          boxShadow: '0 4px 10px var(--color-accent-glow)',
          transform: 'translateY(-10px)',
          textDecoration: 'none'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>forum</span>
        </Link>



        <Link href="/profile" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          color: pathname === '/profile' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
          textDecoration: 'none'
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person</span>
        </Link>
        
      </div>
    </nav>
  );
}
