import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Battery,
  BatteryCharging,
  BatteryLow,
  ExternalLink,
  Activity,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { getDevicesApi, getSimulatorStatusApi, getPatientsApi } from '../services/api';
import { DeviceStatus } from '../types/device';
import { SimulatorControl } from '../components/devices/SimulatorControl';
import { RegisterDeviceModal } from '../components/devices/RegisterDeviceModal';

export const Devices: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);

  // Fetch devices from backend database
  const {
    data: devices = [],
    isLoading: isDevicesLoading,
    refetch: refetchDevices,
  } = useQuery({
    queryKey: ['devices'],
    queryFn: () => getDevicesApi(),
    refetchInterval: 4000, // Periodic poll to keep battery & heartbeat live
  });

  // Fetch simulator state
  const {
    data: simulatorStatus = null,
    isLoading: isSimLoading,
    refetch: refetchSimulator,
  } = useQuery({
    queryKey: ['simulator-status'],
    queryFn: () => getSimulatorStatusApi(),
    refetchInterval: 3000,
  });

  // Fetch patients for assignment dropdown
  const { data: patientsData } = useQuery({
    queryKey: ['patients-list-all'],
    queryFn: () => getPatientsApi({ limit: 100 }),
  });

  const patients = patientsData?.data || [];

  // Filter devices
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      d.deviceCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (d.patient?.name && d.patient.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Aggregate stats
  const totalDevices = devices.length;
  const onlineDevices = devices.filter((d) => d.status === 'ONLINE').length;
  const degradedDevices = devices.filter((d) => d.status === 'DEGRADED' || d.status === 'OFFLINE').length;
  const totalReadings = devices.reduce((sum, d) => sum + (d._count?.readings || 0), 0);

  const handleDeviceCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['devices'] });
    queryClient.invalidateQueries({ queryKey: ['simulator-status'] });
  };

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Online</span>
          </span>
        );
      case 'DEGRADED':
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3 h-3" />
            <span>Degraded</span>
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3" />
            <span>Offline</span>
          </span>
        );
    }
  };

  const getBatteryIcon = (level: number) => {
    if (level > 70) return <BatteryCharging className="w-4 h-4 text-emerald-400" />;
    if (level > 25) return <Battery className="w-4 h-4 text-amber-400" />;
    return <BatteryLow className="w-4 h-4 text-rose-400" />;
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return 'Never';
    const seconds = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">IoMT Device Inventory</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Edge Fleet
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Manage provisioned wearable sensors, monitor edge gateways, and orchestrate telemetry simulation
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchDevices();
              refetchSimulator();
            }}
            className="flex items-center space-x-1.5 px-3 py-2 text-sm text-slate-300 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => setIsRegisterModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Provision Device</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#071311] border border-emerald-500/20">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Fleet</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{totalDevices}</div>
          <div className="text-xs text-slate-400 mt-1">Registered IoMT Units</div>
        </div>

        <div className="p-4 rounded-xl bg-[#071311] border border-emerald-500/20">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Online & Active</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">{onlineDevices}</div>
          <div className="text-xs text-slate-400 mt-1">Live telemetry streaming</div>
        </div>

        <div className="p-4 rounded-xl bg-[#071311] border border-emerald-500/20">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Degraded / Offline</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400 mt-2">{degradedDevices}</div>
          <div className="text-xs text-slate-400 mt-1">Requiring battery/link check</div>
        </div>

        <div className="p-4 rounded-xl bg-[#071311] border border-emerald-500/20">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Telemetry Ingested</span>
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white mt-2">{totalReadings}</div>
          <div className="text-xs text-slate-400 mt-1">Persisted readings in DB</div>
        </div>
      </div>

      {/* Simulator Control Section */}
      <SimulatorControl
        simulatorStatus={simulatorStatus}
        isLoading={isSimLoading}
        onRefresh={refetchSimulator}
      />

      {/* Device Inventory Table Section */}
      <div className="bg-[#071311] border border-emerald-500/20 rounded-xl overflow-hidden shadow-xl">
        {/* Table Controls */}
        <div className="p-4 border-b border-emerald-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-semibold text-white">Device Fleet Registry</h2>
            <span className="text-xs text-slate-500 font-mono">({filteredDevices.length})</span>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search device code, name..."
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-900 border border-slate-800 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-48 sm:w-64"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
              <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-300 pr-2 py-0.5 focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="ONLINE">Online</option>
                <option value="DEGRADED">Degraded</option>
                <option value="OFFLINE">Offline</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 border-b border-slate-800 text-slate-400 font-medium uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Device Identity</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Battery</th>
                <th className="px-4 py-3">Assigned Patient</th>
                <th className="px-4 py-3">Edge Gateway</th>
                <th className="px-4 py-3">Heartbeat</th>
                <th className="px-4 py-3">Total Ingested</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {isDevicesLoading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-2 text-emerald-400" />
                    <span>Loading IoMT device fleet...</span>
                  </td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                    No devices match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((device) => (
                  <tr key={device.id} className="hover:bg-emerald-950/20 transition-colors">
                    {/* Device Identity */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-white font-mono flex items-center space-x-1.5">
                            <span>{device.deviceCode}</span>
                            {device.isSimulated && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 font-sans">
                                SIM
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400 truncate max-w-xs">{device.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Device Type */}
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700">
                        {device.deviceType}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">{getStatusBadge(device.status)}</td>

                    {/* Battery */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center space-x-2">
                        {getBatteryIcon(device.batteryLevel)}
                        <div className="w-16 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              device.batteryLevel > 70
                                ? 'bg-emerald-400'
                                : device.batteryLevel > 25
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${device.batteryLevel}%` }}
                          />
                        </div>
                        <span className="font-mono text-slate-300">{device.batteryLevel}%</span>
                      </div>
                    </td>

                    {/* Assigned Patient */}
                    <td className="px-4 py-3.5">
                      {device.patient ? (
                        <Link
                          to={`/patients/${device.patient.id}`}
                          className="group inline-flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <span className="font-medium underline-offset-2 group-hover:underline">
                            {device.patient.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            ({device.patient.patientCode})
                          </span>
                          <ExternalLink className="w-3 h-3 ml-0.5 opacity-60 group-hover:opacity-100" />
                        </Link>
                      ) : (
                        <span className="text-slate-500 italic">Unassigned</span>
                      )}
                    </td>

                    {/* Edge Gateway & Firmware */}
                    <td className="px-4 py-3.5">
                      <div className="font-mono text-slate-300">{device.edgeNodeId}</div>
                      <div className="text-[11px] text-slate-500">{device.firmwareVersion}</div>
                    </td>

                    {/* Heartbeat */}
                    <td className="px-4 py-3.5 font-mono text-slate-300">
                      {formatRelativeTime(device.lastHeartbeat)}
                    </td>

                    {/* Total Ingested Packets */}
                    <td className="px-4 py-3.5 font-mono text-white">
                      {device._count?.readings || 0}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      {device.patient && (
                        <Link
                          to={`/patients/${device.patient.id}`}
                          className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors inline-flex items-center space-x-1"
                        >
                          <span>View Live Feed</span>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Provision Device Modal */}
      <RegisterDeviceModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        patients={patients}
        onDeviceCreated={handleDeviceCreated}
      />
    </div>
  );
};
