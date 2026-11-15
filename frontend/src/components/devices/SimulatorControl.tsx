import React, { useState } from 'react';
import {
  Play,
  Square,
  Activity,
  Heart,
  Zap,
  Gauge,
  Thermometer,
  RefreshCw,
  Flame,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import {
  SimulatorStatusResponse,
  SimulatedDeviceAgentStatus,
} from '../../types/device';
import {
  startSimulatorAllApi,
  stopSimulatorAllApi,
  startSimulatorDeviceApi,
  stopSimulatorDeviceApi,
  setSimulatorScenarioApi,
  setSimulatorIntervalApi,
} from '../../services/api';

interface SimulatorControlProps {
  simulatorStatus: SimulatorStatusResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

const SCENARIO_BUTTONS = [
  {
    id: 'NORMAL',
    label: 'Normal Baseline',
    desc: 'HR ~74 bpm | SpO2 98% | BP 120/80 | 36.8°C',
    color: 'border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10',
    activeBg: 'bg-emerald-500/20 border-emerald-500 text-emerald-300',
    icon: Heart,
  },
  {
    id: 'WARNING_ELEVATED_HR',
    label: 'Elevated HR',
    desc: 'HR ~110 bpm | Mild sinus tachycardia',
    color: 'border-amber-500/40 text-amber-400 hover:bg-amber-500/10',
    activeBg: 'bg-amber-500/20 border-amber-500 text-amber-300',
    icon: Activity,
  },
  {
    id: 'CRITICAL_TACHYCARDIA',
    label: 'Trigger Tachycardia',
    desc: 'HR ~154 bpm | Critical Paroxysmal Rhythm',
    color: 'border-rose-500/40 text-rose-400 hover:bg-rose-500/10',
    activeBg: 'bg-rose-500/20 border-rose-500 text-rose-300',
    icon: Zap,
  },
  {
    id: 'HYPOXIA',
    label: 'Trigger Hypoxia',
    desc: 'SpO2 ~87% | Severe respiratory desaturation',
    color: 'border-sky-500/40 text-sky-400 hover:bg-sky-500/10',
    activeBg: 'bg-sky-500/20 border-sky-500 text-sky-300',
    icon: Gauge,
  },
  {
    id: 'HYPERTENSIVE_CRISIS',
    label: 'Hypertensive Crisis',
    desc: 'BP ~188/116 mmHg | Arterial emergency',
    color: 'border-purple-500/40 text-purple-400 hover:bg-purple-500/10',
    activeBg: 'bg-purple-500/20 border-purple-500 text-purple-300',
    icon: Activity,
  },
  {
    id: 'FEVER_INFECTION',
    label: 'Trigger Fever',
    desc: 'Temp ~39.2°C | Systemic pyrexia & infection',
    color: 'border-orange-500/40 text-orange-400 hover:bg-orange-500/10',
    activeBg: 'bg-orange-500/20 border-orange-500 text-orange-300',
    icon: Flame,
  },
];

export const SimulatorControl: React.FC<SimulatorControlProps> = ({
  simulatorStatus,
  isLoading,
  onRefresh,
}) => {
  const [selectedDeviceCode, setSelectedDeviceCode] = useState<string>('DEV-1001');
  const [actionLoading, setActionLoading] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const devices = simulatorStatus?.devices || [];
  const selectedDevice: SimulatedDeviceAgentStatus | undefined =
    devices.find((d) => d.deviceCode === selectedDeviceCode) || devices[0];

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleStartAll = async () => {
    setActionLoading(true);
    try {
      await startSimulatorAllApi();
      showToast('All 5 virtual IoMT devices started streaming.');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to start simulator.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopAll = async () => {
    setActionLoading(true);
    try {
      await stopSimulatorAllApi();
      showToast('All virtual IoMT devices stopped.');
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to stop simulator.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSelected = async () => {
    if (!selectedDevice) return;
    setActionLoading(true);
    try {
      if (selectedDevice.isRunning) {
        await stopSimulatorDeviceApi(selectedDevice.deviceCode);
        showToast(`Device ${selectedDevice.deviceCode} paused.`);
      } else {
        await startSimulatorDeviceApi(selectedDevice.deviceCode);
        showToast(`Device ${selectedDevice.deviceCode} started.`);
      }
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle device.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleScenarioSelect = async (scenarioKey: string) => {
    if (!selectedDevice) return;
    setActionLoading(true);
    try {
      await setSimulatorScenarioApi(selectedDevice.deviceCode, scenarioKey, true);
      showToast(`Triggered ${scenarioKey} on ${selectedDevice.deviceCode} (${selectedDevice.patientName}).`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to set scenario.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleIntervalChange = async (newSec: number) => {
    if (!selectedDevice) return;
    setActionLoading(true);
    try {
      await setSimulatorIntervalApi(selectedDevice.deviceCode, newSec * 1000);
      showToast(`Sampling interval set to ${newSec}s.`);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update interval.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-[#071311] border border-emerald-500/20 rounded-xl p-5 shadow-xl relative overflow-hidden">
      {/* Background ambient medical glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Global Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-emerald-500/15">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-semibold text-white tracking-tight">
                Edge Telemetry Simulator Engine
              </h3>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Stage 3 IoMT Feed
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Generates realistic human physiological telemetry with gradual drift and configurable clinical anomalies
            </p>
          </div>
        </div>

        {/* Status & Master Controls */}
        <div className="flex items-center space-x-2.5">
          <button
            onClick={onRefresh}
            disabled={isLoading || actionLoading}
            className="p-2 rounded-lg text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
            title="Refresh simulator telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleStartAll}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Start All (5)</span>
          </button>

          <button
            onClick={handleStopAll}
            disabled={actionLoading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 transition-all"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            <span>Stop All</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="mt-3 px-3 py-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Control Panel Grid */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Device & Target Selector */}
        <div className="lg:col-span-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Select Virtual Device / Patient
            </label>
            <div className="grid grid-cols-1 gap-2">
              {devices.map((d) => (
                <button
                  key={d.deviceCode}
                  onClick={() => setSelectedDeviceCode(d.deviceCode)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border text-left transition-all ${
                    selectedDevice?.deviceCode === d.deviceCode
                      ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        d.isRunning ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-600'
                      }`}
                    />
                    <div>
                      <div className="text-xs font-medium text-white flex items-center space-x-1.5">
                        <span className="font-mono text-emerald-400">{d.deviceCode}</span>
                        <span className="text-slate-400">•</span>
                        <span>{d.patientName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {d.patientCode} • {d.scenario} • {d.intervalMs / 1000}s
                      </div>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded ${
                      d.isRunning
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {d.isRunning ? 'Streaming' : 'Paused'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Sampling Rate Slider for Selected Device */}
          {selectedDevice && (
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sampling Rate</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {selectedDevice.intervalMs / 1000}s interval
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 5, 10].map((sec) => (
                  <button
                    key={sec}
                    onClick={() => handleIntervalChange(sec)}
                    className={`flex-1 py-1 text-xs rounded font-mono font-semibold transition-all ${
                      selectedDevice.intervalMs === sec * 1000
                        ? 'bg-emerald-500 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Anomaly Scenarios & Live Telemetry Inspector */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-300">
                Trigger Anomaly Scenario on <span className="text-emerald-400 font-mono">{selectedDevice?.deviceCode}</span>
              </label>
              <button
                onClick={handleToggleSelected}
                className={`text-xs px-2.5 py-1 rounded font-medium flex items-center space-x-1 transition-colors ${
                  selectedDevice?.isRunning
                    ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25'
                    : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25'
                }`}
              >
                {selectedDevice?.isRunning ? (
                  <>
                    <Square className="w-3 h-3 fill-current" />
                    <span>Pause Device</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start Device</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {SCENARIO_BUTTONS.map((s) => {
                const Icon = s.icon;
                const isActive = selectedDevice?.scenario === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => handleScenarioSelect(s.id)}
                    className={`p-2.5 rounded-lg border text-left flex flex-col justify-between transition-all ${
                      isActive ? s.activeBg : `bg-slate-900/70 ${s.color}`
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-xs font-semibold">{s.label}</span>
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                    </div>
                    <span className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                      {s.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Telemetry Card for Selected Device */}
          {selectedDevice && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-emerald-500/25">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                <div className="flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold text-white">
                    Live Telemetry Stream: {selectedDevice.deviceCode}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-500/15 text-emerald-300">
                    {selectedDevice.readingsCount} packets ingested
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {selectedDevice.lastSentAt
                    ? new Date(selectedDevice.lastSentAt).toLocaleTimeString()
                    : 'Awaiting first packet'}
                </span>
              </div>

              {selectedDevice.lastReading ? (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                      <Heart className="w-3 h-3 text-rose-400" />
                      <span>Heart Rate</span>
                    </div>
                    <div
                      className={`text-xl font-bold font-mono mt-0.5 ${
                        selectedDevice.lastReading.heartRate > 120 || selectedDevice.lastReading.heartRate < 55
                          ? 'text-rose-400'
                          : selectedDevice.lastReading.heartRate > 100
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedDevice.lastReading.heartRate} <span className="text-xs font-normal">bpm</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                      <Gauge className="w-3 h-3 text-sky-400" />
                      <span>SpO2</span>
                    </div>
                    <div
                      className={`text-xl font-bold font-mono mt-0.5 ${
                        selectedDevice.lastReading.spo2 < 90
                          ? 'text-rose-400'
                          : selectedDevice.lastReading.spo2 < 95
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedDevice.lastReading.spo2} <span className="text-xs font-normal">%</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                      <Activity className="w-3 h-3 text-purple-400" />
                      <span>Blood Pressure</span>
                    </div>
                    <div
                      className={`text-xl font-bold font-mono mt-0.5 ${
                        selectedDevice.lastReading.bloodPressureSys >= 170
                          ? 'text-rose-400'
                          : selectedDevice.lastReading.bloodPressureSys >= 135
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedDevice.lastReading.bloodPressureSys}/{selectedDevice.lastReading.bloodPressureDia}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
                      <Thermometer className="w-3 h-3 text-orange-400" />
                      <span>Temp</span>
                    </div>
                    <div
                      className={`text-xl font-bold font-mono mt-0.5 ${
                        selectedDevice.lastReading.temperature >= 38.5
                          ? 'text-rose-400'
                          : selectedDevice.lastReading.temperature >= 37.5
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {selectedDevice.lastReading.temperature} <span className="text-xs font-normal">°C</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-center py-4 text-xs text-slate-500">
                  No telemetry packets sent yet. Click "Start Device" or "Start All".
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
