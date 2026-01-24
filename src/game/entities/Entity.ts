/**
 * Base entity class for Player and Void
 */

import Phaser from 'phaser';
import { Vec2, vec2, add, scale, normalize, length } from '../utils/math';
import { Timer, Cooldown } from '../utils/timer';
import * as C from '../utils/constants';

export type EntityState = 
  | 'idle'
  | 'moving'
  | 'dashing'
  | 'attacking'
  | 'shielding'  // Changed from parrying
  | 'stunned'
  | 'hitstun'
  | 'charging_laser'
  | 'firing_laser'
  | 'charge_attack';

export interface EntityStats {
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackRange: number;
  attackCooldown: number;
  attackWindup: number;
}

export abstract class Entity {
  public scene: Phaser.Scene;
  public sprite: Phaser.GameObjects.Container;
  public body: Phaser.GameObjects.Arc;
  
  public pos: Vec2;
  public vel: Vec2 = vec2();
  public facing: Vec2 = vec2(1, 0);
  public facingAngle: number = 0;
  
  public state: EntityState = 'idle';
  public stats: EntityStats;
  
  // Timers
  public dashTimer: Timer = new Timer(C.DASH_DURATION);
  public dashCooldown: Cooldown = new Cooldown(C.DASH_COOLDOWN);
  public attackTimer: Timer = new Timer(C.ATTACK_WINDUP + C.ATTACK_ACTIVE);
  public attackCooldown: Cooldown;
  public stunTimer: Timer = new Timer();
  public hitstunTimer: Timer = new Timer(C.HITSTUN_DURATION);
  public slowTimer: Timer = new Timer();
  
  // NEW SHIELD SYSTEM
  public shieldEnergy: number = C.SHIELD_MAX;
  public shieldRegenTimer: number = 0; // Time since last shield use
  public isShielding: boolean = false;
  
  // Attack state
  public isAttackWindup: boolean = false;
  public isAttackActive: boolean = false;
  public attackHitThisSwing: boolean = false;
  public attackDirection: Vec2 = vec2(1, 0);
  
  // Visual elements
  public attackArc: Phaser.GameObjects.Graphics | null = null;
  public shieldVisual: Phaser.GameObjects.Graphics | null = null;
  
  protected color: number;
  protected radius: number = C.ENTITY_RADIUS;
  
  constructor(scene: Phaser.Scene, x: number, y: number, color: number, stats: Partial<EntityStats> = {}) {
    this.scene = scene;
    this.pos = vec2(x, y);
    this.color = color;
    
    this.stats = {
      hp: stats.hp ?? C.PLAYER_HP,
      maxHp: stats.maxHp ?? stats.hp ?? C.PLAYER_HP,
      speed: stats.speed ?? C.PLAYER_SPEED,
      damage: stats.damage ?? C.ATTACK_DAMAGE,
      attackRange: stats.attackRange ?? C.ATTACK_RANGE,
      attackCooldown: stats.attackCooldown ?? C.ATTACK_COOLDOWN,
      attackWindup: stats.attackWindup ?? C.ATTACK_WINDUP,
    };
    
    this.attackCooldown = new Cooldown(this.stats.attackCooldown);
    
    // Create visual container
    this.sprite = scene.add.container(x, y);
    
    // Main body circle
    this.body = scene.add.circle(0, 0, this.radius, color);
    this.body.setStrokeStyle(2, 0xffffff, 0.3);
    this.sprite.add(this.body);
    
    // Direction indicator
    const dirIndicator = scene.add.triangle(
      this.radius + 4, 0,
      0, -4,
      8, 0,
      0, 4,
      color
    );
    dirIndicator.setAlpha(0.8);
    this.sprite.add(dirIndicator);
    
    // Attack arc graphics (for telegraph)
    this.attackArc = scene.add.graphics();
    this.sprite.add(this.attackArc);
    
    // Shield visual (new)
    this.shieldVisual = scene.add.graphics();
    this.sprite.add(this.shieldVisual);
  }
  
  update(dt: number): void {
    // Update cooldowns
    this.dashCooldown.update(dt);
    this.attackCooldown.update(dt);
    
    // Update timers
    this.dashTimer.update(dt);
    this.attackTimer.update(dt);
    this.stunTimer.update(dt);
    this.hitstunTimer.update(dt);
    this.slowTimer.update(dt);
    
    // Update shield regeneration
    this.updateShield(dt);
    
    // State transitions
    this.updateState(dt);
    
    // Apply movement
    this.applyMovement(dt);
    
    // Update visuals
    this.updateVisuals();
  }
  
