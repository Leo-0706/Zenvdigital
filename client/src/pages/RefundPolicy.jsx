import React, { useEffect, useState } from 'react';
import { Calendar } from 'lucide-react';

export const RefundPolicy = () => {
  const [refundData, setRefundData] = useState(null);

  useEffect(() => {
    fetch('/api/system/refund-cancellation')
      .then(res => res.json())
      .then(data => setRefundData(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#1A2118] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#EDF2E9] border border-[#BAC8B0] flex items-center justify-center text-[#5E734F] mx-auto mb-4 shadow-sm">
            <Calendar className="w-6 h-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A2118]">
            {refundData?.title || 'Refund, Rescheduling & Cancellation Policy'}
          </h1>
          <p className="text-xs text-[#5A6354] mt-2 font-mono">
            Governs Commercial Crew Bookings, Weather Delays, and Post-Production Retainers
          </p>
        </div>

        <div className="space-y-6">
          {refundData?.policies ? (
            refundData.policies.map((p, idx) => (
              <div key={idx} className="glass-panel p-6 rounded-2xl border border-[#DDD9D0] bg-white shadow-sm">
                <h2 className="text-base font-bold text-[#3D4C33] mb-2">{p.title}</h2>
                <p className="text-sm text-[#5A6354] leading-relaxed">{p.description}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-[#7D8876] font-mono text-xs">Loading cancellation terms...</div>
          )}
        </div>
      </div>
    </div>
  );
};
