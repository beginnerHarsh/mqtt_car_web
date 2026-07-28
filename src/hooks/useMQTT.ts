import { useState, useEffect, useRef, useCallback } from 'react';
import { TelemetryPacket, ConnectionStatus, NotificationToast } from '../types/vehicle';
import { MQTTService } from '../services/mqttService';
import { SimulatorService } from '../services/simulatorService';
import { APP_CONFIG } from '../constants/config';
import { formatVehicleName } from '../utils/vehicleName';

export interface UseMQTTReturn {
  connectionStatus: ConnectionStatus;
  latestPacket: TelemetryPacket | null;
  packetsReceived: number;
  isSimulator: boolean;
  setSimulatorEnabled: (enabled: boolean) => void;
  reconnect: () => void;
  toasts: NotificationToast[];
  dismissToast: (id: string) => void;
}

export function useMQTT(onTrackVehicle?: (deviceId: string) => void): UseMQTTReturn {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('offline');
  const [latestPacket, setLatestPacket] = useState<TelemetryPacket | null>(null);
  const [packetsReceived, setPacketsReceived] = useState<number>(0);
  const [isSimulator, setIsSimulator] = useState<boolean>(APP_CONFIG.simulatorEnabled);
  const [toasts, setToasts] = useState<NotificationToast[]>([]);

  const mqttServiceRef = useRef<MQTTService | null>(null);
  const simulatorServiceRef = useRef<SimulatorService | null>(null);
  
  // Track timestamps of when devices were last seen active
  const activeDevicesRef = useRef<Map<string, number>>(new Map());

  const addToast = useCallback((
    type: NotificationToast['type'], 
    title: string, 
    message: string,
    actionLabel?: string,
    onAction?: () => void
  ) => {
    const newToast: NotificationToast = {
      id: Math.random().toString(36).substring(2, 9),
      type,
      title,
      message,
      timestamp: Date.now(),
      actionLabel,
      onAction,
    };
    setToasts((prev) => [newToast, ...prev].slice(0, 5));
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const handleIncomingPacket = useCallback((packet: TelemetryPacket) => {
    const now = Date.now();
    const lastSeen = activeDevicesRef.current.get(packet.deviceId);

    // If device is seen for the first time or resumes sending after >30s inactivity
    if (!lastSeen || (now - lastSeen) > 30000) {
      const displayName = formatVehicleName(packet.deviceId);
      addToast(
        'info',
        '🚜 Machine Active in Field!',
        `${displayName} (${packet.deviceId}) is now transmitting live telemetry.`,
        'Track Machine',
        () => onTrackVehicle?.(packet.deviceId)
      );
    }

    activeDevicesRef.current.set(packet.deviceId, now);
    setLatestPacket(packet);
    setPacketsReceived((prev) => prev + 1);
  }, [addToast, onTrackVehicle]);

  // Initialize Services
  useEffect(() => {
    const mqttService = new MQTTService(APP_CONFIG);
    mqttServiceRef.current = mqttService;

    const simulatorService = new SimulatorService('T_1', 1000);
    simulatorServiceRef.current = simulatorService;

    // Handle MQTT Status
    const unsubscribeStatus = mqttService.onStatusChange((status, error) => {
      setConnectionStatus(status);
      if (status === 'connected') {
        addToast('success', 'MQTT Connected', 'Subscribed to vehicle telemetry stream');
      } else if (status === 'offline') {
        addToast('warning', 'MQTT Offline', 'Connection to IoT broker lost');
      } else if (status === 'error') {
        addToast('error', 'Connection Error', error || 'Failed to connect to MQTT broker');
      }
    });

    // Handle MQTT Message
    const unsubscribeMessage = mqttService.onMessage((_topic, packet) => {
      handleIncomingPacket(packet);
    });

    // Handle Simulator Telemetry
    const unsubscribeSimulator = simulatorService.onPacket((packet) => {
      handleIncomingPacket(packet);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeMessage();
      unsubscribeSimulator();
      mqttService.disconnect();
      simulatorService.stop();
    };
  }, [addToast, handleIncomingPacket]);

  // Handle Mode Switch (Simulator vs Real MQTT)
  useEffect(() => {
    const mqttService = mqttServiceRef.current;
    const simulatorService = simulatorServiceRef.current;

    if (!mqttService || !simulatorService) return;

    if (isSimulator) {
      mqttService.disconnect();
      setConnectionStatus('connected'); // Simulator active treats status as connected
      simulatorService.start();
      addToast('info', 'Simulator Active', 'Generating synthetic GPS route telemetry');
    } else {
      simulatorService.stop();
      mqttService.connect();
    }
  }, [isSimulator, addToast]);

  const reconnect = useCallback(() => {
    if (isSimulator) {
      addToast('info', 'Simulator Reset', 'Restarted simulated GPS route');
      simulatorServiceRef.current?.stop();
      simulatorServiceRef.current?.start();
    } else {
      mqttServiceRef.current?.disconnect();
      mqttServiceRef.current?.connect();
    }
  }, [isSimulator, addToast]);

  return {
    connectionStatus,
    latestPacket,
    packetsReceived,
    isSimulator,
    setSimulatorEnabled: setIsSimulator,
    reconnect,
    toasts,
    dismissToast,
  };
}
