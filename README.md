# OUTLAST: SECTOR ZERO

A high-intensity, full-stack 3D Third-Person Survival Horror game built with **Three.js (r128)**, **WebGL**, the **Web Audio API**, and a lightweight **Node.js Express** backend.

---

## 🎮 Features

- **Dynamic 3D Combat Engine**:
  - **Tactical 9mm Pistol**: High accuracy, semi-automatic fire.
  - **12-Gauge Combat Shotgun**: 8-pellet buckshot spread with heavy point-blank damage.
  - Weapon recoil pitch kick, animated 3D muzzle flashes, raycast bullet tracers, and impact sparks.
  - Dynamic hit-marker reticle (`X`) with audio confirmation.
- **Zombie Horde AI**:
  - Vector navigation with boids separation (hostiles fan out and avoid crowding).
  - 3D overhead health bars, hit stagger reactions, and headshot damage multiplier (2.0x).
  - High-intensity glowing crimson reflective eyes for clear silhouettes in the dark.
  - 40% chance on zombie death to drop supply crates and blood splatters.
- **Supply Pickups**:
  - 🟢 **Medkits**: Restores +35 HP.
  - 🔵 **9mm Ammo**: Adds +24 Pistol rounds.
  - 🔴 **12-Gauge Shells**: Adds +12 Shotgun shells.
- **Horror Atmosphere & Lighting**:
  - Soft volumetric scene fog (`THREE.FogExp2`).
  - Player-mounted wide-beam tactical flashlight casting dynamic soft shadows.
  - Streetlights with ambient flickering and moonlight.
- **Extraction & Perk Progression**:
  - Navigate using the Threat Radar / Minimap and Compass to reach the fortified green extraction beacon.
  - Emergency lockdown wipes nearby threats and opens a 3-choice tactical perk requisition modal.
  - Sector progression with escalating horde size and speed.
- **100% Procedural Web Audio**:
  - All sound effects (gunshots, slide racks, zombie groans, ambient drone, heartbeat, siren) synthesized via Web Audio API with zero external audio assets.
- **Node.js Backend**:
  - Express server serving game assets and storing persistent high scores in `data/leaderboard.json`.

---

## ⌨️ Controls

| Key / Action | Function |
| :--- | :--- |
| **W, A, S, D** | Move / Strafe |
| **Shift** | Sprint (Consumes Stamina) |
| **Mouse** | Aim / Look (Pointer Lock) |
| **Left Click** | Fire Weapon |
| **R** | Reload Weapon |
| **1 / 2 or Wheel** | Switch between Pistol and Shotgun |
| **F** | Toggle Flashlight Beam |
| **Space / E** | UV Stun Pulse (When Unlocked) |
| **Esc** | Pause / Unlock Cursor |

---

## 🚀 Quick Start

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/ZombieGame.git
cd ZombieGame
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the server
```bash
node server.js
```

### 4. Play
Open your browser and navigate to:
```
http://localhost:3000
```
*(Or double-click `index.html` to run locally without a server).*

---

## 📁 Project Structure

```
ZombieGame/
├── server.js              # Express backend & Leaderboard REST API
├── package.json           # Node.js dependencies (Express, CORS)
├── data/
│   └── leaderboard.json   # Persistent run statistics & high scores
├── public/                # Client frontend application
│   ├── index.html         # HUD, Threat Radar, Canvas markup
│   ├── css/
│   │   └── style.css      # Tactical HUD styling & gauges
│   └── js/
│       ├── audio.js       # Procedural Web Audio synthesizer
│       ├── textures.js    # Procedural Canvas texture generators
│       ├── weapons.js     # WeaponManager (recoil, tracers, pickups)
│       ├── zombies.js     # Zombie AI, health, drops, eyes
│       └── main.js        # Three.js scene, lighting, game loop
└── index.html             # Standalone root launcher
```
