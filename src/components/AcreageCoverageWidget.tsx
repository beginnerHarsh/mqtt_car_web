import React, { useState } from 'react';
import { calculateAcreageCovered, findContainingGeofence } from '../utils/geo';
import { VehicleState } from '../types/vehicle';
import { Sprout, MapPin, ShieldCheck, Ruler, ChevronDown, ChevronUp } from 'lucide-react';

interface AcreageCoverageWidgetProps {
  selectedVehicle: VehicleState | null;
  implementWidth: number;
  onImplementWidthChange: (width: number) => void;
}

export const AcreageCoverageWidget: React.FC<AcreageCoverageWidgetProps> = ({
  selectedVehicle,
  implementWidth,
  onImplementWidthChange,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    return typeof window !== 'undefined' ? window.innerWidth >= 640 : true;
  });

  if (!selectedVehicle) return null;

  const currentPoint: [number, number] = [selectedVehicle.currentLat, selectedVehicle.currentLng];
  const activeGeofence = findContainingGeofence(currentPoint);
  const { acres, hectares, totalDistanceKm } = calculateAcreageCovered(
    selectedVehicle.history,
    implementWidth
  );

  return (
    <div className="absolute left-3 right-3 sm:right-auto sm:left-6 top-20 z-20 sm:w-80 max-w-full sm:max-w-none bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/80 p-3 sm:p-4 font-sans text-white animate-in fade-in slide-in-from-top-2 duration-300">
      {/* Header (Clickable to Expand/Collapse) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-inner shrink-0">
            <Sprout className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-xs tracking-tight text-white uppercase font-mono truncate">Field Coverage</h3>
            {!isExpanded ? (
              <p className="text-[10px] text-emerald-400 font-mono font-bold">
                {acres} Acres • {totalDistanceKm} km
              </p>
            ) : (
              <p className="text-[10px] text-slate-400 font-medium font-mono truncate">{selectedVehicle.deviceId} Operations</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Geofence Status Badge */}
          {activeGeofence ? (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/40 shadow-sm">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> In Zone
            </span>
          ) : (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full border border-slate-700/60">
              <MapPin className="w-3 h-3 text-slate-400" /> Outer Field
            </span>
          )}
          <button className="text-slate-400 group-hover:text-white transition-colors p-1">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Acreage Metrics Grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-emerald-500/30 flex flex-col relative overflow-hidden group">
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-emerald-500/10 rounded-full blur-md group-hover:bg-emerald-500/20 transition-all" />
              <span className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">Cultivated Area</span>
              <span className="text-lg font-black text-white font-mono mt-0.5">{acres} <span className="text-xs font-semibold text-emerald-400">Acres</span></span>
              <span className="text-[10px] font-mono text-slate-400">({hectares} Ha)</span>
            </div>

            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-blue-500/30 flex flex-col relative overflow-hidden group">
              <div className="absolute -top-3 -right-3 w-10 h-10 bg-blue-500/10 rounded-full blur-md group-hover:bg-blue-500/20 transition-all" />
              <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider">Path Distance</span>
              <span className="text-lg font-black text-white font-mono mt-0.5">{totalDistanceKm} <span className="text-xs font-semibold text-blue-400">km</span></span>
              <span className="text-[10px] font-mono text-slate-400">Tracked Live</span>
            </div>
          </div>

          {/* Geofence Location Tag */}
          {activeGeofence && (
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium text-[11px] truncate">📍 {activeGeofence.name}</span>
              <span className="text-[10px] font-mono font-extrabold text-emerald-400 shrink-0">{activeGeofence.city}</span>
            </div>
          )}

          {/* Implement Width Selector */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5 text-[11px]">
              <Ruler className="w-3.5 h-3.5 text-blue-400" /> Implement Width:
            </span>
            <select
              value={implementWidth}
              onChange={(e) => onImplementWidthChange(Number(e.target.value))}
              className="text-xs font-bold font-mono bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              <option value={2.5}>2.5 m (Narrow)</option>
              <option value={3.5}>3.5 m (Standard)</option>
              <option value={5.0}>5.0 m (Wide)</option>
              <option value={8.0}>8.0 m (Heavy)</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
