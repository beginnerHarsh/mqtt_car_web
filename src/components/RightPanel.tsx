import React, { useEffect, useRef, useState } from 'react';
import { ConnectionStatus, TelemetryPacket, VehicleState } from '../types/vehicle';
import { formatCoordinate } from '../utils/geo';
import { VehicleStats } from '../services/dynamoService';

interface RightPanelProps {
  status: ConnectionStatus;
  latestPacket: TelemetryPacket | null;
  selectedVehicle: VehicleState | null;
  packetsReceived: number;
  allStats?: Record<string, VehicleStats>;
}

interface LogLine {
  time: string;
  topic: string;
  payload: string;
  color: string;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  status,
  latestPacket,
  selectedVehicle,
  packetsReceived,
  allStats,
}) => {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [sessionStart] = useState<number>(Date.now());
  const [uptime, setUptime] = useState<string>('0m 0s');
  const terminalRef = useRef<HTMLDivElement>(null);

  // Update uptime every second
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      const h = Math.floor(elapsed / 3600);
      const m = Math.floor((elapsed % 3600) / 60);
      const s = elapsed % 60;
      setUptime(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionStart]);

  // Append to terminal log on new packet
  useEffect(() => {
    if (!latestPacket) return;
    const now = new Date().toLocaleTimeString('en-US', { hour12: false });
    const deviceId = latestPacket.deviceId?.toLowerCase() ?? 'unknown';

    const recvLine: LogLine = {
      time: now,
      topic: `RECV topic: vehicle/${deviceId}/nav`,
      payload: `{ "lat": ${latestPacket.lat.toFixed(4)}, "lng": ${latestPacket.lng.toFixed(4)}, "spd": ${latestPacket.speed} }`,
      color: '#adc6ff',
    };
    setLogs((prev) => [recvLine, ...prev].slice(0, 40));
  }, [latestPacket]);

  // Auto-scroll terminal to top (newest first)
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0;
    }
  }, [logs]);

  const speed = selectedVehicle?.speed ?? 0;
  const lat = selectedVehicle ? formatCoordinate(selectedVehicle.currentLat) : '—';
  const lng = selectedVehicle ? formatCoordinate(selectedVehicle.currentLng) : '—';

  const statusLabel =
    status === 'connected' ? 'CONNECTED' : status === 'connecting' ? 'CONNECTING' : 'OFFLINE';
  const statusColor =
    status === 'connected'
      ? { text: '#adc6ff', bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.3)' }
      : status === 'connecting'
      ? { text: '#fbbf24', bg: 'rgba(251,191,36,0.10)', border: 'rgba(251,191,36,0.25)' }
      : { text: '#f87171', bg: 'rgba(248,113,113,0.10)', border: 'rgba(248,113,113,0.25)' };

  return (
    <aside
      className="fixed right-0 z-20 flex flex-col gap-3 p-3 overflow-y-auto"
      style={{
        top: '64px',
        width: '320px',
        height: 'calc(100vh - 64px - 40px)',
      }}
    >
      {/* ── Fleet Operations Summary ──────────────────────────── */}
      {allStats && Object.keys(allStats).length > 0 && (
        <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 fade-in">
          <h4
            className="text-[11px] uppercase tracking-widest flex items-center gap-2"
            style={{ color: '#8c909f' }}
          >
            <span className="text-base">🚜</span>
            Fleet Mileage Summary
          </h4>
          <div className="flex flex-col gap-2.5">
            {Object.entries(allStats).map(([id, s]) => {
              const name = id === 'MAHINDRA' ? 'Mahindra' : id === 'JOHN_DEERE' ? 'John Deere' : id === 'SWARAJ' ? 'Swaraj' : id === 'SONALIKA' ? 'Sonalika' : id === 'FARMTRAC' ? 'Farmtrac' : id;
              const activeMin = Math.floor(s.Active_Duration / 60);
              const activeSec = Math.floor(s.Active_Duration % 60);
              const totalTime = s.Active_Duration + s.Idle_Duration;
              const idlePercent = totalTime > 0 ? Math.round((s.Idle_Duration / totalTime) * 100) : 0;
              return (
                <div key={id} className="p-2.5 rounded-lg border border-slate-700/30 flex flex-col gap-1.5" style={{ background: 'rgba(34,42,61,0.4)' }}>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white font-mono">{name}</span>
                    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold uppercase ${s.Last_Status === 'moving' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {s.Last_Status || 'offline'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-300 font-mono mt-0.5">
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase">Distance</span>
                      <span className="font-extrabold text-slate-100">{(s.Total_Distance / 1000).toFixed(2)} km</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase">Active</span>
                      <span className="font-extrabold text-slate-100">{activeMin}m {activeSec}s</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[8px] uppercase">Idle Rate</span>
                      <span className="font-extrabold text-slate-100">{idlePercent}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Connection Health Card ──────────────────────────── */}
      <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 fade-in">
        <h4
          className="text-[11px] uppercase tracking-widest flex items-center gap-2"
          style={{ color: '#8c909f' }}
        >
          <span className="text-base">❤️</span>
          Connection Health
        </h4>

        <div
          className="flex justify-between items-center p-2 rounded-lg"
          style={{ background: 'rgba(34,42,61,0.5)' }}
        >
          <span className="text-sm" style={{ color: '#dae2fd' }}>MQTT Broker</span>
          <span
            className="px-2 py-0.5 rounded text-[11px] font-semibold"
            style={{
              background: statusColor.bg,
              border: `1px solid ${statusColor.border}`,
              color: statusColor.text,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {statusLabel}
          </span>
        </div>

        <div
          className="flex justify-between items-center p-2 rounded-lg"
          style={{ background: 'rgba(34,42,61,0.5)' }}
        >
          <span className="text-sm" style={{ color: '#dae2fd' }}>Session Uptime</span>
          <span className="text-sm font-semibold" style={{ color: '#34d399', fontFamily: 'JetBrains Mono, monospace' }}>
            {uptime}
          </span>
        </div>

        <div
          className="flex justify-between items-center p-2 rounded-lg"
          style={{ background: 'rgba(34,42,61,0.5)' }}
        >
          <span className="text-sm" style={{ color: '#dae2fd' }}>Packets Received</span>
          <span className="text-sm font-semibold" style={{ color: '#adc6ff', fontFamily: 'JetBrains Mono, monospace' }}>
            {packetsReceived}
          </span>
        </div>
      </div>

      {/* ── Analytics Session Card ──────────────────────────── */}
      <div className="glass-panel rounded-xl p-4 flex flex-col gap-3 fade-in delay-100">
        <h4
          className="text-[11px] uppercase tracking-widest flex items-center gap-2"
          style={{ color: '#8c909f' }}
        >
          <span className="text-base">📊</span>
          Analytics Session
        </h4>

        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ background: 'rgba(34,42,61,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="text-[11px] mb-1" style={{ color: '#8c909f' }}>Lat</div>
            <div
              className="text-sm font-semibold"
              style={{ color: '#dae2fd', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {lat}
            </div>
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ background: 'rgba(34,42,61,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="text-[11px] mb-1" style={{ color: '#8c909f' }}>Lng</div>
            <div
              className="text-sm font-semibold"
              style={{ color: '#dae2fd', fontFamily: 'JetBrains Mono, monospace' }}
            >
              {lng}
            </div>
          </div>
        </div>

        {/* Speed Sparkline Chart */}
        <div
          className="mt-1 h-20 relative pt-1 pr-1"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.10)', borderLeft: '1px solid rgba(255,255,255,0.10)' }}
        >
          <svg className="w-full h-full overflow-visible" viewBox="0 0 100 40" preserveAspectRatio="none">
            <defs>
              <linearGradient id="rp-chartGradient" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M 0,30 L 10,25 L 20,28 L 30,15 L 40,10 L 50,12 L 60,20 L 70,5 L 80,10 L 90,25 L 100,20 L 100,40 L 0,40 Z"
              fill="url(#rp-chartGradient)"
            />
            <path
              d="M 0,30 L 10,25 L 20,28 L 30,15 L 40,10 L 50,12 L 60,20 L 70,5 L 80,10 L 90,25 L 100,20"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="1.5"
            />
          </svg>
          <div
            className="absolute top-0 right-0 text-[10px]"
            style={{ color: '#8c909f', fontFamily: 'JetBrains Mono, monospace' }}
          >
            {speed} km/h
          </div>
        </div>
      </div>

      {/* ── Terminal Log ─────────────────────────────────────── */}
      <div className="terminal-panel rounded-xl flex flex-col fade-in delay-200 overflow-hidden flex-1 min-h-0" style={{ minHeight: '180px' }}>
        {/* Terminal header */}
        <div
          className="px-3 py-2 flex justify-between items-center text-[11px]"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.04)',
            color: '#8c909f',
          }}
        >
          <span className="flex items-center gap-1.5">
            <span style={{ color: '#adc6ff' }}>▶</span>
            telemetry.log
          </span>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(239,68,68,0.5)' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(234,179,8,0.5)' }} />
            <div className="w-2 h-2 rounded-full" style={{ background: 'rgba(34,197,94,0.5)' }} />
          </div>
        </div>

        {/* Log lines */}
        <div
          ref={terminalRef}
          className="p-3 flex-1 overflow-y-auto space-y-1"
          style={{ color: '#8c909f', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
        >
          {logs.length === 0 ? (
            <div style={{ color: '#424754' }}>Waiting for telemetry packets...</div>
          ) : (
            logs.map((line, i) => (
              <div key={i}>
                <span style={{ color: '#ffb786' }}>[{line.time}]</span>{' '}
                <span style={{ color: '#8c909f' }}>{line.topic}</span>
                <div className="pl-4" style={{ color: line.color }}>
                  {line.payload}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
