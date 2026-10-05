import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal as TerminalIcon, 
  Send, 
  Trash2, 
  ChevronRight, 
  Sparkles,
  CornerDownLeft,
  Flame,
  Zap,
  Globe,
  Camera
} from 'lucide-react';
import { 
  playClick, 
  playSuccess, 
  playAlert, 
  playBurn, 
  playKeypress 
} from '../services/soundEffects';

export default function CommandTerminal({ 
  telemetry, 
  onExecuteCommand, 
  onOpenPayloadModal 
}) {
  const [inputVal, setInputVal] = useState('');
  const [history, setHistory] = useState([
    { type: 'sys', text: 'ORBITAL FLIGHT COMPUTER OS [v4.2.1-RTOS]' },
    { type: 'sys', text: 'UPLINK CARRIER LOCKED // SECURE S-BAND TELEMETRY INITIALIZED' },
    { type: 'sys', text: 'Type "help" to display operational flight commands.' }
  ]);
  const [cmdHistory, setCmdHistory] = useState([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
  const terminalScrollRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll terminal on output
  useEffect(() => {
    if (terminalScrollRef.current) {
      terminalScrollRef.current.scrollTop = terminalScrollRef.current.scrollHeight;
    }
  }, [history]);

  const handleCommand = (rawCmd) => {
    const trimmed = rawCmd.trim();
    if (!trimmed) return;

    playClick();

    // Add to command history
    setCmdHistory(prev => [...prev, trimmed]);
    setCmdHistoryIdx(-1);

    // Echo command
    setHistory(prev => [...prev, { type: 'user', text: `$ ${trimmed}` }]);

    const parts = trimmed.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (cmd) {
      case 'help': {
        setHistory(prev => [
          ...prev,
          { type: 'res', text: 'AVAILABLE FLIGHT COMMANDS:' },
          { type: 'info', text: '  status                - Telemetry status report for all subsystems' },
          { type: 'info', text: '  burn [--duration=<s|m>]- Fire RCS thruster burn (e.g. burn 3 or burn --dv=5)' },
          { type: 'info', text: '  point <sun|nadir>     - Slew satellite attitude to target vector' },
          { type: 'info', text: '  solar <deploy|stow>   - Command solar array articulation' },
          { type: 'info', text: '  payload capture       - Acquire high-resolution Earth imagery' },
          { type: 'info', text: '  ping <dsn>            - Transmit RF ping to ground station (Goldstone/Madrid/Canberra)' },
          { type: 'info', text: '  weather               - Query real-time NOAA Space Weather Kp-index' },
          { type: 'info', text: '  iss                   - Query live ISS NORAD #25544 coordinates' },
          { type: 'info', text: '  timewarp <1|2|5|10>   - Set simulation time acceleration' },
          { type: 'info', text: '  reboot <subsystem>    - Soft-reboot subsystem flight computer' },
          { type: 'info', text: '  clear                 - Clear terminal screen' }
        ]);
        break;
      }

      case 'status': {
        setHistory(prev => [
          ...prev,
          { type: 'res', text: `=== SATELLITE DIGITAL TWIN STATUS [${telemetry.mode}] ===` },
          { type: 'info', text: `ORBIT: Alt ${telemetry.orbit.altitude} km | Vel ${telemetry.orbit.velocity} km/s | Inc ${telemetry.orbit.inclination}°` },
          { type: 'info', text: `POWER: Solar ${telemetry.eps.solarGeneration} W | Battery ${telemetry.eps.batterySoC}% | Bus ${telemetry.eps.busVoltage} V` },
          { type: 'info', text: `ADCS: Roll ${telemetry.adcs.roll}° | Pitch ${telemetry.adcs.pitch}° | Yaw ${telemetry.adcs.yaw}° [${telemetry.adcs.mode}]` },
          { type: 'info', text: `THERMAL: Bus ${telemetry.tcs.busTemp}°C | Wings ${telemetry.tcs.solarArrayTemp}°C [${telemetry.tcs.status}]` },
          { type: 'info', text: `COMMS: ${telemetry.orbit.activeGroundStation} | SNR ${telemetry.ttc.snr} dB | Rate ${telemetry.ttc.downlinkRate} Mbps` },
          { type: 'info', text: `PROPULSION: Fuel ${telemetry.propulsion.fuelRemaining} kg (${telemetry.propulsion.fuelPercent}%) | ΔV ${telemetry.propulsion.deltaVReserve} m/s` }
        ]);
        break;
      }

      case 'burn': {
        let sec = 3;
        if (args.length > 0) {
          const parsed = parseInt(args[0].replace('--duration=', '').replace('--dv=', ''), 10);
          if (!isNaN(parsed) && parsed > 0) sec = Math.min(10, parsed);
        }
        playBurn(sec);
        onExecuteCommand('BURN', { duration: sec });
        setHistory(prev => [
          ...prev,
          { type: 'res', text: `[PROPULSION] RCS THRUSTER FIRING INITIATED: Duration ${sec}s` },
          { type: 'info', text: `Translational impulse applied. Orbit apogee raising. Propellant consumed: ${(sec * 0.12).toFixed(2)} kg.` }
        ]);
        break;
      }

      case 'solar': {
        const action = args[0] ? args[0].toLowerCase() : 'toggle';
        if (action === 'deploy' || action === '--deploy') {
          onExecuteCommand('SOLAR_DEPLOY');
          setHistory(prev => [...prev, { type: 'res', text: '[EPS] Solar panel deployment latches released. Wings fully deployed.' }]);
        } else if (action === 'stow' || action === '--stow') {
          onExecuteCommand('SOLAR_STOW');
          setHistory(prev => [...prev, { type: 'res', text: '[EPS] Solar wings articulated to stowed orbital transit configuration.' }]);
        } else {
          onExecuteCommand('TOGGLE_SOLAR');
          setHistory(prev => [...prev, { type: 'res', text: `[EPS] Solar wing state toggled.` }]);
        }
        break;
      }

      case 'point': {
        const target = args[0] ? args[0].toLowerCase() : 'nadir';
        if (target === 'sun') {
          onExecuteCommand('SLEW_SUN');
          setHistory(prev => [...prev, { type: 'res', text: '[ADCS] Reaction wheels commanding slew to SUN-POINTING attitude.' }]);
        } else {
          onExecuteCommand('DETUMBLE');
          setHistory(prev => [...prev, { type: 'res', text: '[ADCS] Magnetorquers & reaction wheels commanding NADIR-LOCK.' }]);
        }
        break;
      }

      case 'payload': {
        const subCmd = args[0] ? args[0].toLowerCase() : 'capture';
        if (subCmd === 'capture' || subCmd === '--capture') {
          playSuccess();
          onOpenPayloadModal();
          setHistory(prev => [
            ...prev,
            { type: 'res', text: '[PAYLOAD] Optical Earth observation shutter activated.' },
            { type: 'info', text: `Exposure captured at Lat ${telemetry.orbit.latitude}°, Lon ${telemetry.orbit.longitude}°. Frame written to SSR buffer.` }
          ]);
        } else {
          setHistory(prev => [...prev, { type: 'res', text: `[PAYLOAD] Storage used: ${telemetry.payload.storageUsedGB} GB of ${telemetry.payload.storageTotalGB} GB.` }]);
        }
        break;
      }

      case 'ping': {
        const target = args[0] || telemetry.orbit.activeGroundStation;
        const rtt = (8.5 + Math.random() * 4.2).toFixed(2);
        setHistory(prev => [
          ...prev,
          { type: 'res', text: `TRANSMITTING 64-BYTE CARRIER PING TO: ${target}...` },
          { type: 'info', text: `64 bytes from ${target}: icmp_seq=1 ttl=64 rtt=${rtt} ms (SNR: ${telemetry.ttc.snr} dB)` }
        ]);
        break;
      }

      case 'weather': {
        setHistory(prev => [
          ...prev,
          { type: 'res', text: '=== NOAA SPACE WEATHER PREDICTION CENTER LIVE FEED ===' },
          { type: 'info', text: `PLANETARY K-INDEX: ${telemetry.spaceWeather.kpIndex} [${telemetry.spaceWeather.stormLevel}]` },
          { type: 'info', text: `SOLAR WIND PROTON VELOCITY: ${telemetry.spaceWeather.solarWindSpeed} km/s` },
          { type: 'info', text: `DATA SOURCE: ${telemetry.spaceWeather.source}` }
        ]);
        break;
      }

      case 'iss': {
        setHistory(prev => [
          ...prev,
          { type: 'res', text: '=== NORAD SATELLITE CATALOG #25544 (ISS) ===' },
          { type: 'info', text: `COORDINATES: Lat ${telemetry.orbit.latitude}°, Lon ${telemetry.orbit.longitude}°` },
          { type: 'info', text: `ORBIT PROFILE: Altitude ${telemetry.orbit.altitude} km | Speed ${(telemetry.orbit.velocity * 3600).toFixed(0)} km/h` },
          { type: 'info', text: `LIGHTING: ${telemetry.orbit.isEclipse ? 'Eclipsed (Shadow)' : 'Direct Sunlight'}` }
        ]);
        break;
      }

      case 'timewarp': {
        const rate = parseInt(args[0], 10);
        if ([1, 2, 5, 10].includes(rate)) {
          onExecuteCommand('TIMEWARP', { rate });
          setHistory(prev => [...prev, { type: 'res', text: `Simulation clock multiplier set to ${rate}x.` }]);
        } else {
          setHistory(prev => [...prev, { type: 'err', text: 'Invalid multiplier. Supported rates: 1, 2, 5, 10.' }]);
        }
        break;
      }

      case 'reboot': {
        const sub = args[0] || 'flight-computer';
        setHistory(prev => [
          ...prev,
          { type: 'res', text: `Initiating warm reboot sequence for: ${sub.toUpperCase()}...` },
          { type: 'info', text: 'POST diagnostics: OK. Memory registers verified. Ready.' }
        ]);
        break;
      }

      case 'clear': {
        setHistory([
          { type: 'sys', text: 'TERMINAL BUFFER CLEARED.' },
          { type: 'sys', text: 'Type "help" for command dictionary.' }
        ]);
        break;
      }

      default: {
        setHistory(prev => [
          ...prev,
          { type: 'err', text: `Command not recognized: "${cmd}". Type "help" for manual.` }
        ]);
        break;
      }
    }

    setInputVal('');
  };

  const handleKeyDown = (e) => {
    playKeypress();

    if (e.key === 'Enter') {
      handleCommand(inputVal);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const nextIdx = cmdHistoryIdx === -1 ? cmdHistory.length - 1 : Math.max(0, cmdHistoryIdx - 1);
      setCmdHistoryIdx(nextIdx);
      setInputVal(cmdHistory[nextIdx]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (cmdHistoryIdx === -1) return;
      const nextIdx = cmdHistoryIdx + 1;
      if (nextIdx >= cmdHistory.length) {
        setCmdHistoryIdx(-1);
        setInputVal('');
      } else {
        setCmdHistoryIdx(nextIdx);
        setInputVal(cmdHistory[nextIdx]);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab autocomplete
      const commands = ['help', 'status', 'burn', 'solar', 'point', 'payload', 'ping', 'weather', 'iss', 'timewarp', 'reboot', 'clear'];
      const matched = commands.find(c => c.startsWith(inputVal.trim()));
      if (matched) setInputVal(matched);
    }
  };

  return (
    <div className="liquid-glass hud-corner rounded-2xl overflow-hidden flex flex-col h-full bg-[#030712]/75 backdrop-blur-2xl border border-white/15">
      {/* Terminal Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-white/5 text-xs backdrop-blur-md">
        <div className="flex items-center gap-2 font-mono text-cyan-300 font-semibold uppercase tracking-wider">
          <TerminalIcon className="w-4 h-4 text-cyan-400" />
          <span>MISSION CONTROL CLI // AEROTERM</span>
        </div>

        <button
          onClick={() => {
            playClick();
            setHistory([
              { type: 'sys', text: 'TERMINAL BUFFER CLEARED.' },
              { type: 'sys', text: 'Type "help" for available flight commands.' }
            ]);
          }}
          className="text-zinc-400 hover:text-white transition-colors"
          title="Clear screen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal Screen with CRT Scanline Effect */}
      <div 
        ref={terminalScrollRef}
        onClick={() => inputRef.current?.focus()}
        className="p-4 flex-1 overflow-y-auto space-y-1 font-mono text-xs text-zinc-300 min-h-[160px] md:min-h-[200px] max-h-[250px] scanlines-overlay cursor-text"
      >
        {history.map((line, idx) => {
          if (line.type === 'user') {
            return (
              <div key={idx} className="text-cyan-300 font-semibold">
                {line.text}
              </div>
            );
          }
          if (line.type === 'res') {
            return (
              <div key={idx} className="text-emerald-300 font-bold">
                {line.text}
              </div>
            );
          }
          if (line.type === 'err') {
            return (
              <div key={idx} className="text-red-400 font-semibold">
                {line.text}
              </div>
            );
          }
          if (line.type === 'sys') {
            return (
              <div key={idx} className="text-zinc-500 text-[11px]">
                {line.text}
              </div>
            );
          }
          return (
            <div key={idx} className="text-zinc-300">
              {line.text}
            </div>
          );
        })}
      </div>

      {/* Quick Action Command Chips (Multi-Color Liquid Glass Pills) */}
      <div className="px-4 py-2 bg-black/40 border-t border-white/10 flex items-center gap-2 overflow-x-auto whitespace-nowrap text-[10px] font-mono backdrop-blur-md">
        <span className="text-zinc-400 shrink-0 font-bold">QUICK:</span>
        {[
          { label: 'help', cmd: 'help', colorClass: 'border-white/20 text-zinc-300 hover:bg-white/10' },
          { label: 'status', cmd: 'status', colorClass: 'border-blue-500/40 text-blue-300 hover:bg-blue-500/20' },
          { label: 'burn 3s', cmd: 'burn 3', colorClass: 'border-orange-500/40 text-orange-300 hover:bg-orange-500/20' },
          { label: 'solar deploy', cmd: 'solar deploy', colorClass: 'border-amber-500/40 text-amber-300 hover:bg-amber-500/20' },
          { label: 'payload capture', cmd: 'payload capture', colorClass: 'border-purple-500/40 text-purple-300 hover:bg-purple-500/20' },
          { label: 'weather', cmd: 'weather', colorClass: 'border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20' },
          { label: 'ping dsn', cmd: 'ping', colorClass: 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20' },
          { label: 'clear', cmd: 'clear', colorClass: 'border-red-500/40 text-red-300 hover:bg-red-500/20' }
        ].map((item, idx) => (
          <button
            key={idx}
            onClick={() => handleCommand(item.cmd)}
            className={`px-3 py-1 rounded-full border bg-white/5 backdrop-blur-md transition-all shadow-[0_0_10px_rgba(0,0,0,0.3)] ${item.colorClass}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Command Input Field */}
      <div className="p-2 bg-[rgba(3,7,18,0.95)] border-t border-[var(--border-cyan)] flex items-center gap-2">
        <div className="flex items-center text-[var(--color-cyan)] pl-1">
          <ChevronRight className="w-4 h-4" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter command (e.g. status, burn 5, solar deploy, payload capture)..."
          className="flex-1 bg-transparent text-white font-mono text-xs focus:outline-none placeholder-zinc-600"
          autoFocus
        />
        <button
          onClick={() => handleCommand(inputVal)}
          className="p-1.5 rounded bg-[rgba(0,240,255,0.15)] text-[var(--color-cyan)] hover:bg-[rgba(0,240,255,0.3)] transition-colors"
          title="Send command"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
