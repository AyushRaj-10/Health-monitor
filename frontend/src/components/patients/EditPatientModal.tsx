import React, { useState, useEffect } from 'react';
import { X, Edit3, Loader2, AlertCircle } from 'lucide-react';
import { updatePatientApi, getDoctorsApi } from '../../services/api';
import { BackendPatient, UpdatePatientInput, RiskLevel, PatientStatus } from '../../types/patient';
import { DoctorOption } from '../../types/auth';

interface EditPatientModalProps {
  isOpen: boolean;
  patient: BackendPatient | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  patient,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [contactInformation, setContactInformation] = useState('');
  const [assignedDoctorId, setAssignedDoctorId] = useState<string>('');
  const [condition, setCondition] = useState('');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('LOW');
  const [status, setStatus] = useState<PatientStatus>('ACTIVE');
  const [medicalHistory, setMedicalHistory] = useState('');

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (patient) {
      setName(patient.name || '');
      setDateOfBirth(patient.dateOfBirth ? patient.dateOfBirth.split('T')[0] : '');
      setGender(patient.gender as any);
      setContactInformation(patient.contactInformation || '');
      setAssignedDoctorId(patient.assignedDoctorId || '');
      setCondition(patient.condition || '');
      setRiskLevel(patient.riskLevel || 'LOW');
      setStatus(patient.status || 'ACTIVE');
      setMedicalHistory(patient.medicalHistory || '');
      setErrorMsg(null);

      getDoctorsApi()
        .then((docList) => setDoctors(docList))
        .catch(console.error);
    }
  }, [patient]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const payload: UpdatePatientInput = {
      name: name.trim(),
      dateOfBirth: dateOfBirth || undefined,
      gender,
      contactInformation: contactInformation.trim() || undefined,
      assignedDoctorId: assignedDoctorId || null,
      condition: condition.trim() || undefined,
      riskLevel,
      status,
      medicalHistory: medicalHistory.trim() || undefined,
    };

    try {
      await updatePatientApi(patient.id, payload);
      onSuccess();
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to update patient record.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-healthcare-surface border border-healthcare-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-healthcare-borderSubtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-950 text-teal-400 border border-teal-800">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-healthcare-textPrimary">
                Edit Patient Record: {patient.patientCode}
              </h2>
              <p className="text-xs text-healthcare-textMuted">
                Update clinical metadata and assigned attending physician
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-healthcare-textMuted hover:text-white hover:bg-healthcare-surfaceHover"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
                Patient Code
              </label>
              <input
                type="text"
                disabled
                value={patient.patientCode}
                className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg px-3 py-2 text-xs text-healthcare-textMuted font-mono opacity-80 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary font-mono focus:outline-none focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
                Gender *
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
                Attending Doctor
              </label>
              <select
                value={assignedDoctorId}
                onChange={(e) => setAssignedDoctorId(e.target.value)}
                className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Unassigned --</option>
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
                Risk Level
              </label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
                className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
              >
                <option value="LOW">LOW</option>
                <option value="MODERATE">MODERATE</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
                Monitoring Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PatientStatus)}
                className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="OBSERVATION">OBSERVATION</option>
                <option value="DISCHARGED">DISCHARGED</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
              Diagnosis / Clinical Condition
            </label>
            <input
              type="text"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
              Contact Details
            </label>
            <input
              type="text"
              value={contactInformation}
              onChange={(e) => setContactInformation(e.target.value)}
              className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg px-3 py-2 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1">
              Medical History
            </label>
            <textarea
              rows={3}
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              className="w-full bg-healthcare-surfaceLight border border-healthcare-border rounded-lg p-3 text-xs text-healthcare-textPrimary focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-healthcare-borderSubtle flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover text-healthcare-textSecondary border border-healthcare-borderSubtle transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-semibold transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
