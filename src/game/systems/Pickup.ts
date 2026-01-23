/**
 * Pickup system - spawns power weapons AND health drops (OPTIMIZED)
 */

import Phaser from 'phaser';
import { Vec2, vec2, distance, randomRange } from '../utils/math';
import { Player } from '../entities/Player';
import * as C from '../utils/constants';

export type PickupType = 'laser' | 'health';

export interface Pickup {
  id: number;
  pos: Vec2;
  type: PickupType;
  value: number;
  lifetime: number;
  sprite: Phaser.GameObjects.Container;
  tweens: Phaser.Tweens.Tween[];
}

export class PickupSystem {
  private scene: Phaser.Scene;
  private pickups: Pickup[] = [];
  private nextSpawnTime: number = 0;
  private pickupIdCounter: number = 0;
  private currentTime: number = 0;
  
  private onPickupCollected: ((type: PickupType, value: number) => void) | null = null;
  
  // Limit max pickups
  private readonly MAX_PICKUPS = 3;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.nextSpawnTime = C.PICKUP_SPAWN_INTERVAL * 0.5;
  }
  
  setCallback(onCollect: (type: PickupType, value: number) => void): void {
    this.onPickupCollected = onCollect;
  }
  
  update(dt: number, player: Player): void {
    this.currentTime += dt;
    
    // Check for spawn (limit number of pickups)
    if (this.currentTime >= this.nextSpawnTime && this.pickups.length < this.MAX_PICKUPS) {
      this.spawnPickup();
      this.nextSpawnTime = this.currentTime + C.PICKUP_SPAWN_INTERVAL + randomRange(-2, 2);
    }
    
    // Update pickups
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      pickup.lifetime -= dt;
      
      // Check player collision
      if (distance(player.pos, pickup.pos) < C.ENTITY_RADIUS + 20) {
        this.collectPickup(pickup, player);
        continue;
      }
      
      // Remove expired pickups
      if (pickup.lifetime <= 0) {
        this.removePickup(pickup, i);
        continue;
      }
      
      // Update visuals - simple alpha flash when expiring
      if (pickup.lifetime < 2) {
        const flash = Math.sin(this.currentTime * 10) > 0;
        pickup.sprite.setAlpha(flash ? 1 : 0.3);
      }
    }
  }
  
  private spawnPickup(): void {
    const margin = 80;
    let pos: Vec2;
    let attempts = 0;
    
    do {
      pos = {
        x: randomRange(margin + C.WALL_THICKNESS, C.ARENA_WIDTH - margin - C.WALL_THICKNESS),
        y: randomRange(margin + C.WALL_THICKNESS + 100, C.ARENA_HEIGHT - margin - C.WALL_THICKNESS),
      };
      attempts++;
    } while (this.isNearPillar(pos) && attempts < 20);
    
    // Determine pickup type - health or laser
    const isHealth = Math.random() < C.HEALTH_DROP_CHANCE;
    const type: PickupType = isHealth ? 'health' : 'laser';
    const value = isHealth ? C.HEALTH_DROP_AMOUNT : C.PICKUP_LASER_CHARGES;
    
    const { sprite, tweens } = this.createPickupSprite(pos, type);
    
    const pickup: Pickup = {
      id: this.pickupIdCounter++,
      pos,
      type,
      value,
      lifetime: C.PICKUP_DURATION,
      sprite,
      tweens,
    };
    
    this.pickups.push(pickup);
  }
  
  private isNearPillar(pos: Vec2): boolean {
    for (const pillar of C.PILLARS) {
      if (distance(pos, { x: pillar.x, y: pillar.y }) < 80) {
        return true;
      }
    }
    return false;
  }
  
  private createPickupSprite(pos: Vec2, type: PickupType): { sprite: Phaser.GameObjects.Container, tweens: Phaser.Tweens.Tween[] } {
    const container = this.scene.add.container(pos.x, pos.y);
    container.setDepth(10);
    
    const tweens: Phaser.Tweens.Tween[] = [];
    const isHealth = type === 'health';
    const color = isHealth ? C.COLOR_HEAL : C.COLOR_PICKUP;
    
    // Main pickup body
    const body = this.scene.add.circle(0, 0, 14, color, 1);
    body.setStrokeStyle(2, 0xffffff, 0.8);
    container.add(body);
    
    // Inner icon
    if (isHealth) {
      // Cross shape for health
      const cross1 = this.scene.add.rectangle(0, 0, 10, 4, 0xffffff, 0.9);
      const cross2 = this.scene.add.rectangle(0, 0, 4, 10, 0xffffff, 0.9);
      container.add(cross1);
      container.add(cross2);
    } else {
      // Dot for laser
      const innerCore = this.scene.add.circle(0, 0, 6, 0xffffff, 0.9);
      container.add(innerCore);
    }
    
    // Simple scale animation (limited duration)
    const scaleTween = this.scene.tweens.add({
      targets: container,
      scale: { from: 0.9, to: 1.1 },
      duration: 600,
      yoyo: true,
      repeat: 15, // Limited repeats instead of infinite
      ease: 'Sine.easeInOut',
    });
    tweens.push(scaleTween);
    
    return { sprite: container, tweens };
  }
  
  private collectPickup(pickup: Pickup, player: Player): void {
    if (pickup.type === 'health') {
      player.heal(pickup.value);
    } else {
      player.givePickup(pickup.value);
    }
    
    if (this.onPickupCollected) {
      this.onPickupCollected(pickup.type, pickup.value);
    }
    
    // Simple collection effect
    const flash = this.scene.add.circle(pickup.pos.x, pickup.pos.y, 30, 
      pickup.type === 'health' ? C.COLOR_HEAL : C.COLOR_PICKUP, 0.6);
    flash.setDepth(100);
    this.scene.tweens.add({
      targets: flash,
      scale: 1.5,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
    
    const index = this.pickups.indexOf(pickup);
    this.removePickup(pickup, index);
  }
  
  private removePickup(pickup: Pickup, index: number): void {
    // Stop all tweens
    for (const tween of pickup.tweens) {
      tween.stop();
      tween.destroy();
    }
    
    // Destroy sprite
    pickup.sprite.destroy();
    
    // Remove from array
    if (index >= 0) {
      this.pickups.splice(index, 1);
    }
  }
  
  reset(): void {
    for (const pickup of this.pickups) {
      for (const tween of pickup.tweens) {
        tween.stop();
        tween.destroy();
      }
      pickup.sprite.destroy();
    }
    this.pickups = [];
    this.currentTime = 0;
    this.nextSpawnTime = C.PICKUP_SPAWN_INTERVAL * 0.5;
  }
  
  destroy(): void {
    this.reset();
  }
}
