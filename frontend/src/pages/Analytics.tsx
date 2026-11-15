import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  Activity,
  Heart,
  Droplet,
  Thermometer,
  Calendar,
  Filter,
  RefreshCw,
  Users,
  ShieldCheck,
  Cpu,
  BarChart3,
  ChevronDown,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import {
  getAnalyticsOverviewApi,
  getPatientVitalsAnalyticsApi,
  getPatientAnalyticsApi,
  getPatientsApi,
} from '../services/api';

export const Analytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const [selectedPatientId, setSelectedPatientId] = useState<string>('ALL');

  // Fetch list of patients for the dropdown filter
  const { data: patientsResponse } = useQuery({
    queryKey: ['patients-list-filter'],
    queryFn: () => getPatientsApi({ limit: 50 }),
  });
  const patients = patientsResponse?.data || [];

  // 1. Fetch System-Wide Analytics Overview
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['analytics-overview', timeRange],
    queryFn: () => getAnalyticsOverviewApi({ timeRange }),
    enabled: selectedPatientId === 'ALL',
  });

  // 2. Fetch Single Patient Analytics (if selected)
  const { data: patientAnalytics, isLoading: isPatientLoading } = useQuery({
    queryKey: ['patient-analytics', selectedPatientId, timeRange],
    queryFn: () => getPatientAnalyticsApi(selectedPatientId, { timeRange }),
    enabled: selectedPatientId !== 'ALL',
  });

  // 3. Fetch Time-Bucketed Aggregated Vitals for Single Patient
  const { data: patientVitalsHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['patient-vitals-analytics', selectedPatientId, timeRange],
    queryFn: () =>
      getPatientVitalsAnalyticsApi(selectedPatientId, {
        timeRange,
        bucket: timeRange === '24h' ? 'hour' : 'day',
      }),
    enabled: selectedPatientId !== 'ALL',
  });

  const isLoading =
    selectedPatientId === 'ALL'
      ? isOverviewLoading
      : isPatientLoading || isHistoryLoading;

  // Format date helper for chart X-axis
  const formatAxisDate = (val: string) => {
    if (!val) return '';
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    if (timeRange === '24h') {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  // Determine which dataset to render in trend charts
  const trendPoints =
    selectedPatientId === 'ALL'
      ? (overviewData?.vitalsTrends || []).map((p) => ({
          ...p,
          formattedTime: formatAxisDate(p.bucketTime),
        }))
      : (patientVitalsHistory?.points || []).map((p) => ({
          ...p,
          formattedTime: formatAxisDate(p.bucketTime),
        }));

  // Determine Stats
  const stats =
    selectedPatientId === 'ALL'
      ? overviewData?.populationStats
      : patientAnalytics?.vitalsSummary;

  const totalReadings =
    selectedPatientId === 'ALL'
      ? overviewData?.summary?.totalReadings ?? 0
      : patientAnalytics?.vitalsSummary?.sampleCount ?? 0;

  const totalAlerts =
    selectedPatientId === 'ALL'
      ? overviewData?.summary?.totalAlerts ?? 0
      : patientAnalytics?.alertsSummary?.total ?? 0;

  const criticalAlerts =
    selectedPatientId === 'ALL'
      ? overviewData?.summary?.criticalAlerts ?? 0
      : patientAnalytics?.alertsSummary?.critical ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Health Analytics & Physiological Trends"
        subtitle="Server-side aggregated vitals telemetry, longitudinal anomaly distribution, and multi-patient compliance"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' },
        ]}
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-950/70 text-teal-300 border border-teal-800/60">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            SQL Server Aggregation
          </span>
        }
      />

      {/* Filter Header: Time Range & Patient Selector */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Patient Selection Dropdown */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-healthcare-textMuted shrink-0" />
          <span className="text-xs text-healthcare-textMuted font-medium whitespace-nowrap">Cohort Scope:</span>
          <div className="relative w-full sm:w-64">
            <select
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
              className="w-full appearance-none bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg px-3 py-1.5 text-xs text-healthcare-textPrimary font-semibold focus:outline-none focus:border-teal-500 cursor-pointer pr-8"
            >
              <option value="ALL">All Patients (Population View)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.patientCode})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 absolute right-2.5 top-2 text-healthcare-textMuted pointer-events-none" />
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <Calendar className="w-4 h-4 text-healthcare-textMuted" />
          <div className="flex items-center gap-1 bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-1">
            {(['24h', '7d', '30d'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs rounded font-semibold transition-colors ${
                  timeRange === r
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-healthcare-textMuted hover:text-healthcare-textPrimary'
                }`}
              >
                {r === '24h' ? 'Last 24 Hours' : r === '7d' ? 'Last 7 Days' : 'Last 30 Days'}
              </button>
            ))}
          </div>

          <button
            onClick={() => refetchOverview()}
            className="p-1.5 rounded-lg border border-healthcare-borderSubtle hover:bg-healthcare-surfaceLight text-healthcare-textMuted hover:text-healthcare-textPrimary transition-colors"
            title="Refresh aggregations"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* High-Level Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Aggregated Readings"
          value={totalReadings.toLocaleString()}
          subtitle={`Aggregated from database for ${timeRange.toUpperCase()}`}
          trend={`${trendPoints.length} time buckets sampled`}
          trendType="neutral"
          accentColor="teal"
          icon={<Activity className="w-5 h-5 text-teal-400" />}
        />

        <StatCard
          title="Average Heart Rate"
          value={stats?.avgHeartRate ? `${stats.avgHeartRate} bpm` : '75 bpm'}
          subtitle={
            stats?.minHeartRate && stats?.maxHeartRate
              ? `Range: ${stats.minHeartRate} – ${stats.maxHeartRate} bpm`
              : 'Normal resting range: 60-100'
          }
          trend="Population baseline"
          trendType="positive"
          accentColor="emerald"
          icon={<Heart className="w-5 h-5 text-rose-400" />}
        />

        <StatCard
          title="Average SpO2 Oxygenation"
          value={stats?.avgSpo2 ? `${stats.avgSpo2}%` : '98%'}
          subtitle={
            stats?.minSpo2 && stats?.maxSpo2
              ? `Range: ${stats.minSpo2}% – ${stats.maxSpo2}%`
              : 'Target saturation >= 95%'
          }
          trend={stats?.minSpo2 && stats.minSpo2 < 94 ? 'Hypoxic events noted' : 'Optimal oxygenation'}
          trendType={stats?.minSpo2 && stats.minSpo2 < 94 ? 'negative' : 'positive'}
          accentColor="cyan"
          icon={<Droplet className="w-5 h-5 text-cyan-400" />}
        />

        <StatCard
          title="Average Blood Pressure"
          value={
            stats?.avgSystolic && stats?.avgDiastolic
              ? `${Math.round(stats.avgSystolic)}/${Math.round(stats.avgDiastolic)}`
              : '120/80'
          }
          subtitle="Systolic / Diastolic mmHg"
          trend={`${totalAlerts} alerts (${criticalAlerts} critical)`}
          trendType={criticalAlerts > 0 ? 'negative' : 'neutral'}
          accentColor="amber"
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Main Historical Chart Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 1. Heart Rate Historical Trend */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-semibold text-healthcare-textPrimary">
                Heart Rate Trend ({timeRange.toUpperCase()} Aggregation)
              </h3>
            </div>
            <span className="text-xs text-healthcare-textMuted font-mono">bpm</span>
          </div>

          <div className="h-64">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
                Aggregating database readings...
              </div>
            ) : trendPoints.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
                No telemetry recorded for this interval.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162E2B" vertical={false} />
                  <XAxis dataKey="formattedTime" stroke="#52796F" tick={{ fontSize: 11 }} />
                  <YAxis domain={['dataMin - 10', 'dataMax + 10']} stroke="#52796F" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A1513',
                      borderColor: '#1D3D37',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={100} stroke="#F43F5E" strokeDasharray="3 3" label={{ value: 'Tachycardia (100)', fill: '#F43F5E', fontSize: 10 }} />
                  <ReferenceLine y={60} stroke="#38BDF8" strokeDasharray="3 3" label={{ value: 'Bradycardia (60)', fill: '#38BDF8', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="avgHeartRate"
                    name="Avg Heart Rate"
                    stroke="#10B981"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#10B981' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Blood Pressure Systolic & Diastolic Trend */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-healthcare-textPrimary">
                Blood Pressure Dual Trend (Systolic / Diastolic)
              </h3>
            </div>
            <span className="text-xs text-healthcare-textMuted font-mono">mmHg</span>
          </div>

          <div className="h-64">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
                Aggregating database readings...
              </div>
            ) : trendPoints.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
                No telemetry recorded for this interval.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162E2B" vertical={false} />
                  <XAxis dataKey="formattedTime" stroke="#52796F" tick={{ fontSize: 11 }} />
                  <YAxis domain={[50, 160]} stroke="#52796F" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A1513',
                      borderColor: '#1D3D37',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={130} stroke="#F59E0B" strokeDasharray="3 3" label={{ value: 'Stage 1 Sys (130)', fill: '#F59E0B', fontSize: 10 }} />
                  <ReferenceLine y={80} stroke="#0EA5E9" strokeDasharray="3 3" label={{ value: 'Normal Dia (80)', fill: '#0EA5E9', fontSize: 10 }} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Line
                    type="monotone"
                    dataKey="avgSystolic"
                    name="Systolic BP"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#F59E0B' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgDiastolic"
                    name="Diastolic BP"
                    stroke="#0EA5E9"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#0EA5E9' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 3. SpO2 Oxygenation Trend */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2">
              <Droplet className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-healthcare-textPrimary">
                Blood Oxygen Saturation (SpO2 Trend)
              </h3>
            </div>
            <span className="text-xs text-healthcare-textMuted font-mono">%</span>
          </div>

          <div className="h-64">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
                Aggregating database readings...
              </div>
            ) : trendPoints.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
                No telemetry recorded for this interval.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162E2B" vertical={false} />
                  <XAxis dataKey="formattedTime" stroke="#52796F" tick={{ fontSize: 11 }} />
                  <YAxis domain={[90, 100]} stroke="#52796F" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A1513',
                      borderColor: '#1D3D37',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={94} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Hypoxia Limit (94%)', fill: '#EF4444', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="avgSpo2"
                    name="SpO2 Saturation"
                    stroke="#06B6D4"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#06B6D4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 4. Body Temperature Trend */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-healthcare-textPrimary">
                Core Body Temperature Trend
              </h3>
            </div>
            <span className="text-xs text-healthcare-textMuted font-mono">°C</span>
          </div>

          <div className="h-64">
            {isLoading ? (
              <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
                Aggregating database readings...
              </div>
            ) : trendPoints.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
                No telemetry recorded for this interval.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162E2B" vertical={false} />
                  <XAxis dataKey="formattedTime" stroke="#52796F" tick={{ fontSize: 11 }} />
                  <YAxis domain={[35.5, 39.0]} stroke="#52796F" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0A1513',
                      borderColor: '#1D3D37',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine y={37.5} stroke="#F97316" strokeDasharray="3 3" label={{ value: 'Fever (37.5°C)', fill: '#F97316', fontSize: 10 }} />
                  <Line
                    type="monotone"
                    dataKey="avgTemperature"
                    name="Body Temp (°C)"
                    stroke="#14B8A6"
                    strokeWidth={2}
                    dot={{ r: 2.5, fill: '#14B8A6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Alert Frequency Timeline (Daily Distribution) */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-semibold text-healthcare-textPrimary">
              Clinical Alert Frequency by Severity ({timeRange.toUpperCase()})
            </h3>
          </div>
          <span className="text-xs text-healthcare-textMuted">Total: {totalAlerts}</span>
        </div>

        <div className="h-60">
          {isLoading ? (
            <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
              Computing alert frequencies...
            </div>
          ) : (overviewData?.alertTrends || []).length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-healthcare-textMuted">
              No clinical alerts recorded in this time window.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overviewData?.alertTrends || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#162E2B" vertical={false} />
                <XAxis dataKey="date" stroke="#52796F" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} stroke="#52796F" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0A1513',
                    borderColor: '#1D3D37',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="critical" name="Critical Alerts" fill="#EF4444" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="warning" name="Warning Alerts" fill="#F59E0B" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="info" name="Info" fill="#06B6D4" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Patient Clinical Monitoring Summaries Table */}
      {selectedPatientId === 'ALL' && (overviewData?.patientSummaries || []).length > 0 && (
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-semibold text-healthcare-textPrimary">
                Patient Monitoring Summaries & Compliance Overview
              </h3>
            </div>
            <span className="text-xs text-healthcare-textMuted">
              {overviewData?.patientSummaries.length} Active Patients
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-healthcare-surfaceLight text-healthcare-textMuted border-b border-healthcare-borderSubtle font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Assigned Doctor</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">Risk Level</th>
                  <th className="py-2.5 px-3 text-right">Readings Ingested</th>
                  <th className="py-2.5 px-3 text-right">Active Alerts</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-healthcare-borderSubtle">
                {overviewData?.patientSummaries.map((p) => (
                  <tr key={p.id} className="hover:bg-healthcare-surfaceLight/40 transition-colors">
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-healthcare-textPrimary">{p.name}</span>
                      <span className="text-healthcare-textMuted block font-mono text-[11px]">{p.patientCode}</span>
                    </td>
                    <td className="py-2.5 px-3 text-healthcare-textSecondary">{p.assignedDoctor}</td>
                    <td className="py-2.5 px-3 text-healthcare-textMuted">{p.room || 'General Ward'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          p.riskLevel === 'CRITICAL'
                            ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                            : p.riskLevel === 'HIGH'
                            ? 'bg-amber-950/80 border-amber-800 text-amber-300'
                            : p.riskLevel === 'MODERATE'
                            ? 'bg-sky-950/80 border-sky-800 text-sky-300'
                            : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                        }`}
                      >
                        {p.riskLevel}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-healthcare-textPrimary">
                      {p.totalReadings.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {p.activeAlerts > 0 ? (
                        <span className="text-rose-400 font-bold">{p.activeAlerts}</span>
                      ) : (
                        <span className="text-emerald-400">0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setSelectedPatientId(p.id)}
                        className="px-2.5 py-1 rounded bg-teal-950/80 border border-teal-800/60 text-teal-300 hover:bg-teal-900 transition-colors"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clinical Disclaimer Box */}
      <div className="p-3.5 bg-healthcare-surfaceLight/50 border border-healthcare-borderSubtle rounded-xl flex items-start gap-3 text-xs text-healthcare-textMuted">
        <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-healthcare-textSecondary">Clinical Telemetry Aggregation Notice:</strong> All historical biometric waveforms and statistical averages are computed through PostgreSQL server-side aggregation (<code className="text-teal-300 font-mono">date_trunc</code>) from IoMT sensor readings. Statistical trends and anomaly alerts are decision-support aids for clinical personnel and must not be used as autonomous diagnostic or treatment prescribing rules.
        </p>
      </div>
    </div>
  );
};
