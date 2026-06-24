'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { IMessage } from '@tentenclone/shared/types';
import Link from 'next/link';
import HoldToViewImage from '@/components/HoldToViewImage';
import VideoCallModal from '@/components/VideoCallModal';

export default function ChatPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { user } = useAuth();
  const { socket } = useSocket();
  const peerId = params.id; // This could be a friendId or groupId

  const [messages, setMessages] = useState<IMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [anonymousName, setAnonymousName] = useState('');
  const searchParams = useSearchParams();
  const isGroup = searchParams.get('isGroup') === 'true';
  const [isVideoCalling, setIsVideoCalling] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket || !user) return;

    // Fetch existing unviewed history
    fetch(`/api/chat/${peerId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMessages(data.data);
          scrollToBottom();
        }
      });

    const handleReceive = (data: { message: IMessage }) => {
      setMessages(prev => [...prev, data.message]);
      scrollToBottom();
    };

    const handleViewed = (data: { messageId: string, from: string }) => {
      // Remove message from screen if viewed
      setMessages(prev => prev.filter(m => m._id !== data.messageId));
    };

    socket.on('chat:receive', handleReceive);
    socket.on('chat:viewed', handleViewed);

    return () => {
      socket.off('chat:receive', handleReceive);
      socket.off('chat:viewed', handleViewed);
    };
  }, [socket, peerId, user]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const generateAnonymousName = () => {
    const adjectives = ['Sneaky', 'Bouncy', 'Glowing', 'Mystic', 'Cosmic'];
    const animals = ['Panda', 'Tiger', 'Dolphin', 'Unicorn', 'Fox'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const anim = animals[Math.floor(Math.random() * animals.length)];
    setAnonymousName(`${adj} ${anim}`);
  };

  const handleToggleAnonymous = () => {
    const nextVal = !isAnonymous;
    setIsAnonymous(nextVal);
    if (nextVal) {
      generateAnonymousName();
    } else {
      setAnonymousName('');
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;

    const res = await fetch('/api/chat/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        receiverId: isGroup ? undefined : peerId,
        groupId: isGroup ? peerId : undefined,
        content: inputText,
        type: 'TEXT',
        isAnonymous,
        anonymousName: isAnonymous ? anonymousName : undefined
      })
    });

    if (res.ok) {
      setInputText('');
    }
  };

  const markAsViewed = async (msgId: string) => {
    // Tell server to physically delete it
    await fetch('/api/chat/view', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ messageId: msgId })
    });
    // Remove locally
    setMessages(prev => prev.filter(m => m._id !== msgId));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          receiverId: isGroup ? undefined : peerId,
          groupId: isGroup ? peerId : undefined,
          content: base64String,
          type: 'IMAGE',
          isAnonymous,
          anonymousName: isAnonymous ? anonymousName : undefined
        })
      });

      if (res.ok) {
        // Success
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: 0 }}>
      {isVideoCalling && (
        <VideoCallModal 
          peerId={peerId} 
          isGroup={isGroup} 
          onClose={() => setIsVideoCalling(false)} 
        />
      )}

      {/* Header */}
      <header className="card" style={{ padding: 'var(--space-md)', borderRadius: 0, borderBottom: '1px solid var(--color-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/friends" className="btn" style={{ padding: '0.25rem 0.5rem', fontFamily: 'var(--font-primary)' }}>← Back</Link>
          <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontStyle: 'italic', color: 'var(--color-accent)' }}>
            {isGroup ? 'Group Chat' : 'Secret Chat'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button 
              onClick={() => setIsVideoCalling(true)}
              className="btn" 
              style={{ padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>videocam</span>
              Call
            </button>
            <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem', fontFamily: 'var(--font-primary)' }}>
              <input type="checkbox" checked={isAnonymous} onChange={handleToggleAnonymous} />
              Ghost Mode
            </label>
          </div>
        </div>
        {isAnonymous && (
          <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-accent)', textAlign: 'center', marginTop: '0.5rem', fontFamily: 'var(--font-primary)' }}>
            You are chatting as: <strong style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'var(--fs-base)' }}>{anonymousName}</strong>
          </p>
        )}
      </header>

      {/* Messages */}
      <main style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        <p style={{ textAlign: 'center', fontSize: 'var(--fs-sm)', color: 'var(--color-text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-primary)' }}>
          Messages are deleted forever the moment you view them.
        </p>
        
        {messages.map(msg => {
          const isMine = msg.senderId === user?._id || (msg.senderId as { _id: string })._id === user?._id;
          const senderName = isMine 
            ? (msg.isAnonymous ? msg.anonymousName : 'You')
            : (msg.isAnonymous ? msg.anonymousName : (msg.senderId as { displayName: string }).displayName);

          return (
            <div key={msg._id} style={{
              alignSelf: isMine ? 'flex-end' : 'flex-start',
              maxWidth: '80%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: isMine ? 'flex-end' : 'flex-start'
            }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                {senderName}
              </span>
              
              <div 
                className="card"
                style={{
                  padding: msg.type === 'IMAGE' ? '0' : 'var(--space-sm) var(--space-md)',
                  borderRadius: isMine ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: isMine ? 'var(--color-accent)' : 'var(--color-bg-secondary)',
                  color: isMine ? '#fff' : 'var(--color-text-primary)',
                  boxShadow: isMine ? '0 4px 15px var(--color-accent-glow)' : 'none',
                  cursor: (!isMine && msg.type !== 'IMAGE') ? 'pointer' : 'default',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onClick={() => (!isMine && msg.type !== 'IMAGE') && markAsViewed(msg._id)}
              >
                {msg.type === 'TEXT' && (
                  <p style={{ margin: 0, fontFamily: 'var(--font-primary)' }}>{msg.content}</p>
                )}
                {msg.type === 'IMAGE' && (
                  <HoldToViewImage 
                    base64Image={msg.content} 
                    onViewed={() => !isMine && markAsViewed(msg._id)} 
                  />
                )}
              </div>
              
              {!isMine && (
                <span style={{ fontSize: '10px', color: 'var(--color-accent)', marginTop: '4px', fontFamily: 'var(--font-primary)' }}>
                  Tap to view & delete
                </span>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer style={{ padding: 'var(--space-md)', background: 'var(--color-bg-tertiary)', borderTop: '1px solid var(--color-border)' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <input 
            type="file" 
            accept="image/*" 
            style={{ display: 'none' }} 
            ref={fileInputRef}
            onChange={handleImageUpload}
          />
          <button 
            type="button" 
            className="btn" 
            onClick={() => fileInputRef.current?.click()}
            style={{ padding: '0.5rem', background: 'transparent', border: '1px solid var(--color-border)' }}
          >
            📸
          </button>
          <input
            type="text"
            className="input"
            placeholder="Send a secret message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            style={{ flex: 1, borderRadius: '20px', fontFamily: 'var(--font-primary)' }}
          />
          <button type="submit" className="btn btn-primary" style={{ borderRadius: '20px', fontFamily: 'var(--font-primary)' }}>
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
