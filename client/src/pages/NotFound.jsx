import React from 'react';
import { Link } from 'react-router-dom';
import { Film, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="min-h-screen bg-[#F8F6F0] flex flex-col justify-center items-center px-4 text-center text-[#1A2118]">
      <div className="w-16 h-16 rounded-2xl bg-[#EDF2E9] border border-[#BAC8B0] flex items-center justify-center text-[#5E734F] mb-6 shadow-sm">
        <Film className="w-8 h-8" />
      </div>

      <span className="font-mono text-xs text-[#5E734F] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#EDF2E9] border border-[#BAC8B0]">
        Error 404 • Cut Not Found
      </span>

      <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1A2118] mt-4">
        Missing Frame
      </h1>

      <p className="mt-3 text-sm text-[#5A6354] max-w-md">
        The requested production asset, shoot record, or page does not exist on this gateway.
      </p>

      <div className="mt-8 flex gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white font-bold text-xs shadow-md shadow-[#5E734F]/20 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Return to Agency Home
        </Link>
      </div>
    </div>
  );
};
