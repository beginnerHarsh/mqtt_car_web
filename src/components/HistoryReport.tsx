import React from 'react';
import { VehicleStats } from '../services/dynamoService';
import { ArrowLeft, RefreshCw, Gauge, Clock, Eye, ShieldAlert } from 'lucide-react';

interface HistoryReportProps {
  allStats: Record<string, VehicleStats>;
  onBack: () => void;
  onRefresh: () => void;
  onLocateVehicle: (id: string) => void;
  loading?: boolean;
}

export const HistoryReport: React.FC<HistoryReportProps> = ({
  allStats,
  onBack,
  onRefresh,
  onLocateVehicle,
  loading = false,
}) => {
  const getVehicleName = (id: string) => {
    if (id === 'MAHINDRA') return 'Mahindra';
    if (id === 'JOHN_DEERE') return 'John Deere';
    if (id === 'SWARAJ') return 'Swaraj';
    if (id === 'SONALIKA') return 'Sonalika';
    if (id === 'FARMTRAC') return 'Farmtrac';
    return id;
  };

  const getVehicleImg = (_id: string) => {
    return '🚜';
  };

  // Compute fleet totals
  const statsList = Object.values(allStats);
  const totalDistance = statsList.reduce((sum, s) => sum + s.Total_Distance, 0);
  const totalActiveTime = statsList.reduce((sum, s) => sum + s.Active_Duration, 0);
  const activeCount = statsList.filter(s => s.Last_Status === 'moving').length;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const formatTimestamp = (timestampStringOrNum?: number | string) => {
    if (!timestampStringOrNum) return '—';
    try {
      const ms = typeof timestampStringOrNum === 'string' 
        ? parseInt(timestampStringOrNum) * 1000 
        : timestampStringOrNum * 1000;
      
      // If it's a future or past invalid timestamp, return fallback
      if (isNaN(ms) || ms <= 0) return String(timestampStringOrNum);
      
      return new Date(ms).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch {
      return String(timestampStringOrNum);
    }
  };

  return (
    <div className="w-full h-full bg-slate-900 text-slate-100 p-6 overflow-y-auto flex flex-col font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/50"
            title="Go Back to Map"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white">Fleet Journey History Reports</h1>
            <p className="text-xs text-slate-400">Aggregated real-time operational summaries from DynamoDB</p>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white rounded-xl shadow-md transition-all active:scale-[0.98]"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Stats
        </button>
      </div>

      {/* Fleet Totals Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
        <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Total Fleet Distance</span>
            <span className="text-2xl font-black text-white font-mono">{(totalDistance / 1000).toFixed(2)} km</span>
          </div>
        </div>

        <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Total Active Worktime</span>
            <span className="text-2xl font-black text-white font-mono">{formatDuration(totalActiveTime)}</span>
          </div>
        </div>

        <div className="p-4 bg-slate-800/60 border border-slate-700/50 rounded-2xl flex items-center gap-4">
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Active Moving Fleet</span>
            <span className="text-2xl font-black text-white font-mono">{activeCount} / {statsList.length}</span>
          </div>
        </div>
      </div>

      {/* Fleet Summary Table */}
      <div className="flex-1 bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-800/30">
                <th className="py-4 px-5">Vehicle Name & ID</th>
                <th className="py-4 px-4 text-right">Distance Moved</th>
                <th className="py-4 px-4 text-right">Active Duration</th>
                <th className="py-4 px-4 text-right">Idling Duration</th>
                <th className="py-4 px-4 text-right">Idling Rate</th>
                <th className="py-4 px-4">Journey Start Time</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {statsList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    No vehicle journey stats found in DynamoDB. Run send_telemetry.py to generate records.
                  </td>
                </tr>
              ) : (
                statsList.map((s) => {
                  const total = s.Active_Duration + s.Idle_Duration;
                  const idlePercent = total > 0 ? Math.round((s.Idle_Duration / total) * 100) : 0;
                  
                  return (
                    <tr key={s.Device_ID} className="hover:bg-slate-800/25 transition-colors text-slate-200">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl bg-slate-800 p-2 rounded-xl border border-slate-700/30 shrink-0">
                            {getVehicleImg(s.Device_ID)}
                          </span>
                          <div>
                            <span className="font-bold text-sm text-white block">{getVehicleName(s.Device_ID)}</span>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wide">{s.Device_ID}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right font-semibold font-mono text-white text-sm">
                        {(s.Total_Distance / 1000).toFixed(2)} km
                      </td>
                      <td className="py-4 px-4 text-right font-semibold font-mono text-slate-200 text-sm">
                        {formatDuration(s.Active_Duration)}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-400 text-sm">
                        {formatDuration(s.Idle_Duration)}
                      </td>
                      <td className="py-4 px-4 text-right text-sm">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="font-semibold font-mono text-slate-300">{idlePercent}%</span>
                          <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden flex">
                            <div className="h-full bg-amber-500" style={{ width: `${idlePercent}%` }} />
                            <div className="h-full bg-emerald-500" style={{ width: `${100 - idlePercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs font-mono text-slate-400">
                        {formatTimestamp(s.Last_Timestamp)}
                      </td>
                      <td className="py-4 px-5 text-center">
                        <button
                          onClick={() => onLocateVehicle(s.Device_ID)}
                          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700/50 hover:border-slate-600 text-slate-200 hover:text-white rounded-lg transition-all active:scale-[0.97]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Line
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
