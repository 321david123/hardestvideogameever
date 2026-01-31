/**
 * ArenaScene - Main game scene (OPTIMIZED)
 */

import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Void } from '../entities/Void';
import { Entity } from '../entities/Entity';
import { CombatSystem, HitResult } from '../systems/Combat';
import { EffectsSystem } from '../systems/Effects';
import { CollisionSystem } from '../systems/Collision';
import { PickupSystem, PickupType } from '../systems/Pickup';
import { SkillCheck } from '../systems/SkillCheck';
import { ArenaEffects } from '../systems/ArenaEffects';
import { music } from '../systems/Music';
import { scoreboard } from '../systems/Scoreboard';
import { HUD } from '../ui/HUD';
import { DeathScreen, GameStats } from '../ui/DeathScreen';
import { PauseScreen } from '../ui/PauseScreen';
import { Vec2, distance, normalize, scale } from '../utils/math';
import * as C from '../utils/constants';

export class ArenaScene extends Phaser.Scene {
  private player!: Player;
  private void_!: Void;
  
  private combat!: CombatSystem;
  private effects!: EffectsSystem;
  private collision!: CollisionSystem;
  private pickups!: PickupSystem;
  private skillCheck!: SkillCheck;
  private arenaEffects!: ArenaEffects;
  
  private hud!: HUD;
  private deathScreen!: DeathScreen;
  private pauseScreen!: PauseScreen;
  
  private gameOver: boolean = false;
  private isPaused: boolean = false;
  private isResuming: boolean = false; // Flag para el contador
  private resumeCountdown: number = 0; // Contador 3, 2, 1
  private resumeCountdownText: Phaser.GameObjects.Text | null = null;
  private musicInitialized: boolean = false;
  private phase2TransitionShown: boolean = false;
  
  // Event handlers para evitar múltiples registros
  private escKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  private rKeyHandler: ((event: KeyboardEvent) => void) | null = null;
  
  private arenaGraphics!: Phaser.GameObjects.Graphics;
  private warningOverlay: Phaser.GameObjects.Rectangle | null = null;
  
  constructor() {
    super({ key: 'ArenaScene' });
  }
  
  create(): void {
    this.createArena();
    
    this.collision = new CollisionSystem();
    this.effects = new EffectsSystem(this);
    this.pickups = new PickupSystem(this);
    this.skillCheck = new SkillCheck(this);
    this.arenaEffects = new ArenaEffects(this);
    this.arenaEffects.setPhase(1); // Start in Phase 1
    
    this.player = new Player(this, 250, C.ARENA_HEIGHT / 2);
    this.void_ = new Void(this, C.ARENA_WIDTH - 250, C.ARENA_HEIGHT / 2);
    
    this.player.setTarget(this.void_);
    this.void_.setPlayer(this.player);
    
    this.combat = new CombatSystem(this.player, this.void_);
    this.combat.setCallbacks(
      (result) => this.onHit(result),
      (defender, attacker) => this.onParry(defender as any, attacker as any),
      (killed, killer) => this.onKill(killed as any, killer as any),
      () => {}
    );
    
    this.pickups.setCallback((type, value) => this.onPickupCollected(type, value));
    
    this.hud = new HUD(this);
    this.deathScreen = new DeathScreen(this);
    this.pauseScreen = new PauseScreen(this);
    
    // Load global prize pool so everyone sees the same number (retry + refresh when done)
    scoreboard.load().finally(() => this.hud.refreshScoreboard());
    
    this.cameras.main.setBounds(0, 0, C.ARENA_WIDTH, C.ARENA_HEIGHT);
    this.cameras.main.setBackgroundColor(C.COLOR_ARENA_BG);
    
    this.input.keyboard!.once('keydown', () => this.initMusic());
    
    // Setup pause key (ESC) - usar handler reutilizable
    this.escKeyHandler = () => {
      if (!this.gameOver && !this.deathScreen.isVisible() && !this.isResuming) {
        this.togglePause();
      }
    };
    this.input.keyboard!.on('keydown-ESC', this.escKeyHandler);
    
    this.gameOver = false;
    this.isPaused = false;
    this.isResuming = false;
    this.resumeCountdown = 0;
  }
  
