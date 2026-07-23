import React, { useState } from 'react';
import { VehicleState, ConnectionStatus } from '../types/vehicle';
import { formatCoordinate } from '../utils/geo';
import { Car3DViewer } from './Car3DViewer';
import { Car, MapPin, Navigation, Cpu, RefreshCw, ChevronDown, ChevronUp, Box } from 'lucide-react';

interface SidebarProps {
  vehicles: VehicleState[];
  selectedVehicle: VehicleState | null;
  selectedDeviceId: string;
  onSelectVehicle: (id: string) => void;
  status: ConnectionStatus;
  packetsReceived: number;
  isSimulator: boolean;
  onToggleSimulator: (enabled: boolean) => void;
  onReconnect: () => void;
  onLocateVehicle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  vehicles,
  selectedVehicle,
  selectedDeviceId,
  onSelectVehicle,
  status: _status,
  packetsReceived,
  isSimulator,
  onToggleSimulator,
  onReconnect,
  onLocateVehicle,
}) => {
  const [isCardCollapsed, setIsCardCollapsed] = useState<boolean>(false);
  const [showFleetList, setShowFleetList] = useState<boolean>(false);
  const [show3DPreview, setShow3DPreview] = useState<boolean>(false);

  const speed = selectedVehicle ? selectedVehicle.speed : 0;
  const heading = selectedVehicle ? selectedVehicle.currentHeading : 0;
  const lat = selectedVehicle ? formatCoordinate(selectedVehicle.currentLat) : '30.733320';
  const lng = selectedVehicle ? formatCoordinate(selectedVehicle.currentLng) : '76.779400';
  
  const isMoving = speed > 0;
  const statusText = isMoving ? `Moving • ${speed} km/h` : `Stationary`;

  const getVehicleDisplayName = (id: string) => {
    if (id === 'CAR001') return 'Toyota Innova (CAR001)';
    if (id === 'CAR002') return 'Mahindra Thar (CAR002)';
    if (id === 'CAR003') return 'Hyundai Creta (CAR003)';
    return id;
  };

  return (
    <aside className="fixed left-6 top-20 z-20 w-[360px] md:w-[380px]">
      {/* ── FleetEase Floating Vehicle Card (Collapsible Accordion) ────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-slate-200/80 overflow-hidden text-slate-800 transition-all">
        {/* Card Header Accordion Bar */}
        <div
          onClick={() => setIsCardCollapsed((prev) => !prev)}
          className="p-4 bg-slate-50 flex justify-between items-center cursor-pointer hover:bg-slate-100/80 transition-colors border-b border-slate-200/80 select-none"
        >
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100 text-blue-600 shadow-sm shrink-0">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 tracking-tight leading-tight">
                {selectedVehicle ? getVehicleDisplayName(selectedVehicle.deviceId) : 'Toyota Innova'}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${isMoving ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span className={`text-xs font-semibold ${isMoving ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {statusText}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsCardCollapsed((prev) => !prev);
              }}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title={isCardCollapsed ? 'Expand Vehicle Details Card' : 'Collapse Vehicle Details Card'}
            >
              {isCardCollapsed ? <ChevronDown className="w-5 h-5" /> : <ChevronUp className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Card Body (Collapsible Section) */}
        {!isCardCollapsed && (
          <div className="p-4 flex flex-col gap-3 transition-all">
            {/* Location details */}
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-800">
                  Chandigarh Telemetry Zone
                </p>
                <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                  LAT: {lat} • LNG: {lng}
                </p>
              </div>
              <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                Live
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={onLocateVehicle}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/20 active:scale-[0.99]"
            >
              <Navigation className="w-4 h-4" />
              Locate Vehicle
            </button>

            {/* 3D Car Model View Accordion Dropdown */}
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShow3DPreview((prev) => !prev)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all border ${
                  show3DPreview
                    ? 'bg-blue-50 border-blue-200 text-blue-800 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Box className={`w-4 h-4 ${show3DPreview ? 'text-blue-600' : 'text-slate-500'}`} />
                  <span>3D Vehicle Model View</span>
                </div>
                {show3DPreview ? <ChevronUp className="w-4 h-4 text-blue-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {/* Expandable 3D Model Render Canvas */}
              {show3DPreview && (
                <div className="pt-1">
                  <Car3DViewer speed={speed} heading={heading} isMoving={isMoving} />
                </div>
              )}
            </div>

            {/* Fleet Selector Toggle Accordion Dropdown */}
            <button
              onClick={() => setShowFleetList((prev) => !prev)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200/60"
            >
              <span>Active Fleet ({vehicles.length})</span>
              {showFleetList ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Expandable Fleet Vehicle List */}
            {showFleetList && (
              <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 pt-1 border-t border-slate-100">
                {vehicles.length === 0 ? (
                  <div className="text-xs text-center py-4 text-slate-400">No active vehicles</div>
                ) : (
                  vehicles.map((v) => (
                    <button
                      key={v.deviceId}
                      onClick={() => onSelectVehicle(v.deviceId)}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-left border transition-all ${
                        v.deviceId === selectedDeviceId
                          ? 'bg-blue-50 border-blue-200 text-blue-900 font-medium shadow-sm'
                          : 'bg-slate-50 border-slate-200/60 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold font-mono">{v.deviceId}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatCoordinate(v.currentLat)}, {formatCoordinate(v.currentLng)}
                        </div>
                      </div>
                      <div className="text-xs font-mono font-semibold text-emerald-600">
                        {v.speed} km/h
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Controls: Simulator & Reconnect */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-slate-600 font-medium">Simulator</span>
                <input
                  type="checkbox"
                  checked={isSimulator}
                  onChange={(e) => onToggleSimulator(e.target.checked)}
                  className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer"
                />
              </div>
              <button
                onClick={onReconnect}
                className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <RefreshCw className="w-3 h-3" /> Reset MQTT
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
