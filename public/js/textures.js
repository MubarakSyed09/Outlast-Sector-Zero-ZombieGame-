/* ==========================================================================
   PROCEDURAL HIGH-RES TEXTURE GENERATORS (NO BROKEN ASSET URLS)
   ========================================================================== */

function generateAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Dark asphalt base with subtle blue-gray tint
  ctx.fillStyle = '#181b22';
  ctx.fillRect(0, 0, 512, 512);

  // Noise and grit
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 32;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  // Dirt & oil patches
  ctx.fillStyle = 'rgba(8, 10, 14, 0.4)';
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const rad = 25 + Math.random() * 60;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Cracks in pavement
  ctx.strokeStyle = '#090b10';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 10; i++) {
    let cx = Math.random() * 512;
    let cy = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    for (let j = 0; j < 6; j++) {
      cx += (Math.random() - 0.5) * 45;
      cy += (Math.random() - 0.5) * 45;
      ctx.lineTo(cx, cy);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(28, 28);
  return texture;
}

function generateCrateTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#5c4533';
  ctx.fillRect(0, 0, 256, 256);

  // Wood planks
  for (let y = 0; y < 256; y += 42) {
    ctx.fillStyle = (y / 42) % 2 === 0 ? '#523d2c' : '#684e3a';
    ctx.fillRect(0, y, 256, 40);
    ctx.fillStyle = '#2b1f16';
    ctx.fillRect(0, y + 40, 256, 2);
  }

  // Metal outer frame & cross brace
  ctx.strokeStyle = '#3e444f';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, 242, 242);

  ctx.beginPath();
  ctx.moveTo(10, 10);
  ctx.lineTo(246, 246);
  ctx.moveTo(246, 10);
  ctx.lineTo(10, 246);
  ctx.stroke();

  // Warning Stencil
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('AMMO / HAZARD', 128, 136);

  return new THREE.CanvasTexture(canvas);
}

function generateConcreteTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#64748b';
  ctx.fillRect(0, 0, 256, 128);

  // Yellow & Black hazard stripes at bottom
  const stripeW = 20;
  for (let x = -50; x < 320; x += stripeW * 2) {
    ctx.fillStyle = '#eab308';
    ctx.beginPath();
    ctx.moveTo(x, 128);
    ctx.lineTo(x + stripeW, 128);
    ctx.lineTo(x + stripeW + 25, 88);
    ctx.lineTo(x + 25, 88);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.moveTo(x + stripeW, 128);
    ctx.lineTo(x + stripeW * 2, 128);
    ctx.lineTo(x + stripeW * 2 + 25, 88);
    ctx.lineTo(x + stripeW + 25, 88);
    ctx.closePath();
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

function generateSafeZoneDecal() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 512, 512);

  ctx.strokeStyle = '#22c55e';
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.arc(256, 256, 230, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#4ade80';
  ctx.lineWidth = 8;
  ctx.setLineDash([24, 16]);
  ctx.beginPath();
  ctx.arc(256, 256, 200, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#22c55e';
  ctx.fillRect(236, 96, 40, 320);
  ctx.fillRect(96, 236, 320, 40);

  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#4ade80';
  ctx.textAlign = 'center';
  ctx.fillText('EVAC LZ-01', 256, 60);

  return new THREE.CanvasTexture(canvas);
}

function generateBloodDecal() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, 128, 128);
  ctx.fillStyle = '#7f1d1d';

  // Central irregular splat
  ctx.beginPath();
  ctx.arc(64, 64, 28 + Math.random() * 8, 0, Math.PI * 2);
  ctx.fill();

  // Droplets
  for (let i = 0; i < 14; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 24 + Math.random() * 32;
    const rad = 2 + Math.random() * 5;
    ctx.beginPath();
    ctx.arc(64 + Math.cos(angle) * dist, 64 + Math.sin(angle) * dist, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}
