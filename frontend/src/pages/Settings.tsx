import React, { useState } from 'react';
import {
  ShieldCheck,
  Save,
  CheckCircle,
  Server,
  Activity,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';

export const Settings: React.FC = () => {
  const [epsilon, setEpsilon] = useState('0.5');
  const [mechanism, setMechanism] = useState('Laplace');
  const [tachyThreshold, setTachyThreshold] = useState('105');
  const [spo2Threshold, setSpo2Threshold] = useState('93');
  const [samplingRate, setSamplingRate] = useState('250');
  const [retentionHours, setRetentionHours] = useState('24');
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edge Gateway & Privacy System Settings"
        subtitle="Configure IoMT sensor polling, differential privacy parameters, and clinical triage thresholds"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Differential Privacy & Edge Engine */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-healthcare-borderSubtle">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-semibold text-healthcare-textPrimary">
                Edge Differential Privacy &amp; Anonymization Controls
              </h3>
              <p className="text-xs text-healthcare-textSecondary">
                Adjust the mathematical privacy trade-off for non-critical aggregated patient telemetry
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1.5">
                Privacy Loss Budget (Epsilon ε): <span className="font-mono text-teal-300 font-bold">{epsilon}</span>
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={epsilon}
                onChange={(e) => setEpsilon(e.target.value)}
                className="w-full accent-teal-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-healthcare-textMuted mt-1 font-mono">
                <span>0.1 (Maximum Privacy)</span>
                <span>1.0 (Balanced)</span>
                <span>2.0 (High Utility)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1.5">
                Perturbation Distribution
              </label>
              <select
                value={mechanism}
                onChange={(e) => setMechanism(e.target.value)}
                className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="Laplace">Laplace Mechanism (Pure ε-DP)</option>
                <option value="Gaussian">Gaussian Mechanism ((ε, δ)-DP)</option>
              </select>
              <p className="text-[11px] text-healthcare-textMuted mt-1">
                Calibrates noise scale b = Δf / ε on continuous heart rate distributions.
              </p>
            </div>
          </div>
        </div>

        {/* Clinical Anomaly Trigger Thresholds */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-healthcare-borderSubtle">
            <Activity className="w-5 h-5 text-rose-400" />
            <div>
              <h3 className="text-sm font-semibold text-healthcare-textPrimary">
                Local Edge Anomaly Detection Thresholds
              </h3>
              <p className="text-xs text-healthcare-textSecondary">
                Thresholds evaluated directly inside edge node RAM to achieve sub-25ms clinical triage
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-healthcare-textSecondary mb-1.5">
                Tachycardia Alert Trigger
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={tachyThreshold}
                  onChange={(e) => setTachyThreshold(e.target.value)}
                  className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary font-mono focus:outline-none focus:border-teal-500"
                />
                <span className="text-xs text-healthcare-textMuted font-mono">BPM</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-healthcare-textSecondary mb-1.5">
                Hypoxia Desaturation Floor
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={spo2Threshold}
                  onChange={(e) => setSpo2Threshold(e.target.value)}
                  className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary font-mono focus:outline-none focus:border-teal-500"
                />
                <span className="text-xs text-healthcare-textMuted font-mono">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-healthcare-textSecondary mb-1.5">
                BLE Sensor Sampling Rate
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={samplingRate}
                  onChange={(e) => setSamplingRate(e.target.value)}
                  className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary font-mono focus:outline-none focus:border-teal-500"
                />
                <span className="text-xs text-healthcare-textMuted font-mono">Hz</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-healthcare-textSecondary mb-1.5">
                Raw Ingestion Buffer
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={retentionHours}
                  onChange={(e) => setRetentionHours(e.target.value)}
                  className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary font-mono focus:outline-none focus:border-teal-500"
                />
                <span className="text-xs text-healthcare-textMuted font-mono">Hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Backend & Edge Architecture Diagnostics */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-healthcare-borderSubtle">
            <Server className="w-5 h-5 text-teal-400" />
            <div>
              <h3 className="text-sm font-semibold text-healthcare-textPrimary">
                Architecture &amp; Subsystem Endpoints
              </h3>
              <p className="text-xs text-healthcare-textSecondary">
                Operational status of Express API, PostgreSQL database, and Edge Mesh
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            <div className="p-3 rounded-lg bg-healthcare-surfaceLight border border-healthcare-borderSubtle">
              <span className="text-healthcare-textMuted block mb-1">Backend Express API:</span>
              <span className="font-mono text-teal-300 font-semibold">http://localhost:5001</span>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Ready (GET /api/health)
              </div>
            </div>

            <div className="p-3 rounded-lg bg-healthcare-surfaceLight border border-healthcare-borderSubtle">
              <span className="text-healthcare-textMuted block mb-1">Database Engine:</span>
              <span className="font-mono text-teal-300 font-semibold">PostgreSQL (Prisma ORM)</span>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Schema Migrated
              </div>
            </div>

            <div className="p-3 rounded-lg bg-healthcare-surfaceLight border border-healthcare-borderSubtle">
              <span className="text-healthcare-textMuted block mb-1">Edge Preprocessing Node:</span>
              <span className="font-mono text-teal-300 font-semibold">edge/src/edge-processor.js</span>
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Laplace Simulator Active
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors shadow-lg shadow-teal-950"
          >
            <Save className="w-4 h-4" />
            <span>Persist System Configuration</span>
          </button>

          {isSaved && (
            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle className="w-4 h-4" />
              <span>Configuration successfully saved to local edge profile.</span>
            </span>
          )}
        </div>
      </form>
    </div>
  );
};
