import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  AlertTriangle,
  BarChart3,
  ShieldCheck,
  FileText,
  Settings,
  LogOut,
  Cpu,
} from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const navigate = useNavigate();

  const navItems = [
    {
      label: 'Dashboard',
      to: '/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Patients',
      to: '/patients',
      icon: Users,
    },
    {
      label: 'Live Monitoring',
      to: '/monitoring',
      icon: Activity,
      badge: 'Live',
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-800/60',
    },
    {
      label: 'Alerts',
      to: '/alerts',
      icon: AlertTriangle,
      badge: '3',
      badgeColor: 'bg-rose-950 text-rose-300 border-rose-800/60',
    },
    {
      label: 'Analytics',
      to: '/analytics',
      icon: BarChart3,
    },
    {
      label: 'Privacy Engine',
      to: '/privacy',
      icon: ShieldCheck,
      badge: 'ε-DP',
      badgeColor: 'bg-teal-950 text-teal-300 border-teal-800/60',
    },
    {
      label: 'Audit Logs',
      to: '/audit-logs',
      icon: FileText,
    },
    {
      label: 'Settings',
      to: '/settings',
      icon: Settings,
    },
  ];

  return (
    <aside className="w-64 bg-healthcare-surface border-r border-healthcare-border flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-healthcare-border">
        <div className="w-9 h-9 rounded-xl bg-teal-950 border border-teal-700/60 flex items-center justify-center text-teal-400 shadow-sm">
          <Activity className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight text-healthcare-textPrimary flex items-center gap-1.5">
            <span>IoMT PulseGuard</span>
          </div>
          <p className="text-[10px] text-healthcare-textMuted tracking-wider uppercase font-medium">
            Privacy Edge Telemetry
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold tracking-wider uppercase text-healthcare-textMuted">
          Clinical Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                `flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-teal-950/70 text-teal-300 border border-teal-800/60 font-semibold'
                    : 'text-healthcare-textSecondary hover:text-healthcare-textPrimary hover:bg-healthcare-surfaceHover'
                }`
              }
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Edge Gateway Status Box */}
      <div className="p-3 mx-3 mb-3 rounded-xl bg-healthcare-surfaceLight border border-healthcare-borderSubtle">
        <div className="flex items-center justify-between text-xs mb-2">
          <div className="flex items-center gap-1.5 text-teal-400 font-medium">
            <Cpu className="w-3.5 h-3.5" />
            <span>Edge Mesh Active</span>
          </div>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <div className="text-[11px] text-healthcare-textMuted space-y-1">
          <div className="flex justify-between">
            <span>Active Edge Nodes:</span>
            <span className="font-mono text-healthcare-textSecondary">3 Gateways</span>
          </div>
          <div className="flex justify-between">
            <span>Avg Edge Latency:</span>
            <span className="font-mono text-emerald-400">16 ms</span>
          </div>
          <div className="flex justify-between">
            <span>Bandwidth Saved:</span>
            <span className="font-mono text-teal-300">78.4%</span>
          </div>
        </div>
      </div>

      {/* Clinician Session Footer */}
      <div className="p-3 border-t border-healthcare-border flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-full bg-teal-900/60 border border-teal-700/50 flex items-center justify-center text-teal-300 text-xs font-semibold shrink-0">
            EV
          </div>
          <div className="truncate">
            <div className="text-xs font-medium text-healthcare-textPrimary truncate">
              Dr. Elena Vance
            </div>
            <div className="text-[10px] text-healthcare-textMuted truncate">
              Cardiologist (On Duty)
            </div>
          </div>
        </div>

        <button
          onClick={() => navigate('/login')}
          title="Sign Out / Switch User"
          className="p-1.5 rounded-lg text-healthcare-textMuted hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
