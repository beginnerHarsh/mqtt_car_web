import { MQTTConfig } from '../types/vehicle';

/**
 * Application Constants and Config
 */
export const APP_CONFIG: MQTTConfig = {
  endpoint: import.meta.env.VITE_MQTT_ENDPOINT || 'a1b2c3d4e5f6g7-ats.iot.us-east-1.amazonaws.com',
  topic: import.meta.env.VITE_MQTT_TOPIC || 'car/+/location',
  region: import.meta.env.VITE_REGION || 'us-east-1',
  simulatorEnabled: import.meta.env.VITE_SIMULATOR === 'true',
  reconnectPeriodMs: 3000,
  connectTimeoutMs: 10000,
  awsAccessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
  awsSecretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  awsSessionToken: import.meta.env.VITE_AWS_SESSION_TOKEN || '',
  awsCognitoIdentityPoolId: import.meta.env.VITE_AWS_COGNITO_IDENTITY_POOL_ID || '',
};

/**
 * Map Configuration Defaults
 */
export const MAP_CONFIG = {
  defaultCenter: [30.733320, 76.779400] as [number, number], // Chandigarh, India
  defaultZoom: 16,
  maxZoom: 19,
  minZoom: 4,
  tileUrl: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
};

/**
 * Animation Defaults
 */
export const ANIMATION_CONFIG = {
  defaultInterpolationDurationMs: 1000,
  maxInterpolationDurationMs: 5000,
  minInterpolationDurationMs: 200,
  trailMaxLength: 2000, // Retain full path covered from start to current position
};
