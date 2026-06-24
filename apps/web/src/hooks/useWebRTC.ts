'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSocket } from '@/contexts/SocketContext';

interface UseWebRTCOptions {
  onIncomingVoice?: (from: string, displayName: string) => void;
  onVoiceEnd?: (from: string) => void;
}

interface VoiceStartPayload {
  from: string;
  displayName: string;
  callId?: string;
}

interface VoiceOfferPayload {
  from: string;
  offer: RTCSessionDescriptionInit;
  callId?: string;
}

interface VoiceAnswerPayload {
  from: string;
  answer: RTCSessionDescriptionInit;
  callId?: string;
}

interface VoiceIcePayload {
  from: string;
  candidate: RTCIceCandidateInit;
  callId?: string;
}

interface VoiceEndPayload {
  from: string;
  callId?: string;
}

interface VoiceUnavailablePayload {
  to: string;
  callId?: string;
  reason?: string;
}

const iceServers: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
];

const turnUrls = process.env.NEXT_PUBLIC_TURN_URLS
  ?.split(',')
  .map((url) => url.trim())
  .filter(Boolean);

if (turnUrls?.length) {
  const username = process.env.NEXT_PUBLIC_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_TURN_CREDENTIAL;

  iceServers.push(
    username && credential
      ? { urls: turnUrls, username, credential }
      : { urls: turnUrls }
  );
}

const rtcConfig: RTCConfiguration = {
  iceServers,
  iceCandidatePoolSize: 4,
};

function createCallId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getRemoteAudioElement() {
  if (typeof document === 'undefined') return null;

  let audioEl = document.getElementById('walkietalk-audio') as HTMLAudioElement | null;

  if (!audioEl) {
    audioEl = document.createElement('audio');
    audioEl.id = 'walkietalk-audio';
    audioEl.style.display = 'none';
    document.body.appendChild(audioEl);
  }

  audioEl.autoplay = true;
  audioEl.playsInline = true;
  audioEl.muted = false;
  audioEl.volume = 1;
  audioEl.setAttribute('playsinline', 'true');

  return audioEl;
}

async function playRemoteStream(stream: MediaStream) {
  const audioEl = getRemoteAudioElement();
  if (!audioEl) return false;

  audioEl.srcObject = stream;

  const outputTarget = audioEl as HTMLAudioElement & {
    setSinkId?: (sinkId: string) => Promise<void>;
  };

  if (outputTarget.setSinkId) {
    await outputTarget.setSinkId('default').catch(() => undefined);
  }

  try {
    await audioEl.play();
    return true;
  } catch (error) {
    console.warn('Remote audio playback was blocked by the browser:', error);
    return false;
  }
}

function stopRemoteAudio() {
  const audioEl = getRemoteAudioElement();
  if (!audioEl) return;

  audioEl.pause();
  audioEl.srcObject = null;
}

