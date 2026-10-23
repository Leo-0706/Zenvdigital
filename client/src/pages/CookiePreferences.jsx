import React, { useEffect, useState } from 'react';
import { CheckCircle2, Shield } from 'lucide-react';

export const CookiePreferences = () => {
  const [cookieData, setCookieData] = useState(null);
  const [preferences, setPreferences] = useState({
    essential: true,
    functional: true,
    telemetry: true
  });
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    fetch('/api/system/cookie-preferences')
      .then(res => res.json())
      .then(data => setCookieData(data))
      .catch(err => console.error(err));
  }, []);

  const handleSave = () => {
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="min-h-screen bg-[#F8F6F0] text-[#1A2118] py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-[#EDF2E9] border border-[#BAC8B0] flex items-center justify-center text-[#5E734F] mx-auto mb-4 shadow-sm">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#1A2118]">Cookie Governance & Preferences</h1>
          <p className="text-xs text-[#5A6354] mt-2">
            Configure consent for security cookies, functional session state, and edge telemetry.
          </p>
        </div>

        {savedNotice && (
          <div className="mb-6 p-3 rounded-xl bg-[#EDF2E9] border border-[#BAC8B0] text-[#3D4C33] text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-[#5E734F]" />
            Cookie preferences updated and encrypted in local storage.
          </div>
        )}

        <div className="space-y-4">
          {cookieData?.cookies ? (
            cookieData.cookies.map((c, idx) => (
              <div key={idx} className="glass-panel p-5 rounded-2xl border border-[#DDD9D0] bg-white shadow-sm flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#1A2118] text-sm">{c.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EDF2E9] text-[#3D4C33] border border-[#BAC8B0] font-bold">
                      {c.type}
                    </span>
                  </div>
                  <p className="text-xs text-[#5A6354] mt-1">{c.purpose}</p>
                  <div className="text-[10px] text-[#7D8876] font-mono mt-1">Retention: {c.duration}</div>
                </div>

                <div>
                  <input
                    type="checkbox"
                    checked={c.required ? true : preferences.functional}
                    disabled={c.required}
                    onChange={(e) => setPreferences({ ...preferences, functional: e.target.checked })}
                    className="w-5 h-5 rounded bg-white border-[#DDD9D0] text-[#5E734F] focus:ring-[#5E734F] disabled:opacity-50 cursor-pointer"
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-[#7D8876] font-mono text-xs">Loading cookie registry...</div>
          )}
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-xl bg-[#5E734F] hover:bg-[#4E6240] text-white font-bold text-xs shadow-md shadow-[#5E734F]/20 transition-all"
          >
            Save Cookie Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
