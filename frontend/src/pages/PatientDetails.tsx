import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShieldCheck,
  User,
  Radio,
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
  WifiOff,
  AlertTriangle,
  X,
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
  acknowledgeAlertApi,
} from '../services/api';
import { VitalTimeSeriesPoint } from '../types';
import { VitalReading } from '../types/vitals';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

export const PatientDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { socket, isConnected, subscribePatient, unsubscribePatient } = useSocket();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [liveLatestReading, setLiveLatestReading] = useState<VitalReading | null>(null);
  const [liveChartTelemetry, setLiveChartTelemetry] = useState<VitalTimeSeriesPoint[]>([]);
  const [liveTableReadings, setLiveTableReadings] = useState<VitalReading[]>([]);
  const [activeAlert, setActiveAlert] = useState<any | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<'CONNECTING' | 'SUBSCRIBED' | 'UNAUTHORIZED'>('CONNECTING');

  // Fetch real patient profile from PostgreSQL
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

  // Initial hydration of latest vitals
  const { data: initialLatestVitals } = useQuery({
    queryKey: ['patient-latest-vitals', id],
    queryFn: () => getLatestPatientVitalsApi(id!),
    enabled: !!id,
  });

  // Initial hydration of historical telemetry
  const { data: initialHistory } = useQuery({
    queryKey: ['patient-historical-vitals', id],
    queryFn: () => getPatientVitalsApi(id!, { limit: 40 }),
    enabled: !!id,
  });

  // Hydrate local state on query load
  useEffect(() => {
    if (initialLatestVitals?.data && !liveLatestReading) {
      setLiveLatestReading(initialLatestVitals.data);
    }
  }, [initialLatestVitals]);

  useEffect(() => {
    if (initialHistory?.data && liveChartTelemetry.length === 0) {
      const initialPoints: VitalTimeSeriesPoint[] = initialHistory.data
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
      setLiveChartTelemetry(initialPoints);
      setLiveTableReadings(initialHistory.data);
    }
  }, [initialHistory]);

  // Real-Time Socket.IO Subscription & Event Listeners
  useEffect(() => {
    if (!id || !socket) return;

    // 1. Subscribe to authorized patient room
    subscribePatient(id, (res) => {
      if (res?.success) {
        setSubscriptionStatus('SUBSCRIBED');
      } else if (res?.error === 'UNAUTHORIZED_PATIENT_ACCESS') {
        setSubscriptionStatus('UNAUTHORIZED');
      }
    });

    // 2. Real-time vitals update listener
    const handleVitalsUpdate = (payload: any) => {
      if (payload.patientId === id && payload.reading) {
        const r = payload.reading;
        setLiveLatestReading(r);

        const newPoint: VitalTimeSeriesPoint = {
          time: new Date(r.recordedAt || payload.broadcastAt).toLocaleTimeString([], {
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
        };

        // Maintain rolling time window of max 50 data points in memory
        setLiveChartTelemetry((prev) => [...prev.slice(-49), newPoint]);

        // Prepend to telemetry table
        setLiveTableReadings((prev) => [r, ...prev.slice(0, 24)]);
      }
    };

    // 3. Real-time alert listeners
    const handleNewAlert = (payload: any) => {
      if (payload.patientId === id && payload.alert) {
        setActiveAlert(payload.alert);
      }
    };

    const handleAlertUpdate = (payload: any) => {
      if (payload.patientId === id) {
        if (payload.alert?.status === 'RESOLVED' || payload.alert?.isResolved) {
          setActiveAlert(null);
        } else if (payload.alert) {
          setActiveAlert(payload.alert);
        }
      }
    };

    // 4. Monitoring status listener
    const handleMonitoringStatus = (data: any) => {
      if (data.patientId === id) {
        if (data.status === 'SUBSCRIBED') {
          setSubscriptionStatus('SUBSCRIBED');
        } else if (data.status === 'UNAUTHORIZED') {
          setSubscriptionStatus('UNAUTHORIZED');
        }
      }
    };

    socket.on('vitals:update', handleVitalsUpdate);
    socket.on('alert:new', handleNewAlert);
    socket.on('alert:update', handleAlertUpdate);
    socket.on('monitoring:status', handleMonitoringStatus);

    return () => {
      unsubscribePatient(id);
      socket.off('vitals:update', handleVitalsUpdate);
      socket.off('alert:new', handleNewAlert);
      socket.off('alert:update', handleAlertUpdate);
      socket.off('monitoring:status', handleMonitoringStatus);
    };
  }, [id, socket, isConnected]);

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
        <LoadingState message="Connecting to patient stream & fetching biometrics..." rows={5} />
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
      {/* Real-Time Live Alert Toast Banner */}
      {activeAlert && (
        <div className="p-4 rounded-xl bg-rose-950/90 border border-rose-500/60 shadow-2xl flex items-center justify-between animate-bounce">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300">
                  Real-Time Edge Anomaly Alert [{activeAlert.severity}]
                </span>
                <span className="text-xs text-rose-200 font-mono">
                  {new Date(activeAlert.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">{activeAlert.message}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!activeAlert.isAcknowledged && (
              <button
                onClick={async () => {
                  try {
                    await acknowledgeAlertApi(activeAlert.id);
                    setActiveAlert((prev: any) =>
                      prev ? { ...prev, isAcknowledged: true, status: 'ACKNOWLEDGED' } : null
                    );
                  } catch (e) {
                    console.error('Failed to acknowledge alert', e);
                  }
                }}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-teal-600 hover:bg-teal-500 text-white transition-colors"
              >
                Acknowledge
              </button>
            )}
            <Link
              to="/alerts"
              className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-colors"
            >
              Triage in Alerts
            </Link>
            <button
              onClick={() => setActiveAlert(null)}
              className="p-1 text-rose-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Header with Navigation & Socket Status */}
      <PageHeader
        title={patient.name}
        subtitle={`${patient.patientCode} • ${age} years old • ${patient.gender} • DOB: ${formattedDOB}`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Patients', href: '/patients' },
          { label: patient.name },
        ]}
        badge={
          <div className="flex items-center space-x-2">
            <StatusBadge
              type="risk"
              value={patient.riskLevel}
              pulse={patient.riskLevel === 'CRITICAL'}
            />
            {/* Real-Time Connection Indicator */}
            {isConnected ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Socket Live (Push)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <WifiOff className="w-3 h-3" />
                <span>Reconnecting...</span>
              </span>
            )}
          </div>
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
                {patient.assignedDoctor?.department || 'Cardiology & Remote ICU'}
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
              <span>Clinical Channel</span>
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
              <span>Room Channel:</span>
              <span className="font-mono text-emerald-400">patient:{patient.id.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span>Access Policy:</span>
              <span className="font-mono text-[11px] text-emerald-400">
                {subscriptionStatus === 'SUBSCRIBED' ? 'Authorized (Encrypted)' : subscriptionStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* LIVE REAL-TIME IoMT BIOMETRICS STREAM SECTION (SOCKET.IO POWERED) */}
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
                  Real-Time IoMT Telemetry Stream
                </h2>
                <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Simulated IoMT Feed</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  WebSocket Push
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Synchronized live biometrics delivered directly via Socket.IO events (Zero manual refresh)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {liveLatestReading && (
              <span className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg border ${getScenarioBadgeClass(liveLatestReading.scenario)}`}>
                Scenario: {liveLatestReading.scenario}
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

        {/* 4 Live Vitals Cards (Updates instantaneously on socket event) */}
        {liveLatestReading ? (
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
                className={`text-3xl font-bold font-mono mt-2 transition-all ${
                  liveLatestReading.heartRate > 120 || liveLatestReading.heartRate < 55
                    ? 'text-rose-400'
                    : liveLatestReading.heartRate > 100
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {liveLatestReading.heartRate}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Target: 60-100 bpm</span>
                <span className="font-semibold text-xs">
                  {liveLatestReading.heartRate > 120 ? 'Tachycardia' : liveLatestReading.heartRate < 55 ? 'Bradycardia' : 'Normal'}
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
                className={`text-3xl font-bold font-mono mt-2 transition-all ${
                  liveLatestReading.spo2 < 90
                    ? 'text-rose-400'
                    : liveLatestReading.spo2 < 95
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {liveLatestReading.spo2}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Threshold: &ge;95%</span>
                <span className="font-semibold text-xs">
                  {liveLatestReading.spo2 < 90 ? 'Hypoxia Alert' : liveLatestReading.spo2 < 95 ? 'Borderline' : 'Optimal'}
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
                className={`text-3xl font-bold font-mono mt-2 transition-all ${
                  liveLatestReading.bloodPressureSys >= 170
                    ? 'text-rose-400'
                    : liveLatestReading.bloodPressureSys >= 135
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {liveLatestReading.bloodPressureSys}/{liveLatestReading.bloodPressureDia}
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Standard: 120/80</span>
                <span className="font-semibold text-xs">
                  {liveLatestReading.bloodPressureSys >= 180 ? 'Crisis' : liveLatestReading.bloodPressureSys >= 130 ? 'Elevated' : 'Normal'}
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
                className={`text-3xl font-bold font-mono mt-2 transition-all ${
                  liveLatestReading.temperature >= 38.5
                    ? 'text-rose-400'
                    : liveLatestReading.temperature >= 37.5
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}
              >
                {liveLatestReading.temperature}°C
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Range: 36.5-37.5</span>
                <span className="font-semibold text-xs">
                  {liveLatestReading.temperature >= 38.5 ? 'High Fever' : liveLatestReading.temperature >= 37.5 ? 'Mild Pyrexia' : 'Afebrile'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 p-8 text-center bg-slate-950/50 rounded-xl border border-slate-800">
            <Radio className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
            <p className="text-sm text-slate-300 font-medium">
              Waiting for live biometric stream from IoMT edge device...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Ensure the Edge simulator node is running (`npm run simulate` in edge/).
            </p>
          </div>
        )}

        {liveLatestReading && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-800/80">
            <div className="flex items-center space-x-2">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>Event Timestamp: {new Date(liveLatestReading.recordedAt).toLocaleString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>Device: {liveLatestReading.device?.deviceCode || 'DEV-ACTIVE'}</span>
              <span>•</span>
              <span className="text-emerald-400">PostgreSQL Committed &amp; Dispatched</span>
            </div>
          </div>
        )}
      </div>

      {/* Visual Telemetry Trends (Real-Time Live Recharts without refresh) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-healthcare-textPrimary">
              Continuous Heart Rate Waveform
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Window ({liveChartTelemetry.length} pts)
            </span>
          </div>
          <p className="text-xs text-healthcare-textSecondary mb-4">
            Real-time streaming via Socket.IO with differential privacy Laplace noise applied (ε=0.5)
          </p>
          <HeartRateChart data={liveChartTelemetry} height={250} />
        </div>

        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5 shadow-xl">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-semibold text-healthcare-textPrimary">
              SpO2 Oxygen Saturation Profile
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Surveillance Stream
            </span>
          </div>
          <p className="text-xs text-healthcare-textSecondary mb-4">
            Live rolling time window with automated threshold surveillance for hypoxic desaturation
          </p>
          <SpO2Chart data={liveChartTelemetry} height={250} />
        </div>
      </div>

      {/* Historical Telemetry Stream Log Table (Updates Live) */}
      <div className="bg-healthcare-surface border border-healthcare-border rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-healthcare-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-semibold text-white">Live Telemetry Ingestion Log</h3>
            <span className="text-xs font-mono text-slate-400">({liveTableReadings.length} records in memory window)</span>
          </div>
          <span className="text-xs text-emerald-400 font-mono flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Event Driven (Socket.IO)</span>
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
              {liveTableReadings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-8 text-center text-slate-500 font-sans">
                    Waiting for live telemetry events from edge device...
                  </td>
                </tr>
              ) : (
                liveTableReadings.slice(0, 15).map((r, idx) => (
                  <tr key={r.id || idx} className="hover:bg-teal-950/20 transition-colors">
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
