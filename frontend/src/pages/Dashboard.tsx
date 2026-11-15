import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Radio,
  AlertTriangle,
  HeartPulse,
  ShieldCheck,
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { PatientTable } from '../components/patients/PatientTable';
import { HeartRateChart } from '../components/charts/HeartRateChart';
import { SpO2Chart } from '../components/charts/SpO2Chart';
import { AlertItemComponent } from '../components/alerts/AlertItem';
import {
  mockDashboardStats,
  mockPatients,
  mockAlerts,
  mockHeartRateTrends,
  mockSpO2Trends,
} from '../data/mockData';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Clinical Telemetry & RPM Command Center"
        subtitle="Real-time multi-parameter IoMT monitoring with edge differential privacy & automated triage"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/monitoring')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors shadow-sm"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Open Live Telemetry Wall</span>
            </button>
            <button
              onClick={() => navigate('/privacy')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover text-healthcare-textSecondary text-xs font-medium border border-healthcare-border transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
              <span>Privacy State</span>
            </button>
          </div>
        }
      />

      {/* Primary KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Patients */}
        <StatCard
          title="Total Patients"
          value={mockDashboardStats.totalPatients.toLocaleString()}
          subtitle="Enrolled in Tele-Rehab & RPM"
          trend={mockDashboardStats.totalPatientsChange}
          trendType="positive"
          accentColor="teal"
          icon={<Users className="w-5 h-5" />}
        />

        {/* Active Monitoring Sessions */}
        <StatCard
          title="Active Monitoring Sessions"
          value={mockDashboardStats.activeMonitoringSessions}
          subtitle="Continuous wearable data streams"
          trend={mockDashboardStats.activeMonitoringSessionsChange}
          trendType="neutral"
          accentColor="emerald"
          badge="42 Live"
          icon={<Radio className="w-5 h-5 text-emerald-400" />}
        />

        {/* Critical Alerts */}
        <StatCard
          title="Critical Alerts"
          value={mockDashboardStats.criticalAlerts}
          subtitle="Immediate clinical triage required"
          trend={mockDashboardStats.criticalAlertsChange}
          trendType="critical"
          accentColor="rose"
          badge="Urgent"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
        />

        {/* Patients Requiring Attention */}
        <StatCard
          title="Patients Requiring Attention"
          value={mockDashboardStats.patientsRequiringAttention}
          subtitle="Elevated vitals or low device battery"
          trend={mockDashboardStats.patientsRequiringAttentionChange}
          trendType="warning"
          accentColor="amber"
          icon={<HeartPulse className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Real-time Vital Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Heart Rate Trend Chart */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-healthcare-borderSubtle">
            <div>
              <h2 className="text-sm font-semibold text-healthcare-textPrimary flex items-center gap-2">
                <span>Aggregate Heart Rate Trajectory</span>
                <span className="text-xs font-mono font-normal text-healthcare-textMuted">
                  (Ward Telemetry Zone A)
                </span>
              </h2>
              <p className="text-xs text-healthcare-textSecondary mt-0.5">
                Continuously monitored via Edge Gateways with Laplace DP noise injection
              </p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
            >
              <span>Trends</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <HeartRateChart data={mockHeartRateTrends} height={250} />
        </div>

        {/* SpO2 Trend Chart */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-healthcare-borderSubtle">
            <div>
              <h2 className="text-sm font-semibold text-healthcare-textPrimary flex items-center gap-2">
                <span>Oxygen Saturation (SpO2) Trajectory</span>
                <span className="text-xs font-mono font-normal text-healthcare-textMuted">
                  (Hypoxia Surveillance)
                </span>
              </h2>
              <p className="text-xs text-healthcare-textSecondary mt-0.5">
                Ambulatory pulse oximeter telemetry with threshold-based edge alerts
              </p>
            </div>
            <button
              onClick={() => navigate('/analytics')}
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
            >
              <span>Detailed</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <SpO2Chart data={mockSpO2Trends} height={250} />
        </div>
      </div>

      {/* Patient Monitoring Table Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-healthcare-textPrimary">
              Active Patient Telemetry Roster
            </h2>
            <p className="text-xs text-healthcare-textSecondary mt-0.5">
              Live IoMT biometrics, assigned risk stratifications, and cryptographic edge node allocations
            </p>
          </div>
          <button
            onClick={() => navigate('/patients')}
            className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <span>View All Patients ({mockPatients.length})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <PatientTable patients={mockPatients} />
      </div>

      {/* Recent Alerts Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-healthcare-textPrimary">
              Recent Clinical &amp; Edge Alerts
            </h2>
            <p className="text-xs text-healthcare-textSecondary mt-0.5">
              Prioritized triage queue from wearable IoMT devices and edge threshold triggers
            </p>
          </div>
          <button
            onClick={() => navigate('/alerts')}
            className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <span>Alert Center ({mockAlerts.length})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mockAlerts.slice(0, 4).map((alert) => (
            <AlertItemComponent
              key={alert.id}
              alert={alert}
              compact
            />
          ))}
        </div>
      </div>
    </div>
  );
};
