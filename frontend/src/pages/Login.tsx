import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, ShieldCheck, Lock, UserCheck, ArrowRight, Cpu, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('dr.vance@iomt-health.org');
  const [password, setPassword] = useState('Doctor123!');
  const [selectedRole, setSelectedRole] = useState('Doctor (Cardiologist)');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick Demo credentials matching seeded PostgreSQL accounts
  const demoAccounts = [
    {
      title: 'Doctor (Cardiologist)',
      name: 'Dr. Elena Vance, MD',
      email: 'dr.vance@iomt-health.org',
      pass: 'Doctor123!',
      badge: 'DOCTOR',
    },
    {
      title: 'Chief Administrator',
      name: 'Dr. Gregory House, MD',
      email: 'admin@iomt-health.org',
      pass: 'Admin123!',
      badge: 'ADMIN',
    },
    {
      title: 'Tele-ICU Nurse',
      name: 'Sarah Davis, RN',
      email: 'nurse.davis@iomt-health.org',
      pass: 'Nurse123!',
      badge: 'NURSE',
    },
    {
      title: 'Attending Doctor 2',
      name: 'Dr. Aris Thorne, MD',
      email: 'dr.thorne@iomt-health.org',
      pass: 'Doctor123!',
      badge: 'DOCTOR',
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      await login(email, password);
      // Navigate to previous location or dashboard
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      const serverMsg =
        err?.response?.data?.error?.message ||
        err?.message ||
        'Authentication failed. Please verify your credentials.';
      setErrorMsg(serverMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectDemoAccount = (acc: typeof demoAccounts[0]) => {
    setSelectedRole(acc.title);
    setEmail(acc.email);
    setPassword(acc.pass);
    setErrorMsg(null);
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
            <span>PostgreSQL JWT Session &amp; Edge Ingestion Active</span>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-healthcare-surface border border-healthcare-border rounded-2xl p-6 md:p-8 shadow-2xl">
          {errorMsg && (
            <div className="mb-5 p-3 rounded-xl bg-rose-950/60 border border-rose-800/70 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider mb-1.5">
                Clinical Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="clinician@hospital-rpm.org"
                className="w-full rounded-lg bg-healthcare-surfaceLight border border-healthcare-border px-3.5 py-2.5 text-sm text-healthcare-textPrimary placeholder:text-healthcare-textMuted focus:outline-none focus:border-teal-500 transition-colors font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-healthcare-textSecondary uppercase tracking-wider">
                  Password
                </label>
                <span className="text-[11px] text-teal-400 font-mono">
                  Bcrypt Protected
                </span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg bg-healthcare-surfaceLight border border-healthcare-border px-3.5 py-2.5 text-sm text-healthcare-textPrimary focus:outline-none focus:border-teal-500 transition-colors font-mono"
              />
            </div>

            {/* Quick Demo Role Selector */}
            <div className="pt-2">
              <span className="block text-[11px] font-medium text-healthcare-textMuted uppercase tracking-wider mb-2">
                Quick Seeded Accounts (PostgreSQL Users)
              </span>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    type="button"
                    key={acc.email}
                    onClick={() => selectDemoAccount(acc)}
                    className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      selectedRole === acc.title
                        ? 'bg-teal-950/80 border-teal-600/70 text-teal-200'
                        : 'bg-healthcare-surfaceLight border-healthcare-borderSubtle text-healthcare-textSecondary hover:border-healthcare-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-[11px] text-healthcare-textPrimary">
                        {acc.title}
                      </span>
                      <span className="text-[9px] px-1 rounded bg-teal-950 text-teal-400 border border-teal-800">
                        {acc.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-healthcare-textMuted truncate">
                      {acc.email}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white font-medium text-sm transition-colors border border-teal-500/40 shadow-lg shadow-teal-950 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Sign In to Clinical Portal</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Compliance Footer */}
          <div className="mt-6 pt-5 border-t border-healthcare-borderSubtle flex items-center justify-between text-[11px] text-healthcare-textMuted">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-teal-400" />
              <span>HttpOnly JWT Cookie</span>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>PostgreSQL Authenticated</span>
            </span>
          </div>
        </div>

        <p className="text-center text-xs text-healthcare-textMuted mt-6">
          IoMT Edge Computing Remote Patient Telemetry Prototype • Stage 2
        </p>
      </div>
    </div>
  );
};
