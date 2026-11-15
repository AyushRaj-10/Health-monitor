import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Cpu,
  User,
  ShieldAlert,
  Filter,
  Calendar,
  X,
  FileText,
  Activity,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import {
  getAlertsApi,
  getAlertByIdApi,
  acknowledgeAlertApi,
  resolveAlertApi,
  Alert,
} from '../services/api';
import { useSocket } from '../context/SocketContext';

export const Alerts: React.FC = () => {
  const queryClient = useQueryClient();
  const { socket, isConnected } = useSocket();

  // Filter States
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [dateFilter, setDateFilter] = useState<'ALL' | 'TODAY' | '24H' | '7D'>('ALL');
  const [search, setSearch] = useState('');

  // Selected Alert for Detail Modal
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [alertToResolve, setAlertToResolve] = useState<Alert | null>(null);

  // Compute ISO dates for date range filter
  const getDateRange = () => {
    const now = new Date();
    if (dateFilter === 'TODAY') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return { startDate: today.toISOString() };
    }
    if (dateFilter === '24H') {
      return { startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString() };
    }
    if (dateFilter === '7D') {
      return { startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString() };
    }
    return {};
  };

  // Fetch real alerts from PostgreSQL backend
  const { data: alertsResponse, isLoading, refetch } = useQuery({
    queryKey: ['alerts', statusFilter, severityFilter, dateFilter],
    queryFn: () =>
      getAlertsApi({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        severity: severityFilter === 'ALL' ? undefined : severityFilter,
        ...getDateRange(),
        limit: 100,
      }),
    refetchInterval: 5000,
  });

  // Query single alert details when modal is active
  const { data: selectedAlertDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['alert-detail', selectedAlertId],
    queryFn: () => (selectedAlertId ? getAlertByIdApi(selectedAlertId) : null),
    enabled: !!selectedAlertId,
  });

  // Real-Time Socket.IO Listener for instant updates
  useEffect(() => {
    if (!socket) return;

    const handleAlertEvent = () => {
      // Refresh alerts list on incoming alerts or updates
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      if (selectedAlertId) {
        queryClient.invalidateQueries({ queryKey: ['alert-detail', selectedAlertId] });
      }
    };

    socket.on('alert:new', handleAlertEvent);
    socket.on('alert:update', handleAlertEvent);

    return () => {
      socket.off('alert:new', handleAlertEvent);
      socket.off('alert:update', handleAlertEvent);
    };
  }, [socket, queryClient, selectedAlertId]);

  // Mutations for Alert Lifecycle
  const ackMutation = useMutation({
    mutationFn: (id: string) => acknowledgeAlertApi(id),
    onSuccess: (updatedAlert) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      if (selectedAlertId === updatedAlert.id) {
        queryClient.invalidateQueries({ queryKey: ['alert-detail', updatedAlert.id] });
      }
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => resolveAlertApi(id, notes),
    onSuccess: (updatedAlert) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      setIsResolveModalOpen(false);
      setResolutionNotes('');
      setAlertToResolve(null);
      if (selectedAlertId === updatedAlert.id) {
        queryClient.invalidateQueries({ queryKey: ['alert-detail', updatedAlert.id] });
      }
    },
  });

  const rawAlerts = alertsResponse?.data || [];
  const meta = alertsResponse?.meta;

  // Filter by local search query across patient name, code, vital type, or message
  const filteredAlerts = rawAlerts.filter((alert) => {
    const q = search.toLowerCase();
    const patientName = alert.patient?.name?.toLowerCase() || '';
    const patientCode = alert.patient?.patientCode?.toLowerCase() || '';
    const vital = (alert.vitalType || alert.alertType || '').toLowerCase();
    const msg = alert.message.toLowerCase();
    return patientName.includes(q) || patientCode.includes(q) || vital.includes(q) || msg.includes(q);
  });

  const handleAcknowledge = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    ackMutation.mutate(id);
  };

  const openResolveDialog = (alert: Alert, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setAlertToResolve(alert);
    setResolutionNotes('');
    setIsResolveModalOpen(true);
  };

  const handleConfirmResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertToResolve) return;
    resolveMutation.mutate({ id: alertToResolve.id, notes: resolutionNotes });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Alert & Anomaly Triage Center"
        subtitle="End-to-end alert lifecycle management: real-time detection, prioritized triage, staff acknowledgment, and resolution audit trails"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Alerts' },
        ]}
        badge={
          <div className="flex items-center gap-2">
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live WebSocket
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                Polling Mode
              </span>
            )}
          </div>
        }
      />

      {/* Metric Stat Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-healthcare-textMuted font-medium uppercase tracking-wider">Total Alerts</p>
            <p className="text-2xl font-bold text-healthcare-textPrimary mt-1">{meta?.total ?? rawAlerts.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-950/50 border border-teal-800/40 flex items-center justify-center text-teal-400">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-healthcare-surface border border-rose-900/40 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-400 font-medium uppercase tracking-wider">Active Critical</p>
            <p className="text-2xl font-bold text-rose-300 mt-1">{meta?.criticalCount ?? 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-healthcare-surface border border-amber-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-amber-400 font-medium uppercase tracking-wider">Open / Unacknowledged</p>
            <p className="text-2xl font-bold text-amber-300 mt-1">{meta?.openCount ?? 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-950/50 border border-amber-800/40 flex items-center justify-center text-amber-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-healthcare-surface border border-emerald-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Resolved</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">{meta?.resolvedCount ?? 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-950/50 border border-emerald-800/40 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 space-y-3">
        {/* Top Filters: Status Tabs and Date Range */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Status Lifecycle Tabs */}
          <div className="flex items-center gap-1 p-1 bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg overflow-x-auto">
            {(['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-healthcare-textMuted hover:text-healthcare-textPrimary'
                }`}
              >
                {tab === 'ALL' && 'All Alerts'}
                {tab === 'OPEN' && `Open (${meta?.openCount ?? 0})`}
                {tab === 'ACKNOWLEDGED' && `Acknowledged (${meta?.acknowledgedCount ?? 0})`}
                {tab === 'RESOLVED' && 'Resolved'}
              </button>
            ))}
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-healthcare-textMuted" />
            <div className="flex items-center gap-1 bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-1">
              {(['ALL', 'TODAY', '24H', '7D'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    dateFilter === d
                      ? 'bg-zinc-800 text-teal-300 font-semibold'
                      : 'text-healthcare-textMuted hover:text-healthcare-textSecondary'
                  }`}
                >
                  {d === 'ALL' ? 'All Time' : d === 'TODAY' ? 'Today' : d === '24H' ? '24h' : '7d'}
                </button>
              ))}
            </div>
            <button
              onClick={() => refetch()}
              className="p-1.5 rounded-lg border border-healthcare-borderSubtle hover:bg-healthcare-surfaceLight text-healthcare-textMuted hover:text-healthcare-textPrimary transition-colors"
              title="Refresh alerts"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Filters: Search & Severity Pills */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-healthcare-borderSubtle">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-healthcare-textMuted" />
            <input
              type="text"
              placeholder="Filter by patient, MRN, vital or note..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-healthcare-textPrimary placeholder-healthcare-textMuted focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <Filter className="w-3.5 h-3.5 text-healthcare-textMuted shrink-0" />
            <span className="text-xs text-healthcare-textMuted mr-1">Severity:</span>
            {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                  severityFilter === sev
                    ? sev === 'CRITICAL'
                      ? 'bg-rose-950/80 border-rose-700 text-rose-300'
                      : sev === 'WARNING'
                      ? 'bg-amber-950/80 border-amber-700 text-amber-300'
                      : sev === 'INFO'
                      ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                      : 'bg-teal-950/80 border-teal-700 text-teal-300'
                    : 'bg-healthcare-surfaceLight border-healthcare-borderSubtle text-healthcare-textMuted hover:text-healthcare-textSecondary'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alert Cards List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-healthcare-surface/50 border border-healthcare-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <EmptyState
          title="No Clinical Alerts Found"
          description={
            statusFilter !== 'ALL' || severityFilter !== 'ALL' || search
              ? 'No alerts match your active filter criteria. Try adjusting your status, severity, or search filters.'
              : 'All monitored patient biometrics are currently within stable baseline parameters.'
          }
          icon={<CheckCircle2 className="w-12 h-12 text-emerald-400" />}
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';
            const isOpen = alert.status === 'OPEN';
            const isAck = alert.status === 'ACKNOWLEDGED';
            const isRes = alert.status === 'RESOLVED';

            return (
              <div
                key={alert.id}
                onClick={() => setSelectedAlertId(alert.id)}
                className={`rounded-xl border p-4 transition-all cursor-pointer relative overflow-hidden ${
                  isOpen && isCritical
                    ? 'bg-rose-950/20 border-rose-800/60 hover:border-rose-600 shadow-lg shadow-rose-950/30'
                    : isOpen && isWarning
                    ? 'bg-amber-950/20 border-amber-800/50 hover:border-amber-600'
                    : isAck
                    ? 'bg-teal-950/20 border-teal-800/40 hover:border-teal-600'
                    : 'bg-healthcare-surface border-healthcare-border hover:border-healthcare-borderSubtle opacity-85'
                }`}
              >
                {/* Left accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    isCritical ? 'bg-rose-500' : isWarning ? 'bg-amber-500' : 'bg-teal-500'
                  }`}
                />

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pl-2">
                  {/* Left: Patient, Badges, and Alert Message */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/patients/${alert.patientId}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm font-bold text-healthcare-textPrimary hover:text-teal-400 transition-colors flex items-center gap-1"
                      >
                        {alert.patient?.name || 'Monitored Patient'}
                        <ExternalLink className="w-3 h-3 text-healthcare-textMuted" />
                      </Link>
                      <span className="text-xs font-mono text-healthcare-textMuted">
                        ({alert.patient?.patientCode || 'PAT-XXXX'})
                      </span>

                      {/* Severity Badge */}
                      <StatusBadge
                        type="alert"
                        value={alert.severity}
                        size="sm"
                        pulse={isOpen && isCritical}
                      />

                      {/* Lifecycle Status Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          isOpen
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800/60 animate-pulse'
                            : isAck
                            ? 'bg-sky-950/80 text-sky-300 border-sky-800/60'
                            : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                        }`}
                      >
                        {isOpen ? '● OPEN' : isAck ? '✓ ACKNOWLEDGED' : '✔ RESOLVED'}
                      </span>

                      <span className="text-xs px-2 py-0.5 rounded bg-healthcare-surfaceLight border border-healthcare-borderSubtle text-healthcare-textSecondary font-mono">
                        {alert.vitalType || alert.alertType}
                      </span>
                    </div>

                    <p className="text-xs text-healthcare-textSecondary leading-relaxed">
                      {alert.message}
                    </p>

                    {/* Metadata strip */}
                    <div className="flex items-center gap-4 text-[11px] text-healthcare-textMuted flex-wrap pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Triggered:{' '}
                        {new Date(alert.triggeredAt || alert.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        ({new Date(alert.triggeredAt || alert.createdAt).toLocaleDateString()})
                      </span>

                      {alert.currentValue && (
                        <span className="font-mono text-healthcare-textSecondary">
                          Trigger: <span className="text-rose-400 font-semibold">{alert.currentValue}</span>{' '}
                          (Threshold: {alert.thresholdValue || 'N/A'})
                        </span>
                      )}

                      {alert.device && (
                        <span className="flex items-center gap-1 font-mono">
                          <Cpu className="w-3 h-3 text-teal-400" />
                          {alert.device.deviceCode}
                        </span>
                      )}

                      {isAck && alert.acknowledgedBy && (
                        <span className="text-sky-300 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Ack by: {alert.acknowledgedBy}
                        </span>
                      )}

                      {isRes && alert.resolvedBy && (
                        <span className="text-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Resolved by: {alert.resolvedBy}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
                    {isOpen && (
                      <button
                        onClick={(e) => handleAcknowledge(alert.id, e)}
                        disabled={ackMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Acknowledge
                      </button>
                    )}

                    {!isRes && (
                      <button
                        onClick={(e) => openResolveDialog(alert, e)}
                        className="px-3 py-1.5 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-borderSubtle text-healthcare-textPrimary border border-healthcare-borderSubtle text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Resolve
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedAlertId(alert.id)}
                      className="px-3 py-1.5 rounded-lg border border-healthcare-borderSubtle hover:bg-healthcare-surfaceLight text-healthcare-textMuted hover:text-healthcare-textPrimary text-xs transition-colors"
                    >
                      Audit View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Alert Detail & Audit Modal */}
      {selectedAlertId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-healthcare-surface border border-healthcare-border rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {isLoadingDetail || !selectedAlertDetail ? (
              <div className="py-12 text-center text-healthcare-textMuted">Loading alert audit records...</div>
            ) : (
              <>
                <div className="flex items-start justify-between border-b border-healthcare-borderSubtle pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${
                          selectedAlertDetail.severity === 'CRITICAL'
                            ? 'bg-rose-500'
                            : selectedAlertDetail.severity === 'WARNING'
                            ? 'bg-amber-500'
                            : 'bg-cyan-500'
                        }`}
                      />
                      <h3 className="text-lg font-bold text-healthcare-textPrimary">
                        Clinical Alert #{selectedAlertDetail.id.slice(0, 8)}
                      </h3>
                      <StatusBadge
                        type="alert"
                        value={selectedAlertDetail.severity}
                        size="sm"
                      />
                    </div>
                    <p className="text-xs text-healthcare-textMuted">
                      Source: {selectedAlertDetail.source} | Vital: {selectedAlertDetail.vitalType || selectedAlertDetail.alertType}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedAlertId(null)}
                    className="p-1 rounded-lg text-healthcare-textMuted hover:text-healthcare-textPrimary hover:bg-healthcare-surfaceLight"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Patient Context Card */}
                <div className="p-3.5 bg-healthcare-surfaceLight/60 border border-healthcare-borderSubtle rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <p className="text-xs text-healthcare-textMuted">Patient</p>
                    <p className="text-sm font-semibold text-healthcare-textPrimary">
                      {selectedAlertDetail.patient?.name} ({selectedAlertDetail.patient?.patientCode})
                    </p>
                    <p className="text-xs text-healthcare-textSecondary">
                      Risk: {selectedAlertDetail.patient?.riskLevel} | Location: {selectedAlertDetail.patient?.roomOrLocation || 'Ward bed'}
                    </p>
                  </div>
                  <Link
                    to={`/patients/${selectedAlertDetail.patientId}`}
                    className="px-3 py-1.5 rounded-lg bg-teal-950/80 border border-teal-700/60 text-teal-300 text-xs font-semibold hover:bg-teal-900 transition-colors flex items-center gap-1.5"
                  >
                    Patient Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {/* Clinical Anomaly Details */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-healthcare-textMuted uppercase tracking-wider">
                    Physiological Trigger & Parameters
                  </h4>
                  <div className="p-3 bg-zinc-950/70 border border-healthcare-borderSubtle rounded-xl space-y-2">
                    <p className="text-sm font-medium text-healthcare-textPrimary">
                      {selectedAlertDetail.message}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-zinc-800">
                      <div>
                        <span className="text-healthcare-textMuted">Observed Value:</span>{' '}
                        <span className="font-semibold text-rose-300 font-mono">
                          {selectedAlertDetail.currentValue || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-healthcare-textMuted">Configured Threshold:</span>{' '}
                        <span className="font-semibold text-healthcare-textSecondary font-mono">
                          {selectedAlertDetail.thresholdValue || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-healthcare-textMuted">Device Code:</span>{' '}
                        <span className="font-mono text-teal-300">
                          {selectedAlertDetail.device?.deviceCode || 'EDGE-GATEWAY'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audit Lifecycle Chronology */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-healthcare-textMuted uppercase tracking-wider flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-teal-400" />
                    Complete Lifecycle Audit Trail
                  </h4>

                  <div className="space-y-2 text-xs">
                    {/* Stage 1: Triggered */}
                    <div className="p-3 bg-healthcare-surfaceLight/40 border border-healthcare-borderSubtle rounded-lg flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-rose-950 border border-rose-800 text-rose-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                        1
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-healthcare-textPrimary">Anomaly Triggered & Persisted</span>
                          <span className="text-healthcare-textMuted">
                            {new Date(selectedAlertDetail.triggeredAt || selectedAlertDetail.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-healthcare-textMuted">
                          Detected by {selectedAlertDetail.source}. Committed to PostgreSQL.
                        </p>
                      </div>
                    </div>

                    {/* Stage 2: Acknowledged */}
                    <div className="p-3 bg-healthcare-surfaceLight/40 border border-healthcare-borderSubtle rounded-lg flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                          selectedAlertDetail.isAcknowledged
                            ? 'bg-sky-950 border border-sky-800 text-sky-400'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                        }`}
                      >
                        2
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-semibold ${
                              selectedAlertDetail.isAcknowledged
                                ? 'text-healthcare-textPrimary'
                                : 'text-healthcare-textMuted'
                            }`}
                          >
                            Staff Acknowledgment
                          </span>
                          {selectedAlertDetail.acknowledgedAt && (
                            <span className="text-healthcare-textMuted">
                              {new Date(selectedAlertDetail.acknowledgedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-healthcare-textMuted">
                          {selectedAlertDetail.isAcknowledged
                            ? `Acknowledged by ${selectedAlertDetail.acknowledgedBy || 'Clinical Staff'}`
                            : 'Pending staff acknowledgment'}
                        </p>
                      </div>
                    </div>

                    {/* Stage 3: Resolved */}
                    <div className="p-3 bg-healthcare-surfaceLight/40 border border-healthcare-borderSubtle rounded-lg flex items-start gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 font-bold ${
                          selectedAlertDetail.isResolved
                            ? 'bg-emerald-950 border border-emerald-800 text-emerald-400'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-600'
                        }`}
                      >
                        3
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex items-center justify-between">
                          <span
                            className={`font-semibold ${
                              selectedAlertDetail.isResolved
                                ? 'text-healthcare-textPrimary'
                                : 'text-healthcare-textMuted'
                            }`}
                          >
                            Clinical Resolution
                          </span>
                          {selectedAlertDetail.resolvedAt && (
                            <span className="text-healthcare-textMuted">
                              {new Date(selectedAlertDetail.resolvedAt).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <p className="text-healthcare-textMuted">
                          {selectedAlertDetail.isResolved
                            ? `Resolved by ${selectedAlertDetail.resolvedBy || 'Clinical Staff'}`
                            : 'Awaiting clinical resolution'}
                        </p>
                        {selectedAlertDetail.resolutionNotes && (
                          <div className="mt-2 p-2 bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded text-emerald-300">
                            <span className="font-semibold text-xs text-healthcare-textPrimary">Notes: </span>
                            {selectedAlertDetail.resolutionNotes}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-healthcare-borderSubtle flex items-center justify-between">
                  <div className="text-xs text-healthcare-textMuted">
                    Status: <span className="font-semibold text-healthcare-textPrimary">{selectedAlertDetail.status}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedAlertDetail.status === 'OPEN' && (
                      <button
                        onClick={() => handleAcknowledge(selectedAlertDetail.id)}
                        disabled={ackMutation.isPending}
                        className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors"
                      >
                        Acknowledge Alert
                      </button>
                    )}

                    {selectedAlertDetail.status !== 'RESOLVED' && (
                      <button
                        onClick={() => openResolveDialog(selectedAlertDetail)}
                        className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Resolve Alert
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedAlertId(null)}
                      className="px-4 py-2 rounded-lg bg-healthcare-surfaceLight border border-healthcare-borderSubtle hover:bg-healthcare-borderSubtle text-healthcare-textSecondary text-xs transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Resolve Dialog Modal */}
      {isResolveModalOpen && alertToResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form
            onSubmit={handleConfirmResolve}
            className="bg-healthcare-surface border border-healthcare-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-healthcare-borderSubtle pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-healthcare-textPrimary">Resolve Clinical Alert</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="text-healthcare-textMuted hover:text-healthcare-textPrimary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-healthcare-textSecondary">
              Resolving alert for <strong className="text-healthcare-textPrimary">{alertToResolve.patient?.name}</strong>:
              <br />
              <span className="italic text-healthcare-textMuted">"{alertToResolve.message}"</span>
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-healthcare-textMuted flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                Clinical Action / Resolution Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="e.g. Patient administered IV fluids. Heart rate normalized to 78 bpm. Monitoring continued."
                className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-2.5 text-xs text-healthcare-textPrimary placeholder-healthcare-textMuted focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-healthcare-borderSubtle">
              <button
                type="button"
                onClick={() => setIsResolveModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg border border-healthcare-borderSubtle hover:bg-healthcare-surfaceLight text-healthcare-textSecondary text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={resolveMutation.isPending}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {resolveMutation.isPending ? 'Resolving...' : 'Confirm Resolution'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
