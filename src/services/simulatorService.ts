import { TelemetryPacket } from '../types/vehicle';
import { calculateBearing, calculateDistanceMeters } from '../utils/geo';

// Predefined closed loop route waypoints around IIT Ropar (Rupnagar, Punjab)
const SIMULATOR_WAYPOINTS: Array<[number, number]> = [
  [30.975000, 76.476000], // IIT Ropar Main Gate
  [30.978800, 76.472800], // IIT Ropar Senate & Admin Block
  [30.981500, 76.470000], // IIT Ropar AWaDH AgriTech Hub
  [30.985000, 76.465000], // IIT Ropar Experimental Agri Fields
  [30.982000, 76.460000], // Satluj Riverfront Campus Road
  [30.975000, 76.476000], // Loop back to Main Gate
];

export type SimulatorCallback = (packet: TelemetryPacket) => void;

export class SimulatorService {
  private timer: number | null = null;
  private isRunning: boolean = false;
  private currentWaypointIndex: number = 0;
  private segmentProgress: number = 0; // 0.0 to 1.0 within current waypoint segment
  private listeners: Set<SimulatorCallback> = new Set();
  private deviceId: string = 'CAR001';
  private updateIntervalMs: number = 1000;
  private baseSpeedKmH: number = 42;

  constructor(deviceId: string = 'CAR001', intervalMs: number = 1000) {
    this.deviceId = deviceId;
    this.updateIntervalMs = intervalMs;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[Simulator] Started GPS route simulation for ${this.deviceId}`);

    // Emit initial packet
    this.emitNextPacket();

    this.timer = window.setInterval(() => {
      this.emitNextPacket();
    }, this.updateIntervalMs);
  }

  public stop(): void {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
    console.log(`[Simulator] Stopped GPS route simulation for ${this.deviceId}`);
  }

  public onPacket(callback: SimulatorCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emitNextPacket(): void {
    const waypoints = SIMULATOR_WAYPOINTS;
    const currentWp = waypoints[this.currentWaypointIndex];
    const nextWpIndex = (this.currentWaypointIndex + 1) % waypoints.length;
    const nextWp = waypoints[nextWpIndex];

    // Calculate segment distance and bearing
    const distanceMeters = calculateDistanceMeters(
      currentWp[0], currentWp[1],
      nextWp[0], nextWp[1]
    );
    const heading = calculateBearing(
      currentWp[0], currentWp[1],
      nextWp[0], nextWp[1]
    );

    // Calculate step fraction per second based on base speed (e.g. 45 km/h)
    const speedMs = (this.baseSpeedKmH * 1000) / 3600; // m/s
    const stepFraction = speedMs / Math.max(distanceMeters, 10);

    this.segmentProgress += stepFraction;

    if (this.segmentProgress >= 1.0) {
      this.segmentProgress = 0;
      this.currentWaypointIndex = nextWpIndex;
    }

    // Interpolate current position along current segment
    const wpA = waypoints[this.currentWaypointIndex];
    const wpB = waypoints[(this.currentWaypointIndex + 1) % waypoints.length];
    
    const lat = wpA[0] + (wpB[0] - wpA[0]) * this.segmentProgress;
    const lng = wpA[1] + (wpB[1] - wpA[1]) * this.segmentProgress;

    // Add slight realistic speed noise (±3 km/h)
    const speedNoise = (Math.random() - 0.5) * 6;
    const currentSpeed = Math.max(10, Math.round(this.baseSpeedKmH + speedNoise));

    const packet: TelemetryPacket = {
      deviceId: this.deviceId,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      speed: currentSpeed,
      heading: Math.round(heading),
      timestamp: Math.floor(Date.now() / 1000),
      batteryVoltage: '3',
    };

    this.listeners.forEach((listener) => listener(packet));
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}
