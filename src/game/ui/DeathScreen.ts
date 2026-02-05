/**
 * Death Screen - Shows stats and restart option
 */

import Phaser from 'phaser';
import * as C from '../utils/constants';

export interface GameStats {
  timeSurvived: number;
  damageDealt: number;
  hitsLanded: number;
  lowestVoidHp: number;
  playerParries: number;
  playerWon: boolean;
}

export class DeathScreen {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible: boolean = false;
  private stats: GameStats | null = null;
  private onRestart: (() => void) | null = null;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(C.ARENA_WIDTH / 2, C.ARENA_HEIGHT / 2);
    this.container.setDepth(300);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);
    this.container.setAlpha(0);
    
    this.createBackground();
    this.setupInput();
  }
  
  private createBackground(): void {
    const overlay = this.scene.add.rectangle(
      0, 0,
      C.ARENA_WIDTH, C.ARENA_HEIGHT,
      0x000000, 0.9
    );
    this.container.add(overlay);
  }
  
  private setupInput(): void {
    this.scene.input.keyboard!.on('keydown-SPACE', () => {
      if (this.visible && this.onRestart) {
        this.onRestart();
      }
    });
    
    this.scene.input.keyboard!.on('keydown-C', () => {
      if (this.visible && this.stats) {
        this.copyResults();
      }
    });
  }
  
  show(stats: GameStats, onRestart: () => void): void {
    this.stats = stats;
    this.onRestart = onRestart;
    this.visible = true;
    
    while (this.container.list.length > 1) {
      this.container.list[this.container.list.length - 1].destroy();
    }
    
    // Title with dramatic effect
    const title = this.scene.add.text(0, -200, 
      stats.playerWon ? '⚔ THE VOID IS SILENCED ⚔' : '☠ CONSUMED BY THE VOID ☠',
      {
        fontSize: stats.playerWon ? '32px' : '28px',
        fontFamily: 'monospace',
        color: stats.playerWon ? '#4fd1c5' : '#9f7aea',
        stroke: '#000000',
        strokeThickness: 4,
      }
    );
    title.setOrigin(0.5);
    this.container.add(title);
    
    // Subtitle
    const subtitle = this.scene.add.text(0, -160,
      stats.playerWon 
        ? 'Against all odds, you prevailed.' 
        : 'The Void consumes all who dare challenge it.',
      {
        fontSize: '13px',
        fontFamily: 'monospace',
        color: '#666666',
      }
    );
    subtitle.setOrigin(0.5);
    this.container.add(subtitle);
    
    // Stats section
    const statY = -90;
    const lineHeight = 32;
    const damagePercent = Math.round((stats.damageDealt / C.VOID_HP) * 100);
    const hpRemainingPercent = Math.round((stats.lowestVoidHp / C.VOID_HP) * 100);
    
    const statsData = [
      { label: 'Time Survived', value: this.formatTime(stats.timeSurvived), color: '#ffffff' },
      { label: 'Damage Dealt', value: `${stats.damageDealt} / ${C.VOID_HP} (${damagePercent}%)`, color: damagePercent > 50 ? '#4fd1c5' : '#ffffff' },
      { label: 'Hits Landed', value: stats.hitsLanded.toString(), color: '#ffffff' },
      { label: 'Closest Moment', value: `${stats.lowestVoidHp} HP (${hpRemainingPercent}%)`, color: hpRemainingPercent < 30 ? '#ffd700' : '#ffffff' },
      { label: 'Successful Parries', value: stats.playerParries.toString(), color: stats.playerParries >= 3 ? '#ffd700' : '#ffffff' },
    ];
    
    // Divider above stats
    const dividerTop = this.scene.add.rectangle(0, statY - 20, 350, 1, 0x444444);
    this.container.add(dividerTop);
    
    statsData.forEach((stat, i) => {
      const label = this.scene.add.text(-170, statY + i * lineHeight, stat.label, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#888888',
      });
      label.setOrigin(0, 0.5);
      this.container.add(label);
      
      const value = this.scene.add.text(170, statY + i * lineHeight, stat.value, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: stat.color,
      });
      value.setOrigin(1, 0.5);
      this.container.add(value);
    });
    
    // Divider below stats
    const dividerBottom = this.scene.add.rectangle(0, statY + statsData.length * lineHeight + 10, 350, 1, 0x444444);
    this.container.add(dividerBottom);
    
    // Performance rating
    let rating = 'CHALLENGER';
    let ratingColor = '#888888';
    
    if (stats.playerWon) {
      rating = '★ VOID SLAYER ★';
      ratingColor = '#ffd700';
    } else if (damagePercent >= 75) {
      rating = 'SO CLOSE';
      ratingColor = '#ff6b6b';
    } else if (damagePercent >= 50) {
      rating = 'WORTHY OPPONENT';
      ratingColor = '#4fd1c5';
    } else if (damagePercent >= 25) {
      rating = 'LEARNING';
      ratingColor = '#888888';
    } else {
      rating = 'CONSUMED';
      ratingColor = '#9f7aea';
    }
    
    const ratingText = this.scene.add.text(0, statY + statsData.length * lineHeight + 45, rating, {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: ratingColor,
      stroke: '#000000',
      strokeThickness: 2,
    });
    ratingText.setOrigin(0.5);
    this.container.add(ratingText);
    
    // Instructions (tap or SPACE to retry)
    const restartText = this.scene.add.text(0, 160, '[ SPACE ] Try Again', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#4fd1c5',
    });
    restartText.setOrigin(0.5);
    restartText.setInteractive({ useHandCursor: true });
    restartText.on('pointerdown', () => {
      if (this.visible && this.onRestart) this.onRestart();
    });
    this.container.add(restartText);
    
    const copyText = this.scene.add.text(0, 195, '[ C ] Copy Results', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#555555',
    });
    copyText.setOrigin(0.5);
    this.container.add(copyText);
    
    // Pulse restart text (limited repeats, not infinite)
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween.destroy();
    }
    this.pulseTween = this.scene.tweens.add({
      targets: restartText,
      alpha: { from: 1, to: 0.4 },
      duration: 700,
      yoyo: true,
      repeat: 50, // Limited instead of infinite
    });
    
    // Animate in
    this.container.setVisible(true);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 600,
      ease: 'Cubic.easeOut',
    });
    
    // Animate title
    title.setScale(0.3);
    title.setAlpha(0);
    this.scene.tweens.add({
      targets: title,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut',
    });
  }
  
  hide(): void {
    this.visible = false;
    
    // Stop pulse tween
    if (this.pulseTween) {
      this.pulseTween.stop();
      this.pulseTween.destroy();
      this.pulseTween = null;
    }
    
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 200,
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }
  
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  
  private copyResults(): void {
    if (!this.stats) return;
    
    const damagePercent = Math.round((this.stats.damageDealt / C.VOID_HP) * 100);
    
    const result = this.stats.playerWon
      ? `⚔️ VOID DUELIST - VICTORY ⚔️`
      : `☠️ VOID DUELIST ☠️`;
    
    const text = `${result}
━━━━━━━━━━━━━━━━━━━━━━
⏱️ Time: ${this.formatTime(this.stats.timeSurvived)}
⚔️ Damage: ${this.stats.damageDealt}/${C.VOID_HP} (${damagePercent}%)
🎯 Hits: ${this.stats.hitsLanded}
💀 Closest: ${this.stats.lowestVoidHp} HP
🛡️ Parries: ${this.stats.playerParries}
━━━━━━━━━━━━━━━━━━━━━━
Can you defeat The Void?`;
    
    navigator.clipboard.writeText(text).then(() => {
      const feedback = this.scene.add.text(0, 230, '✓ Copied to clipboard!', {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#4fd1c5',
      });
      feedback.setOrigin(0.5);
      this.container.add(feedback);
      
      this.scene.tweens.add({
        targets: feedback,
        alpha: 0,
        y: 220,
        duration: 1500,
        onComplete: () => feedback.destroy(),
      });
    });
  }
  
  isVisible(): boolean {
    return this.visible;
  }
  
  destroy(): void {
    this.container.destroy();
  }
}
