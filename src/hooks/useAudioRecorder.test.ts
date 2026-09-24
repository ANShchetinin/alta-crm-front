import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder, encodeWavBlob, downsampleBuffer } from './useAudioRecorder';

describe('useAudioRecorder', () => {
  let mockStream: any;
  let mockTrack: any;
  let currentMockRecorder: any = null;

  class MockMediaRecorder {
    static isTypeSupported = vi.fn().mockReturnValue(true);
    start = vi.fn();
    stop = vi.fn();
    ondataavailable: ((e: any) => void) | null = null;
    onstop: (() => void) | null = null;
    state = 'recording';
    mimeType = 'audio/webm';

    constructor() {
      currentMockRecorder = this;
    }
  }

  beforeEach(() => {
    currentMockRecorder = null;
    mockTrack = {
      stop: vi.fn()
    };

    mockStream = {
      getTracks: vi.fn().mockReturnValue([mockTrack])
    };

    (globalThis as any).navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(mockStream)
    };

    (globalThis as any).MediaRecorder = MockMediaRecorder;

    globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:dummy-url');
    globalThis.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with default non-recording state', () => {
    const { result } = renderHook(() => useAudioRecorder());
    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordingTime).toBe(0);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('starts recording and updates state', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(result.current.isRecording).toBe(true);
    expect(currentMockRecorder.start).toHaveBeenCalled();
  });

  it('handles permission denied error', async () => {
    const deniedErr = new Error('Permission denied');
    deniedErr.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(deniedErr);

    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.error).toContain('Доступ к микрофону запрещен');
  });

  it('stops recording and produces audioBlob and audioUrl', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      if (currentMockRecorder.ondataavailable) {
        currentMockRecorder.ondataavailable({ data: new Blob(['audio data']) });
      }
      result.current.stopRecording();
      if (currentMockRecorder.onstop) {
        currentMockRecorder.onstop();
      }
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).not.toBeNull();
    expect(result.current.audioUrl).toBe('blob:dummy-url');
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('resets recording properly', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    act(() => {
      result.current.resetRecording();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(mockTrack.stop).toHaveBeenCalled();
  });

  it('downsamples buffer from 48000 to 16000', () => {
    const input = new Float32Array(48000);
    for (let i = 0; i < input.length; i++) {
      input[i] = 0.5;
    }
    const downsampled = downsampleBuffer(input, 48000, 16000);
    expect(downsampled.length).toBe(16000);
    expect(downsampled[0]).toBeCloseTo(0.5, 4);
  });

  it('encodes WAV blob with 16kHz sample rate from 48000 source', async () => {
    const chunk = new Float32Array(480);
    const blob = encodeWavBlob([chunk], 48000, 16000);
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + 160 * 2); // 44 bytes header + 160 samples * 2 bytes
  });
});
