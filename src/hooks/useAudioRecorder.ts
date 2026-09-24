import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioRecorderState {
  isRecording: boolean;
  recordingTime: number; // in seconds
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  resetRecording: () => void;
}

/**
 * Кодирует массив Float32 PCM семплов в стандартный 16-битный моно WAV-файл (RIFF WAVE).
 */
export function encodeWavBlob(chunks: Float32Array[], sampleRate: number): Blob {
  let totalLength = 0;
  for (let i = 0; i < chunks.length; i++) {
    totalLength += chunks[i].length;
  }

  const merged = new Float32Array(totalLength);
  let offset = 0;
  for (let i = 0; i < chunks.length; i++) {
    merged.set(chunks[i], offset);
    offset += chunks[i].length;
  }

  const buffer = new ArrayBuffer(44 + merged.length * 2);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + merged.length * 2, true);
  writeAscii(view, 8, 'WAVE');

  // "fmt " sub-chunk
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 = PCM)
  view.setUint16(22, 1, true); // NumChannels (1 = mono)
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * 2, true); // ByteRate (SampleRate * 1 channel * 2 bytes)
  view.setUint16(32, 2, true); // BlockAlign (1 channel * 2 bytes)
  view.setUint16(34, 16, true); // BitsPerSample (16 bits)

  // "data" sub-chunk
  writeAscii(view, 36, 'data');
  view.setUint32(40, merged.length * 2, true);

  // PCM samples (convert float [-1.0, 1.0] to 16-bit signed integer [-32768, 32767])
  let byteOffset = 44;
  for (let i = 0; i < merged.length; i++, byteOffset += 2) {
    const s = Math.max(-1, Math.min(1, merged[i]));
    view.setInt16(byteOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

/**
 * Хук для записи голосовых сообщений.
 * По умолчанию использует Web Audio API (AudioContext) для записи чистого 16-битного WAV (16 кГц mono),
 * совместимого с Yandex SpeechKit.
 * При отсутствии AudioContext автоматически переключается на MediaRecorder API.
 */
export const useAudioRecorder = (): AudioRecorderState => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const pcmChunksRef = useRef<Float32Array[]>([]);
  const isRecordingRef = useRef<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isRecordingRef.current = false;
    if (audioContextRef.current) {
      try {
        if (sourceRef.current && processorRef.current) {
          sourceRef.current.disconnect();
          processorRef.current.disconnect();
        }
        audioContextRef.current.close();
      } catch (ignored) {}
      audioContextRef.current = null;
      processorRef.current = null;
      sourceRef.current = null;
    }
    pcmChunksRef.current = [];
    cleanupStream();
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setIsRecording(false);
    setRecordingTime(0);
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
    audioChunksRef.current = [];
  }, [audioUrl, cleanupStream]);

  const initMediaRecorderFallback = useCallback((stream: MediaStream) => {
    let mimeType = 'audio/webm';
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }
    }
    const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaRecorderRef.current = mediaRecorder;
    audioChunksRef.current = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const recordedBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
      setAudioBlob(recordedBlob);
      const url = URL.createObjectURL(recordedBlob);
      setAudioUrl(url);
      cleanupStream();
    };

    mediaRecorder.start(250);
  }, [cleanupStream]);

  const startRecording = useCallback(async () => {
    resetRecording();
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Ваш браузер не поддерживает запись аудио');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        try {
          const audioCtx = new AudioCtx({ sampleRate: 16000 });
          audioContextRef.current = audioCtx;
          pcmChunksRef.current = [];
          isRecordingRef.current = true;

          const source = audioCtx.createMediaStreamSource(stream);
          sourceRef.current = source;

          const processor = audioCtx.createScriptProcessor(4096, 1, 1);
          processorRef.current = processor;

          processor.onaudioprocess = (e) => {
            if (!isRecordingRef.current) return;
            const inputData = e.inputBuffer.getChannelData(0);
            pcmChunksRef.current.push(new Float32Array(inputData));
          };

          source.connect(processor);
          processor.connect(audioCtx.destination);
        } catch (e) {
          console.warn('AudioContext init failed, falling back to MediaRecorder', e);
          initMediaRecorderFallback(stream);
        }
      } else if (typeof MediaRecorder !== 'undefined') {
        initMediaRecorderFallback(stream);
      }

      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      cleanupStream();
      setIsRecording(false);
      const isDenied = err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError';
      const msg = isDenied
        ? 'Доступ к микрофону запрещен. Пожалуйста, разрешите доступ в настройках браузера.'
        : (err.message || 'Ошибка запуска записи звука');
      setError(msg);
    }
  }, [cleanupStream, initMediaRecorderFallback, resetRecording]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isRecordingRef.current = false;

    if (audioContextRef.current) {
      try {
        if (sourceRef.current && processorRef.current) {
          sourceRef.current.disconnect();
          processorRef.current.disconnect();
        }
        const actualSampleRate = audioContextRef.current.sampleRate || 16000;
        const wavBlob = encodeWavBlob(pcmChunksRef.current, actualSampleRate);
        setAudioBlob(wavBlob);
        const url = URL.createObjectURL(wavBlob);
        setAudioUrl(url);
        audioContextRef.current.close();
      } catch (e) {
        console.error('Failed to finalize WAV audio recording', e);
      } finally {
        audioContextRef.current = null;
        processorRef.current = null;
        sourceRef.current = null;
        cleanupStream();
      }
    } else if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Failed to stop media recorder', e);
      }
    }

    setIsRecording(false);
  }, [cleanupStream]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  return {
    isRecording,
    recordingTime,
    audioBlob,
    audioUrl,
    error,
    startRecording,
    stopRecording,
    resetRecording
  };
};
