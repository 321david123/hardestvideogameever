/**
 * Touch / mobile controls: move pad (left) + Dash / Attack / Shield buttons (right).
 * Only shown on touch-capable or narrow viewports. Player reads state each frame.
 */

import Phaser from 'phaser';
import { Vec2, vec2, normalize } from '../utils/math';
import * as C from '../utils/constants';

const MOVE_PAD_X = 200;
const MOVE_PAD_Y = C.ARENA_HEIGHT - 200;
const MOVE_PAD_RADIUS = 100;
const BUTTON_X = C.ARENA_WIDTH - 180;
const BUTTON_RADIUS = 52;
const BUTTON_Y_SHIELD = C.ARENA_HEIGHT - 180;
const BUTTON_Y_ATTACK = C.ARENA_HEIGHT - 290;
const BUTTON_Y_DASH = C.ARENA_HEIGHT - 400;
const PAUSE_BTN_X = C.ARENA_WIDTH - 70;
const PAUSE_BTN_Y = 50;
const PAUSE_BTN_R = 36;
const ALPHA = 0.45;

export class TouchControls {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private graphics: Phaser.GameObjects.Graphics;
  private movePointerId: number | null = null;
  private moveOrigin: Vec2 = vec2();
  private worldPoint: Phaser.Math.Vector2;
  private _moveDirection: Vec2 = vec2();
  private _dashJustPressed = false;
  private _attackJustPressed = false;
  private _shieldHeld = false;
  private shieldPointerId: number | null = null;
  private active = false;
  private onPause: (() => void) | null = null;

  constructor(scene: Phaser.Scene, onPause?: () => void) {
    this.onPause = onPause ?? null;
    this.scene = scene;
    this.worldPoint = new Phaser.Math.Vector2();
    this.container = scene.add.container(0, 0);
    this.container.setDepth(250);
    this.container.setScrollFactor(0);
    this.graphics = scene.add.graphics();
    this.container.add(this.graphics);
    this.draw();
    this.setupInput();
  }

  private draw(): void {
    this.graphics.clear();
    this.graphics.lineStyle(3, 0x4fd1c5, ALPHA + 0.2);
    this.graphics.fillStyle(0x1a1a2e, ALPHA);
    this.graphics.fillCircle(MOVE_PAD_X, MOVE_PAD_Y, MOVE_PAD_RADIUS);
    this.graphics.strokeCircle(MOVE_PAD_X, MOVE_PAD_Y, MOVE_PAD_RADIUS);
    if (this._moveDirection.x !== 0 || this._moveDirection.y !== 0) {
      const stickX = MOVE_PAD_X + this._moveDirection.x * MOVE_PAD_RADIUS * 0.7;
      const stickY = MOVE_PAD_Y + this._moveDirection.y * MOVE_PAD_RADIUS * 0.7;
      this.graphics.fillStyle(0x4fd1c5, 0.5);
      this.graphics.fillCircle(stickX, stickY, 28);
    }
    const btn = (y: number, label: string) => {
      this.graphics.fillStyle(0x1a1a2e, ALPHA);
      this.graphics.fillCircle(BUTTON_X, y, BUTTON_RADIUS);
      this.graphics.lineStyle(3, 0x4fd1c5, ALPHA + 0.2);
      this.graphics.strokeCircle(BUTTON_X, y, BUTTON_RADIUS);
    };
    btn(BUTTON_Y_DASH, 'D');
    btn(BUTTON_Y_ATTACK, 'A');
    btn(BUTTON_Y_SHIELD, 'S');
    if (this.onPause) {
      this.graphics.fillStyle(0x1a1a2e, ALPHA);
      this.graphics.fillCircle(PAUSE_BTN_X, PAUSE_BTN_Y, PAUSE_BTN_R);
      this.graphics.lineStyle(3, 0x4fd1c5, ALPHA + 0.2);
      this.graphics.strokeCircle(PAUSE_BTN_X, PAUSE_BTN_Y, PAUSE_BTN_R);
    }
  }

  private inPauseButton(x: number, y: number): boolean {
    const dx = x - PAUSE_BTN_X;
    const dy = y - PAUSE_BTN_Y;
    return dx * dx + dy * dy <= PAUSE_BTN_R * PAUSE_BTN_R;
  }

  private getWorld(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    this.scene.cameras.main.getWorldPoint(pointer.x, pointer.y, this.worldPoint);
    return { x: this.worldPoint.x, y: this.worldPoint.y };
  }

  private inMovePad(x: number, y: number): boolean {
    const dx = x - MOVE_PAD_X;
    const dy = y - MOVE_PAD_Y;
    return dx * dx + dy * dy <= MOVE_PAD_RADIUS * MOVE_PAD_RADIUS;
  }

  private whichButton(x: number, y: number): 'dash' | 'attack' | 'shield' | null {
    const dx = x - BUTTON_X;
    const dash = (dy: number) => dy * dy + dx * dx <= BUTTON_RADIUS * BUTTON_RADIUS;
    if (dash(y - BUTTON_Y_DASH)) return 'dash';
    if (dash(y - BUTTON_Y_ATTACK)) return 'attack';
    if (dash(y - BUTTON_Y_SHIELD)) return 'shield';
    return null;
  }

  private setupInput(): void {
    this.scene.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      const w = this.getWorld(pointer);
      if (this.onPause && this.inPauseButton(w.x, w.y)) {
        this.onPause();
        this.draw();
        return;
      }
      if (this.inMovePad(w.x, w.y)) {
        this.active = true;
        this.movePointerId = pointer.id;
        this.moveOrigin.x = w.x;
        this.moveOrigin.y = w.y;
        this._moveDirection = vec2();
      } else {
        const btn = this.whichButton(w.x, w.y);
        if (btn) {
          this.active = true;
          if (btn === 'dash') this._dashJustPressed = true;
          if (btn === 'attack') this._attackJustPressed = true;
          if (btn === 'shield') {
            this._shieldHeld = true;
            this.shieldPointerId = pointer.id;
          }
        }
      }
      this.draw();
    });
    this.scene.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (pointer.id !== this.movePointerId) return;
      const w = this.getWorld(pointer);
      let dx = w.x - MOVE_PAD_X;
      let dy = w.y - MOVE_PAD_Y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const maxLen = MOVE_PAD_RADIUS;
      if (len > maxLen) {
        dx *= maxLen / len;
        dy *= maxLen / len;
      }
      this._moveDirection = len > 20 ? normalize({ x: dx, y: dy }) : vec2();
      this.draw();
    });
    this.scene.input.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
      if (pointer.id === this.movePointerId) {
        this.movePointerId = null;
        this._moveDirection = vec2();
      }
      if (pointer.id === this.shieldPointerId) {
        this.shieldPointerId = null;
        this._shieldHeld = false;
      }
      this.draw();
    });
  }

  isActive(): boolean {
    return this.active;
  }

  getMoveDirection(): Vec2 {
    return this._moveDirection;
  }

  consumeDashPressed(): boolean {
    const v = this._dashJustPressed;
    this._dashJustPressed = false;
    return v;
  }

  consumeAttackPressed(): boolean {
    const v = this._attackJustPressed;
    this._attackJustPressed = false;
    return v;
  }

  isShieldHeld(): boolean {
    return this._shieldHeld;
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP);
    this.container.destroy();
  }
}
