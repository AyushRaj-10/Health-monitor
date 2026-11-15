import React from 'react';
import {
  TrendingUp,
  Cpu,
  Database,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';

const bandwidthData = [
  { day: 'Mon', rawStreamingMb: 480, edgeFilteredMb: 104, savedPct: 78.3 },
  { day: 'Tue', rawStreamingMb: 512, edgeFilteredMb: 112, savedPct: 78.1 },
  { day: 'Wed', rawStreamingMb: 490, edgeFilteredMb: 102, savedPct: 79.1 },
  { day: 'Thu', rawStreamingMb: 530, edgeFilteredMb: 118, savedPct: 77.7 },
  { day: 'Fri', rawStreamingMb: 545, edgeFilteredMb: 115, savedPct: 78.9 },
  { day: 'Sat', rawStreamingMb: 460, edgeFilteredMb: 98, savedPct: 78.6 },
  { day: 'Sun', rawStreamingMb: 475, edgeFilteredMb: 101, savedPct: 78.7 },
];

const anomalyDistribution = [
  { type: 'Tachycardia (HR > 100)', count: 38 },
  { type: 'Hypoxia (SpO2 < 94%)', count: 24 },
  { type: 'Hypertension (BP > 140)', count: 19 },
  { type: 'Tachypnea (Resp > 22)', count: 12 },
  { type: 'Bradycardia (HR < 50)', count: 5 },
];

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="IoMT Edge Telemetry & Population Analytics"
        subtitle="Bandwidth efficiency, edge anomaly detection accuracy, and clinical population vital trends"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics' },
        ]}
      />

      {/* High-level Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Edge Bandwidth Savings"
          value="78.4%"
          subtitle="Reduces cloud data transfer costs"
          trend="-78.4% data volume egress"
          trendType="positive"
          accentColor="teal"
          icon={<Database className="w-5 h-5 text-teal-400" />}
        />

        <StatCard
          title="Avg Edge Anomaly Latency"
          value="14.2 ms"
          subtitle="Compared to 380ms cloud roundtrip"
          trend="26x faster local triage"
          trendType="positive"
          accentColor="emerald"
          icon={<Cpu className="w-5 h-5 text-emerald-400" />}
        />

        <StatCard
          title="Daily Filtered Records"
          value="1.42 M"
          subtitle="Pre-processed on edge nodes"
          trend="Zero sensitive plaintext leakage"
          trendType="neutral"
          accentColor="cyan"
          icon={<Activity className="w-5 h-5 text-cyan-400" />}
        />

        <StatCard
          title="Clinical Anomaly Precision"
          value="98.7%"
          subtitle="Dual-threshold edge verification"
          trend="+1.2% model confidence"
          trendType="positive"
          accentColor="amber"
          icon={<TrendingUp className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Bandwidth Savings Bar Chart */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-3 border-b border-healthcare-borderSubtle gap-2">
          <div>
            <h3 className="text-sm font-semibold text-healthcare-textPrimary">
              Edge Computing Bandwidth Reduction (Daily MB)
            </h3>
            <p className="text-xs text-healthcare-textSecondary mt-0.5">
              Comparison between traditional continuous raw IoMT streaming vs edge-filtered differential privacy payload
            </p>
          </div>
          <span className="px-2.5 py-1 rounded bg-teal-950/70 text-teal-300 border border-teal-800/40 text-xs font-mono">
            Avg Reduction: ~78.4%
          </span>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bandwidthData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#142825" vertical={false} />
              <XAxis dataKey="day" stroke="#526E69" fontSize={11} tickLine={false} />
              <YAxis stroke="#526E69" fontSize={11} tickLine={false} tickFormatter={(val) => `${val} MB`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0B1514',
                  borderColor: '#193833',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#E6F4F1',
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: '#8BA39E' }} />
              <Bar name="Raw Uncompressed Ingestion (MB)" dataKey="rawStreamingMb" fill="#526E69" radius={[4, 4, 0, 0]} />
              <Bar name="Edge-Filtered DP Payload (MB)" dataKey="edgeFilteredMb" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column: Latency Comparison & Anomaly Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Comparison */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-healthcare-textPrimary">
            Edge Computing vs Cloud Triage Latency Profile
          </h3>
          <p className="text-xs text-healthcare-textSecondary">
            Local edge processing allows critical tachyarrhythmia alerts to trigger immediately on the ward floor.
          </p>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-teal-300 font-medium">IoMT Edge Node Triage (Local RPi4 Gateway)</span>
                <span className="font-mono text-emerald-400">14 ms</span>
              </div>
              <div className="w-full bg-healthcare-surfaceLight rounded-full h-2.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '12%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-healthcare-textSecondary">Standard Cloud Ingestion &amp; DB Roundtrip</span>
                <span className="font-mono text-rose-400">385 ms</span>
              </div>
              <div className="w-full bg-healthcare-surfaceLight rounded-full h-2.5 overflow-hidden">
                <div className="bg-rose-500/80 h-full rounded-full" style={{ width: '85%' }} />
              </div>
            </div>

            <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-lg text-xs text-teal-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Edge thresholding prevents life-threatening delay during transient hospital network congestion.
              </span>
            </div>
          </div>
        </div>

        {/* Anomaly Distribution */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-healthcare-textPrimary">
            Detected Physiological Anomalies (Last 7 Days)
          </h3>
          <p className="text-xs text-healthcare-textSecondary">
            Breakdown of autonomous clinical alerts flagged across all monitored patient streams.
          </p>

          <div className="space-y-2.5 pt-2">
            {anomalyDistribution.map((item) => (
              <div key={item.type} className="flex items-center justify-between text-xs">
                <span className="text-healthcare-textSecondary">{item.type}</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-healthcare-surfaceLight rounded-full h-2 overflow-hidden hidden sm:block">
                    <div
                      className="bg-teal-500 h-full rounded-full"
                      style={{ width: `${(item.count / 38) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono font-semibold text-healthcare-textPrimary w-8 text-right">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
