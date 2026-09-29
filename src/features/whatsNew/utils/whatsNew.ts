import type { Release, UserRole } from '../releases';

/** Сравнивает версии вида 1.10.2 по числам (1.10 новее 1.9); отрицательное — a старше b. */
export const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
};

/** Выпуски с записями, которые касаются роли; выпуски без таких записей не показываются. */
export const getReleasesForRole = (releases: Release[], role: string | null): Release[] =>
  releases
    .map(release => ({
      ...release,
      changes: release.changes.filter(change => !change.roles || change.roles.includes(role as UserRole))
    }))
    .filter(release => release.changes.length > 0);

/** Есть ли выпуск новее просмотренного пользователем (никогда не открывал — все новые). */
export const isReleaseUnseen = (version: string, lastSeenVersion: string | null): boolean =>
  !lastSeenVersion || compareVersions(version, lastSeenVersion) > 0;

/** Дата выпуска для людей: «29 сентября 2026». */
export const formatReleaseDate = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
};
