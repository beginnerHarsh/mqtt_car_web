import React, { useState } from 'react';
import { VehicleState } from '../types/vehicle';
import { getHeadingCardinal, formatCoordinate } from '../utils/geo';
import { formatVehicleName } from '../utils/vehicleName';
import { Gauge, Compass, MapPin, Copy, Check, ChevronDown, ChevronUp, Zap, Battery } from 'lucide-react';

interface LiveTelemetryHUDProps {
  selectedVehicle: VehicleState | null;
  packetsReceived: number;
}

export const LiveTelemetryHUD: React.FC<LiveTelemetryHUDProps> = ({
  selectedVehicle,
  packetsReceived,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!selectedVehicle) return null;

  const cardinalDir = getHeadingCardinal(selectedVehicle.currentHeading);
  const headingDeg = Math.round(selectedVehicle.currentHeading);
  const speedKm = Math.round(selectedVehicle.speed);
  const batteryVoltage = selectedVehicle.batteryVoltage ?? '3';
  const displayName = formatVehicleName(selectedVehicle.deviceId);

  const handleCopyCoords = () => {
    const coordsStr = `${formatCoordinate(selectedVehicle.currentLat)}, ${formatCoordinate(selectedVehicle.currentLng)}`;
    navigator.clipboard.writeText(coordsStr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute right-3 left-3 sm:left-auto sm:right-6 bottom-20 sm:bottom-24 z-20 sm:w-72 max-w-full sm:max-w-none bg-slate-900/95 backdrop-blur-xl text-white rounded-2xl shadow-2xl border border-slate-700/70 overflow-hidden font-sans transition-all duration-300">
      {/* HUD Header Bar (Clickable to Expand/Collapse) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between cursor-pointer hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 shadow-inner shrink-0">
            <Zap className="w-4 h-4 animate-pulse text-blue-400" />
          </div>
          <div className="min-w-0">
            <h4 className="font-extrabold text-xs tracking-wide text-white uppercase font-mono truncate">
              HUD: {displayName}
            </h4>
            {!isExpanded ? (
              <span className="text-[10px] text-slate-300 font-mono font-bold">
                <span className="text-blue-400">{speedKm} km/h</span> • <span className="text-emerald-400">{cardinalDir} ({headingDeg}°)</span>
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 font-medium font-mono truncate">
                Packets: {packetsReceived} • Telemetry Stream
              </span>
            )}
          </div>
        </div>

        <button className="text-slate-400 hover:text-white transition-colors p-1 shrink-0">
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Telemetry HUD Body */}
      {isExpanded && (
        <div className="p-4 flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Speed & Heading Gauge Grid */}
          <div className="grid grid-cols-2 gap-2">
            {/* Speed Gauge */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-blue-500/10 rounded-full blur-lg group-hover:bg-blue-500/20 transition-all" />
              <Gauge className="w-4 h-4 text-blue-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Speed</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-white font-mono">{speedKm}</span>
                <span className="text-[10px] font-semibold text-blue-400">km/h</span>
              </div>
            </div>

            {/* Heading Compass */}
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-emerald-500/10 rounded-full blur-lg group-hover:bg-emerald-500/20 transition-all" />
              <Compass className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Heading</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl font-black text-white font-mono">{cardinalDir}</span>
                <span className="text-[10px] font-semibold text-emerald-400">({headingDeg}°)</span>
              </div>
            </div>
          </div>

          {/* Battery Voltage Bar */}
          <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Battery className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Battery Voltage</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-amber-400 font-mono">{batteryVoltage}</span>
              <span className="text-[10px] font-semibold text-slate-400">V</span>
            </div>
          </div>

          {/* Coordinates Bar with Copy Action */}
          <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">GPS Coordinates</span>
                <span className="text-xs font-mono font-bold text-slate-200 truncate">
                  {formatCoordinate(selectedVehicle.currentLat)}, {formatCoordinate(selectedVehicle.currentLng)}
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyCoords}
              className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all shrink-0 ml-2"
              title="Copy GPS Coordinates to Clipboard"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
