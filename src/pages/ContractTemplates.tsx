import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FileText, Upload, Download, Trash2, CheckCircle2, Copy, Check, Search, 
  User, Building2, RefreshCw, FileCheck, Save, Sparkles, Bold, Italic, 
  Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, 
  List, ListOrdered, Table, Eraser, Undo, Redo, SplitSquareVertical,
  Image as ImageIcon, Edit3, Eye
} from 'lucide-react';
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
<h2 style="text-align: center; margin-bottom: 20px;">ДОГОВОР ПОДРЯДА № {{order_num}}</h2>
<p style="display: flex; justify-content: space-between; margin-bottom: 16px;">
  <strong>г. {{city}}</strong>
  <strong style="float: right;">{{contract_date}}</strong>
</p>
<div style="clear: both;"></div>

<p style="text-align: justify; text-indent: 25px; margin-bottom: 12px;">
  <strong>{{executor_name}}</strong>, именуемый(ое) в дальнейшем «Исполнитель», с одной стороны, и гражданин(ка) <strong>{{client_name}}</strong>, именуемый(ая) в дальнейшем «Заказчик», с другой стороны, заключили настоящий договор о нижеследующем:
</p>

<h3 style="margin-top: 18px; margin-bottom: 10px;">1. ПРЕДМЕТ ДОГОВОРА</h3>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 10px;">
  1.1. Исполнитель обязуется выполнить работы по установке натяжного потолка по адресу: <strong>{{install_address}}</strong>, а Заказчик обязуется принять результат работ и оплатить его в соответствии с условиями настоящего Договора.
</p>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 10px;">
  1.2. Сводные параметры помещения и спецификация конструкций:
</p>

<table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11pt;">
  <thead>
    <tr style="background: #f1f5f9; text-align: center;">
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
    <tr style="text-align: center;">
      <td>{{area}}</td>
      <td>{{perimeter}}</td>
      <td>{{canvases_count}}</td>
      <td>{{insert_length}}</td>
      <td>{{pipe_count}}</td>
      <td>{{lights_count}}</td>
      <td>{{timber_length}}</td>
    </tr>
  </tbody>
</table>

<p style="margin-bottom: 12px;">Артикул и фактура полотна: <strong>{{canvas_article}}</strong>.</p>

<h3 style="margin-top: 18px; margin-bottom: 10px;">2. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ</h3>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 8px;">
  2.1. Общая стоимость работ и материалов по Договору составляет <strong>{{total_price}}</strong> ({{total_price_words}}).
</p>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 8px;">
  2.2. Заказчик вносит авансовый платеж в размере <strong>{{prepayment}}</strong> при подписании настоящего Договора.
</p>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 8px;">
  2.3. Окончательный расчет в размере <strong>{{remainder}}</strong> производится Заказчиком в день завершения монтажных работ.
</p>

<div class="page-break-badge-wrapper" contenteditable="false" data-page-break="true">
  <div class="page-break-badge">
    <span>✂ --- Разрыв страницы А4 ---</span>
    <button type="button" class="page-break-remove-btn" onclick="this.closest('.page-break-badge-wrapper').remove()">✕ Удалить</button>
  </div>
</div>

<h3 style="margin-top: 18px; margin-bottom: 10px;">3. СРОКИ И ПОРЯДОК СДАЧИ-ПРИЕМКИ</h3>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 8px;">
  3.1. Срок готовности и монтажа: до <strong>{{handover_date}}</strong>.
</p>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 14px;">
  3.2. По завершении работ стороны подписывают Акт приема-сдачи выполненных работ.
</p>

