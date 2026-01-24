/**
 * Game balance constants - tweak these to adjust difficulty
 */

// Arena - BIGGER!
export const ARENA_WIDTH = 1200;
export const ARENA_HEIGHT = 800;
export const WALL_THICKNESS = 16;

// Pillar configuration - more pillars for bigger arena
export const PILLARS = [
  { x: 300, y: 250, width: 56, height: 56 },
  { x: 900, y: 250, width: 56, height: 56 },
  { x: 300, y: 550, width: 56, height: 56 },
  { x: 900, y: 550, width: 56, height: 56 },
  { x: 600, y: 400, width: 72, height: 72 }, // Center pillar
];

// Player stats
export const PLAYER_HP_PHASE1 = 75; // Phase 1 HP
export const PLAYER_HP_PHASE2 = 150; // Phase 2 HP (restored on transition)
export const PLAYER_HP = PLAYER_HP_PHASE1; // Default for initialization
export const PLAYER_SPEED = 220;
export const ENTITY_RADIUS = 16;

// Void stats - OVERPOWERED
export const VOID_HP = 100; // Phase 1 HP
export const VOID_SPEED = 240; // Faster than player
export const VOID_DAMAGE = 18; // Hits harder

// Phase 2 stats - IMPOSSIBLE LEVEL
export const VOID_PHASE2_HP = 300;
export const VOID_PHASE2_SPEED = 320; // MUCH faster
export const VOID_PHASE2_DAMAGE = 25; // Hits MUCH harder
export const VOID_PHASE2_DESPERATION_HP = 50; // When to enter desperation mode
export const VOID_PHASE2_COLOR = 0x4c1d95; // Very dark purple
export const VOID_PHASE2_LASER_COOLDOWN = 1.5; // Much faster laser
export const VOID_PHASE2_CHARGE_COOLDOWN = 2.0; // Much faster charge
export const VOID_PHASE2_TELEPORT_COOLDOWN = 1.5; // Rapid teleports
export const VOID_PHASE2_ATTACK_COOLDOWN = 0.2; // Very fast attacks

// Desperation mode (when Phase 2 Void < 50 HP)
export const VOID_DESPERATION_SPEED = 360; // Even faster!
export const VOID_DESPERATION_DAMAGE = 30; // Even harder!
export const VOID_DESPERATION_LASER_COOLDOWN = 1.0; // Rapid fire
export const VOID_DESPERATION_ATTACK_COOLDOWN = 0.15; // Insanely fast
export const VOID_DESPERATION_TELEPORT_COOLDOWN = 1.0; // Constant teleports

// Phase 2 NEW ATTACKS
export const VOID_PHASE2_MULTI_LASER_COOLDOWN = 3.0; // Triple laser
export const VOID_PHASE2_TELEPORT_STRIKE_COOLDOWN = 2.5; // Teleport + instant attack
export const VOID_PHASE2_AREA_BLAST_COOLDOWN = 4.0; // AOE attack
export const VOID_PHASE2_AREA_BLAST_RADIUS = 150;
export const VOID_PHASE2_AREA_BLAST_DAMAGE = 30;

// Arena-wide insta-kill attack
export const VOID_PHASE2_ARENA_WIPE_COOLDOWN = 15.0; // Long cooldown - rare but deadly
export const VOID_PHASE2_ARENA_WIPE_CHARGE = 2.0; // 2 seconds to get to cover
export const VOID_PHASE2_ARENA_WIPE_ANGLE = Math.PI * 0.4; // 72 degree cone (wide fan)
export const VOID_PHASE2_ARENA_WIPE_DAMAGE = 9999; // Insta-kill

// Skill Checks (Dead by Daylight style)
export const SKILL_CHECK_DURATION = 3.5; // Time to complete - more time!
export const SKILL_CHECK_KEY_CHANGE_INTERVAL = 0.7; // Keys change slower (easier for user)
export const SKILL_CHECK_FAIL_DAMAGE = 35; // Damage on fail
export const SKILL_CHECK_SUCCESS_HEAL = 15; // Heal on success
export const SKILL_CHECK_TRIGGER_DISTANCE = 120; // Distance to trigger skill check
export const SKILL_CHECK_TRIGGER_CHANCE = 0.15; // 15% chance per frame when close
export const SKILL_CHECK_COOLDOWN = 6.0; // Cooldown between skill checks

// Dash
export const DASH_DURATION = 0.18; // seconds
export const DASH_COOLDOWN = 1.1; // seconds
export const DASH_SPEED_MULTIPLIER = 4.5;
export const DASH_INVULNERABLE = true;

// Player Attack
export const ATTACK_COOLDOWN = 0.45; // seconds
export const ATTACK_RANGE = 55;
export const ATTACK_WINDUP = 0.12; // seconds (telegraph)
export const ATTACK_ACTIVE = 0.08; // seconds (hit window)
export const ATTACK_DAMAGE = 14;
export const ATTACK_ARC = Math.PI / 2; // 90 degrees

