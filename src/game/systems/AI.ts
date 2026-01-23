/**
 * AI System - Shared AI utilities and behavior trees
 * 
 * The main AI logic is in entities/Void.ts
 * This file contains reusable AI utilities for future expansion
 * 
 * TODO: Future AI improvements
 * - Behavior tree system
 * - Learning across matches (store patterns in localStorage)
 * - Multiple AI personalities
 * - Difficulty scaling
 */

import { Vec2, distance, sub, normalize, dot } from '../utils/math';

/**
 * Utility scoring helpers
 */
export class AIUtils {
  /**
   * Calculate threat level based on distance and HP
   */
  static calculateThreat(
    myPos: Vec2,
    myHp: number,
    targetPos: Vec2,
    targetHp: number,
    attackRange: number
  ): number {
    const dist = distance(myPos, targetPos);
    const distanceThreat = Math.max(0, 1 - dist / (attackRange * 3));
    const hpAdvantage = (targetHp - myHp) / 100;
    
    return distanceThreat * 0.6 + hpAdvantage * 0.4;
  }
  
  /**
   * Check if target is approaching
   */
  static isApproaching(
    myPos: Vec2,
    targetPos: Vec2,
    targetVel: Vec2
  ): boolean {
    const toMe = sub(myPos, targetPos);
    const toMeNorm = normalize(toMe);
    const velNorm = normalize(targetVel);
    
    return dot(toMeNorm, velNorm) > 0.5;
  }
  
  /**
   * Find best escape direction (away from target, avoiding walls)
   */
  static getEscapeDirection(
    myPos: Vec2,
    targetPos: Vec2,
    arenaWidth: number,
    arenaHeight: number,
    margin: number
  ): Vec2 {
    // Base direction: away from target
    let escape = normalize(sub(myPos, targetPos));
    
    // Adjust if too close to walls
    if (myPos.x < margin) escape.x = Math.max(escape.x, 0.5);
    if (myPos.x > arenaWidth - margin) escape.x = Math.min(escape.x, -0.5);
    if (myPos.y < margin) escape.y = Math.max(escape.y, 0.5);
    if (myPos.y > arenaHeight - margin) escape.y = Math.min(escape.y, -0.5);
    
    return normalize(escape);
  }
  
  /**
   * Score a position based on various factors
   */
  static scorePosition(
    pos: Vec2,
    targetPos: Vec2,
    optimalRange: number,
    arenaWidth: number,
    arenaHeight: number
  ): number {
    let score = 0;
    
    // Distance to target (prefer optimal range)
    const dist = distance(pos, targetPos);
    const distScore = 1 - Math.abs(dist - optimalRange) / optimalRange;
    score += distScore * 0.5;
    
    // Arena center control (prefer center)
    const centerX = arenaWidth / 2;
    const centerY = arenaHeight / 2;
    const toCenter = distance(pos, { x: centerX, y: centerY });
    const maxFromCenter = Math.sqrt(centerX * centerX + centerY * centerY);
    const centerScore = 1 - toCenter / maxFromCenter;
    score += centerScore * 0.3;
    
    // Wall avoidance
    const margin = 50;
    let wallPenalty = 0;
    if (pos.x < margin || pos.x > arenaWidth - margin) wallPenalty += 0.5;
    if (pos.y < margin || pos.y > arenaHeight - margin) wallPenalty += 0.5;
    score -= wallPenalty * 0.2;
    
    return score;
  }
}

/**
 * Simple behavior tree node types for future expansion
 */
export type BTStatus = 'success' | 'failure' | 'running';

export interface BTNode {
  tick(): BTStatus;
  reset(): void;
}

export class BTSequence implements BTNode {
  private children: BTNode[];
  private currentIndex: number = 0;
  
  constructor(children: BTNode[]) {
    this.children = children;
  }
  
  tick(): BTStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick();
      
      if (status === 'running') return 'running';
      if (status === 'failure') {
        this.reset();
        return 'failure';
      }
      
      this.currentIndex++;
    }
    
    this.reset();
    return 'success';
  }
  
  reset(): void {
    this.currentIndex = 0;
    this.children.forEach(c => c.reset());
  }
}

export class BTSelector implements BTNode {
  private children: BTNode[];
  private currentIndex: number = 0;
  
  constructor(children: BTNode[]) {
    this.children = children;
  }
  
  tick(): BTStatus {
    while (this.currentIndex < this.children.length) {
      const status = this.children[this.currentIndex].tick();
      
      if (status === 'running') return 'running';
      if (status === 'success') {
        this.reset();
        return 'success';
      }
      
      this.currentIndex++;
    }
    
    this.reset();
    return 'failure';
  }
  
  reset(): void {
    this.currentIndex = 0;
    this.children.forEach(c => c.reset());
  }
}
