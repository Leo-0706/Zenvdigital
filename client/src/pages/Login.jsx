import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, AlertTriangle,
  CheckCircle, UserCheck, Globe, Settings2
} from 'lucide-react';

export const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status indicators
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [lockoutInfo, setLockoutInfo] = useState(null);

  // Mobile / Network Server URL Configuration
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(() => localStorage.getItem('zenv_api_host') || 'http://192.168.29.140:5000');
  const [serverSavedMsg, setServerSavedMsg] = useState('');

  const handleSaveServerUrl = (e) => {
    e.preventDefault();
    const cleanUrl = serverUrlInput.trim().replace(/\/+$/, '');
    localStorage.setItem('zenv_api_host', cleanUrl);
    setServerSavedMsg('Server endpoint saved. Retrying will connect to: ' + cleanUrl);
    setTimeout(() => setServerSavedMsg(''), 4000);
  };

  // Handle Login
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setIsSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');
    setLockoutInfo(null);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      const destination = location.state?.from?.pathname || (result.user.role === 'ADMIN' ? '/admin' : '/portal');
      navigate(destination, { replace: true });
    } else {
      if (result.data?.error === 'IP_LOCKED_OUT' || result.data?.error === 'ACCESS_RESTRICTED') {
        setLockoutInfo(result.data);
      } else {
        setErrorMessage(
          result.data?.message || 'Authentication failed. Please verify your credentials.'
        );
        if (result.data?.remainingAttempts !== undefined) {
          setErrorMessage(
            `${result.data.message} (${result.data.remainingAttempts} attempts remaining before IP lockout)`
          );
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] via-[#EEF4EC] to-[#F3EEFA] text-[#1D241C] flex flex-col justify-center items-center px-3 sm:px-6 relative py-6 sm:py-12 overflow-x-hidden selection:bg-[#DDD0F5] selection:text-[#362348]">
      
      {/* Ambient background soft light glow mix (Light Beige + Light Green + Light Lavender) */}
      <div className="absolute -top-24 -left-20 w-[450px] h-[450px] rounded-full bg-[#E1EDDD]/60 blur-[130px] -z-10 pointer-events-none" />
      <div className="absolute -bottom-24 -right-20 w-[480px] h-[480px] rounded-full bg-[#E8DEFA]/65 blur-[140px] -z-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#FBF5EB]/80 blur-[140px] -z-10 pointer-events-none" />

      {/* Official Zenv Digital Brand Header (Merged seamlessly with ambient background) */}
      <div className="text-center mb-6 sm:mb-8 w-full max-w-md">
        <Link to="/" className="inline-block w-full group transition-transform duration-300 hover:scale-[1.02]" title="Back to Zenv Digital Home">
          <div className="flex flex-col items-center justify-center py-1 sm:py-2">
            <img 
              src="/app_icon.png" 
              alt="zenvdigital" 
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl shadow-[0_12px_32px_rgba(48,102,224,0.28)] object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="mt-3 font-bold text-2xl sm:text-3xl tracking-tight text-[#1A2118]">
              zenv<span className="text-[#3066E0]">digital</span>
            </div>
          </div>
          <div className="mt-2.5 sm:mt-3 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-0.5 sm:px-3.5 sm:py-1 rounded-full bg-white/70 border border-[#DDD5E8] shadow-xs backdrop-blur-xs">
              <span className="w-2 h-2 rounded-full bg-[#526B43] animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-mono tracking-wider uppercase font-semibold text-[#5B4F69]">
                <span className="text-[#455A38] font-bold">Secure Gateway</span> <span className="text-[#B3A6C4]">•</span> Client Review Portal
              </span>
            </div>
          </div>
        </Link>
      </div>

      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl border border-[#DDD5E8] bg-[#FCFAF7]/92 backdrop-blur-xl shadow-[0_20px_50px_-10px_rgba(106,85,130,0.12),0_10px_25px_-5px_rgba(94,115,79,0.06)] relative overflow-hidden">
          
          {/* Top color blend accent bar: Light Green -> Light Beige -> Light Lavender */}
          <div className="h-1.5 w-full bg-gradient-to-r from-[#B9D4B0] via-[#F4EFE6] to-[#CDBCED]" />

          <div className="p-5 sm:p-8">
            {/* Heading */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[#1D241C] tracking-tight">
                Portal Sign In
              </h2>
              <p className="text-xs text-[#5D6358] mt-1.5 leading-relaxed">
                Sign in with your enterprise credentials. Edge intrusion detection is actively monitoring.
              </p>
            </div>

            {/* Lockout Banner */}
            {lockoutInfo && (
              <div className="mb-6 p-4 rounded-xl bg-[#FDF2F2] border border-[#E8BDBD] text-[#8C2C2C] text-xs">
                <div className="flex items-center gap-2 font-bold text-[#8C2C2C] mb-1">
                  <ShieldAlert className="w-4 h-4" />
                  IP LOCKOUT ACTIVATED
                </div>
                <p>{lockoutInfo.message}</p>
                <div className="mt-2 text-[11px] font-mono text-[#8C2C2C]">
                  Lockout Window: {lockoutInfo.lockoutExpiresInMinutes || 15} minutes. Admin alert dispatched.
                </div>
              </div>
            )}

            {/* Success Banner */}
            {successMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-[#EEF5EB] border border-[#BDD6B3] text-[#334D28] text-xs flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#526B43] shrink-0 mt-0.5" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Standard Error Notice */}
            {errorMessage && !lockoutInfo && (
              <div className="mb-6 p-3.5 rounded-xl bg-[#FEF9EE] border border-[#F0D59D] text-[#8C5D1E] text-xs space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-[#A6732B] shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
                <div className="pt-2 border-t border-[#F0D59D]/60 flex items-center justify-between">
                  <span className="text-[11px] text-[#7A5016]">Need to change target server IP?</span>
                  <button 
                    type="button" 
                    onClick={() => setShowServerConfig(!showServerConfig)}
                    className="font-bold underline text-[#7A5016] hover:text-[#52330A] text-[11px]"
                  >
                    {showServerConfig ? 'Close' : 'Set Endpoint'}
                  </button>
                </div>
              </div>
            )}

            {showServerConfig && (
              <div className="mb-6 p-3.5 rounded-xl bg-white/95 border border-[#DDD5E8] shadow-xs text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-[#2A2335]">
                  <Globe className="w-3.5 h-3.5 text-[#5B4380]" />
                  <span>API Server Endpoint</span>
                </div>
                <p className="text-[11px] text-[#554F5E]">
                  Backend server address (e.g. Wi-Fi IP <code className="font-mono bg-[#EFEAF6] px-1 rounded">http://192.168.29.140:5000</code> or your cloud domain):
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={serverUrlInput}
                    onChange={(e) => setServerUrlInput(e.target.value)}
                    placeholder="http://192.168.29.140:5000"
                    className="flex-1 px-3 py-1.5 rounded-lg border border-[#DDD5E8] text-xs font-mono bg-[#FAF8FC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#6E4F98]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveServerUrl}
                    className="px-3 py-1.5 rounded-lg bg-[#3D324E] text-white font-bold text-xs hover:bg-[#52446A]"
                  >
                    Save
                  </button>
                </div>
                {serverSavedMsg && <div className="text-[10px] text-green-700 font-semibold">{serverSavedMsg}</div>}
              </div>
            )}

            {/* SIGN IN FORM */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#45523F] uppercase tracking-wider mb-2">
                  Work Email / Client ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7486]" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="name@company.com"
                    className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm bg-white/85 border border-[#D9D3E0] focus:border-[#7A6498] focus:ring-2 focus:ring-[#DFD3F4]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#45523F] uppercase tracking-wider mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#7A7486]" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-sm bg-white/85 border border-[#D9D3E0] focus:border-[#7A6498] focus:ring-2 focus:ring-[#DFD3F4]/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A7486] hover:text-[#1D241C] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#293623] via-[#333140] to-[#2B2338] hover:from-[#35452E] hover:via-[#3E3C4E] hover:to-[#382E47] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In Securely</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Informational Note: Admin-Created Accounts Only */}
              <div className="mt-4 p-3 rounded-xl bg-gradient-to-r from-[#F7F4EB]/90 via-[#EEF4EB]/90 to-[#F4EEFA]/90 border border-[#D8D0E2] text-[11px] text-[#4F544C] flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-[#526B43] shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1D241C]">Client Portal Access:</strong> Client accounts and secure credentials are created exclusively by the Zenv Digital administration upon studio onboarding.
                </div>
              </div>

              {/* Server endpoint toggle */}
              <div className="mt-2 text-center">
                <button
                  type="button"
                  onClick={() => setShowServerConfig(!showServerConfig)}
                  className="text-[11px] text-[#7A7285] hover:text-[#4A3D60] underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 className="w-3 h-3" />
                  <span>{showServerConfig ? 'Hide Server Settings' : 'Network Server Settings'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>

        {/* Security badge */}
        <div className="text-center mt-6 text-xs text-[#6E647A] flex items-center justify-center gap-2 font-mono">
          <ShieldAlert className="w-3.5 h-3.5 text-[#7A6498]" />
          <span>Admin-Controlled Provisioning • IP Intrusion Defense</span>
        </div>
      </div>
    </div>
  );
};
