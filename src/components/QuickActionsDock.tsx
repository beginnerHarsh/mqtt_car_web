import React from 'react';
import { Navigation, Route, History } from 'lucide-react';

interface QuickActionsDockProps {
  onLocate: () => void;
  onToggleRoute?: () => void;
  onToggleHistory?: () => void;
  isAutoFollow?: boolean;
  isRouteVisible?: boolean;
  isHistoryVisible?: boolean;
}

export const QuickActionsDock: React.FC<QuickActionsDockProps> = ({
  onLocate,
  onToggleRoute,
  onToggleHistory,
  isAutoFollow = true,
  isRouteVisible = true,
  isHistoryVisible = false,
}) => {
  return (
    <div className="fixed bottom-3 sm:bottom-6 left-1/2 transform -translate-x-1/2 z-30 font-sans max-w-[95vw]">
      <div className="bg-slate-900/95 backdrop-blur-xl rounded-full shadow-2xl px-2.5 sm:px-3.5 py-1.5 sm:py-2 flex items-center gap-1 sm:gap-2 border border-slate-700/80">
        {/* Locate Action */}
        <button
          onClick={onLocate}
          className="flex flex-col items-center justify-center gap-1 min-w-16 px-2 py-1.5 rounded-full hover:bg-slate-800/80 transition-all group"
          title="Recenter & Auto-Follow Vehicle"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isAutoFollow
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
            }`}
          >
            <Navigation className={`w-4 h-4 ${isAutoFollow ? 'animate-pulse' : ''}`} />
          </div>
          <span className="text-[10px] font-bold text-slate-300">Locate</span>
        </button>

        <div className="w-px h-7 bg-slate-800" />

        {/* Route Action (Toggle Route Path Line Visibility) */}
        <button
          onClick={onToggleRoute}
          className="flex flex-col items-center justify-center gap-1 min-w-16 px-2 py-1.5 rounded-full hover:bg-slate-800/80 transition-all group"
          title="Toggle Vehicle Path Line Visibility"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isRouteVisible
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
            }`}
          >
            <Route className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-300">Route</span>
        </button>

        {/* History Action */}
        <button
          onClick={onToggleHistory}
          className="flex flex-col items-center justify-center gap-1 min-w-16 px-2 py-1.5 rounded-full hover:bg-slate-800/80 transition-all group"
          title="View Telemetry Journey History Reports"
        >
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              isHistoryVisible
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                : 'bg-slate-800 text-slate-400 group-hover:text-white group-hover:bg-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-slate-300">History</span>
        </button>
      </div>
    </div>
  );
};
