/* ==========================================================================
   ZOMBIE HORDE & AI SYSTEM - HEALTH, HIT REACTIONS, DEATH DROPS, GLOWING EYES
   ========================================================================== */

class Zombie {
  constructor(x, z, wave = 1) {
    this.position = new THREE.Vector3(x, 0, z);
    this.velocity = new THREE.Vector3();
    this.maxHealth = 90 + (wave - 1) * 20;
    this.health = this.maxHealth;
    this.speed = (2.3 + Math.random() * 0.7) * (1.0 + (wave - 1) * 0.12);
    this.rotation = Math.random() * Math.PI * 2;
    this.wobblePhase = Math.random() * Math.PI * 2;
    this.stunnedTimer = 0;
    this.staggerTimer = 0;
    this.isDead = false;
    this.deathTimer = 0;
    this.groanCooldown = 2 + Math.random() * 6;

    // Root Group
    this.mesh = new THREE.Group();
    this.mesh.position.copy(this.position);
    window.scene.add(this.mesh);

    // Build Articulated Procedural Zombie with Glowing Reflective Eyes
    this.buildZombieMesh();

    // Overhead Health Bar Billboard
    this.buildHealthBar();

    // Attach GLTF if already loaded
    if (window.loadedSoldierGLTF) {
      this.attachGLTF(window.loadedSoldierGLTF);
    }
  }

