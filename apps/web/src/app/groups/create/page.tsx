'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateGroupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successCode, setSuccessCode] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/groups/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name, isPublic })
      });
      
      const data = await res.json();
      if (data.success) {
        setSuccessCode(data.data.code);
      } else {
        setError(data.error || 'Failed to create group');
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
        <h1 className="page-title" style={{ fontFamily: 'var(--font-display)', textAlign: 'center' }}>Create Group</h1>
      </header>

      {successCode ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-accent)', marginBottom: '1rem' }}>check_circle</span>
          <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '0.5rem' }}>Group Created!</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>Share this code with friends so they can join:</p>
          <div style={{ fontSize: 'var(--fs-3xl)', letterSpacing: '0.25em', fontFamily: 'var(--font-numbers)', color: 'var(--color-accent)', marginBottom: '2rem' }}>
            {successCode}
          </div>
          <Link href="/friends" className="btn btn-primary" style={{ width: '100%' }}>Go to Friends</Link>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {error && <div style={{ color: 'var(--color-danger)', fontSize: 'var(--fs-sm)', textAlign: 'center' }}>{error}</div>}
          
          <div className="form-group">
            <label className="form-label">Group Name</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Squad" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input 
              type="checkbox" 
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            <label htmlFor="isPublic" style={{ fontSize: 'var(--fs-sm)' }}>Make Public (Anyone can join)</label>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
          <Link href="/friends" className="btn" style={{ textAlign: 'center' }}>Cancel</Link>
        </form>
      )}
    </div>
  );
}
