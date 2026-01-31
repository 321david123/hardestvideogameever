/**
 * Scoreboard System - Global prize pool shared by everyone.
 * Syncs with server so every person sees the same number; every retry (anyone) adds $2.50.
 * Falls back to local-only if the API is unavailable.
 */

const PRIZE_INCREMENT = 2.5;
const INITIAL_PRIZE = 1000;
const API_BASE = '/api';

function getApiUrl(path: string): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path.startsWith('/') ? path : `/${path}`}`;
  }
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export class Scoreboard {
  private attempts: number = 0;
  private prizePool: number = INITIAL_PRIZE;

  constructor() {
    this.attempts = 0;
    this.prizePool = INITIAL_PRIZE;
  }

  /**
   * Load current global scoreboard from server. Call once when the game loads.
   * Retries once on failure. On failure, keeps default (1000) and works offline.
   */
  async load(): Promise<void> {
    const url = getApiUrl(`${API_BASE}/scoreboard`);
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) continue;
        const data = await res.json();
        if (typeof data.attempts === 'number' && typeof data.prizePool === 'number') {
          this.attempts = data.attempts;
          this.prizePool = data.prizePool;
          return;
        }
      } catch {
        if (attempt === 0) await new Promise((r) => setTimeout(r, 400));
      }
    }
  }

  /**
   * Record a new attempt (retry) and sync with server. Adds $2.50 to the global prize.
   * On failure, increments locally so the game still works offline.
   */
  async recordAttempt(): Promise<void> {
    const url = getApiUrl(`${API_BASE}/scoreboard/attempt`);
    try {
      const res = await fetch(url, { method: 'POST', cache: 'no-store' });
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
