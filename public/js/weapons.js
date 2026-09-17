/* ==========================================================================
   WEAPONS & COMBAT SYSTEM - PISTOL, SHOTGUN, RECOIL, TRACERS, & PICKUPS
   ========================================================================== */

class WeaponManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    this.weapons = {
      pistol: {
        id: 'pistol',
        name: 'Tactical 9mm',
        icon: '🔫',
        slot: 1,
        magSize: 12,
        currentMag: 12,
        reserveAmmo: 48,
        damage: 38,
        pellets: 1,
        spread: 0.015,
        fireRate: 0.22, // seconds between shots
        reloadTime: 1.2,
        isAutomatic: false
      },
      shotgun: {
        id: 'shotgun',
        name: '12G Combat Pump',
        icon: '💥',
        slot: 2,
        magSize: 6,
        currentMag: 6,
        reserveAmmo: 24,
        damage: 20, // 8 pellets * 20 = 160 max damage point-blank
        pellets: 8,
        spread: 0.065,
        fireRate: 0.75,
        reloadTime: 2.2,
        isAutomatic: false
      }
    };

    this.currentWeapon = this.weapons.pistol;
    this.fireTimer = 0;
    this.isReloading = false;
    this.reloadTimer = 0;

    // Recoil state
    this.recoilPitch = 0;
    this.recoilYaw = 0;

    // Visual effects containers
    this.tracers = [];
    this.impactParticles = [];
    this.pickups = [];

    // Muzzle flash light & sprite
    this.muzzleLight = new THREE.PointLight(0xffaa33, 0, 8);
    this.scene.add(this.muzzleLight);

    this.initMuzzleFlashMesh();
    this.updateHUD();
  }

  initMuzzleFlashMesh() {
    const geo = new THREE.PlaneGeometry(0.35, 0.35);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffe066,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.muzzleMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.muzzleMesh);
  }

  switchWeapon(type) {
    if (this.isReloading) return;
    if (this.weapons[type] && this.currentWeapon.id !== type) {
      this.currentWeapon = this.weapons[type];
      window.soundEngine.playReload();
      this.updateHUD();
      this.showTip(`SWITCHED TO ${this.currentWeapon.name}`);
    }
  }

  startReload() {
    if (this.isReloading) return;
    const w = this.currentWeapon;
    if (w.currentMag >= w.magSize) {
      this.showTip("MAGAZINE FULL");
      return;
    }
    if (w.reserveAmmo <= 0) {
      this.showTip("NO RESERVE AMMO");
      return;
    }

    this.isReloading = true;
    this.reloadTimer = w.reloadTime;
    window.soundEngine.playReload();
    this.updateHUD();
  }

  fire(playerPos, playerYaw, playerPitch, zombiesList) {
    if (this.isReloading) return;
    if (this.fireTimer > 0) return;

    const w = this.currentWeapon;

    if (w.currentMag <= 0) {
      this.startReload();
      return;
    }

    // Deduct ammo & set fire rate timer
    w.currentMag--;
    this.fireTimer = w.fireRate;

    // Recoil Kick
    const kickPitch = w.id === 'shotgun' ? 0.06 : 0.025;
    this.recoilPitch = kickPitch;
    this.recoilYaw = (Math.random() - 0.5) * (kickPitch * 0.5);

    // Audio
    if (w.id === 'shotgun') {
      window.soundEngine.playShotgunShot();
    } else {
      window.soundEngine.playPistolShot();
    }

    // Muzzle Flash Position (Right shoulder / hand level)
    const cosY = Math.cos(playerYaw);
    const sinY = Math.sin(playerYaw);
    const muzzlePos = new THREE.Vector3(
      playerPos.x + cosY * 0.42 - sinY * 0.4,
      playerPos.y + 1.25,
      playerPos.z - sinY * 0.42 - cosY * 0.4
    );

    this.triggerMuzzleFlash(muzzlePos);

    // Camera Look Vector
    const aimDir = new THREE.Vector3(
      -Math.sin(playerYaw) * Math.cos(playerPitch),
      -Math.sin(playerPitch),
      -Math.cos(playerYaw) * Math.cos(playerPitch)
    ).normalize();

    // Raycast for each pellet
    let connectedHits = 0;

    for (let p = 0; p < w.pellets; p++) {
      const spreadX = (Math.random() - 0.5) * w.spread;
      const spreadY = (Math.random() - 0.5) * w.spread;
      const pelletDir = aimDir.clone()
        .add(new THREE.Vector3(spreadX, spreadY, spreadX))
        .normalize();

      const rayEnd = this.performRaycast(muzzlePos, pelletDir, w.damage, zombiesList);
      this.spawnTracer(muzzlePos, rayEnd);
    }

    this.updateHUD();

    if (w.currentMag === 0 && w.reserveAmmo > 0) {
      setTimeout(() => this.startReload(), 200);
    }
  }

  performRaycast(origin, direction, damage, zombiesList) {
    const maxRange = 65;
    let closestDist = maxRange;
    let hitZombie = null;
    let isHeadshot = false;

    // Check hit against each active zombie
    for (const z of zombiesList) {
      if (z.isDead) continue;

      // Zombie head sphere approx
      const headPos = new THREE.Vector3(z.position.x, 1.6, z.position.z);
      const toHead = new THREE.Vector3().subVectors(headPos, origin);
      const headProj = toHead.dot(direction);

      if (headProj > 0 && headProj < closestDist) {
        const perpHeadSq = toHead.lengthSq() - headProj * headProj;
        if (perpHeadSq < 0.22 * 0.22) {
          closestDist = headProj;
          hitZombie = z;
          isHeadshot = true;
          continue;
        }
      }

      // Zombie torso/body cylinder/sphere approx
      const bodyPos = new THREE.Vector3(z.position.x, 0.95, z.position.z);
      const toBody = new THREE.Vector3().subVectors(bodyPos, origin);
      const bodyProj = toBody.dot(direction);

      if (bodyProj > 0 && bodyProj < closestDist) {
        const perpBodySq = toBody.lengthSq() - bodyProj * bodyProj;
        if (perpBodySq < 0.45 * 0.45) {
          closestDist = bodyProj;
          hitZombie = z;
          isHeadshot = false;
        }
      }
    }

    // Check hit against obstacles (crates/barriers)
    if (window.obstacles) {
      for (const obs of window.obstacles) {
        const obsPos = new THREE.Vector3(obs.x, 1.0, obs.z);
        const toObs = new THREE.Vector3().subVectors(obsPos, origin);
        const proj = toObs.dot(direction);
        if (proj > 0 && proj < closestDist) {
          const perpSq = toObs.lengthSq() - proj * proj;
          if (perpSq < obs.radius * obs.radius) {
            closestDist = proj;
            hitZombie = null;
          }
        }
      }
    }

    const hitPoint = origin.clone().addScaledVector(direction, closestDist);

    if (hitZombie) {
      const finalDamage = isHeadshot ? damage * 2.0 : damage;
      hitZombie.takeDamage(finalDamage, direction, isHeadshot);
      this.triggerHitMarker(isHeadshot);
      this.spawnBloodParticles(hitPoint);
    } else if (closestDist < maxRange) {
      this.spawnSparks(hitPoint);
    }

    return hitPoint;
  }

  triggerMuzzleFlash(pos) {
    this.muzzleLight.position.copy(pos);
    this.muzzleLight.intensity = 4.5;

    this.muzzleMesh.position.copy(pos);
    this.muzzleMesh.material.opacity = 0.95;
    this.muzzleMesh.rotation.z = Math.random() * Math.PI;

    setTimeout(() => {
      this.muzzleLight.intensity = 0;
      this.muzzleMesh.material.opacity = 0;
    }, 45);
  }

  triggerHitMarker(isHeadshot) {
    window.soundEngine.playHitMarker();
    const hm = document.getElementById('hit-marker');
    hm.classList.add('active');
    if (isHeadshot) {
      hm.style.filter = 'drop-shadow(0 0 8px #ef4444) brightness(1.4)';
    } else {
      hm.style.filter = 'drop-shadow(0 0 6px #38bdf8)';
    }
    setTimeout(() => {
      hm.classList.remove('active');
    }, 90);
  }

  spawnTracer(start, end) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({
      color: 0xffdf80,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, life: 0.08 });
  }

  spawnSparks(point) {
    for (let i = 0; i < 6; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 5 + 1,
        (Math.random() - 0.5) * 6
      );
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0xffbf42 })
      );
      dot.position.copy(point);
      this.scene.add(dot);
      this.impactParticles.push({ mesh: dot, vel, life: 0.25 });
    }
  }

  spawnBloodParticles(point) {
    for (let i = 0; i < 8; i++) {
      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 3 + 0.5,
        (Math.random() - 0.5) * 4
      );
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 4, 4),
        new THREE.MeshBasicMaterial({ color: 0x991b1b })
      );
      drop.position.copy(point);
      this.scene.add(drop);
      this.impactParticles.push({ mesh: drop, vel, life: 0.45 });
    }
  }

  // --- SUPPLY PICKUPS SYSTEM ---
  spawnPickup(x, z, type = 'ammo_pistol') {
    const group = new THREE.Group();
    group.position.set(x, 0.45, z);

    let color = 0x38bdf8;
    let label = '9mm AMMO';
    if (type === 'ammo_shotgun') {
      color = 0xef4444;
      label = '12G SHELLS';
    } else if (type === 'medkit') {
      color = 0x22c55e;
      label = 'MEDKIT';
    }

    // 3D crate mesh
    const crateGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7);
    const crateMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.7,
      emissive: color,
      emissiveIntensity: 0.4
    });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    group.add(crate);

    // Glowing icon ring
    const ringGeo = new THREE.RingGeometry(0.45, 0.55, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = -0.4;
    group.add(ring);

    // Light
    const light = new THREE.PointLight(color, 1.4, 4.5);
    light.position.y = 0.5;
    group.add(light);

    this.scene.add(group);

    const pickupObj = {
      group,
      type,
      label,
      x,
      z,
      baseY: 0.45,
      collected: false,
      respawnTimer: 0
    };
    this.pickups.push(pickupObj);
    return pickupObj;
  }

  spawnInitialPickups() {
    const coords = [
      { x: 12, z: -18, type: 'ammo_pistol' },
      { x: -22, z: 14, type: 'ammo_shotgun' },
      { x: 28, z: 22, type: 'medkit' },
      { x: -16, z: -25, type: 'ammo_pistol' },
      { x: 35, z: -8, type: 'medkit' },
      { x: -30, z: -15, type: 'ammo_shotgun' }
    ];
    coords.forEach(c => this.spawnPickup(c.x, c.z, c.type));
  }

  checkPickups(player, delta) {
    const pPos = player.position;

    for (const p of this.pickups) {
      if (p.collected) {
        p.respawnTimer -= delta;
        if (p.respawnTimer <= 0) {
          p.collected = false;
          p.group.visible = true;
        }
        continue;
      }

      // Animate bob & rotate
      p.group.rotation.y += delta * 1.5;
      p.group.position.y = p.baseY + Math.sin(Date.now() * 0.003 + p.x) * 0.12;

      // Distance check
      if (Math.hypot(pPos.x - p.x, pPos.z - p.z) < 1.6) {
        // Collect
        let collectedSuccess = false;

        if (p.type === 'medkit') {
          if (player.health < player.maxHealth) {
            player.health = Math.min(player.maxHealth, player.health + 35);
            window.soundEngine.playPickup(true);
            this.showTip("+35 HEALTH RESTORED");
            this.triggerHealFlash();
            collectedSuccess = true;
          }
        } else if (p.type === 'ammo_pistol') {
          this.weapons.pistol.reserveAmmo += 24;
          window.soundEngine.playPickup(false);
          this.showTip("+24 PISTOL AMMO");
          collectedSuccess = true;
        } else if (p.type === 'ammo_shotgun') {
          this.weapons.shotgun.reserveAmmo += 12;
          window.soundEngine.playPickup(false);
          this.showTip("+12 SHOTGUN SHELLS");
          collectedSuccess = true;
        }

        if (collectedSuccess) {
          p.collected = true;
          p.group.visible = false;
          p.respawnTimer = 40; // respawn in 40s
          this.updateHUD();
        }
      }
    }
  }

  triggerHealFlash() {
    const flash = document.getElementById('heal-flash');
    if (flash) {
      flash.style.opacity = '0.7';
      setTimeout(() => { flash.style.opacity = '0'; }, 220);
    }
  }

  update(delta) {
    // Fire timer cooldown
    if (this.fireTimer > 0) {
      this.fireTimer -= delta;
    }

    // Reload completion check
    if (this.isReloading) {
      this.reloadTimer -= delta;
      const w = this.currentWeapon;
      const needed = w.magSize - w.currentMag;
      const progress = 1 - (this.reloadTimer / w.reloadTime);
      document.getElementById('ammo-mag').innerText = `RELOAD..`;

      if (this.reloadTimer <= 0) {
        this.isReloading = false;
        const toLoad = Math.min(needed, w.reserveAmmo);
        w.currentMag += toLoad;
        w.reserveAmmo -= toLoad;
        this.updateHUD();
      }
    }

    // Recover recoil
    this.recoilPitch = THREE.MathUtils.lerp(this.recoilPitch, 0, 14 * delta);
    this.recoilYaw = THREE.MathUtils.lerp(this.recoilYaw, 0, 14 * delta);

    // Update Tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const tr = this.tracers[i];
      tr.life -= delta;
      tr.line.material.opacity = tr.life / 0.08;
      if (tr.life <= 0) {
        this.scene.remove(tr.line);
        tr.line.geometry.dispose();
        this.tracers.splice(i, 1);
      }
    }

    // Update Particles
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const p = this.impactParticles[i];
      p.life -= delta;
      p.vel.y -= 12 * delta; // gravity
      p.mesh.position.addScaledVector(p.vel, delta);
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.impactParticles.splice(i, 1);
      }
    }
  }

  updateHUD() {
    const w = this.currentWeapon;
    document.getElementById('weapon-icon').innerText = w.icon;
    document.getElementById('weapon-name').innerText = w.name;
    if (!this.isReloading) {
      document.getElementById('ammo-mag').innerText = `${w.currentMag}`;
    }
    document.getElementById('ammo-reserve').innerText = `/ ${w.reserveAmmo}`;

    // Slot active state
    document.querySelectorAll('.slot-badge').forEach(badge => {
      badge.classList.toggle('active', badge.dataset.weapon === w.id);
    });
  }

  showTip(text) {
    const tip = document.getElementById('weapon-status-tip');
    if (tip) {
      tip.innerText = text;
      clearTimeout(this.tipTimeout);
      this.tipTimeout = setTimeout(() => {
        tip.innerText = "[L-CLICK] FIRE | [R] RELOAD | [1/2] SWITCH";
      }, 2000);
    }
  }
}

window.WeaponManager = WeaponManager;