  protected updateShield(dt: number): void {
    if (this.isShielding && this.shieldEnergy > 0) {
      // Drain shield while holding - Phase 2 has longer duration (3 seconds)
      const drainRate = (this as any).phase === 2 ? C.SHIELD_DRAIN_RATE_PHASE2 : C.SHIELD_DRAIN_RATE;
      this.shieldEnergy = Math.max(0, this.shieldEnergy - drainRate * dt);
      this.shieldRegenTimer = 0;
      
      // Stop shielding if depleted
      if (this.shieldEnergy <= 0) {
        this.isShielding = false;
        if (this.state === 'shielding') {
          this.state = 'idle';
        }
      }
    } else {
      // Not shielding - regenerate after delay
      this.shieldRegenTimer += dt;
      
      if (this.shieldRegenTimer >= C.SHIELD_REGEN_DELAY && this.shieldEnergy < C.SHIELD_MAX) {
        this.shieldEnergy = Math.min(
          C.SHIELD_MAX,
          this.shieldEnergy + C.SHIELD_REGEN_RATE * dt
        );
      }
    }
  }
  
  protected updateState(_dt: number): void {
    // Handle state timeouts
    if (this.state === 'dashing' && this.dashTimer.done) {
      this.state = 'idle';
    }
    
    if (this.state === 'attacking') {
      const totalTime = this.stats.attackWindup + C.ATTACK_ACTIVE;
      const elapsed = this.attackTimer.progress * totalTime;
      this.isAttackWindup = elapsed < this.stats.attackWindup;
      this.isAttackActive = elapsed >= this.stats.attackWindup && elapsed < totalTime;
      
      if (this.attackTimer.done) {
        this.state = 'idle';
        this.isAttackWindup = false;
        this.isAttackActive = false;
        this.attackHitThisSwing = false;
      }
    }
    
    if (this.state === 'stunned' && this.stunTimer.done) {
      this.state = 'idle';
    }
    
    if (this.state === 'hitstun' && this.hitstunTimer.done) {
      this.state = 'idle';
    }
  }
  
  protected applyMovement(dt: number): void {
    // Can't move while stunned or in hitstun
    if (this.state === 'stunned' || this.state === 'hitstun') {
      this.vel = vec2();
      return;
    }
    
    // Dashing overrides normal movement
    if (this.state === 'dashing') {
      const dashSpeed = this.stats.speed * C.DASH_SPEED_MULTIPLIER;
      this.vel = scale(this.facing, dashSpeed);
    }
    
    // Apply slow
    let speedMult = 1;
    if (this.slowTimer.active) {
      speedMult = 0.4;
    }
    if (this.state === 'attacking' && this.isAttackWindup) {
      speedMult = 0.3; // Slow during windup
    }
    if (this.isShielding) {
      speedMult = 0.4; // Slow while shielding
    }
    
    // Move
    const movement = scale(this.vel, dt * speedMult);
    this.pos = add(this.pos, movement);
    
    // Update sprite position
    this.sprite.setPosition(this.pos.x, this.pos.y);
  }
  
  protected updateVisuals(): void {
    // Update facing rotation
    this.sprite.setRotation(this.facingAngle);
    
    // Attack telegraph - simplified
    if (this.attackArc) {
      this.attackArc.clear();
      
      if (this.state === 'attacking' && this.isAttackActive) {
        // Only draw during active hit window, simplified rectangle instead of arc
        this.attackArc.fillStyle(C.COLOR_DAMAGE, 0.4);
        this.attackArc.fillRect(0, -10, this.stats.attackRange, 20);
      }
    }
    
    // Shield visual - simplified
    if (this.shieldVisual) {
      this.shieldVisual.clear();
      
      if (this.isShielding && this.shieldEnergy > 0) {
        const shieldPercent = this.shieldEnergy / C.SHIELD_MAX;
        const alpha = 0.3 + shieldPercent * 0.3;
        
        // Simple circle instead of arc
        this.shieldVisual.lineStyle(3, C.COLOR_PARRY, alpha);
        this.shieldVisual.strokeCircle(0, 0, this.radius + 8);
      }
    }
    
    // Flash on damage states
    if (this.state === 'hitstun') {
      this.body.setFillStyle(0xffffff);
    } else if (this.state === 'stunned') {
      this.body.setFillStyle(C.COLOR_PARRY);
    } else {
      this.body.setFillStyle(this.color);
    }
  }
  
  // Actions
  
