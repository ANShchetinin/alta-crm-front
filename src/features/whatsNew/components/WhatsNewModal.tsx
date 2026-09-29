import { Sparkles, TrendingUp, Wrench, type LucideIcon } from 'lucide-react';
import { Modal } from '../../../components/ui';
import { useWhatsNew } from '../hooks/useWhatsNew';
import type { ChangeKind } from '../releases';
import { formatReleaseDate } from '../utils/whatsNew';
import '../../../styles/whats-new.css';

const KIND_META: Record<ChangeKind, { label: string; icon: LucideIcon }> = {
  feature: { label: 'Новая функция', icon: Sparkles },
  improvement: { label: 'Улучшение', icon: TrendingUp },
  fix: { label: 'Исправление', icon: Wrench }
};

/** Изменения по версиям для роли пользователя — от новых к старым; выпуски после прошлого просмотра отмечены. */
export const WhatsNewModal = () => {
  const { isOpen, releases, isNew, close } = useWhatsNew();
  return (
    <Modal isOpen={isOpen} onClose={close} title="Что нового" maxWidth="600px">
      <div className="whats-new">
        {releases.map(release => (
          <section key={release.version} className="whats-new__release" aria-labelledby={`release-${release.version}`}>
            <header className="whats-new__release-head">
              <h3 id={`release-${release.version}`} className="whats-new__version">v{release.version}</h3>
              <span className="whats-new__date">{formatReleaseDate(release.date)}</span>
              {isNew(release.version) && <span className="whats-new__new-badge">Новое</span>}
            </header>
            <ul className="whats-new__changes">
              {release.changes.map(change => {
                const { icon: Icon, label } = KIND_META[change.kind];
                return (
                  <li key={change.title} className={`whats-new__change whats-new__change--${change.kind}`}>
                    <span className="whats-new__change-icon" title={label}>
                      <Icon size={16} aria-hidden="true" />
                    </span>
                    <div className="whats-new__change-body">
                      <div className="whats-new__change-title">
                        {change.title}
                        <span className="whats-new__kind">{label}</span>
                      </div>
                      <p className="whats-new__change-text">{change.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
};
