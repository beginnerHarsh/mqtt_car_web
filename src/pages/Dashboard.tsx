import React, { useEffect, useState, useCallback } from 'react';
import { useMQTT } from '../hooks/useMQTT';
import { useVehicle } from '../hooks/useVehicle';
import { useDynamoStats } from '../hooks/useDynamoStats';
import { fetchVehicleRouteHistory } from '../services/dynamoService';
import { MapView } from '../components/MapView';
import { StatusBar } from '../components/StatusBar';
import { HistoryReport } from '../components/HistoryReport';
import { QuickActionsDock } from '../components/QuickActionsDock';
import { ToastContainer } from '../components/ToastContainer';

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

  // Route incoming telemetry packet into vehicle animation engine
  useEffect(() => {
    if (latestPacket) {
      updateVehicleFromPacket(latestPacket);
    }
  }, [latestPacket, updateVehicleFromPacket]);

  const handleLocateVehicle = useCallback(() => {
    setAutoFollow(true);
  }, []);

  const handleToggleRoute = useCallback(() => {
    setShowRouteLine((prev) => !prev);
  }, []);

  const handleEmergencyAlert = useCallback(() => {
    alert(`EMERGENCY ALERT triggered for vehicle ${selectedDeviceId || 'selected vehicle'}! Dispatch notified.`);
  }, [selectedDeviceId]);

  const handleContactDriver = useCallback(() => {
    alert(`Initiating direct voice call to driver of ${selectedDeviceId || 'selected vehicle'}...`);
  }, [selectedDeviceId]);

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
            />

            {/* Quick Actions Dock (Bottom Center) */}
            <QuickActionsDock
              onLocate={handleLocateVehicle}
              onToggleRoute={handleToggleRoute}
              onToggleHistory={handleToggleHistory}
              onContact={handleContactDriver}
              onEmergency={handleEmergencyAlert}
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

              // 3. Load historical route line points from DynamoDB
              try {
                const routePoints = await fetchVehicleRouteHistory(id);
                if (routePoints && routePoints.length > 0) {
                  setVehicleHistory(id, routePoints);
                }
              } catch (e) {
                console.error("Failed to load vehicle path history:", e);
              }
            }}
          />
        )}
      </main>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
