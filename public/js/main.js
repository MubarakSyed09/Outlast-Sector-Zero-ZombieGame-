/* ==========================================================================
   MAIN GAME CONTROLLER & THREE.JS GRAPHICS PIPELINE
   ========================================================================== */

// Global State
window.gameState = {
  isRunning: false,
  isModalOpen: false,
  isPointerLocked: false,
  currentSector: 1,
  kills: 0,
  startTime: 0,
  survivalTime: 0
};

window.obstacles = [];
window.zombiesList = [];

// Scene & Renderer
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
window.scene = scene;
scene.background = new THREE.Color(0x060c16);
// Clearer, softer fog so zombies and obstacles are visibly distinct
scene.fog = new THREE.FogExp2(0x070e1a, 0.0095);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 160);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

// --- BRIGHTENED ATMOSPHERIC LIGHTING ---
// Significantly brighter ambient light with cool midnight tint
const ambientLight = new THREE.AmbientLight(0x22354f, 1.15);
scene.add(ambientLight);

// Powerful Moonlight casting dynamic soft shadows
const moonLight = new THREE.DirectionalLight(0x82a9db, 1.4);
moonLight.position.set(50, 75, -40);
moonLight.castShadow = true;
moonLight.shadow.mapSize.width = 2048;
moonLight.shadow.mapSize.height = 2048;
moonLight.shadow.camera.near = 10;
moonLight.shadow.camera.far = 180;
const shadowD = 75;
moonLight.shadow.camera.left = -shadowD;
moonLight.shadow.camera.right = shadowD;
moonLight.shadow.camera.top = shadowD;
moonLight.shadow.camera.bottom = -shadowD;
moonLight.shadow.bias = -0.0005;
scene.add(moonLight);

// Ground Plane
const asphaltMat = new THREE.MeshStandardMaterial({
  map: generateAsphaltTexture(),
  roughness: 0.75,
  metalness: 0.15
});
const groundGeo = new THREE.PlaneGeometry(260, 260);
const groundMesh = new THREE.Mesh(groundGeo, asphaltMat);
groundMesh.rotation.x = -Math.PI / 2;
groundMesh.receiveShadow = true;
scene.add(groundMesh);

// Streetlights & Obstacles
const crateMat = new THREE.MeshStandardMaterial({ map: generateCrateTexture(), roughness: 0.7 });
const concreteMat = new THREE.MeshStandardMaterial({ map: generateConcreteTexture(), roughness: 0.8 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });

function spawnEnvironment() {
  for (let i = 0; i < 38; i++) {
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    if (Math.hypot(x, z) < 14) continue;

    const type = Math.floor(Math.random() * 3);
    if (type === 0) {
      const crateGeo = new THREE.BoxGeometry(2.4, 2.4, 2.4);
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.set(x, 1.2, z);
      crate.castShadow = true;
      crate.receiveShadow = true;
      scene.add(crate);
      window.obstacles.push({ x, z, radius: 1.8 });

      if (Math.random() > 0.4) {
        const topCrate = new THREE.Mesh(crateGeo, crateMat);
        topCrate.position.set(x + (Math.random() - 0.5) * 0.4, 3.6, z + (Math.random() - 0.5) * 0.4);
        topCrate.rotation.y = Math.random() * 0.5;
        topCrate.castShadow = true;
        topCrate.receiveShadow = true;
        scene.add(topCrate);
      }
    } else if (type === 1) {
      const barGeo = new THREE.BoxGeometry(4.2, 1.4, 1.2);
      const bar = new THREE.Mesh(barGeo, concreteMat);
      bar.position.set(x, 0.7, z);
      bar.rotation.y = Math.random() * Math.PI;
      bar.castShadow = true;
      bar.receiveShadow = true;
      scene.add(bar);
      window.obstacles.push({ x, z, radius: 2.2 });
    } else {
      for (let b = 0; b < 3; b++) {
        const bx = x + (b - 1) * 1.1;
        const bz = z + (Math.random() - 0.5) * 0.9;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 1.5, 14), metalMat);
        barrel.position.set(bx, 0.75, bz);
        barrel.castShadow = true;
        barrel.receiveShadow = true;
        scene.add(barrel);
      }
      window.obstacles.push({ x, z, radius: 1.7 });
    }
  }

  // Streetlights
  for (let s = 0; s < 6; s++) {
    const sx = (s % 2 === 0 ? 1 : -1) * (30 + Math.random() * 40);
    const sz = (s < 3 ? 1 : -1) * (30 + Math.random() * 40);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 7, 8), metalMat);
    pole.position.set(sx, 3.5, sz);
    pole.castShadow = true;
    scene.add(pole);

    const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.6), metalMat);
    head.position.set(sx + 0.5, 7, sz);
    scene.add(head);

    const streetLight = new THREE.PointLight(0xffb74d, 2.2, 26, 1.4);
    streetLight.position.set(sx + 0.5, 6.8, sz);
    streetLight.castShadow = true;
    scene.add(streetLight);

    window.obstacles.push({ x: sx, z: sz, radius: 0.8 });
  }
}
spawnEnvironment();

