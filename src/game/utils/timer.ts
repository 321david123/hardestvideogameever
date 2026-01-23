/**
 * Timer utilities for cooldowns, durations, etc.
 */

export class Timer {
  private remaining: number = 0;
  private duration: number = 0;
  
  constructor(duration: number = 0) {
    this.duration = duration;
    this.remaining = 0;
  }
  
  start(duration?: number): void {
    this.duration = duration ?? this.duration;
    this.remaining = this.duration;
  }
  
  update(dt: number): void {
    if (this.remaining > 0) {
      this.remaining = Math.max(0, this.remaining - dt);
    }
  }
  
  get active(): boolean {
    return this.remaining > 0;
  }
  
  get done(): boolean {
    return this.remaining <= 0;
  }
  
  get progress(): number {
    if (this.duration === 0) return 1;
    return 1 - this.remaining / this.duration;
  }
  
  get time(): number {
    return this.remaining;
  }
  
  reset(): void {
    this.remaining = 0;
  }
}

export class Cooldown {
  private timer: Timer;
  
  constructor(private cooldownTime: number) {
    this.timer = new Timer(cooldownTime);
  }
  
  update(dt: number): void {
    this.timer.update(dt);
  }
  
  trigger(): boolean {
    if (this.ready) {
      this.timer.start(this.cooldownTime);
      return true;
    }
    return false;
  }
  
  get ready(): boolean {
    return this.timer.done;
  }
  
  get progress(): number {
    return this.timer.progress;
  }
  
  get remaining(): number {
    return this.timer.time;
  }
  
  reset(): void {
    this.timer.reset();
  }
  
  setCooldown(time: number): void {
    this.cooldownTime = time;
  }
}

/**
 * Action buffer - stores input for a brief window
 */
export class InputBuffer {
  private bufferTime: number;
  private pressed: boolean = false;
  private pressedAt: number = 0;
  
  constructor(bufferTime: number = 0.1) {
    this.bufferTime = bufferTime;
  }
  
  press(currentTime: number): void {
    this.pressed = true;
    this.pressedAt = currentTime;
  }
  
  consume(currentTime: number): boolean {
    if (this.pressed && currentTime - this.pressedAt < this.bufferTime) {
      this.pressed = false;
      return true;
    }
    return false;
  }
  
  clear(): void {
    this.pressed = false;
  }
}
