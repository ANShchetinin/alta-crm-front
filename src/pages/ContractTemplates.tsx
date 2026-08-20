import { useState, useEffect, useRef } from 'react';
import { 
  FileText, Upload, Download, Trash2, CheckCircle2, AlertCircle, Copy, Check, Search, 
  User, Building2, HelpCircle, RefreshCw, FileCheck
} from 'lucide-react';
import { 
  getContractTemplateStatus, uploadContractTemplate, downloadContractTemplateBlob, 
  deleteContractTemplate, generateTestContractDocxBlob 
} from '../api/settings';
import type { ContractTemplateStatus } from '../api/settings';
import '../styles/contract-templates.css';

interface TagItem {
  tag: string;
  name: string;
  example: string;
  category: 'contract' | 'client' | 'executor' | 'finance' | 'ceiling';
  forType?: 'ALL' | 'INDIVIDUAL' | 'LEGAL_ENTITY';
}

const AVAILABLE_TAGS: TagItem[] = [
  // 1. Договор и Заказ
  { tag: '{{order_num}}', name: 'Номер договора / заказа', example: 'А2008/01', category: 'contract' },
  { tag: '{{contract_date}}', name: 'Дата договора прописью', example: '« 20 » августа 2026 г.', category: 'contract' },
  { tag: '{{contract_date_short}}', name: 'Краткая дата договора', example: '20.08.2026', category: 'contract' },
  { tag: '{{city}}', name: 'Город выполнения работ', example: 'г. Москва', category: 'contract' },
  { tag: '{{install_address}}', name: 'Адрес монтажа потолка', example: 'ул. Тверская, д. 15, кв. 42', category: 'contract' },
  { tag: '{{handover_date}}', name: 'Срок готовности / дата монтажа', example: '25.08.2026', category: 'contract' },
  { tag: '{{day}}', name: 'День договора', example: '20', category: 'contract' },
  { tag: '{{month}}', name: 'Месяц договора', example: 'августа', category: 'contract' },
  { tag: '{{year}}', name: 'Год договора', example: '2026', category: 'contract' },

  // 2. Исполнитель (Ваша компания)
  { tag: '{{executor_name}}', name: 'Полное наименование компании / ИП', example: 'ООО «Потолочные Системы»', category: 'executor' },
  { tag: '{{executor_short}}', name: 'Краткое наименование / для подписи', example: 'ООО «Потолок Люкс»', category: 'executor' },
  { tag: '{{executor_brand}}', name: 'Торговый бренд компании', example: 'Alta Ceiling', category: 'executor' },
  { tag: '{{executor_inn}}', name: 'ИНН компании', example: '7701123456', category: 'executor' },
  { tag: '{{executor_kpp}}', name: 'КПП компании', example: '770101001', category: 'executor' },
  { tag: '{{executor_ogrn}}', name: 'ОГРН компании', example: '1157746001122', category: 'executor' },
  { tag: '{{executor_ogrnip}}', name: 'ОГРНИП (для ИП)', example: '314645133600028', category: 'executor' },
  { tag: '{{executor_legal_address}}', name: 'Юридический адрес компании', example: 'г. Москва, ул. Ленина, д. 1', category: 'executor' },
  { tag: '{{executor_actual_address}}', name: 'Фактический адрес компании', example: 'г. Москва, ул. Ленина, д. 1', category: 'executor' },
  { tag: '{{executor_bank_name}}', name: 'Банк компании', example: 'ПАО СБЕРБАНК', category: 'executor' },
  { tag: '{{executor_bik}}', name: 'БИК банка', example: '044525225', category: 'executor' },
  { tag: '{{executor_rs}}', name: 'Расчетный счет компании', example: '40702810000000001234', category: 'executor' },
  { tag: '{{executor_ks}}', name: 'Корр. счет банка', example: '30101810400000000225', category: 'executor' },
  { tag: '{{executor_phone}}', name: 'Телефон компании', example: '+7 (495) 123-45-67', category: 'executor' },
  { tag: '{{executor_email}}', name: 'Email компании', example: 'info@potolki.ru', category: 'executor' },
  { tag: '{{executor_website}}', name: 'Веб-сайт компании', example: 'potolki.ru', category: 'executor' },
  { tag: '{{executor_court}}', name: 'Подсудность (суд по спорам)', example: 'Арбитражный суд г. Москвы', category: 'executor' },
  { tag: '{{executor_signer_position}}', name: 'Должность подписанта', example: 'Генеральный директор', category: 'executor' },
  { tag: '{{executor_signer_name}}', name: 'ФИО подписанта', example: 'Иванов Петр Сергеевич', category: 'executor' },
  { tag: '{{executor_signer_authority}}', name: 'Основание полномочий', example: 'Устава / доверенности № 12', category: 'executor' },

  // 3. Заказчик - Физ. лицо (INDIVIDUAL)
  { tag: '{{client_name}}', name: 'ФИО клиента полностью', example: 'Кузнецов Алексей Петрович', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_short}}', name: 'Фамилия И.О. клиента', example: 'Кузнецов А.П.', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_phone}}', name: 'Телефон клиента', example: '+7 (927) 555-66-77', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_second_phone}}', name: 'Второй телефон клиента', example: '+7 (927) 111-22-33', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_birth_date}}', name: 'Дата рождения клиента', example: '10.10.1988', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_passport_series}}', name: 'Серия паспорта', example: '63 12', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_passport_number}}', name: 'Номер паспорта', example: '765432', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_passport_series_number}}', name: 'Серия и номер паспорта', example: '63 12 765432', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_passport_issued_by}}', name: 'Кем выдан паспорт', example: 'УФМС России по г. Москве', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_passport_issued_date}}', name: 'Дата выдачи паспорта', example: '15.11.2012', category: 'client', forType: 'INDIVIDUAL' },
  { tag: '{{client_reg_address}}', name: 'Адрес регистрации клиента', example: 'г. Москва, ул. Арбат, д. 22, кв. 15', category: 'client', forType: 'INDIVIDUAL' },

  // 4. Заказчик - Юр. лицо (LEGAL_ENTITY)
  { tag: '{{client_legal_name}}', name: 'Полное юр. наименование организации', example: 'ООО «Строй Альянс»', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_short_name}}', name: 'Краткое наименование клиента', example: 'ООО «Строй Альянс»', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_inn}}', name: 'ИНН организации клиента', example: '7712345678', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_kpp}}', name: 'КПП организации', example: '771201001', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_ogrn}}', name: 'ОГРН организации', example: '1187746123456', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_legal_address}}', name: 'Юридический адрес организации', example: 'г. Москва, ул. Арбат, д. 10, оф. 5', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_actual_address}}', name: 'Фактический адрес организации', example: 'г. Москва, ул. Арбат, д. 10, оф. 5', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_bank_name}}', name: 'Банк организации клиента', example: 'АО «АЛЬФА-БАНК»', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_bik}}', name: 'БИК банка клиента', example: '044525593', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_rs}}', name: 'Расчетный счет клиента', example: '40702810000000000123', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_ks}}', name: 'Корр. счет банка клиента', example: '30101810200000000593', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_contact_person}}', name: 'Контактное лицо / Генеральный директор', example: 'Смирнов Алексей Владимирович', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_contact_position}}', name: 'Должность контактного лица', example: 'Генеральный директор', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_phone}}', name: 'Телефон юр. лица', example: '+7 (495) 000-11-22', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_email}}', name: 'Email юр. лица', example: 'partner@stroy-alliance.ru', category: 'client', forType: 'LEGAL_ENTITY' },
  { tag: '{{client_vat_status}}', name: 'Статус НДС', example: 'Без НДС (УСН)', category: 'client', forType: 'LEGAL_ENTITY' },

  // 5. Финансы и оплаты
  { tag: '{{total_price}}', name: 'Общая сумма с копейками', example: '47 240 руб. 00 коп.', category: 'finance' },
  { tag: '{{total_price_num}}', name: 'Общая сумма числом', example: '47 240', category: 'finance' },
  { tag: '{{total_price_words}}', name: 'Сумма договора прописью', example: 'Сорок семь тысяч двести сорок рублей', category: 'finance' },
  { tag: '{{prepayment}}', name: 'Сумма аванса с копейками', example: '20 000 руб. 00 коп.', category: 'finance' },
  { tag: '{{prepayment_num}}', name: 'Сумма аванса числом', example: '20 000', category: 'finance' },
  { tag: '{{remainder}}', name: 'Сумма остатка с копейками', example: '27 240 руб. 00 коп.', category: 'finance' },
  { tag: '{{remainder_num}}', name: 'Сумма остатка числом', example: '27 240', category: 'finance' },
  { tag: '{{installation_price}}', name: 'Стоимость монтажа', example: '5 000 руб. 00 коп.', category: 'finance' },
  { tag: '{{discount}}', name: 'Размер скидки (₽)', example: '5 000', category: 'finance' },

  // 6. Параметры натяжного потолка
  { tag: '{{area}}', name: 'Площадь потолка (м²)', example: '65.4', category: 'ceiling' },
  { tag: '{{perimeter}}', name: 'Периметр потолка (м/п)', example: '95.0', category: 'ceiling' },
  { tag: '{{canvases_count}}', name: 'Количество полотен', example: '4', category: 'ceiling' },
  { tag: '{{insert_length}}', name: 'Маскировочная вставка (м/п)', example: '30', category: 'ceiling' },
  { tag: '{{pipe_count}}', name: 'Обводы труб (шт)', example: '2', category: 'ceiling' },
  { tag: '{{lights_count}}', name: 'Количество светильников / люстр', example: '16', category: 'ceiling' },
  { tag: '{{timber_length}}', name: 'Длина бруса (м/п)', example: '12', category: 'ceiling' },
  { tag: '{{canvas_article}}', name: 'Артикул / фактура полотна', example: 'MSD Premium 303 (Матовый)', category: 'ceiling' },
];

