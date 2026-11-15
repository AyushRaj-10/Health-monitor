import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShieldCheck,
  User,
  Radio,
  FileText,
  Edit3,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { HeartRateChart } from '../components/charts/HeartRateChart';
import { SpO2Chart } from '../components/charts/SpO2Chart';
import { EditPatientModal } from '../components/patients/EditPatientModal';
import { getPatientByIdApi, deletePatientApi } from '../services/api';
import { mockHeartRateTrends, mockSpO2Trends } from '../data/mockData';
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
                {patient.assignedDoctor?.department || 'General Medicine'}
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
              <span className="text-healthcare-textPrimary">{patient.roomOrLocation || 'Tele-Rehab'}</span>
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
              <span>Registered On:</span>
              <span className="font-mono text-[11px] text-healthcare-textMuted">
                {new Date(patient.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
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

      {/* Visual Telemetry Trends (Maintained from Stage 1 for UI Continuity) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-healthcare-textPrimary mb-1">
            Continuous Heart Rate Waveform (Ward Telemetry Zone A)
          </h3>
          <p className="text-xs text-healthcare-textSecondary mb-4">
            Laplace differential privacy perturbation applied on non-critical summaries
          </p>
          <HeartRateChart data={mockHeartRateTrends} height={250} />
        </div>

        <div className="bg-healthcare-surface border border-healthcare-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-healthcare-textPrimary mb-1">
            Oxygen Saturation Trajectory (SpO2 Profile)
          </h3>
          <p className="text-xs text-healthcare-textSecondary mb-4">
            Automated threshold surveillance for hypoxic desaturation
          </p>
          <SpO2Chart data={mockSpO2Trends} height={250} />
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
