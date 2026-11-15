import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  RefreshCw,
  Bell,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { AlertItemComponent } from '../components/alerts/AlertItem';
import { EmptyState } from '../components/common/EmptyState';
import { getAlertsApi, acknowledgeAlertApi, resolveAlertApi } from '../services/api';
import { AlertItem } from '../types';

export const Alerts: React.FC = () => {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'UNRESOLVED' | 'RESOLVED' | 'ALL'>('UNRESOLVED');
  const [search, setSearch] = useState('');

  // Fetch real alerts from PostgreSQL (poll every 3s for live anomaly updates)
  const { data: alertsResponse, isLoading, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => getAlertsApi({ limit: 100 }),
    refetchInterval: 3000,
  });

  const ackMutation = useMutation({
    mutationFn: (id: string) => acknowledgeAlertApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: (id: string) => resolveAlertApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const rawAlerts = alertsResponse?.data || [];

  // Map backend alerts to AlertItem interface
  const alerts: AlertItem[] = rawAlerts.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    patientName: a.patient?.name || 'Assigned Patient',
    medicalRecordNumber: a.patient?.patientCode || 'PAT-XXXXX',
    severity: a.severity,
    vitalType: a.vitalType as any,
    message: a.message,
    currentValue: a.currentValue || '',
    thresholdValue: a.thresholdValue || '',
    timestamp: new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    edgeNodeId: a.device?.deviceCode || 'EDGE-GATEWAY-RPI4-01',
    isAcknowledged: a.isAcknowledged,
    isResolved: a.isResolved,
    acknowledgedBy: a.acknowledgedBy || undefined,
  }));

  const handleAcknowledge = (id: string) => {
    ackMutation.mutate(id);
  };

  const handleResolve = (id: string) => {
    resolveMutation.mutate(id);
  };

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSeverity = severityFilter === 'ALL' || alert.severity === severityFilter;
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'RESOLVED'
        ? alert.isResolved
        : !alert.isResolved;

    const matchesSearch =
      alert.patientName.toLowerCase().includes(search.toLowerCase()) ||
      alert.medicalRecordNumber.toLowerCase().includes(search.toLowerCase()) ||
      alert.vitalType.toLowerCase().includes(search.toLowerCase()) ||
      alert.message.toLowerCase().includes(search.toLowerCase());

    return matchesSeverity && matchesStatus && matchesSearch;
  });

  const criticalCount = alerts.filter((a) => a.severity === 'CRITICAL' && !a.isResolved).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinical Alert & Anomaly Triage Center"
        subtitle="Prioritized physiological anomalies detected in <1ms locally at edge gateways with deduplication and persistence filtering"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Alerts' },
        ]}
        badge={
          criticalCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              {criticalCount} Critical Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
              All Active Stable
            </span>
          )
        }
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-healthcare-surfaceLight hover:bg-slate-800 text-healthcare-textSecondary text-xs font-medium border border-healthcare-border transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-healthcare-surface border border-healthcare-border rounded-xl p-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-healthcare-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient, MRN, vital..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-healthcare-textPrimary placeholder-healthcare-textMuted focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Severity Filters */}
        <div className="flex items-center gap-1 flex-wrap w-full md:w-auto">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                severityFilter === sev
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-healthcare-surfaceLight text-healthcare-textSecondary hover:text-healthcare-textPrimary border border-healthcare-borderSubtle'
              }`}
            >
              {sev}
            </button>
          ))}

          <span className="h-4 w-px bg-healthcare-borderSubtle mx-1 hidden md:block" />

          {/* Status Filters */}
          {(['UNRESOLVED', 'RESOLVED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === st
                  ? 'bg-healthcare-surfaceHover text-teal-300 border border-teal-700/60'
                  : 'bg-healthcare-surfaceLight text-healthcare-textMuted hover:text-healthcare-textSecondary border border-healthcare-borderSubtle'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Alert Feed List */}
      <div className="space-y-3">
        {filteredAlerts.length > 0 ? (
          filteredAlerts.map((alert) => (
            <AlertItemComponent
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          ))
        ) : (
          <EmptyState
            icon={<Bell className="w-6 h-6" />}
            title="No Alerts Match Your Filters"
            description="All physiological thresholds within configured tolerance or filtered out. Local anomaly engine active."
          />
        )}
      </div>
    </div>
  );
};
