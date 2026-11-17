import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Lock,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Clock,
  User,
  Activity,
  X,
  FileCode,
  Filter,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/common/EmptyState';
import { getAuditLogsApi, AuditLog } from '../services/api';

export const AuditLogs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'DENIED'>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch real audit logs from PostgreSQL
  const { data: auditResponse, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', statusFilter, actionFilter],
    queryFn: () =>
      getAuditLogsApi({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        action: actionFilter === 'ALL' ? undefined : actionFilter,
        limit: 100,
      }),
    refetchInterval: 5000,
  });

  const logs = auditResponse?.data || [];
  const meta = auditResponse?.meta;

  // Filter logs locally by search query
  const filteredLogs = logs.filter((log) => {
    const q = search.toLowerCase();
    const actor = (log.userName || log.userEmail || '').toLowerCase();
    const action = log.action.toLowerCase();
    const resource = (log.resourceType + (log.resourceId || '')).toLowerCase();
    const metaStr = (log.metadata || '').toLowerCase();
    return actor.includes(q) || action.includes(q) || resource.includes(q) || metaStr.includes(q);
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tamper-Evident Security & Access Audit Ledger"
        subtitle="Append-only immutable record of all clinical record access, patient mutations, alert triage, and unauthorized access attempts"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audit Logs' },
        ]}
        badge={
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Immutable Append-Only Ledger</span>
          </span>
        }
        actions={
          <button
            onClick={() => refetch()}
            className="p-2 rounded-lg border border-healthcare-borderSubtle hover:bg-healthcare-surfaceLight text-healthcare-textMuted hover:text-healthcare-textPrimary transition-colors"
            title="Refresh audit entries"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      {/* Audit Stats Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-healthcare-textMuted font-medium uppercase tracking-wider">Total Recorded Events</p>
            <p className="text-2xl font-bold text-healthcare-textPrimary mt-1">{meta?.total ?? logs.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-teal-950/60 border border-teal-800/50 flex items-center justify-center text-teal-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-healthcare-surface border border-rose-900/40 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-rose-400 font-medium uppercase tracking-wider">Unauthorized Access Blocked</p>
            <p className="text-2xl font-bold text-rose-300 mt-1">{meta?.unauthorizedAttempts ?? 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-950/60 border border-rose-800/50 flex items-center justify-center text-rose-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-healthcare-surface border border-emerald-900/30 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Authorized Events</p>
            <p className="text-2xl font-bold text-emerald-300 mt-1">
              {(meta?.total ?? logs.length) - (meta?.totalDenied ?? 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-healthcare-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, or resource..."
            className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-healthcare-textPrimary placeholder:text-healthcare-textMuted focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-healthcare-textMuted" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg px-2.5 py-1 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">All Actions</option>
              <option value="PATIENT_RECORD_VIEW">Patient Record View</option>
              <option value="UNAUTHORIZED_ACCESS_ATTEMPT">Unauthorized Access Attempt</option>
              <option value="AUTH_LOGIN">Auth Login</option>
              <option value="ALERT_ACKNOWLEDGE">Alert Acknowledge</option>
              <option value="ALERT_RESOLVE">Alert Resolve</option>
              <option value="CONSENT_GRANT">Consent Grant</option>
              <option value="CONSENT_REVOKE">Consent Revoke</option>
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1">
            {(['ALL', 'SUCCESS', 'DENIED'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? st === 'DENIED'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700/60'
                      : 'bg-teal-950 text-teal-300 border border-teal-700/60'
                    : 'bg-healthcare-surfaceLight text-healthcare-textMuted border border-healthcare-borderSubtle hover:text-healthcare-textSecondary'
                }`}
              >
                {st === 'ALL' ? 'All' : st === 'SUCCESS' ? 'Success' : 'Security Denied'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      {isLoading ? (
        <div className="py-12 text-center text-xs text-healthcare-textMuted">Loading verified audit ledger from PostgreSQL...</div>
      ) : filteredLogs.length === 0 ? (
        <EmptyState
          title="No Audit Entries Found"
          description="No security or access logs match the specified filter criteria."
          actionText="Clear Filters"
          onAction={() => {
            setSearch('');
            setStatusFilter('ALL');
            setActionFilter('ALL');
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-healthcare-border bg-healthcare-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-healthcare-textPrimary">
              <thead className="bg-healthcare-surfaceLight border-b border-healthcare-border uppercase text-healthcare-textSecondary font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Actor / Clinician</th>
                  <th className="px-4 py-3">Resource Target</th>
                  <th className="px-4 py-3">Outcome</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">Inspection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-healthcare-borderSubtle font-normal">
                {filteredLogs.map((log) => {
                  const isDenied = log.status === 'DENIED' || log.action === 'UNAUTHORIZED_ACCESS_ATTEMPT';

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-healthcare-surfaceLight/50 transition-colors ${
                        isDenied ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-healthcare-textMuted font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {new Date(log.timestamp).toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-block font-mono font-semibold px-2 py-0.5 rounded text-[11px] border ${
                            isDenied
                              ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                              : 'bg-teal-950/80 border-teal-800 text-teal-300'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-teal-400" />
                          <div>
                            <span className="font-semibold block text-healthcare-textPrimary">
                              {log.userName || log.user?.name || 'System Agent'}
                            </span>
                            <span className="text-healthcare-textMuted text-[10px] font-mono">
                              {log.userRole || log.user?.role || 'ANON'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 font-mono text-healthcare-textSecondary">
                        <span className="text-healthcare-textPrimary font-semibold">{log.resourceType}</span>
                        {log.resourceId && (
                          <span className="text-healthcare-textMuted block text-[10px] truncate max-w-[150px]">
                            {log.resourceId}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                            isDenied
                              ? 'bg-rose-950/80 border-rose-800 text-rose-300'
                              : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono text-healthcare-textMuted text-[11px]">
                        {log.ipAddress || '127.0.0.1'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 rounded bg-healthcare-surfaceLight border border-healthcare-borderSubtle hover:bg-teal-950 hover:text-teal-300 text-healthcare-textSecondary text-[11px] font-semibold transition-colors"
                        >
                          Metadata
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Metadata Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-healthcare-surface border border-healthcare-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-healthcare-borderSubtle pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-teal-400" />
                <h3 className="text-base font-bold text-healthcare-textPrimary">Audit Entry Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-healthcare-textMuted hover:text-healthcare-textPrimary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-healthcare-surfaceLight rounded-lg">
                <div>
                  <span className="text-healthcare-textMuted">Event ID:</span>
                  <p className="font-mono text-teal-300">{selectedLog.id.slice(0, 16)}...</p>
                </div>
                <div>
                  <span className="text-healthcare-textMuted">Timestamp:</span>
                  <p className="font-mono text-healthcare-textPrimary">
                    {new Date(selectedLog.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <span className="text-healthcare-textMuted">Actor:</span>
                  <p className="font-semibold text-healthcare-textPrimary">{selectedLog.userName}</p>
                </div>
                <div>
                  <span className="text-healthcare-textMuted">Action:</span>
                  <p className="font-mono font-semibold text-teal-300">{selectedLog.action}</p>
                </div>
              </div>

              <div>
                <span className="text-healthcare-textMuted font-medium block mb-1">
                  Sanitized Metadata (PHI & Credentials Stripped)
                </span>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded-lg text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-48">
                  {selectedLog.metadata
                    ? JSON.stringify(JSON.parse(selectedLog.metadata), null, 2)
                    : '// No additional metadata payload'}
                </pre>
              </div>

              <div className="text-[11px] text-healthcare-textMuted leading-relaxed pt-1">
                <strong>Statutory Immutability Guarantee:</strong> This audit ledger row is write-only. It cannot be altered, overwritten, or deleted through application endpoints.
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-healthcare-borderSubtle">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
