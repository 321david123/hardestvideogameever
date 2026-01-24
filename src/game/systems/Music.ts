/**
 * Music System - plays background music from MP3 file
 */

// Import the MP3 files
import musicFilePhase1 from '../../Pokémon FireRed & LeafGreen - Gym Leader & Elite Four Battle Music (HQ).mp3';
import musicFilePhase2 from '../../Pokémon HeartGold & SoulSilver - Gym Leader & Elite Four Battle Music (HQ).mp3';

export class MusicSystem {
  public audioPhase1: HTMLAudioElement | null = null;
  public audioPhase2: HTMLAudioElement | null = null;
  public currentAudio: HTMLAudioElement | null = null;
  private isPlaying: boolean = false;

  // ============================================
  // CONFIGURACIÓN DE VOLUMEN - MODIFICA AQUÍ
  // ============================================
  // Volumen de música de fondo (0.0 a 1.0)
  // 0.0 = silencioso, 1.0 = máximo volumen
  // Este valor se puede cambiar desde el menú de pausa
  // MODIFICA: Cambia este valor para ajustar el volumen inicial
  private volume: number = 1.0; // 100% en el slider (pero limitado por maxMusicVolume)
  
  // ============================================
  // VOLUMEN MÁXIMO REAL - AJUSTA AQUÍ
  // ============================================
  // Este es el volumen máximo REAL que se aplicará, incluso cuando el slider está al 100%
  // 0.0 = sin sonido, 1.0 = volumen máximo del sistema
  // MODIFICA: Cambia este valor para hacer la música más fuerte o más suave
  // Recomendado: 0.15-0.25 para volumen normal, 0.3-0.4 para más fuerte
  private maxMusicVolume: number = 0.18; // MODIFICA: Volumen máximo real (18% = volumen normal/agradable)

  private audioContext: AudioContext | null = null;

  // ============================================
  // CONFIGURACIÓN DE EFECTOS DE SONIDO
  // ============================================
  // Volumen base de efectos de sonido (0.0 a 1.0)
  // Este es el volumen base antes de aplicar el multiplicador de efectos
  // MODIFICA: Cambia este valor para ajustar qué tan fuertes son los efectos base
  // 0.10 = 10% (muy suave), 0.15 = 15% (normal), 0.20 = 20% (más fuerte)
  private soundVolume: number = 0.12; // MODIFICA: Volumen base de efectos (12% = suave pero audible)

  // Multiplicador de volumen de efectos (0.0 a 1.0)
  // Este valor se puede cambiar desde el menú de pausa
  // 0.0 = sin efectos, 1.0 = efectos al 100% del volumen base
  // MODIFICA: Cambia este valor para el volumen inicial de efectos en el slider
  private effectsVolume: number = 1.0; // MODIFICA: Valor inicial de efectos (1.0 = 100% del volumen base)

