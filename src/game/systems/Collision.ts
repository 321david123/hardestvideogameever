/**
 * Collision system - handles wall and pillar collisions
 */

import { Entity } from '../entities/Entity';
import { Vec2, circleRectCollide, resolveCircleRect } from '../utils/math';
import * as C from '../utils/constants';

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CollisionSystem {
  private walls: Obstacle[] = [];
  private pillars: Obstacle[] = [];
  
  constructor() {
    this.setupArena();
  }
  
  private setupArena(): void {
    // Create walls (arena boundaries)
    const w = C.WALL_THICKNESS;
    const aw = C.ARENA_WIDTH;
    const ah = C.ARENA_HEIGHT;
    
    // Top wall
    this.walls.push({ x: 0, y: 0, width: aw, height: w });
    // Bottom wall
    this.walls.push({ x: 0, y: ah - w, width: aw, height: w });
    // Left wall
    this.walls.push({ x: 0, y: 0, width: w, height: ah });
    // Right wall
    this.walls.push({ x: aw - w, y: 0, width: w, height: ah });
    
    // Add pillars
    for (const p of C.PILLARS) {
      this.pillars.push({
        x: p.x - p.width / 2,
        y: p.y - p.height / 2,
        width: p.width,
        height: p.height,
      });
    }
  }
  
  resolveEntityCollisions(entity: Entity): void {
    const radius = C.ENTITY_RADIUS;
    
    // Check walls
    for (const wall of this.walls) {
      if (circleRectCollide(entity.pos, radius, wall)) {
        entity.pos = resolveCircleRect(entity.pos, radius, wall);
      }
    }
    
    // Check pillars
    for (const pillar of this.pillars) {
      if (circleRectCollide(entity.pos, radius, pillar)) {
        entity.pos = resolveCircleRect(entity.pos, radius, pillar);
      }
    }
    
    // Update sprite position
    entity.sprite.setPosition(entity.pos.x, entity.pos.y);
  }
  
  getWalls(): Obstacle[] {
    return this.walls;
  }
  
  getPillars(): Obstacle[] {
    return this.pillars;
  }
  
  getAllObstacles(): Obstacle[] {
    return [...this.walls, ...this.pillars];
  }
  
  /**
   * Check if line of sight is blocked between two points
   */
  isLineOfSightBlocked(from: Vec2, to: Vec2): boolean {
    for (const pillar of this.pillars) {
      if (this.lineIntersectsRect(from, to, pillar)) {
        return true;
      }
    }
    return false;
  }
  
  private lineIntersectsRect(p1: Vec2, p2: Vec2, rect: Obstacle): boolean {
    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;
    
    // Check if both points are on same side
    if ((p1.x < left && p2.x < left) || (p1.x > right && p2.x > right)) return false;
    if ((p1.y < top && p2.y < top) || (p1.y > bottom && p2.y > bottom)) return false;
    
    // Check if either point is inside
    if (p1.x >= left && p1.x <= right && p1.y >= top && p1.y <= bottom) return true;
    if (p2.x >= left && p2.x <= right && p2.y >= top && p2.y <= bottom) return true;
    
    // Check edge intersections
    return (
      this.lineIntersectsLine(p1, p2, { x: left, y: top }, { x: right, y: top }) ||
      this.lineIntersectsLine(p1, p2, { x: right, y: top }, { x: right, y: bottom }) ||
      this.lineIntersectsLine(p1, p2, { x: right, y: bottom }, { x: left, y: bottom }) ||
      this.lineIntersectsLine(p1, p2, { x: left, y: bottom }, { x: left, y: top })
    );
  }
  
  private lineIntersectsLine(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
    const d = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
    if (d === 0) return false;
    
    const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / d;
    const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / d;
    
    return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
  }
}
