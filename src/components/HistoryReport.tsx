import React, { useState, useEffect, useCallback } from 'react';
import { VehicleStats, fetchDailyVehicleStats } from '../services/dynamoService';
import { DailyVehicleStats } from '../types/vehicle';
import { formatVehicleName } from '../utils/vehicleName';
import { 
  ArrowLeft, 
  RefreshCw, 
  Gauge, 
  Clock, 
  ShieldAlert, 
  Play, 
  Calendar, 
  ChevronDown, 
  ChevronRight, 
  Filter,
  Activity
} from 'lucide-react';

interface HistoryReportProps {
  allStats: Record<string, VehicleStats>;
  onBack: () => void;
  onRefresh: () => void;
  onLocateVehicle: (id: string, routePoints?: [number, number][]) => void;
  loading?: boolean;
}

export const HistoryReport: React.FC<HistoryReportProps> = ({
  allStats,
  onBack,
  onRefresh,
  onLocateVehicle,
  loading = false,
}) => {
  // Date filter state: 'all' | 'today' | 'yesterday' | 'last7' | 'custom'
  const [datePreset, setDatePreset] = useState<string>('all');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Map of deviceId -> DailyVehicleStats[]
  const [dailyStatsMap, setDailyStatsMap] = useState<Record<string, DailyVehicleStats[]>>({});
  const [loadingDaily, setLoadingDaily] = useState<boolean>(false);

  // Expanded vehicle ID for Date-Wise sub-table
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  const getVehicleName = (id: string) => formatVehicleName(id);
  const getVehicleImg = (_id: string) => '🚜';

  const statsList = Object.values(allStats);

  // Fetch daily breakdown for all vehicles on mount or refresh
  const loadAllDailyStats = useCallback(async () => {
    setLoadingDaily(true);
    const newMap: Record<string, DailyVehicleStats[]> = {};
    await Promise.all(
      statsList.map(async (s) => {
        try {
          const daily = await fetchDailyVehicleStats(s.Device_ID);
          newMap[s.Device_ID] = daily;
        } catch (e) {
          console.error(`Error loading daily stats for ${s.Device_ID}:`, e);
          newMap[s.Device_ID] = [];
        }
      })
    );
    setDailyStatsMap(newMap);
    setLoadingDaily(false);
  }, [statsList.map(s => s.Device_ID).join(',')]);

  useEffect(() => {
    loadAllDailyStats();
  }, [loadAllDailyStats]);

  // Helper date calculations
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = yesterdayObj.toISOString().split('T')[0];

  const last7DaysDate = new Date();
  last7DaysDate.setDate(last7DaysDate.getDate() - 7);

  // Filter function for daily stats records
  const isDailyRecordMatched = (record: DailyVehicleStats) => {
    if (datePreset === 'all') return true;
    if (datePreset === 'today') return record.date === todayStr;
    if (datePreset === 'yesterday') return record.date === yesterdayStr;
    if (datePreset === 'last7') {
      return new Date(record.date) >= last7DaysDate;
    }
    if (datePreset === 'custom') {
      return record.date === customDate;
    }
    return true;
  };

  // Compute filtered fleet aggregates based on selected date filter
  let filteredTotalDistance = 0;
  let filteredTotalActiveTime = 0;
  let filteredActiveCount = 0;

  if (datePreset === 'all') {
    filteredTotalDistance = statsList.reduce((sum, s) => sum + s.Total_Distance, 0);
    filteredTotalActiveTime = statsList.reduce((sum, s) => sum + s.Active_Duration, 0);
    filteredActiveCount = statsList.filter((s) => s.Last_Status === 'moving').length;
  } else {
    Object.values(dailyStatsMap).forEach((dailyList) => {
      const matched = dailyList.filter(isDailyRecordMatched);
      matched.forEach((rec) => {
        filteredTotalDistance += rec.totalDistance;
        filteredTotalActiveTime += rec.activeDuration;
      });
      if (matched.some(r => r.date === todayStr)) {
        filteredActiveCount++;
      }
    });
  }

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`;
  };

  const formatOnlyTime = (timestampStringOrNum?: number | string) => {
    if (!timestampStringOrNum) return '—';
    try {
      const ms = typeof timestampStringOrNum === 'string'
        ? (parseInt(timestampStringOrNum) > 1e11 ? parseInt(timestampStringOrNum) : parseInt(timestampStringOrNum) * 1000)
        : (timestampStringOrNum > 1e11 ? timestampStringOrNum : timestampStringOrNum * 1000);
      if (isNaN(ms) || ms <= 0) return '—';
      return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch {
      return '—';
    }
  };

  const toggleExpand = (deviceId: string) => {
    setExpandedDeviceId((prev) => (prev === deviceId ? null : deviceId));
  };

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 p-3 sm:p-6 overflow-y-auto flex flex-col font-sans pb-24 sm:pb-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 border-b border-slate-800/80 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors border border-slate-700/60 shadow-md shrink-0"
            title="Go Back to Map View"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight bg-linear-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
              Date-Wise Farm Machinery History
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-400 font-mono">View daily operational runtime, distance, and historical trip replays</p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
          <button
            onClick={() => {
              onRefresh();
              loadAllDailyStats();
            }}
            disabled={loading || loadingDaily}
            className="flex items-center gap-2 px-3.5 py-2 sm:px-4 sm:py-2.5 text-xs font-extrabold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98]"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading || loadingDaily ? 'animate-spin' : ''}`} />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Filter className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Filter History by Date:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { id: 'all', label: 'All Dates' },
            { id: 'today', label: 'Today' },
            { id: 'yesterday', label: 'Yesterday' },
            { id: 'last7', label: 'Last 7 Days' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setDatePreset(btn.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                datePreset === btn.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-500/30'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {/* Custom Date Picker */}
          <div className="flex items-center gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-800 sm:pl-2 sm:ml-2">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <input
              type="date"
              value={customDate}
              onChange={(e) => {
                setCustomDate(e.target.value);
                setDatePreset('custom');
              }}
              className={`px-3 py-1 rounded-xl text-xs font-mono border bg-slate-950 text-slate-200 transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500 w-full sm:w-auto ${
                datePreset === 'custom' ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-slate-800'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Fleet Totals Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4 mb-4 sm:mb-6 shrink-0">
        <div className="p-3 sm:p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all" />
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-400 shadow-inner shrink-0">
            <Gauge className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block truncate">
              {datePreset === 'all' ? 'Fleet Distance' : `Dist (${datePreset})`}
            </span>
            <span className="text-lg sm:text-2xl font-black text-white font-mono truncate block">
              {(filteredTotalDistance / 1000).toFixed(2)} <span className="text-xs sm:text-sm font-semibold text-blue-400">km</span>
            </span>
          </div>
        </div>

        <div className="p-3 sm:p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all" />
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-inner shrink-0">
            <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block truncate">
              {datePreset === 'all' ? 'Fleet Worktime' : `Work (${datePreset})`}
            </span>
            <span className="text-lg sm:text-2xl font-black text-white font-mono truncate block">{formatDuration(filteredTotalActiveTime)}</span>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 p-3 sm:p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl flex items-center gap-3 sm:gap-4 shadow-xl relative overflow-hidden group">
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
          <div className="p-2.5 sm:p-3.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 shadow-inner shrink-0">
            <ShieldAlert className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-slate-400 font-extrabold block truncate">Active Units</span>
            <span className="text-lg sm:text-2xl font-black text-white font-mono truncate block">{statsList.length} Units</span>
          </div>
        </div>
      </div>

      {/* Machinery History: Desktop Table & Mobile Card Views */}
      <div className="flex-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-hidden flex flex-col shadow-2xl p-3 sm:p-0">
        
        {/* ── DESKTOP TABLE VIEW (hidden on mobile < md, visible on md+) ── */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-900">
                <th className="py-4 px-4 w-10"></th>
                <th className="py-4 px-5">Vehicle Name & ID</th>
                <th className="py-4 px-4 text-right">Filtered Distance</th>
                <th className="py-4 px-4 text-right">Active Work Time</th>
                <th className="py-4 px-4 text-right">Idling Time</th>
                <th className="py-4 px-4">Daily Logs Recorded</th>
                <th className="py-4 px-4">Last Status</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {statsList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-sm">
                    No vehicle journey stats found in DynamoDB. Run send_telemetry.py to generate live pings.
                  </td>
                </tr>
              ) : (
                statsList.map((s) => {
                  const dailyRecords = (dailyStatsMap[s.Device_ID] || []).filter(isDailyRecordMatched);
                  const isExpanded = expandedDeviceId === s.Device_ID;

                  // Sum metrics for this vehicle under current filter
                  const vehDistance = datePreset === 'all' 
                    ? s.Total_Distance 
                    : dailyRecords.reduce((sum, r) => sum + r.totalDistance, 0);
                  
                  const vehActiveTime = datePreset === 'all' 
                    ? s.Active_Duration 
                    : dailyRecords.reduce((sum, r) => sum + r.activeDuration, 0);

                  const vehIdleTime = datePreset === 'all' 
                    ? s.Idle_Duration 
                    : dailyRecords.reduce((sum, r) => sum + r.idleDuration, 0);

                  return (
                    <React.Fragment key={s.Device_ID}>
                      {/* Main Vehicle Summary Row */}
                      <tr 
                        onClick={() => toggleExpand(s.Device_ID)}
                        className={`hover:bg-slate-800/50 cursor-pointer transition-colors text-slate-200 ${
                          isExpanded ? 'bg-slate-850/80 border-l-4 border-l-indigo-500' : ''
                        }`}
                      >
                        <td className="py-4 px-4 text-slate-400 text-center">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-indigo-400" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-slate-500" />
                          )}
                        </td>

                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl bg-slate-800 p-2 rounded-xl border border-slate-700/40 shrink-0 shadow-sm">
                              {getVehicleImg(s.Device_ID)}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-white">{getVehicleName(s.Device_ID)}</span>
                                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  {dailyRecords.length} Days Run
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono tracking-wide">{s.Device_ID}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right font-black font-mono text-white text-sm">
                          {(vehDistance / 1000).toFixed(2)} <span className="text-xs text-blue-400">km</span>
                        </td>

                        <td className="py-4 px-4 text-right font-bold font-mono text-emerald-400 text-sm">
                          {formatDuration(vehActiveTime)}
                        </td>

                        <td className="py-4 px-4 text-right font-mono text-slate-400 text-sm">
                          {formatDuration(vehIdleTime)}
                        </td>

                        <td className="py-4 px-4 text-xs font-mono text-slate-300">
                          <div className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-indigo-400" />
                            <span>{dailyRecords.length} date entries found</span>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-xs font-mono">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            s.Last_Status === 'moving' 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}>
                            {s.Last_Status || 'Active'}
                          </span>
                        </td>

                        <td className="py-4 px-5 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => toggleExpand(s.Device_ID)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-[11px] font-extrabold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl shadow transition-all"
                          >
                            {isExpanded ? 'Hide Days' : 'View Date History'}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Date-Wise Sub-Table */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90 border-b border-slate-800/80">
                          <td colSpan={8} className="p-4 sm:px-8">
                            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-inner">
                              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-emerald-400" />
                                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-200">
                                    Date-Wise Run Logs for {getVehicleName(s.Device_ID)} ({s.Device_ID})
                                  </h4>
                                </div>
                                <span className="text-[11px] font-mono text-slate-400">
                                  Showing {dailyRecords.length} recorded operating days
                                </span>
                              </div>

                              {dailyRecords.length === 0 ? (
                                <div className="py-6 text-center text-xs text-slate-500 font-mono">
                                  No daily telemetry records found for the selected date filter.
                                </div>
                              ) : (
                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-xs font-sans border-collapse">
                                    <thead>
                                      <tr className="text-[10px] font-bold uppercase text-slate-400 border-b border-slate-800 bg-slate-950/60">
                                        <th className="py-2.5 px-3">Date</th>
                                        <th className="py-2.5 px-3 text-right">Distance Covered</th>
                                        <th className="py-2.5 px-3 text-right">Active Worktime</th>
                                        <th className="py-2.5 px-3 text-right">Idling Time</th>
                                        <th className="py-2.5 px-3">Trip Start Time</th>
                                        <th className="py-2.5 px-3">Trip End Time</th>
                                        <th className="py-2.5 px-3 text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50 font-mono">
                                      {dailyRecords.map((daily) => (
                                        <tr key={daily.date} className="hover:bg-slate-800/60 transition-colors">
                                          <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                            {daily.date}
                                          </td>
                                          <td className="py-3 px-3 text-right font-black text-white">
                                            {(daily.totalDistance / 1000).toFixed(2)} <span className="text-[10px] text-blue-400">km</span>
                                          </td>
                                          <td className="py-3 px-3 text-right font-bold text-emerald-400">
                                            {formatDuration(daily.activeDuration)}
                                          </td>
                                          <td className="py-3 px-3 text-right text-slate-400">
                                            {formatDuration(daily.idleDuration)}
                                          </td>
                                          <td className="py-3 px-3 text-slate-300">
                                            {formatOnlyTime(daily.firstTimestamp)}
                                          </td>
                                          <td className="py-3 px-3 text-slate-300">
                                            {formatOnlyTime(daily.lastTimestamp)}
                                          </td>
                                          <td className="py-3 px-3 text-center">
                                            <button
                                              onClick={() => onLocateVehicle(s.Device_ID, daily.routePoints)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-extrabold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg shadow-md transition-all active:scale-[0.97]"
                                              title={`Replay trip for ${daily.date}`}
                                            >
                                              <Play className="w-3 h-3 fill-current" />
                                              Replay Day Trip
                                            </button>
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── MOBILE CARDS VIEW (visible on mobile < md, hidden on md+) ── */}
        <div className="block md:hidden space-y-3 flex-1 overflow-y-auto">
          {statsList.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm font-mono">
              No vehicle stats found in DynamoDB.
            </div>
          ) : (
            statsList.map((s) => {
              const dailyRecords = (dailyStatsMap[s.Device_ID] || []).filter(isDailyRecordMatched);
              const isExpanded = expandedDeviceId === s.Device_ID;

              const vehDistance = datePreset === 'all' 
                ? s.Total_Distance 
                : dailyRecords.reduce((sum, r) => sum + r.totalDistance, 0);
              
              const vehActiveTime = datePreset === 'all' 
                ? s.Active_Duration 
                : dailyRecords.reduce((sum, r) => sum + r.activeDuration, 0);

              const vehIdleTime = datePreset === 'all' 
                ? s.Idle_Duration 
                : dailyRecords.reduce((sum, r) => sum + r.idleDuration, 0);

              return (
                <div key={s.Device_ID} className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 shadow-lg space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-3" onClick={() => toggleExpand(s.Device_ID)}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl bg-slate-800 p-2 rounded-xl border border-slate-700/40 shrink-0">
                        {getVehicleImg(s.Device_ID)}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-extrabold text-sm text-white truncate">{getVehicleName(s.Device_ID)}</span>
                          <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            {dailyRecords.length} Days Run
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono tracking-wide">{s.Device_ID}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                        s.Last_Status === 'moving' 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {s.Last_Status || 'Active'}
                      </span>
                      <button className="p-1 rounded-lg bg-slate-800 text-slate-400">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-indigo-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                      </button>
                    </div>
                  </div>

                  {/* Card Key Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 text-center font-mono">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans font-semibold">Distance</span>
                      <span className="text-xs font-black text-white">{(vehDistance / 1000).toFixed(2)} <span className="text-[9px] text-blue-400 font-normal">km</span></span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans font-semibold">Work Time</span>
                      <span className="text-xs font-bold text-emerald-400">{formatDuration(vehActiveTime)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-sans font-semibold">Idle Time</span>
                      <span className="text-xs text-slate-400">{formatDuration(vehIdleTime)}</span>
                    </div>
                  </div>

                  {/* Card Action Button */}
                  <button
                    onClick={() => toggleExpand(s.Device_ID)}
                    className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-extrabold bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-xl transition-colors"
                  >
                    {isExpanded ? 'Hide Date Breakdown' : `View Date Breakdown (${dailyRecords.length} Days)`}
                  </button>

                  {/* Mobile Expanded Daily Breakdown List */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1.5 font-bold text-slate-200">
                          <Calendar className="w-3.5 h-3.5 text-emerald-400" /> Daily Run Logs
                        </span>
                        <span>{dailyRecords.length} Days</span>
                      </div>

                      {dailyRecords.length === 0 ? (
                        <div className="py-4 text-center text-xs text-slate-500 font-mono">
                          No daily telemetry records found.
                        </div>
                      ) : (
                        dailyRecords.map((daily) => (
                          <div key={daily.date} className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 font-mono">
                            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
                              <span className="font-bold text-white flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                {daily.date}
                              </span>
                              <span className="font-black text-blue-400">
                                {(daily.totalDistance / 1000).toFixed(2)} km
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                              <div>
                                <span className="text-[9px] text-slate-500 block font-sans">Active Worktime</span>
                                <span className="font-bold text-emerald-400">{formatDuration(daily.activeDuration)}</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 block font-sans">Operating Window</span>
                                <span>{formatOnlyTime(daily.firstTimestamp)} - {formatOnlyTime(daily.lastTimestamp)}</span>
                              </div>
                            </div>

                            <button
                              onClick={() => onLocateVehicle(s.Device_ID, daily.routePoints)}
                              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-extrabold bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-md transition-all active:scale-[0.98]"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              Replay Day Trip ({daily.date})
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
