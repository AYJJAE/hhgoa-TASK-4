import React, { useState } from 'react';
import { 
  Zap, 
  Compass, 
  Thermometer, 
  Radio, 
  Flame, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  RotateCw, 
  Activity, 
  Sliders, 
  Power,
  ChevronRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { playClick, playSuccess, playAlert, playBurn } from '../services/soundEffects';

export default function SubsystemsPanel({ 
  telemetry, 
  onAction,
  onOpenPayloadModal 
}) {
  const [activeTab, setActiveTab] = useState('eps');
  const [diagnosticRunning, setDiagnosticRunning] = useState(null);

  const subsystems = [
    { id: 'eps', name: 'EPS', label: 'POWER EPS', icon: Zap, status: telemetry.eps.status },
    { id: 'adcs', name: 'ADCS', label: 'ATTITUDE ADCS', icon: Compass, status: telemetry.adcs.status },
    { id: 'tcs', name: 'TCS', label: 'THERMAL TCS', icon: Thermometer, status: telemetry.tcs.status },
    { id: 'ttc', name: 'TT&C', label: 'COMMS TT&C', icon: Radio, status: telemetry.ttc.status },
    { id: 'propulsion', name: 'PROPULSION', label: 'PROPULSION', icon: Flame, status: telemetry.propulsion.status },
    { id: 'payload', name: 'PAYLOAD', label: 'PAYLOAD SENSORS', icon: Camera, status: telemetry.payload.status }
  ];

  const handleRunDiagnostic = (sysId) => {
    playClick();
    setDiagnosticRunning(sysId);
    setTimeout(() => {
      setDiagnosticRunning(null);
      playSuccess();
      onAction('LOG_EVENT', {
        severity: 'SUCCESS',
        message: `Automated diagnostic completed for ${sysId.toUpperCase()}: All telemetry parameters within flight envelope.`
      });
    }, 1800);
  };

  const getStatusBadge = (status) => {
    if (status === 'NOMINAL') {
      return (
        <span className="badge-status badge-nominal">
          <CheckCircle className="w-3 h-3" />
          <span>NOMINAL</span>
        </span>
      );
    }
    if (status === 'WARNING') {
      return (
        <span className="badge-status badge-warning">
          <AlertTriangle className="w-3 h-3" />
          <span>WARNING</span>
        </span>
      );
    }
    return (
      <span className="badge-status badge-critical">
        <XCircle className="w-3 h-3" />
        <span>CRITICAL</span>
      </span>
    );
  };

  return (
    <div className="hud-panel hud-corner rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-cyan)] bg-[rgba(6,12,26,0.9)] text-xs">
        <div className="flex items-center gap-2 font-mono text-[var(--color-cyan)] font-semibold uppercase tracking-wider">
          <Cpu className="w-4 h-4 text-[var(--color-cyan)]" />
          <span>SUBSYSTEM HEALTH & DIAGNOSTICS</span>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]">
          6/6 SYSTEMS ONLINE
        </span>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-6 border-b border-white/10 bg-black/40 text-xs backdrop-blur-md">
        {subsystems.map((sub) => {
          const Icon = sub.icon;
          const isActive = activeTab === sub.id;

          let colorActiveStyle = 'text-cyan-300 border-b-2 border-cyan-400 bg-cyan-500/15';
          if (sub.id === 'eps') colorActiveStyle = 'text-orange-400 border-b-2 border-orange-500 bg-orange-500/15 shadow-[0_0_12px_rgba(249,115,22,0.3)]';
          if (sub.id === 'adcs') colorActiveStyle = 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/15 shadow-[0_0_12px_rgba(168,85,247,0.3)]';
          if (sub.id === 'tcs') colorActiveStyle = 'text-sky-300 border-b-2 border-sky-400 bg-sky-500/15 shadow-[0_0_12px_rgba(56,189,248,0.3)]';
          if (sub.id === 'ttc') colorActiveStyle = 'text-blue-300 border-b-2 border-blue-400 bg-blue-500/15 shadow-[0_0_12px_rgba(59,130,246,0.3)]';
          if (sub.id === 'propulsion') colorActiveStyle = 'text-red-400 border-b-2 border-red-500 bg-red-500/15 shadow-[0_0_12px_rgba(239,68,68,0.3)]';
          if (sub.id === 'payload') colorActiveStyle = 'text-fuchsia-300 border-b-2 border-fuchsia-400 bg-fuchsia-500/15 shadow-[0_0_12px_rgba(217,70,239,0.3)]';

          return (
            <button
              key={sub.id}
              onClick={() => {
                playClick();
                setActiveTab(sub.id);
              }}
              className={`p-2.5 flex flex-col items-center gap-1 border-r border-white/5 last:border-r-0 transition-all ${
                isActive
                  ? `${colorActiveStyle} font-bold`
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-mono font-medium hidden sm:inline">{sub.name}</span>
            </button>
          );
        })}
      </div>

      {/* Content Body for Active Subsystem */}
      <div className="p-3 flex-1 overflow-y-auto space-y-3 font-mono text-xs">
        {/* EPS Details */}
        {activeTab === 'eps' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                ELECTRICAL POWER SUBSYSTEM (EPS)
              </span>
              {getStatusBadge(telemetry.eps.status)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">SOLAR GENERATION</div>
                <div className="text-base font-bold text-amber-400 mt-0.5">
                  {telemetry.eps.solarGeneration} W
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">
                  Arrays: {telemetry.eps.solarArrayDeployed ? 'DEPLOYED' : 'STOWED'}
                </div>
              </div>

              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">BATTERY CHARGE (SoC)</div>
                <div className="text-base font-bold text-[var(--color-emerald)] mt-0.5">
                  {telemetry.eps.batterySoC}%
                </div>
                {/* Visual Battery Bar */}
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-[var(--color-emerald)] h-full transition-all duration-300"
                    style={{ width: `${telemetry.eps.batterySoC}%` }}
                  />
                </div>
              </div>

              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">BUS VOLTAGE / CURRENT</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {telemetry.eps.busVoltage} V // {telemetry.eps.busCurrent} A
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">Regulated ±0.5V</div>
              </div>

              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">TOTAL POWER DRAW</div>
                <div className="text-sm font-bold text-[var(--color-cyan)] mt-0.5">
                  {telemetry.eps.powerLoad} W
                </div>
                <div className="text-[10px] text-[var(--text-muted)] mt-1">Cell Temp: {telemetry.eps.cellTemp}°C</div>
              </div>
            </div>

            {/* Interactive Actions */}
            <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-2">
              <button
                onClick={() => onAction('TOGGLE_SOLAR')}
                className="btn-aerospace flex-1 text-[11px]"
              >
                {telemetry.eps.solarArrayDeployed ? 'STOW SOLAR WINGS' : 'DEPLOY SOLAR WINGS'}
              </button>
              <button
                onClick={() => onAction('TOGGLE_LOAD_SHED')}
                className={`btn-aerospace flex-1 text-[11px] ${telemetry.eps.loadShedding ? 'btn-aerospace-danger' : ''}`}
              >
                {telemetry.eps.loadShedding ? 'RESTORE LOADS' : 'SHED NON-ESSENTIALS'}
              </button>
              <button
                onClick={() => handleRunDiagnostic('eps')}
                disabled={diagnosticRunning === 'eps'}
                className="btn-aerospace text-[11px] px-3"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{diagnosticRunning === 'eps' ? 'TESTING...' : 'RUN SELF-CHECK'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ADCS Details */}
        {activeTab === 'adcs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-cyan-400" />
                ATTITUDE DETERMINATION & CONTROL (ADCS)
              </span>
              {getStatusBadge(telemetry.adcs.status)}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">ROLL</div>
                <div className="text-sm font-bold text-[var(--color-cyan)] mt-0.5">
                  {telemetry.adcs.roll > 0 ? `+${telemetry.adcs.roll}°` : `${telemetry.adcs.roll}°`}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">{telemetry.adcs.rollRate} °/s</div>
              </div>
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">PITCH</div>
                <div className="text-sm font-bold text-[var(--color-cyan)] mt-0.5">
                  {telemetry.adcs.pitch > 0 ? `+${telemetry.adcs.pitch}°` : `${telemetry.adcs.pitch}°`}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">{telemetry.adcs.pitchRate} °/s</div>
              </div>
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">YAW</div>
                <div className="text-sm font-bold text-[var(--color-cyan)] mt-0.5">
                  {telemetry.adcs.yaw > 0 ? `+${telemetry.adcs.yaw}°` : `${telemetry.adcs.yaw}°`}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">{telemetry.adcs.yawRate} °/s</div>
              </div>
            </div>

            {/* Reaction Wheels Status */}
            <div className="bg-[rgba(6,12,26,0.7)] p-2.5 rounded border border-[rgba(255,255,255,0.06)]">
              <div className="text-[var(--text-secondary)] text-[10px] mb-1.5 flex items-center justify-between">
                <span>REACTION WHEELS RPM (RW 1-4)</span>
                <span className="text-[var(--color-emerald)]">STAR TRACKERS: {telemetry.adcs.starTrackersLocked}/2 LOCKED</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-[11px] text-center">
                {telemetry.adcs.reactionWheels.map((rpm, idx) => (
                  <div key={idx} className="bg-black/40 p-1.5 rounded border border-white/5">
                    <div className="text-[9px] text-[var(--text-muted)]">RW-{idx + 1}</div>
                    <div className="font-bold text-white text-xs">{rpm}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-2">
              <button
                onClick={() => onAction('DETUMBLE')}
                className="btn-aerospace flex-1 text-[11px]"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>EXECUTE DETUMBLE</span>
              </button>
              <button
                onClick={() => onAction('SLEW_SUN')}
                className="btn-aerospace flex-1 text-[11px]"
              >
                <span>SLEW SUN-POINTING</span>
              </button>
              <button
                onClick={() => handleRunDiagnostic('adcs')}
                disabled={diagnosticRunning === 'adcs'}
                className="btn-aerospace text-[11px] px-3"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{diagnosticRunning === 'adcs' ? 'TESTING...' : 'RUN CHECK'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TCS Details */}
        {activeTab === 'tcs' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Thermometer className="w-4 h-4 text-emerald-400" />
                THERMAL CONTROL SUBSYSTEM (TCS)
              </span>
              {getStatusBadge(telemetry.tcs.status)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">MAIN AVIONICS BUS</div>
                <div className="text-base font-bold text-[var(--color-emerald)] mt-0.5">
                  {telemetry.tcs.busTemp}°C
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Limits: -10°C to +45°C</div>
              </div>
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">SOLAR WINGS SURFACE</div>
                <div className={`text-base font-bold mt-0.5 ${telemetry.tcs.solarArrayTemp < 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                  {telemetry.tcs.solarArrayTemp > 0 ? `+${telemetry.tcs.solarArrayTemp}°C` : `${telemetry.tcs.solarArrayTemp}°C`}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Insulation: MLI Blanket</div>
              </div>
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">PAYLOAD OPTICS DECK</div>
                <div className="text-sm font-bold text-cyan-300 mt-0.5">
                  {telemetry.tcs.payloadOpticsTemp}°C
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Cryocooler Active</div>
              </div>
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">RADIATOR LOUVERS</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {telemetry.tcs.louversState}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Heaters: {telemetry.tcs.heatersActive ? 'ACTIVE' : 'AUTO-STANDBY'}</div>
              </div>
            </div>

            <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-2">
              <button
                onClick={() => onAction('TOGGLE_HEATERS')}
                className="btn-aerospace flex-1 text-[11px]"
              >
                {telemetry.tcs.heatersActive ? 'DEACTIVATE HEATERS' : 'ACTIVATE HEATERS'}
              </button>
              <button
                onClick={() => handleRunDiagnostic('tcs')}
                disabled={diagnosticRunning === 'tcs'}
                className="btn-aerospace text-[11px] px-3"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{diagnosticRunning === 'tcs' ? 'TESTING...' : 'RUN CHECK'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TT&C Comms Details */}
        {activeTab === 'ttc' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-purple-400" />
                TELEMETRY, TRACKING & COMMAND (TT&C)
              </span>
              {getStatusBadge(telemetry.ttc.status)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">ACTIVE GROUND LINK</div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">
                  {telemetry.orbit.activeGroundStation}
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">Distance: {telemetry.orbit.groundStationDistance} km</div>
              </div>

              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">DOWNLINK SNR / RATE</div>
                <div className="text-base font-bold text-[var(--color-cyan)] mt-0.5">
                  {telemetry.ttc.snr} dB // {telemetry.ttc.downlinkRate} Mbps
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">BER: {telemetry.ttc.ber}</div>
              </div>

              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)] col-span-2">
                <div className="text-[var(--text-secondary)] text-[10px]">TRANSPONDER FREQUENCIES</div>
                <div className="text-xs text-white mt-0.5 flex justify-between">
                  <span>UPLINK: {telemetry.ttc.uplinkFrequency}</span>
                  <span>DOWNLINK: {telemetry.ttc.downlinkFrequency}</span>
                </div>
                <div className="text-[10px] text-[var(--color-emerald)] mt-1">
                  TOTAL MISSION TELEMETRY DOWNLINKED: {telemetry.ttc.totalBytesDownlinked} MB
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-2">
              <button
                onClick={() => onAction('PING_GROUND')}
                className="btn-aerospace flex-1 text-[11px]"
              >
                <span>TRANSMIT DSN PING</span>
              </button>
              <button
                onClick={() => handleRunDiagnostic('ttc')}
                disabled={diagnosticRunning === 'ttc'}
                className="btn-aerospace text-[11px] px-3"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{diagnosticRunning === 'ttc' ? 'TESTING...' : 'RUN CHECK'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Propulsion Details */}
        {activeTab === 'propulsion' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-400" />
                MONOPROPELLANT RCS PROPULSION
              </span>
              {getStatusBadge(telemetry.propulsion.status)}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">HYDRAZINE PROPELLANT</div>
                <div className="text-base font-bold text-orange-400 mt-0.5">
                  {telemetry.propulsion.fuelRemaining} kg ({telemetry.propulsion.fuelPercent}%)
                </div>
                {/* Fuel gauge */}
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div 
                    className="bg-orange-400 h-full transition-all duration-300"
                    style={{ width: `${telemetry.propulsion.fuelPercent}%` }}
                  />
                </div>
              </div>

              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">TANK PRESSURE / DELTA-V</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {telemetry.propulsion.tankPressure} psi // {telemetry.propulsion.deltaVReserve} m/s
                </div>
                <div className="text-[10px] text-[var(--color-emerald)] mt-1">Valves: ARMED & READY</div>
              </div>
            </div>

            {/* Quick Burn Buttons */}
            <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-2">
              <button
                onClick={() => {
                  playBurn(1.0);
                  onAction('FIRE_BURN', 2);
                }}
                disabled={telemetry.propulsion.isBurning}
                className="btn-aerospace flex-1 text-[11px]"
              >
                <Flame className="w-3.5 h-3.5 text-orange-400" />
                <span>TRIM BURN (2s)</span>
              </button>
              <button
                onClick={() => {
                  playBurn(2.5);
                  onAction('FIRE_BURN', 5);
                }}
                disabled={telemetry.propulsion.isBurning}
                className="btn-aerospace flex-1 text-[11px] btn-aerospace-amber"
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>ORBIT BOOST (5s)</span>
              </button>
              <button
                onClick={() => handleRunDiagnostic('propulsion')}
                disabled={diagnosticRunning === 'propulsion'}
                className="btn-aerospace text-[11px] px-3"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{diagnosticRunning === 'propulsion' ? 'TESTING...' : 'RUN CHECK'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Payload Sensors Details */}
        {activeTab === 'payload' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-white font-semibold flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                HYPERSPECTRAL EARTH OBSERVATION PAYLOAD
              </span>
              {getStatusBadge(telemetry.payload.status)}
            </div>

            <div className="bg-[rgba(6,12,26,0.7)] p-2.5 rounded border border-[rgba(255,255,255,0.06)] space-y-1.5">
              <div className="text-[var(--text-secondary)] text-[10px]">RECENT CAPTURE</div>
              <div className="text-white text-xs font-semibold">
                {telemetry.payload.lastImage.target}
              </div>
              <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>Band: {telemetry.payload.lastImage.spectralBand}</span>
                <span>GSD: {telemetry.payload.lastImage.resolution}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">STORAGE BUFFER (SSR)</div>
                <div className="text-sm font-bold text-white mt-0.5">
                  {telemetry.payload.storageUsedGB} / {telemetry.payload.storageTotalGB} GB
                </div>
                <div className="text-[10px] text-[var(--text-muted)]">{telemetry.payload.capturesCount} frames stored</div>
              </div>
              <div className="bg-[rgba(6,12,26,0.7)] p-2 rounded border border-[rgba(255,255,255,0.06)]">
                <div className="text-[var(--text-secondary)] text-[10px]">DETECTOR CRYO-LOCK</div>
                <div className="text-sm font-bold text-[var(--color-cyan)] mt-0.5">
                  {telemetry.payload.detectorTemp}°C (LOCKED)
                </div>
                <div className="text-[10px] text-[var(--color-emerald)]">CCD Cooler: STABLE</div>
              </div>
            </div>

            <div className="pt-2 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap gap-2">
              <button
                onClick={() => {
                  playClick();
                  onOpenPayloadModal();
                }}
                className="btn-aerospace flex-1 text-[11px] bg-[rgba(0,240,255,0.18)]"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>ACQUIRE EARTH SNAPSHOT</span>
              </button>
              <button
                onClick={() => handleRunDiagnostic('payload')}
                disabled={diagnosticRunning === 'payload'}
                className="btn-aerospace text-[11px] px-3"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{diagnosticRunning === 'payload' ? 'TESTING...' : 'RUN CHECK'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