<h3 style="margin-top: 18px; margin-bottom: 10px;">4. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h3>
<table border="1" cellpadding="10" style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10.5pt;">
  <thead>
    <tr style="background: #f1f5f9;">
      <th style="width: 50%; text-align: left;">ИСПОЛНИТЕЛЬ</th>
      <th style="width: 50%; text-align: left;">ЗАКАЗЧИК</th>
    </tr>
  </thead>
  <tbody>
    <tr valign="top">
      <td>
        <p style="margin: 0 0 6px 0;"><strong>{{executor_name}}</strong></p>
        <p style="margin: 0 0 4px 0;">ИНН: {{executor_inn}} / ОГРН: {{executor_ogrn}}</p>
        <p style="margin: 0 0 4px 0;">Юр. адрес: {{executor_legal_address}}</p>
        <p style="margin: 0 0 4px 0;">Банк: {{executor_bank_name}}</p>
        <p style="margin: 0 0 4px 0;">БИК: {{executor_bik}}, Р/с: {{executor_rs}}</p>
        <p style="margin: 0 0 4px 0;">Телефон: {{executor_phone}}, Email: {{executor_email}}</p>
        <br/><br/>
        <p style="margin: 0;">________________ / {{executor_short}} /</p>
      </td>
      <td>
        <p style="margin: 0 0 6px 0;"><strong>{{client_name}}</strong></p>
        <p style="margin: 0 0 4px 0;">Паспорт: {{client_passport_series}} {{client_passport_number}}</p>
        <p style="margin: 0 0 4px 0;">Выдан: {{client_passport_issued_by}}</p>
        <p style="margin: 0 0 4px 0;">Дата выдачи: {{client_passport_issued_date}}</p>
        <p style="margin: 0 0 4px 0;">Адрес регистрации: {{client_reg_address}}</p>
        <p style="margin: 0 0 4px 0;">Телефон: {{client_phone}}</p>
        <br/><br/>
        <p style="margin: 0;">________________ / {{client_short}} /</p>
      </td>
    </tr>
  </tbody>
</table>
`;

const STARTER_TEMPLATE_LEGAL = `
<h2 style="text-align: center; margin-bottom: 20px;">ДОГОВОР ПОДРЯДА № {{order_num}}</h2>
<p style="display: flex; justify-content: space-between; margin-bottom: 16px;">
  <strong>г. {{city}}</strong>
  <strong style="float: right;">{{contract_date}}</strong>
</p>
<div style="clear: both;"></div>

<p style="text-align: justify; text-indent: 25px; margin-bottom: 12px;">
  <strong>{{executor_name}}</strong>, именуемый в дальнейшем «Исполнитель», в лице <strong>{{executor_signer_name}}</strong>, действующего на основании {{executor_signer_authority}}, с одной стороны, и <strong>{{client_legal_name}}</strong>, именуемое в дальнейшем «Заказчик», в лице <strong>{{client_contact_person}}</strong>, действующего на основании Устава, с другой стороны, заключили настоящий договор о нижеследующем:</p>

<h3 style="margin-top: 18px; margin-bottom: 10px;">1. ПРЕДМЕТ ДОГОВОРА</h3>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 10px;">
  1.1. Исполнитель обязуется выполнить комплекс монтажных работ по установке натяжных потолков на объекте Заказчика по адресу: <strong>{{install_address}}</strong>.
</p>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 10px;">
  1.2. Площадь объекта: <strong>{{area}} м²</strong>, периметр: <strong>{{perimeter}} м/п</strong>, количество светильников: <strong>{{lights_count}} шт.</strong>
</p>

<h3 style="margin-top: 18px; margin-bottom: 10px;">2. СТОИМОСТЬ И ПОРЯДОК РАСЧЕТОВ</h3>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 8px;">
  2.1. Стоимость работ по настоящему договору составляет <strong>{{total_price}}</strong> ({{total_price_words}}), {{client_vat_status}}.
</p>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 8px;">
  2.2. Авансовый платеж: <strong>{{prepayment}}</strong>.
</p>
<p style="text-align: justify; text-indent: 25px; margin-bottom: 8px;">
  2.3. Окончательный расчет в размере <strong>{{remainder}}</strong> осуществляется в течение 3 банковских дней после подписания Акта приема-передачи.
</p>

<div class="page-break-badge-wrapper" contenteditable="false" data-page-break="true">
  <div class="page-break-badge">
    <span>✂ --- Разрыв страницы А4 ---</span>
    <button type="button" class="page-break-remove-btn" onclick="this.closest('.page-break-badge-wrapper').remove()">✕ Удалить</button>
  </div>
</div>

