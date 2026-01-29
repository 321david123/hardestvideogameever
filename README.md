# VOID DUELIST

A 1v1 top-down pixel dueling game where you face **The Void** - an adaptive AI enemy that learns your patterns and punishes mistakes.

![Void Duelist](https://img.shields.io/badge/version-0.1.0-purple)
![Phaser 3](https://img.shields.io/badge/Phaser-3.70-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)

## 🎮 Controls

| Key | Action |
|-----|--------|
| **WASD** | Move |
| **SHIFT** | Dash (invincible frames) |
| **SPACE** | Attack (melee slash) |
| **E** | Parry (brief window, stuns attacker if timed) |

## 🎯 Gameplay

- Fight The Void in a small arena with pillars for cover
- Both you and The Void have 100 HP
- Land hits while avoiding damage
- Time your parries to stun The Void
- Use dashes to escape or reposition (you're invincible during dash)

## 🧠 The Void AI

The Void doesn't cheat - it obeys the same rules as you:
- Same cooldowns and movement speed
- Reaction delay (120-180ms like a human)
- No reading future inputs

But it's designed to be **punishing**:
- Tracks your tendencies (dash patterns, attack spam, parry usage)
- Adapts within the match to counter your playstyle
- Punishes whiffed attacks and predictable dashes
- Controls space using pillars

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The game will open at `http://localhost:3000`

### Global prize pool (same number for everyone)

The prize pool is shared across all players: everyone sees the same amount, and every retry (by anyone) adds $2.50. To use it you need the API server running:

1. **Terminal 1** – scoreboard API (port 3001):
   ```bash
   npm run server
   ```
2. **Terminal 2** – game (port 3000, proxies `/api` to the server):
   ```bash
   npm run dev
   ```

If the API is not running, the game still works and the prize is local-only (resets on refresh).

### Build and run for production (local)

```bash
npm run build
npm run start
```

`npm run start` builds the game and runs the server that serves both the static app and the `/api` scoreboard. Open the URL shown (e.g. `http://localhost:3001`).

### Deploy to Fly.io (always-on, global prize pool)

The app is set up for [Fly.io](https://fly.io): one machine, always running, with a persistent volume for the scoreboard so the prize survives deploys.

**First time (create app and volume):**
```bash
fly launch --copy-config --name void-duelist --no-deploy
fly deploy
```

**Later (just deploy):**
```bash
fly deploy
```

- **URL:** `https://void-duelist.fly.dev` (or the name you gave the app).
- **Always on:** `fly.toml` has `auto_stop_machines = "off"` so the machine never stops.
- **Prize persistence:** Scoreboard is stored on a volume at `/data/scoreboard.json`.

If the app name `void-duelist` is taken, use another name in `fly launch --name your-app-name` and in the `app = "..."` line in `fly.toml`.

## 📁 Project Structure

```
src/
├── main.ts                 # Entry point
├── game/
│   ├── Game.ts            # Phaser config
│   ├── scenes/
│   │   └── ArenaScene.ts  # Main game scene
│   ├── entities/
│   │   ├── Entity.ts      # Base entity class
│   │   ├── Player.ts      # Player-controlled entity
│   │   └── Void.ts        # AI enemy
│   ├── systems/
│   │   ├── Combat.ts      # Hit detection, damage
│   │   ├── Effects.ts     # Particles, shake, juice
│   │   ├── Collision.ts   # Wall/pillar collision
│   │   └── AI.ts          # AI utilities
│   ├── ui/
│   │   ├── HUD.ts         # Health bars, cooldowns
│   │   └── DeathScreen.ts # Post-match stats
│   └── utils/
│       ├── constants.ts   # Game balance values
│       ├── math.ts        # Vector math utilities
│       └── timer.ts       # Cooldown/timer helpers
```

## ⚙️ Configuration

All balance values are in `src/game/utils/constants.ts`:

```typescript
// Entity stats
ENTITY_HP = 100
ENTITY_SPEED = 210
ATTACK_DAMAGE = 14
ATTACK_RANGE = 55

// Timing
DASH_DURATION = 0.18s
DASH_COOLDOWN = 1.1s
ATTACK_WINDUP = 0.12s (telegraph)
PARRY_WINDOW = 0.12s
```

## 🔮 Roadmap

- [ ] Pixel art sprites and animations
- [ ] Sound effects and music
- [ ] Replay system
- [ ] Global leaderboard
- [ ] Multiple AI personalities
- [ ] Local multiplayer
- [ ] Mobile support

## 📝 License

MIT

---

*The Void watches. The Void adapts. Can you overcome the inevitable?*
