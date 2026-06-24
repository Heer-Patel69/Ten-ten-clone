'use client';

import { useEffect, useRef, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface VideoCallModalProps {
  peerId: string;
  isGroup: boolean;
  incomingOffer?: RTCSessionDescriptionInit;
  initialIceCandidates?: any[];
  onClose: () => void;
}

export default function VideoCallModal({ peerId, isGroup, incomingOffer, initialIceCandidates, onClose }: VideoCallModalProps) {
  const { socket } = useSocket();
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const [status, setStatus] = useState('Calling...');
  
  useEffect(() => {
    let localStream: MediaStream | null = null;

    const initCall = async () => {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStream;
        }

        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        peerConnectionRef.current = pc;

        localStream.getTracks().forEach(track => pc.addTrack(track, localStream!));

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
            setStatus('Connected');
          }
        };

        pc.onicecandidate = (event) => {
          if (event.candidate && socket) {
            socket.emit('video:ice-candidate', {
              to: peerId,
              candidate: event.candidate
            });
          }
        };

        let iceBuffer: any[] = [];
        let hasRemoteDesc = false;

        if (socket) {
          // Listen for answers and ice candidates
          socket.on('video:answer', async (data: { answer: RTCSessionDescriptionInit }) => {
            if (peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
              hasRemoteDesc = true;
              for (const cand of iceBuffer) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(cand));
              }
              iceBuffer = [];
            }
          });

          socket.on('video:ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
            if (peerConnectionRef.current) {
              if (hasRemoteDesc) {
                await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
              } else {
                iceBuffer.push(data.candidate);
              }
            }
          });
        }

        // Create offer or answer
        if (incomingOffer) {
          await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));
          hasRemoteDesc = true;
          
          if (initialIceCandidates) {
            for (const cand of initialIceCandidates) {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          if (socket) {
            socket.emit('video:answer', {
              to: peerId,
              answer,
              isGroup
            });
          }
        } else {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socket) {
            socket.emit('video:offer', {
              to: peerId,
              offer,
              isGroup
            });
          }
        }

      } catch (err) {
        console.error('Video call error:', err);
        setStatus('Failed to access camera/microphone');
      }
    };

    initCall();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
      if (socket) {
        socket.off('video:answer');
        socket.off('video:ice-candidate');
      }
    };
  }, [peerId, isGroup, socket, incomingOffer]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.9)',
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white'
    }}>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '1rem' }}>{status}</h2>
      
      <div style={{ position: 'relative', width: '100%', maxWidth: '800px', aspectRatio: '16/9', backgroundColor: '#111', borderRadius: '1rem', overflow: 'hidden' }}>
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          style={{ 
            position: 'absolute', 
            bottom: '1rem', 
            right: '1rem', 
            width: '120px', 
            aspectRatio: '9/16', 
            objectFit: 'cover', 
            borderRadius: '0.5rem',
            border: '2px solid white'
          }}
        />
      </div>

      <button 
        onClick={onClose}
        className="btn btn-primary"
        style={{ marginTop: '2rem', backgroundColor: 'var(--color-danger)' }}
      >
        <span className="material-symbols-outlined" style={{ marginRight: '0.5rem' }}>call_end</span>
        End Call
      </button>
    </div>
  );
}
