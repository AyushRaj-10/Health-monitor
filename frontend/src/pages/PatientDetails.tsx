import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShieldCheck,
  User,
  Radio,
  FileText,
  Edit3,
  Trash2,
  Heart,
  Gauge,
  Thermometer,
  Activity,
  Cpu,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { HeartRateChart } from '../components/charts/HeartRateChart';
import { SpO2Chart } from '../components/charts/SpO2Chart';
import { EditPatientModal } from '../components/patients/EditPatientModal';
import {
  getPatientByIdApi,
  deletePatientApi,
  getPatientVitalsApi,
  getLatestPatientVitalsApi,
} from '../services/api';
import { VitalTimeSeriesPoint } from '../types';
import { useAuth } from '../context/AuthContext';

export const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch real patient by ID from PostgreSQL
  const {
    data: patient,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatientByIdApi(id!),
    enabled: !!id,
  });

  // Fetch latest real vital reading from PostgreSQL (poll every 3s for live simulation updates)
  const { data: latestVitalsData } = useQuery({
    queryKey: ['patient-latest-vitals', id],
    queryFn: () => getLatestPatientVitalsApi(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  // Fetch historical vital telemetry from PostgreSQL (poll every 3s)
  const { data: historicalVitalsData } = useQuery({
    queryKey: ['patient-historical-vitals', id],
    queryFn: () => getPatientVitalsApi(id!, { limit: 40 }),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const deleteMutation = useMutation({
    mutationFn: (patientId: string) => deletePatientApi(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate('/patients');
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error?.message || 'Failed to remove patient record');
    },
  });

  if (isLoading) {
    return (
      <div className="py-12">
        <LoadingState message="Fetching patient biometrics & medical history from PostgreSQL..." rows={5} />
      </div>
    );
  }

  if (isError || !patient) {
    return (
      <div className="py-8">
        <ErrorState
          title="Patient Record Not Found"
          message={(error as any)?.message || `No patient found with ID: ${id}`}
          onRetry={() => refetch()}
        />
        <div className="mt-4 text-center">
          <button
            onClick={() => navigate('/patients')}
            className="text-xs text-teal-400 hover:underline cursor-pointer"
          >
            ← Return to Patient Directory
          </button>
        </div>
      </div>
    );
  }

  const calculateAge = (dobString: string): number => {
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const age = calculateAge(patient.dateOfBirth);
  const formattedDOB = new Date(patient.dateOfBirth).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const canDelete = user?.role === 'ADMIN' || patient.assignedDoctorId === user?.id;

  const handleDelete = () => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete patient ${patient.name} (${patient.patientCode})?`
    );
    if (confirmed) {
      deleteMutation.mutate(patient.id);
    }
  };

  const latestReading = latestVitalsData?.data;
  const rawReadings = historicalVitalsData?.data || [];

  // Transform historical PostgreSQL telemetry readings for charts (chronological order)
  const chartTelemetry: VitalTimeSeriesPoint[] = rawReadings
    .slice()
    .reverse()
    .map((r) => ({
      time: new Date(r.recordedAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      heartRate: r.heartRate,
      spo2: r.spo2,
      bloodPressureSys: r.bloodPressureSys,
      bloodPressureDia: r.bloodPressureDia,
      temperature: r.temperature,
      respiratoryRate: r.respiratoryRate ?? undefined,
      isAnomaly: r.scenario !== 'NORMAL',
    }));

  const getScenarioBadgeClass = (scenario: string) => {
    switch (scenario) {
      case 'NORMAL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'WARNING_ELEVATED_HR':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'CRITICAL_TACHYCARDIA':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
      case 'HYPOXIA':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'HYPERTENSIVE_CRISIS':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'FEVER_INFECTION':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation & Actions */}
      <PageHeader
        title={patient.name}
        subtitle={`${patient.patientCode} • ${age} years old • ${patient.gender} • DOB: ${formattedDOB}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Patients', href: '/patients' },
          { label: patient.name },
        ]}
        badge={
          <StatusBadge
            type="risk"
            value={patient.riskLevel}
            pulse={patient.riskLevel === 'CRITICAL'}
          />
        }
        actions={
          <div className="flex items-center gap-2">
            <Link
              to="/devices"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold transition-colors"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Simulator Control</span>
            </Link>
            <button
              onClick={() => setIsEditOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
            {canDelete && (
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-healthcare-surfaceLight hover:bg-rose-950 hover:text-rose-400 text-healthcare-textSecondary text-xs font-medium border border-healthcare-borderSubtle transition-colors cursor-pointer"
                title="Remove Patient"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
            <button
              onClick={() => navigate('/patients')}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover text-healthcare-textSecondary text-xs font-medium border border-healthcare-border transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          </div>
        }
      />

      {/* Patient Profile & Clinical Care Team Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Core Clinical Metadata */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2 text-xs font-semibold text-healthcare-textPrimary">
              <User className="w-4 h-4 text-teal-400" />
              <span>Demographic &amp; Contact</span>
            </div>
            <StatusBadge type="status" value={patient.status} size="sm" />
          </div>
          <div className="text-xs space-y-1.5 text-healthcare-textSecondary pt-1">
            <div className="flex justify-between">
              <span>Patient Identifier:</span>
              <span className="font-mono text-teal-300 font-semibold">{patient.patientCode}</span>
            </div>
            <div className="flex justify-between">
              <span>Date of Birth:</span>
              <span className="font-mono text-healthcare-textPrimary">{formattedDOB}</span>
            </div>
            <div className="flex justify-between">
              <span>Gender:</span>
              <span className="text-healthcare-textPrimary">{patient.gender}</span>
            </div>
            <div className="flex justify-between">
              <span>Contact Details:</span>
              <span className="text-healthcare-textPrimary truncate max-w-[170px]" title={patient.contactInformation || 'None'}>
                {patient.contactInformation || 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Attending Physician Card */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2 text-xs font-semibold text-healthcare-textPrimary">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>Attending Physician</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
              Assigned
            </span>
          </div>
          <div className="text-xs space-y-1.5 text-healthcare-textSecondary pt-1">
            <div className="flex justify-between">
              <span>Physician Name:</span>
              <span className="font-medium text-healthcare-textPrimary">
                {patient.assignedDoctor?.name || 'Unassigned'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Department:</span>
              <span className="text-healthcare-textPrimary">
                {patient.assignedDoctor?.department || 'Cardiology / Telemetry'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Physician Email:</span>
              <span className="font-mono text-[11px] text-teal-300">
                {patient.assignedDoctor?.email || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Ward / Telemetry Zone:</span>
              <span className="text-healthcare-textPrimary">{patient.roomOrLocation || 'Tele-Rehab Zone A'}</span>
            </div>
          </div>
        </div>

        {/* Condition & Edge Policy */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
            <div className="flex items-center gap-2 text-xs font-semibold text-healthcare-textPrimary">
              <Radio className="w-4 h-4 text-teal-400" />
              <span>Clinical Diagnosis</span>
            </div>
            <StatusBadge type="risk" value={patient.riskLevel} size="sm" />
          </div>
          <div className="text-xs space-y-1.5 text-healthcare-textSecondary pt-1">
            <div className="flex justify-between">
              <span>Diagnosis:</span>
              <span className="text-teal-300 font-semibold truncate max-w-[170px]" title={patient.condition || ''}>
                {patient.condition || 'Observation'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Differential Privacy:</span>
              <span className="font-mono text-emerald-400">ε=0.5 Bound Active</span>
            </div>
            <div className="flex justify-between">
              <span>Provisioned Unit:</span>
              <span className="font-mono text-[11px] text-emerald-400">
                {latestReading?.device?.deviceCode || 'DEV-Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* STAGE 3: LIVE IoMT BIOMETRICS STREAM SECTION */}
      <div className="bg-[#071311] border border-emerald-500/30 rounded-xl p-5 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-500/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Live IoMT Telemetry Feed
                </h2>
                {/* Clear Identification of Simulated Data (Requirement) */}
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Simulated IoMT Feed</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Continuous biometric stream from edge gateway via authenticated HTTP ingestion
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {latestReading && (
              <span className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border ${getScenarioBadgeClass(latestReading.scenario)}`}>
                Scenario: {latestReading.scenario}
              </span>
            )}
            <Link
              to="/devices"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center space-x-1"
            >
              <span>Simulator Control</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* 4 Live Vitals Cards */}
        {latestReading ? (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Heart Rate */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center space-x-1.5">
                  <Heart className="w-4 h-4 text-rose-400" />
                  <span className="text-white font-medium">Heart Rate</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">BPM</span>
              </div>
              <div
                className={`text-3xl font-bold font-mono mt-2 ${
                  latestReading.heartRate > 120 || latestReading.heartRate < 55
                    ? 'text-rose-400'
                    : latestReading.heartRate > 100
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {latestReading.heartRate}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Target: 60-100 bpm</span>
                <span className="font-semibold text-xs">
                  {latestReading.heartRate > 120 ? 'Tachycardia' : latestReading.heartRate < 55 ? 'Bradycardia' : 'Normal'}
                </span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center space-x-1.5">
                  <Gauge className="w-4 h-4 text-sky-400" />
                  <span className="text-white font-medium">SpO2 Saturation</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">%</span>
              </div>
              <div
                className={`text-3xl font-bold font-mono mt-2 ${
                  latestReading.spo2 < 90
                    ? 'text-rose-400'
                    : latestReading.spo2 < 95
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {latestReading.spo2}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Threshold: &ge;95%</span>
                <span className="font-semibold text-xs">
                  {latestReading.spo2 < 90 ? 'Hypoxia Alert' : latestReading.spo2 < 95 ? 'Borderline' : 'Optimal'}
                </span>
              </div>
            </div>

            {/* Blood Pressure */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-purple-400" />
                  <span className="text-white font-medium">Blood Pressure</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">mmHg</span>
              </div>
              <div
                className={`text-3xl font-bold font-mono mt-2 ${
                  latestReading.bloodPressureSys >= 170
                    ? 'text-rose-400'
                    : latestReading.bloodPressureSys >= 135
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {latestReading.bloodPressureSys}/{latestReading.bloodPressureDia}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Standard: 120/80</span>
                <span className="font-semibold text-xs">
                  {latestReading.bloodPressureSys >= 180 ? 'Crisis' : latestReading.bloodPressureSys >= 130 ? 'Elevated' : 'Normal'}
                </span>
              </div>
            </div>

            {/* Body Temperature */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/20">
              <div className="flex items-center justify-between text-slate-400 text-xs">
                <span className="flex items-center space-x-1.5">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  <span className="text-white font-medium">Body Temp</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">°C</span>
              </div>
              <div
                className={`text-3xl font-bold font-mono mt-2 ${
                  latestReading.temperature >= 38.5
                    ? 'text-rose-400'
                    : latestReading.temperature >= 37.5
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {latestReading.temperature}°C
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Range: 36.5-37.5</span>
                <span className="font-semibold text-xs">
                  {latestReading.temperature >= 38.5 ? 'High Fever' : latestReading.temperature >= 37.5 ? 'Mild Pyrexia' : 'Afebrile'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800">
            <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-slate-300 font-medium">
              No live telemetry recorded yet for this patient.
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Associate an IoMT device in the Device Inventory or launch the Edge Simulator to begin streaming.
            </p>
            <Link
              to="/devices"
              className="mt-3 inline-flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Go to IoMT Device Manager</span>
            </Link>
          </div>
        )}

        {latestReading && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Ingested: {new Date(latestReading.recordedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Device: {latestReading.device?.deviceCode || 'DEV-1001'}</span>
              <span>•</span>
              <span className="text-emerald-400">PostgreSQL Persisted</span>
            </div>
          </div>
        )}
      </div>

      {/* Medical History Section */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-healthcare-textPrimary">
            Medical History &amp; Comorbidities (PostgreSQL Record)
          </h3>
        </div>
        <div className="bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-4 text-xs text-healthcare-textSecondary leading-relaxed">
          {patient.medicalHistory ? (
            <p className="whitespace-pre-line">{patient.medicalHistory}</p>
          ) : (
            <p className="italic text-healthcare-textMuted">
              No previous medical history recorded. Click "Edit Details" to update the patient chart.
            </p>
          )}
        </div>
      </div>

      {/* Visual Telemetry Trends (Real Ingested Telemetry) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-healthcare-textPrimary">
              Heart Rate Telemetry Stream
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Stream ({chartTelemetry.length} pts)
            </span>
          </div>
          <p className="text-xs text-healthcare-textSecondary mb-4">
            Live telemetry with Laplace differential privacy preservation (ε=0.5)
          </p>
          <HeartRateChart data={chartTelemetry} height={250} />
        </div>

        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-healthcare-textPrimary">
              SpO2 Oxygen Saturation Profile
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Automated Surveillance
            </span>
          </div>
          <p className="text-xs text-healthcare-textSecondary mb-4">
            Continuous threshold surveillance for acute hypoxic desaturation (&lt;90%)
          </p>
          <SpO2Chart data={chartTelemetry} height={250} />
        </div>
      </div>

      {/* Historical Telemetry Stream Log Table */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-healthcare-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Recent Telemetry Ingestion Log</h3>
            <span className="text-xs font-mono text-slate-400">({rawReadings.length} records)</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Auto-refreshing every 3s
          </span>
        </div>

        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider">
              <tr>
                <th className="px-5 py-2.5">Timestamp</th>
                <th className="px-4 py-2.5">Scenario Preset</th>
                <th className="px-4 py-2.5">Heart Rate</th>
                <th className="px-4 py-2.5">SpO2</th>
                <th className="px-4 py-2.5">Blood Pressure</th>
                <th className="px-4 py-2.5">Temperature</th>
                <th className="px-4 py-2.5">Resp Rate</th>
                <th className="px-4 py-2.5 text-right">Data Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {rawReadings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500 font-sans">
                    No historical telemetry records found for this patient.
                  </td>
                </tr>
              ) : (
                rawReadings.slice(0, 15).map((r) => (
                  <tr key={r.id} className="hover:bg-teal-950/20 transition-colors">
                    <td className="px-5 py-2.5 text-slate-300">
                      {new Date(r.recordedAt).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getScenarioBadgeClass(r.scenario)}`}>
                        {r.scenario}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-2.5 font-bold ${
                        r.heartRate > 120 || r.heartRate < 55 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {r.heartRate} bpm
                    </td>
                    <td
                      className={`px-4 py-2.5 font-bold ${
                        r.spo2 < 90 ? 'text-rose-400' : 'text-emerald-400'
                      }`}
                    >
                      {r.spo2}%
                    </td>
                    <td
                      className={`px-4 py-2.5 ${
                        r.bloodPressureSys >= 170 ? 'text-rose-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      {r.bloodPressureSys}/{r.bloodPressureDia}
                    </td>
                    <td
                      className={`px-4 py-2.5 ${
                        r.temperature >= 38.5 ? 'text-rose-400 font-bold' : 'text-slate-300'
                      }`}
                    >
                      {r.temperature}°C
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {r.respiratoryRate ? `${r.respiratoryRate} bpm` : '--'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-sans">
                      <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        SIMULATED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      <EditPatientModal
        isOpen={isEditOpen}
        patient={patient}
        onClose={() => setIsEditOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['patient', id] });
          queryClient.invalidateQueries({ queryKey: ['patients'] });
        }}
      />
    </div>
  );
};
