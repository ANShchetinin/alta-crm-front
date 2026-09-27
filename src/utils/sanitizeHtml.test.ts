import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from './sanitizeHtml';

describe('sanitizeHtml', () => {
  it('removes scripts and inline event handlers', () => {
    const result = sanitizeHtml('<p onclick="alert(1)">Договор</p><script>alert(2)</script><img src="x" onerror="alert(3)">');

    expect(result).not.toContain('script');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onerror');
    expect(result).toContain('Договор');
  });

  it('removes javascript: links', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">ссылка</a>')).not.toContain('javascript:');
  });

  it('keeps document markup, inline styles and template placeholders', () => {
    const html = '<table><tbody><tr><td style="text-align: center;"><b>{{client_name}}</b></td></tr></tbody></table>';

    expect(sanitizeHtml(html)).toBe(html);
  });
});
