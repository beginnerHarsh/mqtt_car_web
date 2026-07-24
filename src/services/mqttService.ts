import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { TelemetryPacket, ConnectionStatus, MQTTConfig } from '../types/vehicle';
import { generateSignedIotWebsocketUrl } from '../utils/awsSigV4';

export type MQTTMessageCallback = (topic: string, packet: TelemetryPacket) => void;
export type MQTTStatusCallback = (status: ConnectionStatus, error?: string) => void;

/**
 * AWS IoT Core / Generic MQTT over WebSockets Service
 * Encapsulates MQTT client connection, SigV4 URL signing, subscription, reconnects, and message validation.
 */
export class MQTTService {
  private client: MqttClient | null = null;
  private status: ConnectionStatus = 'offline';
  private config: MQTTConfig;
  private messageListeners: Set<MQTTMessageCallback> = new Set();
  private statusListeners: Set<MQTTStatusCallback> = new Set();
  private reconnectTimer: number | null = null;

  constructor(config: MQTTConfig) {
    this.config = config;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: MQTTConfig): void {
    this.config = newConfig;
  }

  /**
   * Connect to AWS IoT Core MQTT Broker over WebSockets using SigV4 Signing
   */
  public async connect(customWssUrl?: string): Promise<void> {
    if (this.client && (this.client.connected || this.client.reconnecting)) {
      return;
    }

    this.setStatus('connecting');

    try {
      let brokerUrl: string;

      if (customWssUrl) {
        brokerUrl = customWssUrl;
      } else if (this.config.awsAccessKeyId && this.config.awsSecretAccessKey) {
        // Automatically Sign AWS IoT Core WebSocket URL with SigV4
        console.log('[AWS IoT] Signing WebSocket URL with SigV4 AWS IAM Credentials...');
        brokerUrl = await generateSignedIotWebsocketUrl({
          accessKeyId: this.config.awsAccessKeyId,
          secretAccessKey: this.config.awsSecretAccessKey,
          sessionToken: this.config.awsSessionToken,
          region: this.config.region,
          iotEndpoint: this.config.endpoint,
        });
      } else {
        // Fallback: If direct WSS URL is specified in endpoint
        brokerUrl = this.config.endpoint.startsWith('wss://')
          ? this.config.endpoint
          : `wss://${this.config.endpoint}/mqtt`;
      }

      const clientId = `car_tracker_${Math.random().toString(16).substring(2, 10)}`;

      const options: IClientOptions = {
        clientId,
        keepalive: 30,
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: this.config.reconnectPeriodMs,
        connectTimeout: this.config.connectTimeoutMs,
        rejectUnauthorized: false,
      };

      console.log(`[MQTT] Connecting to AWS IoT Core endpoint...`);
      this.client = mqtt.connect(brokerUrl, options);

      this.client.on('connect', () => {
        console.log('[MQTT] Connected successfully to AWS IoT Core');
        this.setStatus('connected');
        this.subscribe(this.config.topic);
      });

      this.client.on('reconnect', () => {
        console.warn('[MQTT] Reconnecting to AWS IoT Core...');
        this.setStatus('connecting');
      });

      this.client.on('offline', () => {
        console.warn('[MQTT] Client went offline');
        this.setStatus('offline');
      });

      this.client.on('error', (err) => {
        console.error('[MQTT] AWS IoT Connection Error:', err);
        this.setStatus('error', err.message || 'AWS IoT Core Connection Error');
      });

      this.client.on('message', (topic, message) => {
        this.handleIncomingMessage(topic, message.toString());
      });
    } catch (err: any) {
      console.error('[MQTT] Failed to initialize connection:', err);
      this.setStatus('error', err.message || 'Failed to generate AWS SigV4 signed URL');
    }
  }

  /**
   * Disconnect MQTT client cleanly
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.client) {
      console.log('[MQTT] Disconnecting client...');
      this.client.end(true);
      this.client = null;
    }
    this.setStatus('offline');
  }

  /**
   * Subscribe to topic pattern
   */
  public subscribe(topic: string): void {
    if (!this.client || !this.client.connected) {
      console.warn(`[MQTT] Cannot subscribe to ${topic}: Client not connected`);
      return;
    }

    this.client.subscribe(topic, { qos: 0 }, (err) => {
      if (err) {
        console.error(`[MQTT] Subscription error for ${topic}:`, err);
        this.notifyStatusListeners('error', `Failed to subscribe to ${topic}`);
      } else {
        console.log(`[MQTT] Subscribed to AWS IoT topic: ${topic}`);
      }
    });
  }

