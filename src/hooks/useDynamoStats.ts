import { useState, useEffect, useCallback } from 'react';
import { fetchVehicleStats, VehicleStats } from '../services/dynamoService';

export function useDynamoStats(
  selectedDeviceId: string, 
  _packetsReceived: number, 
  allDeviceIds: string[] = ['MAHINDRA', 'JOHN_DEERE', 'SWARAJ', 'SONALIKA', 'FARMTRAC']
) {
  const [stats, setStats] = useState<VehicleStats | null>(null);
  const [allStats, setAllStats] = useState<Record<string, VehicleStats>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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

      // 2. Fetch all vehicles stats in parallel
      const results = await Promise.all(
        allDeviceIds.map(async (id) => {
          try {
            const data = await fetchVehicleStats(id);
            return { id, data };
          } catch (e) {
            console.error(`Failed to fetch stats for ${id}:`, e);
            return { id, data: null };
          }
        })
      );

      // Merge new data with previous state to prevent flickering
      setAllStats((prev) => {
        const updated = { ...prev };
        results.forEach(({ id, data }) => {
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
  }, [selectedDeviceId, allDeviceIds]);

  // Load stats initially and on vehicle selection change
  useEffect(() => {
    loadStats(true);
  }, [loadStats]);

  // Periodic polling every 5 seconds to get updated distance & active hours
  useEffect(() => {
    if (!selectedDeviceId) return;
    
    const interval = setInterval(() => {
      loadStats(false); // Silent reload in background
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedDeviceId, loadStats]);

  return { stats, allStats, loading, error, refresh: () => loadStats(true) };
}
