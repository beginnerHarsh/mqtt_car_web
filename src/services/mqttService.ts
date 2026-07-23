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
   * Parse and validate incoming raw MQTT message payload
   */
  private handleIncomingMessage(topic: string, rawPayload: string): void {
    try {
      const parsed = JSON.parse(rawPayload);

      if (
        typeof parsed.deviceId !== 'string' ||
        typeof parsed.lat !== 'number' ||
        typeof parsed.lng !== 'number' ||
        isNaN(parsed.lat) ||
        isNaN(parsed.lng)
      ) {
        throw new Error('Payload missing or invalid deviceId, lat, or lng');
      }

      const packet: TelemetryPacket = {
        deviceId: parsed.deviceId,
        lat: parsed.lat,
        lng: parsed.lng,
        speed: typeof parsed.speed === 'number' ? parsed.speed : 0,
        heading: typeof parsed.heading === 'number' ? parsed.heading : 0,
        timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : Math.floor(Date.now() / 1000),
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