// --- PLAYER SETUP & PROCEDURAL HUMANOID ---
function createProceduralHumanoid() {
  const root = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd8b598, roughness: 0.65 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const vestMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.55 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x111317, roughness: 0.5 });

  const pelvis = new THREE.Group();
  pelvis.position.y = 0.95;
  root.add(pelvis);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), clothMat);
  torso.position.y = 0.35;
  torso.castShadow = true;
  pelvis.add(torso);

  const vest = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.36), vestMat);
  vest.position.y = 0.38;
  vest.castShadow = true;
  pelvis.add(vest);

  const headGroup = new THREE.Group();
  headGroup.position.y = 0.8;
  pelvis.add(headGroup);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.32), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.18, 0.36), vestMat);
  helmet.position.y = 0.16;
  headGroup.add(helmet);

  const createLeg = (offsetX) => {
    const hip = new THREE.Group();
    hip.position.set(offsetX, 0, 0);
    pelvis.add(hip);

    const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.22), clothMat);
    thigh.position.y = -0.22;
    thigh.castShadow = true;
    hip.add(thigh);

    const knee = new THREE.Group();
    knee.position.y = -0.45;
    hip.add(knee);

    const shin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.2), clothMat);
    shin.position.y = -0.2;
    shin.castShadow = true;
    knee.add(shin);

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.3), bootMat);
    boot.position.set(0, -0.44, 0.05);
    boot.castShadow = true;
    knee.add(boot);

    return { hip, knee };
  };

  const leftLeg = createLeg(-0.16);
  const rightLeg = createLeg(0.16);

  const createArm = (offsetX) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(offsetX, 0.6, 0);
    pelvis.add(shoulder);

    const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), clothMat);
    upperArm.position.y = -0.18;
    upperArm.castShadow = true;
    shoulder.add(upperArm);

    const elbow = new THREE.Group();
    elbow.position.y = -0.36;
    shoulder.add(elbow);

    const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 0.14), skinMat);
    forearm.position.y = -0.16;
    forearm.castShadow = true;
    elbow.add(forearm);

    return { shoulder, elbow };
  };

  const leftArm = createArm(-0.35);
  const rightArm = createArm(0.35);

  return { root, pelvis, headGroup, leftLeg, rightLeg, leftArm, rightArm };
}

const player = {
  position: new THREE.Vector3(0, 0, 0),
  velocity: new THREE.Vector3(),
  yaw: 0,
  pitch: 0,
  speed: 5.2,
  sprintSpeedMultiplier: 1.85,
  health: 100,
  maxHealth: 100,
  invulnerableTimer: 0,
  stamina: 100,
  maxStamina: 100,
  staminaDrain: 22,
  staminaRecover: 18,
  isExhausted: false,
  isSprinting: false,
  isMoving: false,
  footstepTimer: 0,
  // Ability Perks
  stunPulseUnlocked: false,
  stunCooldown: 0,
  maxStunCooldown: 14,
  mesh: null,
  procedural: null,
  mixer: null,
  actions: {},
  currentAction: null
};

player.procedural = createProceduralHumanoid();
player.mesh = player.procedural.root;
scene.add(player.mesh);

// Load GLTF Model with automatic fallback
let loadedSoldierGLTF = null;
window.loadedSoldierGLTF = null;
if (typeof THREE.GLTFLoader !== 'undefined') {
  try {
    const gltfLoader = new THREE.GLTFLoader();
    gltfLoader.load(
      'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/Soldier.glb',
      (gltf) => {
        window.loadedSoldierGLTF = gltf;
        initPlayerModelGLTF(gltf);
        window.zombiesList.forEach(z => z.attachGLTF(gltf));
      },
      undefined,
      (err) => {
        console.warn("CDN GLTF unavailable; procedural models active.", err);
      }
    );
  } catch (e) {}
}

function initPlayerModelGLTF(gltf) {
  if (!player.mesh) return;
  scene.remove(player.mesh);

  const model = (typeof THREE.SkeletonUtils !== 'undefined')
    ? THREE.SkeletonUtils.clone(gltf.scene)
    : gltf.scene.clone(true);

  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  player.mesh = model;
  player.procedural = null;
  scene.add(player.mesh);

  player.mixer = new THREE.AnimationMixer(model);
  gltf.animations.forEach((clip) => {
    player.actions[clip.name] = player.mixer.clipAction(clip);
  });

  if (player.actions['Idle']) {
    player.currentAction = player.actions['Idle'];
    player.currentAction.play();
  }
}

