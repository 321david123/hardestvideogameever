/**
 * Arena Effects System - Rain, particles, atmosphere
 */

import Phaser from 'phaser';
import { randomRange } from '../utils/math';
import * as C from '../utils/constants';

interface RainDrop {
  x: number;
  y: number;
  speed: number;
  length: number;
}

interface Lightning {
  x: number;
  y: number;
  life: number;
  segments: Array<{ x: number; y: number }>;
}

export class ArenaEffects {
  private scene: Phaser.Scene;
  private rainGraphics: Phaser.GameObjects.Graphics;
  private rainDrops: RainDrop[] = [];
  private particleGraphics: Phaser.GameObjects.Graphics;
  private particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; color: number }> = [];
  private lightningGraphics: Phaser.GameObjects.Graphics;
  private lightnings: Lightning[] = [];
  private time: number = 0;
  private phase: 1 | 2 = 1;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    
    // Rain graphics (Phase 2 only)
    this.rainGraphics = scene.add.graphics();
    this.rainGraphics.setDepth(-5);
    
    // Lightning graphics (Phase 2 only)
    this.lightningGraphics = scene.add.graphics();
    this.lightningGraphics.setDepth(-4);
    
    // Particle graphics
    this.particleGraphics = scene.add.graphics();
    this.particleGraphics.setDepth(-3);
  }
  
  setPhase(phase: 1 | 2): void {
    this.phase = phase;
    
    if (phase === 2) {
      // Initialize rain for Phase 2 - only if not already initialized
      if (this.rainDrops.length === 0) {
        this.initRain();
      }
    } else {
      // Clear rain for Phase 1 - also clear graphics
      this.rainDrops = [];
      this.rainGraphics.clear();
    }
  }
  
  private initRain(): void {
    // Clear any existing drops first
    this.rainDrops = [];
    
    // Create fixed number of rain drops - they loop, don't accumulate
    const RAIN_DROP_COUNT = 25;
    for (let i = 0; i < RAIN_DROP_COUNT; i++) {
      this.rainDrops.push({
        x: randomRange(0, C.ARENA_WIDTH),
        y: randomRange(-C.ARENA_HEIGHT, 0),
        speed: randomRange(300, 500),
        length: randomRange(6, 15),
      });
    }
  }
  
  update(dt: number): void {
    this.time += dt;
    
    if (this.phase === 2) {
      this.updateRain(dt);
      this.updateLightning(dt);
    } else {
      // Phase 1 - chill effects
      this.updateChillEffects(dt);
    }
    
    this.updateParticles(dt);
  }
  
  private updateRain(dt: number): void {
    if (this.phase !== 2) return;
    
    this.rainGraphics.clear();
    this.rainGraphics.lineStyle(1, 0x4a90e2, 0.15); // Even more transparent for less visual impact
    
    for (const drop of this.rainDrops) {
      drop.y += drop.speed * dt;
      
      // Reset if off screen
      if (drop.y > C.ARENA_HEIGHT) {
        drop.y = -20;
        drop.x = randomRange(0, C.ARENA_WIDTH);
      }
      
      // Draw rain drop
      this.rainGraphics.lineBetween(
        drop.x,
        drop.y,
        drop.x,
        drop.y + drop.length
      );
    }
  }
  
  private updateLightning(dt: number): void {
    if (this.phase !== 2) return;
    
    this.lightningGraphics.clear();
    
    // Spawn lightning occasionally
    if (Math.random() < 0.02) {
      this.spawnLightning();
    }
    
    // Update existing lightning
    for (let i = this.lightnings.length - 1; i >= 0; i--) {
      const lightning = this.lightnings[i];
      lightning.life -= dt;
      
      if (lightning.life <= 0) {
        this.lightnings.splice(i, 1);
        continue;
      }
      
      // Draw lightning
      const alpha = Math.min(1, lightning.life * 5);
      this.lightningGraphics.lineStyle(3, 0xffffff, alpha);
      this.lightningGraphics.lineStyle(2, 0x4a90e2, alpha * 0.8);
      
      for (let j = 0; j < lightning.segments.length - 1; j++) {
        this.lightningGraphics.lineBetween(
          lightning.segments[j].x,
          lightning.segments[j].y,
          lightning.segments[j + 1].x,
          lightning.segments[j + 1].y
        );
      }
    }
  }
  
  private spawnLightning(): void {
    const x = randomRange(100, C.ARENA_WIDTH - 100);
    const y = randomRange(50, 200);
    const targetY = C.ARENA_HEIGHT;
    
    // Create jagged lightning path
    const segments: Array<{ x: number; y: number }> = [{ x, y }];
    let currentY = y;
    let currentX = x;
    
    while (currentY < targetY) {
      currentY += randomRange(30, 60);
      currentX += randomRange(-40, 40);
      segments.push({ x: currentX, y: currentY });
    }
    
    this.lightnings.push({
      x,
      y,
      life: 0.15, // Flash briefly
      segments,
    });
    
    // Screen flash on lightning
    const flash = this.scene.add.rectangle(
      C.ARENA_WIDTH / 2,
      C.ARENA_HEIGHT / 2,
      C.ARENA_WIDTH,
      C.ARENA_HEIGHT,
      0xffffff,
      0.3
    );
    flash.setDepth(398);
    flash.setScrollFactor(0);
    
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      onComplete: () => flash.destroy(),
    });
  }
  
  private updateChillEffects(_dt: number): void {
    // Phase 1 - calm floating particles throughout the arena
    // Limit particles to prevent accumulation
    const MAX_PARTICLES = 100;
    if (this.particles.length < MAX_PARTICLES && Math.random() < 0.08) {
      // Spawn from anywhere in the arena, not just bottom
      const spawnFromBottom = Math.random() < 0.3; // 30% from bottom, 70% from anywhere
      
      if (spawnFromBottom) {
        // Spawn from bottom edge
        this.particles.push({
          x: randomRange(0, C.ARENA_WIDTH),
          y: C.ARENA_HEIGHT + 10,
          vx: randomRange(-10, 10),
          vy: randomRange(-30, -10), // Float upward slowly
          life: randomRange(3, 6),
          color: 0x9f7aea, // Calm purple
        });
      } else {
        // Spawn from anywhere in the arena
        this.particles.push({
          x: randomRange(0, C.ARENA_WIDTH),
          y: randomRange(0, C.ARENA_HEIGHT),
          vx: randomRange(-15, 15),
          vy: randomRange(-20, -5), // Float upward slowly
          life: randomRange(4, 8),
          color: 0x9f7aea, // Calm purple
        });
      }
    }
  }
  
  private updateParticles(dt: number): void {
    this.particleGraphics.clear();
    
    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      
      if (p.life <= 0 || p.y < -10 || p.y > C.ARENA_HEIGHT + 50) {
        this.particles.splice(i, 1);
        continue;
      }
      
      const alpha = Math.min(1, p.life * (this.phase === 1 ? 0.5 : 2));
      const size = this.phase === 1 ? 3 : 2;
      this.particleGraphics.fillStyle(p.color, alpha);
      this.particleGraphics.fillCircle(p.x, p.y, size);
    }
    
    // Limit total particles to prevent accumulation
    const MAX_PARTICLES = 100;
    if (this.particles.length > MAX_PARTICLES) {
      // Remove oldest particles (first in array)
      this.particles.splice(0, this.particles.length - MAX_PARTICLES);
    }
    
    // Phase 2 ambient particles - only spawn if under limit
    if (this.phase === 2 && this.particles.length < MAX_PARTICLES && Math.random() < 0.1) {
      this.spawnAmbientParticle();
    }
  }
  
  private spawnAmbientParticle(): void {
    this.particles.push({
      x: randomRange(0, C.ARENA_WIDTH),
      y: randomRange(0, C.ARENA_HEIGHT),
      vx: randomRange(-20, 20),
      vy: randomRange(-20, 20),
      life: randomRange(1, 3),
      color: 0x6b46c1,
    });
  }
  
  spawnBurst(x: number, y: number, color: number, count: number = 10): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = randomRange(50, 150);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: randomRange(0.5, 1.5),
        color,
      });
    }
  }
  
  destroy(): void {
    this.rainGraphics.destroy();
    this.lightningGraphics.destroy();
    this.particleGraphics.destroy();
  }
}
