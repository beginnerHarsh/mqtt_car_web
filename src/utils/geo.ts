/**
 * Geometry & Geographic Utilities for Fleet & Agricultural Analytics
 */

export interface GeofenceZone {
  id: string;
  name: string;
  city: string;
  color: string;
  coordinates: [number, number][];
}

/**
 * Pre-configured Real-World Field & Zone Boundaries across North India
 */
export const DEFAULT_GEOFENCES: GeofenceZone[] = [
  {
    id: 'zone-chandigarh',
    name: 'Chandigarh Agri Sector Zone',
    city: 'Chandigarh',
    color: '#10b981', // Emerald
    coordinates: [
      [30.7300, 76.7750],
      [30.7500, 76.7750],
      [30.7500, 76.7950],
      [30.7300, 76.7950],
    ],
  },
  {
    id: 'zone-ludhiana',
    name: 'PAU Ludhiana Experimental Farm',
    city: 'Ludhiana',
    color: '#3b82f6', // Blue
    coordinates: [
      [30.8950, 75.8000],
      [30.9150, 75.8000],
      [30.9150, 75.8650],
      [30.8950, 75.8650],
    ],
  },
  {
    id: 'zone-mohali',
    name: 'Mohali IT & Agri Tech Zone',
    city: 'Mohali',
    color: '#8b5cf6', // Purple
    coordinates: [
      [30.6600, 76.7000],
      [30.7100, 76.7000],
      [30.7100, 76.7400],
      [30.6600, 76.7400],
    ],
  },
  {
    id: 'zone-hoshiarpur',
    name: 'Hoshiarpur Sonalika Works Zone',
    city: 'Hoshiarpur',
    color: '#f59e0b', // Amber
    coordinates: [
      [31.5250, 75.9000],
      [31.5550, 75.9000],
      [31.5550, 75.9350],
      [31.5250, 75.9350],
    ],
  },
  {
    id: 'zone-amritsar',
    name: 'Amritsar Agri Belt Zone',
    city: 'Amritsar',
    color: '#ec4899', // Pink
    coordinates: [
      [31.6150, 74.8600],
      [31.6500, 74.8600],
      [31.6500, 74.9000],
      [31.6150, 74.9000],
    ],
  },
];

/**
 * Calculate Haversine distance in meters between two lat/lng coordinates
 */
export function calculateDistanceMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLat = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(radLat1) *
      Math.cos(radLat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate initial bearing/heading in degrees (0..359) from point 1 to point 2
 */
export function calculateBearing(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;
  const deltaLng = ((lng2 - lng1) * Math.PI) / 180;

  const y = Math.sin(deltaLng) * Math.cos(radLat2);
  const x =
    Math.cos(radLat1) * Math.sin(radLat2) -
    Math.sin(radLat1) * Math.cos(radLat2) * Math.cos(deltaLng);

  const bearingRad = Math.atan2(y, x);
  const bearingDeg = (bearingRad * 180) / Math.PI;

  return (bearingDeg + 360) % 360;
}

/**
 * Convert heading degrees into cardinal direction string (N, NE, E, SE, S, SW, W, NW)
 */
export function getHeadingCardinal(heading: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const normalized = ((heading % 360) + 360) % 360;
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Format latitude or longitude nicely to 6 decimal places
 */
export function formatCoordinate(val: number): string {
  return val.toFixed(6);
}

/**
 * Ray-Casting algorithm to test if a point [lat, lng] is inside a polygon boundary
 */
export function isPointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Find which geofence zone a vehicle coordinate is currently located in
 */
export function findContainingGeofence(point: [number, number], zones: GeofenceZone[] = DEFAULT_GEOFENCES): GeofenceZone | null {
  for (const zone of zones) {
    if (isPointInPolygon(point, zone.coordinates)) {
      return zone;
    }
  }
  return null;
}

/**
 * Calculate total acreage and hectares covered along a route path
 * Formula: (Total Distance in Meters * Implement Width in Meters) / 4046.856
 */
export function calculateAcreageCovered(
  historyPoints: [number, number][],
  implementWidthMeters: number = 3.5
): { acres: number; hectares: number; totalDistanceKm: number } {
  if (!historyPoints || historyPoints.length < 2) {
    return { acres: 0, hectares: 0, totalDistanceKm: 0 };
  }

  let totalDistanceMeters = 0;
  for (let i = 1; i < historyPoints.length; i++) {
    const [lat1, lng1] = historyPoints[i - 1];
    const [lat2, lng2] = historyPoints[i];
    totalDistanceMeters += calculateDistanceMeters(lat1, lng1, lat2, lng2);
  }

  const sqMeters = totalDistanceMeters * implementWidthMeters;
  const acres = sqMeters / 4046.8564224;
  const hectares = sqMeters / 10000;
  const totalDistanceKm = totalDistanceMeters / 1000;

  return {
    acres: Number(acres.toFixed(2)),
    hectares: Number(hectares.toFixed(2)),
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
  };
}
