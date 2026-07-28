/**
 * Utility helper to format Device ID into human-readable Farm Machinery label.
 * e.g., "T_1" -> "Farm Machinery 1"
 *       "T_2" -> "Farm Machinery 2"
 *       "T_3" -> "Farm Machinery 3"
 */
export function formatVehicleName(deviceId: string): string {
  if (!deviceId) return 'Farm Machinery';

  // Check for T_1, T-1, T1 pattern
  const match = deviceId.match(/^T[_\-]?(\d+)$/i);
  if (match) {
    return `Farm Machinery ${match[1]}`;
  }

  // Legacy mappings
  const legacyMap: Record<string, string> = {
    MAHINDRA: 'Farm Machinery 1',
    JOHN_DEERE: 'Farm Machinery 2',
    SWARAJ: 'Farm Machinery 3',
    SONALIKA: 'Farm Machinery 4',
    FARMTRAC: 'Farm Machinery 5',
  };

  if (legacyMap[deviceId.toUpperCase()]) {
    return legacyMap[deviceId.toUpperCase()];
  }

  return deviceId;
}
