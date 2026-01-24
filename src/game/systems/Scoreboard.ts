/**
 * Scoreboard System - Tracks attempts and prize pool
 * Uses localStorage to persist data across sessions
 */

const STORAGE_KEY_ATTEMPTS = 'void_duelist_attempts';
const STORAGE_KEY_PRIZE = 'void_duelist_prize';
const PRIZE_INCREMENT = 2.5; // $2.50 per attempt
const INITIAL_PRIZE = 0; // Start at $0

export class Scoreboard {
  private attempts: number = 0;
  private prizePool: number = 0;

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const attemptsStr = localStorage.getItem(STORAGE_KEY_ATTEMPTS);
      const prizeStr = localStorage.getItem(STORAGE_KEY_PRIZE);
      
      this.attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;
      this.prizePool = prizeStr ? parseFloat(prizeStr) : INITIAL_PRIZE;
    } catch (e) {
      console.warn('Failed to load scoreboard from localStorage:', e);
      this.attempts = 0;
      this.prizePool = INITIAL_PRIZE;
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY_ATTEMPTS, this.attempts.toString());
      localStorage.setItem(STORAGE_KEY_PRIZE, this.prizePool.toFixed(2));
    } catch (e) {
      console.warn('Failed to save scoreboard to localStorage:', e);
    }
  }

  /**
   * Record a new attempt (called when game starts)
   */
  recordAttempt(): void {
    this.attempts++;
    this.prizePool += PRIZE_INCREMENT;
    this.saveToStorage();
  }

  /**
   * Get current attempt count
   */
  getAttempts(): number {
    return this.attempts;
  }

  /**
   * Get current prize pool amount
   */
  getPrizePool(): number {
    return this.prizePool;
  }

  /**
   * Format prize pool as currency string
   */
  getPrizeFormatted(): string {
    return `$${this.prizePool.toFixed(2)}`;
  }

  /**
   * Reset scoreboard (for testing/admin purposes)
   */
  reset(): void {
    this.attempts = 0;
    this.prizePool = INITIAL_PRIZE;
    this.saveToStorage();
  }
}

// Singleton instance
export const scoreboard = new Scoreboard();