<h3 style="margin-top: 18px; margin-bottom: 10px;">3. АДРЕСА, РЕКВИЗИТЫ И ПОДПИСИ СТОРОН</h3>
<table border="1" cellpadding="10" style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10.5pt;">
  <thead>
    <tr style="background: #f1f5f9;">
      <th style="width: 50%; text-align: left;">ИСПОЛНИТЕЛЬ</th>
      <th style="width: 50%; text-align: left;">ЗАКАЗЧИК</th>
    </tr>
  </thead>
  <tbody>
    <tr valign="top">
      <td>
        <p style="margin: 0 0 6px 0;"><strong>{{executor_name}}</strong></p>
        <p style="margin: 0 0 4px 0;">ИНН / КПП: {{executor_inn}} / {{executor_kpp}}</p>
        <p style="margin: 0 0 4px 0;">ОГРН: {{executor_ogrn}}</p>
        <p style="margin: 0 0 4px 0;">Юр. адрес: {{executor_legal_address}}</p>
        <p style="margin: 0 0 4px 0;">Банк: {{executor_bank_name}} (БИК: {{executor_bik}})</p>
        <p style="margin: 0 0 4px 0;">Р/с: {{executor_rs}}, К/с: {{executor_ks}}</p>
        <p style="margin: 0 0 4px 0;">Тел: {{executor_phone}}, Email: {{executor_email}}</p>
        <br/><br/>
        <p style="margin: 0;">________________ / {{executor_signer_name}} /</p>
      </td>
      <td>
        <p style="margin: 0 0 6px 0;"><strong>{{client_legal_name}}</strong></p>
        <p style="margin: 0 0 4px 0;">ИНН / КПП: {{client_inn}} / {{client_kpp}}</p>
        <p style="margin: 0 0 4px 0;">ОГРН: {{client_ogrn}}</p>
        <p style="margin: 0 0 4px 0;">Юр. адрес: {{client_legal_address}}</p>
        <p style="margin: 0 0 4px 0;">Банк: {{client_bank_name}} (БИК: {{client_bik}})</p>
        <p style="margin: 0 0 4px 0;">Р/с: {{client_rs}}, К/с: {{client_ks}}</p>
        <p style="margin: 0 0 4px 0;">Тел: {{client_phone}}, Email: {{client_email}}</p>
        <br/><br/>
        <p style="margin: 0;">________________ / {{client_contact_person}} /</p>
      </td>
    </tr>
  </tbody>
