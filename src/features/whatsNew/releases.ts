/**
 * «Что нового» для пользователей: пополняется при каждом релизе фронтенда вместе с версией в package.json.
 * Пишем то, что заметно пользователю, простыми словами; рефакторинг и инфраструктуру не упоминаем.
 * Порядок — от новых версий к старым. Без `roles` запись видят все, иначе — только перечисленные роли.
 */

export type UserRole = 'SUPERADMIN' | 'OWNER' | 'MANAGER' | 'WORKER';

export type ChangeKind = 'feature' | 'improvement' | 'fix';

export interface ReleaseChange {
  kind: ChangeKind;
  title: string;
  description: string;
  roles?: UserRole[];
}

export interface Release {
  /** Версия без «v», как в package.json. */
  version: string;
  /** Дата выпуска, YYYY-MM-DD. */
  date: string;
  changes: ReleaseChange[];
}

export const RELEASES: Release[] = [
  {
    version: '1.11.0',
    date: '2026-09-30',
    changes: [
      {
        kind: 'feature',
        title: 'Объявления о работе системы',
        description: 'Предупреждения о плановых работах и важные новости теперь показываются под верхней панелью и на странице входа. '
          + 'Обычное объявление можно скрыть кнопкой «Понятно» — на других устройствах оно тоже не появится.'
      },
      {
        kind: 'feature',
        title: 'Что нового',
        description: 'Список изменений по версиям — внизу меню, рядом с номером версии. Точка подсказывает, что после обновления есть новое.'
      }
    ]
  }
];