  /**
   * Unsubscribe from topic
   */
  public unsubscribe(topic: string): void {
    if (this.client && this.client.connected) {
      this.client.unsubscribe(topic);
    }
  }

  /**
   * Parse and validate incoming raw MQTT message payload.
   * Supports both simulator formats and real GPS device structures.
   */
  private handleIncomingMessage(topic: string, rawPayload: string): void {
    try {
      const parsed = JSON.parse(rawPayload);

      // Extract device ID
      const deviceId = parsed.Device_ID || parsed.deviceId;
      if (typeof deviceId !== 'string') {
        throw new Error('Payload missing Device_ID / deviceId');
      }

      // Extract coordinates with string-to-float conversions
      let lat = 0;
      let lng = 0;

      const rawLat = parsed.Latitude !== undefined ? parsed.Latitude : parsed.lat;
      const rawLng = parsed.Longitude !== undefined ? parsed.Longitude : parsed.lng;

      if (rawLat !== undefined && rawLat !== null && rawLat !== '') {
        lat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat);
      } else {
        // Fallback default coordinates if empty string from GPS device
        lat = 30.73332;
      }

      if (rawLng !== undefined && rawLng !== null && rawLng !== '') {
        lng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng);
      } else {
        lng = 76.7794;
      }

      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid numeric Latitude or Longitude');
      }

      // Extract speed or estimate from running status
      let speed = 0;
      const rawSpeed = parsed.Speed !== undefined ? parsed.Speed : parsed.speed;
      if (rawSpeed !== undefined && rawSpeed !== null && rawSpeed !== '') {
        speed = typeof rawSpeed === 'number' ? rawSpeed : parseFloat(rawSpeed);
      } else if (parsed.RunningStatus === 'On') {
        speed = 22; // default active speed in km/h if running engine
      }

      // Extract heading
      let heading = 0;
      const rawHeading = parsed.Heading !== undefined ? parsed.Heading : parsed.heading;
      if (rawHeading !== undefined && rawHeading !== null && rawHeading !== '') {
        heading = typeof rawHeading === 'number' ? rawHeading : parseFloat(rawHeading);
      }

      // Extract timestamp (handling numeric epoch or formatted string dates)
      let timestamp = Math.floor(Date.now() / 1000);
      const rawTimestamp = parsed.Timestamp !== undefined ? parsed.Timestamp : parsed.timestamp;
      if (rawTimestamp !== undefined && rawTimestamp !== null && rawTimestamp !== '') {
        if (typeof rawTimestamp === 'number') {
          timestamp = rawTimestamp;
        } else {
          const date = new Date(rawTimestamp);
          if (!isNaN(date.getTime())) {
            timestamp = Math.floor(date.getTime() / 1000);
          } else {
            const num = parseFloat(rawTimestamp);
            if (!isNaN(num)) timestamp = num;
          }
        }
      }

      const packet: TelemetryPacket = {
        deviceId,
        lat,
        lng,
        speed,
        heading,
        timestamp,
      };

      this.messageListeners.forEach((listener) => listener(topic, packet));
    } catch (err: any) {
      console.error('[MQTT] Malformed JSON payload received on topic:', topic, rawPayload, err);
      this.notifyStatusListeners('error', `Malformed telemetry packet: ${err.message}`);
    }
  }

  /**
   * Listen for incoming validated telemetry packets
   */
  public onMessage(callback: MQTTMessageCallback): () => void {
    this.messageListeners.add(callback);
    return () => this.messageListeners.delete(callback);
  }

  /**
   * Listen for connection status changes
   */
  public onStatusChange(callback: MQTTStatusCallback): () => void {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  private setStatus(status: ConnectionStatus, error?: string): void {
    this.status = status;
    this.notifyStatusListeners(status, error);
  }

  private notifyStatusListeners(status: ConnectionStatus, error?: string): void {
    this.statusListeners.forEach((listener) => listener(status, error));
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }
}
