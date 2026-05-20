import { useState, useRef, useEffect, useCallback } from 'react';

const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
  'audio/ogg',
];

function pickMimeType() {
  if (typeof MediaRecorder === 'undefined') return null;
  for (const t of MIME_CANDIDATES) {
    try {
      if (MediaRecorder.isTypeSupported(t)) return t;
    } catch { /* ignore */ }
  }
  return ''; // let browser pick
}

function mimeToExt(mime) {
  if (!mime) return 'webm';
  if (mime.includes('mp4'))  return 'mp4';
  if (mime.includes('ogg'))  return 'ogg';
  return 'webm';
}

function classifyError(err) {
  const name = err?.name || '';
  const msg  = (err?.message || '').toLowerCase();
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') return 'permission-denied';
  if (name === 'NotFoundError'   || name === 'DevicesNotFoundError')  return 'no-microphone';
  if (name === 'NotReadableError'|| name === 'TrackStartError')       return 'in-use';
  if (name === 'NotSupportedError')                                   return 'browser-unsupported';
  if (msg.includes('interrupted') || msg.includes('aborted'))        return 'interrupted';
  return 'unknown';
}

/**
 * useMicRecorder — robust cross-platform mic recording hook.
 *
 * Returns:
 *   state          — 'idle' | 'requesting' | 'recording' | 'stopping' | 'error'
 *   errorCode      — null | 'permission-denied' | 'no-microphone' | 'in-use' |
 *                    'interrupted' | 'browser-unsupported' | 'unknown'
 *   errorMessage   — human-readable string
 *   isInterrupted  — true while the track is muted (e.g. an incoming call)
 *   permissionState — 'unknown' | 'prompt' | 'granted' | 'denied'
 *   isSupported    — false if MediaRecorder / getUserMedia not available
 *   start()        — begin recording
 *   stop()         — end recording → Promise<{ blob, mimeType, extension, durationMs }>
 *   cancel()       — discard recording
 *   reset()        — clear error state back to idle
 */
