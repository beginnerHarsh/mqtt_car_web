import React, { useEffect, useState } from 'react';
import { ConnectionStatus } from '../types/vehicle';

interface FooterBarProps {
  status: ConnectionStatus;
  packetsReceived: number;
}

export const FooterBar: React.FC<FooterBarProps> = ({ status, packetsReceived }) => {
  const [clock, setClock] = useState<string>('');
  const [fps] = useState<number>(60);

  // Update clock every second
  useEffect(() => {
    const updateClock = () => {
      setClock(new Date().toLocaleTimeString('en-US', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const statusText =
    status === 'connected'
      ? 'Nominal'
      : status === 'connecting'
      ? 'Connecting...'
      : 'Offline';

  return (
    <footer
      className="fixed bottom-0 w-full z-50 flex justify-between items-center px-8 h-10"
      style={{
        background: 'rgba(6,14,32,0.80)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        fontFamily: 'JetBrains Mono, monospace',
      }}
    >
      {/* Left: system status */}
      <div className="flex items-center gap-4 text-[11px]" style={{ color: '#ffb786' }}>
        <span>
          System Status:{' '}
          <span style={{ color: status === 'connected' ? '#34d399' : status === 'connecting' ? '#fbbf24' : '#f87171' }}>
            {statusText}
          </span>
          {' '}| Packets: <span style={{ color: '#adc6ff' }}>{packetsReceived}</span>
        </span>
      </div>

      {/* Right: FPS, uptime, clock */}
      <div className="flex items-center gap-6 text-[11px]" style={{ color: '#8c909f' }}>
        <span className="flex items-center gap-1">
          <span style={{ color: '#adc6ff' }}>⚡</span>
          FPS: {fps}
        </span>
        <span className="flex items-center gap-1">
          <span style={{ color: '#adc6ff' }}>🕒</span>
          {clock}
        </span>
      </div>
    </footer>
  );
};
