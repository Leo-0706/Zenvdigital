import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export const Home = () => {
  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] overflow-x-hidden bg-[#1A2118] text-[#F8F6F0] flex flex-col justify-between">
      {/* 1. Rich Ambient Cinematic Studio Background (No video) */}
      <div className="absolute inset-0 bg-[#161D14] pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-[#5E734F]/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[350px] bg-[#3B4C30]/25 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-10 left-10 w-[400px] h-[300px] bg-[#273522]/30 rounded-full blur-[100px] pointer-events-none" />
        {/* Subtle grid pattern for precision studio aesthetic */}
        <div 
          className="absolute inset-0 opacity-[0.035] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
            backgroundSize: '36px 36px'
          }}
        />
      </div>

      {/* 2. Top Ambient Beacon */}
      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 pt-6 flex items-center justify-start">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 backdrop-blur-md border border-white/10 text-[#EFECE5] text-[11px] sm:text-xs font-mono tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#7D956C] animate-pulse" />
          <span>PRODUCTION SUITE • CLIENT REVIEW</span>
        </div>
      </div>

      {/* 3. Central Hero Statement (Minimal & Bold, Fully Responsive) */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center my-auto py-10 flex flex-col items-center">
        {/* Official Brand Logo Mark */}
        <div className="mb-4 sm:mb-6 flex items-center justify-center">
          <img 
            src="/zenv_logo_dark.png" 
            alt="zenvdigital - IDEAS TODAY A BRIGHTER TOMORROW" 
            className="h-14 sm:h-20 md:h-24 w-auto object-contain drop-shadow-[0_12px_30px_rgba(0,0,0,0.6)] hover:scale-105 transition-transform duration-300"
          />
        </div>

        <span className="text-[10px] sm:text-xs font-mono tracking-[0.25em] sm:tracking-[0.3em] uppercase text-[#BAC8B0] font-semibold mb-3 sm:mb-4">
          Zenv Digital Production Studio
        </span>

        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tight text-white leading-tight sm:leading-none">
          ZENV DIGITAL
        </h1>

        <p className="mt-4 sm:mt-5 text-sm sm:text-lg md:text-xl text-[#E5E2DA] font-light tracking-wide max-w-2xl px-2">
          Commercial Video Production. <span className="font-semibold text-white">Direct Client Review & Master Delivery.</span>
        </p>

        {/* Primary Call to Action */}
        <div className="mt-6 sm:mt-8 flex items-center justify-center gap-4 w-full sm:w-auto px-4">
          <Link
            to="/login"
            className="group flex items-center justify-center gap-3 px-7 sm:px-8 py-3.5 rounded-full bg-[#5E734F] hover:bg-[#4E6240] text-white font-bold text-xs sm:text-sm shadow-2xl shadow-[#5E734F]/40 border border-[#8FA282]/50 transition-all hover:scale-105 min-h-[44px] w-full sm:w-auto"
          >
            <span>Enter Client Portal</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* 4. Clean Bottom Strip (Three Pillars & Minimal Links) */}
      <div className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-md py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-[#D5D0C5]">
          {/* Production Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-[11px] sm:text-xs">
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <span className="text-[#8FA282]">01</span> 4K Cinema Capture
            </span>
            <span className="text-white/30 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <span className="text-[#8FA282]">02</span> Interactive Client Review
            </span>
            <span className="text-white/30 hidden sm:inline">•</span>
            <span className="flex items-center gap-1.5 text-white font-semibold">
              <span className="text-[#8FA282]">03</span> Google Cloud Asset Sync
            </span>
          </div>

          {/* Discreet Legal Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-[#A6A094]">
            <Link to="/privacy-policy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link to="/terms-conditions" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <Link to="/refund-policy" className="hover:text-white transition-colors">
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