// --- WIDE-BEAM FLASHLIGHT & LIGHTING ---
const flashlight = new THREE.SpotLight(0xfff5e0, 6.0, 52, Math.PI / 5.2, 0.45, 1.3);
flashlight.castShadow = true;
flashlight.shadow.mapSize.width = 1024;
flashlight.shadow.mapSize.height = 1024;
flashlight.shadow.bias = -0.0008;
scene.add(flashlight);
scene.add(flashlight.target);

// Wide Volumetric Cone
const coneGeo = new THREE.ConeGeometry(5.2, 34, 16, 1, true);
coneGeo.translate(0, -17, 0);
coneGeo.rotateX(Math.PI / 2);
const coneMat = new THREE.MeshBasicMaterial({
  color: 0xfff0cc,
  transparent: true,
  opacity: 0.05,
  side: THREE.DoubleSide,
  depthWrite: false,
  blending: THREE.AdditiveBlending
});
const flashlightCone = new THREE.Mesh(coneGeo, coneMat);
scene.add(flashlightCone);

// Player Surround Fill Light (illuminates obstacles nearby)
const flashlightFill = new THREE.PointLight(0xffeedd, 1.2, 12, 1.5);
scene.add(flashlightFill);
let flashlightEnabled = true;

// --- WEAPONS MANAGER ---
const weaponManager = new WeaponManager(scene, camera);
window.weaponManager = weaponManager;
weaponManager.spawnInitialPickups();

// --- EXTRACTION SAFE ZONE ---
const safeZone = {
  position: new THREE.Vector3(),
  radius: 4.5,
  group: new THREE.Group(),
  flareLight: null,
  beaconMesh: null
};

function initSafeZone() {
  const decal = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 9),
    new THREE.MeshBasicMaterial({ map: generateSafeZoneDecal(), transparent: true, opacity: 0.9, depthWrite: false })
  );
  decal.rotation.x = -Math.PI / 2;
  decal.position.y = 0.04;
  safeZone.group.add(decal);

  const beaconGeo = new THREE.CylinderGeometry(4.2, 4.2, 32, 24, 1, true);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  safeZone.beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
  safeZone.beaconMesh.position.y = 16;
  safeZone.group.add(safeZone.beaconMesh);

  safeZone.flareLight = new THREE.PointLight(0x22c55e, 4.2, 28, 1.4);
  safeZone.flareLight.position.y = 1.8;
  safeZone.flareLight.castShadow = true;
  safeZone.group.add(safeZone.flareLight);

  scene.add(safeZone.group);
  relocateSafeZone();
}

function relocateSafeZone() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 60 + Math.random() * 25;
  const sx = Math.max(-100, Math.min(100, player.position.x + Math.sin(angle) * dist));
  const sz = Math.max(-100, Math.min(100, player.position.z + Math.cos(angle) * dist));
  safeZone.position.set(sx, 0, sz);
  safeZone.group.position.copy(safeZone.position);
}

// --- ZOMBIE SPAWN & WAVE LOGIC ---
function spawnHorde(count, wave) {
  window.zombiesList.forEach(z => z.destroy());
  window.zombiesList.length = 0;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const dist = 35 + Math.random() * 32;
    const x = player.position.x + Math.sin(angle) * dist;
    const z = player.position.z + Math.cos(angle) * dist;

    const zombie = new Zombie(x, z, wave);
    window.zombiesList.push(zombie);
  }
  document.getElementById('hud-zombies').innerText = `${window.zombiesList.length} ACTIVE`;
}

// --- RADAR / MINIMAP DRAWING ---
const radarCanvas = document.getElementById('radar-canvas');
const radarCtx = radarCanvas.getContext('2d');

