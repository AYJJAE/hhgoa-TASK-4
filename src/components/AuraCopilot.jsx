import React, { useState } from 'react';
import { 
  Cpu, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Crosshair, 
  Zap, 
  CheckCircle2, 
  Radio, 
  Sun, 
  Sparkles as SparklesIcon, 
  Activity, 
  Flame, 
  RotateCw, 
  Terminal, 
  Volume2 
} from 'lucide-react';
import { playClick, playSuccess, playAlert, playBurn, speakTactical } from '../services/soundEffects';

export default function AuraCopilot({ 
  telemetry, 
  onFireBurn, 
  onResolveAnomaly, 
  onAction,
  activeAnomalies = []
}) {
  const [activeTab, setActiveTab] = useState('radar');
  const [isExecutingAvoidance, setIsExecutingAvoidance] = useState(false);
  const [conjunctionResolved, setConjunctionResolved] = useState(false);
  const [isSelfHealing, setIsSelfHealing] = useState(false);

  // Conjunction threat parameters
  const conjunctionThreat = {
    target: 'COSMOS-2251 DEB #33789',
    tcaSeconds: conjunctionResolved ? 0 : 340, // Time to Closest Approach
    missDistanceKm: conjunctionResolved ? 18.4 : 1.14,
    probability: conjunctionResolved ? '< 1e-7' : '3.82e-4',
    suggestedDeltaV: 0.85 // m/s
  };

  // Trigger Autonomous Collision Avoidance
  const handleExecuteAvoidance = () => {
    playClick();
    setIsExecutingAvoidance(true);
    speakTactical('AURA AI initiating autonomous collision avoidance burn. RCS prograde vector confirmed.');

    setTimeout(() => {
      onFireBurn(3);
      setConjunctionResolved(true);
      setIsExecutingAvoidance(false);
      playSuccess();
      onAction('LOG_EVENT', {
        severity: 'SUCCESS',
        message: 'AURA AI: Conjunction avoided. Trajectory shifted +1.2km apogee. Collision risk cleared.'
      });
    }, 1500);
  };

  // Trigger Autonomous Anomaly Self-Healing
  const handleAutonomousHeal = () => {
    playClick();
    setIsSelfHealing(true);
    speakTactical('AURA neural triage active. Executing autonomous fault isolation and circuit bypass.');

    setTimeout(() => {
      onResolveAnomaly();
      setIsSelfHealing(false);
      playSuccess();
      onAction('LOG_EVENT', {
        severity: 'SUCCESS',
        message: 'AURA AI: Subsystem fault isolated. Relay shunt engaged. Bus voltage nominal (28.4V).'
      });
    }, 1800);
  };

  const handleOptimizeSolar = () => {
    playClick();
    playSuccess();
    speakTactical('AURA solar optimizer: Solar array beta angle recalibrated for maximum insolation.');
    onAction('TOGGLE_SOLAR');
    onAction('LOG_EVENT', {
      severity: 'SUCCESS',
      message: 'AURA AI: Solar panel orientation optimized. Generation efficiency increased to 99.4%.'
    });
  };

  const hasAnomaly = activeAnomalies.length > 0 || telemetry.eps.status === 'CRITICAL';

  return (
    <div className="liquid-glass liquid-glass-purple hud-corner rounded-2xl overflow-hidden flex flex-col h-full bg-[#070518]/80 border border-purple-500/35 backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-purple-500/20 bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Cpu className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-purple-400 animate-ping"></span>
          </div>
          <div>
            <div className="font-display font-bold text-xs tracking-wider text-white flex items-center gap-2">
              <span>AURA-9 NEURAL CORE</span>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/40">
                ACTIVE CO-PILOT
              </span>
            </div>
            <div className="text-[9px] font-mono text-purple-200/60">
              AUTONOMOUS ORBITAL REASONING ENGINE
            </div>
          </div>
        </div>

        {/* Neural Confidence metric */}
        <div className="text-right font-mono">
          <div className="text-[9px] text-zinc-400">INFERENCE LOAD</div>
          <div className="text-[11px] font-bold text-emerald-400 text-glow-emerald">
            99.8% NOMINAL
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-purple-500/20 bg-black/40 text-xs font-mono">
        {[
          { id: 'radar', label: 'CONJUNCTION RADAR', icon: Crosshair },
          { id: 'triage', label: 'SELF-HEALING', icon: ShieldCheck, alert: hasAnomaly },
          { id: 'flux', label: 'SOLAR FLUX', icon: Sun }
        ].map(({ id, label, icon: Icon, alert }) => (
          <button
            key={id}
            onClick={() => {
              playClick();
              setActiveTab(id);
            }}
            className={`flex-1 py-2 px-3 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-all relative ${
              activeTab === id
                ? 'bg-purple-500/25 text-purple-200 border-b-2 border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${alert ? 'text-red-400 animate-bounce' : ''}`} />
            <span>{label}</span>
            {alert && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-1 right-2 animate-ping"></span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 font-mono text-xs">
        {/* Tab 1: Conjunction Avoidance Radar */}
        {activeTab === 'radar' && (
          <div className="space-y-3">
            <div className={`p-2.5 rounded border transition-colors ${
              conjunctionResolved 
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-red-950/30 border-red-500/50 text-red-200'
            }`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  {conjunctionResolved ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>NO THREAT DETECTED</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                      <span>SPACE DEBRIS PROXIMITY ALERT</span>
                    </>
                  )}
                </span>
                <span className="text-[9px] px-1 py-0.5 rounded bg-black/40 border border-current">
                  CATALOG #{conjunctionThreat.target.slice(-5)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-current/20">
                <div>TARGET: <span className="text-white font-bold">{conjunctionThreat.target}</span></div>
                <div>COLLISION PROB: <span className={conjunctionResolved ? 'text-emerald-400' : 'text-red-400 font-bold'}>{conjunctionThreat.probability}</span></div>
                <div>MISS DIST: <span className="text-white font-bold">{conjunctionThreat.missDistanceKm} km</span></div>
                <div>TCA COUNTDOWN: <span className="text-white font-bold">{conjunctionResolved ? 'CLEARED' : `${conjunctionThreat.tcaSeconds}s`}</span></div>
              </div>
            </div>

            {/* AI Recommended Burn Solution */}
            <div className="bg-[rgba(2,6,18,0.7)] p-2.5 rounded border border-[rgba(0,240,255,0.25)] space-y-1.5">
              <div className="text-[10px] text-[var(--color-cyan)] font-bold flex items-center justify-between">
                <span>AI OPTIMAL MANEUVER SOLUTION</span>
                <span className="text-[9px] text-[var(--text-muted)]">ΔV = +0.85 m/s</span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
                AURA calculates prograde burn vector at next orbital ascending node will increase perigee clearance by +17.2 km with zero ground communications interruption.
              </p>

              <button
                onClick={handleExecuteAvoidance}
                disabled={isExecutingAvoidance || conjunctionResolved}
                className={`w-full mt-2 py-2 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  conjunctionResolved
                    ? 'bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600/30 to-amber-600/30 border-red-500/60 text-red-100 hover:from-red-600/50 hover:to-amber-600/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)]'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {isExecutingAvoidance 
                    ? 'FIRING AUTONOMOUS AVOIDANCE BURN...' 
                    : conjunctionResolved 
                    ? 'CONJUNCTION RESOLVED (SAFE DISTANCE)' 
                    : 'EXECUTE AI AVOIDANCE BURN (+ΔV)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Autonomous Anomaly Self-Healing */}
        {activeTab === 'triage' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded border bg-[rgba(2,6,18,0.7)] border-[rgba(0,240,255,0.25)] space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--text-secondary)]">SUBSYSTEM STATUS:</span>
                <span className={`font-bold px-1.5 py-0.5 rounded ${hasAnomaly ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {hasAnomaly ? 'FAULT DETECTED (EPS)' : 'ALL SYSTEMS NOMINAL'}
                </span>
              </div>

              {hasAnomaly ? (
                <div className="p-2 rounded bg-red-950/40 border border-red-500/50 text-[10px] text-red-200 space-y-1">
                  <div className="font-bold flex items-center gap-1 text-red-300">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <span>EPS BATTERY CELL #3 UNDERVOLT</span>
                  </div>
                  <p className="text-[9px] text-red-200/80">
                    Voltage drop to 24.1V detected across main DC power rail. AURA neural triage identified high internal impedance in Cell #3.
                  </p>
                  <div className="text-[9px] text-emerald-300 pt-1 border-t border-red-500/30">
                    AI Mitigation: Trigger solid-state bypass relay SSR-04 and engage auxiliary charge shunt.
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/30 text-[10px] text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Real-time telemetry neural validation passed. Zero anomalies registered across 48 telemetry points.</span>
                </div>
              )}

              <button
                onClick={handleAutonomousHeal}
                disabled={!hasAnomaly || isSelfHealing}
                className={`w-full py-2 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  hasAnomaly
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 hover:bg-cyan-500/35 hover:shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                    : 'bg-zinc-800/40 border-zinc-700 text-zinc-500 cursor-not-allowed'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>
                  {isSelfHealing 
                    ? 'EXECUTING AUTONOMOUS HEALING MATRIX...' 
                    : hasAnomaly 
                    ? 'EXECUTE AUTONOMOUS SELF-HEAL' 
                    : 'CIRCUITS STABLE (STANDBY)'}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Solar Flux Optimizer */}
        {activeTab === 'flux' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded border bg-[rgba(2,6,18,0.7)] border-[rgba(0,240,255,0.25)] space-y-2">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--text-secondary)]">CURRENT SOLAR FLUX:</span>
                <span className="text-amber-300 font-bold">1,361 W/m² (STABLE)</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--text-secondary)]">PV GENERATION:</span>
                <span className="text-cyan-300 font-bold">{telemetry.eps.solarGeneration} Watts</span>
              </div>
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-[var(--text-secondary)]">BETA ANGLE:</span>
                <span className="text-white font-bold">+28.4° (OPTIMAL)</span>
              </div>

              <button
                onClick={handleOptimizeSolar}
                className="w-full mt-2 py-2 rounded text-[11px] font-bold flex items-center justify-center gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-200 hover:bg-amber-500/30 transition-all"
              >
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>AI RECALIBRATE SOLAR TRACKING</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Quick Speech Announcer */}
      <div className="px-3 py-2 border-t border-[var(--border-cyan)] bg-[rgba(3,8,22,0.95)] flex items-center justify-between text-[10px] font-mono">
        <span className="text-[var(--text-muted)] flex items-center gap-1">
          <Activity className="w-3 h-3 text-[var(--color-cyan)]" />
          <span>VOICE ANNOUNCER READY</span>
        </span>
        <button
          onClick={() => {
            playClick();
            speakTactical('AURA neural flight diagnostics: Orbital twin velocity 7.66 kilometers per second. Ground link Goldstone nominal. All autonomous policies active.');
          }}
          className="text-cyan-300 hover:text-white flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-900/30 border border-cyan-500/30"
        >
          <Volume2 className="w-3 h-3" />
          <span>SPEAK REPORT</span>
        </button>
      </div>
    </div>
  );
}
