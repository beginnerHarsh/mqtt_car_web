import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { VehicleState } from '../types/vehicle';

interface VehicleMarkerProps {
  vehicle: VehicleState;
  map: L.Map;
  isSelected: boolean;
  onSelect: (deviceId: string) => void;
}

/**
 * Creates a high-fidelity 3D-styled Vehicle SVG Graphic with perspective depth,
 * metallic reflections, headlights, and direction arrow.
 */
function create3DCarIconHtml(heading: number, speed: number, isSelected: boolean): string {
  const roundedHeading = Math.round(heading);
  const isMoving = speed > 2;
  const carColor = isSelected ? '#0058be' : '#2563eb';
  const shadowColor = isSelected ? 'rgba(0, 88, 190, 0.4)' : 'rgba(0, 0, 0, 0.3)';

  return `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 64px; height: 64px;">
      <!-- Glowing Pulse Aura Ring -->
      <div class="absolute inset-0 rounded-full ${isSelected ? 'bg-blue-500/30 animate-ping' : 'bg-blue-400/20'} ${isMoving ? 'opacity-100' : 'opacity-50'}"></div>

      <!-- 3D Perspective Ground Shadow -->
      <div className="absolute inset-2 rounded-full" style="box-shadow: 0 10px 24px ${shadowColor};"></div>

      <!-- Rotated 3D Detailed Car Graphic Container -->
      <div style="transform: rotate(${roundedHeading}deg); transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);" class="w-12 h-12 flex items-center justify-center drop-shadow-xl">
        <svg viewBox="0 0 60 90" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-10 h-14">
          <defs>
            <!-- Metallic Body Gradient -->
            <linearGradient id="carBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#3b82f6"/>
              <stop offset="45%" stop-color="${carColor}"/>
              <stop offset="100%" stop-color="#1e3a8a"/>
            </linearGradient>

            <!-- Windshield Glass Gradient -->
            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0f172a" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#1e293b" stop-opacity="0.95"/>
            </linearGradient>

            <!-- Headlight Cone Glow -->
            <linearGradient id="lightBeam" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#60a5fa" stop-opacity="0"/>
            </linearGradient>

            <!-- Headlight Glow Effect Filter -->
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>

          <!-- 3D Headlight Beams (Front Projection) -->
          <polygon points="12,18 4,0 20,0" fill="url(#lightBeam)" opacity="${isMoving ? '0.8' : '0.4'}"/>
          <polygon points="48,18 40,0 56,0" fill="url(#lightBeam)" opacity="${isMoving ? '0.8' : '0.4'}"/>

          <!-- Wheels (4 Tire Rotors) -->
          <rect x="4" y="16" width="6" height="14" rx="3" fill="#1e293b"/>
          <rect x="50" y="16" width="6" height="14" rx="3" fill="#1e293b"/>
          <rect x="4" y="60" width="6" height="14" rx="3" fill="#1e293b"/>
          <rect x="50" y="60" width="6" height="14" rx="3" fill="#1e293b"/>

          <!-- Main 3D Car Body Shell -->
          <rect x="9" y="12" width="42" height="66" rx="14" fill="url(#carBodyGrad)" stroke="#60a5fa" stroke-width="1.5"/>

          <!-- Front Hood / Bonnet Curves -->
          <path d="M 16,22 Q 30,16 44,22 L 42,32 Q 30,28 18,32 Z" fill="#2563eb" opacity="0.6"/>

          <!-- Front Windshield -->
          <path d="M 16,33 L 44,33 L 40,46 L 20,46 Z" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="0.8"/>

          <!-- Roof Top -->
          <rect x="18" y="47" width="24" height="15" rx="3" fill="#0f172a" opacity="0.85"/>

          <!-- Rear Windshield -->
          <path d="M 20,63 L 40,63 L 42,70 L 18,70 Z" fill="url(#glassGrad)" stroke="#38bdf8" stroke-width="0.8"/>

          <!-- Xenon Headlights (Glowing Yellow/White) -->
          <circle cx="14" cy="15" r="3" fill="#fef08a" filter="url(#glow)"/>
          <circle cx="46" cy="15" r="3" fill="#fef08a" filter="url(#glow)"/>

          <!-- Rear LED Taillights (Glowing Red) -->
          <rect x="13" y="75" width="8" height="3" rx="1.5" fill="#ef4444" filter="url(#glow)"/>
          <rect x="39" y="75" width="8" height="3" rx="1.5" fill="#ef4444" filter="url(#glow)"/>

          <!-- Directional Arrow Nose Pin -->
          <path d="M 30,6 L 35,14 L 25,14 Z" fill="#ffffff"/>
        </svg>
      </div>

      <!-- Floating Speed Badge Tag -->
      <div class="absolute -bottom-2 bg-slate-900/95 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border border-blue-400/50 shadow-lg whitespace-nowrap">
        <span class="text-blue-400">${speed}</span> <span class="text-[8px] text-slate-300">km/h</span>
      </div>
    </div>
  `;
}

export const VehicleMarker: React.FC<VehicleMarkerProps> = ({
  vehicle,
  map,
  isSelected,
  onSelect,
}) => {
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!map) return;

    const latLng: L.LatLngExpression = [vehicle.currentLat, vehicle.currentLng];

    if (!markerRef.current) {
      const icon = L.divIcon({
        className: 'vehicle-custom-marker',
        html: create3DCarIconHtml(vehicle.currentHeading, vehicle.speed, isSelected),
        iconSize: [64, 64],
        iconAnchor: [32, 32],
      });

      const marker = L.marker(latLng, { icon }).addTo(map);

      const popupContent = `
        <div class="p-2.5 bg-white text-slate-800 font-sans rounded-xl shadow-md border border-slate-200">
          <div class="font-bold text-blue-600 text-sm flex items-center gap-1.5">
            🚘 ${vehicle.deviceId}
          </div>
          <div class="mt-1.5 text-xs text-slate-600 space-y-1 font-mono">
            <div>Status: <span class="text-emerald-600 font-bold">${vehicle.speed > 0 ? 'Moving' : 'Stationary'}</span></div>
            <div>Speed: <span class="text-slate-900 font-bold">${vehicle.speed} km/h</span></div>
            <div>Heading: <span class="text-slate-900 font-bold">${Math.round(vehicle.currentHeading)}°</span></div>
            <div>Coordinates: ${vehicle.currentLat.toFixed(5)}, ${vehicle.currentLng.toFixed(5)}</div>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        className: 'dark-leaflet-popup',
        closeButton: false,
      });

      marker.on('click', () => {
        onSelect(vehicle.deviceId);
      });

      markerRef.current = marker;
    } else {
      markerRef.current.setLatLng(latLng);

      const icon = L.divIcon({
        className: 'vehicle-custom-marker',
        html: create3DCarIconHtml(vehicle.currentHeading, vehicle.speed, isSelected),
        iconSize: [64, 64],
        iconAnchor: [32, 32],
      });

      markerRef.current.setIcon(icon);
    }
  }, [map, vehicle.currentLat, vehicle.currentLng, vehicle.currentHeading, vehicle.speed, isSelected, vehicle.deviceId, onSelect]);

  useEffect(() => {
    return () => {
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    };
  }, []);

  return null;
};
