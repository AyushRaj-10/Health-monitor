import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Heart,
  Wifi,
  WifiOff,
  RefreshCw,
  Gauge,
  Thermometer,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { getPatientsApi } from '../services/api';
import { BackendPatient } from '../types/patient';
import { VitalReading } from '../types/vitals';
import { useSocket } from '../context/SocketContext';

export const LiveMonitoring: React.FC = () => {
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();
  const [filterRisk, setFilterRisk] = useState<'ALL' | 'CRITICAL' | 'HIGH'>('ALL');
  const [liveVitalsMap, setLiveVitalsMap] = useState<Record<string, VitalReading>>({});
  const [lastEventTimestamp, setLastEventTimestamp] = useState<string | null>(null);

  // Fetch real patients from PostgreSQL
  const { data: patientsData, isLoading, refetch } = useQuery({
    queryKey: ['live-patients'],
    queryFn: () => getPatientsApi({ limit: 50 }),
  });

  const patients: BackendPatient[] = patientsData?.data || [];

  // Listen to real-time vitals broadcast over staff:overview channel
  useEffect(() => {
    if (!socket) return;

    const handleVitalsUpdate = (payload: any) => {
      if (payload.patientId && payload.reading) {
        setLiveVitalsMap((prev) => ({
          ...prev,
          [payload.patientId]: payload.reading,
        }));
        setLastEventTimestamp(new Date().toLocaleTimeString());
      }
    };

    socket.on('vitals:update', handleVitalsUpdate);

    return () => {
      socket.off('vitals:update', handleVitalsUpdate);
    };
  }, [socket, isConnected]);

  const displayedPatients = patients.filter((p) => {
    if (filterRisk === 'ALL') return true;
    return p.riskLevel === filterRisk;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Multi-Patient Telemetry Wall"
        subtitle="Real-time synchronized IoMT sensor streams pushed directly over WebSocket without polling"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Live Monitoring' },
        ]}
        badge={
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="font-mono">Socket.IO Live Wall</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <WifiOff className="w-3.5 h-3.5" />
                <span>Socket Reconnecting...</span>
              </span>
            )}
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              {displayedPatients.length} Active Channels
            </span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-healthcare-surfaceLight hover:bg-slate-800 text-healthcare-textSecondary border border-healthcare-border transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Patients</span>
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
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
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
          <span className="flex items-center gap-1.5 font-mono text-emerald-400">
            <Wifi className="w-3.5 h-3.5" />
            <span>WebSocket Push Active</span>
          </span>
          {lastEventTimestamp && (
            <span className="text-[11px] font-mono text-slate-400">
              Last Packet: {lastEventTimestamp}
            </span>
          )}
        </div>
      </div>

      {/* Telemetry Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayedPatients.map((patient) => {
          const liveVital = liveVitalsMap[patient.id];
          const hr = liveVital?.heartRate ?? 74;
          const spo2 = liveVital?.spo2 ?? 98;
          const sys = liveVital?.bloodPressureSys ?? 120;
          const dia = liveVital?.bloodPressureDia ?? 80;
          const temp = liveVital?.temperature ?? 36.8;

          const isTachy = hr > 115 || hr < 50;
          const isHypoxic = spo2 < 92;
          const isCritical = isTachy || isHypoxic;

          return (
            <div
              key={patient.id}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className={`bg-healthcare-surface border rounded-xl p-4 transition-all cursor-pointer hover:border-teal-500/50 hover:shadow-xl relative overflow-hidden group ${
                isCritical
                  ? 'border-rose-800/80 bg-rose-950/15'
                  : 'border-healthcare-border'
              }`}
            >
              {/* Patient Banner */}
              <div className="flex items-start justify-between gap-2 pb-3 border-b border-healthcare-borderSubtle">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-healthcare-textPrimary group-hover:text-teal-400 transition-colors">
                      {patient.name}
                    </span>
                    <StatusBadge type="risk" value={patient.riskLevel} size="sm" pulse={patient.riskLevel === 'CRITICAL'} />
                  </div>
                  <div className="text-xs font-mono text-healthcare-textMuted mt-0.5">
                    {patient.patientCode} • {patient.roomOrLocation || 'Tele-Ward A'}
                  </div>
                </div>

                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                  {liveVital?.scenario || 'STREAMING'}
                </span>
              </div>

              {/* Live Biometrics Grid */}
              <div className="grid grid-cols-2 gap-3 mt-3">
                {/* Heart Rate */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      <span>Heart Rate</span>
                    </span>
                    <span className="text-[10px] text-slate-500">BPM</span>
                  </div>
                  <div
                    className={`text-xl font-bold font-mono mt-1 ${
                      hr > 120 || hr < 55 ? 'text-rose-400' : hr > 100 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {hr}
                  </div>
                </div>

                {/* SpO2 */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Gauge className="w-3.5 h-3.5 text-sky-400" />
                      <span>SpO2</span>
                    </span>
                    <span className="text-[10px] text-slate-500">%</span>
                  </div>
                  <div
                    className={`text-xl font-bold font-mono mt-1 ${
                      spo2 < 90 ? 'text-rose-400' : spo2 < 95 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {spo2}%
                  </div>
                </div>

                {/* Blood Pressure */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      <span>Blood Pressure</span>
                    </span>
                    <span className="text-[10px] text-slate-500">mmHg</span>
                  </div>
                  <div className="text-base font-bold font-mono mt-1 text-slate-200">
                    {sys}/{dia}
                  </div>
                </div>

                {/* Temperature */}
                <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                      <span>Temp</span>
                    </span>
                    <span className="text-[10px] text-slate-500">°C</span>
                  </div>
                  <div className="text-base font-bold font-mono mt-1 text-slate-200">
                    {temp}°C
                  </div>
                </div>
              </div>

              {/* Footer strip */}
              <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span className="flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Push Stream</span>
                </span>
                <span className="text-teal-400 group-hover:underline text-[11px]">
                  Open Patient Chart &rarr;
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
