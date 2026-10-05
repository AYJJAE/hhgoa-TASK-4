import React, { useState } from 'react';
import { 
  X, 
  Camera, 
  Download, 
  Share2, 
  Layers, 
  Crosshair, 
  RefreshCw, 
  CheckCircle,
  Eye
} from 'lucide-react';
import { playClick, playSuccess } from '../services/soundEffects';

export default function PayloadModal({ telemetry, onClose, onDownlinkComplete }) {
  const [bandFilter, setBandFilter] = useState('TRUE_COLOR');
  const [isDownlinking, setIsDownlinking] = useState(false);
  const [downlinkProgress, setDownlinkProgress] = useState(0);

  // Procedural canvas image for orbital Earth view
  const lat = telemetry.orbit.latitude;
  const lon = telemetry.orbit.longitude;

  const handleStartDownlink = () => {
    playClick();
    setIsDownlinking(true);
    let p = 0;
    const interval = setInterval(() => {
      p += 15;
      setDownlinkProgress(Math.min(100, p));
      if (p >= 100) {
        clearInterval(interval);
        setIsDownlinking(false);
        playSuccess();
        if (onDownlinkComplete) {
          onDownlinkComplete();
        }
      }
    }, 150);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="hud-panel hud-corner w-full max-w-2xl rounded-lg overflow-hidden border border-[var(--border-cyan)] shadow-[0_0_40px_rgba(0,240,255,0.25)] flex flex-col">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[rgba(6,12,26,0.95)] border-b border-[var(--border-cyan)]">
          <div className="flex items-center gap-2 font-mono text-[var(--color-cyan)] text-xs font-bold uppercase tracking-wider">
            <Camera className="w-4 h-4 text-[var(--color-cyan)]" />
            <span>PAYLOAD IMAGING ACQUISITION // HIGH-RES SENSOR</span>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-4 font-mono text-xs">
          {/* Simulated Satellite Image Frame */}
          <div className="relative w-full h-[260px] rounded border border-[var(--border-cyan)] overflow-hidden bg-[#061226] flex items-center justify-center">
            {/* Visual Earth Satellite Surface Texture Generator */}
            <div 
              className="absolute inset-0 transition-all duration-300"
              style={{
                background: bandFilter === 'TRUE_COLOR'
                  ? 'radial-gradient(ellipse at 40% 50%, #1e4a78 0%, #0d274c 45%, #051428 100%)'
                  : bandFilter === 'NDVI_INFRARED'
                  ? 'radial-gradient(ellipse at 40% 50%, #991b1b 0%, #450a0a 45%, #180505 100%)'
                  : 'radial-gradient(ellipse at 40% 50%, #c026d3 0%, #3b0764 45%, #0f051d 100%)'
              }}
            >
              {/* Coastlines & swirls */}
              <svg className="w-full h-full opacity-60" xmlns="http://www.w3.org/2000/svg">
                <filter id="turb">
                  <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="4" />
                  <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
                </filter>
                <rect width="100%" height="100%" filter="url(#turb)" opacity="0.35" />
              </svg>
            </div>

            {/* Tactical Crosshair Reticle Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-24 h-24 border border-[var(--color-cyan)]/40 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-[var(--color-cyan)] rounded-full animate-ping" />
              </div>
              <div className="absolute inset-x-8 top-1/2 h-[1px] bg-[var(--color-cyan)]/25" />
              <div className="absolute inset-y-8 left-1/2 w-[1px] bg-[var(--color-cyan)]/25" />
            </div>

            {/* Corner Metadata stamps */}
            <div className="absolute top-2 left-2 text-[10px] text-[var(--color-cyan)] bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
              TARGET: LAT {lat}° / LON {lon}°
            </div>
            <div className="absolute top-2 right-2 text-[10px] text-[var(--color-emerald)] bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
              RESOLUTION: 0.45m GSD // CLOUDS: &lt; 5%
            </div>
            <div className="absolute bottom-2 left-2 text-[10px] text-zinc-300 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
              EXPOSURE: 1/4000s // ISO 100 // F/2.8
            </div>
            <div className="absolute bottom-2 right-2 text-[10px] text-amber-300 bg-black/60 px-2 py-1 rounded backdrop-blur-sm">
              BAND: {bandFilter}
            </div>
          </div>

          {/* Spectral Filter Switches */}
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)]">SPECTRAL RECOMBINATION:</span>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'TRUE_COLOR', label: 'TRUE COLOR (RGB)' },
                { id: 'NDVI_INFRARED', label: 'NDVI VEGETATION' },
                { id: 'THERMAL_SWIR', label: 'THERMAL SWIR' }
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => {
                    playClick();
                    setBandFilter(id);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono transition-all ${
                    bandFilter === id
                      ? 'bg-[var(--color-cyan)] text-[#030712] font-bold'
                      : 'bg-[rgba(255,255,255,0.06)] text-zinc-300 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Downlink Progress Bar (if active) */}
          {isDownlinking && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-[var(--color-cyan)] font-semibold">
                <span>TRANSMITTING IMAGE DOWNLINK OVER X-BAND (8.4 GHz)...</span>
                <span>{downlinkProgress}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[var(--color-cyan)] h-full transition-all duration-150"
                  style={{ width: `${downlinkProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex items-center justify-between">
            <span className="text-[var(--text-muted)] text-[10px]">
              DATA SIZE: 48.2 MB RAW TIFF // COMPRESSION: JPEG-LS LOSSLESS
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleStartDownlink}
                disabled={isDownlinking}
                className="btn-aerospace"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isDownlinking ? 'DOWNLINKING...' : 'DOWNLINK TO EARTH'}</span>
              </button>
              <button
                onClick={() => {
                  playClick();
                  onClose();
                }}
                className="px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white font-mono text-xs"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
