/**
 * The Void - AI-controlled BOSS enemy entity
 * Designed to be OVERPOWERED - punishing and relentless
 * Has melee attacks, laser beam, charge attack, and TELEPORT
 */

import Phaser from 'phaser';
import { Entity, EntityState } from './Entity';
import { Player, PlayerActionData } from './Player';
import { Vec2, vec2, sub, normalize, length, distance, scale, add, fromAngle, randomRange } from '../utils/math';
import { Timer, Cooldown } from '../utils/timer';
import * as C from '../utils/constants';
import { music } from '../systems/Music';

// AI States
export type VoidAIState = 
  | 'observe'      // Watch and maintain spacing
  | 'probe'        // Fake approach, test reactions
  | 'commit'       // Go for melee attack
  | 'evade'        // Dash away
  | 'parry'        // Attempt parry
  | 'punish'       // Attack after player whiff/dash end
  | 'retreat'      // Play safe when low HP
  | 'laser_aim'    // Charging laser
  | 'laser_fire'   // Firing laser
  | 'charge_wind'  // Winding up charge attack
  | 'charging'     // Charging at player
  | 'teleport_out' // Fading out for teleport
  | 'teleport_in'; // Appearing after teleport

// Player tendency tracking
interface PlayerTendencies {
  dashTowardsRate: number;
  dashAwayRate: number;
  attackSpamRate: number;
  parryUsageRate: number;
  preferredDistance: number;
  aggressiveness: number;
}

interface ActionRecord {
  time: number;
  type: 'dash_toward' | 'dash_away' | 'attack' | 'parry';
}

export class Void extends Entity {
  private player: Player | null = null;
  private aiState: VoidAIState = 'observe';
  
  // Reaction delay simulation
  private reactionTimer: Timer = new Timer();
  private pendingAction: (() => void) | null = null;
  
  // Tendency tracking
  private actionHistory: ActionRecord[] = [];
  private tendencies: PlayerTendencies = {
    dashTowardsRate: 0.5,
    dashAwayRate: 0.5,
    attackSpamRate: 0,
    parryUsageRate: 0,
    preferredDistance: 150,
    aggressiveness: 0.5,
  };
  
  // State timers
  private stateTimer: Timer = new Timer();
  private probeDirection: Vec2 = vec2();
  
  // LASER attack
  public laserCooldown: Cooldown = new Cooldown(C.VOID_LASER_COOLDOWN);
  public laserChargeTimer: Timer = new Timer(C.VOID_LASER_CHARGE);
  public laserFireTimer: Timer = new Timer(C.VOID_LASER_DURATION);
  public laserDirection: Vec2 = vec2(1, 0);
  public laserTargetPos: Vec2 = vec2();
  public isLaserCharging: boolean = false;
  public isLaserFiring: boolean = false;
  
  // CHARGE attack
  public chargeCooldown: Cooldown = new Cooldown(C.VOID_CHARGE_COOLDOWN);
  public chargeWindupTimer: Timer = new Timer(C.VOID_CHARGE_WINDUP);
  public chargeDurationTimer: Timer = new Timer(C.VOID_CHARGE_DURATION);
  public chargeDirection: Vec2 = vec2(1, 0);
  public isChargeWindup: boolean = false;
  public isCharging: boolean = false;
  public chargeHit: boolean = false;
  
  // TELEPORT
  public teleportCooldown: Cooldown = new Cooldown(C.VOID_TELEPORT_COOLDOWN);
  public teleportTimer: Timer = new Timer(C.VOID_TELEPORT_TELEGRAPH);
  public isTeleporting: boolean = false;
  public teleportTarget: Vec2 = vec2();
  public teleportPhase: 'out' | 'in' = 'out';
  
  // Visual elements for special attacks
  public laserGraphics: Phaser.GameObjects.Graphics;
  public chargeTrail: Phaser.GameObjects.Graphics;
  public teleportGraphics: Phaser.GameObjects.Graphics;
  
  // Previous player state for detecting changes
  private prevPlayerData: PlayerActionData | null = null;
  
  // Punish window tracking
  private playerDashEndTime: number = 0;
  private playerAttackEndTime: number = 0;
  private currentTime: number = 0;
  
  // Aggression level increases over time
  private aggressionMultiplier: number = 1;
  
  private innerCore: Phaser.GameObjects.Arc | null = null;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  
  // PHASE 2 SYSTEM
  public phase: 1 | 2 = 1;
  public isTransitioning: boolean = false;
  private transitionTimer: Timer = new Timer(2.0); // Transition duration
  
  // Phase 2 visual elements
  private phase2Spikes: Phaser.GameObjects.Container[] = [];
  
  // Phase 2 NEW ATTACKS
  public multiLaserCooldown: Cooldown = new Cooldown(C.VOID_PHASE2_MULTI_LASER_COOLDOWN);
  public multiLaserTimer: Timer = new Timer(0.8);
  public isMultiLaserActive: boolean = false;
  public multiLaserDirections: Vec2[] = [];
  
  public teleportStrikeCooldown: Cooldown = new Cooldown(C.VOID_PHASE2_TELEPORT_STRIKE_COOLDOWN);
  public teleportStrikeTimer: Timer = new Timer(0.3);
  public isTeleportStriking: boolean = false;
  
  public areaBlastCooldown: Cooldown = new Cooldown(C.VOID_PHASE2_AREA_BLAST_COOLDOWN);
  public areaBlastTimer: Timer = new Timer(1.0);
  public isAreaBlastActive: boolean = false;
  public areaBlastGraphics: Phaser.GameObjects.Graphics;
  
  // Arena-wide insta-kill attack
  public arenaWipeCooldown: Cooldown = new Cooldown(C.VOID_PHASE2_ARENA_WIPE_COOLDOWN);
  public arenaWipeChargeTimer: Timer = new Timer(C.VOID_PHASE2_ARENA_WIPE_CHARGE);
  public isArenaWipeCharging: boolean = false;
  public isArenaWipeActive: boolean = false;
  public arenaWipeDirection: Vec2 = vec2(1, 0);
  public arenaWipeGraphics: Phaser.GameObjects.Graphics;
  
