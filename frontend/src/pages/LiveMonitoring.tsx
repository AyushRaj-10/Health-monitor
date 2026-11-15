import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Heart,
  Wifi,
  Battery,
  ShieldCheck,
  RefreshCw,
  Cpu,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { mockPatients } from '../data/mockData';

export const LiveMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const displayedPatients = mockPatients.filter((p) => {
    if (filterRisk === 'ALL') return true;
    return p.riskLevel === filterRisk;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Multi-Patient Telemetry Wall"
        subtitle="Real-time synchronized IoMT sensor streams with edge-driven anomaly thresholding"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Live Monitoring' },
        ]}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono">42 Channels Ingesting</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                autoRefresh
                  ? 'bg-teal-950/70 border-teal-700/60 text-teal-300'
                  : 'bg-healthcare-surfaceLight border-healthcare-borderSubtle text-healthcare-textMuted'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
              <span>{autoRefresh ? 'Streaming Active' : 'Stream Paused'}</span>
            </button>
          </div>
        }
      />

      {/* Control Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-healthcare-surface border border-healthcare-border rounded-xl p-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-healthcare-textMuted uppercase tracking-wider">
            Filter Streams:
          </span>
          {(['ALL', 'CRITICAL', 'HIGH'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                filterRisk === r
                  ? 'bg-teal-950 text-teal-300 border border-teal-700/60 font-semibold'
                  : 'bg-healthcare-surfaceLight text-healthcare-textSecondary border border-healthcare-borderSubtle hover:text-white'
              }`}
            >
              {r === 'ALL' ? 'All Live Channels' : `${r} Priority`}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 text-xs text-healthcare-textMuted">
          <span className="flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            <span>Edge Sampling: 250 Hz</span>
          </span>
          <span className="flex items-center gap-1.5 font-mono text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>Mesh Latency: 14 ms</span>
          </span>
        </div>
      </div>

      {/* Telemetry Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedPatients.map((patient) => {
          const isTachy = patient.vitals.heartRate > 100;
          const isHypoxic = patient.vitals.spo2 < 94;

          return (
            <div
              key={patient.id}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="bg-healthcare-surface border border-healthcare-border hover:border-teal-600/50 rounded-xl overflow-hidden cursor-pointer transition-all shadow-lg flex flex-col justify-between"
            >
              {/* Card Header */}
              <div className="p-4 border-b border-healthcare-borderSubtle flex items-start justify-between bg-healthcare-surfaceLight/40">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-healthcare-textPrimary text-sm">
                      {patient.fullName}
                    </span>
                    <span className="font-mono text-xs text-healthcare-textMuted">
                      {patient.medicalRecordNumber}
                    </span>
                  </div>
                  <div className="text-xs text-healthcare-textSecondary truncate max-w-[210px] mt-0.5">
                    {patient.condition}
                  </div>
                </div>

                <StatusBadge
                  type="risk"
                  value={patient.riskLevel}
                  size="sm"
                  pulse={patient.riskLevel === 'CRITICAL'}
                />
              </div>

              {/* Vitals Telemetry Main Block */}
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Heart Rate Display */}
                  <div className="bg-healthcare-surfaceLight rounded-lg p-3 border border-healthcare-borderSubtle">
                    <div className="flex items-center justify-between text-[11px] text-healthcare-textSecondary mb-1">
                      <span className="flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-rose-400" />
                        HR (BPM)
                      </span>
                      <span className="font-mono text-[10px] text-teal-400">ε-DP</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-2xl font-bold font-mono ${
                          isTachy ? 'text-rose-400 animate-pulse' : 'text-healthcare-textPrimary'
                        }`}
                      >
                        {patient.vitals.heartRate}
                      </span>
                      <span className="text-xs text-healthcare-textMuted">bpm</span>
                    </div>
                  </div>

                  {/* SpO2 Display */}
                  <div className="bg-healthcare-surfaceLight rounded-lg p-3 border border-healthcare-borderSubtle">
                    <div className="flex items-center justify-between text-[11px] text-healthcare-textSecondary mb-1">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3.5 h-3.5 text-emerald-400" />
                        SpO2
                      </span>
                      <span className="text-[10px] text-healthcare-textMuted">Target 95%</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className={`text-2xl font-bold font-mono ${
                          isHypoxic ? 'text-amber-400 font-semibold' : 'text-emerald-400'
                        }`}
                      >
                        {patient.vitals.spo2}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulated Waveform Line (Canvas-like SVG) */}
                <div className="h-14 bg-black/40 rounded-lg border border-healthcare-borderSubtle p-2 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute top-1 left-2 text-[9px] font-mono text-teal-400/80">
                    Lead II Continuous ECG (Simulated)
                  </div>
                  <svg className="w-full h-8 stroke-teal-400 fill-none" viewBox="0 0 300 40" preserveAspectRatio="none">
                    <path
                      d="M 0 20 L 30 20 L 35 15 L 40 25 L 45 20 L 70 20 L 75 8 L 80 32 L 85 18 L 90 20 L 120 20 L 125 15 L 130 25 L 135 20 L 160 20 L 165 6 L 170 34 L 175 18 L 180 20 L 210 20 L 215 15 L 220 25 L 225 20 L 250 20 L 255 7 L 260 33 L 265 19 L 270 20 L 300 20"
                      strokeWidth="1.5"
                    />
                  </svg>
                </div>
              </div>

              {/* Card Footer: Hardware & Edge Gateway */}
              <div className="p-3 bg-healthcare-surfaceLight/30 border-t border-healthcare-borderSubtle flex items-center justify-between text-[11px] text-healthcare-textMuted">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-teal-300">{patient.deviceName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Battery className="w-3 h-3 text-teal-400" />
                    {patient.deviceBattery}%
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-teal-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="font-mono text-[10px]">{patient.edgeNodeId.split('-').slice(-2).join('-')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
