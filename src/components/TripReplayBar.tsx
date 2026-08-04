import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, FastForward } from 'lucide-react';

interface TripReplayBarProps {
  deviceId: string;
  routePoints: [number, number][];
  onProgressChange: (pointIndex: number) => void;
  onCloseReplay: () => void;
}

export const TripReplayBar: React.FC<TripReplayBarProps> = ({
  deviceId,
  routePoints,
  onProgressChange,
  onCloseReplay,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x, 10x

  const totalPoints = routePoints.length;

  // Step forward during playback
  useEffect(() => {
    if (!isPlaying || totalPoints === 0) return;

    const intervalMs = Math.max(100, 1000 / playbackSpeed);
    const timer = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= totalPoints - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, totalPoints]);

  // Trigger parent progress handler whenever index updates
  useEffect(() => {
    onProgressChange(currentIndex);
  }, [currentIndex, onProgressChange]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    setCurrentIndex(idx);
    onProgressChange(idx);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    onProgressChange(0);
    setIsPlaying(true);
  };

  const progressPercent = totalPoints > 1 ? Math.round((currentIndex / (totalPoints - 1)) * 100) : 100;

  return (
    <div className="absolute bottom-16 sm:bottom-20 left-1/2 -translate-x-1/2 z-30 w-[95%] sm:w-[90%] max-w-xl bg-slate-900/95 backdrop-blur-md text-white p-2.5 sm:p-3.5 rounded-2xl shadow-2xl border border-slate-700/80 flex flex-col gap-2 font-sans animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header Info */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
          <span className="font-bold tracking-tight text-white">Trip Replay Mode: <span className="text-blue-400 font-mono">{deviceId}</span></span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400">
            Point <span className="text-white font-bold">{currentIndex + 1}</span> / {totalPoints} ({progressPercent}%)
          </span>
          <button
            onClick={onCloseReplay}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Close Replay & Return to Live Tracking"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Slider */}
      <div className="px-1 py-1">
        <input
          type="range"
          min={0}
          max={Math.max(0, totalPoints - 1)}
          value={currentIndex}
          onChange={handleSliderChange}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
        />
      </div>

      {/* Playback Controls & Speed */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRestart}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700/50"
            title="Restart Replay"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsPlaying((prev) => !prev)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4" /> Pause
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Play
              </>
            )}
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700/50">
          <FastForward className="w-3.5 h-3.5 text-slate-400 ml-1" />
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => setPlaybackSpeed(s)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                playbackSpeed === s
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
