import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { VehicleState } from '../types/vehicle';

interface VehicleMarkerProps {
  vehicle: VehicleState;
  map: L.Map;
  isSelected: boolean;
  onSelect: (deviceId: string) => void;
}

const getTractorName = (id: string) => {
  if (id === 'MAHINDRA') return 'Mahindra';
  if (id === 'JOHN_DEERE') return 'John Deere';
  if (id === 'SWARAJ') return 'Swaraj';
  if (id === 'SONALIKA') return 'Sonalika';
  if (id === 'FARMTRAC') return 'Farmtrac';
  return id;
};

/**
 * Creates a high-fidelity 3D-styled Tractor SVG Graphic with perspective depth,
 * tire treads, driver seat mudguards, and glowing headlights.
 */
function create3DTractorIconHtml(deviceId: string, heading: number, speed: number, isSelected: boolean): string {
  const roundedHeading = Math.round(heading);
  const isMoving = speed > 2;
  
  // Tractor Brand Color Gradients
  let brandColorStart = '#dc2626'; // Mahindra red
  let brandColorEnd = '#991b1b';
  let borderStroke = '#f87171';
  
  if (deviceId === 'MAHINDRA') {
    brandColorStart = '#ef4444';
    brandColorEnd = '#991b1b';
    borderStroke = '#f87171';
  } else if (deviceId === 'JOHN_DEERE') {
    brandColorStart = '#22c55e';
    brandColorEnd = '#15803d';
    borderStroke = '#4ade80';
  } else if (deviceId === 'SWARAJ') {
    brandColorStart = '#3b82f6';
    brandColorEnd = '#1d4ed8';
    borderStroke = '#60a5fa';
  } else if (deviceId === 'SONALIKA') {
    brandColorStart = '#2563eb';
    brandColorEnd = '#1e3a8a';
    borderStroke = '#3b82f6';
  } else if (deviceId === 'FARMTRAC') {
    brandColorStart = '#0ea5e9';
    brandColorEnd = '#0369a1';
    borderStroke = '#38bdf8';
  }

  const highlightBorder = isSelected ? '#ffffff' : borderStroke;
  const shadowColor = isSelected ? 'rgba(59, 130, 246, 0.4)' : 'rgba(0, 0, 0, 0.3)';

  return `
    <div class="relative flex items-center justify-center cursor-pointer group" style="width: 64px; height: 64px;">
      <!-- Glowing Pulse Aura Ring -->
      <div class="absolute inset-0 rounded-full ${isSelected ? 'bg-blue-500/25 animate-ping' : 'bg-slate-400/10'} ${isMoving ? 'opacity-100' : 'opacity-40'}"></div>

      <!-- 3D Perspective Ground Shadow -->
      <div class="absolute inset-2 rounded-full" style="box-shadow: 0 8px 20px ${shadowColor};"></div>

      <!-- Rotated 3D Detailed Tractor Graphic Container -->
      <div style="transform: rotate(${roundedHeading}deg); transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);" class="w-12 h-12 flex items-center justify-center drop-shadow-xl">
        <svg viewBox="0 0 60 90" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-10 h-14">
          <defs>
            <!-- Metallic Body Gradient -->
            <linearGradient id="tractorBodyGrad_${deviceId}" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="${brandColorStart}"/>
              <stop offset="100%" stop-color="${brandColorEnd}"/>
            </linearGradient>

            <!-- Windshield Glass Gradient -->
            <linearGradient id="glassGrad_${deviceId}" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#0f172a" stop-opacity="0.9"/>
              <stop offset="100%" stop-color="#1e293b" stop-opacity="0.95"/>
            </linearGradient>

            <!-- Headlight Cone Glow -->
            <linearGradient id="lightBeam_${deviceId}" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.75"/>
              <stop offset="100%" stop-color="#fef08a" stop-opacity="0"/>
            </linearGradient>

            <!-- Headlight Glow Effect Filter -->
            <filter id="glow_${deviceId}" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over"/>
            </filter>
          </defs>

          <!-- 3D Headlight Beams (Front Projection) -->
          <polygon points="18,16 6,0 30,0" fill="url(#lightBeam_${deviceId})" opacity="${isMoving ? '0.7' : '0.3'}"/>
          <polygon points="42,16 30,0 54,0" fill="url(#lightBeam_${deviceId})" opacity="${isMoving ? '0.7' : '0.3'}"/>

          <!-- Rear Wheels (Large Tires) -->
          <rect x="3" y="44" width="10" height="26" rx="4" fill="#090d16" stroke="#1e293b" stroke-width="0.5"/>
          <rect x="47" y="44" width="10" height="26" rx="4" fill="#090d16" stroke="#1e293b" stroke-width="0.5"/>
          
          <!-- Rear Wheels Rim inserts -->
          <rect x="5" y="50" width="6" height="14" rx="2" fill="#e2e8f0"/>
          <rect x="49" y="50" width="6" height="14" rx="2" fill="#e2e8f0"/>

          <!-- Front Wheels (Small Tires) -->
          <rect x="7" y="16" width="6" height="13" rx="2.5" fill="#090d16"/>
          <rect x="47" y="16" width="6" height="13" rx="2.5" fill="#090d16"/>
          
          <!-- Front Rims -->
          <rect x="8.5" y="19" width="3" height="7" rx="1" fill="#cbd5e1"/>
          <rect x="48.5" y="19" width="3" height="7" rx="1" fill="#cbd5e1"/>

          <!-- Front Axle Bar -->
          <rect x="12" y="21" width="36" height="3" fill="#334155"/>

          <!-- Rear Axle Bar -->
          <rect x="10" y="55" width="40" height="4" fill="#334155"/>

          <!-- Main Engine Hood (Tractor Front Body) -->
          <rect x="17" y="14" width="26" height="36" rx="5" fill="url(#tractorBodyGrad_${deviceId})" stroke="${highlightBorder}" stroke-width="1.5"/>

          <!-- Rear Mudguards / Fenders -->
          <path d="M 10,42 L 18,42 L 18,66 L 10,60 Z" fill="url(#tractorBodyGrad_${deviceId})" stroke="${highlightBorder}" stroke-width="1"/>
          <path d="M 50,42 L 42,42 L 42,66 L 50,60 Z" fill="url(#tractorBodyGrad_${deviceId})" stroke="${highlightBorder}" stroke-width="1"/>

          <!-- Driver Console Dash -->
          <rect x="18" y="48" width="24" height="6" rx="1" fill="#1e293b"/>

          <!-- Steering Wheel Ring -->
          <circle cx="30" cy="51" r="5" fill="none" stroke="#0f172a" stroke-width="1.8"/>
          <circle cx="30" cy="51" r="1" fill="#0f172a"/>

          <!-- Seat back & base -->
          <rect x="21" y="56" width="18" height="12" rx="3" fill="#1e293b"/>
          <rect x="21" y="65" width="18" height="4" rx="1" fill="#0f172a"/>

          <!-- Vertical Exhaust Pipe silencer body -->
          <circle cx="37" cy="28" r="2.5" fill="#0f172a"/>
          
          <!-- Front Grille details -->
          <rect x="21" y="15" width="18" height="4" rx="1" fill="#111827"/>

          <!-- Xenon Headlights (Glowing Yellow/White) -->
          <circle cx="21" cy="17" r="2.5" fill="#fef08a" filter="url(#glow_${deviceId})"/>
          <circle cx="39" cy="17" r="2.5" fill="#fef08a" filter="url(#glow_${deviceId})"/>
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
        html: create3DTractorIconHtml(vehicle.deviceId, vehicle.currentHeading, vehicle.speed, isSelected),
        iconSize: [64, 64],
        iconAnchor: [32, 32],
      });

      const marker = L.marker(latLng, { icon }).addTo(map);

      const popupContent = `
        <div class="p-2.5 bg-white text-slate-800 font-sans rounded-xl shadow-md border border-slate-200">
          <div class="font-bold text-blue-600 text-sm flex items-center gap-1.5">
            🚜 ${getTractorName(vehicle.deviceId)}
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
        html: create3DTractorIconHtml(vehicle.deviceId, vehicle.currentHeading, vehicle.speed, isSelected),
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
