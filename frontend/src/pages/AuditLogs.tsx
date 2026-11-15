import React, { useState } from 'react';
import {
  Search,
  Download,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { mockAuditLogs } from '../data/mockData';

export const AuditLogs: React.FC = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESS' | 'BLOCKED'>('ALL');

  const filteredLogs = mockAuditLogs.filter((log) => {
    const matchesStatus = statusFilter === 'ALL' || log.status === statusFilter;
    const matchesSearch =
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.resourceTarget.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cryptographic Privacy & Clinical Access Audit Logs"
        subtitle="Tamper-evident trail of biometric access, differential privacy noise deductions, and edge node handshakes"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Audit Logs' },
        ]}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950 text-emerald-300 border border-emerald-800">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>Immutable Hash-Chained</span>
          </span>
        }
        actions={
          <button
            onClick={() => alert('Stage 1 Demo: Exporting cryptographic audit ledger (.json / .csv)...')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-healthcare-surfaceLight hover:bg-teal-950 hover:text-teal-300 text-healthcare-textSecondary text-xs font-medium border border-healthcare-border transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-teal-400" />
            <span>Export Verified Trail</span>
          </button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-healthcare-surface border border-healthcare-border rounded-xl p-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-healthcare-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by actor, action, or patient..."
            className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-healthcare-textPrimary placeholder:text-healthcare-textMuted focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5">
          {(['ALL', 'SUCCESS', 'BLOCKED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-teal-950 text-teal-300 border border-teal-700/60 font-semibold'
                  : 'bg-healthcare-surfaceLight text-healthcare-textSecondary border border-healthcare-borderSubtle'
              }`}
            >
              {st === 'ALL' ? 'All Events' : st === 'SUCCESS' ? 'Authorized (Success)' : 'Security Blocked'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      {filteredLogs.length === 0 ? (
        <EmptyState
          title="No audit entries found"
          description="No security or access logs match the specified query."
          actionText="Clear Filter"
          onAction={() => {
            setSearch('');
            setStatusFilter('ALL');
          }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-healthcare-border bg-healthcare-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-healthcare-textPrimary">
              <thead className="bg-healthcare-surfaceLight border-b border-healthcare-border uppercase text-healthcare-textSecondary font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Actor &amp; Role</th>
                  <th className="px-4 py-3.5">Action Event</th>
                  <th className="px-4 py-3.5">Target Resource</th>
                  <th className="px-4 py-3.5">Edge Node</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5">Cryptographic Signature</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-healthcare-borderSubtle">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-healthcare-surfaceHover/60 transition-colors">
                    {/* Timestamp */}
                    <td className="px-5 py-4 font-mono text-healthcare-textMuted whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    {/* Actor */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-healthcare-textPrimary">{log.actor}</div>
                      <div className="text-[11px] text-healthcare-textSecondary">{log.actorRole}</div>
                    </td>

                    {/* Action */}
                    <td className="px-4 py-4">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-healthcare-surfaceLight border border-healthcare-borderSubtle text-teal-300">
                        {log.action}
                      </span>
                    </td>

                    {/* Resource Target */}
                    <td className="px-4 py-4 font-mono text-healthcare-textSecondary">
                      {log.resourceTarget}
                    </td>

                    {/* Edge Node */}
                    <td className="px-4 py-4 font-mono text-healthcare-textMuted">
                      {log.edgeNodeId}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <StatusBadge type="status" value={log.status} size="sm" />
                    </td>

                    {/* Signature & Details */}
                    <td className="px-5 py-4">
                      <div className="font-mono text-[11px] text-teal-400 truncate max-w-[180px]">
                        {log.cryptographicSignature}
                      </div>
                      <div className="text-[11px] text-healthcare-textMuted mt-0.5 truncate max-w-[260px]" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
