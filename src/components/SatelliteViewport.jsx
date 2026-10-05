import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  Eye, 
  Compass, 
  Maximize2, 
  RotateCw, 
  Flame, 
  Radio, 
  Sun, 
  Layers, 
  Globe as GlobeIcon, 
  Crosshair,
  Sliders,
  Sparkles as SparklesIcon
} from 'lucide-react';
import { GROUND_STATIONS } from '../services/telemetryEngine';
import { playClick, playBurn } from '../services/soundEffects';
import CenterAudioHub from './CenterAudioHub';
import Sparkles from './Sparkles';

export default function SatelliteViewport({ 
  telemetry, 
  onFireBurn, 
  onToggleSolarArray, 
  onDetumble,
  heightClass = 'min-h-[500px]',
  showSoundHub = true,
  showOverlayTop = true
}) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const satelliteGroupRef = useRef(null);
  const solarLeftWingRef = useRef(null);
  const solarRightWingRef = useRef(null);
  const thrusterPlumesRef = useRef([]);
  const groundLaserRef = useRef(null);
  const nadirBeamRef = useRef(null);
  const nadirMarkerRef = useRef(null);
  const groundStationMeshesRef = useRef([]);
  const cloudsMeshRef = useRef(null);
  const earthMeshRef = useRef(null);

  // View mode: 'GLOBAL', 'CHASE', 'NADIR', 'SUN'
  const [viewMode, setViewMode] = useState('GLOBAL');
  const [showOrbit, setShowOrbit] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);
  const [showStations, setShowStations] = useState(true);
  const [showAtmosphere, setShowAtmosphere] = useState(true);

  // Mouse interaction state
  const isDraggingRef = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });
  const cameraSphericalRef = useRef({ radius: 32, theta: 0.6, phi: 1.1 });
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0, 0));

  // Initialize Three.js scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || mount.offsetWidth || 1000;
    const height = mount.clientHeight || mount.offsetHeight || 620;

    // Scene & Renderer
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    cameraRef.current = camera;

    // 1. Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 2800;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 250 + Math.random() * 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      // Star color variation: white, cyan tint, amber tint
      const colRand = Math.random();
      if (colRand > 0.8) {
        starColors[i * 3] = 0.5; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 1.0; // blue-cyan
      } else if (colRand > 0.65) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.85; starColors[i * 3 + 2] = 0.6; // amber
      } else {
        starColors[i * 3] = 0.9; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 1.0; // bright white
      }
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));

    const starMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 2. Procedural Earth Texture
    const earthCanvas = document.createElement('canvas');
    earthCanvas.width = 2048;
    earthCanvas.height = 1024;
    const ctx = earthCanvas.getContext('2d');

    // Deep ocean base
    const oceanGrad = ctx.createLinearGradient(0, 0, 0, 1024);
    oceanGrad.addColorStop(0, '#020d26');
    oceanGrad.addColorStop(0.5, '#04163d');
    oceanGrad.addColorStop(1, '#020d26');
    ctx.fillStyle = oceanGrad;
    ctx.fillRect(0, 0, 2048, 1024);

    // Draw stylized continents and land masses
    ctx.fillStyle = '#113328'; // Land dark green
    ctx.strokeStyle = '#22c55e'; // Coastlines glow
    ctx.lineWidth = 1;

    // Stylized land shapes (Eurasia, Africa, Americas, Australia, Antarctica)
    const drawLand = (coords) => {
      ctx.beginPath();
      coords.forEach(([x, y], idx) => {
        const px = (x / 360 + 0.5) * 2048;
        const py = (-y / 180 + 0.5) * 1024;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    };

    // North America
    drawLand([[-165, 65], [-140, 70], [-100, 72], [-60, 55], [-75, 25], [-100, 20], [-120, 35], [-160, 55]]);
    // South America
    drawLand([[-80, 10], [-40, -5], [-35, -20], [-65, -55], [-75, -45], [-80, -5]]);
    // Europe & Africa
    drawLand([[-10, 35], [25, 40], [35, 70], [60, 65], [40, 30], [50, 12], [40, -35], [18, -34], [10, 5], [-15, 12]]);
    // Asia
    drawLand([[40, 30], [60, 65], [130, 72], [170, 65], [140, 35], [120, 20], [100, 5], [75, 15], [55, 25]]);
    // Australia
    drawLand([[115, -15], [150, -15], [150, -38], [115, -35]]);
    // Antarctica
    drawLand([[-180, -75], [180, -75], [180, -90], [-180, -90]]);

    // City lights on land
    ctx.fillStyle = 'rgba(255, 220, 120, 0.75)';
    for (let i = 0; i < 600; i++) {
      const rx = Math.random() * 2048;
      const ry = 200 + Math.random() * 600;
      ctx.beginPath();
      ctx.arc(rx, ry, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const earthTexture = new THREE.CanvasTexture(earthCanvas);

    // Earth Sphere
    const earthRadius = 10;
    const earthGeometry = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMaterial = new THREE.MeshPhongMaterial({
      map: earthTexture,
      shininess: 25,
      specular: new THREE.Color(0x1a4066),
      bumpScale: 0.05
    });
    const earthMesh = new THREE.Mesh(earthGeometry, earthMaterial);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // Atmospheric Cloud Layer
    const cloudsCanvas = document.createElement('canvas');
    cloudsCanvas.width = 1024;
    cloudsCanvas.height = 512;
    const cloudCtx = cloudsCanvas.getContext('2d');
    cloudCtx.fillStyle = 'rgba(255, 255, 255, 0)';
    cloudCtx.fillRect(0, 0, 1024, 512);

    cloudCtx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    for (let i = 0; i < 180; i++) {
      const cx = Math.random() * 1024;
      const cy = 100 + Math.random() * 312;
      const cr = 20 + Math.random() * 45;
      cloudCtx.beginPath();
      cloudCtx.arc(cx, cy, cr, 0, Math.PI * 2);
      cloudCtx.fill();
    }
    const cloudsTexture = new THREE.CanvasTexture(cloudsCanvas);
    const cloudsGeometry = new THREE.SphereGeometry(earthRadius * 1.015, 48, 48);
    const cloudsMaterial = new THREE.MeshLambertMaterial({
      map: cloudsTexture,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending
    });
    const cloudsMesh = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    scene.add(cloudsMesh);
    cloudsMeshRef.current = cloudsMesh;

    // Atmosphere Rayleigh Glow Rim (Outer sphere with inverted back-side glow)
    const atmosphereGeometry = new THREE.SphereGeometry(earthRadius * 1.12, 48, 48);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.68 - dot(vNormal, vec3(0, 0, 1.0)), 2.2);
          gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 1.4;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    scene.add(atmosphereMesh);

    // 3. Ground Stations on Earth
    const groundStationGroup = new THREE.Group();
    GROUND_STATIONS.forEach((station) => {
      const latRad = (station.lat * Math.PI) / 180;
      const lonRad = (station.lon * Math.PI) / 180;

      const x = earthRadius * Math.cos(latRad) * Math.cos(lonRad);
      const y = earthRadius * Math.sin(latRad);
      const z = -earthRadius * Math.cos(latRad) * Math.sin(lonRad);

      const markerGeo = new THREE.CylinderGeometry(0.08, 0.25, 0.5, 8);
      const markerMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      const markerMesh = new THREE.Mesh(markerGeo, markerMat);
      markerMesh.position.set(x, y, z);
      markerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z).normalize());

      // Pulse ring around ground station
      const ringGeo = new THREE.RingGeometry(0.3, 0.45, 16);
      const ringMat = new THREE.MeshBasicMaterial({ 
        color: 0x10b981, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.7 
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.set(x * 1.002, y * 1.002, z * 1.002);
      ringMesh.quaternion.copy(markerMesh.quaternion);
      ringMesh.rotateX(Math.PI / 2);

      groundStationGroup.add(markerMesh);
      groundStationGroup.add(ringMesh);

      groundStationMeshesRef.current.push({
        id: station.id,
        name: station.name,
        position: new THREE.Vector3(x, y, z),
        ring: ringMesh
      });
    });
    scene.add(groundStationGroup);

    // 4. Detailed 3D Satellite Model
    const satelliteGroup = new THREE.Group();
    satelliteGroupRef.current = satelliteGroup;

    // Central Main Bus (Gold foil hex prism)
    const busGeo = new THREE.CylinderGeometry(0.4, 0.45, 0.9, 8);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Gold Kapton foil
      metalness: 0.85,
      roughness: 0.25
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    satelliteGroup.add(busMesh);

    // Silver Equipment bays and avionics deck
    const avionicsGeo = new THREE.BoxGeometry(0.7, 0.35, 0.7);
    const avionicsMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.6,
      roughness: 0.4
    });
    const avionicsMesh = new THREE.Mesh(avionicsGeo, avionicsMat);
    satelliteGroup.add(avionicsMesh);

    // High Gain Dish Antenna
    const dishGeo = new THREE.SphereGeometry(0.35, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.7,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.x = Math.PI;
    dishMesh.position.set(0, -0.65, 0);
    satelliteGroup.add(dishMesh);

    // Optical Earth Sensor / Payload Lens
    const lensGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.25, 16);
    const lensMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    const lensMesh = new THREE.Mesh(lensGeo, lensMat);
    lensMesh.position.set(0, -0.55, 0.3);
    satelliteGroup.add(lensMesh);

    // Articulated Solar Arrays (Left & Right Wings)
    const createSolarWing = (isLeft) => {
      const wingGroup = new THREE.Group();
      
      // Truss boom
      const boomGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 8);
      const boomMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.9 });
      const boom = new THREE.Mesh(boomGeo, boomMat);
      boom.rotation.z = Math.PI / 2;
      boom.position.x = isLeft ? -0.3 : 0.3;
      wingGroup.add(boom);

      // Solar Panel Cells (Blue PV cells with golden framing)
      const panelGeo = new THREE.BoxGeometry(1.6, 0.04, 0.65);
      const panelMat = new THREE.MeshStandardMaterial({
        color: 0x1d4ed8, // Deep cobalt solar cells
        metalness: 0.5,
        roughness: 0.2
      });
      const panel = new THREE.Mesh(panelGeo, panelMat);
      panel.position.x = isLeft ? -1.4 : 1.4;
      wingGroup.add(panel);

      return wingGroup;
    };

    const leftWing = createSolarWing(true);
    const rightWing = createSolarWing(false);
    satelliteGroup.add(leftWing);
    satelliteGroup.add(rightWing);
    solarLeftWingRef.current = leftWing;
    solarRightWingRef.current = rightWing;

    // Thruster Nozzles & Animated Exhaust Plumes
    const plumes = [];
    const thrusterPositions = [
      { pos: [0.35, 0, 0.35], dir: [1, 0, 1] },
      { pos: [-0.35, 0, 0.35], dir: [-1, 0, 1] },
      { pos: [0.35, 0, -0.35], dir: [1, 0, -1] },
      { pos: [-0.35, 0, -0.35], dir: [-1, 0, -1] }
    ];

    thrusterPositions.forEach(({ pos, dir }) => {
      // Cone plume
      const plumeGeo = new THREE.ConeGeometry(0.15, 0.6, 8);
      const plumeMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        transparent: true,
        opacity: 0.0
      });
      const plumeMesh = new THREE.Mesh(plumeGeo, plumeMat);
      plumeMesh.position.set(...pos);
      satelliteGroup.add(plumeMesh);
      plumes.push(plumeMesh);
    });
    thrusterPlumesRef.current = plumes;

    // Add satellite to scene
    scene.add(satelliteGroup);

    // 5. Orbit Path Curve
    const orbitRadius = 14.2;
    const orbitPoints = [];
    const orbitSegments = 120;
    const incRad = (51.64 * Math.PI) / 180;

    for (let i = 0; i <= orbitSegments; i++) {
      const u = (i / orbitSegments) * Math.PI * 2;
      const x = orbitRadius * Math.cos(u);
      const y = orbitRadius * Math.sin(u) * Math.sin(incRad);
      const z = orbitRadius * Math.sin(u) * Math.cos(incRad);
      orbitPoints.push(new THREE.Vector3(x, y, z));
    }
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.45
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbitLine);

    // 6. Sub-Satellite Nadir Target Laser & Footprint Marker
    const nadirBeamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const nadirBeamMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.6
    });
    const nadirBeam = new THREE.Line(nadirBeamGeo, nadirBeamMat);
    scene.add(nadirBeam);
    nadirBeamRef.current = nadirBeam;

    // Ground Target Crosshair on Earth
    const nadirMarkerGeo = new THREE.RingGeometry(0.35, 0.48, 24);
    const nadirMarkerMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const nadirMarker = new THREE.Mesh(nadirMarkerGeo, nadirMarkerMat);
    scene.add(nadirMarker);
    nadirMarkerRef.current = nadirMarker;

    // Ground Station Communication Laser Beam
    const groundLaserGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0)
    ]);
    const groundLaserMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85
    });
    const groundLaser = new THREE.Line(groundLaserGeo, groundLaserMat);
    scene.add(groundLaser);
    groundLaserRef.current = groundLaser;

    // 7. Lighting
    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
    sunLight.position.set(60, 20, 40);
    scene.add(sunLight);

    const earthFillLight = new THREE.DirectionalLight(0x00f0ff, 0.4);
    earthFillLight.position.set(-40, -20, -30);
    scene.add(earthFillLight);

    // Handle Resize
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Slow rotation of clouds
      if (cloudsMeshRef.current) {
        cloudsMeshRef.current.rotation.y += delta * 0.015;
      }

      // Ground station pulse animation
      groundStationMeshesRef.current.forEach((st, idx) => {
        const s = 1 + Math.sin(elapsedTime * 3 + idx) * 0.15;
        st.ring.scale.set(s, s, s);
      });

      // Update camera based on viewMode and spherical coordinates
      const cam = cameraRef.current;
      const sat = satelliteGroupRef.current;

      if (cam && sat) {
        if (viewMode === 'CHASE') {
          // Chase camera right behind satellite
          const satPos = sat.position.clone();
          const offset = new THREE.Vector3(0, 1.5, 4.5);
          offset.applyQuaternion(sat.quaternion);
          cam.position.lerp(satPos.clone().add(offset), 0.1);
          cam.lookAt(satPos);
        } else if (viewMode === 'NADIR') {
          // Nadir camera: on satellite looking down at Earth center
          const satPos = sat.position.clone();
          cam.position.lerp(satPos, 0.1);
          cam.lookAt(new THREE.Vector3(0, 0, 0));
        } else {
          // GLOBAL or default spherical orbit camera
          const sph = cameraSphericalRef.current;
          const x = sph.radius * Math.sin(sph.phi) * Math.sin(sph.theta);
          const y = sph.radius * Math.cos(sph.phi);
          const z = sph.radius * Math.sin(sph.phi) * Math.cos(sph.theta);

          cam.position.lerp(new THREE.Vector3(x, y, z), 0.1);
          cam.lookAt(targetLookAtRef.current);
        }
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Update satellite position, attitude, and laser links based on telemetry
  useEffect(() => {
    if (!satelliteGroupRef.current || !telemetry) return;

    const orbitRadius = 14.2;
    const trueAnomalyRad = (telemetry.orbit.trueAnomaly * Math.PI) / 180;
    const incRad = (telemetry.orbit.inclination * Math.PI) / 180;

    // 3D position in orbit
    const satX = orbitRadius * Math.cos(trueAnomalyRad);
    const satY = orbitRadius * Math.sin(trueAnomalyRad) * Math.sin(incRad);
    const satZ = orbitRadius * Math.sin(trueAnomalyRad) * Math.cos(incRad);

    satelliteGroupRef.current.position.set(satX, satY, satZ);

    // Attitude orientation
    const rollRad = (telemetry.adcs.roll * Math.PI) / 180;
    const pitchRad = (telemetry.adcs.pitch * Math.PI) / 180;
    const yawRad = (telemetry.adcs.yaw * Math.PI) / 180;

    satelliteGroupRef.current.rotation.set(pitchRad, yawRad, rollRad);

    // Solar panels deployment and tracking
    if (solarLeftWingRef.current && solarRightWingRef.current) {
      if (telemetry.eps.solarArrayDeployed) {
        solarLeftWingRef.current.scale.set(1, 1, 1);
        solarRightWingRef.current.scale.set(1, 1, 1);
        const sunAngleRad = (telemetry.eps.solarArrayAngle * Math.PI) / 180;
        solarLeftWingRef.current.rotation.x = sunAngleRad;
        solarRightWingRef.current.rotation.x = sunAngleRad;
      } else {
        // Folded against bus
        solarLeftWingRef.current.scale.set(0.2, 1, 0.2);
        solarRightWingRef.current.scale.set(0.2, 1, 0.2);
      }
    }

    // Sub-satellite Nadir point on Earth surface
    const earthRadius = 10;
    const satPos = new THREE.Vector3(satX, satY, satZ);
    const nadirPos = satPos.clone().normalize().multiplyScalar(earthRadius * 1.005);

    if (nadirBeamRef.current) {
      const positions = nadirBeamRef.current.geometry.attributes.position.array;
      positions[0] = satX; positions[1] = satY; positions[2] = satZ;
      positions[3] = nadirPos.x; positions[4] = nadirPos.y; positions[5] = nadirPos.z;
      nadirBeamRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (nadirMarkerRef.current) {
      nadirMarkerRef.current.position.copy(nadirPos);
      nadirMarkerRef.current.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        nadirPos.clone().normalize()
      );
    }

    // Active Ground Station Comms Laser link
    if (groundLaserRef.current) {
      const inCommsRange = telemetry.ttc.snr > 0;
      if (inCommsRange) {
        // Find matching ground station coordinates
        const activeSt = groundStationMeshesRef.current.find(s => telemetry.orbit.activeGroundStation.includes(s.name.split(' ')[0]));
        if (activeSt) {
          const positions = groundLaserRef.current.geometry.attributes.position.array;
          positions[0] = satX; positions[1] = satY; positions[2] = satZ;
          positions[3] = activeSt.position.x; positions[4] = activeSt.position.y; positions[5] = activeSt.position.z;
          groundLaserRef.current.geometry.attributes.position.needsUpdate = true;
          groundLaserRef.current.visible = true;
        } else {
          groundLaserRef.current.visible = false;
        }
      } else {
        groundLaserRef.current.visible = false;
      }
    }

    // Thruster burn animated plumes
    if (thrusterPlumesRef.current.length > 0) {
      const isFiring = telemetry.propulsion.isBurning;
      thrusterPlumesRef.current.forEach((plume) => {
        plume.material.opacity = isFiring ? 0.9 : 0.0;
        if (isFiring) {
          const scale = 0.8 + Math.random() * 0.5;
          plume.scale.set(scale, scale * 1.5, scale);
        }
      });
    }
  }, [telemetry]);

  // Touch pinch-to-zoom support for mobile
  const touchStartDistRef = useRef(null);

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && touchStartDistRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const diff = (touchStartDistRef.current - dist) * 0.05;
      const sph = cameraSphericalRef.current;
      sph.radius = Math.max(16, Math.min(65, sph.radius + diff));
      touchStartDistRef.current = dist;
    }
  };

  const handlePointerDown = (e) => {
    isDraggingRef.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };

    const sph = cameraSphericalRef.current;
    sph.theta -= deltaX * 0.006;
    sph.phi = Math.max(0.1, Math.min(Math.PI - 0.1, sph.phi - deltaY * 0.006));
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
    touchStartDistRef.current = null;
  };

  const handleWheel = (e) => {
    const sph = cameraSphericalRef.current;
    sph.radius = Math.max(16, Math.min(65, sph.radius + e.deltaY * 0.04));
  };

  const handleResetCamera = () => {
    playClick();
    setViewMode('GLOBAL');
    cameraSphericalRef.current = { radius: 32, theta: 0.6, phi: 1.1 };
  };

  return (
    <div className="hud-panel hud-corner rounded-lg overflow-hidden flex flex-col h-full select-none relative group">
      {/* Background Smooth Blue Atmospheric Aura */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,240,255,0.12)_0%,rgba(37,99,235,0.06)_40%,transparent_75%)] pointer-events-none animate-pulse-slow"></div>

      {/* Floating Sparkles across Earth viewport */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        <Sparkles count={12} color="#00f0ff" className="w-full h-full" overflow={true} />
      </div>

      {/* Viewport Top Bar */}
      {showOverlayTop && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-cyan)] bg-[rgba(6,12,26,0.92)] text-xs z-10 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 font-mono text-[var(--color-cyan)] font-semibold uppercase tracking-wider">
              <GlobeIcon className="w-4 h-4 text-[var(--color-cyan)] animate-spin-slow" />
              <span className="hidden sm:inline">ORBITAL TWIN 3D //</span>
              <span>{telemetry.mode}</span>
            </div>
            <span className={`badge-status ${telemetry.orbit.isEclipse ? 'badge-warning' : 'badge-nominal'}`}>
              {telemetry.orbit.isEclipse ? 'IN ECLIPSE' : 'SUNLIT'}
            </span>
          </div>

          {/* View Mode Presets */}
          <div className="flex items-center gap-1">
            {[
              { id: 'GLOBAL', label: 'GLOBAL', icon: Eye },
              { id: 'CHASE', label: 'CHASE', icon: Crosshair },
              { id: 'NADIR', label: 'NADIR', icon: Compass }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  playClick();
                  setViewMode(id);
                }}
                className={`px-2 py-1 text-[11px] font-mono rounded flex items-center gap-1 transition-all ${
                  viewMode === id
                    ? 'bg-[var(--color-cyan)] text-[#030712] font-bold shadow-[0_0_12px_rgba(0,240,255,0.5)]'
                    : 'bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)] hover:text-white hover:bg-[rgba(255,255,255,0.1)]'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            ))}
            <button
              onClick={handleResetCamera}
              title="Reset View Angle"
              className="p-1 text-[var(--text-secondary)] hover:text-[var(--color-cyan)] ml-1"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main 3D Canvas Area */}
      <div 
        ref={mountRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handlePointerUp}
        onWheel={handleWheel}
        style={{ touchAction: 'none', minHeight: '520px', height: '100%' }}
        className="viewport-canvas relative cursor-grab active:cursor-grabbing bg-[#01040a] overflow-hidden"
      >
        {/* HUD Sub-Satellite Coordinates Card (Top-Left) */}
        <div className="absolute top-3 left-3 bg-[rgba(5,12,28,0.85)] border border-[rgba(0,240,255,0.3)] p-2 rounded font-mono text-[10px] pointer-events-none backdrop-blur-md z-10 space-y-0.5">
          <div className="text-[var(--color-cyan)] font-semibold flex items-center gap-1 border-b border-[rgba(0,240,255,0.2)] pb-0.5">
            <Crosshair className="w-3 h-3 text-[var(--color-cyan)]" />
            <span>SUB-SATELLITE NADIR</span>
          </div>
          <div className="grid grid-cols-2 gap-x-2 text-[var(--text-secondary)] pt-0.5">
            <div>LAT: <span className="text-white font-medium">{telemetry.orbit.latitude > 0 ? `${telemetry.orbit.latitude}° N` : `${Math.abs(telemetry.orbit.latitude)}° S`}</span></div>
            <div>LON: <span className="text-white font-medium">{telemetry.orbit.longitude > 0 ? `${telemetry.orbit.longitude}° E` : `${Math.abs(telemetry.orbit.longitude)}° W`}</span></div>
            <div>ALT: <span className="text-[var(--color-cyan)] font-medium">{telemetry.orbit.altitude} km</span></div>
            <div>VEL: <span className="text-[var(--color-emerald)] font-medium">{telemetry.orbit.velocity} km/s</span></div>
          </div>
        </div>

        {/* HUD Active Ground Station Indicator (Top-Right) */}
        <div className="absolute top-3 right-3 bg-[rgba(5,12,28,0.85)] border border-[rgba(0,240,255,0.3)] p-2 rounded font-mono text-[10px] pointer-events-none backdrop-blur-md z-10">
          <div className="flex items-center gap-1.5 text-[var(--color-emerald)] font-semibold">
            <Radio className="w-3 h-3 animate-pulse" />
            <span>{telemetry.ttc.snr > 0 ? 'CARRIER LOCK' : 'SEARCHING'}</span>
          </div>
          <div className="text-[var(--text-secondary)] text-[9px] mt-0.5">
            STATION: <span className="text-white">{telemetry.orbit.activeGroundStation.split(' ')[0]}</span>
          </div>
          <div className="text-[var(--text-secondary)] text-[9px]">
            SNR: <span className={telemetry.ttc.snr > 0 ? 'text-[var(--color-cyan)]' : 'text-zinc-500'}>{telemetry.ttc.snr} dB</span>
          </div>
        </div>

        {/* CENTER AUDIO & FX COMMAND HUB - COMPLETELY AT THE CENTER OF SCREEN */}
        {showSoundHub && (
          <div className="absolute bottom-16 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 pointer-events-auto w-[94%] sm:w-auto max-w-[560px]">
            <CenterAudioHub telemetry={telemetry} />
          </div>
        )}

        {/* Quick Actuator Actions (Bottom-Left on Desktop, Top on Mobile) */}
        <div className="absolute bottom-3 left-3 hidden lg:flex items-center gap-1.5 bg-[rgba(5,12,28,0.85)] border border-[rgba(0,240,255,0.3)] p-1 rounded backdrop-blur-md z-10 pointer-events-auto">
          <button
            onClick={() => {
              playClick();
              onToggleSolarArray();
            }}
            className={`px-2 py-1 text-[10px] font-mono rounded flex items-center gap-1 transition-all ${
              telemetry.eps.solarArrayDeployed
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25'
                : 'bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25'
            }`}
          >
            <Sun className="w-2.5 h-2.5" />
            <span>{telemetry.eps.solarArrayDeployed ? 'ARRAYS: ON' : 'ARRAYS: OFF'}</span>
          </button>

          <button
            onClick={() => {
              playBurn(1.5);
              onFireBurn(3);
            }}
            disabled={telemetry.propulsion.isBurning}
            className="px-2 py-1 text-[10px] font-mono rounded flex items-center gap-1 bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25 disabled:opacity-50"
          >
            <Flame className="w-2.5 h-2.5 text-orange-400" />
            <span>{telemetry.propulsion.isBurning ? 'BURNING...' : 'RCS BURN'}</span>
          </button>

          <button
            onClick={() => {
              playClick();
              onDetumble();
            }}
            className="px-2 py-1 text-[10px] font-mono rounded flex items-center gap-1 bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500/25"
          >
            <RotateCw className="w-2.5 h-2.5" />
            <span>DETUMBLE</span>
          </button>
        </div>
      </div>
    </div>
  );
}
