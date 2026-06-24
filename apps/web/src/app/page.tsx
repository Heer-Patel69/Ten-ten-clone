"use client";

import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="mesh-bg min-h-screen overflow-hidden text-text-primary font-primary selection:bg-primary/20">
      {/* Top App Bar */}
      <header className="fixed top-0 w-full z-50 glass-surface border-b-0 h-20 flex justify-between items-center px-8 md:px-16">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary text-[32px]">blur_on</span>
          <h1 className="font-display font-bold text-2xl tracking-tighter text-primary">BLINK</h1>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-text-secondary font-medium">
          <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
          <Link href="#security" className="hover:text-primary transition-colors">Security</Link>
          <Link href="#about" className="hover:text-primary transition-colors">About</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden md:block font-medium text-text-primary hover:text-primary transition-colors">Log In</Link>
          <Link href="/register" className="bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-full font-semibold shadow-md shadow-primary/30 transition-all active:scale-95">
            Get App
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 md:px-16 max-w-7xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 glass-surface px-4 py-1.5 rounded-full mb-8 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="font-semibold text-xs tracking-widest text-primary uppercase">v2.0 Liquid Glass Live</span>
        </div>

        <h1 className="font-display text-5xl md:text-7xl font-bold tracking-tight mb-6 max-w-4xl leading-tight">
          Meet. Talk. <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-light">Disappear.</span>
        </h1>
        
        <p className="text-text-secondary text-lg md:text-xl max-w-2xl mb-10 leading-relaxed">
          The ephemeral communication protocol designed for absolute privacy. No traces, no logs, just pure connection.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <Link href="/register" className="bg-text-primary text-white px-8 py-4 rounded-full font-semibold text-lg hover:bg-black transition-colors shadow-lg shadow-black/10">
            Get Started Free
          </Link>
          <Link href="#learn-more" className="glass-surface text-text-primary px-8 py-4 rounded-full font-semibold text-lg hover:bg-white/80 transition-colors">
            Learn More
          </Link>
        </div>

        {/* Central Hero Image / Card */}
        <div className="relative w-full max-w-4xl aspect-video rounded-[32px] glass-surface p-2 shadow-2xl shadow-primary/10 mb-24 overflow-hidden border-white/60">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent-light/5"></div>
          <div className="w-full h-full rounded-[24px] bg-white/40 border border-white/50 overflow-hidden flex items-center justify-center relative">
            
            {/* Abstract floating shapes behind lock */}
            <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-[80px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-secondary/20 rounded-full blur-[80px]"></div>

            <div className="flex flex-col items-center justify-center z-10 glass-surface px-12 py-10 rounded-[32px] shadow-xl">
              <span className="material-symbols-outlined text-[80px] text-primary mb-4 drop-shadow-md">lock</span>
              <h3 className="text-2xl font-bold text-text-primary tracking-tight">Connection Secured</h3>
              <p className="text-text-secondary mt-2">Zero-knowledge end-to-end encryption</p>
            </div>
            
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full text-left" id="features">
          <div className="glass-surface p-8 rounded-[24px] hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-white/80 border border-white flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-primary">visibility_off</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Silent Architecture</h3>
            <p className="text-text-secondary leading-relaxed">
              Our infrastructure is designed to forget. Messages are wiped from memory the moment they are read.
            </p>
          </div>

          <div className="glass-surface p-8 rounded-[24px] hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-white/80 border border-white flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-primary">enhanced_encryption</span>
            </div>
            <h3 className="text-xl font-bold mb-3">E2E Encryption</h3>
            <p className="text-text-secondary leading-relaxed">
              Only you and your recipient hold the keys. Not even we can see what you send.
            </p>
          </div>

          <div className="glass-surface p-8 rounded-[24px] hover:-translate-y-1 transition-transform duration-300">
            <div className="w-12 h-12 rounded-xl bg-white/80 border border-white flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-primary">timer</span>
            </div>
            <h3 className="text-xl font-bold mb-3">Self-Destructing Media</h3>
            <p className="text-text-secondary leading-relaxed">
              Photos and voice notes vanish securely. Set your own timers for ultimate control over your data.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
