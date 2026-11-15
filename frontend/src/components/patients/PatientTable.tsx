import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Patient } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { Heart, Activity, Battery, ShieldCheck, ChevronRight } from 'lucide-react';

interface PatientTableProps {
  patients: Patient[];
  showPagination?: boolean;
}

export const PatientTable: React.FC<PatientTableProps> = ({
  patients,
}) => {
  const navigate = useNavigate();

  return (
    <div className="w-full overflow-hidden rounded-xl border border-healthcare-border bg-healthcare-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-healthcare-textPrimary">
          <thead className="bg-healthcare-surfaceLight border-b border-healthcare-border text-xs uppercase text-healthcare-textSecondary">
            <tr>
              <th scope="col" className="px-5 py-3.5 font-semibold">Patient & ID</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Risk Level</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Heart Rate</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">SpO2</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Blood Pressure</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">IoMT Device</th>
              <th scope="col" className="px-4 py-3.5 font-semibold">Privacy State</th>
              <th scope="col" className="px-5 py-3.5 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-healthcare-borderSubtle">
            {patients.map((patient) => {
              const isTachy = patient.vitals.heartRate > 100;
              const isHypoxic = patient.vitals.spo2 < 94;

              return (
                <tr
                  key={patient.id}
                  onClick={() => navigate(`/patients/${patient.id}`)}
                  className="hover:bg-healthcare-surfaceHover/80 transition-colors cursor-pointer group"
                >
                  {/* Patient Name & MRN */}
                  <td className="px-5 py-4">
                    <div className="font-medium text-healthcare-textPrimary group-hover:text-teal-400 transition-colors">
                      {patient.fullName}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-healthcare-textMuted mt-0.5">
                      <span className="font-mono">{patient.medicalRecordNumber}</span>
                      <span>•</span>
                      <span>{patient.age}y, {patient.gender}</span>
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

                  {/* Heart Rate */}
                  <td className="px-4 py-4 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isTachy ? 'text-rose-400 fill-rose-500/30 animate-pulse' : 'text-teal-400'
                        }`}
                      />
                      <span className={isTachy ? 'text-rose-400 font-semibold' : 'text-healthcare-textPrimary'}>
                        {patient.vitals.heartRate}
                      </span>
                      <span className="text-xs text-healthcare-textMuted font-sans">bpm</span>
                    </div>
                  </td>

                  {/* SpO2 */}
                  <td className="px-4 py-4 font-mono">
                    <div className="flex items-center gap-1.5">
                      <Activity
                        className={`w-3.5 h-3.5 ${isHypoxic ? 'text-amber-400' : 'text-emerald-400'}`}
                      />
                      <span className={isHypoxic ? 'text-amber-400 font-semibold' : 'text-healthcare-textPrimary'}>
                        {patient.vitals.spo2}%
                      </span>
                    </div>
                  </td>

                  {/* Blood Pressure */}
                  <td className="px-4 py-4 font-mono text-xs text-healthcare-textSecondary">
                    {patient.vitals.bloodPressureSys}/{patient.vitals.bloodPressureDia}
                    <span className="text-healthcare-textMuted ml-1 font-sans">mmHg</span>
                  </td>

                  {/* IoMT Device */}
                  <td className="px-4 py-4">
                    <div className="text-xs font-medium text-healthcare-textPrimary">
                      {patient.deviceName}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-healthcare-textMuted mt-0.5">
                      <span className="flex items-center gap-1">
                        <Battery className="w-3 h-3 text-teal-400" />
                        {patient.deviceBattery}%
                      </span>
                      <span>•</span>
                      <span className="font-mono text-[10px]">{patient.edgeNodeId.split('-').slice(-2).join('-')}</span>
                    </div>
                  </td>

                  {/* Privacy / Edge State */}
                  <td className="px-4 py-4">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-950/70 border border-teal-800/40 text-[11px] text-teal-300">
                      <ShieldCheck className="w-3 h-3 text-teal-400" />
                      <span>DP (ε=0.5)</span>
                    </div>
                  </td>

                  {/* Action Link */}
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/patients/${patient.id}`);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-healthcare-surfaceLight hover:bg-teal-950 hover:text-teal-300 text-healthcare-textSecondary border border-healthcare-borderSubtle transition-colors"
                    >
                      <span>Vitals</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
