/**
 * HUD - Dark Souls style boss bar + player info + shield bar
 */

import Phaser from 'phaser';
import { Entity } from '../entities/Entity';
import { Player } from '../entities/Player';
import { Void } from '../entities/Void';
import * as C from '../utils/constants';
import { scoreboard } from '../systems/Scoreboard';

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  // private bossNameTween: Phaser.Tweens.Tween | null = null; // Unused
  
  // Player HP
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private playerHpText!: Phaser.GameObjects.Text;
  
  // Player Shield Bar
  private shieldBar!: Phaser.GameObjects.Graphics;
  private shieldBarBg!: Phaser.GameObjects.Rectangle;
  private shieldText!: Phaser.GameObjects.Text;
  
  // Boss HP - Dark Souls style
  private bossContainer!: Phaser.GameObjects.Container;
  private bossHpBarBg!: Phaser.GameObjects.Rectangle;
  private bossHpBar!: Phaser.GameObjects.Graphics;
  private bossNameText!: Phaser.GameObjects.Text;
  private bossHpText!: Phaser.GameObjects.Text;
  
  // Cooldown indicators
  private playerCooldowns!: Phaser.GameObjects.Graphics;
  
  // Pickup indicator
  private pickupIndicator!: Phaser.GameObjects.Container;
  private pickupChargesText!: Phaser.GameObjects.Text;
  
  // Timer
  private timerText!: Phaser.GameObjects.Text;
  private elapsedTime: number = 0;
  
  // Scoreboard
  private scoreboardContainer!: Phaser.GameObjects.Container;
  private attemptsText!: Phaser.GameObjects.Text;
  private prizeText!: Phaser.GameObjects.Text;
  
  private readonly PLAYER_BAR_WIDTH = 160;
  private readonly PLAYER_BAR_HEIGHT = 12;
  private readonly SHIELD_BAR_WIDTH = 120;
  private readonly SHIELD_BAR_HEIGHT = 8;
  private readonly BOSS_BAR_WIDTH = 600;
  private readonly BOSS_BAR_HEIGHT = 20;
  private readonly PADDING = 20;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setScrollFactor(0);
    
    this.createPlayerHP();
    this.createShieldBar();
    this.createBossHP();
    this.createCooldownIndicators();
    this.createPickupIndicator();
    this.createTimer();
    this.createScoreboard();
  }
  
  private createPlayerHP(): void {
    const x = this.PADDING;
    const y = C.ARENA_HEIGHT - this.PADDING - this.PLAYER_BAR_HEIGHT;
    
    // Background
    const bg = this.scene.add.rectangle(
      x, y, this.PLAYER_BAR_WIDTH, this.PLAYER_BAR_HEIGHT,
      0x1a1a2e
    );
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(2, C.COLOR_PLAYER, 0.5);
    this.container.add(bg);
    
    // HP bar
    this.playerHpBar = this.scene.add.graphics();
    this.container.add(this.playerHpBar);
    
    // Label
    const label = this.scene.add.text(x, y - 16, 'HP', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#4fd1c5',
    });
    this.container.add(label);
    
    // HP text
    this.playerHpText = this.scene.add.text(
      x + this.PLAYER_BAR_WIDTH + 8, y + this.PLAYER_BAR_HEIGHT / 2,
      '100',
      {
        fontSize: '11px',
        fontFamily: 'monospace',
        color: '#ffffff',
      }
    );
    this.playerHpText.setOrigin(0, 0.5);
    this.container.add(this.playerHpText);
  }
  
  private createShieldBar(): void {
    const x = this.PADDING;
    const y = C.ARENA_HEIGHT - this.PADDING - this.PLAYER_BAR_HEIGHT - this.SHIELD_BAR_HEIGHT - 25;
    
    // Background
    this.shieldBarBg = this.scene.add.rectangle(
      x, y, this.SHIELD_BAR_WIDTH, this.SHIELD_BAR_HEIGHT,
      0x1a1a2e
    );
    this.shieldBarBg.setOrigin(0, 0);
    this.shieldBarBg.setStrokeStyle(1, C.COLOR_PARRY, 0.4);
    this.container.add(this.shieldBarBg);
    
    // Shield bar
    this.shieldBar = this.scene.add.graphics();
    this.container.add(this.shieldBar);
    
    // Label
    const label = this.scene.add.text(x, y - 14, 'SHIELD [E]', {
      fontSize: '9px',
      fontFamily: 'monospace',
      color: '#ffd700',
    });
    this.container.add(label);
    
    // Shield text (shows if recharging)
    this.shieldText = this.scene.add.text(
      x + this.SHIELD_BAR_WIDTH + 6, y + this.SHIELD_BAR_HEIGHT / 2,
      '',
      {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#ffd700',
      }
    );
    this.shieldText.setOrigin(0, 0.5);
    this.container.add(this.shieldText);
  }
  
  private createBossHP(): void {
    this.bossContainer = this.scene.add.container(C.ARENA_WIDTH / 2, 50);
    this.bossContainer.setDepth(200);
    this.bossContainer.setScrollFactor(0);
    
    // Background bar with ornate styling
    this.bossHpBarBg = this.scene.add.rectangle(
      0, 0,
      this.BOSS_BAR_WIDTH + 8, this.BOSS_BAR_HEIGHT + 8,
      0x0a0a0f
    );
    this.bossHpBarBg.setStrokeStyle(2, C.COLOR_VOID_DARK, 1);
    this.bossContainer.add(this.bossHpBarBg);
    
    // Inner frame
    const innerFrame = this.scene.add.rectangle(
      0, 0,
      this.BOSS_BAR_WIDTH + 2, this.BOSS_BAR_HEIGHT + 2,
      0x1a1a2e
    );
    innerFrame.setStrokeStyle(1, C.COLOR_VOID, 0.5);
    this.bossContainer.add(innerFrame);
    
    // HP bar graphics
    this.bossHpBar = this.scene.add.graphics();
    this.bossContainer.add(this.bossHpBar);
    
    // Boss name - below the bar
    this.bossNameText = this.scene.add.text(0, this.BOSS_BAR_HEIGHT + 12, 'T H E   V O I D', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#9f7aea',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.bossNameText.setOrigin(0.5, 0);
    this.bossContainer.add(this.bossNameText);
    
    // HP text
    this.bossHpText = this.scene.add.text(0, 0, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.bossHpText.setOrigin(0.5, 0.5);
    this.bossContainer.add(this.bossHpText);
    
    // Subtle pulse animation (do it manually in update instead of infinite tween)
    
    // Corner decorations
    const cornerSize = 8;
    const corners = [
      { x: -this.BOSS_BAR_WIDTH / 2 - 4, y: -this.BOSS_BAR_HEIGHT / 2 - 4 },
      { x: this.BOSS_BAR_WIDTH / 2 + 4, y: -this.BOSS_BAR_HEIGHT / 2 - 4 },
      { x: -this.BOSS_BAR_WIDTH / 2 - 4, y: this.BOSS_BAR_HEIGHT / 2 + 4 },
      { x: this.BOSS_BAR_WIDTH / 2 + 4, y: this.BOSS_BAR_HEIGHT / 2 + 4 },
    ];
    
    corners.forEach(pos => {
      const corner = this.scene.add.rectangle(pos.x, pos.y, cornerSize, cornerSize, C.COLOR_VOID, 0.6);
      this.bossContainer.add(corner);
    });
  }
  
  private createCooldownIndicators(): void {
    this.playerCooldowns = this.scene.add.graphics();
    this.container.add(this.playerCooldowns);
  }
  
  private createPickupIndicator(): void {
    this.pickupIndicator = this.scene.add.container(this.PADDING + this.PLAYER_BAR_WIDTH + 40, C.ARENA_HEIGHT - this.PADDING - 10);
    this.pickupIndicator.setVisible(false);
    this.container.add(this.pickupIndicator);
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, 70, 22, 0x0a0a0f, 0.8);
    bg.setOrigin(0, 0.5);
    bg.setStrokeStyle(2, C.COLOR_PICKUP, 0.8);
    this.pickupIndicator.add(bg);
    
    // Icon
    const icon = this.scene.add.text(6, 0, '⚡', { fontSize: '12px' });
    icon.setOrigin(0, 0.5);
    this.pickupIndicator.add(icon);
    
    // Charges text
    this.pickupChargesText = this.scene.add.text(26, 0, 'x3', {
      fontSize: '11px',
      fontFamily: 'monospace',
      color: '#00ffaa',
    });
    this.pickupChargesText.setOrigin(0, 0.5);
    this.pickupIndicator.add(this.pickupChargesText);
  }
  
  private createTimer(): void {
    this.timerText = this.scene.add.text(
      C.ARENA_WIDTH / 2,
      100,
      '0:00',
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#444444',
      }
    );
    this.timerText.setOrigin(0.5, 0);
    this.container.add(this.timerText);
  }
  
  update(dt: number, player: Player, void_: Entity): void {
    this.elapsedTime += dt;
    
    this.updatePlayerHP(player);
    this.updateShieldBar(player);
    this.updateBossHP(void_);
    this.updateCooldowns(player);
    this.updatePickupIndicator(player);
    this.updateTimer();
    this.updateScoreboard();
  }
  
  private updatePlayerHP(player: Player): void {
    const x = this.PADDING;
    const y = C.ARENA_HEIGHT - this.PADDING - this.PLAYER_BAR_HEIGHT;
    const hpPercent = player.stats.hp / player.stats.maxHp;
    
    this.playerHpBar.clear();
    this.playerHpBar.fillStyle(C.COLOR_PLAYER, 1);
    this.playerHpBar.fillRect(x, y, this.PLAYER_BAR_WIDTH * hpPercent, this.PLAYER_BAR_HEIGHT);
    
    this.playerHpText.setText(Math.ceil(player.stats.hp).toString());
    
    // Flash when low HP
    if (hpPercent < 0.3) {
      this.playerHpBar.fillStyle(C.COLOR_DAMAGE, 0.3 + Math.sin(this.elapsedTime * 10) * 0.3);
      this.playerHpBar.fillRect(x, y, this.PLAYER_BAR_WIDTH * hpPercent, this.PLAYER_BAR_HEIGHT);
    }
  }
  
  private updateShieldBar(player: Player): void {
    const x = this.PADDING;
    const y = C.ARENA_HEIGHT - this.PADDING - this.PLAYER_BAR_HEIGHT - this.SHIELD_BAR_HEIGHT - 25;
    const shieldPercent = player.shieldPercent;
    
    this.shieldBar.clear();
    
    // Background fill (empty portion)
    this.shieldBar.fillStyle(0x333333, 0.3);
    this.shieldBar.fillRect(x, y, this.SHIELD_BAR_WIDTH, this.SHIELD_BAR_HEIGHT);
    
    // Shield bar
    const color = player.isShielding ? 0xffaa00 : C.COLOR_PARRY; // Orange when active
    const alpha = player.isShielding ? 1 : 0.8;
    this.shieldBar.fillStyle(color, alpha);
    this.shieldBar.fillRect(x, y, this.SHIELD_BAR_WIDTH * shieldPercent, this.SHIELD_BAR_HEIGHT);
    
    // Glow effect when full
    if (shieldPercent >= 1) {
      const pulse = Math.sin(this.elapsedTime * 4) * 0.2 + 0.8;
      this.shieldBarBg.setStrokeStyle(2, C.COLOR_PARRY, pulse);
    } else {
      this.shieldBarBg.setStrokeStyle(1, C.COLOR_PARRY, 0.4);
    }
    
    // Status text
    if (player.isShielding) {
      this.shieldText.setText('ACTIVE');
      this.shieldText.setColor('#ffaa00');
    } else if (shieldPercent < 1 && player.shieldRegenTimer < C.SHIELD_REGEN_DELAY) {
      const waitTime = Math.ceil(C.SHIELD_REGEN_DELAY - player.shieldRegenTimer);
      this.shieldText.setText(`${waitTime}s`);
      this.shieldText.setColor('#666666');
    } else if (shieldPercent < 1) {
      this.shieldText.setText('REGEN');
      this.shieldText.setColor('#ffd700');
    } else {
      this.shieldText.setText('READY');
      this.shieldText.setColor('#ffd700');
    }
  }
  
  private updateBossHP(void_: Entity): void {
    const hpPercent = void_.stats.hp / void_.stats.maxHp;
    const barWidth = this.BOSS_BAR_WIDTH * hpPercent;
    
    this.bossHpBar.clear();
    
    // Phase 2 uses different color
    const voidEntity = void_ as Void;
    const barColor = voidEntity.phase === 2 ? C.COLOR_VOID_PHASE2 : C.COLOR_VOID;
    const barColorDark = voidEntity.phase === 2 ? C.COLOR_VOID_DARK : C.COLOR_VOID_DARK;
    
    // Main HP bar with gradient effect
    this.bossHpBar.fillStyle(barColorDark, 1);
    this.bossHpBar.fillRect(-this.BOSS_BAR_WIDTH / 2, -this.BOSS_BAR_HEIGHT / 2, barWidth, this.BOSS_BAR_HEIGHT);
    
    // Brighter top portion
    this.bossHpBar.fillStyle(barColor, 0.8);
    this.bossHpBar.fillRect(-this.BOSS_BAR_WIDTH / 2, -this.BOSS_BAR_HEIGHT / 2, barWidth, this.BOSS_BAR_HEIGHT / 2);
    
    // Highlight line at top
    this.bossHpBar.fillStyle(0xffffff, 0.2);
    this.bossHpBar.fillRect(-this.BOSS_BAR_WIDTH / 2, -this.BOSS_BAR_HEIGHT / 2, barWidth, 2);
    
    // HP text
    this.bossHpText.setText(`${Math.ceil(void_.stats.hp)} / ${void_.stats.maxHp}`);
    
    // Update boss name for Phase 2
    if (voidEntity.phase === 2) {
      this.bossNameText.setText('P H A S E   2   -   T H E   V O I D   A S C E N D E D');
      this.bossNameText.setColor('#6b46c1'); // Darker purple
      // More intense pulsing in Phase 2
      this.bossNameText.setAlpha(0.9 + Math.sin(this.elapsedTime * 3) * 0.1);
    } else {
      this.bossNameText.setText('T H E   V O I D');
      this.bossNameText.setColor('#9f7aea'); // Normal purple
      this.bossNameText.setAlpha(0.85 + Math.sin(this.elapsedTime * 1.5) * 0.15);
    }
    
    // Shake when low HP
    if (hpPercent < 0.3) {
      const shake = Math.sin(this.elapsedTime * 20) * 2;
      this.bossContainer.setPosition(C.ARENA_WIDTH / 2 + shake, 50);
    } else {
      this.bossContainer.setPosition(C.ARENA_WIDTH / 2, 50);
    }
  }
  
  private updateCooldowns(player: Player): void {
    const x = this.PADDING;
    const y = C.ARENA_HEIGHT - this.PADDING - this.PLAYER_BAR_HEIGHT - this.SHIELD_BAR_HEIGHT - 55;
    const size = 16;
    const gap = 4;
    
    this.playerCooldowns.clear();
    
    // Just Dash and Attack (Shield has its own bar now)
    const colors = [0x4fd1c5, C.COLOR_DAMAGE];
    const cooldowns = [player.dashCooldown, player.attackCooldown];
    
    cooldowns.forEach((cd, i) => {
      const cx = x + i * (size + gap);
      const ready = cd.ready;
      
      // Background
      this.playerCooldowns.fillStyle(ready ? colors[i] : 0x222222, ready ? 1 : 0.5);
      this.playerCooldowns.fillRect(cx, y, size, size);
      
      // Progress fill
      if (!ready) {
        const progress = cd.progress;
        this.playerCooldowns.fillStyle(colors[i], 0.5);
        this.playerCooldowns.fillRect(cx, y + size * (1 - progress), size, size * progress);
      }
      
      // Border
      this.playerCooldowns.lineStyle(1, ready ? 0xffffff : 0x444444, 0.5);
      this.playerCooldowns.strokeRect(cx, y, size, size);
    });
  }
  
  private updatePickupIndicator(player: Player): void {
    if (player.hasLaserPickup && player.laserCharges > 0) {
      this.pickupIndicator.setVisible(true);
      this.pickupChargesText.setText(`x${player.laserCharges}`);
    } else {
      this.pickupIndicator.setVisible(false);
    }
  }
  
  private updateTimer(): void {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    this.timerText.setText(`${minutes}:${seconds.toString().padStart(2, '0')}`);
  }
  
  getElapsedTime(): number {
    return this.elapsedTime;
  }
  
  reset(): void {
    this.elapsedTime = 0;
  }
  
  destroy(): void {
    this.container.destroy();
    this.bossContainer.destroy();
    if (this.scoreboardContainer) {
      this.scoreboardContainer.destroy();
    }
  }
  
  private createScoreboard(): void {
    // Position in top-right corner
    const x = C.ARENA_WIDTH - this.PADDING;
    const y = this.PADDING + 10;
    
    this.scoreboardContainer = this.scene.add.container(x, y);
    this.scoreboardContainer.setDepth(200);
    this.scoreboardContainer.setScrollFactor(0);
    
    // Background
    const bg = this.scene.add.rectangle(0, 0, 200, 60, 0x000000, 0.7);
    bg.setOrigin(1, 0);
    bg.setStrokeStyle(2, 0x4fd1c5, 0.8);
    this.scoreboardContainer.add(bg);
    
    // Title
    const title = this.scene.add.text(-10, -20, 'PRIZE POOL', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#4fd1c5',
      stroke: '#000000',
      strokeThickness: 2,
    });
    title.setOrigin(1, 0.5);
    this.scoreboardContainer.add(title);
    
    // Attempts text
    this.attemptsText = this.scene.add.text(-10, 0, '', {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    this.attemptsText.setOrigin(1, 0.5);
    this.scoreboardContainer.add(this.attemptsText);
    
    // Prize text
    this.prizeText = this.scene.add.text(-10, 18, '', {
      fontSize: '16px',
      fontFamily: 'monospace',
      color: '#ffd700',
      stroke: '#000000',
      strokeThickness: 2,
    });
    this.prizeText.setOrigin(1, 0.5);
    this.scoreboardContainer.add(this.prizeText);
    
    // Initial update
    this.updateScoreboard();
  }
  
  private updateScoreboard(): void {
    const attempts = scoreboard.getAttempts();
    const prize = scoreboard.getPrizeFormatted();
    
    this.attemptsText.setText(`Attempts: ${attempts.toLocaleString()}`);
    this.prizeText.setText(prize);
  }
}
