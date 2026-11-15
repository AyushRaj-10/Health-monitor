import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Activity,
  Battery,
  ShieldCheck,
  User,
  Radio,
  Thermometer,
  Wind,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { HeartRateChart } from '../components/charts/HeartRateChart';
import { SpO2Chart } from '../components/charts/SpO2Chart';
import { EmptyState } from '../components/common/EmptyState';
import { mockPatients, mockHeartRateTrends, mockSpO2Trends, mockAlerts } from '../data/mockData';

export const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const patient = mockPatients.find((p) => p.id === id) || mockPatients[0];

  if (!patient) {
    return (
      <EmptyState
        title="Patient Record Not Found"
        description="The requested medical record number or patient identifier does not exist in the active telemetry registry."
        actionText="Back to Patients"
        onAction={() => navigate('/patients')}
      />
    );
  }

  const patientAlerts = mockAlerts.filter((a) => a.patientId === patient.id);

  return (
    <div className="space-y-6">
      {/* Header with Navigation */}
      <PageHeader
        title={patient.fullName}
        subtitle={`${patient.medicalRecordNumber} • ${patient.age} years old • ${patient.gender} • Admitted: ${patient.admissionDate}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Patients', href: '/patients' },
          { label: patient.fullName },
        ]}
        badge={
          <StatusBadge
            type="risk"
            value={patient.riskLevel}
            pulse={patient.riskLevel === 'CRITICAL'}
          />
        }
        actions={
          <button
            onClick={() => navigate('/patients')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover text-healthcare-textSecondary text-xs font-medium border border-healthcare-border transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Roster</span>
          </button>
        }
      />

      {/* Patient Vital Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Heart Rate */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-healthcare-textSecondary mb-2">
            <span className="font-medium">Heart Rate</span>
            <Heart className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-healthcare-textPrimary">
            {patient.vitals.heartRate} <span className="text-xs font-sans text-healthcare-textMuted font-normal">bpm</span>
          </div>
          <div className="text-[11px] text-teal-400 mt-1">Normal: 60-100</div>
        </div>

        {/* SpO2 */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-healthcare-textSecondary mb-2">
            <span className="font-medium">Oxygen Saturation</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-healthcare-textPrimary">
            {patient.vitals.spo2} <span className="text-xs font-sans text-healthcare-textMuted font-normal">%</span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">Target &gt; 94%</div>
        </div>

        {/* Blood Pressure */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-healthcare-textSecondary mb-2">
            <span className="font-medium">Blood Pressure</span>
            <span className="text-xs text-teal-400 font-mono">SYS/DIA</span>
          </div>
          <div className="text-2xl font-bold font-mono text-healthcare-textPrimary">
            {patient.vitals.bloodPressureSys}/{patient.vitals.bloodPressureDia}
          </div>
          <div className="text-[11px] text-healthcare-textMuted mt-1">mmHg</div>
        </div>

        {/* Respiratory Rate */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-healthcare-textSecondary mb-2">
            <span className="font-medium">Respiration</span>
            <Wind className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-healthcare-textPrimary">
            {patient.vitals.respiratoryRate} <span className="text-xs font-sans text-healthcare-textMuted font-normal">rpm</span>
          </div>
          <div className="text-[11px] text-healthcare-textMuted mt-1">Normal: 12-20</div>
        </div>

        {/* Body Temperature */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-xs text-healthcare-textSecondary mb-2">
            <span className="font-medium">Temperature</span>
            <Thermometer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-healthcare-textPrimary">
            {patient.vitals.temperature}° <span className="text-xs font-sans text-healthcare-textMuted font-normal">C</span>
          </div>
          <div className="text-[11px] text-healthcare-textMuted mt-1">Afebrile</div>
        </div>
      </div>

      {/* IoMT Device & Privacy Metadata Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Device Information */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2 text-xs font-semibold text-healthcare-textPrimary">
              <Radio className="w-4 h-4 text-teal-400" />
              <span>IoMT Sensor Hardware</span>
            </div>
            <StatusBadge type="device" value={patient.deviceStatus} size="sm" />
          </div>
          <div className="text-xs space-y-1.5 text-healthcare-textSecondary pt-1">
            <div className="flex justify-between">
              <span>Device Name:</span>
              <span className="font-medium text-healthcare-textPrimary">{patient.deviceName}</span>
            </div>
            <div className="flex justify-between">
              <span>Device Identifier:</span>
              <span className="font-mono text-healthcare-textPrimary">{patient.deviceId}</span>
            </div>
            <div className="flex justify-between">
              <span>Battery Level:</span>
              <span className="flex items-center gap-1 font-mono text-teal-300">
                <Battery className="w-3.5 h-3.5 text-teal-400" />
                {patient.deviceBattery}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Telemetry Node:</span>
              <span className="font-mono text-[11px] text-teal-300">{patient.edgeNodeId}</span>
            </div>
          </div>
        </div>

        {/* Differential Privacy & Edge Engine */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2 text-xs font-semibold text-teal-300">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Edge Differential Privacy</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
              ε = 0.5 Bound
            </span>
          </div>
          <div className="text-xs space-y-1.5 text-healthcare-textSecondary pt-1">
            <div className="flex justify-between">
              <span>Perturbation Method:</span>
              <span className="text-healthcare-textPrimary">Laplace Mechanism</span>
            </div>
            <div className="flex justify-between">
              <span>Today's ε Consumption:</span>
              <span className="font-mono text-teal-300">{patient.differentialPrivacyBudgetUsed} ε</span>
            </div>
            <div className="flex justify-between">
              <span>Noise Added to Summary:</span>
              <span className="font-mono text-healthcare-textPrimary">{patient.noiseAdded > 0 ? `+${patient.noiseAdded}` : patient.noiseAdded}</span>
            </div>
            <div className="flex justify-between">
              <span>Edge Data Minimization:</span>
              <span className="font-mono text-emerald-400">79.2% Bandwidth Saved</span>
            </div>
          </div>
        </div>

        {/* Clinician & Location */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2 text-xs font-semibold text-healthcare-textPrimary">
              <User className="w-4 h-4 text-teal-400" />
              <span>Clinical Care Team</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-healthcare-surfaceLight text-healthcare-textSecondary">
              Active Shift
            </span>
          </div>
          <div className="text-xs space-y-1.5 text-healthcare-textSecondary pt-1">
            <div className="flex justify-between">
              <span>Attending Physician:</span>
              <span className="font-medium text-healthcare-textPrimary">{patient.assignedDoctor}</span>
            </div>
            <div className="flex justify-between">
              <span>Location / Ward:</span>
              <span className="text-healthcare-textPrimary">{patient.roomOrLocation}</span>
            </div>
            <div className="flex justify-between">
              <span>Clinical Condition:</span>
              <span className="text-teal-300 font-medium truncate max-w-[160px]">{patient.condition}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Synchronized:</span>
              <span className="text-healthcare-textMuted">{patient.vitals.lastUpdated}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Vital Waveforms & Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-healthcare-textPrimary mb-1">
            Heart Rate Trend (Last 12 Hours)
          </h3>
          <p className="text-xs text-healthcare-textSecondary mb-4">
            Continuous telemetry with edge anomaly spike markers
          </p>
          <HeartRateChart data={mockHeartRateTrends} height={260} />
        </div>

        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-healthcare-textPrimary mb-1">
            Oxygen Saturation Profile (SpO2)
          </h3>
          <p className="text-xs text-healthcare-textSecondary mb-4">
            Hypoxia surveillance band with ambulatory reading intervals
          </p>
          <SpO2Chart data={mockSpO2Trends} height={260} />
        </div>
      </div>

      {/* Clinical Notes & Active Alerts for this Patient */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-healthcare-textPrimary">
              Attending Clinician Progress Notes
            </h3>
          </div>
          <div className="bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-4 text-xs text-healthcare-textSecondary leading-relaxed">
            {patient.notes || 'Routine remote telemetry surveillance in progress. All edge encryption layers verified.'}
          </div>
        </div>

        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-healthcare-textPrimary">
              Patient Alerts ({patientAlerts.length})
            </h3>
          </div>
          {patientAlerts.length === 0 ? (
            <p className="text-xs text-healthcare-textMuted py-4">
              No active unacknowledged alerts for this patient.
            </p>
          ) : (
            <div className="space-y-2">
              {patientAlerts.map((alt) => (
                <div
                  key={alt.id}
                  className="p-2.5 rounded-lg bg-healthcare-surfaceLight border border-healthcare-borderSubtle text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-healthcare-textPrimary">{alt.vitalType}</span>
                    <StatusBadge type="alert" value={alt.severity} size="sm" />
                  </div>
                  <p className="text-[11px] text-healthcare-textSecondary">{alt.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
