import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  TrendingUp, 
  Zap, 
  Thermometer, 
  Radio, 
  Download, 
  Pause, 
  Play, 
  Layers 
} from 'lucide-react';
import { playClick, playSuccess } from '../services/soundEffects';

export default function TelemetryGraphs({ telemetry }) {
  const canvasRef = useRef(null);
  const [activeMetric, setActiveMetric] = useState('power'); // 'power', 'orbit', 'thermal', 'comms'
  const [isPaused, setIsPaused] = useState(false);
  const dataHistoryRef = useRef({
    power: [], // { time, gen, load }
    orbit: [], // { time, alt, vel }
    thermal: [], // { time, bus, wing }
    comms: [] // { time, snr, rate }
  });

  const metricsConfig = {
    power: {
      title: 'EPS POWER BALANCE',
      icon: Zap,
      series1: { name: 'Solar Gen (W)', color: '#f59e0b', getValue: (t) => t.eps.solarGeneration },
      series2: { name: 'Bus Load (W)', color: '#00f0ff', getValue: (t) => t.eps.powerLoad },
      unit: 'W',
      min: 0,
      max: 3000
    },
    orbit: {
      title: 'ORBITAL KINEMATICS',
      icon: TrendingUp,
      series1: { name: 'Altitude (km)', color: '#00f0ff', getValue: (t) => t.orbit.altitude },
      series2: { name: 'Velocity (km/s * 50)', color: '#10b981', getValue: (t) => t.orbit.velocity * 50 },
      unit: 'km / km/s',
      min: 350,
      max: 450
    },
    thermal: {
      title: 'THERMAL FLUX PROFILE',
      icon: Thermometer,
      series1: { name: 'Main Bus (°C)', color: '#10b981', getValue: (t) => t.tcs.busTemp },
      series2: { name: 'Solar Wing (°C)', color: '#a855f7', getValue: (t) => t.tcs.solarArrayTemp },
      unit: '°C',
      min: -80,
      max: 100
    },
    comms: {
      title: 'RF DOWNLINK QUALITY',
      icon: Radio,
      series1: { name: 'Downlink SNR (dB)', color: '#00f0ff', getValue: (t) => t.ttc.snr },
      series2: { name: 'Rate (Mbps / 5)', color: '#f59e0b', getValue: (t) => t.ttc.downlinkRate / 5 },
      unit: 'dB / Mbps',
      min: 0,
      max: 30
    }
  };

  // Push new telemetry points
  useEffect(() => {
    if (!telemetry || isPaused) return;

    const now = Date.now();
    const history = dataHistoryRef.current;
    const maxPoints = 50;

    Object.keys(metricsConfig).forEach((key) => {
      const cfg = metricsConfig[key];
      const pt = {
        time: now,
        v1: cfg.series1.getValue(telemetry),
        v2: cfg.series2.getValue(telemetry)
      };
      history[key].push(pt);
      if (history[key].length > maxPoints) {
        history[key].shift();
      }
    });
  }, [telemetry, isPaused]);

  // Render live canvas graph
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const data = dataHistoryRef.current[activeMetric];
    const cfg = metricsConfig[activeMetric];

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, 'rgba(6, 12, 26, 0.95)');
    bgGrad.addColorStop(1, 'rgba(3, 7, 18, 0.98)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Draw HUD Grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.08)';
    ctx.lineWidth = 1;
    const gridYCount = 4;
    for (let i = 0; i <= gridYCount; i++) {
      const y = (height / gridYCount) * i;
      ctx.beginPath();
      ctx.moveTo(40, y);
      ctx.lineTo(width - 10, y);
      ctx.stroke();

      // Axis labels
      const val = cfg.max - ((cfg.max - cfg.min) / gridYCount) * i;
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(Math.round(val), 35, y + 3);
    }

    if (!data || data.length < 2) {
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.textAlign = 'center';
      ctx.font = '11px "JetBrains Mono", monospace';
      ctx.fillText('STREAMING TELEMETRY PACKETS...', width / 2, height / 2);
      return;
    }

    // Function to map data to canvas Y
    const getY = (val) => {
      const clamped = Math.max(cfg.min, Math.min(cfg.max, val));
      const norm = (clamped - cfg.min) / (cfg.max - cfg.min);
      return height - norm * (height - 20) - 10;
    };

    const getX = (idx, total) => {
      const startX = 45;
      const endX = width - 15;
      return startX + (idx / (total - 1)) * (endX - startX);
    };

    // Draw Line Series with glowing path
    const drawSeries = (color, key, isArea = false) => {
      ctx.save();
      ctx.beginPath();
      data.forEach((pt, idx) => {
        const x = getX(idx, data.length);
        const y = getY(pt[key]);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      if (isArea) {
        ctx.lineTo(getX(data.length - 1, data.length), height);
        ctx.lineTo(getX(0, data.length), height);
        ctx.closePath();
        const areaGrad = ctx.createLinearGradient(0, 0, 0, height);
        areaGrad.addColorStop(0, `${color}25`);
        areaGrad.addColorStop(1, `${color}00`);
        ctx.fillStyle = areaGrad;
        ctx.fill();
      } else {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Draw latest point pulse dot
        const lastX = getX(data.length - 1, data.length);
        const lastY = getY(data[data.length - 1][key]);
        ctx.beginPath();
        ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.stroke();
      }
      ctx.restore();
    };

    // Draw series 1 (Area + line)
    drawSeries(cfg.series1.color, 'v1', true);
    drawSeries(cfg.series1.color, 'v1', false);

    // Draw series 2 (Line)
    drawSeries(cfg.series2.color, 'v2', false);
  }, [telemetry, activeMetric, isPaused]);

  // Export CSV Handler
  const handleExportCSV = () => {
    playSuccess();
    const data = dataHistoryRef.current[activeMetric];
    const cfg = metricsConfig[activeMetric];
    let csv = `Timestamp,${cfg.series1.name},${cfg.series2.name}\n`;
    data.forEach((row) => {
      csv += `${new Date(row.time).toISOString()},${row.v1},${row.v2}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbital_telemetry_${activeMetric}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentCfg = metricsConfig[activeMetric];
  const Icon = currentCfg.icon;

  return (
    <div className="hud-panel hud-corner rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-cyan)] bg-[rgba(6,12,26,0.9)] text-xs">
        <div className="flex items-center gap-2 font-mono text-[var(--color-cyan)] font-semibold uppercase tracking-wider">
          <Activity className="w-4 h-4 text-[var(--color-cyan)]" />
          <span>REAL-TIME TELEMETRY STREAM</span>
        </div>

        {/* Channel Selection Buttons */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {Object.keys(metricsConfig).map((key) => (
            <button
              key={key}
              onClick={() => {
                playClick();
                setActiveMetric(key);
              }}
              className={`px-2 py-0.5 rounded transition-all ${
                activeMetric === key
                  ? 'bg-[var(--color-cyan)] text-[#030712] font-bold'
                  : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Graph Area */}
      <div className="p-3 flex-1 flex flex-col justify-between">
        {/* Metric Header & Live Value Badges */}
        <div className="flex items-center justify-between text-xs font-mono mb-2">
          <div className="flex items-center gap-2 text-white font-semibold">
            <Icon className="w-4 h-4 text-[var(--color-cyan)]" />
            <span>{currentCfg.title}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentCfg.series1.color }} />
              <span className="text-[var(--text-secondary)] text-[11px]">{currentCfg.series1.name}:</span>
              <span className="text-white font-bold text-[11px]">
                {telemetry ? currentCfg.series1.getValue(telemetry) : '--'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentCfg.series2.color }} />
              <span className="text-[var(--text-secondary)] text-[11px]">{currentCfg.series2.name}:</span>
              <span className="text-white font-bold text-[11px]">
                {telemetry ? currentCfg.series2.getValue(telemetry) : '--'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Canvas */}
        <div className="relative w-full flex-1 min-h-[140px] rounded border border-[rgba(0,240,255,0.15)] overflow-hidden">
          <canvas
            ref={canvasRef}
            width={580}
            height={160}
            className="w-full h-full block"
          />
        </div>

        {/* Graph Footer Controls */}
        <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] mt-2 pt-1 border-t border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-3">
            <span>SAMPLING RATE: 10 Hz</span>
            <span>BUFFER: 50 SAMPLES</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                playClick();
                setIsPaused(!isPaused);
              }}
              className="text-[var(--color-cyan)] hover:text-white flex items-center gap-1"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              <span>{isPaused ? 'RESUME' : 'FREEZE'}</span>
            </button>
            <span>//</span>
            <button
              onClick={handleExportCSV}
              className="text-[var(--color-emerald)] hover:text-white flex items-center gap-1"
            >
              <Download className="w-3 h-3" />
              <span>EXPORT CSV</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