export const ContractTemplates = () => {
  const [activeTab, setActiveTab] = useState<'INDIVIDUAL' | 'LEGAL_ENTITY'>('INDIVIDUAL');
  const [status, setStatus] = useState<ContractTemplateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [testGenerating, setTestGenerating] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getContractTemplateStatus();
      setStatus(res);
    } catch (e) {
      console.error('Failed to fetch template status', e);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleCopyTag = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedTag(tag);
    showToast(`Метка скопирована: ${tag}`);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Пожалуйста, выберите файл документа Microsoft Word в формате .docx');
      return;
    }

    try {
      setUploading(true);
      await uploadContractTemplate(activeTab, file);
      await fetchStatus();
      showToast('Шаблон договора успешно загружен!');
    } catch (e: any) {
      alert('Ошибка при загрузке шаблона: ' + (e.response?.data?.error || e.message));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const blob = await downloadContractTemplateBlob(activeTab);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shablon_dogovora_${activeTab.toLowerCase()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('Не удалось скачать шаблон: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleDeleteTemplate = async () => {
    const isLegal = activeTab === 'LEGAL_ENTITY';
    const typeLabel = isLegal ? 'для юридических лиц' : 'для физических лиц';
    if (!window.confirm(`Вы действительно хотите удалить загруженный шаблон ${typeLabel}?`)) {
      return;
    }

    try {
      setLoading(true);
      await deleteContractTemplate(activeTab);
      await fetchStatus();
      showToast(`Шаблон ${typeLabel} удален.`);
    } catch (e: any) {
      alert('Ошибка при удалении шаблона: ' + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  const handleTestGeneration = async () => {
    try {
      setTestGenerating(true);
      const blob = await generateTestContractDocxBlob(activeTab);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `test_contract_${activeTab.toLowerCase()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Тестовый договор успешно сформирован и скачан!');
    } catch (e: any) {
      alert('Ошибка тестовой генерации: ' + (e.response?.data?.error || e.message));
    } finally {
      setTestGenerating(false);
    }
  };

  const isTemplateLoaded = activeTab === 'INDIVIDUAL' ? status?.individual : status?.legal;

  const filteredTags = AVAILABLE_TAGS.filter(item => {
    if (item.forType && item.forType !== 'ALL' && item.forType !== activeTab) {
      return false;
    }
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.tag.toLowerCase().includes(q) || 
             item.name.toLowerCase().includes(q) || 
             item.example.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="contract-templates-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <RefreshCw size={28} className="spin" style={{ color: 'var(--accent-primary)' }} />
      </div>
    );
  }

  return (
    <div className="contract-templates-page">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="contract-toast">
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-icon-badge">
            <FileText size={24} />
          </div>
          <div>
            <h1>Шаблоны договоров</h1>
            <p className="page-subtitle">Загрузка и настройка индивидуальных .docx шаблонов с метками автоподстановки</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="template-tabs-container">
        <button 
          className={`template-tab-btn ${activeTab === 'INDIVIDUAL' ? 'active' : ''}`}
          onClick={() => setActiveTab('INDIVIDUAL')}
        >
          <User size={18} />
          <span>Для физических лиц (B2C)</span>
          {status?.individual ? (
            <span className="tab-status-badge loaded"><CheckCircle2 size={13} /> Загружен</span>
          ) : (
            <span className="tab-status-badge empty">Не загружен</span>
          )}
        </button>

        <button 
          className={`template-tab-btn ${activeTab === 'LEGAL_ENTITY' ? 'active' : ''}`}
          onClick={() => setActiveTab('LEGAL_ENTITY')}
        >
          <Building2 size={18} />
          <span>Для юридических лиц (B2B)</span>
          {status?.legal ? (
            <span className="tab-status-badge loaded"><CheckCircle2 size={13} /> Загружен</span>
          ) : (
            <span className="tab-status-badge empty">Не загружен</span>
          )}
        </button>
      </div>

      {/* Main Grid */}
      <div className="template-main-layout">
        {/* Left Column: Status & Upload Card */}
        <div className="template-management-col">
          <div className="template-card glass-panel">
            <div className="card-header-status">
              <div>
                <h3>{activeTab === 'INDIVIDUAL' ? 'Шаблон договора физ. лица' : 'Шаблон договора юр. лица'}</h3>
                <p className="card-desc">
                  {activeTab === 'INDIVIDUAL'
                    ? 'Используется для клиентов с типом «Физическое лицо». Включает паспортные данные Заказчика.'
                    : 'Используется для клиентов с типом «Юридическое лицо». Включает ИНН, КПП, расчетные счета и реквизиты организации.'}
                </p>
              </div>
              <div className={`status-pill ${isTemplateLoaded ? 'pill-success' : 'pill-warning'}`}>
                {isTemplateLoaded ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Шаблон активен</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={15} />
                    <span>Шаблон не загружен</span>
                  </>
                )}
              </div>
            </div>

            {/* Dropzone */}
            <div 
              className={`template-dropzone ${uploading ? 'uploading' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileUpload(e.dataTransfer.files[0]);
                }
              }}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <div className="dropzone-icon">
                <Upload size={32} />
              </div>
              <div className="dropzone-text">
                <strong>{uploading ? 'Загрузка файла...' : 'Нажмите для выбора или перетащите .docx файл'}</strong>
                <span>Поддерживается формат Microsoft Word (.docx)</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="template-actions-row">
              <button 
                className="btn btn-secondary"
                disabled={!isTemplateLoaded}
                onClick={handleDownloadTemplate}
                title={!isTemplateLoaded ? 'Сначала загрузите шаблон' : 'Скачать текущий файл для редактирования'}
              >
                <Download size={16} />
                <span>Скачать шаблон</span>
              </button>

              <button 
                className="btn btn-primary"
                disabled={!isTemplateLoaded || testGenerating}
                onClick={handleTestGeneration}
                title={!isTemplateLoaded ? 'Сначала загрузите шаблон' : 'Сформировать тестовый договор с примерами данных'}
              >
                {testGenerating ? <RefreshCw size={16} className="spin" /> : <FileCheck size={16} />}
                <span>{testGenerating ? 'Формирование...' : 'Тестовая генерация'}</span>
              </button>

              {isTemplateLoaded && (
                <button 
                  className="btn btn-danger-ghost"
                  onClick={handleDeleteTemplate}
                  title="Удалить пользовательский шаблон"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {/* Quick Tips */}
            <div className="template-guide-box">
              <div className="guide-title">
                <HelpCircle size={16} />
                <span>Как настроить шаблон договора:</span>
              </div>
              <ol className="guide-steps">
                <li>Откройте ваш стандартный договор в Microsoft Word.</li>
                <li>Скопируйте нужные метки (например, <code>{'{{order_num}}'}</code>, <code>{'{{client_name}}'}</code>) из панели справа.</li>
                <li>Вставьте метки в места документа, где должны подставляться реальные данные.</li>
                <li>Сохраните файл и загрузите его в эту форму.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Right Column: Tag Assistant */}
        <div className="tag-assistant-col">
          <div className="tag-assistant-panel glass-panel">
            <div className="tag-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>Помощник по меткам</h3>
                <span className="tags-count-badge">{filteredTags.length}</span>
              </div>
              <p className="tag-panel-sub">Нажмите на любую карточку, чтобы скопировать метку в буфер обмена</p>
            </div>

            {/* Search and Filters */}
            <div className="tag-filters-bar">
              <div className="tag-search-input-box">
                <Search size={16} className="search-icon" />
                <input 
                  type="text"
                  placeholder="Поиск метки (например, сумма, паспорт, ИНН)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="category-chips">
                <button 
                  className={`chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('ALL')}
                >
                  Все
                </button>
                <button 
                  className={`chip ${selectedCategory === 'contract' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('contract')}
                >
                  Договор
                </button>
                <button 
                  className={`chip ${selectedCategory === 'client' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('client')}
                >
                  {activeTab === 'INDIVIDUAL' ? 'Заказчик (Физ. лицо)' : 'Заказчик (Юр. лицо)'}
                </button>
                <button 
                  className={`chip ${selectedCategory === 'executor' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('executor')}
                >
                  Исполнитель
                </button>
                <button 
                  className={`chip ${selectedCategory === 'finance' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('finance')}
                >
                  Суммы
                </button>
                <button 
                  className={`chip ${selectedCategory === 'ceiling' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('ceiling')}
                >
                  Потолки
                </button>
              </div>
            </div>

            {/* Tags Grid */}
            <div className="tags-scroll-container">
              {filteredTags.length === 0 ? (
                <div className="tags-empty-state">
                  <span>Метки по запросу «{searchQuery}» не найдены</span>
                </div>
              ) : (
                <div className="tags-cards-grid">
                  {filteredTags.map((t) => {
                    const isCopied = copiedTag === t.tag;
                    return (
                      <div 
                        key={t.tag} 
                        className={`tag-card ${isCopied ? 'copied' : ''}`}
                        onClick={() => handleCopyTag(t.tag)}
                        title="Нажмите, чтобы скопировать метку"
                      >
                        <div className="tag-card-top">
                          <code className="tag-code">{t.tag}</code>
                          <button className="tag-copy-btn" aria-label="Copy tag">
                            {isCopied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
                          </button>
                        </div>
                        <div className="tag-card-name">{t.name}</div>
                        <div className="tag-card-example">
                          <span>Пример: </span>
                          <strong>{t.example}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