export function useWebRTC(options: UseWebRTCOptions = {}) {
  const [isTalking, setIsTalking] = useState(false);
  const [isReceiving, setIsReceiving] = useState(false);
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [remotePlaybackBlocked, setRemotePlaybackBlocked] = useState(false);

  const { socket } = useSocket();
  const optionsRef = useRef(options);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const activeCallIdRef = useRef<string | null>(null);
  const activePeerIdRef = useRef<string | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const processPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc?.remoteDescription) return;

    const queuedCandidates = pendingCandidatesRef.current.splice(0);

    for (const candidate of queuedCandidates) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error('Failed to add queued ICE candidate:', error);
      }
    }
  }, []);

  const cleanup = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;

    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;

    stopRemoteAudio();
    pendingCandidatesRef.current = [];
    activeCallIdRef.current = null;
    activePeerIdRef.current = null;

    setIsTalking(false);
    setIsReceiving(false);
    setActivePeerId(null);
    setRemotePlaybackBlocked(false);
  }, []);

  const createPeerConnection = useCallback(
    (peerId: string, callId: string) => {
      const pc = new RTCPeerConnection(rtcConfig);

      pc.onicecandidate = (event) => {
        if (!event.candidate || !socket) return;

        socket.emit('voice:ice-candidate', {
          to: peerId,
          callId,
          candidate: event.candidate.toJSON(),
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed') {
          pc.restartIce();
        }
      };

      return pc;
    },
    [socket]
  );

  const startTalking = useCallback(
    async (friendId: string) => {
      if (!socket?.connected) return;

      cleanup();

      const callId = createCallId();
      activeCallIdRef.current = callId;
      activePeerIdRef.current = friendId;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        localStreamRef.current = stream;

        const pc = createPeerConnection(friendId, callId);
        peerConnectionRef.current = pc;

        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('voice:start', { to: friendId, callId });
        socket.emit('voice:offer', {
          to: friendId,
          callId,
          offer: pc.localDescription ?? offer,
        });

        setIsTalking(true);
        setActivePeerId(friendId);

        if (navigator.vibrate) navigator.vibrate(50);
      } catch (error) {
        console.error('Failed to start talking:', error);
        cleanup();
      }
    },
    [cleanup, createPeerConnection, socket]
  );

  const stopTalking = useCallback(() => {
    const peerId = activePeerIdRef.current ?? activePeerId;
    const callId = activeCallIdRef.current;

    if (socket && peerId) {
      socket.emit('voice:end', { to: peerId, callId });
    }

    cleanup();

    if (navigator.vibrate) navigator.vibrate(30);
  }, [activePeerId, cleanup, socket]);

  const retryRemotePlayback = useCallback(async () => {
    const audioEl = getRemoteAudioElement();
    if (!audioEl?.srcObject) return;

    try {
      await audioEl.play();
      setRemotePlaybackBlocked(false);
    } catch {
      setRemotePlaybackBlocked(true);
    }
  }, []);

  const setupListeners = useCallback(() => {
    if (!socket) return () => {};

    const handleVoiceStart = (data: VoiceStartPayload) => {
      if (activeCallIdRef.current && activeCallIdRef.current !== data.callId) {
        cleanup();
      }

      activeCallIdRef.current = data.callId ?? activeCallIdRef.current;
      activePeerIdRef.current = data.from;
      setIsReceiving(true);
      setActivePeerId(data.from);
      optionsRef.current.onIncomingVoice?.(data.from, data.displayName);
    };

    const handleVoiceOffer = async (data: VoiceOfferPayload) => {
      if (!socket) return;

      const callId = data.callId ?? createCallId();

      try {
        if (activeCallIdRef.current && activeCallIdRef.current !== callId) {
          cleanup();
        }

        activeCallIdRef.current = callId;
        activePeerIdRef.current = data.from;
        setIsReceiving(true);
        setActivePeerId(data.from);

        const pc = createPeerConnection(data.from, callId);
        peerConnectionRef.current = pc;

        pc.ontrack = (event) => {
          const stream = event.streams[0] ?? new MediaStream([event.track]);
          void playRemoteStream(stream).then((played) => {
            setRemotePlaybackBlocked(!played);
          });
        };

        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await processPendingCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('voice:answer', {
          to: data.from,
          callId,
          answer: pc.localDescription ?? answer,
        });
      } catch (error) {
        console.error('Failed to handle voice offer:', error);
        cleanup();
      }
    };

    const handleVoiceAnswer = async (data: VoiceAnswerPayload) => {
      if (data.callId && activeCallIdRef.current && data.callId !== activeCallIdRef.current) {
        return;
      }

      try {
        const pc = peerConnectionRef.current;

        if (pc && !pc.remoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          await processPendingCandidates();
        }
      } catch (error) {
        console.error('Failed to handle voice answer:', error);
      }
    };

    const handleIceCandidate = async (data: VoiceIcePayload) => {
      if (data.callId && activeCallIdRef.current && data.callId !== activeCallIdRef.current) {
        return;
      }

      const pc = peerConnectionRef.current;

      if (!pc?.remoteDescription) {
        pendingCandidatesRef.current.push(data.candidate);
        return;
      }

      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (error) {
        console.error('Failed to handle ICE candidate:', error);
      }
    };

    const handleVoiceEnd = (data: VoiceEndPayload) => {
      if (data.callId && activeCallIdRef.current && data.callId !== activeCallIdRef.current) {
        return;
      }

      const from = data.from;
      cleanup();
      optionsRef.current.onVoiceEnd?.(from);
    };

    const handleVoiceUnavailable = (data: VoiceUnavailablePayload) => {
      if (data.callId && activeCallIdRef.current && data.callId !== activeCallIdRef.current) {
        return;
      }

      console.warn('Voice call unavailable:', data.reason ?? 'Peer is not reachable');
      cleanup();
    };

    socket.on('voice:start', handleVoiceStart);
    socket.on('voice:offer', handleVoiceOffer);
    socket.on('voice:answer', handleVoiceAnswer);
    socket.on('voice:ice-candidate', handleIceCandidate);
    socket.on('voice:end', handleVoiceEnd);
    socket.on('voice:unavailable', handleVoiceUnavailable);

    return () => {
      socket.off('voice:start', handleVoiceStart);
      socket.off('voice:offer', handleVoiceOffer);
      socket.off('voice:answer', handleVoiceAnswer);
      socket.off('voice:ice-candidate', handleIceCandidate);
      socket.off('voice:end', handleVoiceEnd);
      socket.off('voice:unavailable', handleVoiceUnavailable);
    };
  }, [cleanup, createPeerConnection, processPendingCandidates, socket]);

  return {
    isTalking,
    isReceiving,
    activePeerId,
    remotePlaybackBlocked,
    startTalking,
    stopTalking,
    setupListeners,
    cleanup,
    retryRemotePlayback,
  };
}
