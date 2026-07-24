import React from 'react';
import { ConnectionStatus, VehicleState } from '../types/vehicle';
import { Radio } from 'lucide-react';

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
  status,
  selectedVehicle,
  vehicles,
  isSimulator,
  onSelectVehicle,
  activeNavTab = 'Live Tracking',
  onSelectNavTab,
}) => {
  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 relative">
              <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-75" />
            </span>
            <span>Online</span>
          </div>
        );
      case 'connecting':
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Connecting...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Offline</span>
          </div>
        );
    }
  };

  const navItems = ['Home', 'Live Tracking', 'History'];

  return (
    <header className="flex justify-between items-center w-full px-6 py-3 sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm h-16">
      {/* Brand Title & Vehicle Selector */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-sm">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <h1 className="font-bold text-xl text-blue-700 tracking-tight">pindbazaar</h1>
        </div>

        <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

        {/* Vehicle Selection Dropdown */}
        <select
          value={selectedVehicle?.deviceId ?? ''}
          onChange={(e) => onSelectVehicle(e.target.value)}
          className="text-xs font-medium bg-slate-100 border border-slate-300 text-slate-800 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
        >
          {vehicles.length === 0 ? (
            <option value="">No Vehicles</option>
          ) : (
            vehicles.map((v) => (
              <option key={v.deviceId} value={v.deviceId}>
                🚘 {v.deviceId} ({v.speed} km/h)
              </option>
            ))
          )}
        </select>

        {/* Connection Status Badge */}
        <div className="hidden md:flex items-center gap-2">
          {getStatusBadge()}
          {isSimulator && (
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-purple-100 border border-purple-200 text-purple-700">
              SIMULATOR
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-6">
        {navItems.map((item) => (
          <button
            key={item}
            onClick={() => onSelectNavTab?.(item)}
            className={`text-xs font-semibold tracking-wider transition-colors pb-1 ${
              activeNavTab === item
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-blue-600'
            }`}
          >
            {item}
          </button>
        ))}
      </nav>

      {/* User Profile Avatar */}
      <div className="flex items-center gap-3">
        <div className="text-right hidden lg:block">
          <div className="text-xs font-semibold text-slate-800">Fleet Manager</div>
          <div className="text-[10px] text-slate-500 font-mono">Operator #4092</div>
        </div>
        <img
          src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
          alt="User profile avatar"
          className="w-9 h-9 rounded-full object-cover border border-slate-300 shadow-sm"
        />
      </div>
    </header>
  );
};
