/**
 * Player entity - keyboard (desktop) or TouchControls (mobile).
 * Dash goes in MOVEMENT direction (WASD or left stick)
 * Attack auto-aims at target. Shield is HELD (E or button).
 */

import Phaser from 'phaser';
import { Entity } from './Entity';
import { Vec2, vec2, normalize, length, sub } from '../utils/math';
import * as C from '../utils/constants';
import type { TouchControls } from '../ui/TouchControls';

export class Player extends Entity {
  private touchControls: TouchControls | null = null;
  private keys: {
    up: Phaser.Input.Keyboard.Key;
    down: Phaser.Input.Keyboard.Key;
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
    dash: Phaser.Input.Keyboard.Key;
    attack: Phaser.Input.Keyboard.Key;
    shield: Phaser.Input.Keyboard.Key;
  };
  
  private currentTime: number = 0;
  
  // Track target for attack auto-aim
  private target: Entity | null = null;
  
  // Current movement direction (for dash)
  private moveDirection: Vec2 = vec2(1, 0);
  private lastMoveDirection: Vec2 = vec2(1, 0);
  
  // Pickup weapon
  public hasLaserPickup: boolean = false;
  public laserCharges: number = 0;
  
  // Track if keys were just pressed this frame (to prevent repeat)
  private dashPressedLastFrame: boolean = false;
  private attackPressedLastFrame: boolean = false;
  
