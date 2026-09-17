/* ==========================================================================
   PURE WEB AUDIO API PROCEDURAL AUDIO ENGINE (ZERO EXTERNAL ASSETS)
   ========================================================================== */

class HorrorSoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.droneGain = null;
    this.isMuted = false;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    this.startAmbientDrone();
  }

  startAmbientDrone() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.setValueAtTime(0.3, t);
    this.droneGain.connect(this.masterGain);

    // Low Sub-Bass Drones
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(46.25, t); // F#1

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(49.00, t); // G1

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(130, t);
    filter.Q.setValueAtTime(5.0, t);

    // Subtle LFO
    const lfo = this.ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, t);

    const lfoGain = this.ctx.createGain();
    lfoGain.gain.setValueAtTime(60, t);
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.droneGain);

    osc1.start();
    osc2.start();
    lfo.start();

    // Wind Atmosphere
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(300, t);
    noiseFilter.Q.setValueAtTime(3.5, t);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.06, t);

    whiteNoise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.droneGain);

    whiteNoise.start();
  }

  // --- WEAPON SOUND EFFECTS ---
  playPistolShot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Sharp initial attack transient
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.08);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, t);
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.12);

    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.2);

    // Metallic barrel echo
    const noiseOsc = this.ctx.createOscillator();
    const noiseGain = this.ctx.createGain();
    noiseOsc.type = 'triangle';
    noiseOsc.frequency.setValueAtTime(180, t);
    noiseOsc.frequency.exponentialRampToValueAtTime(30, t + 0.22);
    noiseGain.gain.setValueAtTime(0.4, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    noiseOsc.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noiseOsc.start(t);
    noiseOsc.stop(t + 0.26);
  }

  playShotgunShot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Heavy concussive sub blast
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.28);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, t);
    filter.frequency.exponentialRampToValueAtTime(150, t + 0.35);

    gain.gain.setValueAtTime(1.0, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.4);

    // Gunpowder spread rumble
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(110, t);
    subOsc.frequency.exponentialRampToValueAtTime(20, t + 0.45);
    subGain.gain.setValueAtTime(0.7, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.52);
  }

  playReload() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;

    // Mag eject click
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(900, t);
    osc1.frequency.exponentialRampToValueAtTime(300, t + 0.04);
    gain1.gain.setValueAtTime(0.25, t);
    gain1.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.06);

    // Slide rack back / shell insert
    setTimeout(() => {
      if (!this.ctx) return;
      const t2 = this.ctx.currentTime;
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1400, t2);
      osc2.frequency.exponentialRampToValueAtTime(450, t2 + 0.06);
      gain2.gain.setValueAtTime(0.3, t2);
      gain2.gain.exponentialRampToValueAtTime(0.001, t2 + 0.08);
      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(t2);
      osc2.stop(t2 + 0.09);
    }, 280);
  }

  playHitMarker() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, t);
    osc.frequency.exponentialRampToValueAtTime(2200, t + 0.04);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.06);
  }

  playZombieHit() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(260, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.25);
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  playZombieDeath() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.7);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, t);
    filter.frequency.linearRampToValueAtTime(120, t + 0.7);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.75);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.8);
  }

  playPickup(isMedkit) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = isMedkit ? [440, 554, 659, 880] : [330, 440, 554];
    notes.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const st = t + idx * 0.06;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, st);
      gain.gain.setValueAtTime(0.2, st);
      gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(st);
      osc.stop(st + 0.28);
    });
  }

  playFootstep(isSprint) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    const startFreq = isSprint ? 95 : 75;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(25, t + 0.09);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(240, t);

    const vol = isSprint ? 0.24 : 0.14;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.11);
  }

  playZombieGroan(distanceRatio) {
    if (!this.ctx) return;
    const vol = Math.max(0.06, (1 - distanceRatio) * 0.45);
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    const baseFreq = 85 + Math.random() * 40;
    osc.frequency.setValueAtTime(baseFreq, t);
    osc.frequency.linearRampToValueAtTime(baseFreq * 0.65, t + 1.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(480, t);
    filter.frequency.linearRampToValueAtTime(260, t + 0.6);
    filter.frequency.linearRampToValueAtTime(180, t + 1.2);
    filter.Q.setValueAtTime(5.5, t);

    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.35);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.4);
  }

  playSiren() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, t);
    osc.frequency.linearRampToValueAtTime(840, t + 0.35);
    osc.frequency.linearRampToValueAtTime(520, t + 0.7);

    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.35, t + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 1.45);
  }

  playFlashlightClick() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(2400, t);
    osc.frequency.exponentialRampToValueAtTime(400, t + 0.03);
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playHeartbeat() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const playThump = (timeOffset, freq, vol) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + timeOffset);
      osc.frequency.exponentialRampToValueAtTime(35, t + timeOffset + 0.12);
      gain.gain.setValueAtTime(vol, t + timeOffset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + timeOffset + 0.14);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + timeOffset);
      osc.stop(t + timeOffset + 0.15);
    };

    playThump(0.0, 75, 0.45);
    playThump(0.18, 65, 0.35);
  }

  playDeath() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    gain.gain.setValueAtTime(0.65, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 1.55);
  }

  playPerkSelect() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const time = t + idx * 0.08;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.25, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.45);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(time);
      osc.stop(time + 0.5);
    });
  }
}

window.soundEngine = new HorrorSoundEngine();
