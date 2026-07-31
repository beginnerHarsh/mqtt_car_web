/**
 * Raw GPS Telemetry Packet structure sent by vehicle over MQTT
 */
export interface TelemetryPacket {
  deviceId: string;
  lat: number;
  lng: number;
  speed: number;       // speed in km/h
  heading: number;     // heading in degrees (0 - 359)
  timestamp: number;   // UNIX timestamp in seconds or milliseconds
  batteryVoltage?: number | string; // Battery voltage (e.g., "3" or 3.7)
}

/**
 * Enhanced Vehicle state for rendering and animation tracking
 */
export interface VehicleState {
  deviceId: string;
  
  // Current interpolated position for 60fps rendering
  currentLat: number;
  currentLng: number;
  currentHeading: number;

  // Last reported target position from MQTT
  targetLat: number;
  targetLng: number;
  targetHeading: number;

  // Previous position before the latest update
  prevLat: number;
  prevLng: number;
  prevHeading: number;

  // Telemetry metrics
  speed: number;
  batteryVoltage?: number | string;
  isOnline?: boolean;
  lastUpdateTimestamp: number; // local time when update arrived
  packetTimestamp: number;     // device time from payload
  packetCount: number;

  // Animation metadata
  animationStartTime: number;
  animationDuration: number;  // duration in ms based on update frequency
  
  // Historical trail for path drawing (lat/lng pairs)
  history: Array<[number, number]>;
}

/**
 * System MQTT Connection Status
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'offline' | 'error';

/**
 * Toast Notification item
 */
export interface NotificationToast {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * MQTT Configuration Options
 */
export interface MQTTConfig {
  endpoint: string;
  topic: string;
  region: string;
  simulatorEnabled: boolean;
  reconnectPeriodMs: number;
  connectTimeoutMs: number;

  // Real AWS IoT Core Credentials
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
  awsCognitoIdentityPoolId?: string;
}

/**
 * Daily breakdown of vehicle run statistics
 */
export interface DailyVehicleStats {
  date: string;              // ISO Date string: YYYY-MM-DD
  deviceId: string;
  totalDistance: number;     // cumulative distance in meters for this date
  activeDuration: number;    // movement duration in seconds
  idleDuration: number;      // stationary duration in seconds
  firstTimestamp?: number;   // start time of trip on this date (ms or sec timestamp)
  lastTimestamp?: number;    // end time of trip on this date (ms or sec timestamp)
  routePoints: [number, number][]; // coordinates list for this specific date
}