  private async initMusic(): Promise<void> {
    if (this.musicInitialized) return;
    this.musicInitialized = true;
    await music.init();
    music.start();
  }
  
  private createArena(): void {
    this.arenaGraphics = this.add.graphics();
    this.arenaGraphics.setDepth(-10);
    
    // Background
    this.arenaGraphics.fillStyle(C.COLOR_ARENA_BG, 1);
    this.arenaGraphics.fillRect(0, 0, C.ARENA_WIDTH, C.ARENA_HEIGHT);
    
    // Grid
    this.arenaGraphics.lineStyle(1, 0x1a1a2e, 0.2);
    for (let x = 0; x <= C.ARENA_WIDTH; x += 50) {
      this.arenaGraphics.lineBetween(x, 0, x, C.ARENA_HEIGHT);
    }
    for (let y = 0; y <= C.ARENA_HEIGHT; y += 50) {
      this.arenaGraphics.lineBetween(0, y, C.ARENA_WIDTH, y);
    }
    
    // Walls
    this.arenaGraphics.fillStyle(C.COLOR_WALL, 1);
    const w = C.WALL_THICKNESS;
    this.arenaGraphics.fillRect(0, 0, C.ARENA_WIDTH, w);
    this.arenaGraphics.fillRect(0, C.ARENA_HEIGHT - w, C.ARENA_WIDTH, w);
    this.arenaGraphics.fillRect(0, 0, w, C.ARENA_HEIGHT);
    this.arenaGraphics.fillRect(C.ARENA_WIDTH - w, 0, w, C.ARENA_HEIGHT);
    
    // Pillars
    this.arenaGraphics.fillStyle(C.COLOR_PILLAR, 1);
    for (const p of C.PILLARS) {
      this.arenaGraphics.fillRect(p.x - p.width / 2, p.y - p.height / 2, p.width, p.height);
    }
  }
  
  private frameCount: number = 0;
  
  update(_time: number, delta: number): void {
    this.frameCount++;
    
    // Handle resume countdown
    if (this.isResuming) {
      this.updateResumeCountdown(delta);
      return;
    }
    
    if (this.gameOver || this.isPaused) return;
    
    // Simple delta time - capped to prevent issues
    const dt = Math.min(delta, 50) / 1000;
    
    try {
      // Skip if hitstop
      if (!this.effects.isHitstop) {
        console.log(`[${this.frameCount}] Player update start`);
        this.player.update(dt);
        console.log(`[${this.frameCount}] Player update done`);
        
        console.log(`[${this.frameCount}] Void update start`);
        this.void_.update(dt);
        console.log(`[${this.frameCount}] Void update done`);
        
        console.log(`[${this.frameCount}] Collision start`);
        this.collision.resolveEntityCollisions(this.player);
        this.collision.resolveEntityCollisions(this.void_);
        console.log(`[${this.frameCount}] Collision done`);
        
        console.log(`[${this.frameCount}] Combat start`);
      this.combat.update();
      console.log(`[${this.frameCount}] Combat done`);
      
      // Check for Phase 2 transition (only once)
      if (this.void_.phase === 2 && this.void_.isTransitioning && !this.phase2TransitionShown) {
        this.phase2TransitionShown = true;
        this.handlePhase2Transition();
      }
      
      // Update arena effects phase
      if (this.void_.phase === 2) {
        this.arenaEffects.setPhase(2);
      } else {
        this.arenaEffects.setPhase(1);
      }
      
      // Phase 2 skill checks - proximity based with random chance
      if (this.void_.phase === 2 && !this.skillCheck.active && this.void_.skillCheckCooldown.ready) {
        const dist = distance(this.void_.pos, this.player.pos);
        
        // Check if close enough and random chance
        if (dist < C.SKILL_CHECK_TRIGGER_DISTANCE && Math.random() < C.SKILL_CHECK_TRIGGER_CHANCE) {
          this.void_.skillCheckCooldown.trigger();
          this.triggerSkillCheck();
        }
      }
      
      // Update skill check
      if (this.skillCheck.active) {
        this.skillCheck.update(dt, this.player);
      }
      
      // Check Phase 2 attacks
      this.checkPhase2Attacks();
      
      console.log(`[${this.frameCount}] Pickups start`);
      this.pickups.update(dt, this.player);
      console.log(`[${this.frameCount}] Pickups done`);
    }
    
    console.log(`[${this.frameCount}] Effects start`);
    this.effects.update(dt);
    console.log(`[${this.frameCount}] Effects done`);
    
    // Update arena effects
    this.arenaEffects.update(dt);
    
    // Check for attack warnings
    this.checkAttackWarnings();
      
      console.log(`[${this.frameCount}] HUD start`);
      this.hud.update(dt, this.player, this.void_);
      console.log(`[${this.frameCount}] HUD done`);
      
    } catch (error) {
      console.error(`[${this.frameCount}] CRASH:`, error);
    }
  }
  
