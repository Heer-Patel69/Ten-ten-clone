'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  // Do not show on landing page or auth pages
  const hiddenRoutes = ['/', '/login', '/register'];
  if (hiddenRoutes.includes(pathname)) return null;

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[400px] px-6">
      <div className="glass-surface rounded-full flex justify-between items-center px-6 py-4 border border-white/40 shadow-lg bg-white/60">
        
        <Link href="/explore" className={`flex flex-col items-center gap-1 ${pathname === '/explore' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
          <span className="material-symbols-outlined text-[24px]">explore</span>
        </Link>
        
        <Link href="/add-friend" className={`flex flex-col items-center gap-1 ${pathname === '/add-friend' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
          <span className="material-symbols-outlined text-[24px]">group_add</span>
        </Link>

        {/* Action Button Center */}
        <Link href="/talk" className="bg-primary hover:bg-primary/90 text-white shadow-md shadow-primary/30 w-12 h-12 rounded-full flex items-center justify-center border-2 border-white transition-transform active:scale-95">
          <span className="material-symbols-outlined text-[28px] fill-icon">forum</span>
        </Link>

        <Link href="/notifications" className={`flex flex-col items-center gap-1 ${pathname === '/notifications' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
          <span className="material-symbols-outlined text-[24px]">notifications</span>
        </Link>

        <Link href="/profile" className={`flex flex-col items-center gap-1 ${pathname === '/profile' ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
          <span className="material-symbols-outlined text-[24px]">person</span>
        </Link>
        
      </div>
    </nav>
  );
}
