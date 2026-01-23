/**
 * Math utilities for the game
 */

export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number = 0, y: number = 0): Vec2 {
  return { x, y };
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function length(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function normalize(v: Vec2): Vec2 {
  const len = length(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function distance(a: Vec2, b: Vec2): number {
  return length(sub(b, a));
}

export function distanceSq(a: Vec2, b: Vec2): number {
  return lengthSq(sub(b, a));
}

export function angle(v: Vec2): number {
  return Math.atan2(v.y, v.x);
}

export function fromAngle(rad: number): Vec2 {
  return { x: Math.cos(rad), y: Math.sin(rad) };
}

export function rotate(v: Vec2, rad: number): Vec2 {
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos,
  };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec2(a: Vec2, b: Vec2, t: number): Vec2 {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

/**
 * Check if angle `test` is within arc centered at `center` with half-width `halfArc`
 */
export function isAngleInArc(test: number, center: number, halfArc: number): boolean {
  let diff = test - center;
  // Normalize to [-PI, PI]
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) <= halfArc;
}

/**
 * Circle-circle collision
 */
export function circlesCollide(
  p1: Vec2,
  r1: number,
  p2: Vec2,
  r2: number
): boolean {
  return distanceSq(p1, p2) < (r1 + r2) * (r1 + r2);
}

/**
 * Circle-rectangle collision
 */
export function circleRectCollide(
  circle: Vec2,
  radius: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < radius * radius;
}

/**
 * Push circle out of rectangle, returns new position
 */
export function resolveCircleRect(
  circle: Vec2,
  radius: number,
  rect: { x: number; y: number; width: number; height: number }
): Vec2 {
  const closestX = clamp(circle.x, rect.x, rect.x + rect.width);
  const closestY = clamp(circle.y, rect.y, rect.y + rect.height);
  
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  
  if (dist === 0) {
    // Circle center is inside rect, push to nearest edge
    const toLeft = circle.x - rect.x;
    const toRight = rect.x + rect.width - circle.x;
    const toTop = circle.y - rect.y;
    const toBottom = rect.y + rect.height - circle.y;
    
    const minDist = Math.min(toLeft, toRight, toTop, toBottom);
    
    if (minDist === toLeft) return { x: rect.x - radius, y: circle.y };
    if (minDist === toRight) return { x: rect.x + rect.width + radius, y: circle.y };
    if (minDist === toTop) return { x: circle.x, y: rect.y - radius };
    return { x: circle.x, y: rect.y + rect.height + radius };
  }
  
  if (dist < radius) {
    const overlap = radius - dist;
    return {
      x: circle.x + (dx / dist) * overlap,
      y: circle.y + (dy / dist) * overlap,
    };
  }
  
  return circle;
}

/**
 * Line segment intersection check
 */
export function lineIntersectsRect(
  p1: Vec2,
  p2: Vec2,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  // Check if line intersects any of the 4 edges
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  
  // Check if both points are on same side of rect
  if ((p1.x < left && p2.x < left) || (p1.x > right && p2.x > right)) return false;
  if ((p1.y < top && p2.y < top) || (p1.y > bottom && p2.y > bottom)) return false;
  
  // Check if either point is inside
  if (p1.x >= left && p1.x <= right && p1.y >= top && p1.y <= bottom) return true;
  if (p2.x >= left && p2.x <= right && p2.y >= top && p2.y <= bottom) return true;
  
  // Check edge intersections
  return (
    lineIntersectsLine(p1, p2, { x: left, y: top }, { x: right, y: top }) ||
    lineIntersectsLine(p1, p2, { x: right, y: top }, { x: right, y: bottom }) ||
    lineIntersectsLine(p1, p2, { x: right, y: bottom }, { x: left, y: bottom }) ||
    lineIntersectsLine(p1, p2, { x: left, y: bottom }, { x: left, y: top })
  );
}

function lineIntersectsLine(p1: Vec2, p2: Vec2, p3: Vec2, p4: Vec2): boolean {
  const d = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (d === 0) return false;
  
  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / d;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / d;
  
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
}
