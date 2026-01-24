/**
 * Pause Screen - Interfaz de pausa (ESC) con controles de volumen
 */

import Phaser from 'phaser';
import * as C from '../utils/constants';
import { music } from '../systems/Music';

export class PauseScreen {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private visible: boolean = false;
  private onResume: (() => void) | null = null;
  private onRestart: (() => void) | null = null;
  private pulseTween: Phaser.Tweens.Tween | null = null;
  
  // Volume controls
  private musicVolumeSlider: Phaser.GameObjects.Rectangle | null = null;
  private effectsVolumeSlider: Phaser.GameObjects.Rectangle | null = null;
  private musicVolumeHandle: Phaser.GameObjects.Rectangle | null = null;
  private effectsVolumeHandle: Phaser.GameObjects.Rectangle | null = null;
  private musicVolumeText: Phaser.GameObjects.Text | null = null;
  private effectsVolumeText: Phaser.GameObjects.Text | null = null;
  private musicVolume: number = 0.4;
  private effectsVolume: number = 1.0;
  private isDraggingMusic: boolean = false;
  private isDraggingEffects: boolean = false;
  
  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(C.ARENA_WIDTH / 2, C.ARENA_HEIGHT / 2);
    this.container.setDepth(400);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);
    this.container.setAlpha(0);
    
    // Load saved volumes
    this.musicVolume = music.getMusicVolume();
    this.effectsVolume = music.getSoundEffectsVolume();
    
    this.createBackground();
    this.createContent();
  }
  
  private createBackground(): void {
    const overlay = this.scene.add.rectangle(
      0, 0,
      C.ARENA_WIDTH, C.ARENA_HEIGHT,
      0x000000, 0.85
    );
    this.container.add(overlay);
  }
  
  private createContent(): void {
    // Título
    const title = this.scene.add.text(0, -200, 'PAUSADO', {
      fontSize: '48px',
      fontFamily: 'monospace',
      color: '#9f7aea',
      stroke: '#000000',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);
    this.container.add(title);
    
    // Subtítulo
    const subtitle = this.scene.add.text(0, -150,
      'El tiempo se detiene mientras decides tu próximo movimiento',
      {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#666666',
      }
    );
    subtitle.setOrigin(0.5);
    this.container.add(subtitle);
    
    // Divider
    const divider = this.scene.add.rectangle(0, -100, 500, 1, 0x444444);
    this.container.add(divider);
    
    // Volume Controls Section
    const volumeTitle = this.scene.add.text(0, -60, 'AJUSTES DE AUDIO', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#ffffff',
    });
    volumeTitle.setOrigin(0.5);
    this.container.add(volumeTitle);
    
    // Music Volume
    const musicLabel = this.scene.add.text(-200, -20, 'Música:', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    musicLabel.setOrigin(0, 0.5);
    this.container.add(musicLabel);
    
    // Music slider background
    const musicSliderBg = this.scene.add.rectangle(0, -20, 300, 8, 0x333333);
    musicSliderBg.setOrigin(0.5);
    musicSliderBg.setInteractive({ useHandCursor: true });
    musicSliderBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDraggingMusic = true;
      this.updateMusicVolume(pointer);
    });
    this.container.add(musicSliderBg);
    this.musicVolumeSlider = musicSliderBg;
    
    // Music slider handle
    const musicHandle = this.scene.add.rectangle(
      -150 + (this.musicVolume * 300), -20,
      16, 20, 0x4fd1c5
    );
    musicHandle.setOrigin(0.5);
    musicHandle.setInteractive({ useHandCursor: true });
    musicHandle.on('pointerdown', () => { this.isDraggingMusic = true; });
    this.container.add(musicHandle);
    this.musicVolumeHandle = musicHandle;
    
    // Music volume text
    this.musicVolumeText = this.scene.add.text(160, -20, `${Math.round(this.musicVolume * 100)}%`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#4fd1c5',
    });
    this.musicVolumeText.setOrigin(0, 0.5);
    this.container.add(this.musicVolumeText);
    
    // Effects Volume
    const effectsLabel = this.scene.add.text(-200, 20, 'Efectos:', {
      fontSize: '14px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    effectsLabel.setOrigin(0, 0.5);
    this.container.add(effectsLabel);
    
    // Effects slider background
    const effectsSliderBg = this.scene.add.rectangle(0, 20, 300, 8, 0x333333);
    effectsSliderBg.setOrigin(0.5);
    effectsSliderBg.setInteractive({ useHandCursor: true });
    effectsSliderBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.isDraggingEffects = true;
      this.updateEffectsVolume(pointer);
    });
    this.container.add(effectsSliderBg);
    this.effectsVolumeSlider = effectsSliderBg;
    
    // Effects slider handle
    const effectsHandle = this.scene.add.rectangle(
      -150 + (this.effectsVolume * 300), 20,
      16, 20, 0xffd700
    );
    effectsHandle.setOrigin(0.5);
    effectsHandle.setInteractive({ useHandCursor: true });
    effectsHandle.on('pointerdown', () => { this.isDraggingEffects = true; });
    this.container.add(effectsHandle);
    this.effectsVolumeHandle = effectsHandle;
    
    // Effects volume text
    this.effectsVolumeText = this.scene.add.text(160, 20, `${Math.round(this.effectsVolume * 100)}%`, {
      fontSize: '12px',
      fontFamily: 'monospace',
      color: '#ffd700',
    });
    this.effectsVolumeText.setOrigin(0, 0.5);
    this.container.add(this.effectsVolumeText);
    
    // Divider
    const divider2 = this.scene.add.rectangle(0, 80, 500, 1, 0x444444);
    this.container.add(divider2);
    
    // Opciones
    const resumeText = this.scene.add.text(0, 120, '[ ESC ] Reanudar', {
      fontSize: '20px',
      fontFamily: 'monospace',
      color: '#4fd1c5',
    });
    resumeText.setOrigin(0.5);
    this.container.add(resumeText);
    
    const restartText = this.scene.add.text(0, 160, '[ R ] Reiniciar', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#888888',
    });
    restartText.setOrigin(0.5);
    this.container.add(restartText);
    
    // Pulse animation para el texto de reanudar
    this.pulseTween = this.scene.tweens.add({
      targets: resumeText,
      alpha: { from: 1, to: 0.5 },
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
    
    // Setup global pointer events for dragging
    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isDraggingMusic) {
        this.updateMusicVolume(pointer);
      }
      if (this.isDraggingEffects) {
        this.updateEffectsVolume(pointer);
      }
    });
    
    this.scene.input.on('pointerup', () => {
      this.isDraggingMusic = false;
      this.isDraggingEffects = false;
    });
  }
  
  private updateMusicVolume(pointer: Phaser.Input.Pointer): void {
    if (!this.musicVolumeSlider || !this.musicVolumeHandle || !this.musicVolumeText) return;
    
    const sliderX = this.musicVolumeSlider.x + this.container.x;
    const sliderLeft = sliderX - 150;
    const sliderRight = sliderX + 150;
    
    let newX = Phaser.Math.Clamp(pointer.x, sliderLeft, sliderRight);
    const normalized = (newX - sliderLeft) / 300;
    
    this.musicVolume = Phaser.Math.Clamp(normalized, 0, 1);
    music.setVolume(this.musicVolume);
    
    this.musicVolumeHandle.setX(-150 + (this.musicVolume * 300));
    this.musicVolumeText.setText(`${Math.round(this.musicVolume * 100)}%`);
  }
  
  private updateEffectsVolume(pointer: Phaser.Input.Pointer): void {
    if (!this.effectsVolumeSlider || !this.effectsVolumeHandle || !this.effectsVolumeText) return;
    
    const sliderX = this.effectsVolumeSlider.x + this.container.x;
    const sliderLeft = sliderX - 150;
    const sliderRight = sliderX + 150;
    
    let newX = Phaser.Math.Clamp(pointer.x, sliderLeft, sliderRight);
    const normalized = (newX - sliderLeft) / 300;
    
    this.effectsVolume = Phaser.Math.Clamp(normalized, 0, 1);
    music.setSoundEffectsVolume(this.effectsVolume);
    
    this.effectsVolumeHandle.setX(-150 + (this.effectsVolume * 300));
    this.effectsVolumeText.setText(`${Math.round(this.effectsVolume * 100)}%`);
  }
  
  show(onResume: (() => void) | null, onRestart: (() => void) | null): void {
    this.onResume = onResume;
    this.onRestart = onRestart;
    this.visible = true;
    
    // Update volumes from music system
    this.musicVolume = music.getMusicVolume();
    this.effectsVolume = music.getSoundEffectsVolume();
    
    // Update slider positions
    if (this.musicVolumeHandle) {
      this.musicVolumeHandle.setX(-150 + (this.musicVolume * 300));
    }
    if (this.effectsVolumeHandle) {
      this.effectsVolumeHandle.setX(-150 + (this.effectsVolume * 300));
    }
    if (this.musicVolumeText) {
      this.musicVolumeText.setText(`${Math.round(this.musicVolume * 100)}%`);
    }
    if (this.effectsVolumeText) {
      this.effectsVolumeText.setText(`${Math.round(this.effectsVolume * 100)}%`);
    }
    
    // Animate in
    this.container.setVisible(true);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: 'Cubic.easeOut',
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
      duration: 150,
      onComplete: () => {
        this.container.setVisible(false);
      },
    });
  }
  
  isVisible(): boolean {
    return this.visible;
  }
  
  destroy(): void {
    if (this.pulseTween) {
      this.pulseTween.destroy();
    }
    this.container.destroy();
  }
}
