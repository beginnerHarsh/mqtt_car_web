import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { VehicleState } from '../types/vehicle';
import { MAP_CONFIG } from '../constants/config';
import { VehicleMarker } from './VehicleMarker';
import { Plus, Minus, Layers, TrafficCone } from 'lucide-react';

interface MapViewProps {
  vehicles: VehicleState[];
  selectedVehicle: VehicleState | null;
  selectedDeviceId: string;
  onSelectVehicle: (deviceId: string) => void;
  autoFollow: boolean;
  onToggleAutoFollow: () => void;
  showRouteLine?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  vehicles,
  selectedVehicle,
  selectedDeviceId,
  onSelectVehicle,
  autoFollow,
  onToggleAutoFollow,
  showRouteLine = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const glowPolylineRef = useRef<L.Polyline | null>(null);
  const corePolylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);

  const [mapReady, setMapReady] = useState<boolean>(false);
  const [trafficActive, setTrafficActive] = useState<boolean>(false);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Add CartoDB Voyager Light Tile Layer for clean map view
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: MAP_CONFIG.maxZoom,
      minZoom: MAP_CONFIG.minZoom,
      attribution: MAP_CONFIG.tileAttribution,
    }).addTo(map);

    // Outer Soft Glow Polyline
    const glowPolyline = L.polyline([], {
      color: '#3b82f6',
      weight: 10,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Solid Primary Core Route Polyline
    const corePolyline = L.polyline([], {
      color: '#0058be',
      weight: 5,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    glowPolylineRef.current = glowPolyline;
    corePolylineRef.current = corePolyline;
    mapInstanceRef.current = map;
    setMapReady(true);

    const handleUserDrag = () => {
      if (autoFollow) {
        onToggleAutoFollow();
      }
    };

    map.on('dragstart', handleUserDrag);

    return () => {
      map.off('dragstart', handleUserDrag);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Route Polyline & Start Point Pin when vehicle moves or when route visibility changes
  useEffect(() => {
    if (!mapInstanceRef.current || !selectedVehicle) return;

    const historyPoints: L.LatLngExpression[] = showRouteLine
      ? [
          ...selectedVehicle.history,
          [selectedVehicle.currentLat, selectedVehicle.currentLng],
        ]
      : [];

    // Update Polylines with route path coordinates or empty if route hidden
    if (glowPolylineRef.current && corePolylineRef.current) {
      glowPolylineRef.current.setLatLngs(historyPoints);
      corePolylineRef.current.setLatLngs(historyPoints);
    }

    // Render / Hide Start Point Pin at initial coordinate
    if (showRouteLine && selectedVehicle.history.length > 0) {
      const startCoord = selectedVehicle.history[0];

      if (!startMarkerRef.current) {
        const startIcon = L.divIcon({
          className: 'start-point-marker',
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg border-2 border-white font-extrabold text-xs">
                A
              </div>
              <div class="absolute -bottom-5 bg-emerald-700 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
                START
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const startMarker = L.marker(startCoord, { icon: startIcon }).addTo(mapInstanceRef.current);
        startMarkerRef.current = startMarker;
      } else {
        startMarkerRef.current.setLatLng(startCoord);
      }
    } else if (!showRouteLine && startMarkerRef.current) {
      startMarkerRef.current.remove();
      startMarkerRef.current = null;
    }
  }, [selectedVehicle, showRouteLine]);

  // Smoothly center map on active vehicle when Auto-Follow is active
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !autoFollow || !selectedVehicle) return;

    const targetCenter: L.LatLngExpression = [
      selectedVehicle.currentLat,
      selectedVehicle.currentLng,
    ];

    map.panTo(targetCenter, {
      animate: true,
      duration: 0.5,
    });
  }, [selectedVehicle?.currentLat, selectedVehicle?.currentLng, autoFollow, selectedVehicle]);

  const handleZoomIn = useCallback(() => {
    mapInstanceRef.current?.zoomIn();
  }, []);

  const handleZoomOut = useCallback(() => {
    mapInstanceRef.current?.zoomOut();
  }, []);

  return (
    <div className="relative w-full h-full overflow-hidden bg-slate-100">
      {/* Leaflet Map Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* FleetEase Map Controls (Top Right) */}
      <div className="absolute right-6 top-20 z-20 flex flex-col gap-2">
        <div className="bg-white rounded-xl shadow-lg border border-slate-200/80 flex flex-col overflow-hidden">
          <button
            onClick={handleZoomIn}
            aria-label="Zoom In"
            className="p-3 text-slate-700 hover:bg-slate-100 transition-colors border-b border-slate-100 flex items-center justify-center"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            className="p-3 text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <button
          onClick={() => {}}
          aria-label="Map Layers"
          className="bg-white p-3 rounded-xl shadow-lg border border-slate-200/80 text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center"
          title="Map Layers"
        >
          <Layers className="w-4 h-4" />
        </button>

        <button
          onClick={() => setTrafficActive((prev) => !prev)}
          aria-label="Traffic"
          className={`p-3 rounded-xl shadow-lg border transition-colors flex items-center justify-center ${
            trafficActive
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
              : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-100'
          }`}
          title="Toggle Traffic View"
        >
          <TrafficCone className="w-4 h-4" />
        </button>
      </div>

      {/* Render Vehicle Markers on Map */}
      {mapReady &&
        mapInstanceRef.current &&
        vehicles.map((v) => (
          <VehicleMarker
            key={v.deviceId}
            vehicle={v}
            map={mapInstanceRef.current!}
            isSelected={v.deviceId === selectedDeviceId}
            onSelect={onSelectVehicle}
          />
        ))}
    </div>
  );
};
