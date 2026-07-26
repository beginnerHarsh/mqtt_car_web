import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GeofenceZone, DEFAULT_GEOFENCES } from '../utils/geo';

interface GeofenceOverlayProps {
  map: L.Map | null;
  zones?: GeofenceZone[];
  visible?: boolean;
}

export const GeofenceOverlay: React.FC<GeofenceOverlayProps> = ({
  map,
  zones = DEFAULT_GEOFENCES,
  visible = true,
}) => {
  const polygonLayersRef = useRef<L.Polygon[]>([]);

  useEffect(() => {
    if (!map) return;

    // Remove old layers
    polygonLayersRef.current.forEach((layer) => layer.remove());
    polygonLayersRef.current = [];

    if (!visible) return;

    zones.forEach((zone) => {
      const polygon = L.polygon(zone.coordinates, {
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.15,
        weight: 2,
        dashArray: '6, 10',
      }).addTo(map);

      // Bind subtle tooltip on hover
      polygon.bindTooltip(`<b>${zone.name}</b><br/>City: ${zone.city}`, {
        sticky: true,
        className: 'geofence-tooltip',
      });

      polygonLayersRef.current.push(polygon);
    });

    return () => {
      polygonLayersRef.current.forEach((layer) => layer.remove());
      polygonLayersRef.current = [];
    };
  }, [map, zones, visible]);

  return null;
};
