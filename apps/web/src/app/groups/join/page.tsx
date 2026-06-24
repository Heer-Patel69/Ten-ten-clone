'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function JoinGroupPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || code.length !== 4) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ code })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push('/friends');
      } else {
        setError(data.error || 'Failed to join group');
      }
    } catch (err) {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ padding: 'var(--space-xl) var(--space-md)' }}>
      <header className="page-header" style={{ marginBottom: 'var(--space-xl)' }}>
        <h1 className="page-title" style={{ fontFamily: 'var(--font-display)', textAlign: 'center' }}>Join Group</h1>
      </header>

      <form onSubmit={handleJoin} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {error && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>{error}</div>}
        
        <div className="form-group">
          <label className="form-label" style={{ textAlign: 'center' }}>Enter 4-Digit Code</label>
          <input 
            type="text" 
            className="form-input" 
            placeholder="0000" 
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            style={{ fontSize: 'var(--fs-3xl)', letterSpacing: '0.25em', fontFamily: 'var(--font-numbers)', textAlign: 'center' }}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || code.length !== 4}>
          {loading ? 'Joining...' : 'Join Group'}
        </button>
        <Link href="/friends" className="btn" style={{ textAlign: 'center' }}>Cancel</Link>
      </form>
    </div>
  );
}