  constructor() {
    // Initialize Web Audio API for sound effects
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  async init(): Promise<void> {
    if (this.audioPhase1) return;

    try {
      this.audioPhase1 = new Audio(musicFilePhase1);
      this.audioPhase1.loop = true;
      // Aplicar el volumen máximo real al inicializar
      this.audioPhase1.volume = this.volume * this.maxMusicVolume;

      this.audioPhase2 = new Audio(musicFilePhase2);
      this.audioPhase2.loop = true;
      // Aplicar el volumen máximo real al inicializar
      this.audioPhase2.volume = this.volume * this.maxMusicVolume;

      console.log('🎵 Music loaded (Phase 1 & 2)');
    } catch (e) {
      console.warn('Music failed to load:', e);
    }
  }

  start(): void {
    if (!this.audioPhase1 || this.isPlaying) return;

    this.isPlaying = true;
    this.currentAudio = this.audioPhase1;
    this.currentAudio.currentTime = 0;
    this.currentAudio.play().catch(e => {
      console.warn('Music play failed:', e);
    });
  }

  switchToPhase2(): void {
    if (!this.audioPhase2) return;

    // IMMEDIATELY stop Phase 1 music
    if (this.audioPhase1) {
      this.audioPhase1.pause();
      this.audioPhase1.currentTime = 0;
      // Aplicar el volumen máximo real
      this.audioPhase1.volume = this.volume * this.maxMusicVolume;
    }

    // Start Phase 2 music
    this.currentAudio = this.audioPhase2;
    // Aplicar el volumen máximo real
    this.currentAudio.volume = this.volume * this.maxMusicVolume;
    this.currentAudio.currentTime = 0;
    this.currentAudio.play().catch(e => {
      console.warn('Phase 2 music play failed:', e);
    });

    console.log('🎵 Switched to Phase 2 music!');
  }

  stop(): void {
    if (!this.currentAudio) return;
    this.isPlaying = false;
    this.currentAudio.pause();
    this.currentAudio.currentTime = 0;
  }

  pause(): void {
    if (!this.currentAudio) return;
    this.currentAudio.pause();
  }

  resume(): void {
    if (!this.currentAudio || !this.isPlaying) return;
    this.currentAudio.play().catch(() => {});
  }

  setVolume(volume: number): void {
    // El slider va de 0.0 a 1.0 (0% a 100%)
    this.volume = Math.max(0, Math.min(1, volume));
    // Aplicar el volumen máximo real al volumen del slider
    // Así, cuando el slider está al 100%, el volumen real es maxMusicVolume
    if (this.currentAudio) {
      this.currentAudio.volume = this.volume * this.maxMusicVolume;
    }
    // También actualizar los otros audios si existen
    if (this.audioPhase1) {
      this.audioPhase1.volume = this.volume * this.maxMusicVolume;
    }
    if (this.audioPhase2) {
      this.audioPhase2.volume = this.volume * this.maxMusicVolume;
    }
  }
  
  // Método para cambiar el volumen máximo real (útil para ajustes avanzados)
  setMaxMusicVolume(maxVolume: number): void {
    // MODIFICA: Usa este método si quieres cambiar el volumen máximo programáticamente
    this.maxMusicVolume = Math.max(0, Math.min(1, maxVolume));
    // Aplicar inmediatamente al audio actual
    this.setVolume(this.volume);
  }
  
  // Obtener el volumen máximo real
  getMaxMusicVolume(): number {
    return this.maxMusicVolume;
  }

  setSoundEffectsVolume(volume: number): void {
    this.effectsVolume = Math.max(0, Math.min(1, volume));
  }

  getSoundEffectsVolume(): number {
    return this.effectsVolume;
  }

  getMusicVolume(): number {
    return this.volume;
  }

  // Subtle sound effects using Web Audio API
  private playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = this.soundVolume): void {
    if (!this.audioContext || this.effectsVolume === 0) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      const finalVolume = volume * this.effectsVolume;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // Silently fail if audio context is not available
    }
  }

  private playNoise(duration: number, volume: number = this.soundVolume): void {
    if (!this.audioContext || this.effectsVolume === 0) return;

    try {
      const bufferSize = this.audioContext.sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      const finalVolume = volume * 0.3 * this.effectsVolume;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);

      source.start();
      source.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // Silently fail
    }
  }

  intensify(): void {}

  playHitSound(): void {
    // Subtle impact sound - low thud
    this.playTone(80, 0.08, 'sine', this.soundVolume * 0.8);
    this.playTone(120, 0.05, 'square', this.soundVolume * 0.4);
  }

  playParrySound(): void {
    // Metallic ping - higher pitch
    this.playTone(400, 0.12, 'sine', this.soundVolume * 0.7);
    this.playTone(600, 0.08, 'triangle', this.soundVolume * 0.3);
  }

  playLaserCharge(): void {
    // Low rising hum
    if (!this.audioContext || this.effectsVolume === 0) return;
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(100, this.audioContext.currentTime);
      oscillator.frequency.linearRampToValueAtTime(200, this.audioContext.currentTime + 0.3);

      const finalVolume = this.soundVolume * 0.5 * this.effectsVolume;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (e) {}
  }

  playLaserFire(): void {
    // Quick zap - brief high frequency
    this.playTone(800, 0.05, 'square', this.soundVolume * 0.6);
    this.playTone(1200, 0.03, 'sine', this.soundVolume * 0.3);
  }

  playTeleportSound(): void {
    // Brief whoosh - noise with frequency sweep
    if (!this.audioContext || this.effectsVolume === 0) return;
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.15);

      const finalVolume = this.soundVolume * 0.4 * this.effectsVolume;
      gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(finalVolume, this.audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.15);

      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + 0.15);
    } catch (e) {}
  }

  playDeathSound(_isPlayer: boolean): void {
    // Low, somber tone
    this.playTone(60, 0.3, 'sine', this.soundVolume * 0.6);
    this.playTone(80, 0.2, 'triangle', this.soundVolume * 0.3);
  }

  playPickupSound(): void {
    // Light chime - ascending notes
    this.playTone(440, 0.1, 'sine', this.soundVolume * 0.5);
    setTimeout(() => {
      this.playTone(523, 0.1, 'sine', this.soundVolume * 0.4);
    }, 50);
  }

  playHealSound(): void {
    // Gentle, healing tone - soft ascending
    this.playTone(330, 0.12, 'sine', this.soundVolume * 0.5);
    setTimeout(() => {
      this.playTone(392, 0.1, 'sine', this.soundVolume * 0.4);
    }, 60);
    setTimeout(() => {
      this.playTone(440, 0.08, 'sine', this.soundVolume * 0.3);
    }, 120);
  }

  destroy(): void {
    this.stop();
    this.audioPhase1 = null;
    this.audioPhase2 = null;
    this.currentAudio = null;
  }
}

export const music = new MusicSystem();
