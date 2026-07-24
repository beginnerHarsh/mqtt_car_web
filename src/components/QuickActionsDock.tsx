import React from 'react';
import { Navigation, Route, History, PhoneCall, AlertTriangle } from 'lucide-react';

interface QuickActionsDockProps {
  onLocate: () => void;
  onToggleRoute?: () => void;
  onToggleHistory?: () => void;
  onContact?: () => void;
  onEmergency?: () => void;
  isAutoFollow?: boolean;
  isRouteVisible?: boolean;
  isHistoryVisible?: boolean;
}

export const QuickActionsDock: React.FC<QuickActionsDockProps> = ({
  onLocate,
  onToggleRoute,
  onToggleHistory,
  onContact,
  onEmergency,
  isAutoFollow = true,
  isRouteVisible = true,
  isHistoryVisible = false,
}) => {
  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30">
      <div className="bg-white/95 backdrop-blur-md rounded-full shadow-xl px-3 py-2 flex items-center gap-2 border border-slate-200/80">
        {/* Locate Action */}
        <button
          onClick={onLocate}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] px-2 py-1.5 rounded-full hover:bg-slate-100 transition-all group"
          title="Recenter & Auto-Follow Vehicle"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isAutoFollow
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-blue-50 text-blue-600 group-hover:bg-blue-100'
            }`}
          >
            <Navigation className={`w-4 h-4 ${isAutoFollow ? 'animate-pulse' : ''}`} />
          </div>
          <span className="text-[10px] font-semibold text-slate-600">Locate</span>
        </button>

        <div className="w-px h-7 bg-slate-200" />

        {/* Route Action (Toggle Route Path Line Visibility) */}
        <button
          onClick={onToggleRoute}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] px-2 py-1.5 rounded-full hover:bg-slate-100 transition-all group"
          title="Toggle Vehicle Path Line Visibility"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isRouteVisible
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
            }`}
          >
            <Route className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold text-slate-600">Route</span>
        </button>

        {/* History Action */}
        <button
          onClick={onToggleHistory}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] px-2 py-1.5 rounded-full hover:bg-slate-100 transition-all group"
          title="View Telemetry Packet History"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isHistoryVisible
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                : 'bg-slate-100 text-slate-700 group-hover:bg-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold text-slate-600">History</span>
        </button>

        {/* Contact Action */}
        <button
          onClick={onContact}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] px-2 py-1.5 rounded-full hover:bg-slate-100 transition-all group"
          title="Contact Driver"
        >
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 text-slate-700 transition-all">
            <PhoneCall className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold text-slate-600">Contact</span>
        </button>

        <div className="w-px h-7 bg-slate-200" />

        {/* Emergency Action */}
        <button
          onClick={onEmergency}
          className="flex flex-col items-center justify-center gap-1 min-w-[64px] px-2 py-1.5 rounded-full hover:bg-rose-50 transition-all group"
          title="Trigger Emergency Alert"
        >
          <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center group-hover:bg-rose-200 text-rose-600 transition-all">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-semibold text-rose-600">Emergency</span>
        </button>
      </div>
    </div>
  );
};
