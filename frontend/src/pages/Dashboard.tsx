import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  Radio,
  AlertTriangle,
  HeartPulse,
  ShieldCheck,
  ArrowUpRight,
  ExternalLink,
  ChevronRight,
  User,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { HeartRateChart } from '../components/charts/HeartRateChart';
import { SpO2Chart } from '../components/charts/SpO2Chart';
import { AlertItemComponent } from '../components/alerts/AlertItem';
import {
  mockDashboardStats,
  mockAlerts,
  mockHeartRateTrends,
  mockSpO2Trends,
} from '../data/mockData';
import { getPatientsApi } from '../services/api';
import { BackendPatient } from '../types/patient';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Fetch real patient records from PostgreSQL
  const { data: patientResponse } = useQuery({
    queryKey: ['dashboard-patients'],
    queryFn: () => getPatientsApi({ page: 1, limit: 5 }),
  });

  const realPatients = patientResponse?.data || [];
  const totalPatientCount = patientResponse?.pagination?.total ?? mockDashboardStats.totalPatients;

  const calculateAge = (dobString: string): number => {
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Clinical Telemetry & RPM Command Center"
        subtitle="Real-time multi-parameter IoMT monitoring with edge differential privacy & automated triage"
        badge={
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            PostgreSQL Live Sync
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/monitoring')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Open Live Telemetry Wall</span>
            </button>
            <button
              onClick={() => navigate('/privacy')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover text-healthcare-textSecondary text-xs font-medium border border-healthcare-border transition-colors cursor-pointer"
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
          title="Total Registered Patients"
          value={totalPatientCount.toLocaleString()}
          subtitle="Enrolled in PostgreSQL Registry"
          trend="Live Database Verified"
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
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium cursor-pointer"
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
              className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium cursor-pointer"
            >
              <span>Detailed</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <SpO2Chart data={mockSpO2Trends} height={250} />
        </div>
      </div>

      {/* Patient Monitoring Table Section (Live Backend Data) */}
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
            className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
          >
            <span>View All Patients ({totalPatientCount})</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table of Real Patients */}
        <div className="w-full overflow-hidden rounded-xl border border-healthcare-border bg-healthcare-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-healthcare-textPrimary">
              <thead className="bg-healthcare-surfaceLight border-b border-healthcare-border text-xs uppercase text-healthcare-textSecondary">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Patient &amp; ID</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Risk Level</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Age / Gender</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Condition</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Attending Doctor</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-healthcare-borderSubtle">
                {realPatients.map((patient: BackendPatient) => {
                  const age = calculateAge(patient.dateOfBirth);
                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="hover:bg-healthcare-surfaceHover/80 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-healthcare-textPrimary group-hover:text-teal-400 transition-colors">
                          {patient.name}
                        </div>
                        <div className="text-xs font-mono text-healthcare-textMuted mt-0.5">
                          {patient.patientCode}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge
                          type="risk"
                          value={patient.riskLevel}
                          pulse={patient.riskLevel === 'CRITICAL'}
                        />
                      </td>
                      <td className="px-4 py-4 text-xs text-healthcare-textSecondary">
                        {age}y • {patient.gender}
                      </td>
                      <td className="px-4 py-4 text-xs text-healthcare-textSecondary">
                        <div className="truncate max-w-[200px]" title={patient.condition || ''}>
                          {patient.condition || 'Routine Telemetry'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-xs text-healthcare-textSecondary">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-400" />
                          <span>{patient.assignedDoctor?.name || 'Unassigned'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge type="status" value={patient.status} size="sm" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/patients/${patient.id}`);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-healthcare-surfaceLight hover:bg-teal-950 hover:text-teal-300 text-healthcare-textSecondary border border-healthcare-borderSubtle transition-colors cursor-pointer"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
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
            className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1 cursor-pointer"
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
