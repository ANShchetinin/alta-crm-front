import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap, ZapOff, RotateCw, Check, ArrowLeft, Sliders, RefreshCw, Sun, Camera } from 'lucide-react';
import type { Point, DocumentFilterType } from '../utils/documentScanner';
import {
  detectDocumentCorners,
  smoothCorners,
  warpPerspective,
  applyDocumentEnhancement,
  rotateCanvas,
  playShutterSound
} from '../utils/documentScanner';
import '../styles/documentScanner.css';

interface DocumentScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanComplete: (file: File) => void;
  orderId?: number;
  isAct?: boolean;
  defaultFileNamePrefix?: string;
}

type ScanStep = 'CAMERA' | 'ADJUST_CORNERS' | 'PREVIEW';

export const DocumentScannerModal: React.FC<DocumentScannerModalProps> = ({
  isOpen,
  onClose,
  onScanComplete,
  orderId,
  isAct = true,
  defaultFileNamePrefix
}) => {
  const [step, setStep] = useState<ScanStep>('CAMERA');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);
  const [isAutoCaptureEnabled, setIsAutoCaptureEnabled] = useState(true);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState(0); // 0..100
  const [statusMessage, setStatusMessage] = useState('Наведите камеру на документ');
  const [isFlashing, setIsFlashing] = useState(false);

  // Review step state
  const [capturedImageCanvas, setCapturedImageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [corners, setCorners] = useState<[Point, Point, Point, Point]>([
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 0 }
  ]);
  const [activeCornerIdx, setActiveCornerIdx] = useState<number | null>(null);

  // Preview step state
  const [processedCanvas, setProcessedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [activeFilter, setActiveFilter] = useState<DocumentFilterType>('color');
  const [rotationDegrees, setRotationDegrees] = useState<0 | 90 | 180 | 270>(0);
  const [isSaving, setIsSaving] = useState(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stableFramesCountRef = useRef<number>(0);
  const smoothedCornersRef = useRef<[Point, Point, Point, Point] | null>(null);
  const lastRawCornersRef = useRef<[Point, Point, Point, Point] | null>(null);
  const adjustSvgRef = useRef<SVGSVGElement | null>(null);
  const fallbackPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const cameraReadyTimestampRef = useRef<number>(0);

  // Progressive camera constraints cascade (4K Ultra-HD -> Full HD -> Standard)
  const getCameraStream = async (): Promise<MediaStream> => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Браузер не поддерживает прямой доступ к камере или соединение не по HTTPS.');
    }

    const constraintList: MediaStreamConstraints[] = [
      // 1. 4K Ultra-HD Back Camera
      {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 3840, min: 1920 },
          height: { ideal: 2160, min: 1080 }
        }
      },
      // 2. Full HD Back Camera
      {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      },
      // 3. Simple Back Camera
      {
        audio: false,
        video: {
          facingMode: { ideal: 'environment' }
        }
      },
      // 4. Any camera
      {
        audio: false,
        video: true
      }
    ];

    let lastError: any = null;
    for (const constraints of constraintList) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        return stream;
      } catch (err: any) {
        lastError = err;
      }
    }
    throw lastError || new Error('Камера недоступна');
  };

  // 1. Initialize Camera
  const startCamera = useCallback(async () => {
    setCameraError(null);
    cameraReadyTimestampRef.current = Date.now() + 1500; // 1.5s warmup/autofocus delay
    stableFramesCountRef.current = 0;
    setAutoCaptureProgress(0);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }

      const stream = await getCameraStream();
      streamRef.current = stream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.muted = true;

        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video play interrupted', playErr);
        }
      }

      const track = stream.getVideoTracks()[0];
      try {
        await (track as any).applyConstraints?.({
          advanced: [{ focusMode: 'continuous' }]
        });
      } catch {
        // Continuous focus not supported on this device
      }

      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && 'torch' in capabilities) {
        setHasTorchSupport(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Не удалось запустить камеру устройства.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Доступ к камере запрещен в браузере. Разрешите доступ или воспользуйтесь кнопкой съемки через приложение камеры ниже.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Камера не найдена на устройстве.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Камера уже используется другой программой.';
      } else if (err.message) {
        msg = err.message;
      }
      setCameraError(msg);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isOpen && step === 'CAMERA') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, step, startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      const nextState = !isTorchOn;
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setIsTorchOn(nextState);
    } catch (e) {
      console.warn('Failed to toggle torch', e);
    }
  };

  // 2. Real-time Scanner Pro Detection Loop
  useEffect(() => {
    if (step !== 'CAMERA' || !isOpen) return;

    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 320;
      offscreenCanvasRef.current.height = 240;
    }

    const processFrame = () => {
      const video = videoRef.current;
      const overlay = liveCanvasRef.current;
      const offscreen = offscreenCanvasRef.current;

      if (video && overlay && offscreen && video.readyState === video.HAVE_ENOUGH_DATA) {
        const vw = video.videoWidth || 640;
        const vh = video.videoHeight || 480;

        overlay.width = video.clientWidth;
        overlay.height = video.clientHeight;

        const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
        const ovCtx = overlay.getContext('2d');

        if (offCtx && ovCtx) {
          offCtx.drawImage(video, 0, 0, offscreen.width, offscreen.height);
          const rawDetected = detectDocumentCorners(offscreen, vw, vh);

          ovCtx.clearRect(0, 0, overlay.width, overlay.height);

          const cw = overlay.width;
          const ch = overlay.height;
          const videoRatio = vw / vh;
          const containerRatio = cw / ch;

          let renderW = cw;
          let renderH = ch;
          let offsetX = 0;
          let offsetY = 0;

          if (containerRatio > videoRatio) {
            renderW = ch * videoRatio;
            offsetX = (cw - renderW) / 2;
          } else {
            renderH = cw / videoRatio;
            offsetY = (ch - renderH) / 2;
          }

          const scaleX = renderW / vw;
          const scaleY = renderH / vh;

          if (rawDetected) {
            // Apply smoothing filter to prevent polygon jumping
            const smoothed = smoothCorners(smoothedCornersRef.current, rawDetected, 0.45);
            smoothedCornersRef.current = smoothed;
            lastRawCornersRef.current = smoothed;

            const displayPoints: [Point, Point, Point, Point] = [
              { x: offsetX + smoothed[0].x * scaleX, y: offsetY + smoothed[0].y * scaleY },
              { x: offsetX + smoothed[1].x * scaleX, y: offsetY + smoothed[1].y * scaleY },
              { x: offsetX + smoothed[2].x * scaleX, y: offsetY + smoothed[2].y * scaleY },
              { x: offsetX + smoothed[3].x * scaleX, y: offsetY + smoothed[3].y * scaleY }
            ];

            // Measure stability
            const d0 = Math.hypot(smoothed[0].x - rawDetected[0].x, smoothed[0].y - rawDetected[0].y);
            const d1 = Math.hypot(smoothed[1].x - rawDetected[1].x, smoothed[1].y - rawDetected[1].y);
            const d2 = Math.hypot(smoothed[2].x - rawDetected[2].x, smoothed[2].y - rawDetected[2].y);
            const d3 = Math.hypot(smoothed[3].x - rawDetected[3].x, smoothed[3].y - rawDetected[3].y);
            const maxDelta = Math.max(d0, d1, d2, d3);

            const isWarm = Date.now() > cameraReadyTimestampRef.current;
            const requiredFrames = 36;

            if (maxDelta < 20) {
              stableFramesCountRef.current++;
            } else {
              stableFramesCountRef.current = Math.max(0, stableFramesCountRef.current - 2);
            }

            const progress = isWarm
              ? Math.min(100, Math.round((stableFramesCountRef.current / requiredFrames) * 100))
              : 0;
            setAutoCaptureProgress(progress);

            const isReady = isWarm && progress >= 100;

            // Draw Scanner Pro Polygon Overlay
            ovCtx.save();
            ovCtx.beginPath();
            ovCtx.moveTo(displayPoints[0].x, displayPoints[0].y);
            ovCtx.lineTo(displayPoints[1].x, displayPoints[1].y);
            ovCtx.lineTo(displayPoints[2].x, displayPoints[2].y);
            ovCtx.lineTo(displayPoints[3].x, displayPoints[3].y);
            ovCtx.closePath();

            ovCtx.fillStyle = isReady ? 'rgba(34, 197, 94, 0.32)' : 'rgba(59, 130, 246, 0.2)';
            ovCtx.fill();
            ovCtx.strokeStyle = isReady ? '#22c55e' : '#60a5fa';
            ovCtx.lineWidth = 4;
            ovCtx.lineJoin = 'round';
            ovCtx.stroke();

            // Draw Scanner Pro Corner Target Brackets
            displayPoints.forEach((p, i) => {
              const bSize = 16;
              ovCtx.strokeStyle = isReady ? '#22c55e' : '#38bdf8';
              ovCtx.lineWidth = 4;
              ovCtx.beginPath();

              if (i === 0) { // TL
                ovCtx.moveTo(p.x, p.y + bSize); ovCtx.lineTo(p.x, p.y); ovCtx.lineTo(p.x + bSize, p.y);
              } else if (i === 1) { // TR
                ovCtx.moveTo(p.x - bSize, p.y); ovCtx.lineTo(p.x, p.y); ovCtx.lineTo(p.x, p.y + bSize);
              } else if (i === 2) { // BR
                ovCtx.moveTo(p.x, p.y - bSize); ovCtx.lineTo(p.x, p.y); ovCtx.lineTo(p.x - bSize, p.y);
              } else if (i === 3) { // BL
                ovCtx.moveTo(p.x + bSize, p.y); ovCtx.lineTo(p.x, p.y); ovCtx.lineTo(p.x, p.y - bSize);
              }
              ovCtx.stroke();

              // Center Dot
              ovCtx.beginPath();
              ovCtx.arc(p.x, p.y, 5, 0, Math.PI * 2);
              ovCtx.fillStyle = '#ffffff';
              ovCtx.fill();
            });
            ovCtx.restore();

            if (isReady && isAutoCaptureEnabled) {
              triggerCapture(smoothed);
              return;
            } else if (stableFramesCountRef.current > 4) {
              setStatusMessage('Держите неподвижно...');
            } else {
              setStatusMessage('Документ обнаружен');
            }
          } else {
            stableFramesCountRef.current = 0;
            smoothedCornersRef.current = null;
            setAutoCaptureProgress(0);
            setStatusMessage('Наведите камеру на документ');

            // Draw default guide frame when searching
            ovCtx.save();
            const gw = renderW * 0.72;
            const gh = renderH * 0.78;
            const gx = offsetX + (renderW - gw) / 2;
            const gy = offsetY + (renderH - gh) / 2;

            ovCtx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
            ovCtx.lineWidth = 2;
            ovCtx.setLineDash([8, 8]);
            ovCtx.strokeRect(gx, gy, gw, gh);
            ovCtx.restore();
          }
        }
      }

      animFrameIdRef.current = requestAnimationFrame(processFrame);
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [step, isOpen, isAutoCaptureEnabled]);

  // 3. Trigger Shutter Capture with Sound, Flash, and Haptics
  const triggerCapture = (detectedCorners?: [Point, Point, Point, Point]) => {
    const video = videoRef.current;
    if (!video) return;

    // Flash & Shutter Audio Feedback (Scanner Pro style)
    setIsFlashing(true);
    playShutterSound();
    if (navigator.vibrate) {
      navigator.vibrate([40, 30, 80]);
    }
    setTimeout(() => setIsFlashing(false), 200);

    const vw = video.videoWidth || 1920;
    const vh = video.videoHeight || 1080;

    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = vw;
    fullCanvas.height = vh;
    const ctx = fullCanvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, vw, vh);
    setCapturedImageCanvas(fullCanvas);

    const initialCorners: [Point, Point, Point, Point] = detectedCorners || lastRawCornersRef.current || [
      { x: Math.round(vw * 0.1), y: Math.round(vh * 0.1) },
      { x: Math.round(vw * 0.9), y: Math.round(vh * 0.1) },
      { x: Math.round(vw * 0.9), y: Math.round(vh * 0.9) },
      { x: Math.round(vw * 0.1), y: Math.round(vh * 0.9) }
    ];

    setCorners(initialCorners);
    stopCamera();
    setStep('ADJUST_CORNERS');
  };

  // Process photo captured via native device camera fallback
  const handleFallbackPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        setCapturedImageCanvas(canvas);

        const offscreen = document.createElement('canvas');
        offscreen.width = 320;
        offscreen.height = 240;
        const offCtx = offscreen.getContext('2d');
        let detected: [Point, Point, Point, Point] | null = null;
        if (offCtx) {
          offCtx.drawImage(img, 0, 0, 320, 240);
          detected = detectDocumentCorners(offscreen, canvas.width, canvas.height);
        }

        const initialCorners: [Point, Point, Point, Point] = detected || [
          { x: Math.round(canvas.width * 0.1), y: Math.round(canvas.height * 0.1) },
          { x: Math.round(canvas.width * 0.9), y: Math.round(canvas.height * 0.1) },
          { x: Math.round(canvas.width * 0.9), y: Math.round(canvas.height * 0.9) },
          { x: Math.round(canvas.width * 0.1), y: Math.round(canvas.height * 0.9) }
        ];

        setCorners(initialCorners);
        stopCamera();
        setStep('ADJUST_CORNERS');
      }
    };
    img.src = URL.createObjectURL(file);
    e.target.value = '';
  };

  // Convert screen coordinates to SVG Image coordinates for corner dragging
  const updateCornerFromClientPoint = (clientX: number, clientY: number) => {
    if (activeCornerIdx === null || !adjustSvgRef.current || !capturedImageCanvas) return;
    const svg = adjustSvgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPoint = pt.matrixTransform(svg.getScreenCTM()?.inverse());

    const imgW = capturedImageCanvas.width;
    const imgH = capturedImageCanvas.height;

    const clampedX = Math.max(0, Math.min(imgW, Math.round(svgPoint.x)));
    const clampedY = Math.max(0, Math.min(imgH, Math.round(svgPoint.y)));

    const nextCorners = [...corners] as [Point, Point, Point, Point];
    nextCorners[activeCornerIdx] = { x: clampedX, y: clampedY };
    setCorners(nextCorners);
  };

  // 4. Generate Warped & Enhanced Preview (Standard 300 DPI A4: 2480 x 3508 px)
  const generatePreview = useCallback((cornerPoints: [Point, Point, Point, Point]) => {
    if (!capturedImageCanvas) return;

    const warped = warpPerspective(capturedImageCanvas, cornerPoints, 2480, 3508);
    applyDocumentEnhancement(warped, activeFilter);

    let finalCanvas = warped;
    if (rotationDegrees !== 0) {
      finalCanvas = rotateCanvas(warped, rotationDegrees);
    }

    setProcessedCanvas(finalCanvas);
    setStep('PREVIEW');
  }, [capturedImageCanvas, activeFilter, rotationDegrees]);

  const handleFilterChange = (filter: DocumentFilterType) => {
    setActiveFilter(filter);
    if (!capturedImageCanvas) return;
    const warped = warpPerspective(capturedImageCanvas, corners, 2480, 3508);
    applyDocumentEnhancement(warped, filter);
    let finalCanvas = warped;
    if (rotationDegrees !== 0) {
      finalCanvas = rotateCanvas(warped, rotationDegrees);
    }
    setProcessedCanvas(finalCanvas);
  };

  const handleRotate = () => {
    const nextRot = ((rotationDegrees + 90) % 360) as 0 | 90 | 180 | 270;
    setRotationDegrees(nextRot);
    if (!capturedImageCanvas) return;
    const warped = warpPerspective(capturedImageCanvas, corners, 2480, 3508);
    applyDocumentEnhancement(warped, activeFilter);
    const finalCanvas = rotateCanvas(warped, nextRot);
    setProcessedCanvas(finalCanvas);
  };

  // 5. Complete & Save File
  const handleSaveScan = () => {
    if (!processedCanvas) return;

    setIsSaving(true);
    processedCanvas.toBlob((blob) => {
      if (!blob) {
        setIsSaving(false);
        return;
      }
      const timestamp = new Date().toISOString().slice(0, 10);
      const prefix = defaultFileNamePrefix || (isAct ? 'Акт_выполненных_работ' : 'Документ');
      const fileName = `${prefix}_${orderId ? `№${orderId}_` : ''}${timestamp}.jpg`;
      const file = new File([blob], fileName, { type: 'image/jpeg' });

      onScanComplete(file);
      setIsSaving(false);
      onClose();
    }, 'image/jpeg', 0.95);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="doc-scanner-overlay">
      {/* Shutter White Flash Animation */}
      {isFlashing && <div className="doc-scanner-flash-overlay" />}

      {/* ================= STEP 1: CAMERA LIVE FEED ================= */}
      {step === 'CAMERA' && (
        <div className="doc-scanner-camera-view">
          <div className="doc-scanner-topbar">
            <button type="button" onClick={onClose} className="doc-scanner-btn-icon" title="Закрыть">
              <X size={24} />
            </button>
            <div className="doc-scanner-mode-pill">
              <span className={`doc-scanner-status-dot ${autoCaptureProgress > 75 ? 'ready' : ''}`} />
              <span>{statusMessage}</span>
            </div>
            {hasTorchSupport && (
              <button 
                type="button" 
                onClick={toggleTorch} 
                className={`doc-scanner-btn-icon ${isTorchOn ? 'active' : ''}`}
                title="Фонарик"
              >
                {isTorchOn ? <Zap size={22} /> : <ZapOff size={22} />}
              </button>
            )}
          </div>

          <div className="doc-scanner-video-container">
            <video ref={videoRef} playsInline muted autoPlay className="doc-scanner-video" />
            <canvas ref={liveCanvasRef} className="doc-scanner-overlay-canvas" />

            {cameraError && (
              <div className="doc-scanner-error-panel">
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f87171', marginBottom: '4px' }}>
                  Камера недоступна
                </div>
                <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                  {cameraError}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '280px' }}>
                  <button 
                    type="button" 
                    onClick={() => fallbackPhotoInputRef.current?.click()} 
                    className="btn btn-primary"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)', padding: '12px 16px', fontWeight: 600 }}
                  >
                    📷 Снять через камеру устройства
                  </button>
                  <button type="button" onClick={startCamera} className="btn btn-secondary" style={{ padding: '10px 16px' }}>
                    🔄 Повторить запуск
                  </button>
                </div>
              </div>
            )}

            <input
              ref={fallbackPhotoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFallbackPhoto}
            />
          </div>

          {/* Bottom Control Bar */}
          <div className="doc-scanner-bottom-bar">
            <div className="doc-scanner-auto-toggle">
              <button
                type="button"
                className={`doc-scanner-toggle-btn ${isAutoCaptureEnabled ? 'active' : ''}`}
                onClick={() => setIsAutoCaptureEnabled(!isAutoCaptureEnabled)}
              >
                Автоскан: {isAutoCaptureEnabled ? 'ВКЛ' : 'ВЫКЛ'}
              </button>
            </div>

            {/* Manual Shutter Button with Countdown Progress Ring */}
            <button
              type="button"
              className="doc-scanner-shutter-btn"
              onClick={() => triggerCapture()}
              title="Сделать снимок"
            >
              <div className="doc-scanner-shutter-inner" />
              {isAutoCaptureEnabled && autoCaptureProgress > 0 && (
                <svg className="doc-scanner-shutter-progress" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    strokeDasharray="289"
                    strokeDashoffset={289 - (289 * autoCaptureProgress) / 100}
                  />
                </svg>
              )}
            </button>

            <div style={{ width: '80px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => fallbackPhotoInputRef.current?.click()}
                className="doc-scanner-toggle-btn"
                title="Снять через системную камеру"
                style={{ whiteSpace: 'nowrap' }}
              >
                <Camera size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                Камера
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STEP 2: CORNER ADJUSTMENT ================= */}
      {step === 'ADJUST_CORNERS' && capturedImageCanvas && (
        <div 
          className="doc-scanner-adjust-view"
          onMouseMove={(e) => {
            if (activeCornerIdx !== null) updateCornerFromClientPoint(e.clientX, e.clientY);
          }}
          onMouseUp={() => setActiveCornerIdx(null)}
          onTouchMove={(e) => {
            if (activeCornerIdx !== null) {
              const t = e.touches[0];
              updateCornerFromClientPoint(t.clientX, t.clientY);
            }
          }}
          onTouchEnd={() => setActiveCornerIdx(null)}
        >
          <div className="doc-scanner-topbar">
            <button
              type="button"
              onClick={() => {
                setStep('CAMERA');
                startCamera();
              }}
              className="doc-scanner-btn-icon"
              title="Переснять"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="doc-scanner-mode-pill">
              <span>Подправьте границы листа</span>
            </div>
            <button
              type="button"
              onClick={() => generatePreview(corners)}
              className="doc-scanner-btn-pill-action"
            >
              Далее <Check size={18} />
            </button>
          </div>

          <div className="doc-scanner-adjust-canvas-wrap">
            <svg
              ref={adjustSvgRef}
              viewBox={`0 0 ${capturedImageCanvas.width} ${capturedImageCanvas.height}`}
              className="doc-scanner-adjust-svg"
            >
              {/* Background Image */}
              <image
                href={capturedImageCanvas.toDataURL('image/jpeg', 0.92)}
                width={capturedImageCanvas.width}
                height={capturedImageCanvas.height}
              />

              {/* Shaded Area polygon */}
              <polygon
                points={`${corners[0].x},${corners[0].y} ${corners[1].x},${corners[1].y} ${corners[2].x},${corners[2].y} ${corners[3].x},${corners[3].y}`}
                fill="rgba(34, 197, 94, 0.28)"
                stroke="#22c55e"
                strokeWidth={Math.max(4, Math.round(capturedImageCanvas.width / 240))}
                strokeLinejoin="round"
              />

              {/* 4 Interactive Corner Handles */}
              {corners.map((c, idx) => {
                const r = Math.max(18, Math.round(capturedImageCanvas.width / 55));
                const touchR = r * 2.2;
                return (
                  <g
                    key={idx}
                    className="doc-scanner-svg-handle"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setActiveCornerIdx(idx);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      setActiveCornerIdx(idx);
                    }}
                    style={{ cursor: 'grab' }}
                  >
                    <circle cx={c.x} cy={c.y} r={touchR} fill="transparent" />
                    <circle cx={c.x} cy={c.y} r={r + 6} fill="none" stroke="#22c55e" strokeWidth={3} opacity={0.6} />
                    <circle cx={c.x} cy={c.y} r={r} fill="#22c55e" stroke="#ffffff" strokeWidth={3.5} />
                  </g>
                );
              })}
            </svg>
          </div>

          <div className="doc-scanner-adjust-footer">
            <span style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>
              Передвиньте 4 зеленых маркера на углы документа
            </span>
          </div>
        </div>
      )}

      {/* ================= STEP 3: PREVIEW & ENHANCEMENT ================= */}
      {step === 'PREVIEW' && processedCanvas && (
        <div className="doc-scanner-preview-view">
          <div className="doc-scanner-topbar">
            <button
              type="button"
              onClick={() => setStep('ADJUST_CORNERS')}
              className="doc-scanner-btn-icon"
              title="Назад"
            >
              <ArrowLeft size={24} />
            </button>
            <div className="doc-scanner-mode-pill">
              <span>Готовый скан (300 DPI)</span>
            </div>
            <button
              type="button"
              onClick={handleRotate}
              className="doc-scanner-btn-icon"
              title="Повернуть на 90°"
            >
              <RotateCw size={22} />
            </button>
          </div>

          {/* Processed Document View */}
          <div className="doc-scanner-preview-card-wrap">
            <img
              src={processedCanvas.toDataURL('image/jpeg', 0.95)}
              alt="Скан документа"
              className="doc-scanner-preview-img"
            />
          </div>

          {/* Filter Selection Tabs */}
          <div className="doc-scanner-filter-bar">
            <button
              type="button"
              className={`doc-scanner-filter-btn ${activeFilter === 'color' ? 'active' : ''}`}
              onClick={() => handleFilterChange('color')}
            >
              <Sun size={16} /> Цветной скан
            </button>
            <button
              type="button"
              className={`doc-scanner-filter-btn ${activeFilter === 'bw' ? 'active' : ''}`}
              onClick={() => handleFilterChange('bw')}
            >
              <Sliders size={16} /> Ч/Б документ
            </button>
            <button
              type="button"
              className={`doc-scanner-filter-btn ${activeFilter === 'original' ? 'active' : ''}`}
              onClick={() => handleFilterChange('original')}
            >
              Оригинал
            </button>
          </div>

          {/* Bottom Actions */}
          <div className="doc-scanner-preview-actions">
            <button
              type="button"
              onClick={() => {
                setStep('CAMERA');
                startCamera();
              }}
              className="btn btn-secondary"
              style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.92rem' }}
            >
              <RefreshCw size={16} /> Переснять
            </button>
            <button
              type="button"
              onClick={handleSaveScan}
              disabled={isSaving}
              className="btn btn-primary"
              style={{
                flex: 1.6,
                padding: '12px',
                borderRadius: '10px',
                fontSize: '0.95rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #22c55e, #16a34a)'
              }}
            >
              {isSaving ? 'Сохранение...' : 'Прикрепить к заявке'} <Check size={18} />
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
