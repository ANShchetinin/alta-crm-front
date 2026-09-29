import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { SystemAnnouncement, SystemAnnouncementRequest } from '../../../api/announcements';
import { Button, Input, Modal } from '../../../components/ui';
import { getErrorMessage } from '../../../utils/errorMessage';
import {
  EMPTY_FORM, MESSAGE_MAX_LENGTH, SEVERITY_META, SEVERITY_OPTIONS, TITLE_MAX_LENGTH, toFormValues, toRequest, validateForm,
  type AnnouncementFormValues
} from '../utils/announcements';
import { AnnouncementBanner } from './AnnouncementBanner';

interface AnnouncementFormModalProps {
  isOpen: boolean;
  /** Изменяемое объявление; без него — создание нового. */
  announcement: SystemAnnouncement | null;
  onClose: () => void;
  onSave: (request: SystemAnnouncementRequest, id?: number) => Promise<void>;
}

/** Создание и изменение объявления с превью того, как его увидят пользователи. */
export const AnnouncementFormModal = ({ isOpen, announcement, onClose, onSave }: AnnouncementFormModalProps) => {
  const [values, setValues] = useState<AnnouncementFormValues>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setValues(announcement ? toFormValues(announcement) : EMPTY_FORM);
      setError(null);
    }
  }, [isOpen, announcement]);

  const update = <K extends keyof AnnouncementFormValues>(key: K, value: AnnouncementFormValues[K]) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const preview = useMemo<SystemAnnouncement>(() => ({
    id: 0,
    title: values.title.trim() || 'Заголовок объявления',
    message: values.message.trim() || 'Текст объявления',
    severity: values.severity,
    showFrom: '',
    showUntil: null,
    dismissible: values.severity !== 'CRITICAL',
    createdAt: '',
    updatedAt: ''
  }), [values.title, values.message, values.severity]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationError = validateForm(values);
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(toRequest(values), announcement?.id);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Не удалось сохранить объявление'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={announcement ? 'Изменить объявление' : 'Новое объявление'}
      maxWidth="640px"
      footer={(
        <div className="announcement-form__footer">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>Отмена</Button>
          <Button type="submit" form="announcement-form" loading={isSaving}>
            {announcement ? 'Сохранить' : 'Опубликовать'}
          </Button>
        </div>
      )}
    >
      <form id="announcement-form" className="announcement-form" onSubmit={handleSubmit} noValidate>
        <Input
          id="announcement-title"
          label="Заголовок"
          value={values.title}
          maxLength={TITLE_MAX_LENGTH}
          placeholder="Плановое обновление системы"
          onChange={e => update('title', e.target.value)}
        />

        <div className="form-group">
          <label htmlFor="announcement-message">Текст</label>
          <textarea
            id="announcement-message"
            value={values.message}
            maxLength={MESSAGE_MAX_LENGTH}
            rows={4}
            placeholder="29.09 с 22:00 до 23:00 МСК сервис может быть недоступен. Сохраните изменения заранее."
            onChange={e => update('message', e.target.value)}
          />
          <span className="announcement-form__hint">{values.message.length} / {MESSAGE_MAX_LENGTH}</span>
        </div>

        <fieldset className="announcement-form__severity">
          <legend>Важность</legend>
          {SEVERITY_OPTIONS.map(severity => {
            const { icon: Icon, label, tone } = SEVERITY_META[severity];
            return (
              <label key={severity} className={`severity-option severity-option--${tone} ${values.severity === severity ? 'is-selected' : ''}`}>
                <input
                  type="radio"
                  name="announcement-severity"
                  value={severity}
                  checked={values.severity === severity}
                  onChange={() => update('severity', severity)}
                />
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </label>
            );
          })}
        </fieldset>
        <p className="announcement-form__hint">
          Критичное объявление пользователи не могут скрыть — оно видно до окончания показа.
        </p>

        <div className="announcement-form__period">
          <div className="form-group">
            <label htmlFor="announcement-show-from">Показывать с</label>
            <input
              id="announcement-show-from"
              type="datetime-local"
              value={values.showFrom}
              onChange={e => update('showFrom', e.target.value)}
            />
            <span className="announcement-form__hint">Пусто — сразу после публикации</span>
          </div>
          <div className="form-group">
            <label htmlFor="announcement-show-until">Показывать по</label>
            <input
              id="announcement-show-until"
              type="datetime-local"
              value={values.showUntil}
              onChange={e => update('showUntil', e.target.value)}
            />
            <span className="announcement-form__hint">Пусто — пока не удалите</span>
          </div>
        </div>
        <p className="announcement-form__hint">Время указывается в часовом поясе вашего устройства.</p>

        <div className="announcement-form__preview">
          <span className="announcement-form__preview-label">Так увидят пользователи</span>
          <AnnouncementBanner announcements={[preview]} onDismiss={() => {}} />
        </div>

        {error && <div className="announcement-form__error" role="alert">{error}</div>}
      </form>
    </Modal>
  );
};
