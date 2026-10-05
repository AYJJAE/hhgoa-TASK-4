import React, { useEffect, useRef, useState } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Radio, 
  Flame, 
  Bell, 
  Sparkles as SparklesIcon, 
  Activity, 
  Music, 
  Disc, 
  Sliders, 
  Mic, 
  SlidersHorizontal 
} from 'lucide-react';
import { 
  isSoundEnabled, 
  setSoundEnabled, 
  getMasterVolume, 
  setMasterVolume, 
  getAnalyserNode, 
  playRadarPing, 
  playBurn, 
  playBeep, 
  playAlert, 
  playUplink, 
  playClick, 
  startSpaceHum, 
  stopSpaceHum, 
  toggleSpaceHum, 
  isSpaceHumPlaying, 
  speakTactical 
} from '../services/soundEffects';

export default function CenterAudioHub({ telemetry }) {
  const canvasRef = useRef(null);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [volume, setVolume] = useState(getMasterVolume());
  const [ambientActive, setAmbientActive] = useState(isSpaceHumPlaying());
  const [activeFx, setActiveFx] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // 120Hz Smooth Audio Visualizer Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;

    const analyser = getAnalyserNode();
    const bufferLength = analyser ? analyser.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    let phase = 0;

    const renderVisualizer = () => {
      animId = requestAnimationFrame(renderVisualizer);
      phase += 0.04;

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      let hasRealAudio = false;
      if (analyser && soundOn) {
        analyser.getByteFrequencyData(dataArray);
        hasRealAudio = dataArray.some(val => val > 0);
      }

      // Draw 24 symmetrical vertical audio spectrum bars with smooth cyan-to-cobalt gradient
      const barCount = 24;
      const barWidth = 3;
      const gap = 3;
      const totalWidth = barCount * (barWidth + gap);
      const startX = (w - totalWidth) / 2;

      for (let i = 0; i < barCount; i++) {
        let value = 0;
        if (hasRealAudio) {
          const idx = Math.floor((i / barCount) * bufferLength);
          value = (dataArray[idx] / 255) * h * 0.88;
        } else if (ambientActive) {
          // Subtle organic breathing wave when ambient hum is running
          value = (Math.sin(phase + i * 0.4) * 0.35 + 0.4) * h * 0.55;
        } else {
          // Minimal resting cyber pulse
          value = (Math.sin(phase * 0.6 + i * 0.25) * 0.15 + 0.18) * h * 0.4;
        }

        const barHeight = Math.max(3, value);
        const x = startX + i * (barWidth + gap);
        const y = (h - barHeight) / 2;

        const grad = ctx.createLinearGradient(0, y, 0, y + barHeight);
        grad.addColorStop(0, '#00f0ff');
        grad.addColorStop(0.35, '#3b82f6');
        grad.addColorStop(0.7, '#a855f7');
        grad.addColorStop(1, '#f97316');

        ctx.fillStyle = grad;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = hasRealAudio ? 12 : 5;
        ctx.fillRect(x, y, barWidth, barHeight);
      }
    };

    renderVisualizer();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [soundOn, ambientActive]);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (!next) setAmbientActive(false);
    playClick();
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setMasterVolume(val);
  };

  const handleToggleAmbient = () => {
    const active = toggleSpaceHum();
    setAmbientActive(active);
    playClick();
  };

  const triggerFx = (id, fn) => {
    setActiveFx(id);
    fn();
    setTimeout(() => setActiveFx(null), 400);
  };

  return (
    <div className="center-sound-dock relative z-20 flex flex-col items-center select-none">
      {/* Outer Ethereal Multi-Color Aurora Glow */}
      <div className="absolute inset-0 -m-3 rounded-3xl bg-gradient-to-r from-blue-500/20 via-purple-500/25 via-orange-500/20 to-cyan-500/20 blur-2xl opacity-90 pointer-events-none animate-pulse-slow"></div>

      {/* Main Liquid Glass Console Bar */}
      <div className="relative liquid-glass rounded-2xl px-4 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex flex-col gap-2.5 max-w-full border border-white/20 backdrop-blur-2xl">
        {/* Top Mini HUD Status */}
        <div className="flex items-center justify-between gap-3 text-[10px] font-mono border-b border-white/10 pb-1.5 px-1">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Activity className="w-3 h-3 animate-pulse text-cyan-400" />
            <span className="tracking-wider">TACTICAL AUDIO & FX COMMAND</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold backdrop-blur-md ${
              ambientActive 
                ? 'bg-purple-500/25 text-purple-200 border border-purple-400/50 shadow-[0_0_10px_rgba(168,85,247,0.4)] animate-pulse' 
                : 'text-zinc-400 bg-white/5 border border-white/10'
            }`}>
              {ambientActive ? 'BINAURAL HUM: ON' : 'HUM: OFF'}
            </span>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-zinc-400 hover:text-cyan-300 p-0.5 transition-colors"
              title="Expand Controls"
            >
              <SlidersHorizontal className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Center Row: Visualizer & Rapid SFX Soundboard */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {/* Master Mute / Unmute */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-full border transition-all backdrop-blur-md ${
              soundOn
                ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                : 'border-white/10 bg-black/40 text-zinc-500'
            }`}
            title={soundOn ? 'Mute Master Audio' : 'Enable Master Audio'}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* 120Hz Real-Time Canvas Spectrum Visualizer */}
          <div className="relative bg-black/60 border border-white/15 rounded-xl px-2.5 py-1 flex items-center justify-center shadow-inner overflow-hidden backdrop-blur-md">
            <canvas
              ref={canvasRef}
              width={160}
              height={26}
              className="w-[140px] sm:w-[170px] h-[24px]"
            />
            {/* Overlay scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(255,255,255,0.03)] to-transparent pointer-events-none"></div>
          </div>

          {/* Rapid SFX Action Buttons (Color-Coded Liquid Glass Pills) */}
          <div className="flex items-center gap-1.5">
            {/* 1. Radar Ping (Electric Cyan / Blue) */}
            <button
              onClick={() => triggerFx('ping', playRadarPing)}
              disabled={!soundOn}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-mono flex items-center gap-1 border transition-all backdrop-blur-md ${
                activeFx === 'ping'
                  ? 'bg-cyan-400 text-black font-bold scale-95 shadow-[0_0_18px_#00f0ff]'
                  : 'bg-blue-500/15 border-blue-400/35 text-cyan-300 hover:bg-blue-500/25 shadow-[0_0_10px_rgba(0,240,255,0.2)]'
              }`}
              title="S-Band Deep Radar Ping"
            >
              <Radio className="w-3 h-3 text-cyan-400" />
              <span className="hidden sm:inline">PING</span>
            </button>

            {/* 2. RCS Burn Rumble (Fiery Orange) */}
            <button
              onClick={() => triggerFx('burn', () => playBurn(2.0))}
              disabled={!soundOn}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-mono flex items-center gap-1 border transition-all backdrop-blur-md ${
                activeFx === 'burn'
                  ? 'bg-orange-500 text-black font-bold scale-95 shadow-[0_0_18px_#f97316]'
                  : 'bg-orange-500/15 border-orange-400/35 text-orange-300 hover:bg-orange-500/25 shadow-[0_0_10px_rgba(249,115,22,0.2)]'
              }`}
              title="RCS Thruster Ignition Rumble"
            >
              <Flame className="w-3 h-3 text-orange-400" />
              <span className="hidden sm:inline">BURN</span>
            </button>

            {/* 3. DSN Uplink Handshake (Emerald / Blue) */}
            <button
              onClick={() => triggerFx('uplink', playUplink)}
              disabled={!soundOn}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-mono flex items-center gap-1 border transition-all backdrop-blur-md ${
                activeFx === 'uplink'
                  ? 'bg-emerald-400 text-black font-bold scale-95 shadow-[0_0_18px_#10b981]'
                  : 'bg-emerald-500/15 border-emerald-400/35 text-emerald-300 hover:bg-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              }`}
              title="Ground DSN Telemetry Handshake"
            >
              <Disc className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">UPLINK</span>
            </button>

            {/* 4. Deep Space Binaural Hum Toggle (Cosmic Purple) */}
            <button
              onClick={handleToggleAmbient}
              disabled={!soundOn}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-mono flex items-center gap-1 border transition-all backdrop-blur-md ${
                ambientActive
                  ? 'bg-purple-500/35 border-purple-400 text-purple-100 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
                  : 'bg-purple-500/15 border-purple-400/35 text-purple-300 hover:bg-purple-500/25 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
              }`}
              title="Deep Space Cabin Binaural Drone"
            >
              <Music className={`w-3 h-3 ${ambientActive ? 'text-purple-300 animate-spin-slow' : 'text-purple-400'}`} />
              <span className="hidden sm:inline">SPACE HUM</span>
            </button>

            {/* 5. AI Voice Status Announcer (Tactical Red / Rose) */}
            <button
              onClick={() => {
                triggerFx('voice', () => {
                  const statusMsg = `Orbital Twin status: ${telemetry.orbit.altitude} kilometers altitude. Carrier locked with ${telemetry.orbit.activeGroundStation}. All avionics nominal.`;
                  speakTactical(statusMsg);
                });
              }}
              disabled={!soundOn}
              className={`px-2.5 py-1.5 rounded-full text-[11px] font-mono flex items-center gap-1 border transition-all backdrop-blur-md ${
                activeFx === 'voice'
                  ? 'bg-rose-500 text-white font-bold scale-95 shadow-[0_0_18px_#f43f5e]'
                  : 'bg-rose-500/15 border-rose-400/35 text-rose-300 hover:bg-rose-500/25 shadow-[0_0_10px_rgba(244,63,94,0.2)]'
              }`}
              title="Aerospace Flight Controller Vocal Announcer"
            >
              <Mic className="w-3 h-3 text-rose-400" />
              <span className="hidden md:inline">VOX</span>
            </button>
          </div>
        </div>

        {/* Collapsible Volume & Presets Drawer */}
        {isExpanded && (
          <div className="pt-2 border-t border-[rgba(0,240,255,0.15)] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            {/* Volume slider */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-zinc-400">VOL:</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={handleVolumeChange}
                disabled={!soundOn}
                className="w-24 accent-[var(--color-cyan)] h-1.5 bg-zinc-800 rounded-lg cursor-pointer"
              />
              <span className="text-[10px] text-cyan-300 font-bold">{Math.round(volume * 100)}%</span>
            </div>

            {/* Quick Test Klaxon */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => triggerFx('alert', playAlert)}
                disabled={!soundOn}
                className="px-2 py-0.5 rounded text-[10px] bg-red-900/30 text-red-300 border border-red-500/40 hover:bg-red-900/50 flex items-center gap-1"
              >
                <Bell className="w-2.5 h-2.5" />
                <span>TEST KLAXON</span>
              </button>

              <button
                onClick={() => triggerFx('chirp', playBeep)}
                disabled={!soundOn}
                className="px-2 py-0.5 rounded text-[10px] bg-cyan-900/30 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-900/50"
              >
                CHIRP
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
