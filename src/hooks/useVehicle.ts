import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryPacket, VehicleState } from '../types/vehicle';
import { lerp, lerpAngle } from '../utils/animation';
import { ANIMATION_CONFIG, MAP_CONFIG } from '../constants/config';
import { calculateBearing } from '../utils/geo';

export interface UseVehicleReturn {
  vehicles: VehicleState[];
  selectedVehicle: VehicleState | null;
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  updateVehicleFromPacket: (packet: TelemetryPacket) => void;
  setVehicleHistory: (deviceId: string, historyPoints: [number, number][]) => void;
}

// Real-world initial coordinates for Farm Machinery (T_1 to T_5) across 5 cities in North India
export const CITY_LOCATIONS: Record<string, { city: string; lat: number; lng: number }> = {
  T_1: { city: 'Chandigarh',  lat: 30.733320, lng: 76.779400 },
  T_2: { city: 'Ludhiana',    lat: 30.901000, lng: 75.857300 },
  T_3: { city: 'Mohali',      lat: 30.704600, lng: 76.717900 },
  T_4: { city: 'Hoshiarpur',  lat: 31.530300, lng: 75.911500 },
  T_5: { city: 'Amritsar',    lat: 31.634000, lng: 74.872300 },
  T_10: { city: 'Rupnagar',   lat: 30.958060, lng: 76.520890 },
};


