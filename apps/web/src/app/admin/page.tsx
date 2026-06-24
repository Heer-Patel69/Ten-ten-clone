'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  onlineUsers: number;
  todayUsers: number;
  totalFriendships: number;
  pendingReports: number;
}

interface UserRow {
  _id: string;
  userCode: string;
  displayName: string;
  isOnline: boolean;
  role: string;
  createdAt: string;
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'overview' | 'users' | 'reports'>('overview');
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    try {
      const [statsRes, usersRes, reportsRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getReports(),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
      setReports(reportsRes.data.reports);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.replace('/login');
        return;
      }
      if (user.role !== 'admin') {
        router.replace('/friends');
        return;
      }
      fetchData();
    }
  }, [user, authLoading, router, fetchData]);

  const handleSearch = async () => {
    try {
      const res = await api.getAdminUsers(1, search);
      setUsers(res.data.users);
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      if (stats) setStats({ ...stats, totalUsers: stats.totalUsers - 1 });
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await api.updateReport(reportId, { status: 'resolved', resolution: 'Reviewed by admin' });
      setReports((prev) => prev.map((r) => r._id === reportId ? { ...r, status: 'resolved' } : r));
    } catch (err) {
      console.error('Resolve failed:', err);
    }
  };

  if (authLoading || loading) {
    return <div className="loading-screen"><div className="spinner spinner-lg" /></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <button className="btn btn-ghost btn-sm" onClick={() => router.push('/profile')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <h1 className="page-title">Admin</h1>
        <div style={{ width: '60px' }} />
      </div>

      <div className="page-content">
        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'var(--color-bg-secondary)',
          borderRadius: 'var(--radius-md)',
          padding: '4px',
          marginBottom: 'var(--space-xl)',
        }}>
          {(['overview', 'users', 'reports'] as const).map((t) => (
            <button
              key={t}
              className={`btn btn-sm btn-full ${tab === t ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setTab(t)}
              style={{ textTransform: 'capitalize' }}
            >
              {t}
              {t === 'reports' && stats && stats.pendingReports > 0 && (
                <span className="badge badge-danger" style={{ marginLeft: '4px' }}>
                  {stats.pendingReports}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && stats && (
          <div className="stats-grid">
            <div className="stat-card stagger-item">
              <div className="stat-value">{stats.totalUsers}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card stagger-item" style={{ animationDelay: '0.05s' }}>
              <div className="stat-value" style={{ color: 'var(--color-accent)' }}>{stats.onlineUsers}</div>
              <div className="stat-label">Online Now</div>
            </div>
            <div className="stat-card stagger-item" style={{ animationDelay: '0.1s' }}>
              <div className="stat-value" style={{ color: 'var(--color-info)' }}>{stats.todayUsers}</div>
              <div className="stat-label">New Today</div>
            </div>
            <div className="stat-card stagger-item" style={{ animationDelay: '0.15s' }}>
              <div className="stat-value" style={{ color: 'var(--color-warning)' }}>{stats.totalFriendships}</div>
              <div className="stat-label">Friendships</div>
            </div>
            <div className="stat-card stagger-item" style={{ animationDelay: '0.2s', gridColumn: 'span 2' }}>
              <div className="stat-value" style={{ color: stats.pendingReports > 0 ? 'var(--color-danger)' : 'var(--color-accent)' }}>
                {stats.pendingReports}
              </div>
              <div className="stat-label">Pending Reports</div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              <input
                className="input"
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn btn-primary btn-sm" onClick={handleSearch}>
                Search
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
              {users.map((u, i) => (
                <div key={u._id} className="friend-card stagger-item" style={{ animationDelay: `${i * 0.03}s` }}>
                  <div className="avatar avatar-sm">
                    {u.displayName.charAt(0)}
                  </div>
                  <div className="friend-info">
                    <div className="friend-name">
                      {u.displayName}
                      {u.role === 'admin' && <span className="badge" style={{ marginLeft: '6px' }}>Admin</span>}
                    </div>
                    <div className="friend-status">
                      <span className={`status-dot ${u.isOnline ? 'status-online' : 'status-offline'}`} />
                      #{u.userCode}
                    </div>
                  </div>
                  {u._id !== user?._id && (
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDeleteUser(u._id)}
                      style={{ flexShrink: 0 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {tab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            {reports.length === 0 ? (
              <div className="empty-state">
                <h3>No reports</h3>
                <p>All clear! No reports to review.</p>
              </div>
            ) : (
              reports.map((report, i) => (
                <div key={report._id} className="glass-card stagger-item" style={{ padding: 'var(--space-lg)', animationDelay: `${i * 0.05}s` }}>
                  <div className="flex-between" style={{ marginBottom: 'var(--space-sm)' }}>
                    <span className={`badge ${report.status === 'pending' ? 'badge-danger' : 'badge-warning'}`}>
                      {report.status}
                    </span>
                    <span className="text-muted" style={{ fontSize: 'var(--fs-xs)' }}>
                      {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-sm)' }}>
                    <strong>{report.reporter?.displayName}</strong> reported{' '}
                    <strong>{report.reportedUser?.displayName}</strong>
                  </div>
                  <div className="text-secondary" style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-sm)' }}>
                    Reason: {report.reason}
                  </div>
                  {report.description && (
                    <div className="text-muted" style={{ fontSize: 'var(--fs-xs)', marginBottom: 'var(--space-md)' }}>
                      {report.description}
                    </div>
                  )}
                  {report.status === 'pending' && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleResolveReport(report._id)}
                    >
                      Resolve
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
