import React from 'react';
import { ConnectionStatus, VehicleState } from '../types/vehicle';
import { Radio } from 'lucide-react';
import { CITY_LOCATIONS } from '../hooks/useVehicle';

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

  return (
    <header className="flex justify-between items-center w-full px-6 py-3 sticky top-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/80 shadow-2xl h-16 font-sans">
      {/* Brand Title & Vehicle Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-500 text-white shadow-lg shadow-blue-500/30">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <h1 className="font-black text-xl tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            pindbazaar
          </h1>
        </div>

        <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block" />

        {/* Vehicle Selection Dropdown */}
        <select
          value={selectedVehicle?.deviceId ?? ''}
          onChange={(e) => onSelectVehicle(e.target.value)}
          className="text-xs font-bold font-mono bg-slate-800/90 border border-slate-700/80 text-white rounded-xl px-3 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer shadow-md"
        >
          <option value="" className="bg-slate-900 text-slate-300">🎯 Select Vehicle to Track Live</option>
          {vehicles.map((v) => {
            const cityName = CITY_LOCATIONS[v.deviceId]?.city ?? v.deviceId;
            const isLive = v.deviceId === selectedVehicle?.deviceId;
            return (
              <option key={v.deviceId} value={v.deviceId} className="bg-slate-900 text-white">
                🚘 {v.deviceId} ({cityName}) {isLive ? '• Live Tracking' : ''}
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
