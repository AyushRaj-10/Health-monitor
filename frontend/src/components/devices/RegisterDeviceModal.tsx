import React, { useState } from 'react';
import { X, Cpu, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createDeviceApi } from '../../services/api';
import { DeviceType, IoMTDevice } from '../../types/device';
import { BackendPatient } from '../../types/patient';

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: BackendPatient[];
  onDeviceCreated: (newDevice: IoMTDevice) => void;
}

const DEVICE_TYPES: { label: string; value: DeviceType }[] = [
  { label: 'Continuous ECG Patch', value: 'ECG_PATCH' },
  { label: 'Ambulatory Pulse Oximeter Clip', value: 'PULSE_OXIMETER' },
  { label: 'Smart Holter Streamer', value: 'HOLTER_MONITOR' },
  { label: 'Multi-Param Wearable Smartwatch', value: 'SMARTWATCH' },
  { label: 'Continuous Arterial BP Cuff', value: 'BP_CUFF' },
  { label: 'Continuous Core Temp Sensor', value: 'TEMP_SENSOR' },
  { label: 'Multi-Parameter Bedside Unit', value: 'MULTI_PARAM' },
];

export const RegisterDeviceModal: React.FC<RegisterDeviceModalProps> = ({
  isOpen,
  onClose,
  patients,
  onDeviceCreated,
}) => {
  const [deviceCode, setDeviceCode] = useState(`DEV-${Math.floor(1000 + Math.random() * 9000)}`);
  const [name, setName] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('ECG_PATCH');
  const [patientId, setPatientId] = useState<string>('');
  const [edgeNodeId, setEdgeNodeId] = useState('EDGE-GATEWAY-RPI4-01');
  const [firmwareVersion, setFirmwareVersion] = useState('v2.4.1-sim');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a descriptive device name');
      return;
    }
    if (!deviceCode.trim()) {
      setError('Please provide a unique device code');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const created = await createDeviceApi({
        deviceCode: deviceCode.trim().toUpperCase(),
        name: name.trim(),
        deviceType,
        patientId: patientId || null,
        edgeNodeId: edgeNodeId.trim() || 'EDGE-GATEWAY-RPI4-01',
        firmwareVersion: firmwareVersion.trim() || 'v2.4.1-sim',
        batteryLevel: 100,
        isSimulated: true,
      });

      onDeviceCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to register device.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#071210] border border-emerald-500/30 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-500/20 bg-emerald-950/20">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white tracking-tight">Provision IoMT Device</h2>
              <p className="text-xs text-slate-400">Register hardware or virtual edge monitoring unit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-start space-x-2.5 text-rose-300 text-sm">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Device Code *</label>
              <input
                type="text"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                placeholder="DEV-1006"
                required
                className="w-full px-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-lg text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Device Type *</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceType)}
                className="w-full px-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              >
                {DEVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Device Descriptive Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PulseGuard BioTelemetry Band v2"
              required
              className="w-full px-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Associate with Patient</label>
            <select
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">-- Unassigned (Inventory Stock) --</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.patientCode}) - {p.riskLevel} Risk
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-400">
              Only authorized devices can transmit vitals for their associated patient.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Edge Gateway ID</label>
              <input
                type="text"
                value={edgeNodeId}
                onChange={(e) => setEdgeNodeId(e.target.value)}
                placeholder="EDGE-GATEWAY-RPI4-01"
                className="w-full px-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Firmware Version</label>
              <input
                type="text"
                value={firmwareVersion}
                onChange={(e) => setFirmwareVersion(e.target.value)}
                placeholder="v2.4.1-sim"
                className="w-full px-3 py-2 text-sm bg-slate-900/90 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center space-x-2 px-5 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-semibold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
            >
              {isSubmitting ? (
                <span>Provisioning...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Provision Device</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
