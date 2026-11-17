import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/common/StatusBadge';

describe('StatusBadge Component', () => {
  it('renders correctly with given text value', () => {
    render(<StatusBadge value="ACTIVE" />);
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
  });

  it('renders critical styling for CRITICAL status', () => {
    const { container } = render(<StatusBadge value="CRITICAL" />);
    expect(container.querySelector('.text-rose-300')).toBeInTheDocument();
  });

  it('renders warning styling for WARNING status', () => {
    const { container } = render(<StatusBadge value="WARNING" />);
    expect(container.querySelector('.text-amber-300')).toBeInTheDocument();
  });

  it('renders emerald styling for ONLINE status', () => {
    const { container } = render(<StatusBadge value="ONLINE" />);
    expect(container.querySelector('.text-emerald-300')).toBeInTheDocument();
  });

  it('renders pulse ping indicator when pulse=true', () => {
    const { container } = render(<StatusBadge value="CRITICAL" pulse={true} />);
    expect(container.querySelector('.animate-ping')).toBeInTheDocument();
  });
});
