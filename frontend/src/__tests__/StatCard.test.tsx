import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../components/common/StatCard';
import { Activity } from 'lucide-react';

describe('StatCard Component', () => {
  it('renders title, value, and subtitle properly', () => {
    render(
      <StatCard
        title="Avg Heart Rate"
        value="72 bpm"
        subtitle="Across 24 active patient telemetry nodes"
        icon={<Activity data-testid="activity-icon" />}
        trend="+2.4% normal"
        trendType="positive"
        accentColor="teal"
      />
    );

    expect(screen.getByText('Avg Heart Rate')).toBeInTheDocument();
    expect(screen.getByText('72 bpm')).toBeInTheDocument();
    expect(screen.getByText('Across 24 active patient telemetry nodes')).toBeInTheDocument();
    expect(screen.getByText('+2.4% normal')).toBeInTheDocument();
  });

  it('renders critical trend style when trendType is critical', () => {
    const { container } = render(
      <StatCard
        title="Critical Alerts"
        value="3"
        icon={<Activity />}
        trend="Requires Triage"
        trendType="critical"
        accentColor="rose"
      />
    );

    expect(container.querySelector('.text-rose-400')).toBeInTheDocument();
  });
});
