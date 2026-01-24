/**
 * Skill Check System - Timing-based QTE
 * Shows a letter for 1.5s, then a shrinking square - press at the perfect moment!
 */

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import * as C from '../utils/constants';

enum SkillCheckState {
  SHOWING_LETTER = 'showing_letter',
  SHRINKING = 'shrinking',
  WAITING_INPUT = 'waiting_input',
  COMPLETE = 'complete',
}

export class SkillCheck {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private requiredKey: string = '';
  private requiredKeyCode: string = '';
  private state: SkillCheckState = SkillCheckState.SHOWING_LETTER;
  private timer: number = 0;
  private letterShowDuration: number = 1.0; // 1.0 seconds to see the letter (harder)
  private shrinkDuration: number = 0.35; // 0.35 seconds for square to shrink (faster = harder)
  private perfectMomentTime: number = 0; // Exact time when square reaches target size
  private keyPressTime: number = 0; // When player pressed the key
  private isActive: boolean = false;
  private onComplete: ((result: 'perfect' | 'close' | 'miss') => void) | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;
  
  // Key codes for skill checks - NOT movement/action keys
  // Excludes: W, A, S, D (movement), SPACE (attack), SHIFT (dash), E (shield), G (god mode)
  private readonly KEYS = ['Q', 'R', 'F', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'T', 'Y', 'U', 'I', 'O', 'P'];
  private readonly KEY_CODES: Record<string, string> = {
    'Q': 'KeyQ', 'R': 'KeyR', 'F': 'KeyF', 'H': 'KeyH', 'J': 'KeyJ',
    'K': 'KeyK', 'L': 'KeyL', 'Z': 'KeyZ', 'X': 'KeyX', 'C': 'KeyC',
    'V': 'KeyV', 'B': 'KeyB', 'N': 'KeyN', 'M': 'KeyM', 'T': 'KeyT',
    'Y': 'KeyY', 'U': 'KeyU', 'I': 'KeyI', 'O': 'KeyO', 'P': 'KeyP',
  };
  
  // UI elements
  private letterSquare: Phaser.GameObjects.Rectangle | null = null;
  private letterText: Phaser.GameObjects.Text | null = null;
  private shrinkingSquare: Phaser.GameObjects.Rectangle | null = null;
  private initialSquareSize: number = 80; // Starting size of shrinking square (smaller)
  private targetSquareSize: number = 40; // Size of letter square (target, smaller)
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  start(onComplete: (result: 'perfect' | 'close' | 'miss') => void): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.state = SkillCheckState.SHOWING_LETTER;
    this.timer = 0;
    this.onComplete = onComplete;
    
    // Pick random key
    this.requiredKey = this.KEYS[Math.floor(Math.random() * this.KEYS.length)];
    this.requiredKeyCode = this.KEY_CODES[this.requiredKey];
    
    this.createUI();
    
