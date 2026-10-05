// Orbital Telemetry Simulation Engine & Live Space APIs Integration

export const GROUND_STATIONS = [
  { id: 'goldstone', name: 'Goldstone DSN (USA)', lat: 35.4267, lon: -116.8900, elevation: 1030 },
  { id: 'madrid', name: 'Madrid DSN (Spain)', lat: 40.4314, lon: -4.2480, elevation: 834 },
  { id: 'canberra', name: 'Canberra DSN (Australia)', lat: -35.4014, lon: 148.9817, elevation: 650 },
  { id: 'svalbard', name: 'Svalbard SG-1 (Norway)', lat: 78.2300, lon: 15.3900, elevation: 498 },
  { id: 'houston', name: 'Houston WSC (USA)', lat: 29.5600, lon: -95.0900, elevation: 15 },
  { id: 'tokyo', name: 'Tokyo Usuda (Japan)', lat: 36.1300, lon: 138.3600, elevation: 1450 }
];

// Initial baseline telemetry state
export function createInitialTelemetry() {
  return {
    mode: 'ORBITAL-1', // 'ORBITAL-1' or 'ISS-LIVE'
    isOnline: true,
    lastUpdated: Date.now(),
    metSeconds: 432850, // Mission Elapsed Time (~5 days)
    timeMultiplier: 1,
    isPaused: false,

    // Real space weather data from NOAA
    spaceWeather: {
      kpIndex: 1.67,
      stormLevel: 'G0 (Quiet)',
      solarWindSpeed: 485, // km/s
      source: 'NOAA SWPC Live',
      lastFetched: null
    },

    // Orbital parameters
    orbit: {
      altitude: 418.4, // km
      velocity: 7.665, // km/s (27,594 km/h)
      latitude: 22.45, // deg
      longitude: -45.12, // deg
      inclination: 51.64, // deg
      period: 92.8, // minutes
      trueAnomaly: 142.5, // deg
      isEclipse: false, // in Earth's shadow
      sunlightFraction: 1.0,
      subsolarLat: 4.2,
      subsolarLon: -32.5,
      activeGroundStation: 'Goldstone DSN (USA)',
      groundStationDistance: 1240, // km
      losCountdown: 412 // seconds until loss of signal
    },

    // EPS (Power)
    eps: {
      status: 'NOMINAL',
      solarGeneration: 2240, // Watts
      solarArrayDeployed: true,
      solarArrayAngle: 34.2, // degrees
      autoTrackSun: true,
      batterySoC: 94.6, // percentage
      busVoltage: 28.42, // Volts
      busCurrent: 44.8, // Amperes
      powerLoad: 1280, // Watts consumed
      cellTemp: 19.4, // °C
      loadShedding: false
    },

    // ADCS (Attitude Determination & Control)
    adcs: {
      status: 'NOMINAL',
      mode: 'NADIR_POINTING', // NADIR_POINTING, SUN_POINTING, GROUND_TRACK, DETUMBLE
      roll: 0.12, // deg
      pitch: -0.45, // deg
      yaw: 1.84, // deg
      rollRate: 0.002, // deg/s
      pitchRate: -0.001,
      yawRate: 0.004,
      reactionWheels: [2140, -1890, 1420, -890], // RPM for RW1-4
      starTrackersLocked: 2, // 2 of 2
      magnetorquersActive: true,
      sunSensorVisible: true
    },

    // TCS (Thermal)
    tcs: {
      status: 'NOMINAL',
      busTemp: 22.4, // °C
      batteryTemp: 18.2,
      solarArrayTemp: 64.5, // hot in sun, down to -60 in eclipse
      payloadOpticsTemp: -38.5,
      thrusterNozzleTemp: 14.8,
      louversState: 'AUTO (65% OPEN)',
      heatersActive: false
    },

    // TT&C (Comms)
    ttc: {
      status: 'NOMINAL',
      uplinkFrequency: '2085.4 MHz (S-Band)',
      downlinkFrequency: '8450.2 MHz (X-Band)',
      uplinkLock: true,
      downlinkRate: 150.0, // Mbps
      snr: 21.8, // dB
      ber: '1.2e-9',
      carrierLock: true,
      totalBytesDownlinked: 4892.4 // MB
    },

    // Propulsion
    propulsion: {
      status: 'NOMINAL',
      tankPressure: 284, // psi
      fuelRemaining: 46.2, // kg
      fuelPercent: 92.4,
      deltaVReserve: 178.5, // m/s
      isBurning: false,
      burnType: null,
      burnRemainingSeconds: 0
    },

    // Payload
    payload: {
      status: 'STANDBY',
      cameraCryoLock: true,
      detectorTemp: -40.0,
      storageUsedGB: 38.6,
      storageTotalGB: 128.0,
      capturesCount: 14,
      isCapturing: false,
      lastImage: {
        timestamp: new Date().toISOString(),
        target: 'Pacific Convergence Zone (Lat: 18.2°N, Lon: 154.6°W)',
        spectralBand: 'RGB + SWIR (850nm)',
        resolution: '0.45 m/GSD'
      }
    },

    // Active anomalies list
    anomalies: []
  };
}