  private onHit(result: HitResult): void {
    console.log('onHit: start');
    
    console.log('onHit: playing sound');
    music.playHitSound();
    
    console.log('onHit: hitstop');
    this.effects.triggerHitstop(C.HITSTOP_DURATION);
    
    console.log('onHit: screenshake');
    this.effects.triggerScreenShake(C.SCREEN_SHAKE_HIT);
    
    console.log('onHit: particles (disabled)');
    this.effects.spawnHitParticles(
      result.defender.pos.x,
      result.defender.pos.y,
      result.defender === this.player ? C.COLOR_PLAYER : C.COLOR_VOID,
      8
    );
    
    console.log('onHit: damage number');
    this.effects.spawnDamageNumber(
      result.defender.pos.x,
      result.defender.pos.y - 20,
      result.damage
    );
    
    console.log('onHit: flash entity');
    this.effects.flashEntity(result.defender.sprite);
    
    console.log('onHit: complete');
  }
  
  private onParry(defender: Phaser.GameObjects.GameObject, _attacker: Phaser.GameObjects.GameObject): void {
    const defenderEntity = defender as unknown as { pos: Vec2 };
    
    music.playParrySound();
    
    this.effects.triggerHitstop(0.12);
    this.effects.spawnParryParticles(defenderEntity.pos.x, defenderEntity.pos.y);
    this.effects.triggerScreenShake(C.SCREEN_SHAKE_HIT * 1.5);
  }
  
  private onKill(killed: Entity, _killer: Entity): void {
    const killedEntity = killed as unknown as { pos: Vec2 };
    const isPlayer = killed === (this.player as any);
    
    this.gameOver = true;
    
    music.playDeathSound(isPlayer);
    
    this.effects.triggerScreenShake(C.SCREEN_SHAKE_KILL, 0.3);
    this.effects.spawnDeathParticles(
      killedEntity.pos.x,
      killedEntity.pos.y,
      isPlayer ? C.COLOR_PLAYER : C.COLOR_VOID
    );
    
    this.time.delayedCall(800, () => {
      const stats: GameStats = {
        timeSurvived: this.hud.getElapsedTime(),
        damageDealt: this.combat.stats.playerDamageDealt,
        hitsLanded: this.combat.stats.playerHitsLanded,
        lowestVoidHp: this.combat.stats.voidLowestHp,
        playerParries: this.combat.stats.playerParries,
        playerWon: killed === (this.void_ as any),
      };
      
      this.deathScreen.show(stats, () => this.restart());
    });
  }
  
  private handlePhase2Transition(): void {
    // DRAMATIC TRANSFORMATION ANIMATION
    console.log('PHASE 2 TRANSITION - DRAMATIC ANIMATION!');
    
    // Screen flash effect
    const flash = this.add.rectangle(
      C.ARENA_WIDTH / 2,
      C.ARENA_HEIGHT / 2,
      C.ARENA_WIDTH,
      C.ARENA_HEIGHT,
      C.COLOR_VOID_PHASE2,
      1.0
    );
    flash.setDepth(250);
    flash.setScrollFactor(0);
    
    // Multiple flash pulses
    this.tweens.add({
      targets: flash,
      alpha: { from: 1, to: 0.3 },
      duration: 200,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        this.tweens.add({
          targets: flash,
          alpha: 0,
          duration: 800,
          onComplete: () => flash.destroy(),
        });
      },
    });
    
    // Screen shake - INTENSE
    this.effects.triggerScreenShake(30, 1.0);
    