  // Track phase for shield duration
  public phase: 1 | 2 = 1;
  
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, C.COLOR_PLAYER, {
      hp: C.PLAYER_HP_PHASE1,
      maxHp: C.PLAYER_HP_PHASE1,
      speed: C.PLAYER_SPEED,
      damage: C.ATTACK_DAMAGE,
      attackRange: C.ATTACK_RANGE,
      attackCooldown: C.ATTACK_COOLDOWN,
      attackWindup: C.ATTACK_WINDUP,
    });
    
    // Setup keyboard input
    const keyboard = scene.input.keyboard!;
    this.keys = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      dash: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT),
      attack: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      shield: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E),
    };
    
    // Add player label
    const label = scene.add.text(0, -this.radius - 12, 'YOU', {
      fontSize: '10px',
      fontFamily: 'monospace',
      color: '#4fd1c5',
    });
    label.setOrigin(0.5, 1);
    this.sprite.add(label);
  }
  
  setTarget(target: Entity): void {
    this.target = target;
  }

  setTouchControls(tc: TouchControls | null): void {
    this.touchControls = tc;
  }

  private useTouch(): boolean {
    return !!this.touchControls?.isActive();
  }

  update(dt: number): void {
    this.currentTime += dt;
    
    // Update movement direction from WASD first
    this.updateMoveDirection();
    
    // Handle shield (hold to use)
    this.handleShield();
    
    // Handle actions - NO BUFFERING, only on key press when ready
    this.handleActions();
    
    // Update movement velocity
    this.updateMovementInput();
    
    // Call parent update
    super.update(dt);
  }
  
  private handleShield(): void {
    const shieldOn = this.useTouch() ? this.touchControls!.isShieldHeld() : this.keys.shield.isDown;
    if (shieldOn) {
      if (!this.isShielding) this.startShield();
    } else {
      if (this.isShielding) this.stopShield();
    }
  }
  
  private handleActions(): void {
    if (this.isShielding) {
      this.dashPressedLastFrame = this.touchControls?.isActive() ? false : this.keys.dash.isDown;
      this.attackPressedLastFrame = this.touchControls?.isActive() ? false : this.keys.attack.isDown;
      return;
    }

    const dashPressed = this.touchControls?.isActive()
      ? this.touchControls.consumeDashPressed()
      : this.keys.dash.isDown;
    if (dashPressed && !this.dashPressedLastFrame) {
      if (this.dashCooldown.ready && this.canDash()) {
        this.setFacing(this.lastMoveDirection);
        this.startDash();
      }
    }
    this.dashPressedLastFrame = this.touchControls?.isActive() ? false : this.keys.dash.isDown;

    const attackPressed = this.touchControls?.isActive()
      ? this.touchControls.consumeAttackPressed()
      : this.keys.attack.isDown;
    if (attackPressed && !this.attackPressedLastFrame) {
      if (this.attackCooldown.ready && this.canAttack()) {
        if (this.target) {
          const toTarget = sub(this.target.pos, this.pos);
          if (length(toTarget) > 0) this.attackDirection = normalize(toTarget);
        }
        this.startAttack();
      }
    }
    this.attackPressedLastFrame = this.touchControls?.isActive() ? false : this.keys.attack.isDown;
  }
  
  private updateMoveDirection(): void {
    if (this.touchControls?.isActive()) {
      const td = this.touchControls.getMoveDirection();
      if (length(td) > 0) {
        this.moveDirection = { ...td };
        this.lastMoveDirection = { ...td };
      } else {
        this.moveDirection = vec2();
      }
      return;
    }
    let moveDir = vec2();
    if (this.keys.up.isDown) moveDir.y -= 1;
    if (this.keys.down.isDown) moveDir.y += 1;
    if (this.keys.left.isDown) moveDir.x -= 1;
    if (this.keys.right.isDown) moveDir.x += 1;
    if (length(moveDir) > 0) {
      this.moveDirection = normalize(moveDir);
      this.lastMoveDirection = { ...this.moveDirection };
    }
  }
  
  private updateMovementInput(): void {
    if (this.state === 'dashing' || this.state === 'stunned' || this.state === 'hitstun') {
      return;
    }
    
    const keyMove = this.keys.up.isDown || this.keys.down.isDown || this.keys.left.isDown || this.keys.right.isDown;
    const touchMove = this.touchControls?.isActive() && length(this.moveDirection) > 0;
    if (length(this.moveDirection) > 0 && (keyMove || touchMove)) {
      this.vel = { x: this.moveDirection.x * this.stats.speed, y: this.moveDirection.y * this.stats.speed };
      if (this.state !== 'attacking' && this.state !== 'shielding') {
        this.state = 'moving';
      }
    } else {
      this.vel = vec2();
      if (this.state === 'moving') {
        this.state = 'idle';
      }
    }
    
    // Visual facing: toward target
    if (this.target && !this.isDashing) {
      const toTarget = sub(this.target.pos, this.pos);
      if (length(toTarget) > 0) {
        this.facingAngle = Math.atan2(toTarget.y, toTarget.x);
      }
    }
  }
  
  startAttack(): boolean {
    if (!this.canAttack()) return false;
    if (!this.attackCooldown.trigger()) return false;
    
    this.state = 'attacking';
    this.attackTimer.start(this.stats.attackWindup + C.ATTACK_ACTIVE);
    this.attackHitThisSwing = false;
    this.isAttackWindup = true;
    this.isAttackActive = false;
    return true;
  }
  
  givePickup(charges: number): void {
    this.hasLaserPickup = true;
    this.laserCharges = charges;
  }
  
  usePickupCharge(): boolean {
    if (this.laserCharges > 0) {
      this.laserCharges--;
      if (this.laserCharges <= 0) {
        this.hasLaserPickup = false;
      }
      return true;
    }
    return false;
  }
  
  getActionData(): PlayerActionData {
    return {
      isDashing: this.isDashing,
      isAttacking: this.state === 'attacking',
      isParrying: this.isParrying,
      isShielding: this.isShielding,
      shieldPercent: this.shieldPercent,
      dashCooldownReady: this.dashCooldown.ready,
      attackCooldownReady: this.attackCooldown.ready,
      position: { ...this.pos },
      velocity: { ...this.vel },
      facing: { ...this.facing },
    };
  }
  
  reset(x: number, y: number): void {
    super.reset(x, y);
    this.hasLaserPickup = false;
    this.laserCharges = 0;
    this.moveDirection = vec2(1, 0);
    this.lastMoveDirection = vec2(1, 0);
    this.dashPressedLastFrame = false;
    this.attackPressedLastFrame = false;
    this.phase = 1; // Reset to Phase 1
  }
}

export interface PlayerActionData {
  isDashing: boolean;
  isAttacking: boolean;
  isParrying: boolean;
  isShielding: boolean;
  shieldPercent: number;
  dashCooldownReady: boolean;
  attackCooldownReady: boolean;
  position: Vec2;
  velocity: Vec2;
  facing: Vec2;
}
