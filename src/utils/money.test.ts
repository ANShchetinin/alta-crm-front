import { describe, expect, it } from 'vitest';
import { formatRub } from './money';

describe('formatRub', () => {
  it('keeps the ruble sign on the same line as the amount', () => {
    expect(formatRub(1234567)).toMatch(/^1\s234\s567\u00A0₽$/);
    expect(formatRub(1234567)).not.toMatch(/ /);
  });
});
