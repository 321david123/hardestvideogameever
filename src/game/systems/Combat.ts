/**
 * Combat system - handles hit detection, damage, parrying, laser, charge attacks
 */

import { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { Void } from '../entities/Void';
import { Vec2, distance, sub, normalize, scale, angle, isAngleInArc, dot } from '../utils/math';
import * as C from '../utils/constants';

export interface HitResult {
  attacker: Entity;
  defender: Entity;
  damage: number;
  knockback: Vec2;
  parried: boolean;
  type: 'melee' | 'laser' | 'charge';
}

export interface CombatStats {
  playerDamageDealt: number;
  playerHitsLanded: number;
  voidLowestHp: number;
  playerParries: number;
  voidParries: number;
}

export class CombatSystem {
  private player: Player;
  private void_: Void;
  private onHit: ((result: HitResult) => void) | null = null;
  private onParry: ((defender: Entity, attacker: Entity) => void) | null = null;
  private onKill: ((killed: Entity, killer: Entity) => void) | null = null;
  private onLaserHit: ((pos: Vec2) => void) | null = null;
  
  public stats: CombatStats = {
    playerDamageDealt: 0,
    playerHitsLanded: 0,
    voidLowestHp: C.VOID_HP,
    playerParries: 0,
    voidParries: 0,
  };
  
  constructor(player: Player, void_: Void) {
    this.player = player;
    this.void_ = void_;
  }
  
  setCallbacks(
    onHit: (result: HitResult) => void,
    onParry: (defender: Entity, attacker: Entity) => void,
    onKill: (killed: Entity, killer: Entity) => void,
    onLaserHit?: (pos: Vec2) => void
  ): void {
    this.onHit = onHit;
    this.onParry = onParry;
    this.onKill = onKill;
    this.onLaserHit = onLaserHit || null;
  }
  
  update(): void {
    console.log('Combat: checking attacks');
    
    // Check player attacking void (melee)
    if (this.player.isAttackActive && !this.player.attackHitThisSwing) {
      console.log('Combat: player attack active, checking melee');
      this.checkMeleeAttack(this.player, this.void_);
      console.log('Combat: player melee check done');
    }
    
    // Check void attacking player (melee)
    if (this.void_.isAttackActive && !this.void_.attackHitThisSwing) {
      console.log('Combat: void attack active, checking melee');
      this.checkMeleeAttack(this.void_, this.player);
      console.log('Combat: void melee check done');
    }
    
    // Check void laser
    if (this.void_.isLaserFiring) {
      console.log('Combat: checking laser');
      this.checkLaserHit();
      console.log('Combat: laser check done');
    }
    
    // Check void charge attack
    if (this.void_.isCharging && !this.void_.chargeHit) {
      console.log('Combat: checking charge');
      this.checkChargeHit();
      console.log('Combat: charge check done');
    }
    
    // Track void lowest HP
    if (this.void_.stats.hp < this.stats.voidLowestHp) {
      this.stats.voidLowestHp = this.void_.stats.hp;
    }
    
    console.log('Combat: update done');
  }
  
  private checkMeleeAttack(attacker: Entity, defender: Entity): void {
    const dist = distance(attacker.pos, defender.pos);
    if (dist > attacker.stats.attackRange + C.ENTITY_RADIUS) return;
    
    const toDefender = sub(defender.pos, attacker.pos);
    const angleToDefender = angle(toDefender);
    const attackAngle = angle(attacker.attackDirection);
    
    if (!isAngleInArc(angleToDefender, attackAngle, C.ATTACK_ARC / 2)) {
      return;
    }
    
    if (defender.isInvulnerable) {
      return;
    }
    
    if (defender.isParrying) {
      this.handleParry(defender, attacker);
      return;
    }
    
    this.handleHit(attacker, defender, 'melee');
  }
  
  private checkLaserHit(): void {
    // Check if player is in the laser beam
    const laserDir = this.void_.laserDirection;
    const laserStart = this.void_.pos;
    
    // Vector from laser start to player
    const toPlayer = sub(this.player.pos, laserStart);
    
    // Project player position onto laser line
    const projLength = dot(toPlayer, laserDir);
    
    if (projLength < 0 || projLength > C.VOID_LASER_RANGE) {
      return; // Player is behind or beyond laser
    }
    
    // Find closest point on laser to player
    const closestPoint = {
      x: laserStart.x + laserDir.x * projLength,
      y: laserStart.y + laserDir.y * projLength,
    };
    
    const distToLaser = distance(this.player.pos, closestPoint);
    
    // Check if player is within laser width
    if (distToLaser < C.VOID_LASER_WIDTH / 2 + C.ENTITY_RADIUS) {
      // Player is in the laser!
      if (this.player.isInvulnerable) {
        return; // Dashing through
      }
      
      // Laser damage (only once per firing)
      const knockbackDir = normalize(sub(this.player.pos, this.void_.pos));
      const knockback = scale(knockbackDir, 200);
      
      const result: HitResult = {
        attacker: this.void_,
        defender: this.player,
        damage: C.VOID_LASER_DAMAGE,
        knockback,
        parried: false,
        type: 'laser',
      };
      
      this.player.takeDamage(result.damage, knockback);
      
      // End laser firing early after hit
      this.void_.isLaserFiring = false;
      
      if (this.onHit) {
        this.onHit(result);
      }
      
      if (this.onLaserHit) {
        this.onLaserHit(this.player.pos);
      }
      
      if (this.player.isDead && this.onKill) {
        this.onKill(this.player, this.void_);
      }
    }
  }
  
  private checkChargeHit(): void {
    const dist = distance(this.void_.pos, this.player.pos);
    
    if (dist < C.ENTITY_RADIUS * 2.5) {
      if (this.player.isInvulnerable) {
        return;
      }
      
      if (this.player.isParrying) {
        // Can parry the charge!
        this.handleParry(this.player, this.void_);
        this.void_.isCharging = false;
        this.void_.chargeHit = true;
        return;
      }
      
      // Charge hit!
      this.void_.chargeHit = true;
      
      const knockbackDir = normalize(this.void_.chargeDirection);
      const knockback = scale(knockbackDir, 300);
      
      const result: HitResult = {
        attacker: this.void_,
        defender: this.player,
        damage: C.VOID_CHARGE_DAMAGE,
        knockback,
        parried: false,
        type: 'charge',
      };
      
      this.player.takeDamage(result.damage, knockback);
      
      if (this.onHit) {
        this.onHit(result);
      }
      
      if (this.player.isDead && this.onKill) {
        this.onKill(this.player, this.void_);
      }
    }
  }
  
  private handleHit(attacker: Entity, defender: Entity, type: 'melee' | 'laser' | 'charge'): void {
    console.log(`HIT! type=${type}`);
    attacker.attackHitThisSwing = true;
    
    console.log('HIT: calculating knockback');
    const knockbackDir = normalize(sub(defender.pos, attacker.pos));
    const knockback = scale(knockbackDir, 150);
    
    console.log('HIT: creating result');
    const result: HitResult = {
      attacker,
      defender,
      damage: attacker.stats.damage,
      knockback,
      parried: false,
      type,
    };
    
    console.log('HIT: applying damage');
    defender.takeDamage(result.damage, knockback);
    
    if (attacker === this.player) {
      this.stats.playerDamageDealt += result.damage;
      this.stats.playerHitsLanded++;
    }
    
    console.log('HIT: calling onHit callback');
    if (this.onHit) {
      this.onHit(result);
    }
    console.log('HIT: onHit callback done');
    
    // Check for Phase 2 transition (Void Phase 1 death)
    if (defender.isDead) {
      if (defender === this.void_ && this.void_.phase === 1) {
        // Phase 1 defeated - transition to Phase 2 (handled in Void.update)
        console.log('HIT: Void Phase 1 defeated, will transition to Phase 2');
        return; // Don't trigger death, let phase transition happen
      }
      
      // Actual death (Phase 2 or player)
      if (this.onKill) {
        console.log('HIT: defender dead, calling onKill');
        this.onKill(defender, attacker);
      }
    }
    
    console.log('HIT: handleHit complete');
  }
  
  private handleParry(defender: Entity, attacker: Entity): void {
    attacker.attackHitThisSwing = true;
    
    const knockbackDir = normalize(sub(attacker.pos, defender.pos));
    const knockback = scale(knockbackDir, C.PARRY_KNOCKBACK);
    
    attacker.getStunned(C.PARRY_STUN, knockback);
    
    if (defender === this.player) {
      this.stats.playerParries++;
    } else {
      this.stats.voidParries++;
    }
    
    if (this.onParry) {
      this.onParry(defender, attacker);
    }
  }
  
  resetStats(): void {
    this.stats = {
      playerDamageDealt: 0,
      playerHitsLanded: 0,
      voidLowestHp: C.VOID_HP,
      playerParries: 0,
      voidParries: 0,
    };
  }
}
