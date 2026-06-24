'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { IGroup } from '@tentenclone/shared/types';

export default function ExplorePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [publicGroups, setPublicGroups] = useState<IGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
      return;
    }

    if (user) {
      setIsSearching(true);
      fetch('/api/explore/groups', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPublicGroups(data.data);
        }
      })
      .finally(() => setIsSearching(false));
    }
  }, [user, loading, router]);

  const joinGroup = async (groupId: string) => {
    const res = await fetch('/api/groups/join-public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ groupId })
    });

    if (res.ok) {
      router.push(`/chat/${groupId}`);
    } else {
      alert('Failed to join group');
    }
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="page" style={{ padding: 'var(--space-xl) var(--space-md)' }}>
      <header style={{ marginBottom: 'var(--space-xl)' }}>
        <Link href="/friends" className="btn btn-sm" style={{ marginBottom: 'var(--space-md)', display: 'inline-block', fontFamily: 'var(--font-primary)' }}>← Back</Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--fs-4xl)', margin: 0, color: 'var(--color-accent)' }}>
          Explore Worldwide
        </h1>
        <p style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-text-secondary)', marginTop: 'var(--space-xs)' }}>
          Discover random public groups and meet new people securely.
        </p>
      </header>

      {isSearching ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-2xl) 0' }}>
          <div className="spinner" />
          <p style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-text-muted)', marginTop: 'var(--space-md)' }}>
            Scanning the globe...
          </p>
        </div>
      ) : publicGroups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <p style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-text-muted)' }}>
            No public groups found. Why not create one?
          </p>
          <Link href="/groups/create" className="btn btn-primary" style={{ marginTop: 'var(--space-md)', fontFamily: 'var(--font-primary)' }}>
            Create Public Group
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-md)', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {publicGroups.map(group => (
            <div key={group._id} className="card" style={{ display: 'flex', flexDirection: 'column', padding: 'var(--space-lg)' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontFamily: 'var(--font-display)', margin: '0 0 var(--space-xs) 0', fontSize: 'var(--fs-xl)' }}>
                  {group.name}
                </h3>
                <p style={{ fontFamily: 'var(--font-primary)', color: 'var(--color-text-secondary)', fontSize: 'var(--fs-sm)', margin: '0 0 var(--space-md) 0' }}>
                  {group.members?.length || 0} Members
                </p>
              </div>
              <button 
                onClick={() => joinGroup(group._id)} 
                className="btn btn-primary"
                style={{ width: '100%', fontFamily: 'var(--font-primary)' }}
              >
                Join Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