  // Skill check trigger - proximity based
  public skillCheckCooldown: Cooldown = new Cooldown(C.SKILL_CHECK_COOLDOWN);
  public lastSkillCheckDistance: number = 9999; // Track distance for proximity trigger
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, C.COLOR_VOID, {
      hp: C.VOID_HP,
      maxHp: C.VOID_HP,
      speed: C.VOID_SPEED,
      damage: C.VOID_DAMAGE,
      attackRange: C.VOID_ATTACK_RANGE,
      attackCooldown: C.VOID_ATTACK_COOLDOWN,
      attackWindup: C.VOID_ATTACK_WINDUP,
    });
    
    // Darker inner core
    this.innerCore = scene.add.circle(0, 0, this.radius * 0.5, C.COLOR_VOID_DARK);
    this.sprite.add(this.innerCore);
    
    // Create laser graphics (separate from sprite for full-arena rendering)
    this.laserGraphics = scene.add.graphics();
    this.laserGraphics.setDepth(50);
    
    // Charge trail graphics
    this.chargeTrail = scene.add.graphics();
    this.chargeTrail.setDepth(5);
    
    // Teleport graphics
    this.teleportGraphics = scene.add.graphics();
    this.teleportGraphics.setDepth(55);
    
    // Area blast graphics
    this.areaBlastGraphics = scene.add.graphics();
    this.areaBlastGraphics.setDepth(60);
    
    // Arena wipe graphics - set to low depth so player is visible above it
    this.arenaWipeGraphics = scene.add.graphics();
    this.arenaWipeGraphics.setDepth(-5); // Below player (depth 0) but above arena background (-10)
  }
  
  setPlayer(player: Player): void {
    this.player = player;
  }
  
  update(dt: number): void {
    console.log('Void: update start');
    this.currentTime += dt;
    
    // Update cooldowns
    console.log('Void: updating cooldowns');
    this.laserCooldown.update(dt);
    this.chargeCooldown.update(dt);
    this.teleportCooldown.update(dt);
    this.laserChargeTimer.update(dt);
    this.laserFireTimer.update(dt);
    this.chargeWindupTimer.update(dt);
    this.chargeDurationTimer.update(dt);
    this.teleportTimer.update(dt);
    
    // Phase 2 cooldowns
    if (this.phase === 2) {
      this.multiLaserCooldown.update(dt);
      this.multiLaserTimer.update(dt);
      this.teleportStrikeCooldown.update(dt);
      this.teleportStrikeTimer.update(dt);
      this.areaBlastCooldown.update(dt);
      this.areaBlastTimer.update(dt);
      this.arenaWipeCooldown.update(dt);
      this.arenaWipeChargeTimer.update(dt);
      this.skillCheckCooldown.update(dt);
    }
    
    // Update reaction timer
    this.reactionTimer.update(dt);
    this.stateTimer.update(dt);
    this.transitionTimer.update(dt);
    
    // Check for Phase 2 transition
    if (this.phase === 1 && this.stats.hp <= 0 && !this.isTransitioning) {
      console.log('VOID: PHASE 1 DEFEATED - TRANSITIONING TO PHASE 2!');
      this.transitionToPhase2();
    }
    
    // Handle phase transition
    if (this.isTransitioning) {
      if (this.transitionTimer.done) {
        this.isTransitioning = false;
        this.stats.hp = C.VOID_PHASE2_HP;
        this.sprite.setAlpha(1);
        console.log('VOID: PHASE 2 ACTIVATED!');
      } else {
        // Pulsing effect during transition
        const progress = this.transitionTimer.progress;
        this.sprite.setAlpha(0.3 + Math.sin(progress * Math.PI * 8) * 0.3);
        return; // Don't do anything else during transition
      }
    }
    
    // Execute pending action after reaction delay
    if (this.reactionTimer.done && this.pendingAction) {
      console.log('Void: executing pending action');
      this.pendingAction();
      this.pendingAction = null;
    }
    
    // Increase aggression over time (gets harder!)
    // Phase 2 starts with higher aggression
    let baseAggression = this.phase === 2 ? 1.5 : 1;
    
    // DESPERATION MODE - when Phase 2 Void is below 50 HP
    if (this.phase === 2 && this.stats.hp <= C.VOID_PHASE2_DESPERATION_HP) {
      baseAggression = 2.5; // Maximum aggression
      // Apply desperation stats if not already applied
      if (this.stats.speed < C.VOID_DESPERATION_SPEED) {
        this.enterDesperationMode();
      }
    }
    
    this.aggressionMultiplier = Math.min(3.0, baseAggression + this.currentTime * 0.008);
    
    // Handle special attack states
    console.log('Void: updateSpecialAttacks');
    this.updateSpecialAttacks();
    
    // Phase 2 new attacks
    if (this.phase === 2) {
      this.updatePhase2Attacks();
    }
    
    // Handle teleport
    console.log('Void: updateTeleport');
    this.updateTeleport();
    
    // AI decision making (if not in special attack)
    if (this.player && this.canMakeDecision() && !this.isArenaWipeCharging) {
      console.log('Void: AI decision making');
      this.observePlayer();
      this.updateTendencies();
      this.decideAction();
    }
    
    // Execute current state behavior (but stop if charging arena wipe)
    if (!this.isArenaWipeCharging) {
      console.log('Void: executeState');
      this.executeState();
    } else {
      // Stop movement during arena wipe charge
      this.vel = vec2();
    }
    
    // Call parent update
    console.log('Void: super.update');
    super.update(dt);
    
    // Update visuals
    console.log('Void: updateLaserVisuals');
    this.updateLaserVisuals();
    
    console.log('Void: updateTeleportVisuals');
    this.updateTeleportVisuals();
    
    // Store previous player data
    if (this.player) {
      this.prevPlayerData = this.player.getActionData();
    }
    
    console.log('Void: update complete');
  }
  
  private canMakeDecision(): boolean {
    return (
      !this.isLaserCharging &&
      !this.isLaserFiring &&
      !this.isChargeWindup &&
      !this.isCharging &&
      !this.isTeleporting &&
      !this.isMultiLaserActive &&
      !this.isTeleportStriking &&
      !this.isAreaBlastActive &&
      !this.isArenaWipeCharging &&
      this.state !== 'stunned' &&
      this.state !== 'hitstun'
    );
  }
  
  private updateSpecialAttacks(): void {
    // LASER charging
    if (this.isLaserCharging) {
      if (this.laserChargeTimer.done) {
        this.isLaserCharging = false;
        this.isLaserFiring = true;
        this.laserFireTimer.start(C.VOID_LASER_DURATION);
        this.state = 'firing_laser' as EntityState;
        music.playLaserFire();
      } else {
        // Track player during charge (but slower near the end)
        if (this.player && this.laserChargeTimer.progress < 0.7) {
          const toPlayer = sub(this.player.pos, this.pos);
          this.laserDirection = normalize(toPlayer);
          this.laserTargetPos = { ...this.player.pos };
        }
        this.vel = vec2(); // Stand still while charging
      }
    }
    
    // LASER firing
    if (this.isLaserFiring) {
      if (this.laserFireTimer.done) {
        this.isLaserFiring = false;
        this.state = 'idle';
      }
      this.vel = vec2();
    }
    
    // CHARGE windup
    if (this.isChargeWindup) {
      if (this.chargeWindupTimer.done) {
        this.isChargeWindup = false;
        this.isCharging = true;
        this.chargeHit = false;
        this.chargeDurationTimer.start(C.VOID_CHARGE_DURATION);
        this.state = 'charge_attack' as EntityState;
      } else {
        // Track player during windup
        if (this.player) {
          const toPlayer = sub(this.player.pos, this.pos);
          this.chargeDirection = normalize(toPlayer);
          this.setFacing(this.chargeDirection);
        }
        this.vel = vec2();
      }
    }
    
    // CHARGING
    if (this.isCharging) {
      if (this.chargeDurationTimer.done) {
        this.isCharging = false;
        this.state = 'idle';
      } else {
        // Move in charge direction at high speed
        this.vel = scale(this.chargeDirection, C.VOID_CHARGE_SPEED);
      }
    }
  }
  
  private updatePhase2Attacks(): void {
    // Multi-laser
    if (this.isMultiLaserActive) {
      if (this.multiLaserTimer.done) {
        this.isMultiLaserActive = false;
      }
    }
    
    // Teleport strike
    if (this.isTeleportStriking) {
      if (this.teleportStrikeTimer.done) {
        this.isTeleportStriking = false;
        this.state = 'idle';
      }
    }
    
    // Area blast
    if (this.isAreaBlastActive) {
      if (this.areaBlastTimer.done) {
        this.isAreaBlastActive = false;
        this.state = 'idle';
      }
    }
    
    // Arena wipe - charging
    if (this.isArenaWipeCharging) {
      if (this.arenaWipeChargeTimer.done) {
        this.isArenaWipeCharging = false;
        this.isArenaWipeActive = true;
        // Keep active for one frame for hit detection
      }
    }
    
    // Arena wipe - active (cleared after hit detection in ArenaScene)
    if (this.isArenaWipeActive) {
      // State is cleared in ArenaScene after hit check
    }
  }
  
  private updateTeleport(): void {
    if (!this.isTeleporting) return;
    
    if (this.teleportPhase === 'out') {
      // Fading out
      if (this.teleportTimer.done) {
        // Actually teleport
        this.pos = { ...this.teleportTarget };
        this.sprite.setPosition(this.pos.x, this.pos.y);
        
        // Start appear phase
        this.teleportPhase = 'in';
        this.teleportTimer.start(C.VOID_TELEPORT_TELEGRAPH * 0.5);
        this.sprite.setAlpha(0);
      } else {
        // Fade out effect
        const progress = this.teleportTimer.progress;
        this.sprite.setAlpha(1 - progress);
      }
      this.vel = vec2();
    } else {
      // Fading in
      if (this.teleportTimer.done) {
        this.isTeleporting = false;
        this.teleportPhase = 'out';
        this.sprite.setAlpha(1);
        this.state = 'idle';
      } else {
        // Fade in effect
        const progress = this.teleportTimer.progress;
        this.sprite.setAlpha(progress);
      }
      this.vel = vec2();
    }
  }
  
  private updateTeleportVisuals(): void {
    this.teleportGraphics.clear();
    
    if (!this.isTeleporting) return;
    
    if (this.teleportPhase === 'out') {
      // Show where void is disappearing from
      const progress = this.teleportTimer.progress;
      const pulseSize = 30 + progress * 20;
      
      this.teleportGraphics.lineStyle(3, C.COLOR_VOID, 1 - progress);
      this.teleportGraphics.strokeCircle(this.pos.x, this.pos.y, pulseSize);
      
      // Show destination marker
      this.teleportGraphics.lineStyle(2, C.COLOR_VOID, 0.3 + progress * 0.5);
      this.teleportGraphics.strokeCircle(this.teleportTarget.x, this.teleportTarget.y, 25);
      
      // Warning ring at destination
      const warningSize = 40 - progress * 15;
      this.teleportGraphics.lineStyle(1, C.COLOR_VOID_LASER, progress * 0.6);
      this.teleportGraphics.strokeCircle(this.teleportTarget.x, this.teleportTarget.y, warningSize);
    } else {
      // Appearing effect
      const progress = this.teleportTimer.progress;
      const pulseSize = 40 * (1 - progress);
      
      this.teleportGraphics.lineStyle(3, C.COLOR_VOID, progress);
      this.teleportGraphics.strokeCircle(this.pos.x, this.pos.y, pulseSize);
    }
  }
  
  private updateLaserVisuals(): void {
    this.laserGraphics.clear();
    this.chargeTrail.clear();
    
    // Laser charge telegraph - simplified
    if (this.isLaserCharging) {
      const progress = this.laserChargeTimer.progress;
      const endPoint = add(this.pos, scale(this.laserDirection, C.VOID_LASER_RANGE));
      
      // Single warning line
      this.laserGraphics.lineStyle(3, C.COLOR_VOID_LASER, 0.3 + progress * 0.4);
      this.laserGraphics.lineBetween(this.pos.x, this.pos.y, endPoint.x, endPoint.y);
    }
    
    // LASER BEAM - simplified
    if (this.isLaserFiring) {
      const endPoint = add(this.pos, scale(this.laserDirection, C.VOID_LASER_RANGE));
      
      // Single beam
      this.laserGraphics.lineStyle(C.VOID_LASER_WIDTH, C.COLOR_VOID_LASER, 0.8);
      this.laserGraphics.lineBetween(this.pos.x, this.pos.y, endPoint.x, endPoint.y);
    }
    
    // PHASE 2: Multi-Laser
    if (this.isMultiLaserActive && this.phase === 2) {
      for (const dir of this.multiLaserDirections) {
        const endPoint = add(this.pos, scale(dir, C.VOID_LASER_RANGE));
        this.laserGraphics.lineStyle(C.VOID_LASER_WIDTH, C.COLOR_VOID_LASER, 0.7);
        this.laserGraphics.lineBetween(this.pos.x, this.pos.y, endPoint.x, endPoint.y);
      }
    }
    
    // PHASE 2: Area Blast
    if (this.isAreaBlastActive && this.phase === 2) {
      const progress = this.areaBlastTimer.progress;
      const radius = C.VOID_PHASE2_AREA_BLAST_RADIUS * progress;
      
      // Warning circle (expanding)
      this.areaBlastGraphics.clear();
      this.areaBlastGraphics.lineStyle(4, C.COLOR_VOID_LASER, 0.8 - progress * 0.5);
      this.areaBlastGraphics.strokeCircle(this.pos.x, this.pos.y, radius);
      
      // Inner glow
      this.areaBlastGraphics.fillStyle(C.COLOR_VOID_LASER, 0.3 * (1 - progress));
      this.areaBlastGraphics.fillCircle(this.pos.x, this.pos.y, radius * 0.7);
    } else {
      this.areaBlastGraphics.clear();
    }
    
    // PHASE 2: Arena Wipe - 360 degree attack, only safe behind pillars
    if (this.isArenaWipeCharging && this.phase === 2) {
      const progress = this.arenaWipeChargeTimer.progress;
      this.arenaWipeGraphics.clear();
      
      // Draw full arena as dangerous (red overlay)
      const alpha = 0.2 + progress * 0.3; // Gets brighter as it charges
      this.arenaWipeGraphics.fillStyle(C.COLOR_WARNING_ARENA_WIPE, alpha);
      this.arenaWipeGraphics.fillRect(0, 0, C.ARENA_WIDTH, C.ARENA_HEIGHT);
      
      // Draw safe zones behind pillars (subtract from dangerous area)
      // For each pillar, draw a "shadow" zone behind it from Void's perspective
      for (const pillar of C.PILLARS) {
        // Calculate shadow zone - area behind pillar relative to Void
        const toPillar = {
          x: pillar.x - this.pos.x,
          y: pillar.y - this.pos.y,
        };
        const distToPillar = Math.sqrt(toPillar.x * toPillar.x + toPillar.y * toPillar.y);
        const pillarDir = { x: toPillar.x / distToPillar, y: toPillar.y / distToPillar };
        
        // Safe zone extends behind pillar
        const safeZoneSize = Math.max(pillar.width, pillar.height) * 1.5;
        const safeZoneCenter = {
          x: pillar.x + pillarDir.x * safeZoneSize,
          y: pillar.y + pillarDir.y * safeZoneSize,
        };
        
        // Draw safe zone (subtract from red overlay by drawing in arena color)
        this.arenaWipeGraphics.fillStyle(C.COLOR_ARENA_BG, 1);
        this.arenaWipeGraphics.fillCircle(safeZoneCenter.x, safeZoneCenter.y, safeZoneSize);
        
        // Outline safe zone
        this.arenaWipeGraphics.lineStyle(3, 0x00ff00, 0.5 + progress * 0.3); // Green outline
        this.arenaWipeGraphics.strokeCircle(safeZoneCenter.x, safeZoneCenter.y, safeZoneSize);
      }
      
      // Draw warning outline around arena
      const outlineAlpha = 0.5 + progress * 0.5;
      this.arenaWipeGraphics.lineStyle(6, C.COLOR_WARNING_ARENA_WIPE, outlineAlpha);
      this.arenaWipeGraphics.strokeRect(0, 0, C.ARENA_WIDTH, C.ARENA_HEIGHT);
    } else if (this.isArenaWipeActive && this.phase === 2) {
      // Flash effect when it fires - full red
      this.arenaWipeGraphics.clear();
      this.arenaWipeGraphics.fillStyle(C.COLOR_WARNING_ARENA_WIPE, 0.6);
      this.arenaWipeGraphics.fillRect(0, 0, C.ARENA_WIDTH, C.ARENA_HEIGHT);
      
      // Show safe zones one more time
      for (const pillar of C.PILLARS) {
        const toPillar = {
          x: pillar.x - this.pos.x,
          y: pillar.y - this.pos.y,
        };
        const distToPillar = Math.sqrt(toPillar.x * toPillar.x + toPillar.y * toPillar.y);
        const pillarDir = { x: toPillar.x / distToPillar, y: toPillar.y / distToPillar };
        const safeZoneSize = Math.max(pillar.width, pillar.height) * 1.5;
        const safeZoneCenter = {
          x: pillar.x + pillarDir.x * safeZoneSize,
          y: pillar.y + pillarDir.y * safeZoneSize,
        };
        this.arenaWipeGraphics.fillStyle(C.COLOR_ARENA_BG, 1);
        this.arenaWipeGraphics.fillCircle(safeZoneCenter.x, safeZoneCenter.y, safeZoneSize);
      }
    } else {
      this.arenaWipeGraphics.clear();
    }
    
    // Charge windup indicator - simplified
    if (this.isChargeWindup) {
      const progress = this.chargeWindupTimer.progress;
      const arrowLength = 60 + progress * 40;
      const endPoint = add(this.pos, scale(this.chargeDirection, arrowLength));
      
      this.chargeTrail.lineStyle(4, C.COLOR_VOID, 0.6);
      this.chargeTrail.lineBetween(this.pos.x, this.pos.y, endPoint.x, endPoint.y);
    }
    
    // Charge trail - simplified
    if (this.isCharging) {
      this.chargeTrail.fillStyle(C.COLOR_VOID, 0.3);
      this.chargeTrail.fillCircle(this.pos.x, this.pos.y, this.radius * 1.2);
    }
  }
  
  // Start laser attack
  startLaser(): boolean {
    if (!this.canMakeDecision()) return false;
    if (!this.laserCooldown.trigger()) return false;
    
    this.isLaserCharging = true;
    this.laserChargeTimer.start(C.VOID_LASER_CHARGE);
    this.state = 'charging_laser' as EntityState;
    
    music.playLaserCharge();
    
    if (this.player) {
      const toPlayer = sub(this.player.pos, this.pos);
      this.laserDirection = normalize(toPlayer);
      this.laserTargetPos = { ...this.player.pos };
    }
    
    return true;
  }
  
  // Start charge attack
  startChargeAttack(): boolean {
    if (!this.canMakeDecision()) return false;
    if (!this.chargeCooldown.trigger()) return false;
    
    this.isChargeWindup = true;
    this.chargeWindupTimer.start(C.VOID_CHARGE_WINDUP);
    this.state = 'charge_wind' as EntityState;
    
    if (this.player) {
      const toPlayer = sub(this.player.pos, this.pos);
      this.chargeDirection = normalize(toPlayer);
    }
    
    return true;
  }
  
  // Start teleport
  startTeleport(): boolean {
    if (!this.canMakeDecision()) return false;
    if (!this.teleportCooldown.trigger()) return false;
    if (!this.player) return false;
    
    // Find a good teleport destination
    this.teleportTarget = this.findTeleportDestination();
    
    this.isTeleporting = true;
    this.teleportPhase = 'out';
    this.teleportTimer.start(C.VOID_TELEPORT_TELEGRAPH);
    this.state = 'teleport_out' as EntityState;
    
    music.playTeleportSound();
    
    return true;
  }
  
  private findTeleportDestination(): Vec2 {
    if (!this.player) return this.pos;
    
    const margin = 60;
    let bestPos = this.pos;
    let bestScore = -1;
    
    // Try several random positions and pick the best one
    for (let i = 0; i < 10; i++) {
      const pos = {
        x: randomRange(margin + C.WALL_THICKNESS, C.ARENA_WIDTH - margin - C.WALL_THICKNESS),
        y: randomRange(margin + C.WALL_THICKNESS + 80, C.ARENA_HEIGHT - margin - C.WALL_THICKNESS),
      };
      
      // Check minimum distance from current position
      const distFromCurrent = distance(pos, this.pos);
      if (distFromCurrent < C.VOID_TELEPORT_MIN_DISTANCE) continue;
      
      // Check not too close to player
      const distFromPlayer = distance(pos, this.player.pos);
      if (distFromPlayer < 100) continue;
      
      // Check not in a pillar
      let inPillar = false;
      for (const p of C.PILLARS) {
        if (pos.x > p.x - p.width/2 - 20 && pos.x < p.x + p.width/2 + 20 &&
            pos.y > p.y - p.height/2 - 20 && pos.y < p.y + p.height/2 + 20) {
          inPillar = true;
          break;
        }
      }
      if (inPillar) continue;
      
      // Score: prefer positions at medium distance from player, good angles
      let score = 0;
      
      // Medium distance is good (150-300)
      if (distFromPlayer > 150 && distFromPlayer < 300) {
        score += 50;
      } else if (distFromPlayer > 100 && distFromPlayer < 400) {
        score += 25;
      }
      
      // Prefer flanking positions (not directly in front/behind)
      const toPlayer = normalize(sub(this.player.pos, pos));
      const playerFacing = this.player.facing;
      const dot = toPlayer.x * playerFacing.x + toPlayer.y * playerFacing.y;
      if (Math.abs(dot) < 0.5) {
        score += 30; // Flanking bonus
      }
      
      // Some randomness
      score += randomRange(0, 20);
      
      if (score > bestScore) {
        bestScore = score;
        bestPos = pos;
      }
    }
    
    return bestPos;
  }
  
  // PHASE 2 ATTACKS
  
  startMultiLaser(): boolean {
    if (!this.canMakeDecision()) return false;
    if (!this.multiLaserCooldown.trigger()) return false;
    if (!this.player) return false;
    
    this.isMultiLaserActive = true;
    this.multiLaserTimer.start(0.8);
    
    music.playLaserCharge();
    
    // Create 3 laser directions
    const toPlayer = normalize(sub(this.player.pos, this.pos));
    const baseAngle = Math.atan2(toPlayer.y, toPlayer.x);
    
    this.multiLaserDirections = [];
    for (let i = 0; i < 3; i++) {
      const angle = baseAngle + (i - 1) * 0.3; // Spread 30 degrees each
      this.multiLaserDirections.push(fromAngle(angle));
    }
    
    return true;
  }
  
  startTeleportStrike(): boolean {
    if (!this.canMakeDecision()) return false;
    if (!this.teleportStrikeCooldown.trigger()) return false;
    if (!this.player) return false;
    
    // Teleport behind player
    const toPlayer = normalize(sub(this.player.pos, this.pos));
    const behindPlayer = add(this.player.pos, scale(toPlayer, -80));
    
    // Instant teleport (no telegraph in Phase 2)
    this.pos = behindPlayer;
    this.sprite.setPosition(this.pos.x, this.pos.y);
    
    music.playTeleportSound();
    
    // Face player and attack immediately
    this.setFacing(normalize(sub(this.player.pos, this.pos)));
    this.isTeleportStriking = true;
    this.teleportStrikeTimer.start(0.3);
    this.startAttack(); // Immediate attack
    
    return true;
  }
  
  startAreaBlast(): boolean {
    if (!this.canMakeDecision()) return false;
    if (!this.areaBlastCooldown.trigger()) return false;
    
    this.isAreaBlastActive = true;
    this.areaBlastTimer.start(1.0);
    this.vel = vec2(); // Stand still
    
    return true;
  }
  
  startArenaWipe(): boolean {
    if (!this.canMakeDecision()) return false;
    if (!this.arenaWipeCooldown.trigger()) return false;
    if (!this.player) return false;
    
    // Face player and lock direction
    const toPlayer = normalize(sub(this.player.pos, this.pos));
    this.arenaWipeDirection = toPlayer;
    this.setFacing(toPlayer);
    
    // Start charging
    this.isArenaWipeCharging = true;
    this.arenaWipeChargeTimer.start(C.VOID_PHASE2_ARENA_WIPE_CHARGE);
    this.vel = vec2(); // Stand still
    
    return true;
  }
  
  private observePlayer(): void {
    if (!this.player || !this.prevPlayerData) return;
    
    const currentData = this.player.getActionData();
    const toVoid = sub(this.pos, this.player.pos);
    
    // Detect dash start
    if (currentData.isDashing && !this.prevPlayerData.isDashing) {
      const dashDir = normalize(this.player.vel);
      const toVoidNorm = normalize(toVoid);
      const dotProduct = dashDir.x * toVoidNorm.x + dashDir.y * toVoidNorm.y;
      
      if (dotProduct > 0.5) {
        this.recordAction('dash_toward');
      } else if (dotProduct < -0.3) {
        this.recordAction('dash_away');
      }
    }
    
    // Detect dash end (punish window)
    if (!currentData.isDashing && this.prevPlayerData.isDashing) {
      this.playerDashEndTime = this.currentTime;
    }
    
    // Detect attack start
    if (currentData.isAttacking && !this.prevPlayerData.isAttacking) {
      this.recordAction('attack');
    }
    
    // Detect attack end (punish window)
    if (!currentData.isAttacking && this.prevPlayerData.isAttacking) {
      this.playerAttackEndTime = this.currentTime;
    }
    
    // Detect parry
    if (currentData.isParrying && !this.prevPlayerData.isParrying) {
      this.recordAction('parry');
    }
  }
  
  private recordAction(type: ActionRecord['type']): void {
    this.actionHistory.push({ time: this.currentTime, type });
    
    const cutoff = this.currentTime - C.AI_TENDENCY_WINDOW;
    this.actionHistory = this.actionHistory.filter(a => a.time > cutoff);
  }
  
  private updateTendencies(): void {
    if (!this.player) return;
    
    const window = C.AI_TENDENCY_WINDOW;
    const recent = this.actionHistory;
    
    const dashToward = recent.filter(a => a.type === 'dash_toward').length;
    const dashAway = recent.filter(a => a.type === 'dash_away').length;
    const attacks = recent.filter(a => a.type === 'attack').length;
    const parries = recent.filter(a => a.type === 'parry').length;
    const totalDashes = dashToward + dashAway;
    
    const smooth = 0.3;
    
    this.tendencies.dashTowardsRate = this.lerp(
      this.tendencies.dashTowardsRate,
      totalDashes > 0 ? dashToward / totalDashes : 0.5,
      smooth
    );
    
    this.tendencies.dashAwayRate = this.lerp(
      this.tendencies.dashAwayRate,
      totalDashes > 0 ? dashAway / totalDashes : 0.5,
      smooth
    );
    
    this.tendencies.attackSpamRate = this.lerp(
      this.tendencies.attackSpamRate,
      attacks / window,
      smooth
    );
    
    this.tendencies.parryUsageRate = this.lerp(
      this.tendencies.parryUsageRate,
      parries / window,
      smooth
    );
    
    const dist = distance(this.pos, this.player.pos);
    this.tendencies.preferredDistance = this.lerp(
      this.tendencies.preferredDistance,
      dist,
      0.1
    );
    
    this.tendencies.aggressiveness = this.lerp(
      this.tendencies.aggressiveness,
      Math.min(1, (this.tendencies.dashTowardsRate * 0.4 + this.tendencies.attackSpamRate * 0.6)),
      smooth
    );
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  private decideAction(): void {
    if (!this.player) return;
    
    const dist = distance(this.pos, this.player.pos);
    const playerData = this.player.getActionData();
    
    // PHASE 2 ATTACKS - Much more aggressive
    if (this.phase === 2) {
      // Area Blast - devastating AOE
      if (this.areaBlastCooldown.ready && dist < 200) {
        const areaChance = 0.4 * this.aggressionMultiplier;
        if (Math.random() < areaChance) {
          this.queueAction(() => this.startAreaBlast(), 0.03);
          return;
        }
      }
      
      // Teleport Strike - teleport behind and attack
      if (this.teleportStrikeCooldown.ready && dist > 100) {
        const strikeChance = 0.5 * this.aggressionMultiplier;
        if (Math.random() < strikeChance) {
          this.queueAction(() => this.startTeleportStrike(), 0.02);
          return;
        }
      }
      
      // Multi-Laser - triple laser barrage
      if (this.multiLaserCooldown.ready && dist > 150 && dist < 600) {
        const multiChance = 0.45 * this.aggressionMultiplier;
        if (Math.random() < multiChance) {
          this.queueAction(() => this.startMultiLaser(), 0.04);
          return;
        }
      }
      
      // Arena Wipe - insta-kill attack (rare, but deadly)
      if (this.arenaWipeCooldown.ready && dist > 200) {
        const wipeChance = 0.12 * this.aggressionMultiplier; // 12% base chance
        if (Math.random() < wipeChance) {
          this.queueAction(() => this.startArenaWipe(), 0.05);
          return;
        }
      }
    }
    
    // TELEPORT - use randomly or when player gets too close (faster in Phase 2)
    if (this.teleportCooldown.ready) {
      // Random teleport chance
      const teleportChance = 0.15 * this.aggressionMultiplier;
      // Higher chance if player is very close
      const distancePressure = dist < 80 ? 0.4 : (dist < 120 ? 0.2 : 0);
      
      if (Math.random() < teleportChance + distancePressure) {
        this.queueAction(() => this.startTeleport(), 0.02);
        return;
      }
    }
    
    // LASER ATTACK - use when player is at medium-long range
    if (this.laserCooldown.ready && dist > 120 && dist < 500) {
      const laserChance = 0.35 * this.aggressionMultiplier;
      if (Math.random() < laserChance) {
        this.queueAction(() => this.startLaser(), 0.05);
        return;
      }
    }
    
    // CHARGE ATTACK - use when player is far
    if (this.chargeCooldown.ready && dist > 250) {
      const chargeChance = 0.3 * this.aggressionMultiplier;
      if (Math.random() < chargeChance) {
        this.queueAction(() => this.startChargeAttack(), 0.05);
        return;
      }
    }
    
    // Check for punish opportunities (highest priority for melee)
    const timeSinceDashEnd = this.currentTime - this.playerDashEndTime;
    const timeSinceAttackEnd = this.currentTime - this.playerAttackEndTime;
    const punishWindow = 0.2;
    
    if ((timeSinceDashEnd < punishWindow || timeSinceAttackEnd < punishWindow) && 
        dist < this.stats.attackRange * 1.5) {
      this.queueAction(() => this.transitionTo('punish'));
      return;
    }
    
    // React to player attack with shield (VERY good at this)
    if (playerData.isAttacking && dist < this.stats.attackRange * 1.3) {
      const parryChance = 0.6 + this.tendencies.attackSpamRate * 0.3;
      if (Math.random() < parryChance && this.canShield() && this.shieldEnergy > C.SHIELD_MIN_TO_USE) {
        this.queueAction(() => this.startShield());
        return;
      }
    }
    
    // React to player dash toward with evade or teleport
    if (playerData.isDashing && this.tendencies.dashTowardsRate > 0.5) {
      if (this.teleportCooldown.ready && Math.random() < 0.3) {
        this.queueAction(() => this.startTeleport(), 0.03);
        return;
      }
      if (this.dashCooldown.ready && Math.random() < 0.6) {
        this.queueAction(() => this.transitionTo('evade'));
        return;
      }
    }
    
    // State machine based on distance and situation
    if (this.stateTimer.done) {
      this.decideNextState(dist, playerData);
    }
  }
  
  private decideNextState(dist: number, _playerData: PlayerActionData): void {
    const scores: Record<string, number> = {
      observe: 0,
      probe: 0,
      commit: 0,
      evade: 0,
      parry: 0,
      punish: 0,
    };
    
    const optimalDist = C.AI_OPTIMAL_DISTANCE;
    const attackRange = this.stats.attackRange;
    
    // Observe: prefer being at optimal distance (now further away)
    scores.observe = (1 - Math.abs(dist - optimalDist) / 150) * 0.6;
    
    // Probe: good when at medium range
    if (dist > attackRange && dist < optimalDist * 1.8) {
      scores.probe = 0.5 * this.aggressionMultiplier;
    }
    
    // Commit: only when close enough and ready
    if (dist < attackRange * 1.3 && this.attackCooldown.ready) {
      scores.commit = 0.7 * this.aggressionMultiplier;
      if (this.tendencies.parryUsageRate > 0.5) {
        scores.commit -= 0.2;
      }
    }
    
    // Evade: when too close
    if (dist < optimalDist * 0.6 && this.dashCooldown.ready) {
      scores.evade = 0.5;
    }
    
    // Add randomness
    for (const key of Object.keys(scores)) {
      scores[key] += randomRange(-C.AI_RANDOMNESS, C.AI_RANDOMNESS);
    }
    
    // Pick highest scoring state
    let bestState: VoidAIState = 'observe';
    let bestScore = -1;
    
    for (const [state, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestState = state as VoidAIState;
      }
    }
    
    this.transitionTo(bestState);
  }
  
  private transitionTo(newState: VoidAIState): void {
    this.aiState = newState;
    
    switch (newState) {
      case 'observe':
        this.stateTimer.start(randomRange(0.3, 0.6));
        break;
      case 'probe':
        this.stateTimer.start(randomRange(0.2, 0.4));
        if (this.player) {
          const toPlayer = normalize(sub(this.player.pos, this.pos));
          const ang = Math.atan2(toPlayer.y, toPlayer.x);
          const probeAngle = ang + randomRange(-0.6, 0.6);
          this.probeDirection = fromAngle(probeAngle);
        }
        break;
      case 'commit':
        this.stateTimer.start(0.1);
        break;
      case 'evade':
        this.stateTimer.start(0.1);
        break;
      case 'parry':
        this.stateTimer.start(0.1);
        break;
      case 'punish':
        this.stateTimer.start(0.12);
        break;
    }
  }
  
  private queueAction(action: () => void, minDelay?: number): void {
    if (this.pendingAction) return;
    
    const baseDelay = minDelay ?? randomRange(C.AI_REACTION_MIN, C.AI_REACTION_MAX);
    const delay = baseDelay / this.aggressionMultiplier;
    this.reactionTimer.start(Math.max(0.02, delay));
    this.pendingAction = action;
  }
  
  private executeState(): void {
    if (!this.player) return;
    if (!this.canMakeDecision()) return;
    
    const toPlayer = sub(this.player.pos, this.pos);
    const dist = length(toPlayer);
    const dirToPlayer = dist > 0 ? normalize(toPlayer) : vec2(1, 0);
    
    // Always face the player
    this.setFacing(dirToPlayer);
    
    switch (this.aiState) {
      case 'observe':
        this.executeObserve(dirToPlayer, dist);
        break;
      case 'probe':
        this.executeProbe();
        break;
      case 'commit':
        this.executeCommit(dirToPlayer, dist);
        break;
      case 'evade':
        this.executeEvade(dirToPlayer);
        break;
      case 'parry':
        this.executeParry();
        break;
      case 'punish':
        this.executePunish(dirToPlayer, dist);
        break;
    }
  }
  
  private executeObserve(dirToPlayer: Vec2, dist: number): void {
    const optimalDist = C.AI_OPTIMAL_DISTANCE;
    const tolerance = 30;
    
    if (dist < optimalDist - tolerance) {
      // Too close, back away more decisively
      this.vel = scale(dirToPlayer, -this.stats.speed * 0.7);
    } else if (dist > optimalDist + tolerance * 2) {
      // Too far, approach but not too fast
      this.vel = scale(dirToPlayer, this.stats.speed * 0.5);
    } else {
      // Good distance, strafe and circle
      const perpendicular = vec2(-dirToPlayer.y, dirToPlayer.x);
      const strafeDir = Math.sin(this.currentTime * 2.5) > 0 ? 1 : -1;
      this.vel = scale(perpendicular, this.stats.speed * 0.6 * strafeDir);
    }
  }
  
  private executeProbe(): void {
    this.vel = scale(this.probeDirection, this.stats.speed * 0.7);
  }
  
  private executeCommit(dirToPlayer: Vec2, dist: number): void {
    if (dist <= this.stats.attackRange && this.attackCooldown.ready) {
      this.startAttack();
      this.transitionTo('observe');
    } else {
      // Rush in
      this.vel = scale(dirToPlayer, this.stats.speed * 1.1);
    }
  }
  
  private executeEvade(dirToPlayer: Vec2): void {
    if (this.dashCooldown.ready) {
      const escapeAngle = Math.atan2(-dirToPlayer.y, -dirToPlayer.x);
      const offsetAngle = escapeAngle + randomRange(-0.5, 0.5);
      this.setFacing(fromAngle(offsetAngle));
      this.startDash();
      this.transitionTo('observe');
    } else {
      this.vel = scale(dirToPlayer, -this.stats.speed);
    }
  }
  
  private executeParry(): void {
    if (this.canShield() && this.shieldEnergy > C.SHIELD_MIN_TO_USE) {
      this.startShield();
    }
    this.vel = vec2();
    this.transitionTo('observe');
  }
  
  private executePunish(dirToPlayer: Vec2, dist: number): void {
    if (dist <= this.stats.attackRange && this.attackCooldown.ready) {
      this.startAttack();
      this.transitionTo('observe');
    } else if (dist <= this.stats.attackRange * 2) {
      // Rush for punish
      this.vel = scale(dirToPlayer, this.stats.speed * 1.2);
    } else {
      this.transitionTo('observe');
    }
  }
  
  getCurrentAIState(): VoidAIState {
    return this.aiState;
  }
  
  getTendencies(): PlayerTendencies {
    return { ...this.tendencies };
  }
  
  takeDamage(amount: number, knockback: Vec2 = vec2()): void {
    // In Phase 1, prevent HP from going below 0 (will trigger phase transition)
    if (this.phase === 1 && this.stats.hp - amount <= 0) {
      this.stats.hp = 0;
      // Phase transition will happen in update()
    } else {
      // Normal damage
      super.takeDamage(amount, knockback);
    }
  }
  
  private transitionToPhase2(): void {
    console.log('TRANSITIONING TO PHASE 2!');
    this.phase = 2;
    this.isTransitioning = true;
    this.transitionTimer.start(2.0);
    
    // Update stats for Phase 2
    this.stats.maxHp = C.VOID_PHASE2_HP;
    this.stats.speed = C.VOID_PHASE2_SPEED;
    this.stats.damage = C.VOID_PHASE2_DAMAGE;
    
    // Update cooldowns for Phase 2 (faster)
    this.laserCooldown.setCooldown(C.VOID_PHASE2_LASER_COOLDOWN);
    this.chargeCooldown.setCooldown(C.VOID_PHASE2_CHARGE_COOLDOWN);
    this.teleportCooldown.setCooldown(C.VOID_PHASE2_TELEPORT_COOLDOWN);
    this.attackCooldown.setCooldown(C.VOID_PHASE2_ATTACK_COOLDOWN);
    
    // Visual transformation - NEW APPEARANCE
    this.body.setFillStyle(C.COLOR_VOID_PHASE2);
    if (this.innerCore) {
      this.innerCore.setFillStyle(0x2d1b4e); // Even darker
    }
    
    // Add Phase 2 spikes (menacing appearance)
    this.createPhase2Spikes();
    
    // Reset all active states
    this.isLaserCharging = false;
    this.isLaserFiring = false;
    this.isChargeWindup = false;
    this.isCharging = false;
    this.isTeleporting = false;
    this.isMultiLaserActive = false;
    this.isTeleportStriking = false;
    this.isAreaBlastActive = false;
    this.state = 'idle';
    this.vel = vec2();
    
    // Screen flash effect (handled in scene)
  }
  
  private enterDesperationMode(): void {
    console.log('VOID ENTERING DESPERATION MODE! < 50 HP!');
    
    // Even faster and stronger
    this.stats.speed = C.VOID_DESPERATION_SPEED;
    this.stats.damage = C.VOID_DESPERATION_DAMAGE;
    
    // Faster cooldowns
    this.laserCooldown.setCooldown(C.VOID_DESPERATION_LASER_COOLDOWN);
    this.teleportCooldown.setCooldown(C.VOID_DESPERATION_TELEPORT_COOLDOWN);
    this.attackCooldown.setCooldown(C.VOID_DESPERATION_ATTACK_COOLDOWN);
    
    // Visual change - more intense
    this.body.setFillStyle(0xff0000, 0.8); // Red tint
    if (this.innerCore) {
      this.innerCore.setFillStyle(0xcc0000);
    }
    
    // Make spikes pulse faster
    for (const spike of this.phase2Spikes) {
      this.scene.tweens.add({
        targets: spike,
        scale: { from: 0.7, to: 1.5 },
        duration: 200,
        yoyo: true,
        repeat: -1,
      });
    }
  }
  
  private createPhase2Spikes(): void {
    // Clear old spikes
    for (const spike of this.phase2Spikes) {
      spike.destroy();
    }
    this.phase2Spikes = [];
    
    // Create 8 spikes around the body
    const spikeCount = 8;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2;
      const spikeContainer = this.scene.add.container(0, 0);
      
      // Spike triangle
      const spike = this.scene.add.triangle(
        Math.cos(angle) * (this.radius + 8),
        Math.sin(angle) * (this.radius + 8),
        0, -6,
        8, 0,
        0, 6,
        C.COLOR_VOID_PHASE2_SPIKE
      );
      spike.setRotation(angle);
      spikeContainer.add(spike);
      
      // Glow effect
      const glow = this.scene.add.circle(
        Math.cos(angle) * (this.radius + 8),
        Math.sin(angle) * (this.radius + 8),
        4,
        C.COLOR_VOID_PHASE2_SPIKE,
        0.6
      );
      spikeContainer.add(glow);
      
      this.sprite.add(spikeContainer);
      this.phase2Spikes.push(spikeContainer);
      
      // Pulsing animation
      this.scene.tweens.add({
        targets: spikeContainer,
        scale: { from: 0.8, to: 1.2 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        delay: i * 50,
      });
    }
  }
  
  reset(x: number, y: number): void {
    super.reset(x, y);
    
    // Reset to Phase 1
    this.phase = 1;
    this.isTransitioning = false;
    this.transitionTimer.reset();
    
    // Reset stats to Phase 1
    this.stats.maxHp = C.VOID_HP;
    this.stats.hp = C.VOID_HP;
    this.stats.speed = C.VOID_SPEED;
    this.stats.damage = C.VOID_DAMAGE;
    
    // Reset visual (in case desperation mode was active)
    this.body.setFillStyle(C.COLOR_VOID);
    
    // Reset cooldowns to Phase 1 values
    this.laserCooldown.setCooldown(C.VOID_LASER_COOLDOWN);
    this.chargeCooldown.setCooldown(C.VOID_CHARGE_COOLDOWN);
    this.teleportCooldown.setCooldown(C.VOID_TELEPORT_COOLDOWN);
    this.attackCooldown.setCooldown(C.VOID_ATTACK_COOLDOWN);
    
    // Reset visual to Phase 1
    this.body.setFillStyle(C.COLOR_VOID);
    if (this.innerCore) {
      this.innerCore.setFillStyle(C.COLOR_VOID_DARK);
    }
    
    this.aiState = 'observe';
    this.aggressionMultiplier = 1;
    this.currentTime = 0;
    
    this.laserCooldown.reset();
    this.chargeCooldown.reset();
    this.teleportCooldown.reset();
    this.laserChargeTimer.reset();
    this.laserFireTimer.reset();
    this.chargeWindupTimer.reset();
    this.chargeDurationTimer.reset();
    this.teleportTimer.reset();
    
    this.isLaserCharging = false;
    this.isLaserFiring = false;
    this.isChargeWindup = false;
    this.isCharging = false;
    this.chargeHit = false;
    this.isTeleporting = false;
    this.teleportPhase = 'out';
    
    // Phase 2 reset
    this.isMultiLaserActive = false;
    this.isTeleportStriking = false;
    this.isAreaBlastActive = false;
    this.multiLaserCooldown.reset();
    this.teleportStrikeCooldown.reset();
    this.areaBlastCooldown.reset();
    this.arenaWipeCooldown.reset();
    this.skillCheckCooldown.reset();
    
    // Reset arena wipe state
    this.isArenaWipeCharging = false;
    this.isArenaWipeActive = false;
    this.arenaWipeChargeTimer.reset();
    
    // Clear Phase 2 spikes
    for (const spike of this.phase2Spikes) {
      spike.destroy();
    }
    this.phase2Spikes = [];
    
    this.sprite.setAlpha(1);
    
    this.actionHistory = [];
    this.tendencies = {
      dashTowardsRate: 0.5,
      dashAwayRate: 0.5,
      attackSpamRate: 0,
      parryUsageRate: 0,
      preferredDistance: 150,
      aggressiveness: 0.5,
    };
    
    this.laserGraphics.clear();
    this.chargeTrail.clear();
    this.teleportGraphics.clear();
    this.areaBlastGraphics.clear();
    this.arenaWipeGraphics.clear();
  }
  
  destroy(): void {
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween.destroy();
      this.pulseTween = null;
    }
    this.laserGraphics.destroy();
    this.chargeTrail.destroy();
    this.teleportGraphics.destroy();
    this.areaBlastGraphics.destroy();
    this.arenaWipeGraphics.destroy();
  }
}
