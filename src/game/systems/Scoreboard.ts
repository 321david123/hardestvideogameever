/**
 * Scoreboard System - Tracks attempts and prize pool
 * Note: This is intentionally NOT persisted (so it's the same on every device).
 */

const PRIZE_INCREMENT = 2.5; // +$2.50 per retry
const INITIAL_PRIZE = 1000; // Start at $1,000, then add $2.50 each retry

export class Scoreboard {
  private attempts: number = 0;
  private prizePool: number = 0;

  constructor() {
    // No persistence on purpose
    this.attempts = 0;
    this.prizePool = INITIAL_PRIZE;
  }

  /**
   * Record a new attempt (called when game starts)
   */
  recordAttempt(): void {
    this.attempts++;
    this.prizePool += PRIZE_INCREMENT;
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
  }
}

// Singleton instance
export const scoreboard = new Scoreboard();
