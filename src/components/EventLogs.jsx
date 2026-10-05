import React, { useState, useRef, useEffect } from 'react';
import { 
  Terminal, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle, 
  Radio, 
  Download, 
  Trash2, 
  Play, 
  Pause,
  Zap,
  Flame,
  Bomb
} from 'lucide-react';
import { playClick, playSuccess, playAlert } from '../services/soundEffects';

export default function EventLogs({ 
  logs, 
  onClearLogs, 
  onInjectAnomaly,
  onResolveAnomaly,
  activeAnomalies 
}) {
  const [filter, setFilter] = useState('ALL');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef(null);

  // Auto-scroll on new log
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    if (filter === 'ALERTS') return log.severity === 'WARN' || log.severity === 'CRIT';
    if (filter === 'COMM') return log.severity === 'COMM';
    if (filter === 'CMD') return log.severity === 'CMD';
    return true;
  });

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRIT':
        return <span className="text-[var(--color-crimson)] font-bold">[CRIT]</span>;
      case 'WARN':
        return <span className="text-[var(--color-amber)] font-bold">[WARN]</span>;
      case 'SUCCESS':
        return <span className="text-[var(--color-emerald)] font-bold">[SUCC]</span>;
      case 'COMM':
        return <span className="text-purple-400 font-bold">[COMM]</span>;
      case 'CMD':
        return <span className="text-[var(--color-cyan)] font-bold">[CMD]</span>;
      default:
        return <span className="text-blue-400 font-bold">[INFO]</span>;
    }
  };

  const handleExportLogs = () => {
    playSuccess();
    const content = logs.map(l => `[${l.timestamp}] [${l.severity}] ${l.message}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbital_mission_log_${Date.now()}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="hud-panel hud-corner rounded-lg overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-cyan)] bg-[rgba(6,12,26,0.9)] text-xs">
        <div className="flex items-center gap-2 font-mono text-[var(--color-cyan)] font-semibold uppercase tracking-wider">
          <Terminal className="w-4 h-4 text-[var(--color-cyan)]" />
          <span>MISSION EVENT CHRONICLE</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {['ALL', 'ALERTS', 'COMM', 'CMD'].map((f) => (
            <button
              key={f}
              onClick={() => {
                playClick();
                setFilter(f);
              }}
              className={`px-2 py-0.5 rounded transition-all ${
                filter === f
                  ? 'bg-[var(--color-cyan)] text-[#030712] font-bold'
                  : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Raw Hex CCSDS Telemetry Ticker */}
      <div className="px-3 py-1 bg-[rgba(3,7,18,0.85)] border-b border-[rgba(0,240,255,0.1)] text-[10px] font-mono text-[var(--color-cyan)] flex items-center justify-between overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)] animate-ping" />
          <span className="text-[var(--text-muted)]">CCSDS FRAME:</span>
          <span>0x1A 0xC8 0x4B 0xF2 [APID 0x042] LEN:1024 CRC:VALID</span>
        </div>
        <span className="text-[var(--text-muted)] hidden sm:inline">BITSTREAM: 100% NOMINAL</span>
      </div>

      {/* Anomaly drill alert bar (if any anomaly active) */}
      {activeAnomalies && activeAnomalies.length > 0 && (
        <div className="px-3 py-1.5 bg-red-950/60 border-b border-red-500/50 text-xs font-mono text-red-300 flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>ACTIVE ANOMALY: {activeAnomalies.join(', ')}</span>
          </div>
          <button
            onClick={() => {
              playSuccess();
              onResolveAnomaly();
            }}
            className="px-2 py-0.5 rounded bg-red-800 hover:bg-red-700 text-white text-[10px] uppercase font-bold"
          >
            RESOLVE ANOMALY
          </button>
        </div>
      )}

      {/* Logs Scroll List */}
      <div 
        ref={logContainerRef}
        className="p-3 flex-1 overflow-y-auto space-y-1.5 font-mono text-[11px] leading-relaxed max-h-[220px] md:max-h-[260px]"
      >
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 text-center py-6">NO LOG ENTRIES MATCH CURRENT FILTER</div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className={`p-1.5 rounded border transition-colors ${
                log.severity === 'CRIT'
                  ? 'bg-red-950/30 border-red-800/40 text-red-200'
                  : log.severity === 'WARN'
                  ? 'bg-amber-950/30 border-amber-800/40 text-amber-200'
                  : log.severity === 'SUCCESS'
                  ? 'bg-emerald-950/20 border-emerald-800/30 text-emerald-200'
                  : log.severity === 'CMD'
                  ? 'bg-cyan-950/20 border-cyan-800/30 text-cyan-200'
                  : 'bg-black/20 border-white/5 text-zinc-300'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-[var(--text-muted)] text-[10px] shrink-0">{log.timestamp}</span>
                <span className="shrink-0">{getSeverityBadge(log.severity)}</span>
                <span className="flex-1 break-words">{log.message}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Log Footer Controls */}
      <div className="px-3 py-2 bg-[rgba(6,12,26,0.9)] border-t border-[var(--border-cyan)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playClick();
              setAutoScroll(!autoScroll);
            }}
            className={`flex items-center gap-1 ${autoScroll ? 'text-[var(--color-cyan)]' : 'text-zinc-500'}`}
          >
            {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>AUTO-SCROLL {autoScroll ? 'ON' : 'OFF'}</span>
          </button>
          <span>//</span>
          <span>TOTAL: {logs.length}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Anomaly drill injector button */}
          <button
            onClick={() => {
              playAlert();
              onInjectAnomaly();
            }}
            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-700/50"
            title="Inject simulated flight anomaly drill"
          >
            <Bomb className="w-3 h-3" />
            <span className="text-[10px]">DRILL: INJECT FAULT</span>
          </button>

          <button
            onClick={handleExportLogs}
            className="text-[var(--color-emerald)] hover:text-white flex items-center gap-1"
            title="Export mission log file"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:inline">EXPORT</span>
          </button>

          <button
            onClick={() => {
              playClick();
              onClearLogs();
            }}
            className="text-zinc-500 hover:text-red-400 flex items-center gap-1"
            title="Clear logs"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
