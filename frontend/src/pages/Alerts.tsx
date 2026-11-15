import React, { useState } from 'react';
import {
  CheckCheck,
  Search,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { AlertItemComponent } from '../components/alerts/AlertItem';
import { EmptyState } from '../components/common/EmptyState';
import { mockAlerts as initialAlerts } from '../data/mockData';
import { AlertItem } from '../types';

export const Alerts: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>(initialAlerts);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'UNRESOLVED' | 'RESOLVED' | 'ALL'>('UNRESOLVED');
  const [search, setSearch] = useState('');

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((alt) =>
        alt.id === id
          ? { ...alt, isAcknowledged: true, acknowledgedBy: 'Dr. Elena Vance, MD' }
          : alt
      )
    );
  };

  const handleResolve = (id: string) => {
    setAlerts((prev) =>
      prev.map((alt) =>
        alt.id === id ? { ...alt, isResolved: true } : alt
      )
    );
  };

  const handleAcknowledgeAll = () => {
    setAlerts((prev) =>
      prev.map((alt) => ({ ...alt, isAcknowledged: true, acknowledgedBy: 'Dr. Elena Vance, MD' }))
    );
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
        subtitle="Prioritized IoMT physiological anomalies filtered and detected locally at edge nodes"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Alerts' },
        ]}
        badge={
          criticalCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/60">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              {criticalCount} Critical Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
              All Alerts Resolved
            </span>
          )
        }
        actions={
          <button
            onClick={handleAcknowledgeAll}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-healthcare-surfaceLight hover:bg-teal-950 hover:text-teal-300 text-healthcare-textSecondary text-xs font-medium border border-healthcare-border transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>Acknowledge All Unread</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-healthcare-surface border border-healthcare-border rounded-xl p-3">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-healthcare-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search alerts or patient..."
            className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-healthcare-textPrimary placeholder:text-healthcare-textMuted focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Severity Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                severityFilter === sev
                  ? 'bg-teal-950 text-teal-300 border border-teal-700/60 font-semibold'
                  : 'bg-healthcare-surfaceLight text-healthcare-textSecondary border border-healthcare-borderSubtle'
              }`}
            >
              {sev === 'ALL' ? 'All Severities' : sev}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1 bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-0.5">
          {(['UNRESOLVED', 'RESOLVED', 'ALL'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                statusFilter === st
                  ? 'bg-teal-950 text-teal-300 font-medium'
                  : 'text-healthcare-textMuted hover:text-healthcare-textSecondary'
              }`}
            >
              {st === 'UNRESOLVED' ? 'Open' : st === 'RESOLVED' ? 'Resolved' : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <EmptyState
          title="No alerts match current filters"
          description="All telemetry parameters are operating within clinical baseline thresholds."
          actionText="Clear Filters"
          onAction={() => {
            setSeverityFilter('ALL');
            setStatusFilter('ALL');
            setSearch('');
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <AlertItemComponent
              key={alert.id}
              alert={alert}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
          ))}
        </div>
      )}
    </div>
  );
};
