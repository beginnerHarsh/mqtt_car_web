import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryPacket, VehicleState } from '../types/vehicle';
import { lerp, lerpAngle } from '../utils/animation';
import { ANIMATION_CONFIG } from '../constants/config';

export interface UseVehicleReturn {
  vehicles: VehicleState[];
  selectedVehicle: VehicleState | null;
  selectedDeviceId: string;
  setSelectedDeviceId: (id: string) => void;
  updateVehicleFromPacket: (packet: TelemetryPacket) => void;
  setVehicleHistory: (deviceId: string, historyPoints: [number, number][]) => void;
}

export function useVehicle(): UseVehicleReturn {
  const [vehicles, setVehicles] = useState<VehicleState[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('MAHINDRA');

  // Internal mutable ref for smooth 60fps frame loop without React re-render overhead
  const vehiclesMapRef = useRef<Map<string, VehicleState>>(new Map());
  const animationFrameIdRef = useRef<number | null>(null);

  /**
   * Process incoming packet and update internal vehicle state target coordinates
   */
  const updateVehicleFromPacket = useCallback((packet: TelemetryPacket) => {
    const now = Date.now();
    const map = vehiclesMapRef.current;
    const existing = map.get(packet.deviceId);

    if (!existing) {
      // First telemetry packet for this vehicle - Start Point of the Trip
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
        speed: packet.speed,
        lastUpdateTimestamp: now,
        packetTimestamp: packet.timestamp,
        packetCount: 1,
        animationStartTime: now,
        animationDuration: ANIMATION_CONFIG.defaultInterpolationDurationMs,
        history: [[packet.lat, packet.lng]],
      };
      map.set(packet.deviceId, newVehicle);
    } else {
      // Calculate dynamic interpolation duration based on interval between consecutive packets
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
        // Current position becomes start of new interpolation line segment
        prevLat: existing.currentLat,
        prevLng: existing.currentLng,
        prevHeading: existing.currentHeading,
        targetLat: packet.lat,
        targetLng: packet.lng,
        targetHeading: packet.heading,
        speed: packet.speed,
        lastUpdateTimestamp: now,
        packetTimestamp: packet.timestamp,
        packetCount: existing.packetCount + 1,
        animationStartTime: now,
        animationDuration: intervalMs,
        history: newHistory,
      };

      map.set(packet.deviceId, updatedVehicle);
    }

    // Auto-select first incoming device if none selected
    setSelectedDeviceId((prev) => (prev ? prev : packet.deviceId));
  }, []);

  /**
   * Set vehicle route history coordinates from external source (like DynamoDB)
   */
  const setVehicleHistory = useCallback((deviceId: string, historyPoints: [number, number][]) => {
    const map = vehiclesMapRef.current;
    const existing = map.get(deviceId);
    const now = Date.now();

    if (existing) {
      map.set(deviceId, {
        ...existing,
        history: historyPoints,
      });
    } else {
      const lastPoint = historyPoints[historyPoints.length - 1];
      const startLat = lastPoint?.[0] ?? 30.73332;
      const startLng = lastPoint?.[1] ?? 76.7794;
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
        speed: 0,
        lastUpdateTimestamp: now,
        packetTimestamp: Math.floor(now / 1000),
        packetCount: 0,
        animationStartTime: now,
        animationDuration: 1000,
        history: historyPoints,
      });
    }
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

  const selectedVehicle = vehicles.find((v) => v.deviceId === selectedDeviceId) || vehicles[0] || null;

  return {
    vehicles,
    selectedVehicle,
    selectedDeviceId,
    setSelectedDeviceId,
    updateVehicleFromPacket,
    setVehicleHistory,
  };
}