/**
 * Fetch live ISS telemetry from wheretheiss.at
 */
export async function fetchLiveISSTelemetry() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544', {
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return {
      success: true,
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude, // km
      velocity: data.velocity / 3600, // convert km/h to km/s
      velocityKmh: data.velocity,
      visibility: data.visibility, // 'daylight' or 'eclipsed'
      solarLat: data.solar_lat,
      solarLon: data.solar_lon,
      footprint: data.footprint,
      timestamp: data.timestamp
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch live NOAA SWPC Space Weather data
 */
export async function fetchLiveSpaceWeather() {
  try {
    const [kpRes, windRes] = await Promise.allSettled([
      fetch('https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json', { cache: 'no-cache' }),
      fetch('https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json', { cache: 'no-cache' })
    ]);

    let kp = 1.67;
    let stormLevel = 'G0 (Quiet)';
    let windSpeed = 480;

    if (kpRes.status === 'fulfilled' && kpRes.value.ok) {
      const kpData = await kpRes.value.json();
      if (Array.isArray(kpData) && kpData.length > 0) {
        // Last recorded Kp index entry
        const latest = kpData[kpData.length - 1];
        if (latest && typeof latest.Kp === 'number') {
          kp = latest.Kp;
          if (kp >= 9) stormLevel = 'G5 (Extreme)';
          else if (kp >= 8) stormLevel = 'G4 (Severe)';
          else if (kp >= 7) stormLevel = 'G3 (Strong)';
          else if (kp >= 6) stormLevel = 'G2 (Moderate)';
          else if (kp >= 5) stormLevel = 'G1 (Minor)';
          else stormLevel = 'G0 (Quiet)';
        }
      }
    }

    if (windRes.status === 'fulfilled' && windRes.value.ok) {
      const windData = await windRes.value.json();
      if (Array.isArray(windData) && windData.length > 0 && windData[0].proton_speed) {
        windSpeed = Math.round(windData[0].proton_speed);
      }
    }

    return {
      success: true,
      kpIndex: kp,
      stormLevel,
      solarWindSpeed: windSpeed,
      source: 'NOAA SWPC Live Stream',
      lastFetched: Date.now()
    };
  } catch (err) {
    return {
      success: false,
      kpIndex: 1.8,
      stormLevel: 'G0 (Quiet)',
      solarWindSpeed: 460,
      source: 'NOAA Simulated Fallback',
      lastFetched: Date.now()
    };
  }
}

/**
 * Update telemetry state by one simulation step (dt seconds)
 */
export function stepTelemetry(current, dt = 1.0) {
  if (current.isPaused) return current;

  const multiplier = current.timeMultiplier || 1;
  const effectiveDt = dt * multiplier;

  const next = JSON.parse(JSON.stringify(current));
  next.lastUpdated = Date.now();
  next.metSeconds += effectiveDt;

  // 1. Orbital dynamics propagation
  const orbitalSpeedDegPerSec = 360 / (next.orbit.period * 60);
  next.orbit.trueAnomaly = (next.orbit.trueAnomaly + orbitalSpeedDegPerSec * effectiveDt) % 360;

  // Sub-satellite latitude/longitude computation (Keplerian ground track)
  const trueAnomalyRad = (next.orbit.trueAnomaly * Math.PI) / 180;
  const incRad = (next.orbit.inclination * Math.PI) / 180;

  // Approximate spherical ground track
  const lat = Math.asin(Math.sin(incRad) * Math.sin(trueAnomalyRad)) * (180 / Math.PI);
  // Earth rotates eastward at 360 deg / 86400 s (~0.00416 deg/s)
  const earthRotationRate = 360 / 86400;
  const orbitLongitudeProgression = (next.orbit.longitude + (orbitalSpeedDegPerSec * Math.cos(incRad) - earthRotationRate) * effectiveDt);
  let lon = ((orbitLongitudeProgression + 180) % 360) - 180;
  if (lon < -180) lon += 360;

  // Small altitude perturbation (eccentricity variation)
  const ecc = 0.0008;
  const nominalAlt = 418.0;
  const alt = nominalAlt + nominalAlt * ecc * Math.cos(trueAnomalyRad);
  const vel = 7.665 - 0.005 * Math.cos(trueAnomalyRad);

  next.orbit.latitude = Number(lat.toFixed(4));
  next.orbit.longitude = Number(lon.toFixed(4));
  next.orbit.altitude = Number(alt.toFixed(2));
  next.orbit.velocity = Number(vel.toFixed(3));

  // Eclipse calculation: true anomaly between 150° and 210° is in Earth's shadow
  const inEclipse = next.orbit.trueAnomaly > 145 && next.orbit.trueAnomaly < 215;
  next.orbit.isEclipse = inEclipse;
  next.orbit.sunlightFraction = inEclipse ? 0.0 : 1.0;

  // Closest ground station computation
  let closestStation = GROUND_STATIONS[0];
  let minDistance = 999999;
  for (const station of GROUND_STATIONS) {
    const dLat = (station.lat - lat) * (Math.PI / 180);
    const dLon = (station.lon - lon) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat * (Math.PI / 180)) * Math.cos(station.lat * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = 6371 * c; // Earth surface distance in km
    if (dist < minDistance) {
      minDistance = dist;
      closestStation = station;
    }
  }

  next.orbit.activeGroundStation = closestStation.name;
  next.orbit.groundStationDistance = Math.round(minDistance);
  
  // Downlink SNR is strong if within 2500km line of sight
  const inRange = minDistance < 2600;
  if (inRange) {
    const snrMax = 25.0;
    const factor = Math.max(0, 1 - (minDistance / 2600));
    next.ttc.snr = Number((14.0 + factor * 11.0 + (Math.random() * 0.4 - 0.2)).toFixed(1));
    next.ttc.carrierLock = true;
    next.ttc.downlinkRate = Number((80 + factor * 70).toFixed(1));
    next.ttc.totalBytesDownlinked = Number((next.ttc.totalBytesDownlinked + (next.ttc.downlinkRate / 8) * (effectiveDt * 0.05)).toFixed(1));
  } else {
    next.ttc.snr = 0.0;
    next.ttc.carrierLock = false;
    next.ttc.downlinkRate = 0.0;
  }

  // Next LOS/AOS countdown
  if (next.orbit.losCountdown > 1) {
    next.orbit.losCountdown = Math.max(1, Math.round(next.orbit.losCountdown - effectiveDt));
  } else {
    next.orbit.losCountdown = inRange ? 600 : 450;
  }

  // 2. EPS Power Dynamics
  if (inEclipse || !next.eps.solarArrayDeployed) {
    next.eps.solarGeneration = 0;
    // Battery discharging
    const dischargeRate = (next.eps.powerLoad / 3200) * 0.015 * effectiveDt;
    next.eps.batterySoC = Math.max(68.0, Number((next.eps.batterySoC - dischargeRate).toFixed(2)));
    next.eps.busVoltage = Number((28.0 + (next.eps.batterySoC / 100) * 0.8).toFixed(2));
  } else {
    // Sunlit: Solar generation active
    const maxGen = 2380;
    next.eps.solarGeneration = Math.round(maxGen * (0.95 + Math.random() * 0.05));
    // Battery charging up to 100%
    const chargeRate = 0.025 * effectiveDt;
    next.eps.batterySoC = Math.min(100.0, Number((next.eps.batterySoC + chargeRate).toFixed(2)));
    next.eps.busVoltage = Number((28.6 + Math.random() * 0.2).toFixed(2));
  }

  // Check battery anomaly
  const hasLowBatteryAnomaly = next.anomalies.includes('EPS_LOW_BATTERY');
  if (hasLowBatteryAnomaly) {
    next.eps.batterySoC = 44.2;
    next.eps.status = 'CRITICAL';
  } else if (next.eps.batterySoC < 75) {
    next.eps.status = 'WARNING';
  } else {
    next.eps.status = 'NOMINAL';
  }

  // 3. Thermal Dynamics
  if (inEclipse) {
    // Array cools rapidly in shadow
    next.tcs.solarArrayTemp = Math.max(-65.0, Number((next.tcs.solarArrayTemp - 0.4 * effectiveDt).toFixed(1)));
    next.tcs.busTemp = Math.max(18.5, Number((next.tcs.busTemp - 0.02 * effectiveDt).toFixed(1)));
  } else {
    // Array warms in sunlight
    next.tcs.solarArrayTemp = Math.min(84.0, Number((next.tcs.solarArrayTemp + 0.5 * effectiveDt).toFixed(1)));
    next.tcs.busTemp = Math.min(24.2, Number((next.tcs.busTemp + 0.02 * effectiveDt).toFixed(1)));
  }

  // 4. ADCS Attitude slight micro-jitter
  next.adcs.roll = Number((next.adcs.roll + (Math.random() - 0.5) * 0.02).toFixed(3));
  next.adcs.pitch = Number((next.adcs.pitch + (Math.random() - 0.5) * 0.02).toFixed(3));
  next.adcs.yaw = Number((next.adcs.yaw + (Math.random() - 0.5) * 0.02).toFixed(3));

  // 5. Thruster active burn countdown
  if (next.propulsion.isBurning && next.propulsion.burnRemainingSeconds > 0) {
    next.propulsion.burnRemainingSeconds = Math.max(0, next.propulsion.burnRemainingSeconds - effectiveDt);
    next.propulsion.fuelRemaining = Math.max(0, Number((next.propulsion.fuelRemaining - 0.12 * effectiveDt).toFixed(2)));
    next.propulsion.fuelPercent = Number(((next.propulsion.fuelRemaining / 50.0) * 100).toFixed(1));
    next.orbit.altitude = Number((next.orbit.altitude + 0.08 * effectiveDt).toFixed(2));
    next.orbit.velocity = Number((next.orbit.velocity + 0.002 * effectiveDt).toFixed(3));
    
    if (next.propulsion.burnRemainingSeconds <= 0) {
      next.propulsion.isBurning = false;
      next.propulsion.burnType = null;
    }
  }

  return next;
}
