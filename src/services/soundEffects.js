// Web Audio API Sound Synthesizer & Analyser for Orbital Mission Control

let audioCtx = null;
let masterGain = null;
let analyserNode = null;
let soundEnabled = true;
let masterVolume = 0.8;

// Ambient space drone state
let ambientDrone = null;
let isAmbientPlaying = false;

function initAudio() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();

      // Master Gain Node
      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);

      // Analyser Node for 120Hz Real-Time Visualizers
      analyserNode = audioCtx.createAnalyser();
      analyserNode.fftSize = 64;
      analyserNode.smoothingTimeConstant = 0.8;

      masterGain.connect(analyserNode);
      analyserNode.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function getAudioContext() {
  return initAudio();
}

export function getAnalyserNode() {
  initAudio();
  return analyserNode;
}

export function isSoundEnabled() {
  return soundEnabled;
}

export function setSoundEnabled(enabled) {
  soundEnabled = enabled;
  if (typeof window !== 'undefined') {
    localStorage.setItem('orbital_sound_enabled', enabled ? 'true' : 'false');
  }
  if (!enabled && isAmbientPlaying) {
    stopSpaceHum();
  }
}

export function getMasterVolume() {
  return masterVolume;
}

export function setMasterVolume(vol) {
  masterVolume = Math.max(0, Math.min(1, vol));
  if (masterGain && audioCtx) {
    masterGain.gain.setValueAtTime(masterVolume, audioCtx.currentTime);
  }
}

// Load saved sound preference
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem('orbital_sound_enabled');
  if (saved !== null) {
    soundEnabled = saved === 'true';
  }
}

/**
 * Returns visualizer byte data (frequencies or simulated wave)
 */
export function getVisualizerData(buffer) {
  if (analyserNode && soundEnabled) {
    analyserNode.getByteFrequencyData(buffer);
    return true;
  }
  return false;
}

/**
 * Tactical micro-click for UI buttons and switches
 */
export function playClick() {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.035);
  } catch {}
}

/**
 * Soft high-tech telemetry chirp
 */
export function playBeep() {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1840, ctx.currentTime + 0.06);

    gain.gain.setValueAtTime(0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.085);
  } catch {}
}

/**
 * Success action chime (dual ascending cyber tones)
 */
export function playSuccess() {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;
    [
      { freq: 659.25, time: now, dur: 0.09 },       // E5
      { freq: 987.77, time: now + 0.08, dur: 0.16 }  // B5
    ].forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.06, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(time);
      osc.stop(time + dur);
    });
  } catch {}
}

/**
 * Radar / Sonar ping with spatial resonance
 */
export function playRadarPing() {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1960, now);
    osc.frequency.exponentialRampToValueAtTime(740, now + 0.6);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.72);
  } catch {}
}

/**
 * Warning / Anomaly Alert sound
 */
export function playAlert() {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(540, now);
    osc.frequency.setValueAtTime(430, now + 0.12);
    osc.frequency.setValueAtTime(540, now + 0.24);

    gain.gain.setValueAtTime(0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch {}
}

/**
 * High-power RCS Thruster Burn rumble
 */
export function playBurn(duration = 1.4) {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;
    
    // Sub-bass rumble oscillator
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(58, now);
    osc.frequency.linearRampToValueAtTime(78, now + duration * 0.4);
    osc.frequency.linearRampToValueAtTime(36, now + duration);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.12);
    gain.gain.setValueAtTime(0.12, now + duration - 0.25);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start(now);
    osc.stop(now + duration);
  } catch {}
}

/**
 * Uplink FSK modem handshake sound
 */
export function playUplink() {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;
    const freqs = [1200, 1800, 2400, 1500, 2100];
    freqs.forEach((freq, idx) => {
      const t = now + idx * 0.04;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t);
      osc.stop(t + 0.045);
    });
  } catch {}
}

/**
 * Deep Space Ambient Binaural Hum
 * Simulates the hypnotic low-frequency spacecraft interior resonance
 */
export function startSpaceHum() {
  if (!soundEnabled || isAmbientPlaying) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const now = ctx.currentTime;

    // Filter to keep hum velvety and non-intrusive
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(160, now);
    filter.Q.setValueAtTime(2.5, now);

    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0.001, now);
    humGain.gain.linearRampToValueAtTime(0.04, now + 2.0); // smooth fade in

    // Binaural detuned carriers (52Hz & 55Hz)
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(52, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(55.2, now);

    // Subtle celestial overtone
    const osc3 = ctx.createOscillator();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(104, now);
    const overtoneGain = ctx.createGain();
    overtoneGain.gain.setValueAtTime(0.015, now);

    osc1.connect(filter);
    osc2.connect(filter);
    osc3.connect(overtoneGain);
    overtoneGain.connect(filter);

    filter.connect(humGain);
    humGain.connect(masterGain);

    osc1.start(now);
    osc2.start(now);
    osc3.start(now);

    ambientDrone = {
      oscillators: [osc1, osc2, osc3],
      gain: humGain,
      filter
    };
    isAmbientPlaying = true;
  } catch {}
}

export function stopSpaceHum() {
  if (!ambientDrone || !isAmbientPlaying) return;
  const ctx = initAudio();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    ambientDrone.gain.gain.setValueAtTime(ambientDrone.gain.gain.value, now);
    ambientDrone.gain.gain.linearRampToValueAtTime(0.0001, now + 1.0); // smooth fade out

    setTimeout(() => {
      if (ambientDrone) {
        ambientDrone.oscillators.forEach(osc => {
          try { osc.stop(); } catch {}
        });
        ambientDrone = null;
      }
      isAmbientPlaying = false;
    }, 1100);
  } catch {
    ambientDrone = null;
    isAmbientPlaying = false;
  }
}

export function toggleSpaceHum() {
  if (isAmbientPlaying) {
    stopSpaceHum();
    return false;
  } else {
    startSpaceHum();
    return true;
  }
}

export function isSpaceHumPlaying() {
  return isAmbientPlaying;
}

/**
 * Tactical Speech Synthesizer for Aerospace Announcements
 */
export function speakTactical(text) {
  if (!soundEnabled || typeof window === 'undefined') return;
  if (!('speechSynthesis' in window)) return;

  try {
    // Play radio comm chirp first
    playBeep();

    setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      utterance.volume = masterVolume;

      // Find an English robotic/clear voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => 
        (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('David') || v.name.includes('Zira') || v.name.includes('Alex')) &&
        v.lang.startsWith('en')
      );
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
    }, 120);
  } catch {}
}

/**
 * Terminal keystroke sound
 */
export function playKeypress() {
  if (!soundEnabled) return;
  const ctx = initAudio();
  if (!ctx || !masterGain) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    const randomFreq = 1800 + Math.random() * 600;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(randomFreq, ctx.currentTime);

    gain.gain.setValueAtTime(0.015, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.018);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch {}
}