// Void melee - faster and longer range
export const VOID_ATTACK_COOLDOWN = 0.35;
export const VOID_ATTACK_RANGE = 65;
export const VOID_ATTACK_WINDUP = 0.08;

// Void LASER attack - ranged
export const VOID_LASER_COOLDOWN = 3.0; // seconds
export const VOID_LASER_CHARGE = 0.6; // charge-up time (telegraph)
export const VOID_LASER_DURATION = 0.4; // beam active time
export const VOID_LASER_DAMAGE = 25;
export const VOID_LASER_WIDTH = 20;
export const VOID_LASER_RANGE = 800; // full arena range

// Void DASH ATTACK - charges at player
export const VOID_CHARGE_COOLDOWN = 4.0;
export const VOID_CHARGE_WINDUP = 0.4;
export const VOID_CHARGE_DURATION = 0.3;
export const VOID_CHARGE_SPEED = 600;
export const VOID_CHARGE_DAMAGE = 22;

// Hitstun
export const HITSTUN_DURATION = 0.14; // seconds
export const HITSTOP_DURATION = 0.075; // seconds (freeze on hit)

// Shield/Parry - NEW HOLD SYSTEM
export const SHIELD_MAX = 100; // Max shield energy
export const SHIELD_DRAIN_RATE = 50; // Drain per second while holding (100 = 2 seconds max)
export const SHIELD_DRAIN_RATE_PHASE2 = 33.33; // Phase 2: 100 = 3 seconds max
export const SHIELD_REGEN_DELAY = 2.0; // Seconds before regen starts
export const SHIELD_REGEN_RATE = 20; // Regen per second (5 seconds to full)
export const SHIELD_MIN_TO_USE = 10; // Minimum shield to activate
export const PARRY_STUN = 0.45; // seconds (attacker stunned)
export const PARRY_KNOCKBACK = 80;

// Health pickups
export const HEALTH_DROP_CHANCE = 0.3; // 30% chance on pickup spawn
export const HEALTH_DROP_AMOUNT = 25; // HP restored

// Juice
export const SCREEN_SHAKE_HIT = 4;
export const SCREEN_SHAKE_KILL = 12;
export const SCREEN_SHAKE_LASER = 8;
export const SCREEN_SHAKE_DURATION = 0.15;

// AI - MUCH MORE AGGRESSIVE
export const AI_REACTION_MIN = 0.06; // seconds - faster reactions!
export const AI_REACTION_MAX = 0.10; // seconds
export const AI_OPTIMAL_DISTANCE = 180; // Keep more distance!
export const AI_TENDENCY_WINDOW = 2; // seconds to track (faster adaptation)
export const AI_RANDOMNESS = 0.05; // Less random, more calculated

// Teleport
export const VOID_TELEPORT_COOLDOWN = 5.0; // seconds
export const VOID_TELEPORT_MIN_DISTANCE = 200; // minimum teleport distance
export const VOID_TELEPORT_TELEGRAPH = 0.4; // warning before teleport

// Pickup system
export const PICKUP_SPAWN_INTERVAL = 8; // seconds
export const PICKUP_DURATION = 6; // how long pickup stays
export const PICKUP_LASER_DAMAGE = 35;
export const PICKUP_LASER_CHARGES = 3;

// Colors
export const COLOR_PLAYER = 0x4fd1c5; // Cyan-teal
export const COLOR_VOID = 0x9f7aea; // Purple
export const COLOR_VOID_DARK = 0x553c9a;
export const COLOR_VOID_PHASE2 = 0x4c1d95; // Very dark purple for Phase 2
export const COLOR_VOID_PHASE2_SPIKE = 0x7c3aed; // Bright purple for spikes
export const COLOR_SKILL_CHECK = 0xffd700; // Gold for skill check
export const COLOR_SKILL_CHECK_SUCCESS = 0x2ed573; // Green for success
export const COLOR_SKILL_CHECK_FAIL = 0xff4757; // Red for fail
export const COLOR_VOID_LASER = 0xff3366; // Hot pink/red for laser
export const COLOR_ATTACK_TELEGRAPH = 0xffffff;
export const COLOR_PARRY = 0xffd700;
export const COLOR_DAMAGE = 0xff4757;
export const COLOR_HEAL = 0x2ed573;
export const COLOR_WALL = 0x1a1a2e;
export const COLOR_PILLAR = 0x2d2d44;
export const COLOR_ARENA_BG = 0x0a0a12;
export const COLOR_PICKUP = 0x00ffaa;
export const COLOR_PICKUP_GLOW = 0x00ff88;
export const COLOR_WARNING_ARENA_WIPE = 0xff0000; // Bright red for insta-kill

// Fixed timestep
export const FIXED_TIMESTEP = 1000 / 60; // 60 FPS physics