function updateRadar() {
  radarCtx.clearRect(0, 0, 110, 110);
  const cx = 55, cy = 55, range = 55;

  // Radar grid circles
  radarCtx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
  radarCtx.lineWidth = 1;
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 25, 0, Math.PI * 2);
  radarCtx.arc(cx, cy, 48, 0, Math.PI * 2);
  radarCtx.stroke();

  // Radar crosshair
  radarCtx.beginPath();
  radarCtx.moveTo(cx, 5); radarCtx.lineTo(cx, 105);
  radarCtx.moveTo(5, cy); radarCtx.lineTo(105, cy);
  radarCtx.stroke();

  // Safe Zone green blip
  const relSZx = safeZone.position.x - player.position.x;
  const relSZz = safeZone.position.z - player.position.z;
  const szRadarDist = Math.hypot(relSZx, relSZz);
  const szAngle = Math.atan2(relSZx, relSZz) - player.yaw;
  const szR = Math.min(48, (szRadarDist / 80) * 48);
  const szBx = cx + Math.sin(szAngle) * szR;
  const szBy = cy - Math.cos(szAngle) * szR;

  radarCtx.fillStyle = '#22c55e';
  radarCtx.shadowColor = '#4ade80';
  radarCtx.shadowBlur = 8;
  radarCtx.beginPath();
  radarCtx.arc(szBx, szBy, 4, 0, Math.PI * 2);
  radarCtx.fill();
  radarCtx.shadowBlur = 0;

  // Zombie red blips
  for (const z of window.zombiesList) {
    if (z.isDead) continue;
    const rzx = z.position.x - player.position.x;
    const rzz = z.position.z - player.position.z;
    const dist = Math.hypot(rzx, rzz);
    if (dist > 50) continue;

    const zAngle = Math.atan2(rzx, rzz) - player.yaw;
    const zR = (dist / 50) * 46;
    const zBx = cx + Math.sin(zAngle) * zR;
    const zBy = cy - Math.cos(zAngle) * zR;

    radarCtx.fillStyle = '#ef4444';
    radarCtx.beginPath();
    radarCtx.arc(zBx, zBy, 2.5, 0, Math.PI * 2);
    radarCtx.fill();
  }

  // Center player indicator (white dot + facing cone)
  radarCtx.fillStyle = '#ffffff';
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, 3, 0, Math.PI * 2);
  radarCtx.fill();

  radarCtx.strokeStyle = '#38bdf8';
  radarCtx.beginPath();
  radarCtx.moveTo(cx, cy);
  radarCtx.lineTo(cx, cy - 10);
  radarCtx.stroke();
}

// --- CONTROLS & POINTER LOCK ---
const keys = {};
let pointerControls = null;

if (typeof THREE.PointerLockControls !== 'undefined') {
  pointerControls = new THREE.PointerLockControls(camera, document.body);
  pointerControls.addEventListener('lock', () => { gameState.isPointerLocked = true; });
  pointerControls.addEventListener('unlock', () => { gameState.isPointerLocked = false; });
}

document.addEventListener('pointerlockchange', () => {
  gameState.isPointerLocked = (document.pointerLockElement === document.body);
});

function requestLock() {
  if (pointerControls) pointerControls.lock();
  else document.body.requestPointerLock();
}

function exitLock() {
  if (pointerControls && pointerControls.isLocked) pointerControls.unlock();
  else if (document.exitPointerLock) document.exitPointerLock();
}

