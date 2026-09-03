import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Upload,
  Camera,
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
  Image as ImageIcon,
  Cpu
} from 'lucide-react';
import { scanPassportOnBackend } from '../api/passportOcr';
import { normalizeRegistrationAddress } from '../utils/addressNormalizer';
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
  showInstallationAddressOption = true
}) => {
  // Mobile tab state
  const [mobileTab, setMobileTab] = useState<'SCANS' | 'FIELDS'>('SCANS');
  const [showScansInFieldsView, setShowScansInFieldsView] = useState(false);

  // Page 1 (Main Spread: pages 2-3)
  const [mainPageFile, setMainPageFile] = useState<File | null>(null);
  const [mainPageUrl, setMainPageUrl] = useState<string | null>(null);
  const [mainPageRotation, setMainPageRotation] = useState<number>(0);
  const [mainPageZoom, setMainPageZoom] = useState<number>(1);

  // Page 2 (Registration Stamp)
  const [regPageFile, setRegPageFile] = useState<File | null>(null);
  const [regPageUrl, setRegPageUrl] = useState<string | null>(null);
  const [regPageRotation, setRegPageRotation] = useState<number>(0);
  const [regPageZoom, setRegPageZoom] = useState<number>(1);

  // Recognition state
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [ocrStatus, setOcrStatus] = useState<string>('');
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

  const handleMainFileSelected = (file: File) => {
    if (mainPageUrl) URL.revokeObjectURL(mainPageUrl);
    setMainPageFile(file);
    setMainPageUrl(URL.createObjectURL(file));
    setMainPageRotation(0);
    setMainPageZoom(1);
    setHasRecognized(false);
  };

  const handleRegFileSelected = (file: File) => {
    if (regPageUrl) URL.revokeObjectURL(regPageUrl);
    setRegPageFile(file);
    setRegPageUrl(URL.createObjectURL(file));
    setRegPageRotation(0);
    setRegPageZoom(1);
    setHasRecognized(false);
  };

  const rotateMainPage = () => {
    setMainPageRotation((prev) => (prev + 90) % 360);
  };

  const rotateRegPage = () => {
    setRegPageRotation((prev) => (prev + 90) % 360);
  };

  // Run Backend Neural OCR Pipeline
  const handleStartOcr = async () => {
    if (!mainPageFile && !regPageFile) {
      alert('Пожалуйста, загрузите хотя бы одну страницу паспорта для распознавания.');
      return;
    }

    setIsRecognizing(true);
    setOcrStatus('Нейросетевой анализ на сервере...');
    setWarnings([]);

    try {
      if (!mainPageFile) {
        throw new Error('Для распознавания необходим главный разворот паспорта.');
      }

      const backendRes = await scanPassportOnBackend(mainPageFile, regPageFile);

      if (backendRes) {
        let formattedRegAddress = backendRes.registration_address?.value || '';
        if (formattedRegAddress) {
          setOcrStatus('Стандартизация адреса регистрации...');
          const norm = await normalizeRegistrationAddress(formattedRegAddress);
          formattedRegAddress = norm.formattedAddress || formattedRegAddress;
        }

        setFormData({
          name: backendRes.full_name?.value || '',
          birthDate: backendRes.birth_date?.value || '',
          gender: (backendRes.gender?.value as any) || 'UNKNOWN',
          passportSeriesNumber: backendRes.passport_series_number?.value || '',
          passportIssuedBy: backendRes.passport_issued_by?.value || '',
          passportIssuedDate: backendRes.passport_issued_date?.value || '',
          passportDepartmentCode: backendRes.passport_department_code?.value || '',
          registrationAddress: formattedRegAddress
        });

        setConfidence({
          name: backendRes.full_name?.confidence || 'HIGH',
          birthDate: backendRes.birth_date?.confidence || 'HIGH',
          passportSeriesNumber: backendRes.passport_series_number?.confidence || 'HIGH',
          passportIssuedBy: backendRes.passport_issued_by?.confidence || 'HIGH',
          passportIssuedDate: backendRes.passport_issued_date?.confidence || 'HIGH',
          passportDepartmentCode: backendRes.passport_department_code?.confidence || 'HIGH',
          registrationAddress: backendRes.registration_address?.confidence || 'HIGH'
        });

        setWarnings(backendRes.warnings || []);
        setHasRecognized(true);
        // Switch to Fields tab on mobile automatically after recognition
        setMobileTab('FIELDS');
      }
    } catch (err: any) {
      console.error('OCR Recognition failed:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Не удалось распознать скан на сервере';
      setWarnings([`Ошибка распознавания: ${errMsg}`]);
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
              <Cpu size={13} /> Yandex Vision OCR
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
            <FileText size={16} />
            <span>2. Данные и сверка</span>
            {hasRecognized && (
              <span className="passport-tab-badge ready">
                <Check size={12} />
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="passport-scanner-body">
          {/* Left / Scans View */}
          <div className={`passport-scanner-scans-col ${mobileTab === 'SCANS' ? 'mobile-visible' : 'mobile-hidden'}`}>
            {/* Slot 1: Main Page */}
            <div className={`passport-scan-slot ${mainPageFile ? 'has-file' : ''}`}>
              <div className="passport-slot-header">
                <span className="passport-slot-title">1. Главный разворот (фото и реквизиты)</span>
                {mainPageFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setMainPageFile(null);
                      if (mainPageUrl) URL.revokeObjectURL(mainPageUrl);
                      setMainPageUrl(null);
                    }}
                    className="passport-slot-remove-btn"
                    title="Удалить скан"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {mainPageUrl ? (
                <div className="passport-preview-box">
                  <div
                    className="passport-image-container"
                    style={{
                      transform: `rotate(${mainPageRotation}deg) scale(${mainPageZoom})`
                    }}
                  >
                    <img src={mainPageUrl} alt="Главный разворот" className="passport-preview-img" />
                  </div>

                  <div className="passport-preview-controls">
                    <button type="button" onClick={rotateMainPage} title="Повернуть на 90°">
                      <RotateCw size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainPageZoom((z) => Math.min(2.5, z + 0.25))}
                      title="Увеличить"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setMainPageZoom((z) => Math.max(0.75, z - 0.25))}
                      title="Уменьшить"
                    >
                      <ZoomOut size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="passport-dropzone">
                  <div className="passport-dropzone-actions">
                    <button
                      type="button"
                      onClick={() => mainFileInputRef.current?.click()}
                      className="passport-upload-btn"
                    >
                      <Upload size={18} />
                      <span>Выбрать файл</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => mainCameraInputRef.current?.click()}
                      className="passport-camera-btn"
                    >
                      <Camera size={18} />
                      <span>Сделать фото</span>
                    </button>
                  </div>
                  <span className="passport-dropzone-hint">JPG, PNG, WebP или скан (до 20 МБ)</span>
                </div>
              )}

              <input
                ref={mainFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMainFileSelected(f);
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
                  if (f) handleMainFileSelected(f);
                }}
              />
            </div>

            {/* Slot 2: Registration Stamp */}
            <div className={`passport-scan-slot ${regPageFile ? 'has-file' : ''}`}>
              <div className="passport-slot-header">
                <span className="passport-slot-title">2. Страница регистрации (прописка)</span>
                {regPageFile && (
                  <button
                    type="button"
                    onClick={() => {
                      setRegPageFile(null);
                      if (regPageUrl) URL.revokeObjectURL(regPageUrl);
                      setRegPageUrl(null);
                    }}
                    className="passport-slot-remove-btn"
                    title="Удалить скан"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {regPageUrl ? (
                <div className="passport-preview-box">
                  <div
                    className="passport-image-container"
                    style={{
                      transform: `rotate(${regPageRotation}deg) scale(${regPageZoom})`
                    }}
                  >
                    <img src={regPageUrl} alt="Страница регистрации" className="passport-preview-img" />
                  </div>

                  <div className="passport-preview-controls">
                    <button type="button" onClick={rotateRegPage} title="Повернуть на 90°">
                      <RotateCw size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegPageZoom((z) => Math.min(2.5, z + 0.25))}
                      title="Увеличить"
                    >
                      <ZoomIn size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setRegPageZoom((z) => Math.max(0.75, z - 0.25))}
                      title="Уменьшить"
                    >
                      <ZoomOut size={15} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="passport-dropzone">
                  <div className="passport-dropzone-actions">
                    <button
                      type="button"
                      onClick={() => regFileInputRef.current?.click()}
                      className="passport-upload-btn"
                    >
                      <Upload size={18} />
                      <span>Выбрать файл</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => regCameraInputRef.current?.click()}
                      className="passport-camera-btn"
                    >
                      <Camera size={18} />
                      <span>Сделать фото</span>
                    </button>
                  </div>
                  <span className="passport-dropzone-hint">Страница со штампом постоянной прописки</span>
                </div>
              )}

              <input
                ref={regFileInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleRegFileSelected(f);
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
                  if (f) handleRegFileSelected(f);
                }}
              />
            </div>
          </div>

          {/* Right / Fields View */}
          <div className={`passport-scanner-fields-col ${mobileTab === 'FIELDS' ? 'mobile-visible' : 'mobile-hidden'}`}>
            {/* Mobile Scan Preview Accordion */}
            {loadedScansCount > 0 && (
              <div className="passport-scans-accordion">
                <button
                  type="button"
                  onClick={() => setShowScansInFieldsView((prev) => !prev)}
                  className="passport-accordion-btn"
                >
                  <div className="passport-accordion-title">
                    <ImageIcon size={16} />
                    <span>Показать сканы для сверки ({loadedScansCount})</span>
                  </div>
                  {showScansInFieldsView ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>

                {showScansInFieldsView && (
                  <div className="passport-accordion-content">
                    {mainPageUrl && (
                      <div className="passport-accordion-image-box">
                        <span className="passport-accordion-label">Главный разворот:</span>
                        <img
                          src={mainPageUrl}
                          alt="Главный разворот"
                          style={{ transform: `rotate(${mainPageRotation}deg)` }}
                        />
                      </div>
                    )}
                    {regPageUrl && (
                      <div className="passport-accordion-image-box">
                        <span className="passport-accordion-label">Страница регистрации:</span>
                        <img
                          src={regPageUrl}
                          alt="Страница регистрации"
                          style={{ transform: `rotate(${regPageRotation}deg)` }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Warnings list */}
            {warnings.length > 0 && (
              <div className="passport-scanner-warnings">
                {warnings.map((w, idx) => (
                  <div key={idx} className="passport-warning-item">
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recognition Progress Overlay */}
            {isRecognizing && (
              <div className="passport-scanner-progress-box">
                <div className="passport-progress-header">
                  <RefreshCw size={18} className="animate-spin" />
                  <span>{ocrStatus || 'Распознавание...'}</span>
                </div>
              </div>
            )}

            {/* Fields Form */}
            <div className="passport-fields-form">
              {/* Full Name */}
              <div className="passport-field-group">
                <div className="passport-field-header">
                  <label>ФИО Клиента</label>
                  {confidence.name && (
                    <span className={`passport-confidence-badge ${confidence.name.toLowerCase()}`}>
                      {confidence.name === 'MRZ' ? 'MRZ ✓' : confidence.name}
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Иванов Иван Иванович"
                  className="passport-input"
                />
              </div>

              {/* Series, Number & Birth Date */}
              <div className="passport-fields-row">
                <div className="passport-field-group">
                  <div className="passport-field-header">
                    <label>Серия и номер</label>
                    {confidence.passportSeriesNumber && (
                      <span className={`passport-confidence-badge ${confidence.passportSeriesNumber.toLowerCase()}`}>
                        {confidence.passportSeriesNumber === 'MRZ' ? 'MRZ ✓' : confidence.passportSeriesNumber}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.passportSeriesNumber}
                    onChange={(e) => setFormData({ ...formData, passportSeriesNumber: e.target.value })}
                    placeholder="XX XX XXXXXX"
                    className="passport-input font-mono"
                  />
                </div>

                <div className="passport-field-group">
                  <div className="passport-field-header">
                    <label>Дата рождения</label>
                    {confidence.birthDate && (
                      <span className={`passport-confidence-badge ${confidence.birthDate.toLowerCase()}`}>
                        {confidence.birthDate === 'MRZ' ? 'MRZ ✓' : confidence.birthDate}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                    placeholder="ДД.ММ.ГГГГ"
                    className="passport-input font-mono"
                  />
                </div>
              </div>

              {/* Department code & Issued date */}
              <div className="passport-fields-row">
                <div className="passport-field-group">
                  <div className="passport-field-header">
                    <label>Код подразделения</label>
                    {confidence.passportDepartmentCode && (
                      <span className={`passport-confidence-badge ${confidence.passportDepartmentCode.toLowerCase()}`}>
                        {confidence.passportDepartmentCode}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.passportDepartmentCode}
                    onChange={(e) => setFormData({ ...formData, passportDepartmentCode: e.target.value })}
                    placeholder="XXX-XXX"
                    className="passport-input font-mono"
                  />
                </div>

                <div className="passport-field-group">
                  <div className="passport-field-header">
                    <label>Дата выдачи</label>
                    {confidence.passportIssuedDate && (
                      <span className={`passport-confidence-badge ${confidence.passportIssuedDate.toLowerCase()}`}>
                        {confidence.passportIssuedDate}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={formData.passportIssuedDate}
                    onChange={(e) => setFormData({ ...formData, passportIssuedDate: e.target.value })}
                    placeholder="ДД.ММ.ГГГГ"
                    className="passport-input font-mono"
                  />
                </div>
              </div>

              {/* Issued by */}
              <div className="passport-field-group">
                <div className="passport-field-header">
                  <label>Кем выдан</label>
                  {confidence.passportIssuedBy && (
                    <span className={`passport-confidence-badge ${confidence.passportIssuedBy.toLowerCase()}`}>
                      {confidence.passportIssuedBy}
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={formData.passportIssuedBy}
                  onChange={(e) => setFormData({ ...formData, passportIssuedBy: e.target.value })}
                  placeholder="ОТДЕЛОМ ВНУТРЕННИХ ДЕЛ..."
                  className="passport-textarea"
                />
              </div>

              {/* Registration Address */}
              <div className="passport-field-group">
                <div className="passport-field-header">
                  <label>Адрес регистрации (прописка)</label>
                  {confidence.registrationAddress && (
                    <span className={`passport-confidence-badge ${confidence.registrationAddress.toLowerCase()}`}>
                      {confidence.registrationAddress}
                    </span>
                  )}
                </div>
                <textarea
                  rows={2}
                  value={formData.registrationAddress}
                  onChange={(e) => setFormData({ ...formData, registrationAddress: e.target.value })}
                  placeholder="г. Санкт-Петербург, наб. Миклухо-Маклая, д. 3..."
                  className="passport-textarea"
                />
              </div>

              {/* Options */}
              <div className="passport-options-box">
                {showInstallationAddressOption && (
                  <label className="passport-checkbox-label">
                    <input
                      type="checkbox"
                      checked={addressSameAsInstallation}
                      onChange={(e) => setAddressSameAsInstallation(e.target.checked)}
                    />
                    <span>Установить адрес регистрации как адрес монтажа</span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="passport-scanner-action-bar">
          <button
            type="button"
            onClick={handleStartOcr}
            disabled={isRecognizing || loadedScansCount === 0}
            className="passport-run-ocr-btn"
          >
            {isRecognizing ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Распознавание...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>🚀 Запустить распознавание</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="passport-scanner-footer">
          <label className="passport-checkbox-label">
            <input
              type="checkbox"
              checked={saveScansToFiles}
              onChange={(e) => setSaveScansToFiles(e.target.checked)}
            />
            <span>Прикрепить распознанные сканы к документам клиента / сделки</span>
          </label>

          <div className="passport-footer-buttons">
            <button type="button" onClick={onClose} className="passport-cancel-btn">
              Отмена
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={!formData.name && !formData.passportSeriesNumber}
              className="passport-apply-btn"
            >
              <Check size={18} />
              <span>Применить данные</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
