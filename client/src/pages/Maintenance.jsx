import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Wrench, Shield, Lock } from 'lucide-react';

export const Maintenance = () => {
  const { maintenanceMode, login } = useAuth();
  const navigate = useNavigate();
  const [bypassEmail, setBypassEmail] = useState('');
  const [bypassPassword, setBypassPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminBypass = async (e) => {
    e.preventDefault();
    const result = await login(bypassEmail, bypassPassword);
    if (result.success && result.user.role === 'ADMIN') {
      navigate('/admin', { replace: true });
    } else {
      setErrorMsg('Unauthorized: Only verified system administrators can bypass active maintenance.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-center items-center px-4 sm:px-6 relative text-[#1A2118]">
      <div className="absolute top-1/3 w-[500px] h-[350px] bg-[#8FA282]/15 blur-[130px] -z-10 pointer-events-none" />

      <div className="max-w-lg w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#EDF2E9] border border-[#BAC8B0] flex items-center justify-center text-[#5E734F] mx-auto mb-6 shadow-md">
          <Wrench className="w-8 h-8 animate-pulse" />
        </div>

        <span className="px-3.5 py-1 rounded-full text-xs font-mono font-bold bg-[#FEF9EE] border border-[#F0D59D] text-[#8C5D1E] uppercase tracking-widest">
          Scheduled Infrastructure Maintenance
        </span>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A2118] mt-4 tracking-tight">
          System Upgrade in Progress
        </h1>

        <p className="mt-3 text-sm text-[#5A6354] leading-relaxed max-w-md mx-auto">
          Zenv Digital is currently performing scheduled edge security optimizations and database synchronization. Full platform services will resume shortly.
        </p>

        <div className="mt-6 p-4 rounded-xl glass-panel border border-[#DDD9D0] bg-white text-xs font-mono text-[#5A6354] space-y-1 shadow-sm">
          <div>Status: <span className="text-[#A6732B] font-bold">EDGE_SYSTEMS_UPGRADING</span></div>
          <div>Emergency Support: <span className="text-[#1A2118] font-semibold">support@zenvdigital.com</span></div>
        </div>

        {/* Administrator Bypass Form */}
        <div className="mt-10 pt-6 border-t border-[#DDD9D0] text-left">
          <div className="text-xs font-bold text-[#1A2118] uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#5E734F]" />
            Administrator Emergency Bypass
          </div>
          <p className="text-[11px] text-[#7D8876] mb-3">
            System engineers may sign in with root admin credentials to override maintenance restrictions.
          </p>

          {errorMsg && (
            <div className="mb-3 p-2.5 rounded-lg bg-[#FDF2F2] border border-[#E8BDBD] text-[#8C2C2C] text-xs">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleAdminBypass} className="space-y-2">
            <input
              type="email"
              placeholder="admin@zenvdigital.com"
              value={bypassEmail}
              onChange={(e) => setBypassEmail(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs"
            />
            <input
              type="password"
              placeholder="Admin Password"
              value={bypassPassword}
              onChange={(e) => setBypassPassword(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2 text-xs"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Lock className="w-3.5 h-3.5" />
              Bypass Maintenance (Admin Only)
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