window.addEventListener('keydown', (e) => {
  keys[e.code] = true;

  if (!gameState.isRunning || gameState.isModalOpen) return;

  if (e.code === 'KeyF') {
    flashlightEnabled = !flashlightEnabled;
    flashlight.visible = flashlightEnabled;
    flashlightCone.visible = flashlightEnabled;
    flashlightFill.visible = flashlightEnabled;
    soundEngine.playFlashlightClick();
  }

  if (e.code === 'KeyR') {
    weaponManager.startReload();
  }

  if (e.code === 'Digit1') {
    weaponManager.switchWeapon('pistol');
  }

  if (e.code === 'Digit2') {
    weaponManager.switchWeapon('shotgun');
  }

  if (e.code === 'Space' || e.code === 'KeyE') {
    triggerStunPulse();
  }
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

window.addEventListener('mousedown', (e) => {
  if (!gameState.isRunning || gameState.isModalOpen) return;
  if (!gameState.isPointerLocked) {
    requestLock();
    return;
  }

  if (e.button === 0) {
    // Left Click: Fire active weapon
    weaponManager.fire(
      player.position,
      player.yaw - weaponManager.recoilYaw,
      player.pitch + weaponManager.recoilPitch,
      window.zombiesList
    );
  }
});

window.addEventListener('wheel', (e) => {
  if (!gameState.isRunning || gameState.isModalOpen) return;
  if (e.deltaY > 0) {
    weaponManager.switchWeapon('shotgun');
  } else if (e.deltaY < 0) {
    weaponManager.switchWeapon('pistol');
  }
});

window.addEventListener('mousemove', (e) => {
  if (!gameState.isPointerLocked || !gameState.isRunning || gameState.isModalOpen) return;

  const sensitivity = 0.0022;
  player.yaw -= e.movementX * sensitivity;
  player.pitch -= e.movementY * sensitivity;

  const maxPitch = 0.85;
  const minPitch = -0.75;
  player.pitch = Math.max(minPitch, Math.min(maxPitch, player.pitch));
});

function triggerStunPulse() {
  if (!player.stunPulseUnlocked || player.stunCooldown > 0) return;

  player.stunCooldown = player.maxStunCooldown;
  soundEngine.playStunPulse();

  const flash = document.getElementById('damage-flash');
  flash.style.background = 'radial-gradient(circle at center, rgba(168, 85, 247, 0.5), rgba(56, 189, 248, 0.8))';
  flash.style.opacity = '0.9';
  setTimeout(() => {
    flash.style.opacity = '0';
    flash.style.background = 'radial-gradient(circle at center, rgba(239, 68, 68, 0.25), rgba(185, 28, 28, 0.85))';
  }, 350);

  let count = 0;
  for (const z of window.zombiesList) {
    if (!z.isDead && z.position.distanceTo(player.position) < 20) {
      z.stunnedTimer = 4.0;
      count++;
    }
  }
  showNotificationBanner(`UV PULSE DISCHARGED: ${count} THREATS STUNNED`);
}

function showNotificationBanner(text) {
  const b = document.getElementById('notif-banner');
  b.innerText = text;
  b.classList.add('show');
  setTimeout(() => b.classList.remove('show'), 2600);
}

// --- PERK & EXTRACTION LOOP ---
const PERK_POOL = [
  {
    icon: '⚡',
    name: 'Adrenaline Rush',
    desc: '+25% Sprint Speed and -30% Sprint Stamina Drain.',
    apply: () => {
      player.sprintSpeedMultiplier *= 1.25;
      player.staminaDrain *= 0.7;
    }
  },
  {
    icon: '🫁',
    name: 'Bio-Conditioning',
    desc: '+70% Faster Stamina Regeneration and instantaneous recovery.',
    apply: () => {
      player.staminaRecover *= 1.7;
    }
  },
  {
    icon: '💥',
    name: 'UV Stun Flash',
    desc: 'Unlocks [SPACE / E] UV Stun Pulse: Freezes all horde members in 20m radius for 4.0s.',
    apply: () => {
      player.stunPulseUnlocked = true;
    }
  },
  {
    icon: '🛡️',
    name: 'Tactical Plating',
    desc: 'Max Health increased to 150 HP and instant full heal.',
    apply: () => {
      player.maxHealth = 150;
      player.health = 150;
    }
  },
  {
    icon: '📦',
    name: 'Bandolier Supply',
    desc: '+48 Pistol Ammo and +18 Shotgun Shells immediately added to reserves.',
    apply: () => {
      weaponManager.weapons.pistol.reserveAmmo += 48;
      weaponManager.weapons.shotgun.reserveAmmo += 18;
      weaponManager.updateHUD();
    }
  }
];

function openPerkModal() {
  gameState.isModalOpen = true;
  exitLock();
  soundEngine.playSiren();

  // Stun and clear nearby threats
  for (const z of window.zombiesList) {
    if (!z.isDead && z.position.distanceTo(player.position) < 28) {
      z.stunnedTimer = 5.0;
      const push = new THREE.Vector3().subVectors(z.position, player.position).normalize();
      z.position.addScaledVector(push, 16);
      z.mesh.position.copy(z.position);
    }
  }

  const shuffled = [...PERK_POOL].sort(() => 0.5 - Math.random()).slice(0, 3);
  const container = document.getElementById('perk-cards');
  container.innerHTML = '';

  shuffled.forEach(p => {
    const card = document.createElement('div');
    card.className = 'perk-card';
    card.innerHTML = `
      <div class="perk-icon">${p.icon}</div>
      <div class="perk-name">${p.name}</div>
      <div class="perk-desc">${p.desc}</div>
      <div class="perk-select-btn">REQUISITION</div>
    `;
    card.onclick = () => {
      p.apply();
      soundEngine.playPerkSelect();
      closePerkModal();
    };
    container.appendChild(card);
  });

  document.getElementById('perk-modal').classList.remove('hidden');
}

function closePerkModal() {
  document.getElementById('perk-modal').classList.add('hidden');
  gameState.isModalOpen = false;

  gameState.currentSector++;
  document.getElementById('hud-sector').innerText = `SECTOR ${gameState.currentSector}`;

  relocateSafeZone();
  const hordeCount = 10 + (gameState.currentSector - 1) * 3;
  spawnHorde(hordeCount, gameState.currentSector);

  showNotificationBanner(`SECTOR ${gameState.currentSector} SECURED — HOSTILES ESCALATING`);
  requestLock();
}

// --- GAME OVER & BACKEND LEADERBOARD INTEGRATION ---
async function triggerGameOver() {
  if (!gameState.isRunning) return;
  gameState.isRunning = false;
  exitLock();
  soundEngine.playDeath();

  const flash = document.getElementById('damage-flash');
  flash.style.opacity = '1';

  gameState.survivalTime = Math.round((Date.now() - gameState.startTime) / 1000);
  document.getElementById('death-stats').innerText = 
    `You survived ${gameState.survivalTime}s in Sector ${gameState.currentSector} with ${gameState.kills} confirmed kills.`;

  // Submit score to backend
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Operative',
        wave: gameState.currentSector,
        kills: gameState.kills,
        survivalTime: gameState.survivalTime
      })
    });
    const data = await res.json();
    renderLeaderboard(data.leaderboard);
  } catch (e) {
    // Fallback in-memory leaderboard if offline
    renderLeaderboard([
      { name: 'Operative (You)', wave: gameState.currentSector, kills: gameState.kills, survivalTime: gameState.survivalTime },
      { name: 'Ghost-Actual', wave: 8, kills: 74, survivalTime: 395 },
      { name: 'Sgt. Vance', wave: 6, kills: 51, survivalTime: 288 }
    ]);
  }

  document.getElementById('gameover-screen').classList.remove('hidden');
}

