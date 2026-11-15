import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, Lock, UserCheck, ArrowRight, Cpu } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('dr.elena.vance@iomt-health.org');
  const [password, setPassword] = useState('••••••••••••');
  const [selectedRole, setSelectedRole] = useState('Cardiologist');

  const demoRoles = [
    { title: 'Cardiologist', name: 'Dr. Elena Vance, MD', email: 'dr.elena.vance@iomt-health.org' },
    { title: 'Privacy Officer', name: 'Marcus Sterling, CIPP/E', email: 'privacy.officer@iomt-health.org' },
    { title: 'Staff Nurse', name: 'Nurse Sarah Davis, RN', email: 'nurse.davis@iomt-health.org' },
    { title: 'Edge Engineer', name: 'Alex Rivera, MSc', email: 'edge.admin@iomt-health.org' },
  ];

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Stage 1 mock authentication - navigate directly to dashboard
    navigate('/dashboard');
  };

  const selectDemoRole = (role: typeof demoRoles[0]) => {
    setSelectedRole(role.title);
    setEmail(role.email);
  };

  return (
    <div className="min-h-screen bg-[#050B0A] text-[#E6F4F1] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background subtle geometry */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-teal-950/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-950 border border-teal-700/60 text-teal-400 mb-4 shadow-xl">
            <Activity className="w-8 h-8 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-healthcare-textPrimary">
            IoMT PulseGuard
          </h1>
          <p className="text-xs text-healthcare-textSecondary mt-1">
            Privacy-Aware Remote Patient Monitoring System
          </p>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-950/80 border border-teal-800/60 text-teal-300 text-[11px] font-mono mt-2.5">
            <Cpu className="w-3 h-3 text-emerald-400" />
            <span>Decentralized Edge Node Ingestion Active</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-2xl p-6 md:p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1.5">
                Clinical Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="clinician@hospital-rpm.org"
                  className="w-full rounded-lg bg-healthcare-surfaceLight border border-healthcare-border px-3.5 py-2.5 text-sm text-healthcare-textPrimary placeholder:text-healthcare-textMuted focus:outline-none focus:border-teal-500 transition-colors font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider">
                  Access Credential / Token
                </label>
                <span className="text-[11px] text-teal-400 hover:underline cursor-pointer">
                  Hardware Token
                </span>
              </div>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-lg bg-healthcare-surfaceLight border border-healthcare-border px-3.5 py-2.5 text-sm text-healthcare-textPrimary focus:outline-none focus:border-teal-500 transition-colors font-mono"
                />
              </div>
            </div>

            {/* Quick Demo Role Selector */}
            <div className="pt-2">
              <span className="block text-[11px] font-medium text-healthcare-textMuted uppercase tracking-wider mb-2">
                Quick Demo Role Selector (Stage 1)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {demoRoles.map((role) => (
                  <button
                    type="button"
                    key={role.title}
                    onClick={() => selectDemoRole(role)}
                    className={`text-left p-2 rounded-lg border text-xs transition-colors ${
                      selectedRole === role.title
                        ? 'bg-teal-950/80 border-teal-600/70 text-teal-200'
                        : 'bg-healthcare-surfaceLight border-healthcare-borderSubtle text-healthcare-textSecondary hover:border-healthcare-border'
                    }`}
                  >
                    <div className="font-semibold text-[11px] text-healthcare-textPrimary">
                      {role.title}
                    </div>
                    <div className="text-[10px] text-healthcare-textMuted truncate">
                      {role.name}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-medium text-sm transition-colors border border-teal-500/40 shadow-lg shadow-teal-950"
            >
              <UserCheck className="w-4 h-4" />
              <span>Launch Clinical Portal</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </form>

          {/* Privacy & Compliance Footer */}
          <div className="mt-6 pt-5 border-t border-healthcare-borderSubtle flex items-center justify-between text-[11px] text-healthcare-textMuted">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-teal-400" />
              <span>HIPAA &amp; GDPR Compliant</span>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Laplace DP Active</span>
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-healthcare-textMuted mt-6">
          IoMT Edge Computing Remote Patient Telemetry Prototype • Stage 1
        </p>
      </div>
    </div>
  );
};
