import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useMQTT } from '../hooks/useMQTT';
import { useVehicle, CITY_LOCATIONS } from '../hooks/useVehicle';
import { useDynamoStats } from '../hooks/useDynamoStats';
import { fetchVehicleRouteHistory } from '../services/dynamoService';
import { MapView } from '../components/MapView';
import { StatusBar } from '../components/StatusBar';
import { HistoryReport } from '../components/HistoryReport';
import { QuickActionsDock } from '../components/QuickActionsDock';
import { ToastContainer } from '../components/ToastContainer';
import { AcreageCoverageWidget } from '../components/AcreageCoverageWidget';
import { TripReplayBar } from '../components/TripReplayBar';
import { LiveTelemetryHUD } from '../components/LiveTelemetryHUD';
import { findContainingGeofence } from '../utils/geo';

export const Dashboard: React.FC = () => {
  const {
    connectionStatus,
    latestPacket,
    packetsReceived,
    toasts,
    dismissToast,
  } = useMQTT();

  const {
    vehicles,
    selectedVehicle,
    selectedDeviceId,
    setSelectedDeviceId,
    updateVehicleFromPacket,
    setVehicleHistory,
  } = useVehicle();

  const { allStats, refresh: refreshStats } = useDynamoStats(selectedDeviceId, packetsReceived);

  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [showRouteLine, setShowRouteLine] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<string>('live');
  const [activeTab, setActiveTab] = useState<string>('Live Tracking');
  const [implementWidth, setImplementWidth] = useState<number>(3.5);

  // Trip Replay Engine States
  const [isReplayActive, setIsReplayActive] = useState<boolean>(false);
  const [replayPoints, setReplayPoints] = useState<[number, number][]>([]);

  // Geofence status tracking ref to prevent toast spamming
  const activeGeofenceRef = useRef<Record<string, string | null>>({});

  // Sync Navigation Tab selection with Active View
  useEffect(() => {
    if (activeTab === 'History') {
      setActiveView('history');
    } else if (activeTab === 'Live Tracking' || activeTab === 'Home') {
      setActiveView('live');
    }
  }, [activeTab]);

  const handleToggleHistory = useCallback(() => {
    setActiveView((prev) => {
      const next = prev === 'history' ? 'live' : 'history';
      setActiveTab(next === 'history' ? 'History' : 'Live Tracking');
      return next;
    });
  }, []);

  // Handle vehicle selection
  const handleSelectVehicle = useCallback((id: string) => {
    setSelectedDeviceId(id);
  }, [setSelectedDeviceId]);

  // Route incoming telemetry packet into vehicle animation engine and test Geofence boundaries
  useEffect(() => {
    if (latestPacket) {
      updateVehicleFromPacket(latestPacket);

      // Test Geofence entry/exit
      const point: [number, number] = [latestPacket.lat, latestPacket.lng];
      const currentZone = findContainingGeofence(point);
      const prevZone = activeGeofenceRef.current[latestPacket.deviceId];

      if (currentZone && prevZone !== currentZone.id) {
        activeGeofenceRef.current[latestPacket.deviceId] = currentZone.id;
        console.log(`[Geofence] ${latestPacket.deviceId} entered ${currentZone.name}`);
      } else if (!currentZone && prevZone) {
        activeGeofenceRef.current[latestPacket.deviceId] = null;
        console.log(`[Geofence] ${latestPacket.deviceId} exited boundary`);
      }
    }
  }, [latestPacket, updateVehicleFromPacket]);

  const handleLocateVehicle = useCallback(() => {
    setAutoFollow(true);
  }, []);

  const handleToggleRoute = useCallback(() => {
    setShowRouteLine((prev) => !prev);
  }, []);



  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 flex flex-col font-sans">
      {/* ── FleetEase Top Navigation Bar ─────────────────── */}
      <StatusBar
        status={connectionStatus}
        selectedVehicle={selectedVehicle}
        vehicles={vehicles}
        packetsReceived={packetsReceived}
        isSimulator={false}
        onSelectVehicle={handleSelectVehicle}
        activeNavTab={activeTab}
        onSelectNavTab={setActiveTab}
      />

      {/* ── Main Map Canvas & Overlays ────────────────────── */}
      <main className="flex-1 relative w-full h-full">
        {activeView === 'live' ? (
          <>
            {/* Full Window Interactive Leaflet Map */}
            <MapView
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              selectedDeviceId={selectedDeviceId}
              onSelectVehicle={handleSelectVehicle}
              autoFollow={autoFollow}
              onToggleAutoFollow={() => setAutoFollow((prev) => !prev)}
              showRouteLine={showRouteLine}
              implementWidthMeters={implementWidth}
              showGeofences={true}
            />

            {/* Acreage & Field Coverage Widget */}
            <AcreageCoverageWidget
              selectedVehicle={selectedVehicle}
              implementWidth={implementWidth}
              onImplementWidthChange={setImplementWidth}
            />

            {/* Live Telemetry HUD Widget (Speed, Compass, Coordinates) */}
            <LiveTelemetryHUD
              selectedVehicle={selectedVehicle}
              packetsReceived={packetsReceived}
            />

            {/* Trip Replay Timeline Scrubber Widget */}
            {isReplayActive && replayPoints.length > 0 && (
              <TripReplayBar
                deviceId={selectedDeviceId}
                routePoints={replayPoints}
                onProgressChange={(pointIndex) => {
                  if (replayPoints[pointIndex] && selectedDeviceId) {
                    setVehicleHistory(selectedDeviceId, replayPoints.slice(0, pointIndex + 1));
                  }
                }}
                onCloseReplay={() => {
                  setIsReplayActive(false);
                  setReplayPoints([]);
                }}
              />
            )}

            {/* Quick Actions Dock (Bottom Center) */}
            <QuickActionsDock
              onLocate={handleLocateVehicle}
              onToggleRoute={handleToggleRoute}
              onToggleHistory={handleToggleHistory}
              isAutoFollow={autoFollow}
              isRouteVisible={showRouteLine}
              isHistoryVisible={false}
            />
          </>
        ) : (
          <HistoryReport
            allStats={allStats}
            onBack={() => {
              setActiveTab('Live Tracking');
              setActiveView('live');
            }}
            onRefresh={() => refreshStats()}
            onLocateVehicle={async (id) => {
              // 1. Instantly switch to live map view
              setActiveTab('Live Tracking');
              setActiveView('live');
              
              // 2. Select vehicle & enable auto follow
              setSelectedDeviceId(id);
              setAutoFollow(true);

              // 3. Load historical route line points for Trip Replay (with fallback)
              let routePoints: [number, number][] = [];
              try {
                routePoints = await fetchVehicleRouteHistory(id);
              } catch (e) {
                console.error("Failed to load vehicle path history:", e);
              }

              const veh = vehicles.find((v) => v.deviceId === id);
              if ((!routePoints || routePoints.length < 2) && veh && veh.history && veh.history.length >= 2) {
                routePoints = veh.history;
              }

              if (!routePoints || routePoints.length < 2) {
                const cityLoc = CITY_LOCATIONS[id] ?? { lat: 30.733320, lng: 76.779400 };
                routePoints = [
                  [cityLoc.lat, cityLoc.lng],
                  [cityLoc.lat + 0.002, cityLoc.lng + 0.001],
                  [cityLoc.lat + 0.004, cityLoc.lng + 0.003],
                  [cityLoc.lat + 0.005, cityLoc.lng + 0.006],
                  [cityLoc.lat + 0.003, cityLoc.lng + 0.008],
                  [cityLoc.lat + 0.001, cityLoc.lng + 0.005],
                  [cityLoc.lat, cityLoc.lng],
                ];
              }

              setVehicleHistory(id, [routePoints[0]]);
              setReplayPoints(routePoints);
              setIsReplayActive(true);
            }}
          />
        )}
      </main>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
