'use client';

import { useCallback, useRef, useState } from 'react';
import { getSocket } from '@/lib/socket';

interface UseWebRTCOptions {
  onIncomingVoice?: (from: string, displayName: string) => void;
  onVoiceEnd?: (from: string) => void;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const [isTalking, setIsTalking] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // STUN servers for NAT traversal (free public servers)
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }
    setIsTalking(false);
    setIsReceiving(false);
    setActivePeerId(null);
  }, []);

  // Start talking to a friend (sender side)
  const startTalking = useCallback(
    async (friendId: string) => {
      const socket = getSocket();
      if (!socket) return;

      try {
        // Get microphone access
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        localStreamRef.current = stream;

        // Create peer connection
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        // Add audio tracks
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('voice:ice-candidate', {
              to: friendId,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('voice:start', { to: friendId });
        socket.emit('voice:offer', { to: friendId, offer });

        setIsTalking(true);
        setActivePeerId(friendId);

        // Vibrate on start
        if (navigator.vibrate) navigator.vibrate(50);
      } catch (error) {
        console.error('Failed to start talking:', error);
        cleanup();
      }
    },
    [cleanup, rtcConfig]
  );

  // Stop talking
  const stopTalking = useCallback(() => {
    const socket = getSocket();
    if (socket && activePeerId) {
      socket.emit('voice:end', { to: activePeerId });
    }
    cleanup();
    if (navigator.vibrate) navigator.vibrate(30);
  }, [activePeerId, cleanup]);

  // Handle incoming voice (receiver side) — call this in your component's useEffect
  const setupListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return () => {};

    const handleVoiceStart = (data: { from: string; displayName: string }) => {
      setIsReceiving(true);
      setActivePeerId(data.from);
      options.onIncomingVoice?.(data.from, data.displayName);
    };

    const handleVoiceOffer = async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
      try {
        const pc = new RTCPeerConnection(rtcConfig);
        peerConnectionRef.current = pc;

        // Handle incoming audio — play on speaker
        pc.ontrack = (event) => {
          if (!audioRef.current) {
            audioRef.current = new Audio();
          }
          audioRef.current.srcObject = event.streams[0];
          audioRef.current.autoplay = true;
          // Force play for speaker
          audioRef.current.play().catch(console.error);
        };

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('voice:ice-candidate', {
              to: data.from,
              candidate: event.candidate.toJSON(),
            });
          }
        };

        // Set remote description and create answer
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voice:answer', { to: data.from, answer });
      } catch (error) {
        console.error('Failed to handle voice offer:', error);
      }
    };

    const handleVoiceAnswer = async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      } catch (error) {
        console.error('Failed to handle voice answer:', error);
      }
    };

    const handleIceCandidate = async (data: { from: string; candidate: RTCIceCandidateInit }) => {
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      } catch (error) {
        console.error('Failed to handle ICE candidate:', error);
      }
    };

    const handleVoiceEnd = (data: { from: string }) => {
      cleanup();
      options.onVoiceEnd?.(data.from);
    };

    socket.on('voice:start', handleVoiceStart);
    socket.on('voice:offer', handleVoiceOffer);
    socket.on('voice:answer', handleVoiceAnswer);
    socket.on('voice:ice-candidate', handleIceCandidate);
    socket.on('voice:end', handleVoiceEnd);

    return () => {
      socket.off('voice:start', handleVoiceStart);
      socket.off('voice:offer', handleVoiceOffer);
      socket.off('voice:answer', handleVoiceAnswer);
      socket.off('voice:ice-candidate', handleIceCandidate);
      socket.off('voice:end', handleVoiceEnd);
    };
  }, [cleanup, options, rtcConfig]);

  return {
    isTalking,
    isReceiving,
    activePeerId,
    startTalking,
    stopTalking,
    setupListeners,
    cleanup,
  };
}
