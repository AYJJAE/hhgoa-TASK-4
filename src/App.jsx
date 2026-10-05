import React, { useState, useEffect, useRef } from 'react';
import MissionClocks from './components/MissionClocks';
import SatelliteViewport from './components/SatelliteViewport';
import SubsystemsPanel from './components/SubsystemsPanel';
import TelemetryGraphs from './components/TelemetryGraphs';
import CommandTerminal from './components/CommandTerminal';
import EventLogs from './components/EventLogs';
import PayloadModal from './components/PayloadModal';
import AuraCopilot from './components/AuraCopilot';
import Sparkles from './components/Sparkles';
import { 
  Globe, 
  Zap, 
  Cpu, 
  Activity, 
  Terminal, 
  ShieldAlert, 
  Layers, 
  Radio, 
  Sparkles as SparklesIcon,
  ChevronDown,
  ArrowUpRight,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Flame,
  Compass,
  Sun,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Disc,
  Clock,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { 
  createInitialTelemetry, 
  stepTelemetry, 
  fetchLiveISSTelemetry, 
  fetchLiveSpaceWeather 
} from './services/telemetryEngine';
import { 
  playBeep, 
  playAlert, 
  playSuccess, 
  playBurn, 
  playClick,
  isSoundEnabled,
  setSoundEnabled,
  speakTactical
} from './services/soundEffects';

export default function App() {
  const [telemetry, setTelemetry] = useState(createInitialTelemetry);
  const [logs, setLogs] = useState([
    { id: 1, timestamp: '16:00:00.000', severity: 'INFO', message: 'Flight software initialization complete. Core avionics online.' },
    { id: 2, timestamp: '16:00:02.140', severity: 'SUCCESS', message: 'Uplink carrier established with Goldstone DSN-14 (S-Band 2085.4 MHz).' },
    { id: 3, timestamp: '16:00:05.890', severity: 'COMM', message: 'Downlink telemetry stream verified at 150.0 Mbps. BER < 1.2e-9.' },
    { id: 4, timestamp: '16:00:10.220', severity: 'INFO', message: 'Solar array alpha gimbal locked in auto-sun-tracking vector.' }
  ]);
  const [isPayloadOpen, setIsPayloadOpen] = useState(false);
  const [activeAnomalies, setActiveAnomalies] = useState([]);
  const [mobileTab, setMobileTab] = useState('orbit'); // 'orbit', 'avionics', 'aura', 'telemetry', 'terminal'
  const [desktopRightTab, setDesktopRightTab] = useState('aura'); // 'aura', 'terminal', 'logs'

  const telemetryRef = useRef(telemetry);
  telemetryRef.current = telemetry;

  // Helper to add event log
  const addLog = (severity, message) => {
    const now = new Date();
    const timeStr = `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}.${String(now.getUTCMilliseconds()).padStart(3, '0')}`;
    const newEntry = {
      id: Date.now() + Math.random(),
      timestamp: timeStr,
      severity,
      message
    };
    setLogs((prev) => [...prev.slice(-150), newEntry]);
  };

  // 1. Initial Space Weather & ISS Fetch
  useEffect(() => {
    // Fetch live NOAA Space Weather
    fetchLiveSpaceWeather().then((weather) => {
      setTelemetry((prev) => ({
        ...prev,
        spaceWeather: weather
      }));
      addLog('COMM', `NOAA Space Weather updated: Planetary Kp=${weather.kpIndex} (${weather.stormLevel}), Wind=${weather.solarWindSpeed} km/s`);
    });

    // Check periodically for space weather
    const weatherInterval = setInterval(() => {
      fetchLiveSpaceWeather().then((weather) => {
        setTelemetry((prev) => ({ ...prev, spaceWeather: weather }));
      });
    }, 60000);

    return () => clearInterval(weatherInterval);
  }, []);

  // 2. Main High-Frequency Telemetry Simulation Loop (100ms)
  useEffect(() => {
    let lastTime = performance.now();
    let prevEclipse = telemetry.orbit.isEclipse;
    let prevStation = telemetry.orbit.activeGroundStation;

    const interval = setInterval(() => {
      const now = performance.now();
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      setTelemetry((current) => {
        if (current.mode === 'ISS-LIVE') {
          return current; // In live mode, updated via live API poller
        }

        const next = stepTelemetry(current, dt);

        // Detect eclipse transition
        if (!prevEclipse && next.orbit.isEclipse) {
          prevEclipse = true;
          addLog('WARN', 'ORBITAL ECLIPSE ENTRY: Umbra shadow entered. Solar generation dropped to 0W. Battery discharging.');
          playAlert();
        } else if (prevEclipse && !next.orbit.isEclipse) {
          prevEclipse = false;
          addLog('SUCCESS', 'ORBITAL SUNRISE: Solar arrays illuminated. PV generation nominal (2,240 W). Recharging batteries.');
          playSuccess();
        }

        // Detect ground station handover
        if (prevStation !== next.orbit.activeGroundStation && next.ttc.snr > 0) {
          prevStation = next.orbit.activeGroundStation;
          addLog('COMM', `GROUND HANDOVER: Acquisition of Signal (AOS) with ${next.orbit.activeGroundStation}.`);
          playBeep();
        }

        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // 3. Live ISS Polling Loop (when in ISS-LIVE mode)
  useEffect(() => {
    if (telemetry.mode !== 'ISS-LIVE') return;

    const pollISS = async () => {
      const data = await fetchLiveISSTelemetry();
      if (data.success) {
        setTelemetry((prev) => ({
          ...prev,
          orbit: {
            ...prev.orbit,
            altitude: Number(data.altitude.toFixed(2)),
            velocity: Number(data.velocity.toFixed(3)),
            latitude: Number(data.latitude.toFixed(4)),
            longitude: Number(data.longitude.toFixed(4)),
            isEclipse: data.visibility === 'eclipsed',
            subsolarLat: data.solarLat,
            subsolarLon: data.solarLon
          },
          eps: {
            ...prev.eps,
            solarGeneration: data.visibility === 'eclipsed' ? 0 : 2350
          }
        }));
      }
    };

    pollISS();
    const issInterval = setInterval(pollISS, 3000);
    return () => clearInterval(issInterval);
  }, [telemetry.mode]);

  // Operational Handlers
  const handleFireBurn = (durationSeconds = 3) => {
    playBurn(durationSeconds);
    setTelemetry((prev) => ({
      ...prev,
      propulsion: {
        ...prev.propulsion,
        isBurning: true,
        burnType: 'ORBIT_RAISE',
        burnRemainingSeconds: durationSeconds
      }
    }));
    addLog('CMD', `COMMAND EXECUTED: Monopropellant RCS Thruster Burn started for ${durationSeconds} seconds.`);
  };

  const handleToggleSolarArray = () => {
    setTelemetry((prev) => {
      const nextDeployed = !prev.eps.solarArrayDeployed;
      addLog('CMD', `COMMAND EXECUTED: Solar arrays articulated to ${nextDeployed ? 'DEPLOYED' : 'STOWED'} state.`);
      return {
        ...prev,
        eps: {
          ...prev.eps,
          solarArrayDeployed: nextDeployed,
          solarGeneration: nextDeployed && !prev.orbit.isEclipse ? 2240 : 0
        }
      };
    });
  };

  const handleDetumble = () => {
    setTelemetry((prev) => {
      addLog('CMD', 'COMMAND EXECUTED: B-Dot detumble algorithm initiated via magnetorquers. Attitude stabilized.');
      playSuccess();
      return {
        ...prev,
        adcs: {
          ...prev.adcs,
          mode: 'NADIR_POINTING',
          roll: 0.05,
          pitch: -0.12,
          yaw: 0.35,
          rollRate: 0.001,
          pitchRate: -0.001,
          yawRate: 0.001
        }
      };
    });
  };

  const handleSlewSun = () => {
    setTelemetry((prev) => {
      addLog('CMD', 'COMMAND EXECUTED: ADCS attitude slewing to solar inertial pointing vector.');
      playSuccess();
      return {
        ...prev,
        adcs: {
          ...prev.adcs,
          mode: 'SUN_POINTING',
          pitch: 34.0,
          yaw: 12.0
        }
      };
    });
  };

  const handleToggleLoadShed = () => {
    setTelemetry((prev) => {
      const nextShed = !prev.eps.loadShedding;
      addLog(nextShed ? 'WARN' : 'INFO', `EPS LOAD SHEDDING: ${nextShed ? 'ACTIVATED (Non-essential avionics powered down)' : 'DEACTIVATED (Full loads restored)'}.`);
      return {
        ...prev,
        eps: {
          ...prev.eps,
          loadShedding: nextShed,
          powerLoad: nextShed ? 780 : 1280
        }
      };
    });
  };

  const handleToggleHeaters = () => {
    setTelemetry((prev) => {
      const nextHeaters = !prev.tcs.heatersActive;
      addLog('CMD', `TCS SURVIVAL HEATERS: ${nextHeaters ? 'MANUAL OVERRIDE ON' : 'AUTO-STANDBY'}.`);
      return {
        ...prev,
        tcs: {
          ...prev.tcs,
          heatersActive: nextHeaters
        }
      };
    });
  };

  const handlePingGround = () => {
    playSuccess();
    const st = telemetry.orbit.activeGroundStation;
    addLog('COMM', `UPLINK PING: Echo received from ${st}. Carrier delay: 9.42 ms. Signal SNR: ${telemetry.ttc.snr} dB.`);
  };

  const handleInjectAnomaly = () => {
    playAlert();
    const anomalyType = 'EPS_BATTERY_CELL_UNDERVOLT';
    setActiveAnomalies([anomalyType]);
    setTelemetry((prev) => ({
      ...prev,
      anomalies: [anomalyType],
      eps: {
        ...prev.eps,
        status: 'CRITICAL',
        batterySoC: 46.8,
        busVoltage: 24.1
      }
    }));
    addLog('CRIT', 'EMERGENCY DRILL: Battery Cell #3 under-voltage detected! Bus dropped to 24.1V. Triggering contingency load shedding.');
  };

  const handleResolveAnomaly = () => {
    playSuccess();
    setActiveAnomalies([]);
    setTelemetry((prev) => ({
      ...prev,
      anomalies: [],
      eps: {
        ...prev.eps,
        status: 'NOMINAL',
        batterySoC: 92.4,
        busVoltage: 28.4
      }
    }));
    addLog('SUCCESS', 'ANOMALY RESOLVED: Battery cell isolation executed. Auxiliary charge bypass active. Bus restored to 28.4V.');
  };

  // General Subsystem Action dispatcher
  const handleSubsystemAction = (actionType, payload) => {
    switch (actionType) {
      case 'TOGGLE_SOLAR':
        handleToggleSolarArray();
        break;
      case 'DETUMBLE':
        handleDetumble();
        break;
      case 'SLEW_SUN':
        handleSlewSun();
        break;
      case 'TOGGLE_LOAD_SHED':
        handleToggleLoadShed();
        break;
      case 'TOGGLE_HEATERS':
        handleToggleHeaters();
        break;
      case 'PING_GROUND':
        handlePingGround();
        break;
      case 'FIRE_BURN':
        handleFireBurn(payload || 3);
        break;
      case 'LOG_EVENT':
        if (payload) addLog(payload.severity, payload.message);
        break;
      default:
        break;
    }
  };

  // Terminal Command Executor
  const handleExecuteCommand = (cmdType, payload) => {
    switch (cmdType) {
      case 'BURN':
        handleFireBurn(payload?.duration || 3);
        break;
      case 'SOLAR_DEPLOY':
        if (!telemetry.eps.solarArrayDeployed) handleToggleSolarArray();
        break;
      case 'SOLAR_STOW':
        if (telemetry.eps.solarArrayDeployed) handleToggleSolarArray();
        break;
      case 'TOGGLE_SOLAR':
        handleToggleSolarArray();
        break;
      case 'DETUMBLE':
        handleDetumble();
        break;
      case 'SLEW_SUN':
        handleSlewSun();
        break;
      case 'TIMEWARP':
        setTelemetry((prev) => ({ ...prev, timeMultiplier: payload?.rate || 1 }));
        addLog('INFO', `TIMEWARP: Simulation clock compression set to ${payload?.rate}x.`);
        break;
      default:
        break;
    }
  };

  const [soundEnabledState, setSoundEnabledState] = useState(isSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundEnabledState;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    playClick();
  };

  return (
    <div className="w-full min-h-screen bg-[#01040a] text-slate-100 flex flex-col font-sans selection:bg-[var(--color-cyan)] selection:text-black relative">
      {/* =========================================================================
          LIQUID AURORA AMBIENT BACKGROUND (Purple, Red, Orange, Blue Liquid Blurs)
          ========================================================================= */}
      <div className="liquid-aurora-bg">
        <div className="liquid-orb liquid-orb-blue"></div>
        <div className="liquid-orb liquid-orb-purple"></div>
        <div className="liquid-orb liquid-orb-orange"></div>
        <div className="liquid-orb liquid-orb-red"></div>
      </div>

      {/* =========================================================================
          1. STICKY MODERN LIQUID GLASS NAVIGATION BAR
          ========================================================================= */}
      <nav className="site-nav px-4 lg:px-8 py-3 flex items-center justify-between">
        {/* Brand */}
        <a href="#hero" className="flex items-center gap-3 text-white" style={{ textDecoration: 'none' }}>
          <div className="relative">
            <div className="w-9 h-9 rounded-xl border border-[rgba(255,255,255,0.25)] bg-gradient-to-br from-blue-500/20 via-cyan-500/20 to-purple-500/20 flex items-center justify-center text-[var(--color-cyan)] font-display font-black text-sm shadow-[0_0_15px_rgba(0,240,255,0.4)] backdrop-blur-md">
              Ω
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--color-emerald)] border border-[#01040a] animate-ping-beacon"></span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-black text-base tracking-wider text-white text-glow-cyan">
                ORBITAL
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-[var(--color-cyan)] border border-cyan-400/30">
                AETHER-1
              </span>
            </div>
            <div className="text-[9px] font-mono text-[var(--text-secondary)] hidden sm:block">
              AUTONOMOUS DIGITAL TWIN & MISSION CONTROL
            </div>
          </div>
        </a>

        {/* Section Navigation Links (Desktop) */}
        <div className="site-nav-links flex items-center gap-1">
          <a href="#hero" className="site-nav-link">Overview</a>
          <a href="#mission" className="site-nav-link">Live Mission</a>
          <a href="#twin" className="site-nav-link">3D Twin</a>
          <a href="#telemetry" className="site-nav-link">Telemetry</a>
          <a href="#subsystems" className="site-nav-link">Subsystems</a>
          <a href="#aura" className="site-nav-link flex items-center gap-1">
            <span className="text-purple-300">AURA AI</span>
            {activeAnomalies.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>}
          </a>
          <a href="#anomalies" className="site-nav-link text-red-300">Drills</a>
          <a href="#terminal" className="site-nav-link text-blue-300">Terminal</a>
        </div>

        {/* Navigation Action Hub */}
        <div className="flex items-center gap-2">
          {/* Audio Sound Toggle */}
          <button
            onClick={handleToggleSound}
            className={`p-2 rounded-full border text-xs font-mono transition-all flex items-center gap-1.5 backdrop-blur-md ${
              soundEnabledState 
                ? 'border-[var(--color-cyan)] bg-[rgba(0,240,255,0.18)] text-[var(--color-cyan)] shadow-[0_0_15px_rgba(0,240,255,0.4)]' 
                : 'border-white/10 bg-black/40 text-zinc-500'
            }`}
            title={soundEnabledState ? 'Audio Sound Active' : 'Sound Muted'}
          >
            {soundEnabledState ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Time Multiplier (Warp) */}
          <div className="hidden md:flex items-center bg-[rgba(6,14,32,0.7)] border border-white/10 rounded-full p-1 text-xs font-mono backdrop-blur-md">
            {[1, 2, 5, 10].map((rate) => (
              <button
                key={rate}
                onClick={() => {
                  playClick();
                  setTelemetry((prev) => ({ ...prev, timeMultiplier: rate }));
                  addLog('INFO', `Simulation rate set to ${rate}x.`);
                }}
                className={`px-2.5 py-0.5 text-[10px] rounded-full transition-colors ${
                  telemetry.timeMultiplier === rate
                    ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-[#01040a] font-bold shadow-[0_0_10px_rgba(0,240,255,0.5)]'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          {/* Mode Switcher */}
          <button
            onClick={() => {
              playClick();
              const nextMode = telemetry.mode === 'ORBITAL-1' ? 'ISS-LIVE' : 'ORBITAL-1';
              setTelemetry((prev) => ({ ...prev, mode: nextMode }));
              addLog('INFO', `OPERATIONAL MODE: ${nextMode}`);
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/15 bg-white/5 text-[10px] font-mono text-[var(--color-cyan)] hover:bg-white/10 backdrop-blur-md transition-all shadow-[0_0_12px_rgba(0,240,255,0.2)]"
            title="Switch Target"
          >
            <Globe className="w-3 h-3 text-[var(--color-cyan)]" />
            <span>{telemetry.mode === 'ISS-LIVE' ? 'ISS #25544' : 'AETHER-1'}</span>
          </button>

          {/* Primary CTA Button: Launch Mission Control */}
          <a
            href="#terminal"
            className="btn-launch-mission"
            onClick={() => playClick()}
          >
            <span>LAUNCH MISSION CONTROL</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </nav>

      {/* =========================================================================
          2. FULL-SCREEN LANDING HERO (Large 3D Earth, AETHER-1, Center Audio Hub)
          ========================================================================= */}
      <header id="hero" className="relative w-full min-h-[92vh] flex flex-col items-center justify-between p-4 lg:p-8 overflow-hidden">
        {/* Floating Sparkles across entire hero */}
        <div className="absolute inset-0 pointer-events-none z-10">
          <Sparkles count={18} color="#00f0ff" className="w-full h-full" overflow={true} />
        </div>

        {/* Top Hero Headline Banner */}
        <div className="relative z-20 text-center max-w-4xl mx-auto pt-4 sm:pt-6 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-orange-500/15 border border-white/20 text-[11px] font-mono font-semibold text-white backdrop-blur-xl shadow-[0_0_20px_rgba(0,240,255,0.2)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-cyan)] animate-ping"></span>
            <span className="text-cyan-300">DEEP SPACE PLATFORM // {telemetry.mode}</span>
            <span className="text-zinc-500">•</span>
            <span className="text-orange-300">SPACE WEATHER: {telemetry.spaceWeather.stormLevel}</span>
          </div>

          <h1 className="font-display font-black text-3xl sm:text-5xl lg:text-6xl tracking-wider text-white leading-tight">
            THE AUTONOMOUS <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 via-purple-400 to-orange-400 text-glow-cyan">
              ORBITAL DIGITAL TWIN
            </span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-sans">
            Real-time physical orbital propagation, neural collision avoidance radar, and autonomous flight avionics engineered for next-generation aerospace missions.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a href="#twin" className="btn-aerospace-purple px-6 py-2.5 text-xs font-display">
              <Compass className="w-4 h-4 text-purple-300" />
              <span>EXPLORE DIGITAL TWIN</span>
            </a>
            <a href="#terminal" className="btn-launch-mission text-xs font-display">
              <Terminal className="w-4 h-4" />
              <span>ENGAGE COMMAND TERMINAL</span>
            </a>
          </div>
        </div>

        {/* Hero Centerpiece: Large Animated 3D Earth with Centered Sound FX Hub */}
        <div className="viewport-hero-box relative z-20 max-w-6xl mx-auto my-6">
          <SatelliteViewport
            telemetry={telemetry}
            onFireBurn={handleFireBurn}
            onToggleSolarArray={handleToggleSolarArray}
            onDetumble={handleDetumble}
            heightClass="h-full"
            showSoundHub={true}
            showOverlayTop={true}
          />
        </div>

        {/* Floating Live Telemetry Metric Strip (Multi-Color Liquid Glass Cards) */}
        <div className="relative z-20 w-full max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-xs pb-4">
          <div className="liquid-glass liquid-glass-blue p-4 rounded-xl text-center">
            <div className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">ALTITUDE (PERIGEE)</div>
            <div className="text-xl font-bold text-white text-glow-blue mt-1">
              {telemetry.orbit.altitude} <span className="text-xs text-blue-300">km</span>
            </div>
            <div className="text-[9px] text-slate-300 mt-0.5">INCLINATION: {telemetry.orbit.inclination}°</div>
          </div>

          <div className="liquid-glass p-4 rounded-xl text-center">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">ORBITAL VELOCITY</div>
            <div className="text-xl font-bold text-[var(--color-emerald)] text-glow-emerald mt-1">
              {telemetry.orbit.velocity} <span className="text-xs">km/s</span>
            </div>
            <div className="text-[9px] text-slate-300 mt-0.5">27,594 km/h (MACH 22.4)</div>
          </div>

          <div className="liquid-glass liquid-glass-orange p-4 rounded-xl text-center">
            <div className="text-[10px] text-orange-300 font-semibold uppercase tracking-wider">BATTERY SOC (EPS)</div>
            <div className="text-xl font-bold text-orange-400 text-glow-orange mt-1">
              {telemetry.eps.batterySoC}%
            </div>
            <div className="text-[9px] text-slate-300 mt-0.5">{telemetry.eps.solarGeneration} W INSOLATION</div>
          </div>

          <div className="liquid-glass liquid-glass-purple p-4 rounded-xl text-center">
            <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">GROUND CARRIER (DSN)</div>
            <div className="text-xl font-bold text-purple-300 text-glow-purple mt-1">
              {telemetry.ttc.snr} <span className="text-xs">dB SNR</span>
            </div>
            <div className="text-[9px] text-slate-300 mt-0.5">{telemetry.orbit.activeGroundStation.split(' ')[0]}</div>
          </div>
        </div>

        {/* Scroll Prompt */}
        <div className="relative z-20 flex flex-col items-center gap-1 pt-2 text-[var(--text-secondary)] text-[10px] font-mono animate-bounce">
          <span>SCROLL TO EXPLORE MISSION</span>
          <ChevronDown className="w-4 h-4 text-[var(--color-cyan)]" />
        </div>
      </header>

      {/* =========================================================================
          3. SECTION 1: LIVE MISSION & MASTER CLOCKS (#mission)
          ========================================================================= */}
      <section id="mission" className="section-container border-t border-white/10">
        <div className="section-header">
          <div className="section-eyebrow section-eyebrow-orange">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>REAL-TIME TEMPORAL SYNC</span>
          </div>
          <h2 className="section-title">LIVE MISSION CHRONOMETRY</h2>
          <p className="section-description">
            High-precision CCSDS time synchronization, orbital insolation cycles, and live NOAA space weather integration.
          </p>
        </div>

        <div className="liquid-glass hud-corner rounded-2xl p-4 lg:p-6 shadow-[0_0_35px_rgba(249,115,22,0.12)]">
          <MissionClocks 
            telemetry={telemetry}
            onSetMultiplier={(rate) => {
              setTelemetry((prev) => ({ ...prev, timeMultiplier: rate }));
              addLog('INFO', `Simulation rate set to ${rate}x.`);
            }}
            onTogglePause={() => {
              setTelemetry((prev) => {
                const next = !prev.isPaused;
                addLog('INFO', next ? 'Simulation clock PAUSED.' : 'Simulation clock RESUMED.');
                return { ...prev, isPaused: next };
              });
            }}
            onSwitchMode={(newMode) => {
              setTelemetry((prev) => ({ ...prev, mode: newMode }));
              addLog('INFO', `OPERATIONAL MODE SWITCHED TO: ${newMode}`);
            }}
          />
        </div>
      </section>

      {/* =========================================================================
          4. SECTION 2: 3D SATELLITE DIGITAL TWIN SHOWCASE (#twin)
          ========================================================================= */}
      <section id="twin" className="section-container border-t border-white/10">
        <div className="section-header">
          <div className="section-eyebrow section-eyebrow-blue">
            <Globe className="w-3.5 h-3.5 text-blue-400" />
            <span>ORBITAL KINEMATICS ENGINE</span>
          </div>
          <h2 className="section-title">3D DIGITAL TWIN KINEMATICS</h2>
          <p className="section-description">
            Sub-satellite Nadir tracking, 3-axis reaction wheel momentum vectors, and real-time physical attitude actuators.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch font-mono">
          {/* Kinematics Card 1: Attitude & Vectors (Liquid Glass Blue) */}
          <div className="liquid-glass liquid-glass-blue hud-corner rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-blue-500/25 pb-2">
              <span className="text-white font-display font-bold text-sm tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-blue-400" />
                <span>ATTITUDE VECTORS</span>
              </span>
              <span className="badge-status badge-blue">NADIR LOCKED</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[var(--text-secondary)]">ROLL (Φ):</span>
                <span className="text-white font-bold">{telemetry.adcs.roll.toFixed(3)}°</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[var(--text-secondary)]">PITCH (Θ):</span>
                <span className="text-white font-bold">{telemetry.adcs.pitch.toFixed(3)}°</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[var(--text-secondary)]">YAW (Ψ):</span>
                <span className="text-white font-bold">{telemetry.adcs.yaw.toFixed(3)}°</span>
              </div>
            </div>

            <div className="pt-2 border-t border-blue-500/25">
              <div className="text-[10px] text-blue-300 font-semibold mb-2">REACTION WHEEL RPMs (RW1-4)</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {telemetry.adcs.reactionWheels.map((rpm, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-black/40 border border-white/10 flex justify-between">
                    <span className="text-zinc-400">RW{idx + 1}:</span>
                    <span className={rpm > 0 ? 'text-cyan-300 font-bold' : 'text-amber-300 font-bold'}>{rpm}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kinematics Card 2: Interactive Actuators (Liquid Glass Orange) */}
          <div className="liquid-glass liquid-glass-orange hud-corner rounded-2xl p-5 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-orange-500/25 pb-2">
                <span className="text-white font-display font-bold text-sm tracking-wider flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>ACTUATOR CONTROLS</span>
                </span>
                <span className="badge-status badge-orange">HARDWARE DISPATCH</span>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed font-sans">
                Direct telecommand overrides execute real-time state changes on the 3D physics model and flight software bus.
              </p>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={handleToggleSolarArray}
                className={`w-full py-2.5 px-4 rounded-full text-xs font-display font-bold flex items-center justify-between border transition-all backdrop-blur-md ${
                  telemetry.eps.solarArrayDeployed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                    : 'bg-red-500/20 text-red-300 border-red-500/40 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Sun className="w-4 h-4" />
                  <span>SOLAR ARRAY GIMBAL</span>
                </span>
                <span>{telemetry.eps.solarArrayDeployed ? 'DEPLOYED' : 'STOWED'}</span>
              </button>

              <button
                onClick={() => handleFireBurn(3)}
                disabled={telemetry.propulsion.isBurning}
                className="w-full py-2.5 px-4 rounded-full text-xs font-display font-bold flex items-center justify-between bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] disabled:opacity-50 backdrop-blur-md"
              >
                <span className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>MONOPROPELLANT RCS BURN</span>
                </span>
                <span>{telemetry.propulsion.isBurning ? 'FIRING...' : 'TRIGGER +ΔV'}</span>
              </button>

              <button
                onClick={handleDetumble}
                className="w-full py-2.5 px-4 rounded-full text-xs font-display font-bold flex items-center justify-between bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] backdrop-blur-md"
              >
                <span className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <span>B-DOT DETUMBLE DAMPER</span>
                </span>
                <span>STABILIZE</span>
              </button>
            </div>

            <a
              href="#hero"
              className="text-center text-[11px] text-cyan-300 underline hover:text-white pt-1"
            >
              ▲ View Live Orbit in Hero Viewport
            </a>
          </div>

          {/* Kinematics Card 3: Keplerian Elements (Liquid Glass Purple) */}
          <div className="liquid-glass liquid-glass-purple hud-corner rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-500/25 pb-2">
              <span className="text-white font-display font-bold text-sm tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span>KEPLERIAN ORBIT</span>
              </span>
              <span className="badge-status badge-purple">J2000 FRAME</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[var(--text-secondary)]">SEMI-MAJOR AXIS (a):</span>
                <span className="text-white font-bold">6,796.4 km</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[var(--text-secondary)]">ECCENTRICITY (e):</span>
                <span className="text-purple-300 font-bold">0.00042 (CIRCULAR)</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[var(--text-secondary)]">INCLINATION (i):</span>
                <span className="text-white font-bold">{telemetry.orbit.inclination}°</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[var(--text-secondary)]">ORBITAL PERIOD (T):</span>
                <span className="text-emerald-300 font-bold">{telemetry.orbit.period} min</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-lg bg-black/40 border border-white/10 backdrop-blur-md">
                <span className="text-[var(--text-secondary)]">TRUE ANOMALY (ν):</span>
                <span className="text-amber-300 font-bold">{telemetry.orbit.trueAnomaly.toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          5. SECTION 3: TELEMETRY & FLIGHT DYNAMICS (#telemetry)
          ========================================================================= */}
      <section id="telemetry" className="section-container border-t border-white/10">
        <div className="section-header">
          <div className="section-eyebrow section-eyebrow-blue">
            <Activity className="w-3.5 h-3.5 text-blue-400" />
            <span>DATA STREAMING & METRICS</span>
          </div>
          <h2 className="section-title">HIGH-FREQUENCY TELEMETRY</h2>
          <p className="section-description">
            Continuous real-time sampling of bus power rails, battery depth of discharge, RF signal-to-noise ratio, and thermal sensor arrays.
          </p>
        </div>

        <div className="liquid-glass w-full min-h-[360px] rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_35px_rgba(0,240,255,0.15)]">
          <TelemetryGraphs telemetry={telemetry} />
        </div>
      </section>

      {/* =========================================================================
          6. SECTION 4: SUBSYSTEM HEALTH & AVIONICS (#subsystems)
          ========================================================================= */}
      <section id="subsystems" className="section-container border-t border-white/10">
        <div className="section-header">
          <div className="section-eyebrow section-eyebrow-purple">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            <span>AVIONICS DIAGNOSTIC SUITE</span>
          </div>
          <h2 className="section-title">CORE SUBSYSTEM HEALTH</h2>
          <p className="section-description">
            Modular health monitoring across Electrical Power (EPS), Attitude Determination & Control (ADCS), Thermal Control (TCS), Communications (TT&C), and Optical Sensors.
          </p>
        </div>

        <div className="liquid-glass w-full min-h-[500px] rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_35px_rgba(168,85,247,0.15)]">
          <SubsystemsPanel
            telemetry={telemetry}
            onAction={handleSubsystemAction}
            onOpenPayloadModal={() => setIsPayloadOpen(true)}
          />
        </div>
      </section>

      {/* =========================================================================
          7. SECTION 5: AURA-9 NEURAL AI CORE (#aura)
          ========================================================================= */}
      <section id="aura" className="section-container border-t border-white/10">
        <div className="section-header">
          <div className="section-eyebrow section-eyebrow-purple">
            <Cpu className="w-3.5 h-3.5 text-purple-400" />
            <span>AUTONOMOUS ON-BOARD REASONING</span>
          </div>
          <h2 className="section-title">AURA-9 NEURAL AI COPILOT</h2>
          <p className="section-description">
            Autonomous orbital collision avoidance radar, neural debris trajectory solver, solar flux yield optimization, and tactical voice annunciation.
          </p>
        </div>

        <div className="liquid-glass liquid-glass-purple w-full min-h-[460px] rounded-2xl overflow-hidden border border-purple-500/35 shadow-[0_0_40px_rgba(168,85,247,0.2)]">
          <AuraCopilot
            telemetry={telemetry}
            onFireBurn={handleFireBurn}
            onResolveAnomaly={handleResolveAnomaly}
            onAction={handleSubsystemAction}
            activeAnomalies={activeAnomalies}
          />
        </div>
      </section>

      {/* =========================================================================
          8. SECTION 6: ANOMALY DRILLS & CONTINGENCY TRIAGE (#anomalies)
          ========================================================================= */}
      <section id="anomalies" className="section-container border-t border-white/10">
        <div className="section-header">
          <div className="section-eyebrow section-eyebrow-red">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span>FLIGHT CONTINGENCY SIMULATION</span>
          </div>
          <h2 className="section-title">ANOMALY SIMULATION & HEALING</h2>
          <p className="section-description">
            Inject emergency flight software anomalies, test emergency load shedding procedures, and execute autonomous neural triage.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {/* Anomaly Controller Card (Liquid Glass Red) */}
          <div className="liquid-glass liquid-glass-red hud-corner rounded-2xl p-6 flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-red-500/25">
                <span className="font-display font-bold text-sm tracking-wider text-white">
                  EMERGENCY DRILL CONTROLLER
                </span>
                <span className={`badge-status ${activeAnomalies.length > 0 ? 'badge-critical' : 'badge-nominal'}`}>
                  {activeAnomalies.length > 0 ? 'CONTINGENCY ACTIVE' : 'ALL CLEAR'}
                </span>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed font-sans">
                Injecting an anomaly simulates a sudden cell degradation in Battery #3, triggering voltage alarms, automated audible klaxon sirens, and emergency contingency triage across mission telemetry.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleInjectAnomaly}
                disabled={activeAnomalies.length > 0}
                className="btn-aerospace-danger flex-1 py-3 text-xs font-display flex items-center justify-center gap-2"
              >
                <AlertTriangle className="w-4 h-4 text-red-300" />
                <span>INJECT BATTERY UNDERVOLT DRILL</span>
              </button>

              <button
                onClick={handleResolveAnomaly}
                disabled={activeAnomalies.length === 0}
                className="btn-aerospace-orange flex-1 py-3 text-xs font-display flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>RESOLVE & HEAL CIRCUITS</span>
              </button>
            </div>
          </div>

          {/* Event Logs & Packet Stream */}
          <div className="liquid-glass w-full min-h-[380px] rounded-2xl overflow-hidden border border-white/15">
            <EventLogs
              logs={logs}
              onClearLogs={() => setLogs([])}
              onInjectAnomaly={handleInjectAnomaly}
              onResolveAnomaly={handleResolveAnomaly}
              activeAnomalies={activeAnomalies}
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          9. SECTION 7: MISSION CONTROL TERMINAL & CCSDS STREAM (#terminal)
          ========================================================================= */}
      <section id="terminal" className="section-container border-t border-white/10 pb-16">
        <div className="section-header">
          <div className="section-eyebrow section-eyebrow-blue">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            <span>AEROSPACE CLI PROTOCOL</span>
          </div>
          <h2 className="section-title">MISSION CONTROL TERMINAL</h2>
          <p className="section-description">
            Interactive command-line interface for manual telecommand uplink, thruster delta-V burns, solar array articulating, and CCSDS packet validation.
          </p>
        </div>

        <div className="liquid-glass w-full h-[520px] rounded-2xl overflow-hidden border border-white/20 shadow-[0_0_45px_rgba(59,130,246,0.18)]">
          <CommandTerminal
            telemetry={telemetry}
            onExecuteCommand={handleExecuteCommand}
            onOpenPayloadModal={() => setIsPayloadOpen(true)}
          />
        </div>
      </section>

      {/* =========================================================================
          10. FUTURISTIC WEBSITE FOOTER
          ========================================================================= */}
      <footer className="w-full border-t border-[rgba(0,240,255,0.2)] bg-[rgba(2,5,15,0.95)] py-10 px-6 font-mono text-xs text-[var(--text-secondary)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded border border-[var(--color-cyan)] bg-[rgba(0,240,255,0.1)] flex items-center justify-center text-[var(--color-cyan)] font-display font-black text-xs">
              Ω
            </div>
            <div>
              <div className="font-display font-bold text-white text-sm">
                ORBITAL // AETHER-1 MISSION CONTROL
              </div>
              <div className="text-[10px] text-[var(--text-muted)]">
                CCSDS COMPLIANT • NORAD SATELLITE CATALOG #25544
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px]">
            <a href="#hero" className="hover:text-[var(--color-cyan)] transition-colors">Overview</a>
            <a href="#mission" className="hover:text-[var(--color-cyan)] transition-colors">Clocks</a>
            <a href="#twin" className="hover:text-[var(--color-cyan)] transition-colors">Digital Twin</a>
            <a href="#telemetry" className="hover:text-[var(--color-cyan)] transition-colors">Telemetry</a>
            <a href="#subsystems" className="hover:text-[var(--color-cyan)] transition-colors">Subsystems</a>
            <a href="#aura" className="hover:text-[var(--color-cyan)] transition-colors">AURA AI</a>
            <a href="#terminal" className="hover:text-[var(--color-cyan)] transition-colors">Terminal</a>
          </div>

          <div className="text-right text-[10px] text-zinc-500">
            <div>ORBITAL TWIN ENGINE v2.6.4</div>
            <div>TELEMETRY REFRESH 120 HZ</div>
          </div>
        </div>
      </footer>

      {/* Payload Snapshot Modal */}
      {isPayloadOpen && (
        <PayloadModal
          telemetry={telemetry}
          onClose={() => setIsPayloadOpen(false)}
          onDownlinkComplete={() => {
            addLog('SUCCESS', `PAYLOAD DOWNLINK: High-resolution Earth image received at ground station. Frame saved to mission archive.`);
            setTelemetry((prev) => ({
              ...prev,
              payload: {
                ...prev.payload,
                capturesCount: prev.payload.capturesCount + 1,
                storageUsedGB: Math.min(128, prev.payload.storageUsedGB + 1.2)
              }
            }));
          }}
        />
      )}
    </div>
  );
}


