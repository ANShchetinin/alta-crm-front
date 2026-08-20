import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, Upload, Download, Trash2, CheckCircle2, Copy, Check, Search, 
  User, Building2, RefreshCw, FileCheck, Save, Sparkles, Bold, Italic, 
  Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Table, Eraser, Undo, Redo, Edit3, Eye, SplitSquareVertical
} from 'lucide-react';
import mammoth from 'mammoth';
import * as docx from 'docx-preview';
import { 
  getContractTemplateStatus, uploadContractTemplate, downloadContractTemplateBlob, 
  deleteContractTemplate, generateTestContractDocxBlob, saveContractTemplateHtml, 
  getContractTemplateHtml 
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

const STARTER_TEMPLATE_INDIVIDUAL = `
<h2 style="text-align: center;">ДОГОВОР ПОДРЯДА № {{order_num}}</h2>
<p style="display: flex; justify-content: space-between;"><strong>г. {{city}}</strong> <span style="float: right;"><strong>{{contract_date}}</strong></span></p>
<div style="clear: both;"></div>
<p><strong>{{executor_name}}</strong>, именуемый(ое) в дальнейшем «Исполнитель», с одной стороны, и гражданин(ка) <strong>{{client_name}}</strong>, именуемый(ая) в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем:</p>

<h3>1. ПРЕДМЕТ ДОГОВОРА</h3>
<p>1.1. Исполнитель обязуется выполнить работы по установке натяжного потолка по адресу: <strong>{{install_address}}</strong>, а Заказчик обязуется принять результат работ и оплатить его.</p>
<p>1.2. Сводные параметры помещения:</p>
<table border="1" cellpadding="6" style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
  <thead>
    <tr style="background: rgba(0,0,0,0.05);">
      <th>Площадь (м²)</th>
      <th>Периметр (м/п)</th>
      <th>Полотен (шт)</th>
      <th>Вставка (м/п)</th>
      <th>Трубы (шт)</th>
      <th>Светильники (шт)</th>
      <th>Брус (м/п)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">{{area}}</td>
      <td align="center">{{perimeter}}</td>
      <td align="center">{{canvases_count}}</td>
      <td align="center">{{insert_length}}</td>
      <td align="center">{{pipe_count}}</td>
      <td align="center">{{lights_count}}</td>
      <td align="center">{{timber_length}}</td>
    </tr>
  </tbody>
</table>
<p>Артикул / фактура полотна: <strong>{{canvas_article}}</strong>.</p>

<h3>2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ</h3>
<p>2.1. Общая стоимость работ и материалов составляет <strong>{{total_price}}</strong> ({{total_price_words}}).</p>
<p>2.2. Заказчик вносит авансовый платеж в размере <strong>{{prepayment}}</strong> при подписании договора.</p>
<p>2.3. Оставшаяся сумма в размере <strong>{{remainder}}</strong> оплачивается Заказчиком после выполнения монтажа.</p>

<hr class="page-break" />

<h3>3. СРОКИ ВЫПОЛНЕНИЯ РАБОТ</h3>
<p>3.1. Срок готовности и монтажа: до <strong>{{handover_date}}</strong>.</p>

<h3>4. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h3>
<table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background: rgba(0,0,0,0.05);">
      <th style="width: 50%;">ИСПОЛНИТЕЛЬ</th>
      <th style="width: 50%;">ЗАКАЗЧИК</th>
    </tr>
  </thead>
  <tbody>
    <tr valign="top">
      <td>
        <p><strong>{{executor_name}}</strong></p>
        <p>ИНН: {{executor_inn}} / ОГРН: {{executor_ogrn}}</p>
        <p>Адрес: {{executor_legal_address}}</p>
        <p>Банк: {{executor_bank_name}}</p>
        <p>БИК: {{executor_bik}}, Р/с: {{executor_rs}}</p>
        <p>Телефон: {{executor_phone}}, Email: {{executor_email}}</p>
        <br/>
        <p>________________ / {{executor_short}} /</p>
      </td>
      <td>
        <p><strong>{{client_name}}</strong></p>
        <p>Паспорт: {{client_passport_series}} {{client_passport_number}}</p>
        <p>Выдан: {{client_passport_issued_by}}</p>
        <p>Дата выдачи: {{client_passport_issued_date}}</p>
        <p>Адрес регистрации: {{client_reg_address}}</p>
        <p>Телефон: {{client_phone}}</p>
        <br/>
        <p>________________ / {{client_short}} /</p>
      </td>
    </tr>
  </tbody>
</table>
`;

const STARTER_TEMPLATE_LEGAL = `
<h2 style="text-align: center;">ДОГОВОР ПОДРЯДА № {{order_num}}</h2>
<p style="display: flex; justify-content: space-between;"><strong>г. {{city}}</strong> <span style="float: right;"><strong>{{contract_date}}</strong></span></p>
<div style="clear: both;"></div>
<p><strong>{{executor_name}}</strong>, именуемый в дальнейшем «Исполнитель», в лице <strong>{{executor_signer_name}}</strong>, действующего на основании {{executor_signer_authority}}, с одной стороны, и <strong>{{client_legal_name}}</strong>, именуемое в дальнейшем «Заказчик», в лице <strong>{{client_contact_person}}</strong>, действующего на основании Устава, с другой стороны, заключили настоящий договор о нижеследующем:</p>

<h3>1. ПРЕДМЕТ ДОГОВОРА</h3>
<p>1.1. Исполнитель обязуется выполнить комплекс монтажных работ по установке натяжных потолков на объекте Заказчика по адресу: <strong>{{install_address}}</strong>.</p>
<p>1.2. Площадь объекта: <strong>{{area}} м²</strong>, периметр: <strong>{{perimeter}} м/п</strong>, количество светильников: <strong>{{lights_count}} шт.</strong></p>

<h3>2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ</h3>
<p>2.1. Стоимость работ по настоящему договору составляет <strong>{{total_price}}</strong> ({{total_price_words}}), {{client_vat_status}}.</p>
<p>2.2. Авансовый платеж: <strong>{{prepayment}}</strong>.</p>
<p>2.3. Окончательный расчет в размере <strong>{{remainder}}</strong> осуществляется в течение 3 банковских дней после подписания Акта приема-передачи.</p>

<hr class="page-break" />

<h3>3. РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h3>
<table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse;">
  <thead>
    <tr style="background: rgba(0,0,0,0.05);">
      <th style="width: 50%;">ИСПОЛНИТЕЛЬ</th>
      <th style="width: 50%;">ЗАКАЗЧИК</th>
    </tr>
  </thead>
  <tbody>
    <tr valign="top">
      <td>
        <p><strong>{{executor_name}}</strong></p>
        <p>ИНН / КПП: {{executor_inn}} / {{executor_kpp}}</p>
        <p>ОГРН: {{executor_ogrn}}</p>
        <p>Юр. адрес: {{executor_legal_address}}</p>
        <p>Банк: {{executor_bank_name}} (БИК: {{executor_bik}})</p>
        <p>Р/с: {{executor_rs}}, К/с: {{executor_ks}}</p>
        <p>Тел: {{executor_phone}}, Email: {{executor_email}}</p>
        <br/>
        <p>________________ / {{executor_signer_name}} /</p>
      </td>
      <td>
        <p><strong>{{client_legal_name}}</strong></p>
        <p>ИНН / КПП: {{client_inn}} / {{client_kpp}}</p>
        <p>ОГРН: {{client_ogrn}}</p>
        <p>Юр. адрес: {{client_legal_address}}</p>
        <p>Банк: {{client_bank_name}} (БИК: {{client_bik}})</p>
        <p>Р/с: {{client_rs}}, К/с: {{client_ks}}</p>
        <p>Тел: {{client_phone}}, Email: {{client_email}}</p>
        <br/>
        <p>________________ / {{client_contact_person}} /</p>
      </td>
    </tr>
  </tbody>
</table>
`;

export const ContractTemplates = () => {
  const [activeTab, setActiveTab] = useState<'INDIVIDUAL' | 'LEGAL_ENTITY'>('INDIVIDUAL');
  const [viewMode, setViewMode] = useState<'PREVIEW' | 'EDITOR'>('PREVIEW');
  const [status, setStatus] = useState<ContractTemplateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testGenerating, setTestGenerating] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [editorContent, setEditorContent] = useState<string>('');
  const [isModified, setIsModified] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const lastSavedRangeRef = useRef<Range | null>(null);

  const renderDocxPreview = useCallback(async (blob: Blob) => {
    if (!previewContainerRef.current) return;
    try {
      setPreviewLoading(true);
      previewContainerRef.current.innerHTML = '';
      await docx.renderAsync(blob, previewContainerRef.current, undefined, {
        className: 'docx-page-render',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        experimental: true,
        trimXmlDeclaration: true,
        debug: false
      });
    } catch (err) {
      console.error('Failed to render DOCX preview', err);
      if (previewContainerRef.current) {
        previewContainerRef.current.innerHTML = `
          <div style="padding: 40px; text-align: center; color: var(--text-muted);">
            <p>Не удалось отобразить точный предпросмотр DOCX.</p>
            <p style="font-size: 0.85rem;">Переключитесь в режим «Редактор текста» для просмотра и правки.</p>
          </div>
        `;
      }
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [statusRes, htmlContent] = await Promise.all([
        getContractTemplateStatus(),
        getContractTemplateHtml(activeTab)
      ]);
      setStatus(statusRes);
      
      const hasTemplate = activeTab === 'INDIVIDUAL' ? statusRes.individual : statusRes.legal;

      if (htmlContent && htmlContent.trim()) {
        setEditorContent(htmlContent);
      } else {
        const defaultPreset = activeTab === 'INDIVIDUAL' ? STARTER_TEMPLATE_INDIVIDUAL : STARTER_TEMPLATE_LEGAL;
        setEditorContent(defaultPreset);
      }
      setIsModified(false);

      if (hasTemplate) {
        setViewMode('PREVIEW');
        try {
          const blob = await downloadContractTemplateBlob(activeTab);
          // Wait a tick for container to mount
          setTimeout(() => renderDocxPreview(blob), 50);
        } catch (e) {
          console.warn('Could not fetch docx for preview', e);
        }
      } else {
        setViewMode('EDITOR');
      }
    } catch (e) {
      console.error('Failed to load contract template', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, renderDocxPreview]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      lastSavedRangeRef.current = sel.getRangeAt(0);
    }
  };

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
      setIsModified(true);
    }
  };

  const handleInsertPageBreak = () => {
    const pageBreakHtml = '<hr class="page-break" /><p></p>';
    document.execCommand('insertHTML', false, pageBreakHtml);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
      setIsModified(true);
    }
  };

  const handleInsertTagAtCursor = (tag: string) => {
    if (viewMode !== 'EDITOR') {
      setViewMode('EDITOR');
    }

    setTimeout(() => {
      if (!editorRef.current) return;
      editorRef.current.focus();

      if (lastSavedRangeRef.current) {
        const sel = window.getSelection();
        if (sel) {
          sel.removeAllRanges();
          sel.addRange(lastSavedRangeRef.current);
        }
      }

      document.execCommand('insertText', false, tag);

      setEditorContent(editorRef.current.innerHTML);
      setIsModified(true);
      setCopiedTag(tag);
      showToast(`Метка ${tag} вставлена в документ!`);
      setTimeout(() => setCopiedTag(null), 2000);
    }, 50);
  };

  const handleSaveHtml = async () => {
    try {
      setSaving(true);
      const contentToSave = editorRef.current ? editorRef.current.innerHTML : editorContent;
      await saveContractTemplateHtml(activeTab, contentToSave);
      const updatedStatus = await getContractTemplateStatus();
      setStatus(updatedStatus);
      setIsModified(false);
      showToast('Шаблон договора успешно сохранен в CRM!');
      
      // Update preview
      try {
        const blob = await downloadContractTemplateBlob(activeTab);
        renderDocxPreview(blob);
      } catch (e) {
        console.warn('Could not re-render preview', e);
      }
    } catch (e: any) {
      alert('Ошибка сохранения шаблона: ' + (e.response?.data?.error || e.message));
    } finally {
      setSaving(false);
    }
  };

  const handleLoadPreset = () => {
    if (isModified && !window.confirm('Текущие изменения в редакторе будут заменены стандартным образцом. Продолжить?')) {
      return;
    }
    const preset = activeTab === 'INDIVIDUAL' ? STARTER_TEMPLATE_INDIVIDUAL : STARTER_TEMPLATE_LEGAL;
    setEditorContent(preset);
    if (editorRef.current) {
      editorRef.current.innerHTML = preset;
    }
    setIsModified(true);
    setViewMode('EDITOR');
    showToast('Стандартный образец договора загружен в редактор');
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Пожалуйста, выберите файл Microsoft Word в формате .docx');
      return;
    }

    try {
      setLoading(true);
      const arrayBuffer = await file.arrayBuffer();

      // Convert images to base64 embedded data URLs
      const mammothOptions = {
        convertImage: mammoth.images.imgElement((element: any) => {
          return element.read("base64").then((imageBuffer: string) => ({
            src: "data:" + element.contentType + ";base64," + imageBuffer
          }));
        })
      };

      const result = await mammoth.convertToHtml({ arrayBuffer }, mammothOptions);
      const convertedHtml = result.value;

      if (convertedHtml && convertedHtml.trim()) {
        setEditorContent(convertedHtml);
        if (editorRef.current) {
          editorRef.current.innerHTML = convertedHtml;
        }
        setIsModified(false);

        // Upload to backend
        await uploadContractTemplate(activeTab, file);
        const updatedStatus = await getContractTemplateStatus();
        setStatus(updatedStatus);
        showToast('DOCX файл успешно загружен и сохранен со всеми изображениями!');

        // Render preview
        setViewMode('PREVIEW');
        const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        setTimeout(() => renderDocxPreview(blob), 50);
      }
    } catch (e: any) {
      alert('Ошибка при чтении DOCX файла: ' + (e.message || e));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadDocx = async () => {
    try {
      if (isModified && editorRef.current) {
        await saveContractTemplateHtml(activeTab, editorRef.current.innerHTML);
        setIsModified(false);
      }
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
      alert('Не удалось скачать DOCX: ' + (e.response?.data?.error || e.message));
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
      const updatedStatus = await getContractTemplateStatus();
      setStatus(updatedStatus);
      const preset = activeTab === 'INDIVIDUAL' ? STARTER_TEMPLATE_INDIVIDUAL : STARTER_TEMPLATE_LEGAL;
      setEditorContent(preset);
      if (editorRef.current) editorRef.current.innerHTML = preset;
      setIsModified(false);
      setViewMode('EDITOR');
      if (previewContainerRef.current) previewContainerRef.current.innerHTML = '';
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
      if (isModified && editorRef.current) {
        await saveContractTemplateHtml(activeTab, editorRef.current.innerHTML);
        setIsModified(false);
      }
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

  const insertTable = () => {
    const tableHtml = `
      <table border="1" cellpadding="6" style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <thead>
          <tr style="background: rgba(0,0,0,0.05);">
            <th>Колонка 1</th>
            <th>Колонка 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Текст ячейки 1</td>
            <td>Текст ячейки 2</td>
          </tr>
        </tbody>
      </table><p></p>
    `;
    document.execCommand('insertHTML', false, tableHtml);
    if (editorRef.current) {
      setEditorContent(editorRef.current.innerHTML);
      setIsModified(true);
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
        <RefreshCw size={32} className="spin" style={{ color: 'var(--accent-primary)' }} />
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
            <p className="page-subtitle">Точное отображение страниц Word, поддержка изображений и встроенный редактор договора</p>
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
            <span className="tab-status-badge loaded"><CheckCircle2 size={13} /> Шаблон настроен</span>
          ) : (
            <span className="tab-status-badge empty">Не сохранен</span>
          )}
        </button>

        <button 
          className={`template-tab-btn ${activeTab === 'LEGAL_ENTITY' ? 'active' : ''}`}
          onClick={() => setActiveTab('LEGAL_ENTITY')}
        >
          <Building2 size={18} />
          <span>Для юридических лиц (B2B)</span>
          {status?.legal ? (
            <span className="tab-status-badge loaded"><CheckCircle2 size={13} /> Шаблон настроен</span>
          ) : (
            <span className="tab-status-badge empty">Не сохранен</span>
          )}
        </button>
      </div>

      {/* Editor & Tag Assistant Split Grid */}
      <div className="template-editor-grid">
        {/* Left / Center Column: Document Canvas & Editor */}
        <div className="document-editor-container glass-panel">
          {/* Editor Action Header */}
          <div className="editor-top-actions">
            <div className="editor-title-box">
              {/* View Mode Switcher */}
              <div className="view-mode-toggle-group">
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'PREVIEW' ? 'active' : ''}`}
                  onClick={() => {
                    setViewMode('PREVIEW');
                    if (isTemplateLoaded) {
                      downloadContractTemplateBlob(activeTab).then(blob => renderDocxPreview(blob)).catch(() => {});
                    }
                  }}
                  title="Оригинальный постраничный вид файла DOCX (100% верстка Word)"
                >
                  <Eye size={15} />
                  <span>Оригинал (DOCX)</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'EDITOR' ? 'active' : ''}`}
                  onClick={() => setViewMode('EDITOR')}
                  title="Визуальное редактирование текста и меток"
                >
                  <Edit3 size={15} />
                  <span>Редактор текста</span>
                </button>
              </div>

              {isModified && <span className="modified-badge">Есть несохраненные изменения</span>}
            </div>

            <div className="editor-main-btns">
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".docx" 
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <button 
                className="btn btn-secondary"
                onClick={() => fileInputRef.current?.click()}
                title="Загрузить готовый .docx файл договора"
              >
                <Upload size={15} />
                <span>Загрузить .docx</span>
              </button>

              <button 
                className="btn btn-secondary"
                onClick={handleLoadPreset}
                title="Загрузить стандартный образец договора с готовыми метками"
              >
                <Sparkles size={15} />
                <span>Образец</span>
              </button>

              <button 
                className="btn btn-secondary"
                disabled={!isTemplateLoaded}
                onClick={handleDownloadDocx}
                title="Скачать договор в формате Word (.docx)"
              >
                <Download size={15} />
                <span>Скачать DOCX</span>
              </button>

              <button 
                className="btn btn-secondary"
                disabled={!isTemplateLoaded || testGenerating}
                onClick={handleTestGeneration}
                title="Сформировать тестовый заполненный договор"
              >
                {testGenerating ? <RefreshCw size={15} className="spin" /> : <FileCheck size={15} />}
                <span>Тест</span>
              </button>

              <button 
                className="btn btn-primary"
                onClick={handleSaveHtml}
                disabled={saving}
                title="Сохранить текущий текст и разметку договора в CRM"
              >
                {saving ? <RefreshCw size={15} className="spin" /> : <Save size={15} />}
                <span>{saving ? 'Сохранение...' : 'Сохранить шаблон'}</span>
              </button>

              {isTemplateLoaded && (
                <button 
                  className="btn btn-danger-ghost"
                  onClick={handleDeleteTemplate}
                  title="Удалить шаблон"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Formatting Toolbar (Only in EDITOR Mode) */}
          {viewMode === 'EDITOR' && (
            <div className="editor-toolbar">
              <div className="toolbar-group">
                <button type="button" className="tool-btn" onClick={() => executeCommand('undo')} title="Отменить (Ctrl+Z)"><Undo size={15} /></button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('redo')} title="Повторить (Ctrl+Y)"><Redo size={15} /></button>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button type="button" className="tool-btn" onClick={() => executeCommand('bold')} title="Жирный"><Bold size={15} /></button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('italic')} title="Курсив"><Italic size={15} /></button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('underline')} title="Подчеркнутый"><UnderlineIcon size={15} /></button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('removeFormat')} title="Очистить форматирование"><Eraser size={15} /></button>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button type="button" className="tool-btn" onClick={() => executeCommand('formatBlock', '<h2>')} title="Заголовок H2">H2</button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('formatBlock', '<h3>')} title="Заголовок H3">H3</button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('formatBlock', '<p>')} title="Обычный текст">P</button>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button type="button" className="tool-btn" onClick={() => executeCommand('justifyLeft')} title="По левому краю"><AlignLeft size={15} /></button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('justifyCenter')} title="По центру"><AlignCenter size={15} /></button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('justifyRight')} title="По правому краю"><AlignRight size={15} /></button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('justifyFull')} title="По ширине"><AlignJustify size={15} /></button>
              </div>

              <div className="toolbar-divider" />

              <div className="toolbar-group">
                <button type="button" className="tool-btn" onClick={() => executeCommand('insertUnorderedList')} title="Маркированный список"><List size={15} /></button>
                <button type="button" className="tool-btn" onClick={() => executeCommand('insertOrderedList')} title="Нумерованный список"><ListOrdered size={15} /></button>
                <button type="button" className="tool-btn" onClick={insertTable} title="Вставить таблицу"><Table size={15} /></button>
                <button type="button" className="tool-btn page-break-tool" onClick={handleInsertPageBreak} title="Вставить разрыв страницы А4">
                  <SplitSquareVertical size={15} />
                  <span>Разрыв страницы</span>
                </button>
              </div>
            </div>
          )}

          {/* Document Display Canvas */}
          <div className="a4-canvas-scroll">
            {/* View Mode: PREVIEW (DOCX-PREVIEW 100% Fidelity) */}
            <div 
              style={{ display: viewMode === 'PREVIEW' ? 'block' : 'none', width: '100%' }}
            >
              {previewLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '10px', color: 'var(--text-muted)' }}>
                  <RefreshCw size={24} className="spin" />
                  <span>Рендеринг страниц документа...</span>
                </div>
              )}
              <div 
                ref={previewContainerRef} 
                className="docx-preview-wrapper"
              />
            </div>

            {/* View Mode: EDITOR (A4 Multi-page WYSIWYG Editor) */}
            <div 
              style={{ display: viewMode === 'EDITOR' ? 'flex' : 'none', width: '100%', justifyContent: 'center' }}
            >
              <div className="a4-page-sheet">
                <div 
                  ref={editorRef}
                  className="a4-content-editable"
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: editorContent }}
                  onInput={() => {
                    if (editorRef.current) {
                      setEditorContent(editorRef.current.innerHTML);
                      setIsModified(true);
                    }
                  }}
                  onKeyUp={saveSelection}
                  onMouseUp={saveSelection}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Tag Assistant with 1-Click Insert */}
        <div className="tag-assistant-col">
          <div className="tag-assistant-panel glass-panel">
            <div className="tag-panel-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3>Помощник по меткам</h3>
                <span className="tags-count-badge">{filteredTags.length}</span>
              </div>
              <p className="tag-panel-sub">
                Поставьте курсор в текст и нажмите на метку для <strong>мгновенной вставки</strong>
              </p>
            </div>

            {/* Search and Filters */}
            <div className="tag-filters-bar">
              <div className="tag-search-input-box">
                <Search size={16} className="search-icon" />
                <input 
                  type="text"
                  placeholder="Поиск метки (сумма, клиент, паспорт)..."
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
                  {activeTab === 'INDIVIDUAL' ? 'Заказчик' : 'Организация'}
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
                        onClick={() => handleInsertTagAtCursor(t.tag)}
                        title="Нажмите для вставки метки в позицию курсора"
                      >
                        <div className="tag-card-top">
                          <code className="tag-code">{t.tag}</code>
                          <button className="tag-copy-btn" aria-label="Вставить метку">
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