export function useVehicle(): UseVehicleReturn {
  // Initialize state with dynamic fleet vehicles array (initially empty)
  const [vehicles, setVehicles] = useState<VehicleState[]>([]);
  // Vehicle selection state (initially empty until telemetry arrives or user selects a vehicle)
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  // Internal mutable ref for smooth 60fps frame loop without React re-render overhead
  const vehiclesMapRef = useRef<Map<string, VehicleState>>(new Map());
  const animationFrameIdRef = useRef<number | null>(null);

  /**
   * Process incoming packet. Movement and live path are updated ONLY for the selected vehicle.
   */
  const updateVehicleFromPacket = useCallback((packet: TelemetryPacket) => {
    const now = Date.now();
    const map = vehiclesMapRef.current;
    const existing = map.get(packet.deviceId);

    // Vehicle moves ONLY if explicitly selected by user
    const isSelected = selectedDeviceId !== '' && packet.deviceId === selectedDeviceId;

    if (!existing) {
      // Register new vehicle on map at initial location
      const newVehicle: VehicleState = {
        deviceId: packet.deviceId,
        currentLat: packet.lat,
        currentLng: packet.lng,
        currentHeading: packet.heading,
        targetLat: packet.lat,
        targetLng: packet.lng,
        targetHeading: packet.heading,
        prevLat: packet.lat,
        prevLng: packet.lng,
        prevHeading: packet.heading,
        speed: isSelected ? packet.speed : 0,
        batteryVoltage: packet.batteryVoltage,
        isOnline: true,
        lastUpdateTimestamp: now,
        packetTimestamp: packet.timestamp,
        packetCount: 1,
        animationStartTime: now,
        animationDuration: ANIMATION_CONFIG.defaultInterpolationDurationMs,
        history: [[packet.lat, packet.lng]],
      };
      map.set(packet.deviceId, newVehicle);
    } else {
      // If vehicle is NOT selected by user, update packet count & position without live movement
      if (!isSelected) {
        map.set(packet.deviceId, {
          ...existing,
          currentLat: packet.lat,
          currentLng: packet.lng,
          prevLat: packet.lat,
          prevLng: packet.lng,
          targetLat: packet.lat,
          targetLng: packet.lng,
          currentHeading: packet.heading,
          speed: 0,
          batteryVoltage: packet.batteryVoltage ?? existing.batteryVoltage,
          isOnline: true,
          lastUpdateTimestamp: now,
          packetTimestamp: packet.timestamp,
          packetCount: existing.packetCount + 1,
        });
      } else {
        // If vehicle IS selected, calculate dynamic interpolation duration & live path
        const intervalMs = Math.min(
          Math.max(now - existing.lastUpdateTimestamp, ANIMATION_CONFIG.minInterpolationDurationMs),
          ANIMATION_CONFIG.maxInterpolationDurationMs
        );

        // Append historic route point if vehicle has moved
        const newHistory = [...existing.history];
        const lastPoint = newHistory[newHistory.length - 1];

        if (
          !lastPoint ||
          Math.abs(lastPoint[0] - packet.lat) > 0.00001 ||
          Math.abs(lastPoint[1] - packet.lng) > 0.00001
        ) {
          newHistory.push([packet.lat, packet.lng]);
          if (newHistory.length > ANIMATION_CONFIG.trailMaxLength) {
            newHistory.shift();
          }
        }

        const updatedVehicle: VehicleState = {
          ...existing,
          prevLat: existing.currentLat,
          prevLng: existing.currentLng,
          prevHeading: existing.currentHeading,
          targetLat: packet.lat,
          targetLng: packet.lng,
          targetHeading: packet.heading,
          speed: packet.speed,
          batteryVoltage: packet.batteryVoltage ?? existing.batteryVoltage,
          isOnline: true,
          lastUpdateTimestamp: now,
          packetTimestamp: packet.timestamp,
          packetCount: existing.packetCount + 1,
          animationStartTime: now,
          animationDuration: intervalMs,
          history: newHistory,
        };

        map.set(packet.deviceId, updatedVehicle);
      }
    }

    // Always update React vehicles state so UI dropdown and vehicle list reflect latest telemetry
    setVehicles(Array.from(map.values()));
  }, [selectedDeviceId]);

  /**
   * Set vehicle route history coordinates from external source (like DynamoDB or Trip Replay)
   */
  const setVehicleHistory = useCallback((deviceId: string, historyPoints: [number, number][]) => {
    const map = vehiclesMapRef.current;
    const existing = map.get(deviceId);
    const now = Date.now();

    if (existing) {
      const lastPoint = historyPoints[historyPoints.length - 1];
      const prevPoint = historyPoints.length > 1 ? historyPoints[historyPoints.length - 2] : null;

      const targetLat = lastPoint ? lastPoint[0] : existing.currentLat;
      const targetLng = lastPoint ? lastPoint[1] : existing.currentLng;

      let heading = existing.currentHeading;
      if (lastPoint && prevPoint) {
        heading = calculateBearing(prevPoint[0], prevPoint[1], lastPoint[0], lastPoint[1]);
      }

      map.set(deviceId, {
        ...existing,
        currentLat: targetLat,
        currentLng: targetLng,
        targetLat,
        targetLng,
        prevLat: targetLat,
        prevLng: targetLng,
        currentHeading: heading,
        targetHeading: heading,
        prevHeading: heading,
        speed: 15,
        history: historyPoints,
      });
    } else {
      const lastPoint = historyPoints[historyPoints.length - 1];
      const fallbackLoc = CITY_LOCATIONS[deviceId] ?? { lat: MAP_CONFIG.defaultCenter[0], lng: MAP_CONFIG.defaultCenter[1] };
      const startLat = lastPoint?.[0] ?? fallbackLoc.lat;
      const startLng = lastPoint?.[1] ?? fallbackLoc.lng;
      map.set(deviceId, {
        deviceId,
        currentLat: startLat,
        currentLng: startLng,
        currentHeading: 0,
        targetLat: startLat,
        targetLng: startLng,
        targetHeading: 0,
        prevLat: startLat,
        prevLng: startLng,
        prevHeading: 0,
        speed: 15,
        lastUpdateTimestamp: now,
        packetTimestamp: Math.floor(now / 1000),
        packetCount: 0,
        animationStartTime: now,
        animationDuration: 1000,
        history: historyPoints,
      });
    }

    setVehicles(Array.from(map.values()));
  }, []);

  /**
   * 60 FPS Animation Frame Loop for Smooth Marker & Path Interpolation
   */
  useEffect(() => {
    let lastRenderStateUpdate = 0;

    const animate = () => {
      const now = Date.now();
      let hasChanges = false;
      const updatedList: VehicleState[] = [];

      vehiclesMapRef.current.forEach((vehicle) => {
        const elapsed = now - vehicle.animationStartTime;
        const progress = Math.min(1, elapsed / Math.max(1, vehicle.animationDuration));

        // Smoothly interpolate current frame position and angle
        const interpolatedLat = lerp(vehicle.prevLat, vehicle.targetLat, progress);
        const interpolatedLng = lerp(vehicle.prevLng, vehicle.targetLng, progress);
        const interpolatedHeading = lerpAngle(vehicle.prevHeading, vehicle.targetHeading, progress);

        if (
          interpolatedLat !== vehicle.currentLat ||
          interpolatedLng !== vehicle.currentLng ||
          interpolatedHeading !== vehicle.currentHeading
        ) {
          vehicle.currentLat = interpolatedLat;
          vehicle.currentLng = interpolatedLng;
          vehicle.currentHeading = interpolatedHeading;
          hasChanges = true;
        }

        updatedList.push({ ...vehicle });
      });

      if (hasChanges && now - lastRenderStateUpdate > 16) {
        lastRenderStateUpdate = now;
        setVehicles(updatedList);
      }

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, []);

  const selectedVehicle = vehicles.find((v) => v.deviceId === selectedDeviceId) || null;

  return {
    vehicles,
    selectedVehicle,
    selectedDeviceId,
    setSelectedDeviceId,
    updateVehicleFromPacket,
    setVehicleHistory,
  };
}
