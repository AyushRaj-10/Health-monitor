import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit3,
  User,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState } from '../components/common/LoadingState';
import { ErrorState } from '../components/common/ErrorState';
import { CreatePatientModal } from '../components/patients/CreatePatientModal';
import { EditPatientModal } from '../components/patients/EditPatientModal';
import { getPatientsApi, deletePatientApi } from '../services/api';
import { BackendPatient } from '../types/patient';
import { useAuth } from '../context/AuthContext';

export const Patients: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [search, setSearch] = useState<string>('');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<BackendPatient | null>(null);

  // Fetch real patient data from PostgreSQL via backend API
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['patients', { page, limit, search, riskLevel: selectedRisk !== 'ALL' ? selectedRisk : undefined }],
    queryFn: () =>
      getPatientsApi({
        page,
        limit,
        search: search.trim() || undefined,
        riskLevel: selectedRisk !== 'ALL' ? selectedRisk : undefined,
      }),
  });

  // Delete patient mutation
  const deleteMutation = useMutation({
    mutationFn: (patientId: string) => deletePatientApi(patientId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: (err: any) => {
      alert(err?.response?.data?.error?.message || 'Failed to delete patient record');
    },
  });

  const handleDelete = (e: React.MouseEvent, patient: BackendPatient) => {
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete patient ${patient.name} (${patient.patientCode})?`
    );
    if (confirmed) {
      deleteMutation.mutate(patient.id);
    }
  };

  const handleEdit = (e: React.MouseEvent, patient: BackendPatient) => {
    e.stopPropagation();
    setEditingPatient(patient);
  };

  const calculateAge = (dobString: string): number => {
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const patients: BackendPatient[] = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Directory & Telemetry Enrollment"
        subtitle="Active roster of remote telemetry patients with continuous IoMT edge surveillance"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Patients' },
        ]}
        badge={
          pagination ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium bg-teal-950/80 text-teal-300 border border-teal-800/60">
              <span>{pagination.total} Records in PostgreSQL</span>
            </span>
          ) : undefined
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover text-healthcare-textSecondary hover:text-white border border-healthcare-borderSubtle transition-colors cursor-pointer"
              title="Refresh Patient List"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors shadow-sm cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll New Patient</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-healthcare-surface border border-healthcare-border rounded-xl p-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-healthcare-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // Reset to page 1 on new search
            }}
            placeholder="Search by name, patient code, or condition..."
            className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-healthcare-textPrimary placeholder:text-healthcare-textMuted focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => {
                setSelectedRisk(risk);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedRisk === risk
                  ? 'bg-teal-950 text-teal-300 border border-teal-700/60 font-semibold'
                  : 'bg-healthcare-surfaceLight text-healthcare-textSecondary hover:text-healthcare-textPrimary border border-healthcare-borderSubtle'
              }`}
            >
              {risk.charAt(0) + risk.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* View Mode Toggle */}
        <div className="hidden sm:flex items-center gap-1 bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-teal-950 text-teal-300' : 'text-healthcare-textMuted hover:text-healthcare-textSecondary'}`}
            title="Table View"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-teal-950 text-teal-300' : 'text-healthcare-textMuted hover:text-healthcare-textSecondary'}`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingState message="Loading registered patients from PostgreSQL database..." rows={5} />
      ) : isError ? (
        <ErrorState
          title="Failed to fetch patients"
          message={(error as any)?.message || 'An error occurred while connecting to the backend API.'}
          onRetry={() => refetch()}
        />
      ) : patients.length === 0 ? (
        <EmptyState
          title="No patients match your search criteria"
          description={
            search || selectedRisk !== 'ALL'
              ? 'Try modifying your search query or reset the risk level filter.'
              : 'No patient records exist in the database yet. Enroll your first patient to begin continuous IoMT monitoring.'
          }
          actionText={search || selectedRisk !== 'ALL' ? 'Reset Filters' : 'Enroll New Patient'}
          onAction={() => {
            if (search || selectedRisk !== 'ALL') {
              setSearch('');
              setSelectedRisk('ALL');
              setPage(1);
            } else {
              setIsCreateOpen(true);
            }
          }}
        />
      ) : viewMode === 'table' ? (
        /* Real Backend Table View */
        <div className="overflow-hidden rounded-xl border border-healthcare-border bg-healthcare-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-healthcare-textPrimary">
              <thead className="bg-healthcare-surfaceLight border-b border-healthcare-border text-xs uppercase text-healthcare-textSecondary">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-semibold">Patient &amp; Code</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Risk Level</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Age / Gender</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Diagnosis / Condition</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Attending Doctor</th>
                  <th scope="col" className="px-4 py-3.5 font-semibold">Status</th>
                  <th scope="col" className="px-5 py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-healthcare-borderSubtle">
                {patients.map((patient: BackendPatient) => {
                  const age = calculateAge(patient.dateOfBirth);
                  const canDelete = user?.role === 'ADMIN' || patient.assignedDoctorId === user?.id;

                  return (
                    <tr
                      key={patient.id}
                      onClick={() => navigate(`/patients/${patient.id}`)}
                      className="hover:bg-healthcare-surfaceHover/80 transition-colors cursor-pointer group"
                    >
                      {/* Patient Name & Code */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-healthcare-textPrimary group-hover:text-teal-400 transition-colors">
                          {patient.name}
                        </div>
                        <div className="text-xs font-mono text-healthcare-textMuted mt-0.5">
                          {patient.patientCode}
                        </div>
                      </td>

                      {/* Risk Badge */}
                      <td className="px-4 py-4">
                        <StatusBadge
                          type="risk"
                          value={patient.riskLevel}
                          pulse={patient.riskLevel === 'CRITICAL'}
                        />
                      </td>

                      {/* Age & Gender */}
                      <td className="px-4 py-4 text-xs text-healthcare-textSecondary">
                        <span>{age} years</span>
                        <span className="text-healthcare-textMuted ml-1.5">• {patient.gender}</span>
                      </td>

                      {/* Diagnosis / Condition */}
                      <td className="px-4 py-4 text-xs text-healthcare-textSecondary">
                        <div className="truncate max-w-[220px]" title={patient.condition || ''}>
                          {patient.condition || 'Routine Telemetry'}
                        </div>
                      </td>

                      {/* Attending Doctor */}
                      <td className="px-4 py-4 text-xs text-healthcare-textSecondary">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-teal-400" />
                          <span>{patient.assignedDoctor?.name || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <StatusBadge type="status" value={patient.status} size="sm" />
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleEdit(e, patient)}
                            className="p-1.5 rounded-lg bg-healthcare-surfaceLight hover:bg-teal-950 hover:text-teal-300 text-healthcare-textSecondary border border-healthcare-borderSubtle transition-colors cursor-pointer"
                            title="Edit Patient"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {canDelete && (
                            <button
                              onClick={(e) => handleDelete(e, patient)}
                              className="p-1.5 rounded-lg bg-healthcare-surfaceLight hover:bg-rose-950 hover:text-rose-400 text-healthcare-textSecondary border border-healthcare-borderSubtle transition-colors cursor-pointer"
                              title="Delete Patient Record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/patients/${patient.id}`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-healthcare-surfaceLight hover:bg-teal-950 hover:text-teal-300 text-healthcare-textSecondary border border-healthcare-borderSubtle transition-colors cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Real Backend Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {patients.map((patient: BackendPatient) => {
            const age = calculateAge(patient.dateOfBirth);
            const canDelete = user?.role === 'ADMIN' || patient.assignedDoctorId === user?.id;

            return (
              <div
                key={patient.id}
                onClick={() => navigate(`/patients/${patient.id}`)}
                className="bg-healthcare-surface border border-healthcare-border hover:border-teal-600/50 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-healthcare-textPrimary text-base hover:text-teal-400 transition-colors">
                        {patient.name}
                      </h3>
                      <span className="font-mono text-xs text-healthcare-textMuted">
                        {patient.patientCode} • {age}y {patient.gender}
                      </span>
                    </div>
                    <StatusBadge
                      type="risk"
                      value={patient.riskLevel}
                      pulse={patient.riskLevel === 'CRITICAL'}
                    />
                  </div>

                  <p className="text-xs text-healthcare-textSecondary mb-4 line-clamp-2">
                    {patient.condition || 'Under continuous observation'}
                  </p>

                  <div className="space-y-1.5 bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-2.5 mb-4 text-xs text-healthcare-textSecondary">
                    <div className="flex justify-between">
                      <span className="text-healthcare-textMuted">Attending Doctor:</span>
                      <span className="font-medium text-healthcare-textPrimary truncate max-w-[140px]">
                        {patient.assignedDoctor?.name || 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-healthcare-textMuted">Status:</span>
                      <span className="font-mono text-teal-300">{patient.status}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-healthcare-borderSubtle flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleEdit(e, patient)}
                      className="p-1 rounded bg-healthcare-surfaceLight text-healthcare-textSecondary hover:text-white"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {canDelete && (
                      <button
                        onClick={(e) => handleDelete(e, patient)}
                        className="p-1 rounded bg-healthcare-surfaceLight text-healthcare-textSecondary hover:text-rose-400"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <span className="flex items-center gap-1 text-teal-400 font-medium">
                    <span>Inspect Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-healthcare-surface border border-healthcare-border rounded-xl px-4 py-3 text-xs text-healthcare-textSecondary">
          <div>
            Showing Page <span className="font-bold text-healthcare-textPrimary">{pagination.page}</span> of{' '}
            <span className="font-bold text-healthcare-textPrimary">{pagination.totalPages}</span> ({pagination.total} Total Patients)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!pagination.hasPrevPage}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover disabled:opacity-40 disabled:cursor-not-allowed border border-healthcare-borderSubtle text-healthcare-textPrimary transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={!pagination.hasNextPage}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-healthcare-surfaceLight hover:bg-healthcare-surfaceHover disabled:opacity-40 disabled:cursor-not-allowed border border-healthcare-borderSubtle text-healthcare-textPrimary transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreatePatientModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['patients'] });
        }}
      />

      <EditPatientModal
        isOpen={!!editingPatient}
        patient={editingPatient}
        onClose={() => setEditingPatient(null)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['patients'] });
        }}
      />
    </div>
  );
};
