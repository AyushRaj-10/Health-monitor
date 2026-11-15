import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  UserPlus,
  LayoutGrid,
  List,
  Heart,
  Activity,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { PatientTable } from '../components/patients/PatientTable';
import { EmptyState } from '../components/common/EmptyState';
import { mockPatients } from '../data/mockData';

export const Patients: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRisk, setSelectedRisk] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const filteredPatients = mockPatients.filter((patient) => {
    const matchesSearch =
      patient.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.medicalRecordNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.condition.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRisk = selectedRisk === 'ALL' || patient.riskLevel === selectedRisk;

    return matchesSearch && matchesRisk;
  });

  const riskCounts = {
    ALL: mockPatients.length,
    CRITICAL: mockPatients.filter((p) => p.riskLevel === 'CRITICAL').length,
    HIGH: mockPatients.filter((p) => p.riskLevel === 'HIGH').length,
    MODERATE: mockPatients.filter((p) => p.riskLevel === 'MODERATE').length,
    LOW: mockPatients.filter((p) => p.riskLevel === 'LOW').length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patient Directory & Telemetry Enrollment"
        subtitle="Active roster of remote telemetry patients with continuous IoMT edge surveillance"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Patients' },
        ]}
        actions={
          <button
            onClick={() => alert('Stage 1 Demo: In Stage 2 you can enroll a new patient into the edge mesh.')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Enroll New Patient</span>
          </button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-healthcare-surface border border-healthcare-border rounded-xl p-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-healthcare-textMuted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, MRN, or condition..."
            className="w-full bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg pl-9 pr-3 py-1.5 text-xs text-healthcare-textPrimary placeholder:text-healthcare-textMuted focus:outline-none focus:border-teal-500 transition-colors"
          />
        </div>

        {/* Risk Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {(['ALL', 'CRITICAL', 'HIGH', 'MODERATE', 'LOW'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => setSelectedRisk(risk)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                selectedRisk === risk
                  ? 'bg-teal-950 text-teal-300 border border-teal-700/60 font-semibold'
                  : 'bg-healthcare-surfaceLight text-healthcare-textSecondary hover:text-healthcare-textPrimary border border-healthcare-borderSubtle'
              }`}
            >
              {risk.charAt(0) + risk.slice(1).toLowerCase()} ({riskCounts[risk]})
            </button>
          ))}
        </div>

        {/* View Toggle */}
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

      {/* Patient View: Table or Card Grid */}
      {filteredPatients.length === 0 ? (
        <EmptyState
          title="No patients found"
          description={`No patients matched your filter criteria for "${searchQuery || selectedRisk}".`}
          actionText="Reset Filters"
          onAction={() => {
            setSearchQuery('');
            setSelectedRisk('ALL');
          }}
        />
      ) : viewMode === 'table' ? (
        <PatientTable patients={filteredPatients} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => navigate(`/patients/${patient.id}`)}
              className="bg-healthcare-surface border border-healthcare-border hover:border-teal-600/50 rounded-xl p-5 cursor-pointer transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-healthcare-textPrimary text-base hover:text-teal-400 transition-colors">
                      {patient.fullName}
                    </h3>
                    <span className="font-mono text-xs text-healthcare-textMuted">
                      {patient.medicalRecordNumber} • {patient.age}y {patient.gender}
                    </span>
                  </div>
                  <StatusBadge
                    type="risk"
                    value={patient.riskLevel}
                    pulse={patient.riskLevel === 'CRITICAL'}
                  />
                </div>

                <p className="text-xs text-healthcare-textSecondary mb-4">
                  {patient.condition}
                </p>

                {/* Vitals Summary Grid */}
                <div className="grid grid-cols-2 gap-2 bg-healthcare-surfaceLight border border-healthcare-borderSubtle rounded-lg p-2.5 mb-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-teal-400" />
                    <span>{patient.vitals.heartRate} bpm</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{patient.vitals.spo2}% SpO2</span>
                  </div>
                  <div className="text-healthcare-textMuted text-[11px]">
                    BP: {patient.vitals.bloodPressureSys}/{patient.vitals.bloodPressureDia}
                  </div>
                  <div className="text-healthcare-textMuted text-[11px]">
                    Resp: {patient.vitals.respiratoryRate}/min
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-healthcare-borderSubtle flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[11px] text-teal-300">
                  <ShieldCheck className="w-3 h-3 text-teal-400" />
                  <span>ε-DP Active</span>
                </div>
                <span className="flex items-center gap-1 text-teal-400 font-medium">
                  <span>View Details</span>
                  <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
