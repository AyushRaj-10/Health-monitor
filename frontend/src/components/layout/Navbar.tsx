import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Menu,
  Bell,
  Radio,
  ShieldCheck,
  ExternalLink,
  Lock,
  LogOut,
  User,
} from 'lucide-react';
import { mockAlerts } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const unreadAlerts = mockAlerts.filter((a) => !a.isAcknowledged);

  const getInitials = (name?: string) => {
    if (!name) return 'EV';
    const parts = name.replace(/Dr\.|MD|RN/g, '').trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-healthcare-surface border-b border-healthcare-border flex items-center justify-between px-4 md:px-6 shrink-0 relative z-30">
      {/* Mobile Toggle & System Badge */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-2 rounded-lg text-healthcare-textSecondary hover:text-healthcare-textPrimary hover:bg-healthcare-surfaceHover transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-950/80 text-teal-300 border border-teal-800/60">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>IoMT Live Mesh: Authenticated Active</span>
          </span>

          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
            <Lock className="w-3 h-3 text-emerald-400" />
            <span>AES-256-GCM / Differential Privacy ε=0.5</span>
          </span>
        </div>
      </div>

      {/* Right Actions: Health State, Notifications, User */}
      <div className="flex items-center gap-3">
        {/* Alerts Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            className="p-2 rounded-lg text-healthcare-textSecondary hover:text-healthcare-textPrimary hover:bg-healthcare-surfaceHover relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-healthcare-surface" />
            )}
          </button>

          {/* Quick Alerts Dropdown */}
          {showAlertsDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-healthcare-surface border border-healthcare-border rounded-xl shadow-2xl p-3 z-50">
              <div className="flex items-center justify-between pb-2 border-b border-healthcare-borderSubtle">
                <span className="text-xs font-semibold text-healthcare-textPrimary">
                  Clinical Alerts ({unreadAlerts.length} Unacknowledged)
                </span>
                <button
                  onClick={() => {
                    setShowAlertsDropdown(false);
                    navigate('/alerts');
                  }}
                  className="text-[11px] text-teal-400 hover:underline flex items-center gap-1"
                >
                  <span>View All</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="divide-y divide-healthcare-borderSubtle mt-2 max-h-64 overflow-y-auto">
                {unreadAlerts.slice(0, 3).map((alert) => (
                  <div key={alert.id} className="py-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-healthcare-textPrimary">
                        {alert.patientName}
                      </span>
                      <span className="text-[10px] text-healthcare-textMuted">
                        {alert.timestamp.split(' ')[0]}
                      </span>
                    </div>
                    <p className="text-[11px] text-healthcare-textSecondary truncate mt-0.5">
                      {alert.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Global Privacy Status Pill */}
        <button
          onClick={() => navigate('/privacy')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-healthcare-surfaceLight hover:bg-teal-950/60 text-xs text-teal-300 border border-healthcare-borderSubtle transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          <span className="hidden sm:inline">Privacy Engine</span>
        </button>

        {/* Clinician Profile Dropdown */}
        <div className="relative">
          <div
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2 pl-2 border-l border-healthcare-borderSubtle cursor-pointer hover:opacity-85 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-teal-800 text-teal-200 text-xs font-semibold flex items-center justify-center">
              {getInitials(user?.name)}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-healthcare-textPrimary">
                {user?.name || 'Dr. Elena Vance'}
              </div>
              <div className="text-[10px] text-teal-400 font-mono">
                {user?.role || 'DOCTOR'}
              </div>
            </div>
          </div>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-healthcare-surface border border-healthcare-border rounded-xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-healthcare-borderSubtle">
                <div className="text-xs font-semibold text-healthcare-textPrimary truncate">
                  {user?.name}
                </div>
                <div className="text-[10px] text-healthcare-textMuted font-mono truncate">
                  {user?.email}
                </div>
                <div className="text-[10px] text-teal-400 font-mono mt-0.5">
                  Role: {user?.role}
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-healthcare-textSecondary hover:text-white hover:bg-healthcare-surfaceHover flex items-center gap-2"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Profile &amp; Settings</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-rose-400 hover:bg-rose-950/40 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out Session</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
