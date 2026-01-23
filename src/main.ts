/**
 * VOID DUELIST
 * A 1v1 top-down pixel dueling game where you face The Void
 * 
 * Controls:
 * - WASD: Move
 * - SHIFT: Dash (short invincible burst)
 * - SPACE: Attack (melee slash)
 * - E: Parry (brief window, stuns attacker if timed)
 * 
 * The Void adapts to your playstyle. Good luck.
 */

import { createGame } from './game/Game';

// Boot the game
const game = createGame();

// Handle visibility change (pause when tab hidden)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    game.scene.pause('ArenaScene');
  } else {
    game.scene.resume('ArenaScene');
  }
});

// Prevent default behaviors for game keys
window.addEventListener('keydown', (e) => {
  // Prevent space from scrolling
  if (e.code === 'Space' && e.target === document.body) {
    e.preventDefault();
  }
});

console.log(`
╔═══════════════════════════════════════╗
║          VOID DUELIST v0.1.0          ║
╠═══════════════════════════════════════╣
║  Controls:                            ║
║  WASD  - Move                         ║
║  SHIFT - Dash                         ║
║  SPACE - Attack                       ║
║  E     - Parry                        ║
╠═══════════════════════════════════════╣
║  The Void watches. The Void adapts.   ║
║  Can you overcome the inevitable?     ║
╚═══════════════════════════════════════╝
`);
