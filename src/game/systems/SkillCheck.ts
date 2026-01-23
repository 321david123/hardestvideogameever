/**
 * Skill Check System - Dead by Daylight style QTE
 */

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import * as C from '../utils/constants';

export class SkillCheck {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;
  private requiredKey: string = '';
  private timer: number = 0;
  private duration: number = C.SKILL_CHECK_DURATION;
  private keyChangeTimer: number = 0;
  private isActive: boolean = false;
  private onSuccess: (() => void) | null = null;
  private onFail: (() => void) | null = null;
  private keyHandler: ((event: KeyboardEvent) => void) | null = null;
  
  // Key codes for skill checks - NOT movement/action keys
  // Excludes: W, A, S, D (movement), SPACE (attack), SHIFT (dash), E (shield)
  private readonly KEYS = ['Q', 'R', 'F', 'G', 'H', 'J', 'K', 'L', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'T', 'Y', 'U', 'I', 'O', 'P'];
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }
  
  start(onSuccess: () => void, onFail: () => void): void {
    if (this.isActive) return;
    
    this.isActive = true;
    this.timer = this.duration;
    this.keyChangeTimer = 0;
    this.onSuccess = onSuccess;
    this.onFail = onFail;
    
    this.requiredKey = this.KEYS[Math.floor(Math.random() * this.KEYS.length)];
    this.createUI();
    
    // Setup input - listen continuously while active
    this.keyHandler = (event: KeyboardEvent) => {
      this.handleKeyPress(event);
    };
    this.scene.input.keyboard!.on('keydown', this.keyHandler);
  }
  
  update(dt: number, player: Player): void {
    if (!this.isActive) return;
    
    this.timer -= dt;
    this.keyChangeTimer += dt;
    
    // Change key periodically to make it harder
    if (this.keyChangeTimer >= C.SKILL_CHECK_KEY_CHANGE_INTERVAL) {
      this.keyChangeTimer = 0;
      const oldKey = this.requiredKey;
      while (this.requiredKey === oldKey) {
        this.requiredKey = this.KEYS[Math.floor(Math.random() * this.KEYS.length)];
      }
      this.updateUI();
    }
    
    // Update timer visual
    if (this.container) {
      const progress = this.timer / this.duration;
      const timerBar = this.container.list.find((obj: any) => obj.name === 'timerBar') as Phaser.GameObjects.Rectangle;
      if (timerBar) {
        timerBar.setScale(progress, 1);
        timerBar.setFillStyle(
          progress > 0.5 ? C.COLOR_SKILL_CHECK_SUCCESS :
          progress > 0.25 ? C.COLOR_SKILL_CHECK :
          C.COLOR_SKILL_CHECK_FAIL
        );
      }
    }
    
    // Time ran out - fail
    if (this.timer <= 0) {
      this.fail();
    }
  }
  
  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.isActive) return;
    
    // Ignore movement/action keys - these don't count as wrong
    const ignoredKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight', 'KeyE'];
    if (ignoredKeys.includes(event.code)) {
      return; // Just ignore these keys, don't fail
    }
    
    const pressedKey = this.getKeyName(event.code);
    
    // If key is not in our skill check key list, ignore it
    if (!pressedKey || !this.KEYS.includes(pressedKey)) {
      return; // Not a skill check key, ignore
    }
    
    if (pressedKey === this.requiredKey) {
      this.success();
    } else {
      // Wrong skill check key - instant fail
      this.fail();
    }
  }
  
  private getKeyName(code: string): string {
    const keyMap: Record<string, string> = {
      'KeyQ': 'Q',
      'KeyR': 'R',
      'KeyF': 'F',
      'KeyG': 'G',
      'KeyH': 'H',
      'KeyJ': 'J',
      'KeyK': 'K',
      'KeyL': 'L',
      'KeyZ': 'Z',
      'KeyX': 'X',
      'KeyC': 'C',
      'KeyV': 'V',
      'KeyB': 'B',
      'KeyN': 'N',
      'KeyM': 'M',
      'KeyT': 'T',
      'KeyY': 'Y',
      'KeyU': 'U',
      'KeyI': 'I',
      'KeyO': 'O',
      'KeyP': 'P',
    };
    return keyMap[code] || '';
  }
  
  private createUI(): void {
    if (this.container) {
      this.container.destroy();
    }
    
    this.container = this.scene.add.container(C.ARENA_WIDTH / 2, C.ARENA_HEIGHT / 2);
    this.container.setDepth(500);
    this.container.setScrollFactor(0);
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, 300, 150, 0x000000, 0.9);
    bg.setStrokeStyle(3, C.COLOR_SKILL_CHECK, 1);
    this.container.add(bg);
    
    // Title
    const title = this.scene.add.text(0, -50, 'SKILL CHECK!', {
      fontSize: '24px',
      fontFamily: 'monospace',
      color: `#${C.COLOR_SKILL_CHECK.toString(16).padStart(6, '0')}`,
      stroke: '#000000',
      strokeThickness: 3,
    });
    title.setOrigin(0.5);
    this.container.add(title);
    
    // Key prompt
    const keyText = this.scene.add.text(0, 0, `PRESS: ${this.requiredKey}`, {
      fontSize: '32px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
    });
    keyText.setOrigin(0.5);
    keyText.name = 'keyText';
    this.container.add(keyText);
    
    // Timer bar background
    const timerBg = this.scene.add.rectangle(0, 40, 250, 8, 0x333333);
    timerBg.setOrigin(0.5);
    this.container.add(timerBg);
    
    // Timer bar
    const timerBar = this.scene.add.rectangle(-125, 40, 250, 8, C.COLOR_SKILL_CHECK_SUCCESS);
    timerBar.setOrigin(0, 0.5);
    timerBar.name = 'timerBar';
    this.container.add(timerBar);
    
    // Warning text
    const warning = this.scene.add.text(0, 60, 'Keys change rapidly!', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffaa00',
    });
    warning.setOrigin(0.5);
    this.container.add(warning);
  }
  
  private updateUI(): void {
    if (!this.container) return;
    
    const keyText = this.container.list.find((obj: any) => obj.name === 'keyText') as Phaser.GameObjects.Text;
    if (keyText) {
      keyText.setText(`PRESS: ${this.requiredKey}`);
      // Flash effect
      this.scene.tweens.add({
        targets: keyText,
        scale: { from: 1.2, to: 1 },
        duration: 100,
      });
    }
  }
  
  private success(): void {
    if (!this.isActive) return;
    
    // Remove key listener
    if (this.keyHandler) {
      this.scene.input.keyboard!.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    
    this.isActive = false;
    
    // Success effect
    if (this.container) {
      const bg = this.container.list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(3, C.COLOR_SKILL_CHECK_SUCCESS, 1);
      
      const successText = this.scene.add.text(C.ARENA_WIDTH / 2, C.ARENA_HEIGHT / 2 - 20, 'SUCCESS!', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: `#${C.COLOR_SKILL_CHECK_SUCCESS.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 3,
      });
      successText.setOrigin(0.5);
      successText.setDepth(501);
      successText.setScrollFactor(0);
      
      this.scene.tweens.add({
        targets: successText,
        alpha: 0,
        y: successText.y - 30,
        duration: 500,
        onComplete: () => successText.destroy(),
      });
    }
    
    this.scene.time.delayedCall(300, () => {
      if (this.container) {
        this.container.destroy();
        this.container = null;
      }
      if (this.onSuccess) {
        this.onSuccess();
      }
    });
  }
  
  private fail(): void {
    if (!this.isActive) return;
    
    // Remove key listener
    if (this.keyHandler) {
      this.scene.input.keyboard!.off('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    
    this.isActive = false;
    
    // Fail effect
    if (this.container) {
      const bg = this.container.list[0] as Phaser.GameObjects.Rectangle;
      bg.setStrokeStyle(3, C.COLOR_SKILL_CHECK_FAIL, 1);
      
      const failText = this.scene.add.text(C.ARENA_WIDTH / 2, C.ARENA_HEIGHT / 2 - 20, 'FAILED!', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: `#${C.COLOR_SKILL_CHECK_FAIL.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 3,
      });
      failText.setOrigin(0.5);
      failText.setDepth(501);
      failText.setScrollFactor(0);
      
      this.scene.tweens.add({
        targets: failText,
        alpha: 0,
        scale: 1.5,
        duration: 500,
        onComplete: () => failText.destroy(),
      });
    }
    
    this.scene.time.delayedCall(300, () => {
      if (this.container) {
        this.container.destroy();
        this.container = null;
      }
      if (this.onFail) {
        this.onFail();
      }
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
    this.isActive = false;
  }
  
  get active(): boolean {
    return this.isActive;
  }
}
