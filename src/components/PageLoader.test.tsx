import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { PageLoader } from './PageLoader';

describe('PageLoader', () => {
  it('renders page loader without crash', () => {
    const { container } = render(<PageLoader />);
    expect(container.firstChild).toBeInTheDocument();
  });
});
