import { useState } from 'react';
import { Megaphone, Plus } from 'lucide-react';
import type { SystemAnnouncement } from '../api/announcements';
import { Button, EmptyState } from '../components/ui';
import { AnnouncementFormModal } from '../features/announcements/components/AnnouncementFormModal';
import { AnnouncementList } from '../features/announcements/components/AnnouncementList';
import { useAnnouncementsAdmin } from '../features/announcements/hooks/useAnnouncementsAdmin';
import { confirm } from '../utils/confirm';
import { getErrorMessage } from '../utils/errorMessage';
import { toast } from '../utils/toast';
import '../styles/clients.css';
import '../styles/announcements.css';

/** Объявления платформы для всех пользователей (только SUPERADMIN). */
export const Announcements = () => {
  const { announcements, isLoading, isError, save, remove } = useAnnouncementsAdmin();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<SystemAnnouncement | null>(null);

  const openCreate = () => {
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (announcement: SystemAnnouncement) => {
    setEditing(announcement);
    setIsFormOpen(true);
  };

  const handleSave = async (...args: Parameters<typeof save>) => {
    await save(...args);
    toast.success(args[1] ? 'Объявление изменено — его снова увидят все, кто скрыл прежнюю версию' : 'Объявление опубликовано');
  };

  const handleDelete = async (announcement: SystemAnnouncement) => {
    const ok = await confirm({
      title: 'Удалить объявление?',
      message: `«${announcement.title}» перестанет показываться всем пользователям.`,
      confirmText: 'Удалить',
      cancelText: 'Отмена',
      danger: true
    });
    if (!ok) {
      return;
    }
    try {
      await remove(announcement.id);
      toast.success('Объявление удалено');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Не удалось удалить объявление'));
    }
  };

  return (
    <div className="clients-wrapper">
      <div className="clients-header">
        <div>
          <h1>Объявления</h1>
          <p className="announcements-page__subtitle">
            Показываются всем пользователям всех компаний под верхней панелью и на странице входа
          </p>
        </div>
        <div className="clients-actions">
          <Button icon={<Plus size={16} />} onClick={openCreate}>Новое объявление</Button>
        </div>
      </div>

      {isLoading && <div className="announcements-page__state">Загрузка...</div>}
      {isError && <div className="announcements-page__state">Не удалось загрузить объявления</div>}
      {!isLoading && !isError && announcements.length === 0 && (
        <EmptyState
          icon={<Megaphone size={32} />}
          title="Объявлений пока нет"
          description="Например, предупредите о плановом обновлении и возможной недоступности сервиса"
          action={<Button icon={<Plus size={16} />} onClick={openCreate}>Новое объявление</Button>}
        />
      )}
      {announcements.length > 0 && (
        <AnnouncementList announcements={announcements} onEdit={openEdit} onDelete={handleDelete} />
      )}

      <AnnouncementFormModal
        isOpen={isFormOpen}
        announcement={editing}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