export function useMicRecorder() {
  const [state, setState]               = useState('idle');
  const [errorCode, setErrorCode]       = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isInterrupted, setIsInterrupted] = useState(false);
  const [permissionState, setPermissionState] = useState('unknown');

  const recorderRef    = useRef(null);
  const streamRef      = useRef(null);
  const chunksRef      = useRef([]);
  const startTimeRef   = useRef(null);
  const stopResolveRef = useRef(null);
  const stopRejectRef  = useRef(null);
  const mountedRef     = useRef(true);

  // Check if APIs exist
  const isSupported = typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof MediaRecorder !== 'undefined';

  // Query permission state once (Permissions API — not available on all browsers)
  useEffect(() => {
    mountedRef.current = true;
    if (!navigator?.permissions?.query) return;
    navigator.permissions.query({ name: 'microphone' })
      .then(status => {
        if (!mountedRef.current) return;
        setPermissionState(status.state);
        status.onchange = () => {
          if (mountedRef.current) setPermissionState(status.state);
        };
      })
      .catch(() => { /* Firefox may throw for 'microphone' */ });
    return () => { mountedRef.current = false; };
  }, []);

  function cleanup() {
    if (recorderRef.current) {
      try { recorderRef.current.stop(); } catch { /* already stopped */ }
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    chunksRef.current  = [];
    startTimeRef.current = null;
  }

  const start = useCallback(async () => {
    if (!isSupported) {
      setErrorCode('browser-unsupported');
      setErrorMessage('Your browser does not support audio recording. Try Chrome or Safari 14+.');
      setState('error');
      return;
    }

    setState('requesting');
    setErrorCode(null);
    setErrorMessage('');
    setIsInterrupted(false);
    chunksRef.current = [];

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });
    } catch (err) {
      if (!mountedRef.current) return;
      const code = classifyError(err);
      setErrorCode(code);
      setErrorMessage(permissionErrorMessage(code));
      setState('error');
      setPermissionState('denied');
      return;
    }

    streamRef.current = stream;
    setPermissionState('granted');

    // Detect interruptions (incoming call, hardware loss)
    const track = stream.getAudioTracks()[0];
    if (track) {
      track.onmute = () => {
        if (mountedRef.current) setIsInterrupted(true);
      };
      track.onunmute = () => {
        if (mountedRef.current) setIsInterrupted(false);
      };
      track.onended = () => {
        // Stream was revoked (call, permission withdrawn)
        if (!mountedRef.current) return;
        setIsInterrupted(false);
        // Flush whatever we have
        if (recorderRef.current?.state === 'recording') {
          try { recorderRef.current.stop(); } catch { /* ignore */ }
        } else {
          // Nothing was started — surface error
          cleanup();
          setErrorCode('interrupted');
          setErrorMessage('Microphone was disconnected. Was there an incoming call? Please try again.');
          setState('error');
          if (stopRejectRef.current) {
            stopRejectRef.current(new Error('interrupted'));
            stopRejectRef.current = null;
          }
        }
      };
    }

    const mimeType = pickMimeType();
    let recorder;
    try {
      recorder = (mimeType !== null && mimeType !== '')
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch (err) {
      // Codec not supported despite isTypeSupported returning true (some Android quirks)
      try {
        recorder = new MediaRecorder(stream);
      } catch (err2) {
        cleanup();
        setErrorCode('browser-unsupported');
        setErrorMessage('Your browser could not start recording. Try updating Chrome or Safari.');
        setState('error');
        return;
      }
    }

    recorderRef.current = recorder;

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onerror = (e) => {
      if (!mountedRef.current) return;
      cleanup();
      setErrorCode('unknown');
      setErrorMessage('Recording failed unexpectedly. Please try again.');
      setState('error');
      if (stopRejectRef.current) {
        stopRejectRef.current(e.error || new Error('recorder error'));
        stopRejectRef.current = null;
      }
    };

    recorder.onstop = () => {
      if (!mountedRef.current) {
        cleanup();
        return;
      }
      const chunks   = [...chunksRef.current];
      const duration = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      const actualMime = recorder.mimeType || (mimeType || 'audio/webm');
      const ext = mimeToExt(actualMime);

      cleanup();

      if (chunks.length === 0) {
        // Nothing captured — typically < 100ms recording or track-ended before data
        const wasInterrupted = !mountedRef.current || state === 'error';
        if (!wasInterrupted && stopResolveRef.current) {
          // Resolve with empty blob so caller can decide
          stopResolveRef.current({ blob: new Blob([], { type: actualMime }), mimeType: actualMime, extension: ext, durationMs: 0 });
        }
        stopResolveRef.current = null;
        stopRejectRef.current  = null;
        if (mountedRef.current) setState('idle');
        return;
      }

      const blob = new Blob(chunks, { type: actualMime });
      if (stopResolveRef.current) {
        stopResolveRef.current({ blob, mimeType: actualMime, extension: ext, durationMs: duration });
        stopResolveRef.current = null;
        stopRejectRef.current  = null;
      }
      if (mountedRef.current) setState('idle');
    };

    startTimeRef.current = Date.now();
    recorder.start(100); // 100ms timeslice so we get data even on short recordings
    if (mountedRef.current) setState('recording');
  }, [isSupported, permissionState]);

  const stop = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!recorderRef.current || recorderRef.current.state === 'inactive') {
        resolve({ blob: new Blob([]), mimeType: 'audio/webm', extension: 'webm', durationMs: 0 });
        return;
      }
      stopResolveRef.current = resolve;
      stopRejectRef.current  = reject;
      setState('stopping');
      try {
        recorderRef.current.stop();
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }, []);

  const cancel = useCallback(() => {
    stopResolveRef.current = null;
    stopRejectRef.current  = null;
    cleanup();
    if (mountedRef.current) {
      setState('idle');
      setIsInterrupted(false);
    }
  }, []);

  const reset = useCallback(() => {
    cancel();
    setErrorCode(null);
    setErrorMessage('');
  }, [cancel]);

  return {
    state,
    errorCode,
    errorMessage,
    isInterrupted,
    permissionState,
    isSupported,
    start,
    stop,
    cancel,
    reset,
  };
}

function permissionErrorMessage(code) {
  switch (code) {
    case 'permission-denied':
      return 'Microphone access was denied. Please enable it in your browser settings and try again.';
    case 'no-microphone':
      return 'No microphone found. Please connect a microphone and try again.';
    case 'in-use':
      return 'Microphone is in use by another app. Close it and try again.';
    case 'browser-unsupported':
      return 'Audio recording is not supported in this browser. Try Chrome or Safari 14.3+.';
    case 'interrupted':
      return 'Recording was interrupted. Was there an incoming call? Please try again.';
    default:
      return 'Could not access the microphone. Please try again.';
  }
}
