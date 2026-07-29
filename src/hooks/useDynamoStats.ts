import { useState, useEffect, useCallback } from 'react';
import { fetchVehicleStats, fetchAllVehicleStats, VehicleStats } from '../services/dynamoService';

const DEFAULT_DEVICE_IDS = ['T_1', 'T_2', 'T_3', 'T_4', 'T_5', 'T_10'];

export function useDynamoStats(
  selectedDeviceId: string, 
  _packetsReceived: number, 
  allDeviceIds: string[] = []
) {
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [allStats, setAllStats] = useState<Record<string, VehicleStats>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const deviceIdsKey = allDeviceIds.join(',');

  const loadStats = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      // 1. Fetch selected vehicle stats
      if (selectedDeviceId) {
        try {
          const selectedData = await fetchVehicleStats(selectedDeviceId);
          if (selectedData) {
            setStats(selectedData);
          }
        } catch (e) {
          console.error(`Failed to fetch stats for selected device ${selectedDeviceId}:`, e);
        }
      }

      // 2. Scan all vehicle stats directly from DynamoDB table
      const scannedStats = await fetchAllVehicleStats();

      // 3. Fallback: Fetch explicit IDs (default T_1..T_5 + active IDs)
      const passedIds = deviceIdsKey ? deviceIdsKey.split(',') : [];
      const idsSet = new Set([...DEFAULT_DEVICE_IDS, ...passedIds]);

      const directResults = await Promise.all(
        Array.from(idsSet).map(async (id) => {
          try {
            const data = await fetchVehicleStats(id);
            return { id, data };
          } catch (e) {
            console.error(`Failed to fetch stats for ${id}:`, e);
            return { id, data: null };
          }
        })
      );

      // Merge new data with previous state
      setAllStats((prev) => {
        const updated = { ...prev, ...scannedStats };
        directResults.forEach(({ id, data }) => {
          if (data) {
            updated[id] = data;
          }
        });
        return updated;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load vehicle statistics.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedDeviceId, deviceIdsKey]);

  // Load stats initially and on vehicle selection / device list change
  useEffect(() => {
    loadStats(true);
  }, [loadStats]);

  // Periodic polling every 5 seconds to get updated distance & active hours
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats(false); // Silent reload in background
    }, 5000);

    return () => clearInterval(interval);
  }, [loadStats]);

  return { stats, allStats, loading, error, refresh: () => loadStats(true) };
}
