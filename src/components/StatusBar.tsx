import React from 'react';
import { ConnectionStatus, VehicleState } from '../types/vehicle';
import { Radio } from 'lucide-react';
import { formatVehicleName } from '../utils/vehicleName';
import { getDynamicCityName } from '../utils/geo';

interface StatusBarProps {
  status: ConnectionStatus;
  selectedVehicle: VehicleState | null;
  vehicles: VehicleState[];
  packetsReceived: number;
  isSimulator: boolean;
  onSelectVehicle: (id: string) => void;
  activeNavTab?: string;
  onSelectNavTab?: (tab: string) => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  selectedVehicle,
  vehicles,
  onSelectVehicle,
  activeNavTab = 'Live Tracking',
  onSelectNavTab,
}) => {
  const navItems = ['Home', 'Live Tracking', 'History'];

  const activeCount = vehicles.filter((v) => v.packetCount > 0 || v.isOnline).length;

  return (
    <header className="flex justify-between items-center w-full px-3 sm:px-6 py-3 sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl h-16 font-sans">
      {/* Brand Title, Active Badge & Vehicle Selector */}
      <div className="flex items-center gap-2 sm:gap-4 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="p-1.5 sm:p-2 rounded-xl bg-linear-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-lg shadow-blue-500/30">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
          </div>
          <h1 className="font-black text-lg sm:text-xl tracking-tight bg-linear-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            pindbazaar
          </h1>
        </div>

        <div className="h-6 w-px bg-slate-800 mx-0.5 hidden sm:block shrink-0" />

        {/* Active Machines Live Counter Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          Active: {activeCount} Live Machines
        </div>

        {/* Vehicle Selection Dropdown */}
        <select
          value={selectedVehicle?.deviceId ?? ''}
          onChange={(e) => onSelectVehicle(e.target.value)}
          className="text-xs font-bold font-mono bg-slate-800/90 border border-slate-700/80 text-white rounded-xl px-2 sm:px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-md max-w-[170px] sm:max-w-xs md:max-w-md truncate"
        >
          <option value="" className="bg-slate-900 text-slate-300">
            {vehicles.length === 0 ? '📡 Waiting for active devices in field...' : '🎯 Select Machine to Track Live'}
          </option>
          {vehicles.map((v) => {
            const cityName = getDynamicCityName(v.currentLat, v.currentLng);
            const displayName = formatVehicleName(v.deviceId);
            const isLive = v.deviceId === selectedVehicle?.deviceId;
            const isSendingTelemetry = (v.packetCount > 0) || v.isOnline;
            const statusTag = isSendingTelemetry ? '🟢 LIVE IN FIELD' : '⚪ Standby';
            return (
              <option key={v.deviceId} value={v.deviceId} className="bg-slate-900 text-white">
                🚜 {displayName} ({v.deviceId}) - {cityName} [{statusTag}] {isLive ? '• Tracking' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {/* Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-2 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
        {navItems.map((item) => {
          const isActive = activeNavTab === item;
          return (
            <button
              key={item}
              onClick={() => onSelectNavTab?.(item)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {item}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
