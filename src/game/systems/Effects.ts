/**
 * Ultra-minimal Effects system - maximum stability
 */

import Phaser from 'phaser';
import { randomRange } from '../utils/math';
import * as C from '../utils/constants';

export class EffectsSystem {
  private scene: Phaser.Scene;
  
  // Hitstop
  private hitstopRemaining: number = 0;
  public isHitstop: boolean = false;
  
  // Screen shake
  private shakeIntensity: number = 0;
  private shakeRemaining: number = 0;
  
  // Damage numbers - managed simply
  private damageTexts: { text: Phaser.GameObjects.Text, startY: number, life: number }[] = [];
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  update(dt: number): void {
    // Hitstop
    if (this.hitstopRemaining > 0) {
      this.hitstopRemaining -= dt;
      this.isHitstop = this.hitstopRemaining > 0;
    } else {
      this.isHitstop = false;
    }
    
    // Screen shake
    if (this.shakeRemaining > 0) {
      this.shakeRemaining -= dt;
      const intensity = this.shakeIntensity * (this.shakeRemaining / 0.15);
      this.scene.cameras.main.setScroll(
        randomRange(-intensity, intensity),
        randomRange(-intensity, intensity)
      );
    } else {
      this.scene.cameras.main.setScroll(0, 0);
    }
    
    // Update damage numbers
    for (let i = this.damageTexts.length - 1; i >= 0; i--) {
      const item = this.damageTexts[i];
      item.life -= dt;
      
      if (item.life <= 0) {
        item.text.destroy();
        this.damageTexts.splice(i, 1);
      } else {
        const progress = 1 - item.life / 0.5;
        item.text.setAlpha(1 - progress);
        item.text.setY(item.startY - progress * 30);
      }
    }
  }
  
  triggerHitstop(duration: number = C.HITSTOP_DURATION): void {
    this.hitstopRemaining = Math.min(duration, 0.08);
    this.isHitstop = true;
  }
  
  triggerScreenShake(intensity: number, duration: number = C.SCREEN_SHAKE_DURATION): void {
    this.shakeIntensity = Math.min(intensity, 10);
    this.shakeRemaining = Math.min(duration, 0.15);
  }
  
  spawnHitParticles(_x: number, _y: number, _color: number, _count: number = 8): void {
    // Disabled
  }
  
  spawnParryParticles(_x: number, _y: number): void {
    // Disabled
  }
  
  spawnDeathParticles(_x: number, _y: number, _color: number): void {
    // Disabled
  }
  
  spawnDamageNumber(x: number, y: number, damage: number, color: number = C.COLOR_DAMAGE): void {
    // Limit active damage numbers
    if (this.damageTexts.length >= 5) {
      const oldest = this.damageTexts.shift();
      if (oldest) oldest.text.destroy();
    }
    
    const text = this.scene.add.text(x, y, damage.toString(), {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 2,
    });
    text.setOrigin(0.5);
    text.setDepth(101);
    
    this.damageTexts.push({ text, startY: y, life: 0.5 });
  }
  
  spawnAfterimage(_x: number, _y: number, _rotation: number, _color: number, _radius: number): void {
    // Disabled
  }
  
  flashEntity(entity: Phaser.GameObjects.Container): void {
    if (!entity || !entity.scene) return;
    entity.setAlpha(0.5);
    // Use Phaser's timer instead of setTimeout
    this.scene.time.delayedCall(50, () => {
      if (entity && entity.scene) {
        entity.setAlpha(1);
      }
    });
  }
  
  destroy(): void {
    for (const item of this.damageTexts) {
      item.text.destroy();
    }
    this.damageTexts = [];
  }
}
