import React, { useEffect, useState, useCallback } from 'react';
import { useMQTT } from '../hooks/useMQTT';
import { useVehicle } from '../hooks/useVehicle';
import { MapView } from '../components/MapView';
import { StatusBar } from '../components/StatusBar';
import { Sidebar } from '../components/Sidebar';
import { QuickActionsDock } from '../components/QuickActionsDock';
import { ToastContainer } from '../components/ToastContainer';

export const Dashboard: React.FC = () => {
  const {
    connectionStatus,
    latestPacket,
    packetsReceived,
    isSimulator,
    setSimulatorEnabled,
    reconnect,
    toasts,
    dismissToast,
  } = useMQTT();

  const {
    vehicles,
    selectedVehicle,
    selectedDeviceId,
    setSelectedDeviceId,
    updateVehicleFromPacket,
  } = useVehicle();

  const [autoFollow, setAutoFollow] = useState<boolean>(true);
  const [showRouteLine, setShowRouteLine] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('Live Tracking');

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
    alert(`EMERGENCY ALERT triggered for vehicle ${selectedDeviceId}! Dispatch notified.`);
  }, [selectedDeviceId]);

  const handleContactDriver = useCallback(() => {
    alert(`Initiating direct voice call to driver of ${selectedDeviceId}...`);
  }, [selectedDeviceId]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-100 flex flex-col font-sans">
      {/* ── FleetEase Top Navigation Bar ─────────────────── */}
      <StatusBar
        status={connectionStatus}
        selectedVehicle={selectedVehicle}
        vehicles={vehicles}
        packetsReceived={packetsReceived}
        isSimulator={isSimulator}
        onSelectVehicle={setSelectedDeviceId}
        activeNavTab={activeTab}
        onSelectNavTab={setActiveTab}
      />

      {/* ── Main Map Canvas & Overlays ────────────────────── */}
      <main className="flex-1 relative w-full h-full">
        {/* Full Window Interactive Leaflet Map */}
        <MapView
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          selectedDeviceId={selectedDeviceId}
          onSelectVehicle={setSelectedDeviceId}
          autoFollow={autoFollow}
          onToggleAutoFollow={() => setAutoFollow((prev) => !prev)}
          showRouteLine={showRouteLine}
        />

        {/* Floating Vehicle Card (Left Aligned) */}
        <Sidebar
          vehicles={vehicles}
          selectedVehicle={selectedVehicle}
          selectedDeviceId={selectedDeviceId}
          onSelectVehicle={setSelectedDeviceId}
          status={connectionStatus}
          packetsReceived={packetsReceived}
          isSimulator={isSimulator}
          onToggleSimulator={setSimulatorEnabled}
          onReconnect={reconnect}
          onLocateVehicle={handleLocateVehicle}
        />

        {/* Quick Actions Dock (Bottom Center) */}
        <QuickActionsDock
          onLocate={handleLocateVehicle}
          onToggleRoute={handleToggleRoute}
          onContact={handleContactDriver}
          onEmergency={handleEmergencyAlert}
          isAutoFollow={autoFollow}
          isRouteVisible={showRouteLine}
        />
      </main>

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