</table>
`;

export const ContractTemplates = () => {
  const [activeTab, setActiveTab] = useState<'INDIVIDUAL' | 'LEGAL_ENTITY'>('INDIVIDUAL');
  const [viewMode, setViewMode] = useState<'DOCX_VIEW' | 'HTML_EDITOR'>('DOCX_VIEW');
  const [status, setStatus] = useState<ContractTemplateStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testGenerating, setTestGenerating] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isModified, setIsModified] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const docxMountRef = useRef<HTMLDivElement>(null);
  const lastSavedRangeRef = useRef<Range | null>(null);

  const renderDocxDirectly = useCallback(async (blob: Blob) => {
    if (!docxMountRef.current) return;
    try {
      setDocumentLoading(true);
      docxMountRef.current.innerHTML = '';
      await docx.renderAsync(blob, docxMountRef.current, undefined, {
        className: 'docx-page',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
        ignoreFonts: false,
        breakPages: true,
        ignoreLastRenderedPageBreak: false,
        renderHeaders: true,
        renderFooters: true,
        useBase64URL: true,
        experimental: true,
        trimXmlDeclaration: true,
        debug: false
      });
    } catch (err) {
      console.error('Failed to render DOCX with docx-preview', err);
      if (docxMountRef.current) {
        docxMountRef.current.innerHTML = `
          <div style="padding: 40px; text-align: center; color: #94a3b8;">
            <p>Не удалось отобразить точный предпросмотр DOCX файла.</p>
          </div>
        `;
      }
    } finally {
      setDocumentLoading(false);
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

      if (hasTemplate) {
        setViewMode('DOCX_VIEW');
        try {
          const blob = await downloadContractTemplateBlob(activeTab);
          setTimeout(() => renderDocxDirectly(blob), 50);
        } catch (e) {
          console.warn('Could not fetch docx binary', e);
        }
      } else {
        setViewMode('HTML_EDITOR');
        const defaultPreset = activeTab === 'INDIVIDUAL' ? STARTER_TEMPLATE_INDIVIDUAL : STARTER_TEMPLATE_LEGAL;
        if (editorRef.current) {
          editorRef.current.innerHTML = htmlContent || defaultPreset;
        }
      }
      setIsModified(false);
    } catch (e) {
      console.error('Failed to load contract template', e);
    } finally {
      setLoading(false);
    }
  }, [activeTab, renderDocxDirectly]);

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
    setIsModified(true);
  };

  const handleInsertPageBreak = () => {
    const pageBreakHtml = `
      <div class="page-break-badge-wrapper" contenteditable="false" data-page-break="true">
        <div class="page-break-badge">
          <span>✂ --- Разрыв страницы А4 ---</span>
          <button type="button" class="page-break-remove-btn" onclick="this.closest('.page-break-badge-wrapper').remove()">✕ Удалить</button>
        </div>
      </div>
      <p></p>
    `;
    document.execCommand('insertHTML', false, pageBreakHtml);
    setIsModified(true);
  };

  const handleInsertImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        const imgHtml = `<p><img src="${dataUrl}" style="max-width: 100%; height: auto; display: block; margin: 12px 0;" /></p><p></p>`;
        document.execCommand('insertHTML', false, imgHtml);
        setIsModified(true);
        showToast('Изображение успешно вставлено в документ!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInsertTagAtCursor = (tag: string) => {
    if (viewMode === 'HTML_EDITOR') {
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
      setIsModified(true);
      setCopiedTag(tag);
      showToast(`Метка ${tag} вставлена в документ!`);
      setTimeout(() => setCopiedTag(null), 2000);
    } else {
      // In DOCX preview mode, copy to clipboard
      navigator.clipboard.writeText(tag);
      setCopiedTag(tag);
      showToast(`Метка ${tag} скопирована в буфер обмена! Вставьте её в ваш Word-документ.`);
      setTimeout(() => setCopiedTag(null), 2500);
    }
  };

  const handleSaveHtml = async () => {
    try {
      setSaving(true);
      const contentToSave = editorRef.current ? editorRef.current.innerHTML : '';
      await saveContractTemplateHtml(activeTab, contentToSave);
      const updatedStatus = await getContractTemplateStatus();
      setStatus(updatedStatus);
      setIsModified(false);
      showToast('Шаблон договора успешно сохранен в CRM!');
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
    if (editorRef.current) {
      editorRef.current.innerHTML = preset;
    }
    setIsModified(true);
    showToast('Стандартный образец договора загружен в редактор');
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.docx')) {
      alert('Пожалуйста, выберите файл Microsoft Word в формате .docx');
      return;
    }

    try {
      setLoading(true);
      // 1. Upload DOCX binary to backend
      await uploadContractTemplate(activeTab, file);

      // 2. Render DOCX directly with docx-preview
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      setViewMode('DOCX_VIEW');
      await renderDocxDirectly(blob);

      const updatedStatus = await getContractTemplateStatus();
      setStatus(updatedStatus);
      setIsModified(false);
      showToast('DOCX файл успешно загружен со 100% версткой и картинками!');
    } catch (e: any) {
      alert('Ошибка при чтении DOCX файла: ' + (e.message || e));
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownloadDocx = async () => {
    try {
      if (viewMode === 'HTML_EDITOR' && isModified && editorRef.current) {
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
      setViewMode('HTML_EDITOR');
      const preset = activeTab === 'INDIVIDUAL' ? STARTER_TEMPLATE_INDIVIDUAL : STARTER_TEMPLATE_LEGAL;
      if (editorRef.current) editorRef.current.innerHTML = preset;
      if (docxMountRef.current) docxMountRef.current.innerHTML = '';
      setIsModified(false);
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
      if (viewMode === 'HTML_EDITOR' && isModified && editorRef.current) {
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
          <tr style="background: #f1f5f9;">
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
    setIsModified(true);
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
            <p className="page-subtitle">Поддержка оригинальных шаблонов Microsoft Word (.docx) и встроенного редактора договоров</p>
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
        {/* Left / Center Column: Document Canvas */}
        <div className="document-editor-container glass-panel">
          {/* Editor Action Header */}
          <div className="editor-top-actions">
            <div className="editor-title-box">
              <div className="view-mode-toggle-group">
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'DOCX_VIEW' ? 'active' : ''}`}
                  onClick={() => {
                    setViewMode('DOCX_VIEW');
                    if (isTemplateLoaded) {
                      downloadContractTemplateBlob(activeTab).then(blob => renderDocxDirectly(blob)).catch(() => {});
                    }
                  }}
                  title="Оригинальный вид файла Word (.docx) со 100% версткой и логотипами"
                >
                  <Eye size={15} />
                  <span>Оригинал Word (.docx)</span>
                </button>
                <button
                  type="button"
                  className={`view-mode-btn ${viewMode === 'HTML_EDITOR' ? 'active' : ''}`}
                  onClick={() => setViewMode('HTML_EDITOR')}
                  title="Встроенный визуальный редактор документа"
                >
                  <Edit3 size={15} />
                  <span>Встроенный редактор</span>
                </button>
              </div>

              {isModified && viewMode === 'HTML_EDITOR' && (
                <span className="modified-badge">Есть несохраненные изменения</span>
              )}
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

              {viewMode === 'HTML_EDITOR' && (
                <>
                  <button 
                    className="btn btn-secondary"
                    onClick={handleLoadPreset}
                    title="Загрузить стандартный образец договора с готовыми метками"
                  >
                    <Sparkles size={15} />
                    <span>Образец</span>
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
                </>
              )}

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

          {/* Formatting Toolbar (Only in HTML_EDITOR Mode) */}
          {viewMode === 'HTML_EDITOR' && (
            <div className="editor-toolbar">
              <input 
                type="file" 
                ref={imageInputRef} 
                accept="image/*" 
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleInsertImageFile(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />

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
                
                <button 
                  type="button" 
                  className="tool-btn image-insert-tool" 
                  onClick={() => imageInputRef.current?.click()} 
                  title="Вставить картинку или логотип в документ"
                >
                  <ImageIcon size={15} />
                  <span>Картинка</span>
                </button>

                <button 
                  type="button" 
                  className="tool-btn page-break-tool" 
                  onClick={handleInsertPageBreak} 
                  title="Вставить разрыв страницы А4"
                >
                  <SplitSquareVertical size={15} />
                  <span>Разрыв страницы</span>
                </button>
              </div>
            </div>
          )}

          {/* Document Multi-Page Canvas */}
          <div className="a4-canvas-scroll">
            {documentLoading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px', gap: '10px', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="spin" />
                <span>Загрузка страниц документа Word...</span>
              </div>
            )}

            {/* DOCX Original View Mode (100% Word Fidelity) */}
            <div 
              style={{ display: viewMode === 'DOCX_VIEW' ? 'block' : 'none', width: '100%' }}
            >
              <div 
                ref={docxMountRef} 
                className="docx-preview-wrapper"
              />
            </div>

            {/* HTML WYSIWYG Editor Mode */}
            <div 
              style={{ display: viewMode === 'HTML_EDITOR' ? 'flex' : 'none', width: '100%', justifyContent: 'center' }}
            >
              <div className="a4-page-sheet">
                <div 
                  ref={editorRef}
                  className="a4-content-editable"
                  contentEditable
                  suppressContentEditableWarning
                  onInput={() => setIsModified(true)}
                  onKeyUp={saveSelection}
                  onMouseUp={saveSelection}
                />
              </div>
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
              <p className="tag-panel-sub">
                {viewMode === 'HTML_EDITOR' 
                  ? 'Поставьте курсор в текст и нажмите на метку для вставки' 
                  : 'Нажмите на метку для копирования в буфер обмена и вставки в Word'}
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
                        title={viewMode === 'HTML_EDITOR' ? "Нажмите для вставки метки в позицию курсора" : "Нажмите для копирования метки"}
                      >
                        <div className="tag-card-top">
                          <code className="tag-code">{t.tag}</code>
                          <button className="tag-copy-btn" aria-label="Вставить / скопировать метку">
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
