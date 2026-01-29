/**
 * Scoreboard System - Global prize pool shared by everyone.
 * Syncs with server so every person sees the same number; every retry (anyone) adds $2.50.
 * Falls back to local-only if the API is unavailable.
 */

const PRIZE_INCREMENT = 2.5;
const INITIAL_PRIZE = 1000;
const API_BASE = '/api';

export class Scoreboard {
  private attempts: number = 0;
  private prizePool: number = INITIAL_PRIZE;

  constructor() {
    this.attempts = 0;
    this.prizePool = INITIAL_PRIZE;
  }

  /**
   * Load current global scoreboard from server. Call once when the game loads.
   * On failure, keeps default (1000) and works offline.
   */
  async load(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/scoreboard`);
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.attempts === 'number' && typeof data.prizePool === 'number') {
        this.attempts = data.attempts;
        this.prizePool = data.prizePool;
      }
    } catch {
      // Offline or no server: keep defaults
    }
  }

  /**
   * Record a new attempt (retry) and sync with server. Adds $2.50 to the global prize.
   * On failure, increments locally so the game still works offline.
   */
  async recordAttempt(): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/scoreboard/attempt`, { method: 'POST' });
      if (!res.ok) throw new Error('Server error');
      const data = await res.json();
      if (typeof data.attempts === 'number' && typeof data.prizePool === 'number') {
        this.attempts = data.attempts;
        this.prizePool = data.prizePool;
        return;
      }
    } catch {
      // Fallback: increment locally
    }
    this.attempts++;
    this.prizePool = Math.round((this.prizePool + PRIZE_INCREMENT) * 100) / 100;
  }

  getAttempts(): number {
    return this.attempts;
  }

  getPrizePool(): number {
    return this.prizePool;
  }

  getPrizeFormatted(): string {
    return `$${this.prizePool.toFixed(2)}`;
  }

  /** Reset (testing only); does not affect server. */
  reset(): void {
    this.attempts = 0;
    this.prizePool = INITIAL_PRIZE;
  }
}

export const scoreboard = new Scoreboard();
