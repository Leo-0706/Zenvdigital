import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Film, LogOut, User, Lock, Menu, X, ArrowRight } from 'lucide-react';

export const Navbar = () => {
  const { user, isAdmin, isClient, logout, maintenanceMode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/login');
  };

  const navLinks = [
    { label: 'Agency', path: '/' },
    { label: 'Compliance', path: '/privacy-policy' },
    { label: 'Terms & Conditions', path: '/terms-conditions' },
    { label: 'Refunds', path: '/refund-policy' }
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#F8F6F0]/95 backdrop-blur-md border-b border-[#DDD9D0]">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0" title="Zenv Digital Home">
          <div className="flex items-center justify-center">
            <img 
              src="/app_icon.png" 
              alt="zenvdigital" 
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-xs object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <span className="font-bold text-lg sm:text-xl tracking-tight text-[#1A2118]">
            zenv<span className="text-[#3066E0]">digital</span>
          </span>
          <div className="hidden sm:block pl-2 border-l border-[#DDD9D0]">
            <div className="text-[10px] text-[#666F60] tracking-wider font-mono uppercase font-semibold">
              Production Studio • SLA Engine
            </div>
          </div>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-[#4D5546]">
          {navLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`transition-colors py-1 ${
                location.pathname === item.path ? 'text-[#1A2118] font-bold' : 'hover:text-[#1A2118]'
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Status Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white border border-[#DDD9D0] text-xs shadow-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                maintenanceMode ? 'bg-[#A6732B] animate-pulse' : 'bg-[#5E734F] animate-ping'
              }`}
            />
            <span className="text-[#666F60] font-mono text-[11px] whitespace-nowrap">
              {maintenanceMode ? 'Maintenance Mode' : 'Edge Shield Armed'}
            </span>
          </div>
        </nav>

        {/* User Status / Action Buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDF2E9] border border-[#BAC8B0] text-[#3D4C33] text-xs font-semibold hover:bg-[#E2ECD9] transition-all min-h-[38px]"
                >
                  <Shield className="w-3.5 h-3.5 text-[#5E734F]" />
                  <span className="hidden sm:inline">Admin Console</span>
                  <span className="sm:hidden">Admin</span>
                </Link>
              )}

              {isClient && (
                <Link
                  to="/portal"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EDF2E9] border border-[#BAC8B0] text-[#3D4C33] text-xs font-semibold hover:bg-[#E2ECD9] transition-all min-h-[38px]"
                >
                  <Film className="w-3.5 h-3.5 text-[#5E734F]" />
                  <span className="hidden sm:inline">Review Portal</span>
                  <span className="sm:hidden">Portal</span>
                </Link>
              )}

              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-[#DDD9D0] shadow-xs">
                <div className="w-6 h-6 rounded-full bg-[#EDF2E9] flex items-center justify-center text-xs text-[#3D4C33]">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-medium text-[#1A2118] truncate max-w-[130px]">{user.name || user.email}</div>
                  <div className="text-[10px] text-[#5E734F] font-mono uppercase font-bold">{user.role}</div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-xl text-[#666F60] hover:text-[#BD4848] hover:bg-[#FDF2F2] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center border border-transparent hover:border-red-200"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white text-xs font-bold shadow-md shadow-[#5E734F]/20 transition-all hover:scale-[1.02] min-h-[38px]"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Portal Sign In</span>
            </Link>
          )}

          {/* Mobile Menu Hamburger Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#1A2118] hover:bg-[#EFECE5] border border-[#DDD9D0] transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
            title="Toggle Menu"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#DDD9D0] bg-[#FAF8F5] p-4 space-y-3 animate-fade-in shadow-xl">
          <nav className="space-y-1">
            {navLinks.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between p-3 rounded-xl text-xs font-medium transition-colors ${
                  location.pathname === item.path
                    ? 'bg-[#1A2118] text-white font-bold'
                    : 'text-[#4D5546] hover:bg-white hover:text-[#1A2118]'
                }`}
              >
                <span>{item.label}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </Link>
            ))}
          </nav>

          <div className="pt-2 border-t border-[#DDD9D0] flex items-center justify-between text-xs text-[#666F60]">
            <span className="font-mono text-[11px]">System Status:</span>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-[#DDD9D0] text-[11px]">
              <span className={`w-2 h-2 rounded-full ${maintenanceMode ? 'bg-[#A6732B]' : 'bg-[#5E734F]'}`} />
              <span>{maintenanceMode ? 'Maintenance' : 'Edge Armed'}</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
