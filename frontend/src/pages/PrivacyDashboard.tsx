import React from 'react';
import {
  ShieldCheck,
  Lock,
  Layers,
  Database,
  KeyRound,
  CheckCircle,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatCard } from '../components/common/StatCard';
import { StatusBadge } from '../components/common/StatusBadge';
import { mockPrivacySummary, mockEdgeNodes } from '../data/mockData';

export const PrivacyDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy Engine & Differential Privacy Control"
        subtitle="Mathematical privacy guarantees, edge noise perturbation, and HIPAA/GDPR data protection status"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Privacy Engine' },
        ]}
        badge={
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-950/80 text-teal-300 border border-teal-800/60 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
            <span>(ε=0.5, δ=1e-5) Active</span>
          </span>
        }
      />

      {/* Privacy KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Global Privacy Budget (ε)"
          value="0.50 Bound"
          subtitle="Differential Privacy limit"
          trend="Laplace Mechanism (b=2.0)"
          trendType="positive"
          accentColor="teal"
          icon={<ShieldCheck className="w-5 h-5 text-teal-400" />}
        />

        <StatCard
          title="Today's ε Consumption"
          value={`${mockPrivacySummary.epsilonConsumedToday} / 1.0`}
          subtitle="95.2% budget remaining"
          trend="Strictly bounded privacy loss"
          trendType="positive"
          accentColor="emerald"
          icon={<Lock className="w-5 h-5 text-emerald-400" />}
        />

        <StatCard
          title="Quasi-Identifier Protection"
          value="k=5 Anonymity"
          subtitle="L-diversity: 3 distinct conditions"
          trend="De-identification certified"
          trendType="positive"
          accentColor="cyan"
          icon={<Layers className="w-5 h-5 text-cyan-400" />}
        />

        <StatCard
          title="Data Minimization Ratio"
          value="78.4% Saved"
          subtitle="Filtered at local IoMT edge"
          trend="Only anomalies & summaries egress"
          trendType="positive"
          accentColor="amber"
          icon={<Database className="w-5 h-5 text-amber-400" />}
        />
      </div>

      {/* Privacy Guarantee Architecture & Encryption Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Differential Privacy Mechanism Details */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-healthcare-borderSubtle">
            <h3 className="text-sm font-semibold text-healthcare-textPrimary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Differential Privacy Mathematical Model</span>
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
              Pr[M(D) ∈ S] ≤ e^ε × Pr[M(D') ∈ S]
            </span>
          </div>

          <p className="text-xs text-healthcare-textSecondary leading-relaxed">
            Biometric data from wearable IoMT sensors undergoes local Laplace noise calibration at the edge node prior to cloud transmission:
          </p>

          <div className="space-y-2.5 text-xs text-healthcare-textSecondary">
            <div className="flex justify-between p-2.5 rounded-lg bg-healthcare-surfaceLight border border-healthcare-borderSubtle">
              <span className="text-healthcare-textPrimary font-medium">Mechanism:</span>
              <span className="font-mono text-teal-300">Local Laplace Noise Perturbation</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-healthcare-surfaceLight border border-healthcare-borderSubtle">
              <span className="text-healthcare-textPrimary font-medium">Global Sensitivity (Δf):</span>
              <span className="font-mono text-teal-300">1.0 BPM (Heart Rate Variance Bound)</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-lg bg-healthcare-surfaceLight border border-healthcare-borderSubtle">
              <span className="text-healthcare-textPrimary font-medium">Emergency Override Protocol:</span>
              <span className="font-mono text-rose-300">Unmasked upon Sustained Tachycardia / Hypoxia</span>
            </div>
          </div>

          <div className="p-3 bg-teal-950/40 border border-teal-800/40 rounded-lg text-xs text-teal-300 flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Even under full database compromise, mathematical differential privacy guarantees that an adversary cannot determine any individual patient’s presence or identity in the study cohort.
            </span>
          </div>
        </div>

        {/* Cryptographic Key & Encryption Security */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-healthcare-borderSubtle">
            <h3 className="text-sm font-semibold text-healthcare-textPrimary flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-teal-400" />
              <span>Hardware &amp; Transport Layer Security</span>
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
              FIPS 140-3 Validated
            </span>
          </div>

          <div className="space-y-3 pt-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-healthcare-textSecondary">End-to-End Cryptography:</span>
              <span className="font-mono text-healthcare-textPrimary font-semibold">AES-256-GCM Authenticated</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-healthcare-textSecondary">Transport Tunneling:</span>
              <span className="font-mono text-healthcare-textPrimary font-semibold">TLS v1.3 with Mutual Authentication (mTLS)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-healthcare-textSecondary">Edge Key Rotation Interval:</span>
              <span className="font-mono text-teal-300 font-semibold">Every 24 Hours (Automated)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-healthcare-textSecondary">Last Cryptographic Handshake:</span>
              <span className="font-mono text-healthcare-textMuted">{mockPrivacySummary.lastKeyRotation}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-healthcare-textSecondary">HIPAA Security Rule §164.312:</span>
              <span className="font-medium text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Fully Compliant
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-healthcare-textSecondary">GDPR Article 9 (Special Category Health Data):</span>
              <span className="font-medium text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Pseudonymized &amp; Encrypted
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Edge Gateway Nodes */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-healthcare-textPrimary">
            Decentralized IoMT Edge Gateways
          </h3>
          <p className="text-xs text-healthcare-textSecondary mt-0.5">
            Distributed local computation nodes responsible for ingestion, local differential privacy noise, and low-latency alert triage
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-healthcare-textPrimary">
            <thead className="bg-healthcare-surfaceLight border-b border-healthcare-border uppercase text-healthcare-textSecondary font-semibold">
              <tr>
                <th className="px-4 py-3">Edge Node ID</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Active Streams</th>
                <th className="px-4 py-3">Latency</th>
                <th className="px-4 py-3">CPU / Memory</th>
                <th className="px-4 py-3">Bandwidth Saved</th>
                <th className="px-4 py-3">ε Budget Consumed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-healthcare-borderSubtle">
              {mockEdgeNodes.map((node) => (
                <tr key={node.id} className="hover:bg-healthcare-surfaceHover/60 transition-colors">
                  <td className="px-4 py-3 font-mono font-medium text-teal-300">
                    {node.id}
                  </td>
                  <td className="px-4 py-3 text-healthcare-textSecondary">
                    {node.location}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge type="status" value={node.status} size="sm" pulse={node.status === 'ONLINE'} />
                  </td>
                  <td className="px-4 py-3 font-mono">
                    {node.activeStreams} Wearables
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-400 font-semibold">
                    {node.latencyMs} ms
                  </td>
                  <td className="px-4 py-3 font-mono text-healthcare-textSecondary">
                    {node.cpuLoadPercent}% / {node.memoryUsagePercent}%
                  </td>
                  <td className="px-4 py-3 font-mono text-teal-300">
                    {node.bandwidthSavedPercent}%
                  </td>
                  <td className="px-4 py-3 font-mono text-healthcare-textPrimary">
                    {node.epsilonBudgetConsumed} / {node.epsilonBudgetTotal} ε
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