    // Transformation text
    const transformText = this.add.text(
      C.ARENA_WIDTH / 2,
      C.ARENA_HEIGHT / 2,
      'THE VOID ASCENDS',
      {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: `#${C.COLOR_VOID_PHASE2_SPIKE.toString(16).padStart(6, '0')}`,
        stroke: '#000000',
        strokeThickness: 6,
      }
    );
    transformText.setOrigin(0.5);
    transformText.setDepth(251);
    transformText.setScrollFactor(0);
    transformText.setAlpha(0);
    
    this.tweens.add({
      targets: transformText,
      alpha: 1,
      scale: { from: 0.5, to: 1.2 },
      duration: 400,
      yoyo: true,
      onComplete: () => {
        this.tweens.add({
          targets: transformText,
          alpha: 0,
          scale: 1.5,
          duration: 600,
          onComplete: () => transformText.destroy(),
        });
      },
    });
    
    // Switch to Phase 2 music
    music.switchToPhase2();
    
    // Restore player HP to Phase 2 amount
    this.player.stats.maxHp = C.PLAYER_HP_PHASE2;
    this.player.stats.hp = C.PLAYER_HP_PHASE2;
    this.player.phase = 2; // Set player phase for shield duration
    console.log('Player HP restored to Phase 2: 150');
  }
  
  private triggerSkillCheck(): void {
    if (this.skillCheck.active) return;
    
    this.skillCheck.start((result: 'perfect' | 'close' | 'miss') => {
      if (result === 'perfect') {
        // Perfect timing - +30 HP
        this.player.heal(30);
        this.effects.spawnDamageNumber(
          this.player.pos.x,
          this.player.pos.y - 20,
          30,
          C.COLOR_HEAL
        );
        this.effects.triggerScreenShake(5, 0.2);
        console.log('Skill check PERFECT! +30 HP');
      } else if (result === 'close') {
        // Close but not perfect - no effect
        console.log('Skill check CLOSE - No effect');
      } else {
        // Miss - -20 damage
        const knockback = { x: 0, y: 0 };
        this.player.takeDamage(20, knockback);
        this.effects.triggerScreenShake(15, 0.3);
        console.log('Skill check MISS! -20 HP');
      }
    });
  }
  
  private checkAttackWarnings(): void {
    // Check for charge attack windup
    if (this.void_.isChargeWindup) {
      this.showVisualWarning(C.COLOR_DAMAGE, 0.15);
    }
    // Check for teleport
    else if (this.void_.isTeleporting && this.void_.teleportPhase === 'out') {
      this.showVisualWarning(C.COLOR_VOID, 0.12);
    }
    // Check for teleport strike (Phase 2)
    else if (this.void_.isTeleportStriking) {
      this.showVisualWarning(C.COLOR_VOID_LASER, 0.2);
    }
    // Check for area blast
    else if (this.void_.isAreaBlastActive) {
      this.showVisualWarning(C.COLOR_VOID_LASER, 0.18);
    }
    else {
      this.hideWarning();
    }
  }
  
  private showVisualWarning(color: number, intensity: number): void {
    if (this.warningOverlay) {
      // Update existing warning
      this.warningOverlay.setFillStyle(color, intensity);
      return;
    }
    
    // Create red/purple outline effect around screen edges
    this.warningOverlay = this.add.rectangle(
      C.ARENA_WIDTH / 2,
      C.ARENA_HEIGHT / 2,
      C.ARENA_WIDTH,
      C.ARENA_HEIGHT,
      color,
      intensity
    );
    this.warningOverlay.setDepth(399);
    this.warningOverlay.setScrollFactor(0);
    this.warningOverlay.setBlendMode(Phaser.BlendModes.ADD);
    
    // Pulsing animation
    this.tweens.add({
      targets: this.warningOverlay,
      alpha: { from: intensity, to: intensity * 0.5 },
      duration: 200,
      yoyo: true,
      repeat: -1,
    });
    
    // Light screen shake
    this.effects.triggerScreenShake(2, 0.08);
  }
  
  private hideWarning(): void {
    if (this.warningOverlay) {
      this.tweens.add({
        targets: this.warningOverlay,
        alpha: 0,
        duration: 200,
        onComplete: () => {
          if (this.warningOverlay) {
            this.warningOverlay.destroy();
            this.warningOverlay = null;
          }
        },
      });
    }
  }
  
  private checkPhase2Attacks(): void {
    if (this.void_.phase !== 2) return;
    
    // Multi-laser hit detection
    if (this.void_.isMultiLaserActive) {
      for (const dir of this.void_.multiLaserDirections) {
        // Check if player is in any laser
        const toPlayer = {
          x: this.player.pos.x - this.void_.pos.x,
          y: this.player.pos.y - this.void_.pos.y,
        };
        const projLength = toPlayer.x * dir.x + toPlayer.y * dir.y;
        
        if (projLength > 0 && projLength < C.VOID_LASER_RANGE) {
          const closestPoint = {
            x: this.void_.pos.x + dir.x * projLength,
            y: this.void_.pos.y + dir.y * projLength,
          };
          const distToLaser = distance(this.player.pos, closestPoint);
          
          if (distToLaser < C.VOID_LASER_WIDTH / 2 + C.ENTITY_RADIUS && !this.player.isInvulnerable) {
            const knockback = { x: dir.x * 200, y: dir.y * 200 };
            this.player.takeDamage(C.VOID_LASER_DAMAGE, knockback);
            this.void_.isMultiLaserActive = false; // Hit once
            break;
          }
        }
      }
    }
    
    // Area blast hit detection
    if (this.void_.isAreaBlastActive && this.void_.areaBlastTimer.progress >= 0.95) {
      const dist = distance(this.void_.pos, this.player.pos);
      if (dist < C.VOID_PHASE2_AREA_BLAST_RADIUS && !this.player.isInvulnerable) {
        const knockbackDir = normalize({
          x: this.player.pos.x - this.void_.pos.x,
          y: this.player.pos.y - this.void_.pos.y,
        });
        const knockback = scale(knockbackDir, 400);
        this.player.takeDamage(C.VOID_PHASE2_AREA_BLAST_DAMAGE, knockback);
        this.effects.triggerScreenShake(25, 0.4);
        this.void_.isAreaBlastActive = false;
      }
    }
    
    // Arena wipe hit detection - 360 degree, only safe behind pillars
    if (this.void_.isArenaWipeActive) {
      if (!this.player.isInvulnerable) {
        // Check if player is behind a pillar (safe)
        const isBehindPillar = this.collision.isLineOfSightBlocked(this.void_.pos, this.player.pos);
        
        if (!isBehindPillar) {
          // INSTA-KILL - player is not behind pillar (360 degree attack)
          const toPlayer = {
            x: this.player.pos.x - this.void_.pos.x,
            y: this.player.pos.y - this.void_.pos.y,
          };
          const knockbackDir = normalize(toPlayer);
          const knockback = scale(knockbackDir, 500);
          this.player.takeDamage(C.VOID_PHASE2_ARENA_WIPE_DAMAGE, knockback);
          this.effects.triggerScreenShake(30, 0.5);
          this.showVisualWarning(C.COLOR_WARNING_ARENA_WIPE, 0.3);
        }
      }
      
      // Clear active state and graphics after hit check
      this.void_.isArenaWipeActive = false;
      this.void_.arenaWipeGraphics.clear();
    }
  }
  
  private onPickupCollected(type: PickupType, value: number): void {
    if (type === 'health') {
      music.playHealSound();
      this.effects.spawnHitParticles(this.player.pos.x, this.player.pos.y, C.COLOR_HEAL, 6);
      this.effects.spawnDamageNumber(this.player.pos.x, this.player.pos.y - 20, value, C.COLOR_HEAL);
    } else {
      music.playPickupSound();
    }
  }
  
  private togglePause(): void {
    if (this.isPaused) {
      this.startResumeCountdown();
    } else {
      this.pause();
    }
  }
  
  private pause(): void {
    if (this.isPaused || this.gameOver || this.isResuming) return;
    
    this.isPaused = true;
    music.pause(); // Pausar música cuando se pausa el juego
    this.pauseScreen.show(
      null, // No callback directo, usamos el handler de teclado
      null  // No callback directo, usamos el handler de teclado
    );
    
    // Setup input handlers cuando se muestra el menú de pausa
    // Remover handlers anteriores si existen
    if (this.escKeyHandler) {
      this.input.keyboard!.off('keydown-ESC', this.escKeyHandler);
    }
    if (this.rKeyHandler) {
      this.input.keyboard!.off('keydown-R', this.rKeyHandler);
    }
    
    // Crear nuevos handlers
    this.escKeyHandler = () => {
      if (this.isPaused && this.pauseScreen.isVisible() && !this.isResuming) {
        this.startResumeCountdown();
      }
    };
    
    this.rKeyHandler = () => {
      if (this.isPaused && this.pauseScreen.isVisible() && !this.isResuming) {
        this.restartFromPause();
      }
    };
    
    this.input.keyboard!.on('keydown-ESC', this.escKeyHandler);
    this.input.keyboard!.on('keydown-R', this.rKeyHandler);
  }
  
  private startResumeCountdown(): void {
    if (!this.isPaused || this.isResuming) return;
    
    this.isResuming = true;
    // ============================================
    // CONFIGURACIÓN DEL CONTADOR DE REANUDACIÓN
    // ============================================
    // MODIFICA: Cambia este valor para cambiar el tiempo del contador
    // 3 = cuenta regresiva de 3, 2, 1 (3 segundos)
    // 5 = cuenta regresiva de 5, 4, 3, 2, 1 (5 segundos)
    // 1 = solo muestra "1" por 1 segundo
    this.resumeCountdown = 3; // MODIFICA: Tiempo del contador en segundos
    
    // Ocultar menú de pausa
    this.pauseScreen.hide();
    
    // Crear texto de countdown
    // ============================================
    // CONFIGURACIÓN VISUAL DEL CONTADOR
    // ============================================
    this.resumeCountdownText = this.add.text(
      C.ARENA_WIDTH / 2,
      C.ARENA_HEIGHT / 2,
      '3', // Texto inicial (se actualiza automáticamente)
      {
        // MODIFICA: Cambia el tamaño del texto del contador
        fontSize: '120px', // MODIFICA: Tamaño de fuente (ej: '80px', '150px')
        fontFamily: 'monospace',
        // MODIFICA: Cambia el color del texto
        color: '#4fd1c5', // MODIFICA: Color del contador (formato hexadecimal)
        stroke: '#000000', // MODIFICA: Color del borde del texto
        strokeThickness: 8, // MODIFICA: Grosor del borde (ej: 4, 12)
      }
    );
    this.resumeCountdownText.setOrigin(0.5);
    this.resumeCountdownText.setDepth(500);
    this.resumeCountdownText.setScrollFactor(0);
    
    // Efecto de escala (animación cuando aparece cada número)
    // MODIFICA: Cambia estos valores para ajustar la animación
    this.resumeCountdownText.setScale(0.5); // MODIFICA: Escala inicial (0.5 = 50% del tamaño)
    this.tweens.add({
      targets: this.resumeCountdownText,
      scale: 1.5, // MODIFICA: Escala máxima (1.5 = 150% del tamaño)
      duration: 200, // MODIFICA: Duración de la animación en ms (ej: 100, 300)
      yoyo: true, // Hace que vuelva a la escala inicial
      ease: 'Back.easeOut', // MODIFICA: Tipo de animación (ej: 'Linear', 'Bounce.easeOut')
    });
  }
  
  private updateResumeCountdown(delta: number): void {
    if (!this.isResuming || !this.resumeCountdownText) return;
    
    // El countdown se actualiza cada frame
    // delta está en milisegundos, convertir a segundos dividiendo por 1000
    const oldCount = Math.ceil(this.resumeCountdown);
    this.resumeCountdown -= delta / 1000; // Resta el tiempo transcurrido
    
    const newCount = Math.ceil(this.resumeCountdown);
    
    // Si cambió el número, actualizar visual y animar
    if (oldCount !== newCount && newCount > 0) {
      this.resumeCountdownText.setText(newCount.toString());
      // MODIFICA: Estos valores deben coincidir con los de startResumeCountdown()
      this.resumeCountdownText.setScale(0.5); // MODIFICA: Escala inicial
      this.tweens.add({
        targets: this.resumeCountdownText,
        scale: 1.5, // MODIFICA: Escala máxima
        duration: 200, // MODIFICA: Duración de animación en ms
        yoyo: true,
        ease: 'Back.easeOut', // MODIFICA: Tipo de animación
      });
    }
    
    // Si llegó a 0, reanudar
    if (this.resumeCountdown <= 0) {
      this.finishResume();
    }
  }
  
  private finishResume(): void {
    if (this.resumeCountdownText) {
      this.tweens.add({
        targets: this.resumeCountdownText,
        alpha: 0,
        scale: 2,
        duration: 200,
        onComplete: () => {
          if (this.resumeCountdownText) {
            this.resumeCountdownText.destroy();
            this.resumeCountdownText = null;
          }
        },
      });
    }
    
    this.isPaused = false;
    this.isResuming = false;
    this.resumeCountdown = 0;
    music.resume(); // Reanudar música cuando se reanuda el juego
    
    // Restaurar handler de ESC para pausar
    if (this.escKeyHandler) {
      this.input.keyboard!.off('keydown-ESC', this.escKeyHandler);
    }
    if (this.rKeyHandler) {
      this.input.keyboard!.off('keydown-R', this.rKeyHandler);
    }
    
    this.escKeyHandler = () => {
      if (!this.gameOver && !this.deathScreen.isVisible() && !this.isResuming) {
        this.togglePause();
      }
    };
    this.input.keyboard!.on('keydown-ESC', this.escKeyHandler);
  }
  
  // Unused method - kept for potential future use
  // private resumeGame(): void {
  //   this.finishResume();
  // }
  
  private restartFromPause(): void {
    // Limpiar handlers
    if (this.escKeyHandler) {
      this.input.keyboard!.off('keydown-ESC', this.escKeyHandler);
    }
    if (this.rKeyHandler) {
      this.input.keyboard!.off('keydown-R', this.rKeyHandler);
    }
    
    this.isPaused = false;
    this.isResuming = false;
    this.resumeCountdown = 0;
    
    if (this.resumeCountdownText) {
      this.resumeCountdownText.destroy();
      this.resumeCountdownText = null;
    }
    
    this.pauseScreen.hide();
    
    // Restaurar handler de ESC
    this.escKeyHandler = () => {
      if (!this.gameOver && !this.deathScreen.isVisible() && !this.isResuming) {
        this.togglePause();
      }
    };
    this.input.keyboard!.on('keydown-ESC', this.escKeyHandler);
    
    this.restart();
  }
  
  private async restart(): Promise<void> {
    this.deathScreen.hide();

    // Record retry on server so global prize goes up by $2.50 for everyone
    await scoreboard.recordAttempt();
    this.hud.refreshScoreboard();
    
    // Reset music to Phase 1
    if (music.currentAudio === music.audioPhase2) {
      if (music.audioPhase2) {
        music.audioPhase2.pause();
        music.audioPhase2.currentTime = 0;
      }
      music.currentAudio = music.audioPhase1;
      if (music.audioPhase1) {
        music.audioPhase1.currentTime = 0;
        music.audioPhase1.play().catch(() => {});
      }
    }
    
    // Reset player
    this.player.reset(250, C.ARENA_HEIGHT / 2);
    this.player.stats.maxHp = C.PLAYER_HP_PHASE1;
    this.player.stats.hp = C.PLAYER_HP_PHASE1;
    this.player.phase = 1; // Reset to Phase 1
    
    // Reset Void
    this.void_.reset(C.ARENA_WIDTH - 250, C.ARENA_HEIGHT / 2);
    
    // Reset systems
    this.combat.resetStats();
    this.hud.reset();
    this.pickups.reset();
    
    // Reset arena effects to Phase 1 (clears rain)
    this.arenaEffects.setPhase(1);
    
    // Reset flags
    this.hideWarning();
    this.gameOver = false;
    this.isPaused = false;
    this.isResuming = false;
    this.resumeCountdown = 0;
    this.phase2TransitionShown = false;
    
    // Limpiar countdown text si existe
    if (this.resumeCountdownText) {
      this.resumeCountdownText.destroy();
      this.resumeCountdownText = null;
    }
    
    // Clear any remaining arena wipe graphics
    if (this.void_.arenaWipeGraphics) {
      this.void_.arenaWipeGraphics.clear();
    }
    
    console.log('Game reset to Phase 1 state');
  }
}
