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

export interface MapLayerOption {
  id: string;
  name: string;
  url: string;
  attribution: string;
  maxZoom?: number;
}

export const MAP_LAYERS: MapLayerOption[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap (Standard)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  {
    id: 'satellite',
    name: 'Satellite (Esri Imagery)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 18,
  },
  {
    id: 'carto-light',
    name: 'Carto Voyager (Clean Light)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  {
    id: 'carto-dark',
    name: 'Carto Dark Matter (Dark Mode)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },
  {
    id: 'esri-streets',
    name: 'Esri World Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri',
    maxZoom: 19,
  },
];

/**
 * Map Configuration Defaults
 */
export const MAP_CONFIG = {
  defaultCenter: [30.733320, 76.779400] as [number, number], // Chandigarh, India
  defaultZoom: 16,
  maxZoom: 19,
  minZoom: 4,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  tileAttribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
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
