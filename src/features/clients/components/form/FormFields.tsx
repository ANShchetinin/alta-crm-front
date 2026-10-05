import type { CSSProperties, ReactNode } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { DateInput } from '../../../../components/ui/DateInput';
import { PhoneInput } from '../../../../components/ui/PhoneInput';

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: 'text' | 'email';
  /** Поле в сетке секции — без внешнего отступа группы. */
  inGrid?: boolean;
}

/** Подпись и текстовое поле карточки клиента. */
export const TextField = ({ label, value, onChange, placeholder, required, type = 'text', inGrid = false }: TextFieldProps) => (
  <div className="form-group" style={inGrid ? { margin: 0 } : undefined}>
    <label>{label}</label>
    <input
      type={type}
      required={required}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="search-input"
      style={{ width: '100%', paddingLeft: '12px' }}
    />
  </div>
);

/** Подпись и поле телефона карточки клиента с маской +7 (999) 123-45-67. */
export const PhoneField = ({ label, value, onChange, required, inGrid = false }: Omit<TextFieldProps, 'type' | 'placeholder'>) => (
  <div className="form-group" style={inGrid ? { margin: 0 } : undefined}>
    <label>{label}</label>
    <PhoneInput required={required} value={value} onChange={onChange} style={{ width: '100%', paddingLeft: '12px' }} />
  </div>
);

/** Подпись и поле даты карточки клиента с маской ДД.ММ.ГГГГ. */
export const DateField = ({ label, value, onChange, required, inGrid = false }: Omit<TextFieldProps, 'type' | 'placeholder'>) => (
  <div className="form-group" style={inGrid ? { margin: 0 } : undefined}>
    <label>{label}</label>
    <DateInput required={required} value={value} onChange={onChange} style={{ width: '100%', paddingLeft: '12px' }} />
  </div>
);

interface MessengerFieldsProps {
  whatsapp: string;
  telegram: string;
  onChange: (changes: { whatsapp?: string; telegram?: string }) => void;
  inGrid?: boolean;
}

const MessengerInput = ({ label, icon, value, placeholder, onChange, inGrid }: {
  label: string;
  icon: ReactNode;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  inGrid: boolean;
}) => (
  <div className="form-group" style={inGrid ? { margin: 0 } : undefined}>
    <label>{label}</label>
    <div className="input-with-icon">
      {icon}
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
        style={{ width: '100%', paddingLeft: '36px' }}
      />
    </div>
  </div>
);

/** Поля WhatsApp и Telegram с иконками. */
export const MessengerFields = ({ whatsapp, telegram, onChange, inGrid = false }: MessengerFieldsProps) => (
  <>
    <MessengerInput
      label="WhatsApp"
      icon={<MessageCircle className="input-icon" size={16} />}
      value={whatsapp}
      placeholder="+7 (900) 123-45-67 или никнейм"
      onChange={value => onChange({ whatsapp: value })}
      inGrid={inGrid}
    />
    <MessengerInput
      label="Telegram"
      icon={<Send className="input-icon" size={16} />}
      value={telegram}
      placeholder="@username"
      onChange={value => onChange({ telegram: value })}
      inGrid={inGrid}
    />
  </>
);

interface FormSectionProps {
  icon: ReactNode;
  title: string;
  /** Элемент справа от заголовка (кнопка действия). */
  action?: ReactNode;
  children: ReactNode;
  style?: CSSProperties;
}

/** Секция карточки клиента в рамке с заголовком. */
export const FormSection = ({ icon, title, action, children, style }: FormSectionProps) => (
  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', padding: '14px', borderRadius: 'var(--radius-md)', ...style }}>
    {action ? (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <h4 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          {icon} {title}
        </h4>
        {action}
      </div>
    ) : (
      <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {icon} {title}
      </h4>
    )}
    {children}
  </div>
);

/** Сетка полей внутри секции. */
export const FieldGrid = ({ minColumnWidth, children, style }: { minColumnWidth: number; children: ReactNode; style?: CSSProperties }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minColumnWidth}px, 1fr))`, gap: '12px', ...style }}>
    {children}
  </div>
);
