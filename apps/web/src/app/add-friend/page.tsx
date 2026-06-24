'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface PendingRequest {
  _id: string;
  requester: {
    userCode: string;
    displayName: string;
  };
}

export default function AddFriendPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState<PendingRequest[]>([]);

  const fetchRequests = useCallback(async () => {
    try {
      const res = await api.getFriendRequests();
      setRequests(res.data.requests);
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) fetchRequests();
  }, [user, authLoading, router, fetchRequests]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      setError('Enter a valid 4-digit code');
      return;
    }

    if (code === user?.userCode) {
      setError("You can't add yourself!");
      return;
    }

    setLoading(true);
    try {
      await api.sendFriendRequest(code);
      setSuccess(`Friend request sent to #${code}!`);
      setCode('');
    } catch (err: any) {
      setError(err.message || 'Failed to send request');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (friendshipId: string) => {
    try {
      await api.acceptFriendRequest(friendshipId);
      setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
      setSuccess('Friend added! 🎉');
    } catch (err: any) {
      setError(err.message || 'Failed to accept');
    }
  };

  const handleReject = async (friendshipId: string) => {
    try {
      await api.rejectFriendRequest(friendshipId);
      setRequests((prev) => prev.filter((r) => r._id !== friendshipId));
    } catch (err: any) {
      setError(err.message || 'Failed to reject');
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-primary"><span className="material-symbols-outlined animate-spin text-4xl">blur_on</span></div>;
  }

  return (
    <div className="mesh-bg min-h-screen pb-32 font-primary text-text-primary px-6 md:px-12 pt-12">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-3xl font-display font-bold tracking-tight">Add Friend</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-12">
        
        {/* Pending Requests Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-text-secondary flex items-center gap-2">
            Pending Requests {requests.length > 0 && <span className="bg-danger text-white text-xs px-2 py-0.5 rounded-full">{requests.length}</span>}
          </h2>
          
          <div className="space-y-4">
            {requests.length === 0 ? (
              <div className="glass-surface rounded-[20px] p-6 text-center text-text-muted">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">inbox</span>
                <p>No new requests</p>
              </div>
            ) : (
              requests.map((req, i) => (
                <div key={req._id} className="glass-surface p-4 rounded-[20px] flex items-center justify-between shadow-sm animate-fade-in-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-fixed to-primary flex items-center justify-center text-white font-bold text-lg shadow-inner">
                      {req.requester.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{req.requester.displayName}</h3>
                      <p className="text-sm text-text-muted">#{req.requester.userCode}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleAccept(req._id)}
                      className="bg-primary hover:bg-primary-light text-white px-5 py-2 rounded-full text-sm font-semibold transition-transform active:scale-95 shadow-md shadow-primary/20"
                    >
                      Accept
                    </button>
                    <button 
                      onClick={() => handleReject(req._id)}
                      className="bg-surface-variant text-text-secondary hover:bg-black/5 px-4 py-2 rounded-full text-sm font-semibold transition-transform active:scale-95"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Add Friend Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4 text-text-secondary">Add by Code</h2>
          <form onSubmit={handleSendRequest} className="glass-surface p-6 rounded-[24px] shadow-sm">
            <p className="text-sm text-text-muted mb-4">Enter a 4-digit code to send a friend request.</p>
            
            <div className="relative flex items-center mb-2">
              <span className="absolute left-4 material-symbols-outlined text-text-muted">tag</span>
              <input
                type="text"
                placeholder="0000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="w-full bg-white/60 border border-white focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-full py-4 pl-12 pr-16 text-lg tracking-[0.2em] font-semibold outline-none transition-all placeholder:text-text-muted/50"
                maxLength={4}
                inputMode="numeric"
              />
              <button
                type="submit"
                disabled={loading || code.length !== 4}
                className="absolute right-2 bg-primary text-white w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary-light transition-colors shadow-md"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
                ) : (
                  <span className="material-symbols-outlined text-[20px]">person_add</span>
                )}
              </button>
            </div>
            
            {error && <p className="text-danger text-sm mt-3 pl-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">error</span>{error}</p>}
            {success && <p className="text-primary text-sm mt-3 pl-2 flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span>{success}</p>}
          </form>

          {/* User's own code */}
          <div className="mt-6 flex flex-col items-center justify-center py-6 glass-surface rounded-[24px]">
             <p className="text-sm text-text-secondary mb-2">Your Code</p>
             <div className="text-3xl font-display font-bold tracking-widest text-primary mb-3">
               {user?.userCode}
             </div>
             <button
                className="flex items-center gap-2 bg-white/50 hover:bg-white/80 border border-white px-4 py-2 rounded-full text-sm font-semibold text-text-secondary transition-colors"
                onClick={() => {
                  navigator.clipboard.writeText(user?.userCode || '');
                  setSuccess('Code copied to clipboard!');
                  setTimeout(() => setSuccess(''), 2000);
                }}
              >
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Copy Code
              </button>
          </div>
        </section>

      </div>
    </div>
  );
}
