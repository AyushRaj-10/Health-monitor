import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  Cloud,
  TrendingDown,
  Zap,
  Wifi,
  WifiOff,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Gauge,
  Thermometer,
  Layers,
  ArrowDownUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PageHeader } from '../components/layout/PageHeader';
import {
  getEdgeMetricsApi,
  setTransmissionPolicyApi,
  toggleNetworkConnectivityApi,
  getThresholdProfilesApi,
  syncOfflineBuffersApi,
} from '../services/api';

export const EdgeComparison: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = useState<string>('STANDARD_ADULT');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Poll live edge simulator metrics every 2.5 seconds
  const { data: metricsResponse, isLoading: isMetricsLoading, refetch } = useQuery({
    queryKey: ['edge-metrics'],
    queryFn: () => getEdgeMetricsApi(),
    refetchInterval: 2500,
  });

  // Fetch available threshold profiles
  const { data: profilesData } = useQuery({
    queryKey: ['threshold-profiles'],
    queryFn: () => getThresholdProfilesApi(),
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Policy mutation
  const policyMutation = useMutation({
    mutationFn: (policy: string) => setTransmissionPolicyApi(policy),
    onSuccess: (data) => {
      showToast(data.message || 'Policy updated');
      queryClient.invalidateQueries({ queryKey: ['edge-metrics'] });
    },
  });

  // Network toggle mutation
  const networkMutation = useMutation({
    mutationFn: (isOnline: boolean) => toggleNetworkConnectivityApi(isOnline),
    onSuccess: (data) => {
      showToast(data.message || 'Network status updated');
      queryClient.invalidateQueries({ queryKey: ['edge-metrics'] });
    },
  });

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: () => syncOfflineBuffersApi(),
    onSuccess: (data) => {
      showToast(data.message || 'Synchronized offline telemetry');
      queryClient.invalidateQueries({ queryKey: ['edge-metrics'] });
    },
  });

  const metrics = metricsResponse?.data;
  const disclaimer =
    metricsResponse?.disclaimer ||
    'Notice: Thresholds are for academic demonstration and system evaluation only. They must not be represented as clinically validated diagnostic rules.';

  const isNetworkOnline = metrics?.offlineBufferedReadings === 0 && !metricsResponse?.data?.comparativeModels?.edge?.offlineResilience?.includes('OFFLINE');

  // Comparative bar chart data
  const comparisonBarData = metrics
    ? [
        {
          model: 'Centralized Cloud',
          generated: metrics.totalReadingsGenerated,
          transmitted: metrics.totalReadingsGenerated, // 100% transmitted in centralized
          summarized: 0,
        },
        {
          model: 'IoMT Edge Computing',
          generated: metrics.totalReadingsGenerated,
          transmitted: metrics.readingsTransmitted,
          summarized: metrics.readingsSummarized,
        },
      ]
    : [];

  // Latency comparison data
  const latencyBarData = metrics
    ? [
        {
          tier: 'Edge Local Anomaly Detection',
          latencyMs: metrics.averageEdgeProcessingLatencyMs,
          fill: '#10b981',
        },
        {
          tier: 'Centralized Cloud Ingestion RTT',
          latencyMs: metrics.simulatedCentralizedDetectionLatencyMs,
          fill: '#f43f5e',
        },
      ]
    : [];

  const profiles = profilesData?.profiles || {};
  const currentProfile = profiles[selectedProfile];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Edge Computing vs Centralized Architecture"
        subtitle="Empirical evaluation of local threshold anomaly detection, transmission bandwidth reduction, and offline resilience"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Edge Architecture' },
        ]}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu className="w-3.5 h-3.5" />
            <span>Stage 4 Edge Engine</span>
          </span>
        }
        actions={
          <button
            onClick={() => refetch()}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-medium text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMetricsLoading ? 'animate-spin' : ''}`} />
            <span>Live Sync</span>
          </button>
        }
      />

      {/* Academic Disclaimer Notice */}
      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start space-x-3 text-amber-300 text-xs leading-relaxed">
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
        <div>
          <span className="font-semibold text-amber-200">Demonstration Model Notice: </span>
          <span>{disclaimer}</span>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top 4 Live Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Transmission Reduction */}
        <div className="p-4 rounded-xl bg-[#071311] border border-emerald-500/25 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Transmission Reduction</span>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-emerald-400 mt-2">
            {metrics?.transmissionReductionPercent || 0}%
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Egress Bandwidth Saved</span>
            <span className="text-[11px] font-mono text-emerald-300">
              {metrics?.readingsSummarized || 0} summarized
            </span>
          </div>
        </div>

        {/* Transmitted vs Generated */}
        <div className="p-4 rounded-xl bg-[#071311] border border-emerald-500/25 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Transmitted / Total</span>
            <ArrowDownUp className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-white mt-2">
            {metrics?.readingsTransmitted || 0}
            <span className="text-base font-normal text-slate-400"> / {metrics?.totalReadingsGenerated || 0}</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Edge Filtered Stream</span>
            <span className="text-[11px] font-mono text-sky-300">
              {metrics ? Math.round((metrics.readingsTransmitted / Math.max(1, metrics.totalReadingsGenerated)) * 100) : 0}% sent
            </span>
          </div>
        </div>

        {/* Local Anomaly Detection Latency */}
        <div className="p-4 rounded-xl bg-[#071311] border border-emerald-500/25 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Local Detection Latency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold font-mono text-amber-400 mt-2">
            {metrics?.averageEdgeProcessingLatencyMs || 0.05} <span className="text-sm font-normal">ms</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Cloud RTT: ~{metrics?.simulatedCentralizedDetectionLatencyMs || 70}ms</span>
            <span className="text-[11px] font-mono text-amber-300 font-semibold">
              ~{metrics?.detectionSpeedupFactor || 1200}x faster
            </span>
          </div>
        </div>

        {/* Offline Buffer & Resilience */}
        <div className="p-4 rounded-xl bg-[#071311] border border-emerald-500/25 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Offline Buffer Depth</span>
            {metrics && metrics.offlineBufferedReadings > 0 ? (
              <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
            ) : (
              <Wifi className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <div
            className={`text-3xl font-bold font-mono mt-2 ${
              metrics && metrics.offlineBufferedReadings > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {metrics?.offlineBufferedReadings || 0} <span className="text-sm font-normal">samples</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Zero Data Loss Policy</span>
            <span className="text-[11px] font-mono text-slate-400">
              FIFO Replay Active
            </span>
          </div>
        </div>
      </div>

      {/* Architecture Model Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Centralized Model Card */}
        <div className="p-5 rounded-xl bg-slate-950/60 border border-slate-800 shadow-xl relative">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Centralized Cloud Model</h3>
                <span className="text-[11px] text-slate-400">Baseline Telemetry Streaming</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
              100% Egress
            </span>
          </div>

          <div className="mt-4 space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-1">
              <span className="text-slate-400 block font-medium">Data Transmission:</span>
              <p className="text-slate-200">
                Transmits <strong>every raw biometric sample</strong> directly to central cloud ({metrics?.totalReadingsGenerated || 0} packets).
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Detection Latency:</span>
                <span className="text-base font-bold font-mono text-rose-400">
                  ~{metrics?.simulatedCentralizedDetectionLatencyMs || 72} ms
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Network transit + cloud DB</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <span className="text-slate-400 text-[11px] block">Bandwidth Usage:</span>
                <span className="text-base font-bold font-mono text-white">100.0%</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">High cloud network bill</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
              <span className="text-rose-400 font-semibold block mb-0.5">Network Failure Vulnerability:</span>
              Telemetry is dropped or stalled during hospital WiFi drops or rural outages without autonomous local intervention.
            </div>
          </div>
        </div>

        {/* Edge Computing Model Card */}
        <div className="p-5 rounded-xl bg-[#071311] border border-emerald-500/40 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">IoMT Edge Computing Model</h3>
                <span className="text-[11px] text-emerald-400">Local Processing &amp; Anomaly Engine</span>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">
              {metrics?.transmissionReductionPercent || 0}% Savings
            </span>
          </div>

          <div className="mt-4 space-y-3 text-xs text-slate-300">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-emerald-500/20 space-y-1">
              <span className="text-emerald-400 block font-medium">Smart Transmission Policy:</span>
              <p className="text-slate-200">
                Summarizes normal readings locally into sliding windows ({metrics?.readingsSummarized || 0} packets saved);
                instantly transmits abnormal/critical events with zero delay.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-500/20">
                <span className="text-slate-400 text-[11px] block">Local Bedside Latency:</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {metrics?.averageEdgeProcessingLatencyMs || 0.05} ms
                </span>
                <span className="text-[10px] text-emerald-300 block mt-0.5">Instant bedside alerting</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-500/20">
                <span className="text-slate-400 text-[11px] block">Egress Bandwidth:</span>
                <span className="text-base font-bold font-mono text-emerald-400">
                  {metrics ? (100 - metrics.transmissionReductionPercent).toFixed(1) : 30}%
                </span>
                <span className="text-[10px] text-emerald-300 block mt-0.5">Reduced cloud costs</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/80 border border-emerald-500/20 text-[11px] text-slate-300">
              <span className="text-emerald-400 font-semibold block mb-0.5">Offline Resilience &amp; Replay:</span>
              Autonomous in-memory FIFO queue buffers readings during disconnections and synchronizes them to PostgreSQL upon reconnection.
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Policy Orchestration */}
      <div className="bg-[#071311] border border-emerald-500/20 rounded-xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-500/15">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Transmission Policy Orchestration</h3>
          </div>
          <span className="text-xs text-slate-400">
            Dynamically adjust edge transmission policy to benchmark bandwidth tradeoffs
          </span>
        </div>

        {/* Policy Selector Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => policyMutation.mutate('TRANSMIT_ON_ANOMALY_OR_WINDOW')}
            className="p-3 rounded-lg border text-left transition-all bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-emerald-300">
                Edge-Optimized (Window + Anomaly)
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Summarizes normal readings over 5 samples (~80% bandwidth reduction), transmits alerts immediately.
            </p>
          </button>

          <button
            onClick={() => policyMutation.mutate('SEND_ALL')}
            className="p-3 rounded-lg border text-left transition-all bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">Centralized Streaming (Send All)</span>
              <Cloud className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Transmits 100% of raw readings immediately. Benchmarking baseline for centralized cloud comparison.
            </p>
          </button>

          <button
            onClick={() => policyMutation.mutate('IMMEDIATE_ANOMALIES_ONLY')}
            className="p-3 rounded-lg border text-left transition-all bg-slate-900/80 border-slate-800 hover:border-slate-700 cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-white">Immediate Anomalies Only</span>
              <Zap className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Suppresses all normal telemetry; transmits exclusively when abnormal or critical states occur.
            </p>
          </button>
        </div>

        {/* Offline Buffer & Network Simulation Controls */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              {isNetworkOnline ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-rose-400 animate-pulse" />
              )}
              <h4 className="text-xs font-semibold text-white">
                Simulated Edge Network Link: {isNetworkOnline ? 'ONLINE' : 'OFFLINE (BUFFERING)'}
              </h4>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Simulate network disruption to observe autonomous edge FIFO queue accumulation and auto-replay.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {isNetworkOnline ? (
              <button
                onClick={() => networkMutation.mutate(false)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition-colors cursor-pointer"
              >
                Disconnect Network (Trigger Buffering)
              </button>
            ) : (
              <button
                onClick={() => networkMutation.mutate(true)}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors shadow-lg cursor-pointer"
              >
                Reconnect Network &amp; Auto-Sync Buffer
              </button>
            )}

            <button
              onClick={() => syncMutation.mutate()}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors cursor-pointer"
            >
              Force Flush Buffer
            </button>
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart: Transmitted vs Summarized */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Telemetry Packets Egress Comparison</h3>
            <span className="text-[11px] font-mono text-emerald-400">Actual Live Metrics</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Comparison of total packets transmitted across Centralized vs Edge computing models
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonBarData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#142825" vertical={false} />
                <XAxis dataKey="model" stroke="#526E69" fontSize={11} tickLine={false} />
                <YAxis stroke="#526E69" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071210', borderColor: '#10b981', borderRadius: '8px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="transmitted" name="Transmitted to Cloud" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="summarized" name="Filtered/Summarized at Edge" fill="#0284c7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Latency Comparison Bar Chart */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Anomaly Detection Latency (ms)</h3>
            <span className="text-[11px] font-mono text-emerald-400">
              ~{metrics?.detectionSpeedupFactor || 1200}x Speedup
            </span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Local edge deterministic evaluation (&lt;1ms) vs cloud roundtrip ingestion latency
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latencyBarData} layout="vertical" margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#142825" horizontal={false} />
                <XAxis type="number" stroke="#526E69" fontSize={11} tickLine={false} />
                <YAxis dataKey="tier" type="category" stroke="#526E69" fontSize={11} tickLine={false} width={150} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071210', borderColor: '#10b981', borderRadius: '8px', fontSize: '12px' }}
                />
                <Bar dataKey="latencyMs" name="Latency (ms)" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Real-Time Reduction Timeline Area Chart */}
      {metrics?.historySnapshots && metrics.historySnapshots.length > 0 && (
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-white">Real-Time Bandwidth Reduction Trajectory</h3>
            <span className="text-[11px] font-mono text-emerald-400">Rolling Timeline</span>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Continuous recording of transmission savings percentage over time
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.historySnapshots} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="reductionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#142825" vertical={false} />
                <XAxis dataKey="timestamp" stroke="#526E69" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#526E69" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#071210', borderColor: '#10b981', borderRadius: '8px', fontSize: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="reductionPct"
                  name="Bandwidth Savings %"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#reductionGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Configurable Threshold Inspector Section */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-healthcare-border">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Configurable Anomaly Threshold Profiles</h3>
          </div>
          {/* Profile Switcher Tabs */}
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
            {Object.keys(profiles).map((pKey) => (
              <button
                key={pKey}
                onClick={() => setSelectedProfile(pKey)}
                className={`px-3 py-1 text-xs rounded font-medium transition-colors cursor-pointer ${
                  selectedProfile === pKey
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {profiles[pKey].name.split(' ')[0]} Profile
              </button>
            ))}
          </div>
        </div>

        {currentProfile && (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-slate-400 leading-relaxed">{currentProfile.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              {/* HR Thresholds */}
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="flex items-center space-x-1.5 font-semibold text-rose-400 mb-1">
                  <Heart className="w-3.5 h-3.5" />
                  <span>Heart Rate</span>
                </span>
                <div className="text-slate-300 space-y-0.5 text-[11px] font-mono">
                  <div>Normal: {currentProfile.heartRate.normalMin} - {currentProfile.heartRate.normalMax} bpm</div>
                  <div className="text-amber-400">Warning: &lt;{currentProfile.heartRate.normalMin} or &gt;{currentProfile.heartRate.normalMax}</div>
                  <div className="text-rose-400">Critical: &lt;{currentProfile.heartRate.criticalMin} or &gt;{currentProfile.heartRate.criticalMax}</div>
                </div>
              </div>

              {/* SpO2 Thresholds */}
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="flex items-center space-x-1.5 font-semibold text-sky-400 mb-1">
                  <Gauge className="w-3.5 h-3.5" />
                  <span>SpO2 Oxygen</span>
                </span>
                <div className="text-slate-300 space-y-0.5 text-[11px] font-mono">
                  <div>Normal: &ge;{currentProfile.spo2.normalMin}%</div>
                  <div className="text-amber-400">Warning: {currentProfile.spo2.warningMin}% - {currentProfile.spo2.normalMin}%</div>
                  <div className="text-rose-400">Critical: &lt;{currentProfile.spo2.criticalMin}%</div>
                </div>
              </div>

              {/* Blood Pressure Thresholds */}
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="flex items-center space-x-1.5 font-semibold text-purple-400 mb-1">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Blood Pressure</span>
                </span>
                <div className="text-slate-300 space-y-0.5 text-[11px] font-mono">
                  <div>Normal: {currentProfile.bloodPressureSys.normalMin}-{currentProfile.bloodPressureSys.normalMax} mmHg</div>
                  <div className="text-amber-400">Sys Warning: &gt;{currentProfile.bloodPressureSys.normalMax}</div>
                  <div className="text-rose-400">Sys Critical: &gt;={currentProfile.bloodPressureSys.criticalMax}</div>
                </div>
              </div>

              {/* Temperature Thresholds */}
              <div className="p-3 rounded-lg bg-slate-900/70 border border-slate-800">
                <span className="flex items-center space-x-1.5 font-semibold text-orange-400 mb-1">
                  <Thermometer className="w-3.5 h-3.5" />
                  <span>Core Temperature</span>
                </span>
                <div className="text-slate-300 space-y-0.5 text-[11px] font-mono">
                  <div>Normal: {currentProfile.temperature.normalMin}°C - {currentProfile.temperature.normalMax}°C</div>
                  <div className="text-amber-400">Pyrexia: &gt;{currentProfile.temperature.warningMax}°C</div>
                  <div className="text-rose-400">Critical: &gt;={currentProfile.temperature.criticalMax}°C</div>
                </div>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Hysteresis filter: 2 consecutive samples required for persistent warning state</span>
              <span className="text-emerald-400 font-mono">Instant Critical Dispatch</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