    // Setup input - listen continuously while active
    this.keyHandler = (event: KeyboardEvent) => {
      this.handleKeyPress(event);
    };
    this.scene.input.keyboard!.on('keydown', this.keyHandler);
  }
  
  update(dt: number, player: Player): void {
    if (!this.isActive) return;
    
    // Check if player died
    if (player.isDead) {
      this.stop();
      return;
    }
    
    this.timer += dt;
    const currentTime = this.scene.time.now;
    
    if (this.state === SkillCheckState.SHOWING_LETTER) {
      // Show letter for 1.5 seconds
      if (this.timer >= this.letterShowDuration) {
        this.state = SkillCheckState.SHRINKING;
        this.timer = 0;
        this.startShrinkingAnimation();
        // Calculate perfect moment time (when shrink animation completes)
        // Perfect moment is when square reaches target size (at end of shrink)
        this.perfectMomentTime = currentTime + (this.shrinkDuration * 1000);
      }
    } else if (this.state === SkillCheckState.SHRINKING) {
      // Square is shrinking
      const progress = Math.min(1.0, this.timer / this.shrinkDuration);
      
      // Update shrinking square size
      if (this.shrinkingSquare) {
        const currentSize = this.initialSquareSize - (this.initialSquareSize - this.targetSquareSize) * progress;
        this.shrinkingSquare.setSize(currentSize, currentSize);
        
        // Color: Red during shrinking (too early)
        this.shrinkingSquare.setFillStyle(0xff0000, 0.3);
        this.shrinkingSquare.setStrokeStyle(3, 0xff0000, 0.8);
      }
      
      if (progress >= 1.0) {
        // Shrinking complete - perfect moment reached, now waiting for input
        this.state = SkillCheckState.WAITING_INPUT;
        this.timer = 0;
        
        // Change to green at perfect moment
        if (this.shrinkingSquare) {
          this.shrinkingSquare.setFillStyle(0x00ff00, 0.3);
          this.shrinkingSquare.setStrokeStyle(3, 0x00ff00, 0.8);
        }
        
        // Start timeout - if no input within 0.3s after perfect moment, it's a miss (harder)
        this.scene.time.delayedCall(300, () => {
          if (this.state === SkillCheckState.WAITING_INPUT) {
            this.handleResult('miss');
          }
        });
      }
    } else if (this.state === SkillCheckState.WAITING_INPUT) {
      // Waiting for input - update color based on timing
      const currentTime = this.scene.time.now;
      const timeSincePerfect = currentTime - this.perfectMomentTime;
      
      if (this.shrinkingSquare) {
        if (timeSincePerfect <= 50) {
          // Perfect window (0-50ms) - GREEN
          this.shrinkingSquare.setFillStyle(0x00ff00, 0.3);
          this.shrinkingSquare.setStrokeStyle(3, 0x00ff00, 0.8);
        } else if (timeSincePerfect <= 150) {
          // Close window (50-150ms) - GRAY (no effect)
          this.shrinkingSquare.setFillStyle(0x808080, 0.3);
          this.shrinkingSquare.setStrokeStyle(3, 0x808080, 0.8);
        } else {
          // Too late (150ms+) - RED
          this.shrinkingSquare.setFillStyle(0xff0000, 0.3);
          this.shrinkingSquare.setStrokeStyle(3, 0xff0000, 0.8);
        }
      }
    }
    // WAITING_INPUT state - just waiting for key press
  }
  
  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.isActive) return;
    
    // Ignore movement/action keys - these don't count
    const ignoredKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE', 'KeyG'];
    if (ignoredKeys.includes(event.code)) {
      return;
    }
    
    // Only accept the required key
    if (event.code !== this.requiredKeyCode) {
      return; // Wrong key, ignore
    }
    
    // Key pressed - check timing (harder windows)
    if (this.state === SkillCheckState.SHRINKING || this.state === SkillCheckState.WAITING_INPUT) {
      this.keyPressTime = this.scene.time.now;
      const timeDiff = Math.abs(this.keyPressTime - this.perfectMomentTime);
      
      if (timeDiff <= 50) {
        // Perfect timing (within 50ms - harder!)
        this.handleResult('perfect');
      } else if (timeDiff <= 150) {
        // Close but not perfect (50-150ms - tighter window)
        this.handleResult('close');
      } else {
        // Miss (outside 150ms - stricter)
        this.handleResult('miss');
      }
    }
  }
  
  private handleResult(result: 'perfect' | 'close' | 'miss'): void {
    if (this.state === SkillCheckState.COMPLETE) return;
    
    this.state = SkillCheckState.COMPLETE;
    
    // Remove key listener
    if (this.keyHandler) {
      this.scene.input.keyboard!.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    
    // Show result
    this.showResult(result);
    
    // Call completion callback
    if (this.onComplete) {
      this.onComplete(result);
    }
    
    // Clean up after delay
    this.scene.time.delayedCall(1000, () => {
      this.stop();
    });
  }
  
  private createUI(): void {
    if (this.container) {
      this.container.destroy();
    }
    
    // Position at 3/4 of screen height (75% down from top, or 25% from bottom)
    const posX = C.ARENA_WIDTH / 2;
    const posY = C.ARENA_HEIGHT * 0.75; // 75% from top (3/4 of screen)
    
    this.container = this.scene.add.container(posX, posY);
    this.container.setDepth(500);
    this.container.setScrollFactor(0);
    
    // NO background box - just the squares
    // NO title text
    // NO instruction text
    // Just the letter square, letter text, and shrinking square
    
    // Letter square (target size) - smaller
    this.letterSquare = this.scene.add.rectangle(0, 0, this.targetSquareSize, this.targetSquareSize, 0x333333);
    this.letterSquare.setStrokeStyle(2, C.COLOR_SKILL_CHECK, 1);
    this.letterSquare.setOrigin(0.5);
    this.container.add(this.letterSquare);
    
    // Letter text - smaller
    this.letterText = this.scene.add.text(0, 0, this.requiredKey, {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 3,
    });
    this.letterText.setOrigin(0.5);
    this.container.add(this.letterText);
    
    // Shrinking square (starts larger, hidden initially) - starts RED (too early)
    this.shrinkingSquare = this.scene.add.rectangle(0, 0, this.initialSquareSize, this.initialSquareSize, 0xff0000, 0.3);
    this.shrinkingSquare.setStrokeStyle(3, 0xff0000, 0.8);
    this.shrinkingSquare.setOrigin(0.5);
    this.shrinkingSquare.setVisible(false);
    this.container.add(this.shrinkingSquare);
  }
  
  private startShrinkingAnimation(): void {
    if (this.shrinkingSquare) {
      this.shrinkingSquare.setVisible(true);
      this.shrinkingSquare.setSize(this.initialSquareSize, this.initialSquareSize);
    }
  }
  
  private showResult(result: 'perfect' | 'close' | 'miss'): void {
    if (!this.container) return;
    
    let resultText: string;
    let color: number;
    
    if (result === 'perfect') {
      resultText = 'PERFECT! +30 HP';
      color = C.COLOR_SKILL_CHECK_SUCCESS;
    } else if (result === 'close') {
      resultText = 'CLOSE - No effect';
      color = 0xffaa00; // Orange
    } else {
      resultText = 'MISS! -20 HP';
      color = C.COLOR_SKILL_CHECK_FAIL;
    }
    
    // Hide shrinking square
    if (this.shrinkingSquare) {
      this.shrinkingSquare.setVisible(false);
    }
    
    // Show result text
    const resultDisplay = this.scene.add.text(C.ARENA_WIDTH / 2, C.ARENA_HEIGHT / 2 + 40, resultText, {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: `#${color.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3,
    });
    resultDisplay.setOrigin(0.5);
    resultDisplay.setDepth(501);
    resultDisplay.setScrollFactor(0);
    
    this.scene.tweens.add({
      targets: resultDisplay,
      alpha: 0,
      y: resultDisplay.y - 20,
      duration: 800,
      onComplete: () => resultDisplay.destroy(),
    });
  }
  
  stop(): void {
    // Remove key listener
    if (this.keyHandler) {
      this.scene.input.keyboard!.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    
    if (this.container) {
      this.container.destroy();
      this.container = null;
    }
    
    this.letterSquare = null;
    this.letterText = null;
    this.shrinkingSquare = null;
    this.isActive = false;
    this.state = SkillCheckState.SHOWING_LETTER;
  }
  
  get active(): boolean {
    return this.isActive;
  }
}
