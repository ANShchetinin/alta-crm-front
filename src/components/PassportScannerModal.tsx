import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Camera,
  ShieldCheck,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Check,
  AlertTriangle,
  RefreshCw,
  FileText,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon
} from 'lucide-react';
import { recognizeRussianPassport } from '../utils/passportParser';
import { normalizeRegistrationAddress } from '../utils/addressNormalizer';
import { scanPassportOnBackend } from '../api/passportOcr';
import '../styles/passportScanner.css';

export interface PassportApplyResult {
  name: string;
  birthDate: string;
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN';
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssuedDate: string;
  passportDepartmentCode: string;
  registrationAddress: string;
  installationAddress?: string;
  saveScans: boolean;
  scanFiles: File[];
}

interface PassportScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (result: PassportApplyResult) => void;
  showInstallationAddressOption?: boolean;
  currentInstallationAddress?: string;
}

export const PassportScannerModal: React.FC<PassportScannerModalProps> = ({
  isOpen,
  onClose,
  onApply,
  showInstallationAddressOption = true,
  currentInstallationAddress = ''
}) => {
  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'SCANS' | 'FIELDS'>('SCANS');
  const [showScansInFieldsView, setShowScansInFieldsView] = useState(false);

  // Page 1 (Main Spread: pages 2-3)
  const [mainPageFile, setMainPageFile] = useState<File | null>(null);
  const [mainPageUrl, setMainPageUrl] = useState<string | null>(null);
  const [mainPageCanvas, setMainPageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [mainPageRotation, setMainPageRotation] = useState<number>(0);
  const [mainPageZoom, setMainPageZoom] = useState<number>(1);

  // Page 2 (Registration Stamp)
  const [regPageFile, setRegPageFile] = useState<File | null>(null);
  const [regPageUrl, setRegPageUrl] = useState<string | null>(null);
  const [regPageCanvas, setRegPageCanvas] = useState<HTMLCanvasElement | null>(null);
  const [regPageRotation, setRegPageRotation] = useState<number>(0);
  const [regPageZoom, setRegPageZoom] = useState<number>(1);

  // Recognition state
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [hasRecognized, setHasRecognized] = useState(false);

  // Editable Form Data
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    gender: 'UNKNOWN' as 'MALE' | 'FEMALE' | 'UNKNOWN',
    passportSeriesNumber: '',
    passportIssuedBy: '',
    passportIssuedDate: '',
    passportDepartmentCode: '',
    registrationAddress: ''
  });

  // Confidence indicators
  const [confidence, setConfidence] = useState<Record<string, 'HIGH' | 'MEDIUM' | 'LOW' | 'MRZ'>>({});

  // Options
  const [addressSameAsInstallation, setAddressSameAsInstallation] = useState(false);
  const [saveScansToFiles, setSaveScansToFiles] = useState(true);

  // Refs
  const mainFileInputRef = useRef<HTMLInputElement | null>(null);
  const regFileInputRef = useRef<HTMLInputElement | null>(null);
  const mainCameraInputRef = useRef<HTMLInputElement | null>(null);
  const regCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setWarnings([]);
      setOcrStatus('');
      setOcrProgress(0);
      setMobileTab('SCANS');
    }
  }, [isOpen]);

  // Clean URLs on unmount
  useEffect(() => {
    return () => {
      if (mainPageUrl) URL.revokeObjectURL(mainPageUrl);
      if (regPageUrl) URL.revokeObjectURL(regPageUrl);
    };
  }, [mainPageUrl, regPageUrl]);

  // Load image to Canvas with rotation
  const processImageFileToCanvas = (file: File, rotation: number, callback: (canvas: HTMLCanvasElement, url: string) => void) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const rad = (rotation * Math.PI) / 180;
      const is90or270 = rotation === 90 || rotation === 270;
      canvas.width = is90or270 ? img.height : img.width;
      canvas.height = is90or270 ? img.width : img.height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
      }
      callback(canvas, url);
    };
    img.src = url;
  };

  const handleMainFileChange = (file: File) => {
    setMainPageFile(file);
    setMainPageRotation(0);
    processImageFileToCanvas(file, 0, (canvas, url) => {
      setMainPageCanvas(canvas);
      setMainPageUrl(url);
    });
  };

  const handleRegFileChange = (file: File) => {
    setRegPageFile(file);
    setRegPageRotation(0);
    processImageFileToCanvas(file, 0, (canvas, url) => {
      setRegPageCanvas(canvas);
      setRegPageUrl(url);
    });
  };

  const rotateMainPage = () => {
    if (!mainPageFile) return;
    const nextRot = (mainPageRotation + 90) % 360;
    setMainPageRotation(nextRot);
    processImageFileToCanvas(mainPageFile, nextRot, (canvas) => {
      setMainPageCanvas(canvas);
    });
  };

  const rotateRegPage = () => {
    if (!regPageFile) return;
    const nextRot = (regPageRotation + 90) % 360;
    setRegPageRotation(nextRot);
    processImageFileToCanvas(regPageFile, nextRot, (canvas) => {
      setRegPageCanvas(canvas);
    });
  };

  // Run Local OCR Pipeline
  const handleStartOcr = async () => {
    if (!mainPageCanvas && !regPageCanvas) {
      alert('Пожалуйста, загрузите хотя бы одну страницу паспорта для распознавания.');
      return;
    }

    setIsRecognizing(true);
    setOcrProgress(5);
    setOcrStatus('Подготовка изображений...');

    try {
      let extractedFullName = '';
      let extractedBirthDate = '';
      let extractedGender: 'MALE' | 'FEMALE' | 'UNKNOWN' = 'UNKNOWN';
      let extractedSeriesNumber = '';
      let extractedIssuedBy = '';
      let extractedIssuedDate = '';
      let extractedDeptCode = '';
      let extractedRegAddress = '';
      let resWarnings: string[] = [];

      let usedBackend = false;

      // 1. Try Backend Neural OCR Service
      if (mainPageFile) {
        try {
          setOcrStatus('Нейросетевой анализ на сервере...');
          setOcrProgress(30);
          const backendRes = await scanPassportOnBackend(mainPageFile, regPageFile);
          if (backendRes && (backendRes.full_name?.value || backendRes.passport_series_number?.value)) {
            usedBackend = true;
            extractedFullName = backendRes.full_name?.value || '';
            extractedBirthDate = backendRes.birth_date?.value || '';
            extractedGender = (backendRes.gender?.value as any) || 'UNKNOWN';
            extractedSeriesNumber = backendRes.passport_series_number?.value || '';
            extractedIssuedBy = backendRes.passport_issued_by?.value || '';
            extractedIssuedDate = backendRes.passport_issued_date?.value || '';
            extractedDeptCode = backendRes.passport_department_code?.value || '';
            extractedRegAddress = backendRes.registration_address?.value || '';
            resWarnings = backendRes.warnings || [];

            setConfidence({
              name: backendRes.full_name?.confidence || 'HIGH',
              birthDate: backendRes.birth_date?.confidence || 'HIGH',
              passportSeriesNumber: backendRes.passport_series_number?.confidence || 'HIGH',
              passportIssuedBy: backendRes.passport_issued_by?.confidence || 'HIGH',
              passportIssuedDate: backendRes.passport_issued_date?.confidence || 'HIGH',
              passportDepartmentCode: backendRes.passport_department_code?.confidence || 'HIGH',
              registrationAddress: backendRes.registration_address?.confidence || 'HIGH'
            });
          }
        } catch (backendErr) {
          console.warn('Backend OCR unavailable or failed, falling back to local WASM OCR:', backendErr);
        }
      }

      // 2. Fallback to Local WebAssembly OCR if Backend was not used
      if (!usedBackend && mainPageCanvas) {
        setOcrStatus('Локальный анализ документа (WASM)...');
        const localExtracted = await recognizeRussianPassport(
          mainPageCanvas,
          regPageCanvas,
          (stage, prog) => {
            setOcrStatus(stage);
            setOcrProgress(prog);
          }
        );

        if (localExtracted) {
          extractedFullName = localExtracted.fullName.value;
          extractedBirthDate = localExtracted.birthDate.value;
          extractedGender = localExtracted.gender.value;
          extractedSeriesNumber = localExtracted.passportSeriesNumber.value;
          extractedIssuedBy = localExtracted.passportIssuedBy.value;
          extractedIssuedDate = localExtracted.passportIssuedDate.value;
          extractedDeptCode = localExtracted.passportDepartmentCode.value;
          extractedRegAddress = localExtracted.registrationAddress.value;
          resWarnings = localExtracted.warnings || [];

          setConfidence({
            name: localExtracted.mrzParsed ? 'MRZ' : localExtracted.fullName.confidence,
            birthDate: localExtracted.mrzParsed ? 'MRZ' : localExtracted.birthDate.confidence,
            passportSeriesNumber: localExtracted.mrzParsed ? 'MRZ' : localExtracted.passportSeriesNumber.confidence,
            passportIssuedBy: localExtracted.passportIssuedBy.confidence,
            passportIssuedDate: localExtracted.passportIssuedDate.confidence,
            passportDepartmentCode: localExtracted.passportDepartmentCode.confidence,
            registrationAddress: localExtracted.registrationAddress.confidence
          });
        }
      }

      setWarnings(resWarnings);

      let formattedRegAddress = extractedRegAddress;
      if (formattedRegAddress) {
        setOcrStatus('Стандартизация адреса регистрации...');
        const norm = await normalizeRegistrationAddress(formattedRegAddress);
        formattedRegAddress = norm.formattedAddress || formattedRegAddress;
      }

      setFormData({
        name: extractedFullName,
        birthDate: extractedBirthDate,
        gender: extractedGender,
        passportSeriesNumber: extractedSeriesNumber,
        passportIssuedBy: extractedIssuedBy,
        passportIssuedDate: extractedIssuedDate,
        passportDepartmentCode: extractedDeptCode,
        registrationAddress: formattedRegAddress
      });

      setHasRecognized(true);
      // Switch to Fields tab on mobile automatically after recognition
      setMobileTab('FIELDS');
    } catch (err: any) {
      console.error('OCR Recognition failed:', err);
      setWarnings([`Ошибка распознавания: ${err?.message || 'Не удалось распознать скан'}`]);
    } finally {
      setIsRecognizing(false);
      setOcrStatus('');
    }
  };

  const handleApply = () => {
    const scanFiles: File[] = [];
    if (mainPageFile) scanFiles.push(mainPageFile);
    if (regPageFile) scanFiles.push(regPageFile);

    const result: PassportApplyResult = {
      name: formData.name.trim(),
      birthDate: formData.birthDate.trim(),
      gender: formData.gender,
      passportSeriesNumber: formData.passportSeriesNumber.trim(),
      passportIssuedBy: formData.passportIssuedBy.trim(),
      passportIssuedDate: formData.passportIssuedDate.trim(),
      passportDepartmentCode: formData.passportDepartmentCode.trim(),
      registrationAddress: formData.registrationAddress.trim(),
      installationAddress: addressSameAsInstallation ? formData.registrationAddress.trim() : undefined,
      saveScans: saveScansToFiles,
      scanFiles
    };

    onApply(result);
    onClose();
  };

  const loadedScansCount = (mainPageFile ? 1 : 0) + (regPageFile ? 1 : 0);

  if (!isOpen) return null;

  return createPortal(
    <div className="passport-scanner-overlay" onClick={onClose}>
      <div className="passport-scanner-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="passport-scanner-header">
          <div className="passport-scanner-title">
            <FileText size={20} style={{ color: '#3b82f6', flexShrink: 0 }} />
            <span>Распознавание паспорта РФ</span>
            <span className="passport-scanner-badge-secure">
              <ShieldCheck size={13} /> 152-ФЗ Локально
            </span>
          </div>
          <button type="button" onClick={onClose} className="passport-scanner-close-btn" title="Закрыть">
            <X size={20} />
          </button>
        </div>

        {/* Mobile Tabs */}
        <div className="passport-scanner-tabs">
          <button
            type="button"
            onClick={() => setMobileTab('SCANS')}
            className={`passport-tab-btn ${mobileTab === 'SCANS' ? 'active' : ''}`}
          >
            <Camera size={16} />
            <span>1. Сканы паспорта</span>
            <span className="passport-tab-badge">{loadedScansCount}/2</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('FIELDS')}
            className={`passport-tab-btn ${mobileTab === 'FIELDS' ? 'active' : ''}`}
          >
            <Check size={16} />
            <span>2. Данные и сверка</span>
            {hasRecognized && <span className="passport-tab-badge" style={{ background: '#22c55e' }}>✓</span>}
          </button>
        </div>

        {/* Body (Split Screen on Desktop, Tabs on Mobile) */}
        <div className="passport-scanner-body">
          {/* Left Pane: Image Upload & Preview */}
          <div className={`passport-scanner-left ${mobileTab === 'SCANS' ? 'mobile-active' : ''}`}>
            {/* Zone 1: Main Spread */}
            <div className={`passport-drop-zone ${mainPageUrl ? 'has-image' : ''}`}>
              <div className="passport-drop-zone-header">
                <div className="passport-drop-zone-title">
                  <span style={{ color: '#60a5fa' }}>1.</span> Главный разворот (фото и реквизиты)
                </div>
                {mainPageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setMainPageFile(null);
                      setMainPageUrl(null);
                      setMainPageCanvas(null);
                    }}
                    className="passport-tool-btn"
                    title="Удалить скан"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {mainPageUrl ? (
                <div className="passport-preview-box">
                  <img
                    src={mainPageUrl}
                    alt="Главный разворот"
                    className="passport-preview-img"
                    style={{ transform: `rotate(${mainPageRotation}deg) scale(${mainPageZoom})` }}
                  />
                  <div className="passport-img-toolbar">
                    <button type="button" onClick={rotateMainPage} className="passport-tool-btn" title="Повернуть на 90°">
                      <RotateCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainPageZoom(Math.min(2.5, mainPageZoom + 0.25))}
                      className="passport-tool-btn"
                      title="Увеличить"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainPageZoom(Math.max(0.75, mainPageZoom - 0.25))}
                      className="passport-tool-btn"
                      title="Уменьшить"
                    >
                      <ZoomOut size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  <Upload size={26} style={{ color: '#94a3b8' }} />
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Сфотографируйте разворот (стр. 2–3) или загрузите скан
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => mainCameraInputRef.current?.click()}
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Camera size={15} />
                      Снять на камеру
                    </button>
                    <button
                      type="button"
                      onClick={() => mainFileInputRef.current?.click()}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={15} />
                      Выбрать файл
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={mainFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMainFileChange(f);
                }}
              />
              <input
                ref={mainCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMainFileChange(f);
                }}
              />
            </div>

            {/* Zone 2: Registration Stamp */}
            <div className={`passport-drop-zone ${regPageUrl ? 'has-image' : ''}`}>
              <div className="passport-drop-zone-header">
                <div className="passport-drop-zone-title">
                  <span style={{ color: '#4ade80' }}>2.</span> Страница регистрации (прописка)
                </div>
                {regPageUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegPageFile(null);
                      setRegPageUrl(null);
                      setRegPageCanvas(null);
                    }}
                    className="passport-tool-btn"
                    title="Удалить скан"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {regPageUrl ? (
                <div className="passport-preview-box">
                  <img
                    src={regPageUrl}
                    alt="Страница прописки"
                    className="passport-preview-img"
                    style={{ transform: `rotate(${regPageRotation}deg) scale(${regPageZoom})` }}
                  />
                  <div className="passport-img-toolbar">
                    <button type="button" onClick={rotateRegPage} className="passport-tool-btn" title="Повернуть на 90°">
                      <RotateCw size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegPageZoom(Math.min(2.5, regPageZoom + 0.25))}
                      className="passport-tool-btn"
                      title="Увеличить"
                    >
                      <ZoomIn size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegPageZoom(Math.max(0.75, regPageZoom - 0.25))}
                      className="passport-tool-btn"
                      title="Уменьшить"
                    >
                      <ZoomOut size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '10px 0' }}>
                  <Upload size={26} style={{ color: '#94a3b8' }} />
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Сфотографируйте штамп прописки (стр. 4–5)
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      type="button"
                      onClick={() => regCameraInputRef.current?.click()}
                      className="btn btn-primary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Camera size={15} />
                      Снять на камеру
                    </button>
                    <button
                      type="button"
                      onClick={() => regFileInputRef.current?.click()}
                      className="btn btn-secondary"
                      style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Upload size={15} />
                      Выбрать файл
                    </button>
                  </div>
                </div>
              )}

              <input
                ref={regFileInputRef}
                type="file"
                accept="image/*,application/pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRegFileChange(f);
                }}
              />
              <input
                ref={regCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRegFileChange(f);
                }}
              />
            </div>

            {/* OCR Start Button */}
            <button
              type="button"
              onClick={handleStartOcr}
              disabled={isRecognizing || (!mainPageCanvas && !regPageCanvas)}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                marginTop: 'auto'
              }}
            >
              {isRecognizing ? <RefreshCw className="spin" size={18} /> : <Sparkles size={18} />}
              {isRecognizing ? 'Распознавание...' : '🚀 Запустить распознавание'}
            </button>
          </div>

          {/* Right Pane: Extracted Fields & Verification */}
          <div className={`passport-scanner-right ${mobileTab === 'FIELDS' ? 'mobile-active' : ''}`}>
            {/* Mobile Scans Toggle Accordion (to compare scan & fields directly on phone) */}
            {(mainPageUrl || regPageUrl) && (
              <div className="passport-mobile-scans-toggle" onClick={() => setShowScansInFieldsView(!showScansInFieldsView)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ImageIcon size={16} />
                  <span>{showScansInFieldsView ? 'Скрыть сканы паспорта' : '🔍 Показать сканы для сверки'}</span>
                </div>
                {showScansInFieldsView ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            )}

            {/* Embedded scans when toggled on mobile */}
            {showScansInFieldsView && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#0b1120', padding: '8px', borderRadius: '8px' }}>
                {mainPageUrl && (
                  <div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Главный разворот:</div>
                    <img
                      src={mainPageUrl}
                      alt="Разворот"
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', transform: `rotate(${mainPageRotation}deg)` }}
                    />
                  </div>
                )}
                {regPageUrl && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '4px' }}>Прописка:</div>
                    <img
                      src={regPageUrl}
                      alt="Прописка"
                      style={{ width: '100%', maxHeight: '180px', objectFit: 'contain', transform: `rotate(${regPageRotation}deg)` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Progress Card */}
            {isRecognizing && (
              <div className="passport-progress-card">
                <div className="passport-progress-label">
                  <span>{ocrStatus || 'Обработка...'}</span>
                  <span>{ocrProgress}%</span>
                </div>
                <div className="passport-progress-bar-track">
                  <div className="passport-progress-bar-fill" style={{ width: `${ocrProgress}%` }} />
                </div>
              </div>
            )}

            {/* Warnings Alert */}
            {warnings.length > 0 && (
              <div style={{ background: 'rgba(234, 179, 8, 0.1)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: '8px', padding: '10px 12px', color: '#facc15', fontSize: '0.8rem', display: 'flex', gap: '8px' }}>
                <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                <div>
                  {warnings.map((w, idx) => (
                    <div key={idx}>{w}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Fields Form */}
            <div className="passport-fields-table">
              {/* Full Name */}
              <div className="passport-field-row">
                <div className="passport-field-label-wrap">
                  <span>ФИО Клиента</span>
                  {confidence.name && (
                    <span className={`passport-conf-badge ${confidence.name.toLowerCase()}`}>
                      {confidence.name === 'MRZ' ? 'MRZ ✓' : confidence.name}
                    </span>
                  )}
                </div>
                <div className="passport-field-input-wrap">
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Фамилия Имя Отчество"
                    className="passport-field-input"
                  />
                </div>
              </div>

              {/* Series & Number + Birth Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="passport-field-row">
                  <div className="passport-field-label-wrap">
                    <span>Серия и номер</span>
                    {confidence.passportSeriesNumber && (
                      <span className={`passport-conf-badge ${confidence.passportSeriesNumber.toLowerCase()}`}>
                        {confidence.passportSeriesNumber === 'MRZ' ? 'MRZ ✓' : confidence.passportSeriesNumber}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.passportSeriesNumber}
                    onChange={(e) => setFormData({ ...formData, passportSeriesNumber: e.target.value })}
                    placeholder="XX XX XXXXXX"
                    className="passport-field-input"
                  />
                </div>

                <div className="passport-field-row">
                  <div className="passport-field-label-wrap">
                    <span>Дата рождения</span>
                    {confidence.birthDate && (
                      <span className={`passport-conf-badge ${confidence.birthDate.toLowerCase()}`}>
                        {confidence.birthDate === 'MRZ' ? 'MRZ ✓' : confidence.birthDate}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    placeholder="ДД.ММ.ГГГГ"
                    className="passport-field-input"
                  />
                </div>
              </div>

              {/* Department Code + Issued Date */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="passport-field-row">
                  <div className="passport-field-label-wrap">
                    <span>Код подразделения</span>
                    {confidence.passportDepartmentCode && (
                      <span className={`passport-conf-badge ${confidence.passportDepartmentCode.toLowerCase()}`}>
                        {confidence.passportDepartmentCode}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.passportDepartmentCode}
                    onChange={(e) => setFormData({ ...formData, passportDepartmentCode: e.target.value })}
                    placeholder="XXX-XXX"
                    className="passport-field-input"
                  />
                </div>

                <div className="passport-field-row">
                  <div className="passport-field-label-wrap">
                    <span>Дата выдачи</span>
                    {confidence.passportIssuedDate && (
                      <span className={`passport-conf-badge ${confidence.passportIssuedDate.toLowerCase()}`}>
                        {confidence.passportIssuedDate}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.passportIssuedDate}
                    onChange={(e) => setFormData({ ...formData, passportIssuedDate: e.target.value })}
                    placeholder="ДД.ММ.ГГГГ"
                    className="passport-field-input"
                  />
                </div>
              </div>

              {/* Issued By */}
              <div className="passport-field-row">
                <div className="passport-field-label-wrap">
                  <span>Кем выдан</span>
                  {confidence.passportIssuedBy && (
                    <span className={`passport-conf-badge ${confidence.passportIssuedBy.toLowerCase()}`}>
                      {confidence.passportIssuedBy}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.passportIssuedBy}
                  onChange={(e) => setFormData({ ...formData, passportIssuedBy: e.target.value })}
                  placeholder="Орган выдачи паспорта"
                  className="passport-field-input"
                />
              </div>

              {/* Registration Address */}
              <div className="passport-field-row">
                <div className="passport-field-label-wrap">
                  <span>Адрес регистрации (прописка)</span>
                  {confidence.registrationAddress && (
                    <span className={`passport-conf-badge ${confidence.registrationAddress.toLowerCase()}`}>
                      {confidence.registrationAddress}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.registrationAddress}
                  onChange={(e) => setFormData({ ...formData, registrationAddress: e.target.value })}
                  placeholder="г. Город, ул. Улица, д. Дом, кв. Кв"
                  className="passport-field-input"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="passport-scanner-footer">
          <div className="passport-options-wrap">
            {showInstallationAddressOption && (
              <label className="passport-checkbox-label">
                <input
                  type="checkbox"
                  checked={addressSameAsInstallation}
                  onChange={(e) => setAddressSameAsInstallation(e.target.checked)}
                />
                <span>
                  Адрес монтажа совпадает с адресом регистрации
                  {currentInstallationAddress ? ` (текущий: ${currentInstallationAddress})` : ''}
                </span>
              </label>
            )}
            <label className="passport-checkbox-label">
              <input
                type="checkbox"
                checked={saveScansToFiles}
                onChange={(e) => setSaveScansToFiles(e.target.checked)}
              />
              <span>Прикрепить распознанные сканы к документам клиента / сделки</span>
            </label>
          </div>

          <div className="passport-action-btns">
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ padding: '10px 16px' }}>
              Отмена
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!formData.name && !formData.passportSeriesNumber}
              className="btn btn-primary"
              style={{
                padding: '10px 20px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)'
              }}
            >
              <Check size={18} /> Применить данные
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
