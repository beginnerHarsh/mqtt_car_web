import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import { VehicleState } from '../types/vehicle';
import { MAP_CONFIG, MAP_LAYERS, MapLayerOption } from '../constants/config';
import { VehicleMarker } from './VehicleMarker';
import { GeofenceOverlay } from './GeofenceOverlay';
import { Plus, Minus, Layers, TrafficCone, Check, Globe } from 'lucide-react';

interface MapViewProps {
  vehicles: VehicleState[];
  selectedVehicle: VehicleState | null;
  selectedDeviceId: string;
  onSelectVehicle: (deviceId: string) => void;
  autoFollow: boolean;
  onToggleAutoFollow: () => void;
  showRouteLine?: boolean;
  implementWidthMeters?: number;
  showGeofences?: boolean;
}

export const MapView: React.FC<MapViewProps> = ({
  vehicles,
  selectedVehicle,
  selectedDeviceId,
  onSelectVehicle,
  autoFollow,
  onToggleAutoFollow,
  showRouteLine = true,
  implementWidthMeters = 3.5,
  showGeofences = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const coveragePolylineRef = useRef<L.Polyline | null>(null);
  const glowPolylineRef = useRef<L.Polyline | null>(null);
  const corePolylineRef = useRef<L.Polyline | null>(null);
  const startMarkerRef = useRef<L.Marker | null>(null);

  const [mapReady, setMapReady] = useState<boolean>(false);
  const [trafficActive, setTrafficActive] = useState<boolean>(false);
  const [selectedLayerId, setSelectedLayerId] = useState<string>('osm');
  const [showLayerMenu, setShowLayerMenu] = useState<boolean>(false);

  // Auto-hide popover menu after 5s of inactivity
  useEffect(() => {
    if (!showLayerMenu) return;
    const timer = setTimeout(() => {
      setShowLayerMenu(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showLayerMenu]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: MAP_CONFIG.defaultCenter,
      zoom: MAP_CONFIG.defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    const initialLayer = MAP_LAYERS.find((l) => l.id === 'osm') || MAP_LAYERS[0];
    const initialOptions: L.TileLayerOptions = {
      maxZoom: initialLayer.maxZoom || MAP_CONFIG.maxZoom,
      minZoom: MAP_CONFIG.minZoom,
      attribution: initialLayer.attribution,
      updateWhenZooming: true,
      updateWhenIdle: false,
      keepBuffer: 4,
    };
    if (initialLayer.url.includes('{s}')) {
      initialOptions.subdomains = ['a', 'b', 'c'];
    }

    const tileLayer = L.tileLayer(initialLayer.url, initialOptions).addTo(map);
    tileLayerRef.current = tileLayer;

    // Field Cultivation Area Coverage Polyline (Wide Green Band)
    const coveragePolyline = L.polyline([], {
      color: '#10b981',
      weight: Math.round(implementWidthMeters * 5),
      opacity: 0.35,
      lineCap: 'square',
      lineJoin: 'miter',
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

    coveragePolylineRef.current = coveragePolyline;
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

    // Invalidate size after container renders to guarantee full window tile filling
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);

    const handleResize = () => {
      map.invalidateSize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
      map.off('dragstart', handleUserDrag);
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Implement Width on Map
  useEffect(() => {
    if (coveragePolylineRef.current) {
      coveragePolylineRef.current.setStyle({
        weight: Math.round(implementWidthMeters * 5),
      });
    }
  }, [implementWidthMeters]);

  // Change Map Tile Layer dynamically
  const switchMapLayer = (layer: MapLayerOption) => {
    setSelectedLayerId(layer.id);
    setShowLayerMenu(false);

    if (mapInstanceRef.current && tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);

      const layerOptions: L.TileLayerOptions = {
        maxZoom: layer.maxZoom || MAP_CONFIG.maxZoom,
        minZoom: MAP_CONFIG.minZoom,
        attribution: layer.attribution,
        updateWhenZooming: true,
        updateWhenIdle: false,
        keepBuffer: 4,
      };

      if (layer.url.includes('{s}')) {
        layerOptions.subdomains = ['a', 'b', 'c'];
      }

      const newTileLayer = L.tileLayer(layer.url, layerOptions).addTo(mapInstanceRef.current);
      
      // Keep polylines on top
      if (coveragePolylineRef.current) coveragePolylineRef.current.bringToFront();
      if (glowPolylineRef.current) glowPolylineRef.current.bringToFront();
      if (corePolylineRef.current) corePolylineRef.current.bringToFront();

      tileLayerRef.current = newTileLayer;
    }
  };

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
    if (coveragePolylineRef.current && glowPolylineRef.current && corePolylineRef.current) {
      coveragePolylineRef.current.setLatLngs(historyPoints);
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

      {/* Render Geofence Field Boundaries Overlay */}
      {mapReady && (
        <GeofenceOverlay map={mapInstanceRef.current} visible={showGeofences} />
      )}

      {/* FleetEase Map Controls (Top Right) */}
      <div className="absolute right-6 top-20 z-20 flex flex-col gap-2 font-sans">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-xl shadow-2xl border border-slate-700/80 flex flex-col overflow-hidden">
          <button
            onClick={handleZoomIn}
            aria-label="Zoom In"
            className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors border-b border-slate-800 flex items-center justify-center"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            aria-label="Zoom Out"
            className="p-3 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center justify-center"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        {/* Map Layers Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setShowLayerMenu((prev) => !prev)}
            aria-label="Map Layers"
            className={`p-3 rounded-xl shadow-2xl border transition-all flex items-center justify-center ${
              showLayerMenu
                ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-500/40'
                : 'bg-slate-900/90 backdrop-blur-xl text-slate-300 border-slate-700/80 hover:text-white hover:bg-slate-800'
            }`}
            title="Change Map Style"
          >
            <Layers className="w-4 h-4" />
          </button>

          {/* Map Layer Menu Popover */}
          {showLayerMenu && (
            <div className="absolute right-0 top-12 w-64 bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/80 p-2 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Globe className="w-3.5 h-3.5 text-blue-400" /> Map Style
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-semibold">Select Layer</span>
              </div>
              <div className="py-1 flex flex-col gap-1 max-h-64 overflow-y-auto">
                {MAP_LAYERS.map((layer) => {
                  const isSelected = layer.id === selectedLayerId;
                  return (
                    <button
                      key={layer.id}
                      onClick={() => switchMapLayer(layer)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40 shadow-sm'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                      }`}
                    >
                      <span className="truncate">{layer.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => setTrafficActive((prev) => !prev)}
          aria-label="Traffic"
          className={`p-3 rounded-xl shadow-2xl border transition-colors flex items-center justify-center ${
            trafficActive
              ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
              : 'bg-slate-900/90 backdrop-blur-xl text-slate-300 border-slate-700/80 hover:text-white hover:bg-slate-800'
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