  buildZombieMesh() {
    // Sickly decayed green/gray skin with high contrast specular highlights
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x5a7558,
      roughness: 0.6,
      metalness: 0.2
    });

    const clothMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.8
    });

    // Intense Glowing Eyes so zombies are easily visible in the fog
    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xff2233
    });

    // Pelvis
    this.pelvis = new THREE.Group();
    this.pelvis.position.y = 0.95;
    this.mesh.add(this.pelvis);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), clothMat);
    torso.position.y = 0.35;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.pelvis.add(torso);

    // Head
    this.headGroup = new THREE.Group();
    this.headGroup.position.y = 0.8;
    this.headGroup.rotation.x = 0.2; // Hunched forward
    this.pelvis.add(this.headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.32), skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Glowing Crimson Eyes
    const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.09, 0.05, 0.17);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.09, 0.05, 0.17);
    this.headGroup.add(leftEye);
    this.headGroup.add(rightEye);

    // Small eye glow point light for close-up horror reflection
    const eyeGlow = new THREE.PointLight(0xff2233, 0.9, 3.5);
    eyeGlow.position.set(0, 0.05, 0.3);
    this.headGroup.add(eyeGlow);

    // Arms (Outstretched grasping forward)
    const createArm = (offsetX, isRight) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(offsetX, 0.6, 0);
      shoulder.rotation.x = -1.25; // outstretched
      this.pelvis.add(shoulder);

      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.16), clothMat);
      upperArm.position.y = -0.18;
      upperArm.castShadow = true;
      shoulder.add(upperArm);

      const elbow = new THREE.Group();
      elbow.position.y = -0.36;
      shoulder.add(elbow);

      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.34, 0.14), skinMat);
      forearm.position.y = -0.16;
      forearm.castShadow = true;
      elbow.add(forearm);

      return { shoulder, elbow };
    };

    this.leftArm = createArm(-0.35, false);
    this.rightArm = createArm(0.35, true);

    // Legs
    const createLeg = (offsetX) => {
      const hip = new THREE.Group();
      hip.position.set(offsetX, 0, 0);
      this.pelvis.add(hip);

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

      return { hip, knee };
    };

    this.leftLeg = createLeg(-0.16);
    this.rightLeg = createLeg(0.16);
  }

  buildHealthBar() {
    // 3D Billboard container
    this.hpContainer = new THREE.Group();
    this.hpContainer.position.y = 2.1;
    this.mesh.add(this.hpContainer);

    // Background bar
    const bgGeo = new THREE.PlaneGeometry(0.8, 0.1);
    const bgMat = new THREE.MeshBasicMaterial({ color: 0x090d16, side: THREE.DoubleSide });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    this.hpContainer.add(bg);

    // Fill bar
    const fillGeo = new THREE.PlaneGeometry(0.78, 0.08);
    fillGeo.translate(0.39, 0, 0); // anchor to left
    this.hpFillMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    this.hpFill = new THREE.Mesh(fillGeo, this.hpFillMat);
    this.hpFill.position.set(-0.39, 0, 0.005);
    this.hpContainer.add(this.hpFill);

    // Only show health bar when damaged
    this.hpContainer.visible = false;
  }

  attachGLTF(gltf) {
    if (this.isDead) return;
    window.scene.remove(this.mesh);

    const clone = (typeof THREE.SkeletonUtils !== 'undefined')
      ? THREE.SkeletonUtils.clone(gltf.scene)
      : gltf.scene.clone(true);

    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = child.material.clone();
        child.material.color.setHex(0x5a7558);
        child.material.roughness = 0.65;
      }
    });

    clone.scale.set(0.98, 0.98, 0.98);
    this.mesh = clone;
    this.mesh.position.copy(this.position);
    window.scene.add(this.mesh);

    // Re-attach health bar
    this.buildHealthBar();

    this.mixer = new THREE.AnimationMixer(clone);
    const walkClip = gltf.animations.find(a => a.name === 'Walk') || gltf.animations[0];
    if (walkClip) {
      this.action = this.mixer.clipAction(walkClip);
      this.action.timeScale = 0.85 + Math.random() * 0.4;
      this.action.play();
    }
  }

  takeDamage(amount, hitDir, isHeadshot) {
    if (this.isDead) return;

    this.health -= amount;
    this.hpContainer.visible = true;

    // Update health fill
    const pct = Math.max(0, this.health / this.maxHealth);
    this.hpFill.scale.x = pct;

    // Hit reaction: Stagger and knockback
    this.staggerTimer = isHeadshot ? 0.45 : 0.25;
    this.position.addScaledVector(hitDir, isHeadshot ? 1.2 : 0.6);
    this.mesh.position.copy(this.position);

    // Flash material white/red briefly
    this.mesh.traverse(child => {
      if (child.isMesh && child.material && child.material.color) {
        if (!child._origColor) child._origColor = child.material.color.getHex();
        child.material.color.setHex(0xffffff);
        setTimeout(() => {
          if (child.material) child.material.color.setHex(child._origColor);
        }, 60);
      }
    });

    window.soundEngine.playZombieHit();

    if (this.health <= 0) {
      this.die(hitDir);
    }
  }

  die(hitDir) {
    if (this.isDead) return;
    this.isDead = true;
    this.hpContainer.visible = false;
    window.soundEngine.playZombieDeath();

    // Increment player kills
    window.gameState.kills++;
    document.getElementById('hud-zombies').innerText = 
      `${window.zombiesList.filter(z => !z.isDead).length} ACTIVE`;

    // Drop blood pool on ground
    const bloodGeo = new THREE.PlaneGeometry(2.2, 2.2);
    const bloodMat = new THREE.MeshBasicMaterial({
      map: generateBloodDecal(),
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    const bloodMesh = new THREE.Mesh(bloodGeo, bloodMat);
    bloodMesh.rotation.x = -Math.PI / 2;
    bloodMesh.position.set(this.position.x, 0.03, this.position.z);
    window.scene.add(bloodMesh);

    // 40% chance to drop ammo or medkit crate
    if (Math.random() < 0.42 && window.weaponManager) {
      const dropType = Math.random() < 0.35 ? 'medkit' : (Math.random() < 0.5 ? 'ammo_pistol' : 'ammo_shotgun');
      window.weaponManager.spawnPickup(this.position.x, this.position.z, dropType);
    }

    // Collapse animation (fall backward in hit direction)
    const fallDir = hitDir ? hitDir.clone().negate() : new THREE.Vector3(0, 0, 1);
    this.mesh.rotation.x = -Math.PI / 2.2;
    this.mesh.position.y = 0.25;

    // Dissolve / remove after 8 seconds
    setTimeout(() => {
      window.scene.remove(this.mesh);
    }, 8000);
  }

  update(delta, playerPos, camera) {
    if (this.isDead) return;

    // Billboard health bar to face camera
    if (this.hpContainer && this.hpContainer.visible && camera) {
      this.hpContainer.quaternion.copy(camera.quaternion);
    }

    // Stunned / Stagger timer
    if (this.stunnedTimer > 0) {
      this.stunnedTimer -= delta;
      if (this.headGroup) {
        this.headGroup.rotation.z = Math.sin(Date.now() * 0.02) * 0.3;
      }
      return;
    }
    if (this.staggerTimer > 0) {
      this.staggerTimer -= delta;
      return;
    }

    // Groans
    this.groanCooldown -= delta;
    const distToPlayer = this.position.distanceTo(playerPos);
    if (this.groanCooldown <= 0) {
      this.groanCooldown = 4 + Math.random() * 6;
      if (distToPlayer < 45) {
        window.soundEngine.playZombieGroan(distToPlayer / 45);
      }
    }

    // Navigation vector toward player
    const toPlayer = new THREE.Vector3().subVectors(playerPos, this.position);
    toPlayer.y = 0;
    toPlayer.normalize();

    // Boids Separation: repel from nearby living zombies
    const separation = new THREE.Vector3();
    let neighbors = 0;
    for (const other of window.zombiesList) {
      if (other === this || other.isDead) continue;
      const d = this.position.distanceTo(other.position);
      if (d < 2.0 && d > 0.01) {
        const push = new THREE.Vector3().subVectors(this.position, other.position).normalize();
        push.divideScalar(d);
        separation.add(push);
        neighbors++;
      }
    }
    if (neighbors > 0) {
      separation.divideScalar(neighbors).normalize().multiplyScalar(0.75);
    }

    // Obstacle avoidance
    const avoidance = new THREE.Vector3();
    if (window.obstacles) {
      for (const obs of window.obstacles) {
        const d = Math.hypot(this.position.x - obs.x, this.position.z - obs.z);
        if (d < obs.radius + 1.2) {
          const push = new THREE.Vector3(this.position.x - obs.x, 0, this.position.z - obs.z).normalize();
          avoidance.add(push.multiplyScalar(2.0));
        }
      }
    }

    // Combine desired direction
    const desiredDir = new THREE.Vector3()
      .add(toPlayer.multiplyScalar(1.2))
      .add(separation)
      .add(avoidance)
      .normalize();

    // Shambling sway
    this.wobblePhase += delta * 4.2;
    const sway = Math.sin(this.wobblePhase) * 0.22;
    const perp = new THREE.Vector3(-desiredDir.z, 0, desiredDir.x).multiplyScalar(sway);
    desiredDir.add(perp).normalize();

    // Move
    this.position.addScaledVector(desiredDir, this.speed * delta);
    this.mesh.position.copy(this.position);

    // Smooth rotation to face movement direction
    const targetAngle = Math.atan2(desiredDir.x, desiredDir.z);
    let diff = targetAngle - this.rotation;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;
    this.rotation += diff * Math.min(1, delta * 7);
    this.mesh.rotation.y = this.rotation;

    // Procedural walk animation
    if (this.leftLeg && this.rightLeg) {
      const cycle = this.wobblePhase * 1.5;
      this.leftLeg.hip.rotation.x = Math.sin(cycle) * 0.55;
      this.rightLeg.hip.rotation.x = -Math.sin(cycle) * 0.55;
      this.leftArm.shoulder.rotation.x = -1.25 + Math.sin(cycle) * 0.2;
      this.rightArm.shoulder.rotation.x = -1.35 - Math.sin(cycle) * 0.2;
      this.pelvis.position.y = 0.95 + Math.abs(Math.sin(cycle)) * 0.08;
    }

    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  destroy() {
    window.scene.remove(this.mesh);
  }
}

window.Zombie = Zombie;
