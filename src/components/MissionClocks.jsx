import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Play, 
  Pause, 
  FastForward, 
  Volume2, 
  VolumeX, 
  Radio, 
  Sun, 
  Moon, 
  Zap, 
  Activity,
  Maximize,
  ShieldAlert,
  Globe
} from 'lucide-react';
import { playClick, isSoundEnabled, setSoundEnabled } from '../services/soundEffects';

export default function MissionClocks({ 
  telemetry, 
  onSetMultiplier, 
  onTogglePause,
  onSwitchMode 
}) {
  const [utcTime, setUtcTime] = useState('');
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

  useEffect(() => {
    const updateUtc = () => {
      const now = new Date();
      const iso = now.toISOString(); // e.g. 2026-10-05T16:15:30.123Z
      const datePart = iso.slice(0, 10);
      const timePart = iso.slice(11, 23);
      setUtcTime(`${datePart} ${timePart} UTC`);
    };
    updateUtc();
    const interval = setInterval(updateUtc, 50);
    return () => clearInterval(interval);
  }, []);

  // Format MET seconds into Days : Hours : Mins : Secs
  const formatMET = (totalSec) => {
    const d = Math.floor(totalSec / 86400);
    const remD = totalSec % 86400;
    const h = Math.floor(remD / 3600);
    const remH = remD % 3600;
    const m = Math.floor(remH / 60);
    const s = Math.floor(remH % 60);
    return `T+ ${String(d).padStart(3, '0')}d ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    playClick();
  };

  return (
    <div className="hud-panel p-3 rounded-lg border-b border-[var(--border-cyan)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Mission Brand & Satellite Selector */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded border border-[var(--color-cyan)] bg-[rgba(0,240,255,0.08)] flex items-center justify-center text-[var(--color-cyan)] font-display font-black text-lg shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              Ω
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[var(--color-emerald)] border-2 border-[#030712] animate-ping-beacon"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-black text-lg tracking-wider text-white text-glow-cyan">
                ORBITAL
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(0,240,255,0.15)] text-[var(--color-cyan)] border border-[rgba(0,240,255,0.3)]">
                v2.6 MISSION CONTROL
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-mono flex items-center gap-2">
              <span>ACTIVE TARGET:</span>
              <button
                onClick={() => {
                  playClick();
                  onSwitchMode(telemetry.mode === 'ORBITAL-1' ? 'ISS-LIVE' : 'ORBITAL-1');
                }}
                className="text-[var(--color-cyan)] font-semibold underline hover:text-white transition-colors"
                title="Click to toggle between Digital Twin Simulator and Live ISS NORAD Telemetry"
              >
                {telemetry.mode === 'ORBITAL-1' ? 'ORBITAL-1 [DIGITAL TWIN]' : 'ISS [NORAD #25544 LIVE]'}
              </button>
            </div>
          </div>
        </div>

        {/* Center: Mission Master Clocks & Timers (Liquid Glass Cards) */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          {/* UTC Clock (Liquid Glass Blue) */}
          <div className="liquid-glass liquid-glass-blue px-3.5 py-2 rounded-xl">
            <div className="text-[10px] text-blue-300 flex items-center gap-1 font-semibold uppercase">
              <Clock className="w-3 h-3 text-blue-400" />
              <span>MASTER UTC CLOCK</span>
            </div>
            <div className="text-white font-bold tracking-wider text-sm mt-0.5 text-glow-blue">
              {utcTime || 'SYNCHRONIZING...'}
            </div>
          </div>

          {/* MET (Mission Elapsed Time) */}
          <div className="liquid-glass px-3.5 py-2 rounded-xl">
            <div className="text-[10px] text-[var(--color-emerald)] flex items-center gap-1 font-semibold uppercase">
              <Activity className="w-3 h-3 text-[var(--color-emerald)]" />
              <span>MISSION ELAPSED TIME</span>
            </div>
            <div className="text-[var(--color-emerald)] font-bold tracking-wider text-sm mt-0.5 text-glow-emerald">
              {formatMET(telemetry.metSeconds)}
            </div>
          </div>

          {/* Next Event / AOS Countdown (Liquid Glass Orange) */}
          <div className="liquid-glass liquid-glass-orange px-3.5 py-2 rounded-xl">
            <div className="text-[10px] text-orange-300 flex items-center gap-1 font-semibold uppercase">
              <Radio className="w-3 h-3 text-orange-400" />
              <span>NEXT GROUND AOS / LOS</span>
            </div>
            <div className="text-orange-400 font-bold tracking-wider text-sm mt-0.5 text-glow-orange">
              {Math.floor(telemetry.orbit.losCountdown / 60)}m {String(telemetry.orbit.losCountdown % 60).padStart(2, '0')}s
            </div>
          </div>

          {/* NOAA Space Weather Live Banner (Liquid Glass Purple) */}
          <div className="liquid-glass liquid-glass-purple px-3.5 py-2 rounded-xl">
            <div className="text-[10px] text-purple-300 flex items-center gap-1 font-semibold uppercase">
              <Zap className="w-3 h-3 text-purple-400" />
              <span>NOAA SPACE WEATHER</span>
            </div>
            <div className="text-purple-200 font-bold tracking-wider text-xs mt-0.5 flex items-center gap-2">
              <span className="text-purple-300 font-bold">Kp: {telemetry.spaceWeather.kpIndex}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40">
                {telemetry.spaceWeather.stormLevel}
              </span>
              <span className="text-[10px] text-purple-200/70">
                Wind: {telemetry.spaceWeather.solarWindSpeed} km/s
              </span>
            </div>
          </div>
        </div>

        {/* Right: Simulation Speed & Controls */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          {/* Pause / Play */}
          <button
            onClick={() => {
              playClick();
              onTogglePause();
            }}
            className={`p-2 rounded border font-mono text-xs flex items-center gap-1 transition-all ${
              telemetry.isPaused
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.3)]'
                : 'bg-[rgba(0,240,255,0.08)] border-[var(--border-cyan)] text-[var(--color-cyan)] hover:bg-[rgba(0,240,255,0.2)]'
            }`}
            title={telemetry.isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {telemetry.isPaused ? <Play className="w-3.5 h-3.5 fill-amber-300" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Multiplier Warp Buttons */}
          <div className="flex items-center bg-[rgba(6,12,26,0.9)] border border-[var(--border-cyan)] rounded p-0.5">
            {[1, 2, 5, 10].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  playClick();
                  onSetMultiplier(rate);
                }}
                className={`px-2 py-1 text-[11px] font-mono rounded transition-colors ${
                  telemetry.timeMultiplier === rate
                    ? 'bg-[var(--color-cyan)] text-[#030712] font-bold'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Sound Mute Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded border transition-colors ${
              soundOn
                ? 'border-[var(--border-cyan)] text-[var(--color-cyan)] bg-[rgba(0,240,255,0.08)]'
                : 'border-zinc-700 text-zinc-500 bg-zinc-900/50'
            }`}
            title={soundOn ? 'Mute Audio' : 'Unmute Mission Audio FX'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
