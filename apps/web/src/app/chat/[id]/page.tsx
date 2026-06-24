'use client';

import { useState, useEffect, useRef, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { api } from '@/lib/api';
import Link from 'next/link';

interface ChatMessage {
  _id: string;
  senderId: any;
  receiverId?: any;
  groupId?: any;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'GIF' | 'STICKER';
  isAnonymous: boolean;
  anonymousName?: string;
  isViewed: boolean;
  createdAt: string;
}

interface FriendInfo {
  _id: string;
  userCode: string;
  displayName: string;
  isOnline: boolean;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: peerId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousName, setAnonymousName] = useState('');
  const [friend, setFriend] = useState<FriendInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showEmojiHint, setShowEmojiHint] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Fetch friend info
  useEffect(() => {
    if (!user) return;
    const fetchFriend = async () => {
      try {
        const res = await api.getFriends();
        const found = res.data.friends.find(
          (f: any) => f.friend._id === peerId
        );
        if (found) setFriend(found.friend);
      } catch (err) {
        console.error('Failed to fetch friend:', err);
      }
    };
    fetchFriend();
  }, [user, peerId]);

  // Fetch messages
  useEffect(() => {
    if (!user) return;
    const fetchMessages = async () => {
      try {
        const res = await api.getChatMessages(peerId);
        if (res.success) {
          setMessages(res.data || []);
          scrollToBottom();
        }
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMessages();
  }, [user, peerId, scrollToBottom]);

  // Socket listeners
  useEffect(() => {
    if (!socket || !user) return;

    const handleReceive = (data: { message: ChatMessage }) => {
      // Only add messages from/to this peer
      const msg = data.message;
      const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
      const receiverId = typeof msg.receiverId === 'object' ? msg.receiverId?._id : msg.receiverId;
      
      if (senderId === peerId || receiverId === peerId) {
        setMessages(prev => [...prev, msg]);
        scrollToBottom();
      }
    };

    const handleViewed = (data: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m._id !== data.messageId));
    };

    socket.on('chat:receive', handleReceive);
    socket.on('chat:viewed', handleViewed);

    return () => {
      socket.off('chat:receive', handleReceive);
      socket.off('chat:viewed', handleViewed);
    };
  }, [socket, peerId, user, scrollToBottom]);

  // Socket presence
  useEffect(() => {
    if (!socket) return;
    const handleOnline = (data: { userId: string }) => {
      if (data.userId === peerId) setFriend(prev => prev ? { ...prev, isOnline: true } : prev);
    };
    const handleOffline = (data: { userId: string }) => {
      if (data.userId === peerId) setFriend(prev => prev ? { ...prev, isOnline: false } : prev);
    };
    socket.on('friend:online', handleOnline);
    socket.on('friend:offline', handleOffline);
    return () => {
      socket.off('friend:online', handleOnline);
      socket.off('friend:offline', handleOffline);
    };
  }, [socket, peerId]);

  const generateAnonymousName = () => {
    const adjectives = ['Sneaky', 'Bouncy', 'Glowing', 'Mystic', 'Cosmic', 'Dreamy', 'Velvet', 'Neon'];
    const animals = ['Panda', 'Tiger', 'Dolphin', 'Unicorn', 'Fox', 'Phoenix', 'Owl', 'Cat'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const anim = animals[Math.floor(Math.random() * animals.length)];
    setAnonymousName(`${adj} ${anim}`);
  };

  const handleToggleAnonymous = () => {
    const next = !isAnonymous;
    setIsAnonymous(next);
    if (next) generateAnonymousName();
    else setAnonymousName('');
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    try {
      await api.sendChatMessage({
        receiverId: peerId,
        content: inputText,
        type: 'TEXT',
        isAnonymous,
        anonymousName: isAnonymous ? anonymousName : undefined,
      });
      setInputText('');
      inputRef.current?.focus();
    } catch (err) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  };

  const markAsViewed = async (msgId: string) => {
    try {
      await api.markMessageViewed(msgId);
      setMessages(prev => prev.filter(m => m._id !== msgId));
    } catch (err) {
      console.error('Failed to mark viewed:', err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setSending(true);
      try {
        await api.sendChatMessage({
          receiverId: peerId,
          content: base64,
          type: 'IMAGE',
          isAnonymous,
          anonymousName: isAnonymous ? anonymousName : undefined,
        });
      } catch (err) {
        console.error('Failed to send image:', err);
      } finally {
        setSending(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const quickEmojis = ['😂', '❤️', '🔥', '👀', '💀', '✨', '🥺', '👻'];

  const insertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiHint(false);
    inputRef.current?.focus();
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      background: 'var(--color-bg-primary)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-120px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '400px',
        height: '400px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, hsla(330, 85%, 60%, 0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ═══ HEADER ═══ */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-md)',
        padding: 'var(--space-md) var(--space-lg)',
        background: 'hsla(330, 25%, 10%, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
        position: 'relative',
        zIndex: 10,
      }}>
        <button
          onClick={() => router.push('/friends')}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-accent)',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: 'var(--radius-full)',
            display: 'flex',
            alignItems: 'center',
            transition: 'background var(--transition-fast)',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flex: 1 }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-full)',
            background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-light))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--fs-lg)',
            fontWeight: 'var(--fw-bold)',
            boxShadow: friend?.isOnline ? '0 0 12px var(--color-accent-glow)' : 'none',
            transition: 'box-shadow var(--transition-base)',
          }}>
            {friend?.displayName?.charAt(0) || '?'}
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 'var(--fw-semibold)',
              fontSize: 'var(--fs-lg)',
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em',
            }}>
              {friend?.displayName || 'Chat'}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: 'var(--fs-xs)',
              color: 'var(--color-text-secondary)',
              fontFamily: 'var(--font-primary)',
            }}>
              <span style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: friend?.isOnline ? '#22c55e' : 'var(--color-text-muted)',
                boxShadow: friend?.isOnline ? '0 0 6px #22c55e' : 'none',
              }} />
              {friend?.isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>

        {/* Ghost Mode Toggle */}
        <button
          onClick={handleToggleAnonymous}
          style={{
            background: isAnonymous ? 'var(--color-accent-dim)' : 'transparent',
            border: `1px solid ${isAnonymous ? 'var(--color-accent)' : 'var(--color-border)'}`,
            borderRadius: 'var(--radius-full)',
            padding: '6px 12px',
            color: isAnonymous ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            fontSize: 'var(--fs-xs)',
            fontFamily: 'var(--font-primary)',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          👻 {isAnonymous ? anonymousName : 'Ghost'}
        </button>

        {/* Voice call button */}
        <Link
          href={`/talk/${peerId}`}
          style={{
            background: 'var(--color-accent)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            width: '38px',
            height: '38px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 0 16px var(--color-accent-glow)',
            transition: 'transform var(--transition-fast)',
            textDecoration: 'none',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
        </Link>
      </header>

      {/* ═══ MESSAGES ═══ */}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        padding: 'var(--space-lg)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-sm)',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Ephemeral notice */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--space-sm) var(--space-md)',
          margin: '0 auto var(--space-md)',
          background: 'hsla(330, 85%, 60%, 0.08)',
          borderRadius: 'var(--radius-full)',
          border: '1px solid hsla(330, 85%, 60%, 0.15)',
          maxWidth: '320px',
        }}>
          <span style={{
            fontSize: 'var(--fs-xs)',
            color: 'var(--color-accent)',
            fontFamily: 'var(--font-primary)',
            fontWeight: 'var(--fw-medium)',
          }}>
            ✨ Messages vanish once viewed — like they never existed
          </span>
        </div>

        {messages.length === 0 && !loading && (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-md)',
            opacity: 0.5,
          }}>
            <div style={{ fontSize: '3rem' }}>💬</div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              color: 'var(--color-text-muted)',
              fontSize: 'var(--fs-lg)',
            }}>
              Start a conversation...
            </p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const senderId = typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId;
          const isMine = senderId === user?._id;
          const senderName = isMine
            ? (msg.isAnonymous ? msg.anonymousName : 'You')
            : (msg.isAnonymous ? msg.anonymousName : (typeof msg.senderId === 'object' ? msg.senderId.displayName : 'Friend'));

          return (
            <div
              key={msg._id}
              style={{
                alignSelf: isMine ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: isMine ? 'flex-end' : 'flex-start',
                animation: 'messageSlideIn 0.3s ease-out both',
                animationDelay: `${Math.min(idx * 0.05, 0.5)}s`,
              }}
            >
              {/* Sender label */}
              <span style={{
                fontSize: '11px',
                color: isMine ? 'var(--color-accent-light)' : 'var(--color-text-muted)',
                marginBottom: '4px',
                fontFamily: 'var(--font-primary)',
                fontWeight: 'var(--fw-medium)',
                paddingLeft: isMine ? 0 : '12px',
                paddingRight: isMine ? '12px' : 0,
              }}>
                {senderName}
              </span>

              {/* Bubble */}
              <div
                onClick={() => !isMine && msg.type !== 'IMAGE' && markAsViewed(msg._id)}
                style={{
                  padding: msg.type === 'IMAGE' ? '4px' : 'var(--space-sm) var(--space-md)',
                  borderRadius: isMine ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                  background: isMine
                    ? 'linear-gradient(135deg, var(--color-accent), hsl(340, 80%, 55%))'
                    : 'var(--color-bg-secondary)',
                  color: isMine ? '#fff' : 'var(--color-text-primary)',
                  boxShadow: isMine
                    ? '0 4px 20px var(--color-accent-glow)'
                    : '0 2px 8px hsla(0, 0%, 0%, 0.15)',
                  cursor: !isMine && msg.type !== 'IMAGE' ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                  minWidth: '60px',
                }}
              >
                {msg.type === 'TEXT' && (
                  <p style={{
                    margin: 0,
                    fontFamily: 'var(--font-primary)',
                    fontSize: 'var(--fs-base)',
                    lineHeight: 1.5,
                    wordBreak: 'break-word',
                  }}>
                    {msg.content}
                  </p>
                )}
                {msg.type === 'IMAGE' && (
                  <div
                    onClick={() => !isMine && markAsViewed(msg._id)}
                    style={{
                      position: 'relative',
                      borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                    }}
                  >
                    <img
                      src={msg.content}
                      alt="Shared image"
                      style={{
                        maxWidth: '240px',
                        maxHeight: '300px',
                        borderRadius: 'inherit',
                        display: 'block',
                      }}
                    />
                    {!isMine && (
                      <div style={{
                        position: 'absolute',
                        bottom: '8px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: 'hsla(0, 0%, 0%, 0.6)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: 'var(--radius-full)',
                        padding: '4px 12px',
                        fontSize: '10px',
                        color: '#fff',
                        fontFamily: 'var(--font-primary)',
                        whiteSpace: 'nowrap',
                      }}>
                        Tap to view & disappear
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span style={{
                fontSize: '10px',
                color: 'var(--color-text-muted)',
                marginTop: '3px',
                fontFamily: 'var(--font-numbers)',
                paddingLeft: isMine ? 0 : '12px',
                paddingRight: isMine ? '12px' : 0,
              }}>
                {formatTime(msg.createdAt)}
                {!isMine && msg.type === 'TEXT' && (
                  <span style={{ color: 'var(--color-accent)', marginLeft: '6px' }}>
                    tap to vanish
                  </span>
                )}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* ═══ EMOJI QUICK-PICK ═══ */}
      {showEmojiHint && (
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: 'var(--space-sm) var(--space-md)',
          background: 'var(--color-bg-secondary)',
          borderTop: '1px solid var(--color-border)',
          overflowX: 'auto',
          animation: 'slideUp 0.2s ease-out',
        }}>
          {quickEmojis.map(emoji => (
            <button
              key={emoji}
              onClick={() => insertEmoji(emoji)}
              style={{
                background: 'var(--color-bg-tertiary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '8px 12px',
                fontSize: '1.25rem',
                cursor: 'pointer',
                transition: 'transform var(--transition-fast)',
                flexShrink: 0,
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ═══ INPUT BAR ═══ */}
      <footer style={{
        padding: 'var(--space-sm) var(--space-md)',
        paddingBottom: 'max(var(--space-md), env(safe-area-inset-bottom))',
        background: 'hsla(330, 25%, 10%, 0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border)',
        position: 'relative',
        zIndex: 10,
      }}>
        <form
          onSubmit={handleSend}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-sm)',
          }}
        >
          {/* Hidden file input */}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            ref={fileInputRef}
            onChange={handleImageUpload}
          />

          {/* Image upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              background: 'var(--color-bg-tertiary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all var(--transition-fast)',
              flexShrink: 0,
              color: 'var(--color-text-secondary)',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </button>

          {/* Emoji button */}
          <button
            type="button"
            onClick={() => setShowEmojiHint(!showEmojiHint)}
            style={{
              background: showEmojiHint ? 'var(--color-accent-dim)' : 'var(--color-bg-tertiary)',
              border: `1px solid ${showEmojiHint ? 'var(--color-accent)' : 'var(--color-border)'}`,
              borderRadius: 'var(--radius-full)',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              fontSize: '1.2rem',
              flexShrink: 0,
              transition: 'all var(--transition-fast)',
            }}
          >
            😊
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a secret message..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-full)',
              padding: '10px 18px',
              color: 'var(--color-text-primary)',
              fontFamily: 'var(--font-primary)',
              fontSize: 'var(--fs-base)',
              outline: 'none',
              transition: 'border-color var(--transition-fast)',
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            style={{
              background: inputText.trim()
                ? 'linear-gradient(135deg, var(--color-accent), hsl(340, 80%, 55%))'
                : 'var(--color-bg-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              width: '42px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: inputText.trim() ? 'pointer' : 'default',
              transition: 'all var(--transition-fast)',
              boxShadow: inputText.trim() ? '0 0 16px var(--color-accent-glow)' : 'none',
              flexShrink: 0,
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? (
              <div className="spinner" style={{ width: '18px', height: '18px' }} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={inputText.trim() ? '#fff' : 'var(--color-text-muted)'} strokeWidth="2.5" strokeLinecap="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            )}
          </button>
        </form>
      </footer>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes messageSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
