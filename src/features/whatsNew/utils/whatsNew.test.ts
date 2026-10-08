import { describe, expect, it } from 'vitest';
import packageJson from '../../../../package.json';
import { MAX_RELEASES, RELEASES, type Release } from '../releases';
import { compareVersions, formatReleaseDate, getReleasesForRole, isReleaseUnseen } from './whatsNew';

const releases: Release[] = [
  {
    version: '1.11.0',
    date: '2026-09-30',
    changes: [
      { kind: 'feature', title: 'Для всех', description: '' },
      { kind: 'feature', title: 'Для суперадмина', description: '', roles: ['SUPERADMIN'] }
    ]
  },
  {
    version: '1.10.0',
    date: '2026-09-28',
    changes: [{ kind: 'fix', title: 'Для офиса', description: '', roles: ['OWNER', 'MANAGER'] }]
  }
];

describe('compareVersions', () => {
  it('compares numbers, not strings', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBeGreaterThan(0);
    expect(compareVersions('1.9.3', '1.10.0')).toBeLessThan(0);
    expect(compareVersions('1.10.1', '1.10.1')).toBe(0);
    expect(compareVersions('2.0', '1.99.99')).toBeGreaterThan(0);
  });
});

describe('getReleasesForRole', () => {
  it('keeps changes for everyone and for the role, drops releases with nothing left', () => {
    expect(getReleasesForRole(releases, 'WORKER').map(r => r.changes.map(c => c.title))).toEqual([['Для всех']]);
    expect(getReleasesForRole(releases, 'OWNER').map(r => r.version)).toEqual(['1.11.0', '1.10.0']);
    expect(getReleasesForRole(releases, 'SUPERADMIN')[0].changes.map(c => c.title)).toEqual(['Для всех', 'Для суперадмина']);
  });
});

describe('isReleaseUnseen', () => {
  it('treats newer versions and a first visit as unseen', () => {
    expect(isReleaseUnseen('1.11.0', null)).toBe(true);
    expect(isReleaseUnseen('1.11.0', '1.10.1')).toBe(true);
    expect(isReleaseUnseen('1.10.1', '1.10.1')).toBe(false);
    expect(isReleaseUnseen('1.9.0', '1.10.1')).toBe(false);
  });
});

describe('formatReleaseDate', () => {
  it('shows the day and month in words without time zone shifts', () => {
    expect(formatReleaseDate('2026-09-01')).toMatch(/^1 сентября 2026/);
  });
});

describe('RELEASES', () => {
  it('go from newer to older with unique versions and valid dates', () => {
    for (let i = 1; i < RELEASES.length; i++) {
      expect(compareVersions(RELEASES[i - 1].version, RELEASES[i].version)).toBeGreaterThan(0);
      expect(RELEASES[i - 1].date >= RELEASES[i].date).toBe(true);
    }
    RELEASES.forEach(release => {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.changes.length).toBeGreaterThan(0);
      release.changes.forEach(change => {
        expect(change.title.trim()).not.toBe('');
        expect(change.description.trim()).not.toBe('');
      });
    });
  });

  it('keep only the latest releases: remove the oldest entry when adding a new one', () => {
    expect(RELEASES.length).toBeLessThanOrEqual(MAX_RELEASES);
  });

  it('describe the current app version: add an entry when bumping the version', () => {
    expect(compareVersions(RELEASES[0].version, packageJson.version)).toBeGreaterThanOrEqual(0);
  });
});