  startDash(): boolean {
    if (!this.canDash()) return false;
    if (!this.dashCooldown.trigger()) return false;
    
    // Stop shielding when dashing
    this.stopShield();
    
    this.state = 'dashing';
    this.dashTimer.start(C.DASH_DURATION);
    return true;
  }
  
  startAttack(): boolean {
    if (!this.canAttack()) return false;
    if (!this.attackCooldown.trigger()) return false;
    
    // Stop shielding when attacking
    this.stopShield();
    
    this.state = 'attacking';
    this.attackTimer.start(this.stats.attackWindup + C.ATTACK_ACTIVE);
    this.attackDirection = { ...this.facing };
    this.attackHitThisSwing = false;
    this.isAttackWindup = true;
    this.isAttackActive = false;
    return true;
  }
  
  // NEW: Start/stop shield (hold to use)
  startShield(): boolean {
    if (!this.canShield()) return false;
    if (this.shieldEnergy < C.SHIELD_MIN_TO_USE) return false;
    
    this.isShielding = true;
    this.state = 'shielding';
    this.shieldRegenTimer = 0;
    return true;
  }
  
  stopShield(): void {
    if (this.isShielding) {
      this.isShielding = false;
      if (this.state === 'shielding') {
        this.state = 'idle';
      }
    }
  }
  
  takeDamage(amount: number, knockback: Vec2 = vec2()): void {
    // God mode check (for Player)
    if ((this as any).godMode === true) {
      return; // No damage in god mode
    }
    
    this.stats.hp = Math.max(0, this.stats.hp - amount);
    this.state = 'hitstun';
    this.hitstunTimer.start(C.HITSTUN_DURATION);
    this.vel = knockback;
    this.stopShield();
  }
  
  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
  }
  
  getStunned(duration: number, knockback: Vec2 = vec2()): void {
    // God mode check (for Player)
    if ((this as any).godMode === true) {
      return; // No stun in god mode
    }
    
    this.state = 'stunned';
    this.stunTimer.start(duration);
    this.vel = knockback;
    this.stopShield();
    
    // Cancel any attack
    this.isAttackWindup = false;
    this.isAttackActive = false;
  }
  
  canAct(): boolean {
    return (
      this.state !== 'stunned' &&
      this.state !== 'hitstun' &&
      this.state !== 'dashing' &&
      this.state !== 'attacking'
    );
  }
  
  canAttack(): boolean {
    return (
      this.state !== 'stunned' &&
      this.state !== 'hitstun' &&
      this.state !== 'dashing' &&
      this.state !== 'attacking'
    );
  }
  
  canShield(): boolean {
    return (
      this.state !== 'stunned' &&
      this.state !== 'hitstun' &&
      this.state !== 'dashing' &&
      this.state !== 'attacking'
    );
  }
  
  canDash(): boolean {
    return (
      this.state !== 'stunned' &&
      this.state !== 'hitstun' &&
      this.state !== 'dashing'
    );
  }
  
  get isDashing(): boolean {
    return this.state === 'dashing' && this.dashTimer.active;
  }
  
  get isInvulnerable(): boolean {
    // God mode makes player always invulnerable
    if ((this as any).godMode === true) {
      return true;
    }
    return C.DASH_INVULNERABLE && this.isDashing;
  }
  
  get isParrying(): boolean {
    // Now checks if actively shielding with energy
    return this.isShielding && this.shieldEnergy > 0;
  }
  
  get isDead(): boolean {
    return this.stats.hp <= 0;
  }
  
  get shieldPercent(): number {
    return this.shieldEnergy / C.SHIELD_MAX;
  }
  
  setFacing(direction: Vec2): void {
    if (length(direction) > 0) {
      this.facing = normalize(direction);
      this.facingAngle = Math.atan2(this.facing.y, this.facing.x);
    }
  }
  
  reset(x: number, y: number): void {
    this.pos = vec2(x, y);
    this.vel = vec2();
    this.facing = vec2(1, 0);
    this.facingAngle = 0;
    this.state = 'idle';
    this.stats.hp = this.stats.maxHp;
    
    this.dashTimer.reset();
    this.dashCooldown.reset();
    this.attackTimer.reset();
    this.attackCooldown.reset();
    this.stunTimer.reset();
    this.hitstunTimer.reset();
    this.slowTimer.reset();
    
    // Reset shield
    this.shieldEnergy = C.SHIELD_MAX;
    this.shieldRegenTimer = 0;
    this.isShielding = false;
    
    this.isAttackWindup = false;
    this.isAttackActive = false;
    this.attackHitThisSwing = false;
    
    this.sprite.setPosition(x, y);
  }
}