function renderLeaderboard(scores) {
  const container = document.getElementById('leaderboard-content');
  if (!container) return;

  let html = `
    <div class="leaderboard-box">
      <div class="leaderboard-title">TOP SECTOR OPERATIVES</div>
      <table class="leaderboard-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Operative</th>
            <th>Sector</th>
            <th>Kills</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
  `;

  scores.slice(0, 5).forEach((s, idx) => {
    html += `
      <tr>
        <td>#${idx + 1}</td>
        <td>${s.name}</td>
        <td>Sector ${s.wave}</td>
        <td>${s.kills}</td>
        <td>${s.survivalTime}s</td>
      </tr>
    `;
  });

  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function restartGame() {
  document.getElementById('gameover-screen').classList.add('hidden');
  const flash = document.getElementById('damage-flash');
  flash.style.opacity = '0';

  gameState.currentSector = 1;
  gameState.kills = 0;
  gameState.startTime = Date.now();
  document.getElementById('hud-sector').innerText = `SECTOR 1`;

  player.position.set(0, 0, 0);
  player.health = 100;
  player.maxHealth = 100;
  player.stamina = 100;
  player.isExhausted = false;
  player.stunCooldown = 0;
  player.stunPulseUnlocked = false;

  weaponManager.weapons.pistol.currentMag = 12;
  weaponManager.weapons.pistol.reserveAmmo = 48;
  weaponManager.weapons.shotgun.currentMag = 6;
  weaponManager.weapons.shotgun.reserveAmmo = 24;
  weaponManager.currentWeapon = weaponManager.weapons.pistol;
  weaponManager.updateHUD();

  relocateSafeZone();
  spawnHorde(10, 1);

  gameState.isRunning = true;
  requestLock();
}

// --- UI BUTTONS ---
document.getElementById('start-btn').addEventListener('click', () => {
  soundEngine.init();
  document.getElementById('start-screen').classList.add('hidden');
  initSafeZone();
  spawnHorde(10, 1);
  gameState.isRunning = true;
  gameState.startTime = Date.now();
  requestLock();
});

document.getElementById('retry-btn').addEventListener('click', () => {
  restartGame();
});

container.addEventListener('click', () => {
  if (gameState.isRunning && !gameState.isModalOpen && !gameState.isPointerLocked) {
    requestLock();
  }
});

// Quick Weapon Select Buttons on HUD
document.querySelectorAll('.slot-badge').forEach(badge => {
  badge.addEventListener('click', (e) => {
    e.stopPropagation();
    const w = badge.dataset.weapon;
    if (w) weaponManager.switchWeapon(w);
  });
});

// --- MAIN GAME LOOP ---
const clock = new THREE.Clock();
let heartbeatTimer = 0;

function updateGameLoop() {
  requestAnimationFrame(updateGameLoop);

  const delta = Math.min(clock.getDelta(), 0.1);

  if (!gameState.isRunning) {
    renderer.render(scene, camera);
    return;
  }

  // --- PLAYER MOVEMENT & STAMINA ---
  const moveVec = new THREE.Vector3();
  if (keys['KeyW'] || keys['ArrowUp']) moveVec.z += 1;
  if (keys['KeyS'] || keys['ArrowDown']) moveVec.z -= 1;
  if (keys['KeyA'] || keys['ArrowLeft']) moveVec.x -= 1;
  if (keys['KeyD'] || keys['ArrowRight']) moveVec.x += 1;

  player.isMoving = moveVec.lengthSq() > 0.01;
  const wantsSprint = (keys['ShiftLeft'] || keys['ShiftRight']) && player.isMoving && !player.isExhausted;

  if (wantsSprint && player.stamina > 0) {
    player.isSprinting = true;
    player.stamina = Math.max(0, player.stamina - player.staminaDrain * delta);
    if (player.stamina === 0) player.isExhausted = true;
  } else {
    player.isSprinting = false;
    const rec = player.isMoving ? player.staminaRecover * 0.7 : player.staminaRecover;
    player.stamina = Math.min(player.maxStamina, player.stamina + rec * delta);
    if (player.stamina > 25) player.isExhausted = false;
  }

  // Update Vitals HUD
  const hpPct = Math.max(0, (player.health / player.maxHealth) * 100);
  const hpFill = document.getElementById('health-bar-fill');
  hpFill.style.width = `${hpPct}%`;
  document.getElementById('health-text').innerText = `${Math.round(player.health)} / ${player.maxHealth}`;
  hpFill.classList.toggle('critical', hpPct <= 30);

  const stPct = (player.stamina / player.maxStamina) * 100;
  const stFill = document.getElementById('stamina-bar-fill');
  stFill.style.width = `${stPct}%`;
  document.getElementById('stamina-text').innerText = `${Math.round(stPct)}%`;
  stFill.classList.toggle('exhausted', player.isExhausted);

  if (player.invulnerableTimer > 0) player.invulnerableTimer -= delta;

  // Stun cooldown
  if (player.stunCooldown > 0) player.stunCooldown -= delta;

  // Movement physics
  const currentSpeed = player.speed * (player.isSprinting ? player.sprintSpeedMultiplier : 1.0);
  if (player.isMoving) {
    moveVec.normalize();
    const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
    const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, moveVec.z)
      .addScaledVector(right, moveVec.x)
      .normalize();

    const pX = player.position.x + moveDir.x * currentSpeed * delta;
    const pZ = player.position.z + moveDir.z * currentSpeed * delta;

    let col = false;
    for (const obs of window.obstacles) {
      if (Math.hypot(pX - obs.x, pZ - obs.z) < obs.radius + 0.5) {
        col = true;
        break;
      }
    }

    if (!col) {
      player.position.x = Math.max(-115, Math.min(115, pX));
      player.position.z = Math.max(-115, Math.min(115, pZ));
    }

    player.mesh.rotation.y = player.yaw;

    player.footstepTimer -= delta;
    if (player.footstepTimer <= 0) {
      player.footstepTimer = player.isSprinting ? 0.32 : 0.52;
      soundEngine.playFootstep(player.isSprinting);
    }

    if (player.mixer) {
      const anim = player.isSprinting ? 'Run' : 'Walk';
      if (player.actions[anim] && player.currentAction !== player.actions[anim]) {
        player.actions[anim].reset().fadeIn(0.2).play();
        if (player.currentAction) player.currentAction.fadeOut(0.2);
        player.currentAction = player.actions[anim];
      }
    }
  } else {
    player.mesh.rotation.y = player.yaw;
    if (player.mixer && player.actions['Idle'] && player.currentAction !== player.actions['Idle']) {
      player.actions['Idle'].reset().fadeIn(0.2).play();
      if (player.currentAction) player.currentAction.fadeOut(0.2);
      player.currentAction = player.actions['Idle'];
    }
  }

  player.mesh.position.copy(player.position);

  // Procedural fallback animation
  if (player.procedural) {
    if (player.isMoving) {
      const freq = player.isSprinting ? 16 : 9;
      const ph = Date.now() * 0.001 * freq;
      player.procedural.leftLeg.hip.rotation.x = Math.sin(ph) * 0.65;
      player.procedural.rightLeg.hip.rotation.x = -Math.sin(ph) * 0.65;
      player.procedural.leftArm.shoulder.rotation.x = -Math.sin(ph) * 0.65;
      player.procedural.rightArm.shoulder.rotation.x = -0.4 + Math.sin(ph) * 0.2;
      player.procedural.pelvis.position.y = 0.95 + Math.abs(Math.sin(ph)) * 0.06;
    } else {
      player.procedural.leftLeg.hip.rotation.x = 0;
      player.procedural.rightLeg.hip.rotation.x = 0;
      player.procedural.leftArm.shoulder.rotation.x = 0;
      player.procedural.rightArm.shoulder.rotation.x = -0.3;
      player.procedural.pelvis.position.y = 0.95 + Math.sin(Date.now() * 0.002) * 0.03;
    }
  }

  if (player.mixer) player.mixer.update(delta);

  // --- THIRD-PERSON CAMERA WITH ANTI-CLIPPING ---
  const camDist = 3.2;
  const shoulderX = 0.65;
  const shoulderY = 1.85;

  const cosY = Math.cos(player.yaw - weaponManager.recoilYaw);
  const sinY = Math.sin(player.yaw - weaponManager.recoilYaw);
  const effectivePitch = player.pitch + weaponManager.recoilPitch;
  const cosP = Math.cos(effectivePitch);
  const sinP = Math.sin(effectivePitch);

  const tX = player.position.x + sinY * camDist * cosP + cosY * shoulderX;
  const tY = player.position.y + shoulderY + sinP * camDist;
  const tZ = player.position.z + cosY * camDist * cosP - sinY * shoulderX;

  const targetCamPos = new THREE.Vector3(tX, tY, tZ);

  // Obstacle Clearance
  const camHead = new THREE.Vector3(player.position.x, player.position.y + 1.6, player.position.z);
  const camToTgt = new THREE.Vector3().subVectors(targetCamPos, camHead);
  const fullDist = camToTgt.length();
  camToTgt.normalize();

  let safeDist = fullDist;
  for (const obs of window.obstacles) {
    const toObs = new THREE.Vector3(obs.x - camHead.x, 0, obs.z - camHead.z);
    const proj = toObs.dot(new THREE.Vector3(camToTgt.x, 0, camToTgt.z).normalize());
    if (proj > 0 && proj < fullDist) {
      const perpSq = toObs.lengthSq() - proj * proj;
      const clr = obs.radius + 0.35;
      if (perpSq < clr * clr) {
        safeDist = Math.min(safeDist, Math.max(1.1, proj - clr));
      }
    }
  }
  targetCamPos.copy(camHead).addScaledVector(camToTgt, safeDist);

  camera.position.lerp(targetCamPos, 0.22);

  const lookTarget = new THREE.Vector3(
    player.position.x + cosY * shoulderX * 0.5 - sinY * 20 * cosP,
    player.position.y + 1.6 - sinP * 20,
    player.position.z - sinY * shoulderX * 0.5 - cosY * 20 * cosP
  );
  camera.lookAt(lookTarget);

  // --- FLASHLIGHT POSITIONING ---
  if (flashlightEnabled) {
    const torchPos = new THREE.Vector3(
      player.position.x + cosY * 0.35 - sinY * 0.2,
      player.position.y + 1.25,
      player.position.z - sinY * 0.35 - cosY * 0.2
    );
    flashlight.position.copy(torchPos);
    flashlightFill.position.copy(torchPos);

    const aimDir = new THREE.Vector3(-sinY * cosP, -sinP, -cosY * cosP).normalize();
    flashlight.target.position.copy(torchPos).addScaledVector(aimDir, 28);
    flashlight.target.updateMatrixWorld();

    flashlightCone.position.copy(torchPos);
    flashlightCone.lookAt(flashlight.target.position);
  }

  // --- WEAPONS & PICKUPS UPDATE ---
  weaponManager.update(delta);
  weaponManager.checkPickups(player, delta);

  // --- ZOMBIES UPDATE & ATTACK DAMAGE ---
  let nearestDist = 999;
  for (const z of window.zombiesList) {
    z.update(delta, player.position, camera);

    if (!z.isDead) {
      const dist = z.position.distanceTo(player.position);
      if (dist < nearestDist) nearestDist = dist;

      // Zombie Melee Attack
      if (dist < 1.35 && z.stunnedTimer <= 0 && z.staggerTimer <= 0) {
        if (player.invulnerableTimer <= 0) {
          player.health -= 22; // takes multiple hits to die
          player.invulnerableTimer = 0.9;
          soundEngine.playZombieHit();

          const flash = document.getElementById('damage-flash');
          flash.style.opacity = '0.85';
          setTimeout(() => { flash.style.opacity = '0'; }, 150);

          if (player.health <= 0) {
            triggerGameOver();
            return;
          }
        }
      }
    }
  }

  // Proximity Heartbeat & Vignette
  if (nearestDist < 8.0 || player.health < 30) {
    heartbeatTimer -= delta;
    if (heartbeatTimer <= 0) {
      heartbeatTimer = nearestDist < 5.0 ? 0.45 : 0.75;
      soundEngine.playHeartbeat();
    }
  }

  // --- EXTRACTION SAFE ZONE & RADAR ---
  const distToSZ = player.position.distanceTo(safeZone.position);
  document.getElementById('objective-dist').innerText = `${Math.round(distToSZ)}m`;

  const toSZ = new THREE.Vector3().subVectors(safeZone.position, player.position);
  const angleToSZ = Math.atan2(toSZ.x, toSZ.z);
  let relAngle = angleToSZ - player.yaw;
  document.getElementById('compass-arrow').style.transform = `rotate(${-relAngle}rad)`;

  safeZone.beaconMesh.rotation.y += delta * 0.7;
  safeZone.flareLight.intensity = 3.6 + Math.sin(Date.now() * 0.006) * 1.2;

  if (distToSZ < safeZone.radius && !gameState.isModalOpen) {
    openPerkModal();
  }

  // Radar Update
  updateRadar();

  renderer.render(scene, camera);
}

// Window Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start loop
requestAnimationFrame(updateGameLoop);
