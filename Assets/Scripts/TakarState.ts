/**
 * TakarState — plain TypeScript state for the "Takar" pour experience.
 *
 * Owns: currentMl (0..CAPACITY_ML), the pouring flag, and the scale-visibility
 * machine (hidden -> shown -> hold -> fade -> hidden), plus reset().
 *
 * Expects no @inputs: this is NOT a @component. It must not touch the scene,
 * any SceneObject, or any Lens global — callers read the getters and apply
 * the values to visuals themselves.
 */
import { CAPACITY_ML, TakarTickResult } from "./TakarSceneContracts"

type ScalePhase = "hidden" | "shown" | "hold" | "fade"

const MAX_DT = 0.1
const MIN_FADE_SECONDS = 0.0001

export class TakarState {
  private currentMl: number = 0
  private pouring: boolean = false
  private scalePhase: ScalePhase = "hidden"
  private scaleAlpha: number = 0
  private holdTimer: number = 0
  private fadeProgress: number = 0

  constructor() {
    this.reset()
  }

  tick(
    dt: number,
    wantsPour: boolean,
    scaleHeld: boolean,
    pourRateMlPerSec: number,
    holdSeconds: number,
    fadeSeconds: number
  ): TakarTickResult {
    const step = TakarState.sanitize(dt, MAX_DT)
    const prevMl = this.currentMl
    const prevPouring = this.pouring
    const prevAlpha = this.scaleAlpha
    let becameFull = false

    // --- Pouring ---
    this.pouring = wantsPour && this.currentMl < CAPACITY_ML
    if (this.pouring) {
      const rate = TakarState.sanitize(pourRateMlPerSec, Number.MAX_VALUE)
      this.currentMl = Math.min(this.currentMl + rate * step, CAPACITY_ML)
      if (this.currentMl >= CAPACITY_ML) {
        this.currentMl = CAPACITY_ML
        this.pouring = false
        becameFull = true
      }
    }

    // --- Scale visibility machine ---
    if (scaleHeld) {
      this.scalePhase = "shown"
      this.scaleAlpha = 1
    } else if (this.scalePhase === "shown") {
      this.scalePhase = "hold"
      this.holdTimer = TakarState.sanitize(holdSeconds, Number.MAX_VALUE)
      this.scaleAlpha = 1
    } else if (this.scalePhase === "hold") {
      this.holdTimer -= step
      if (this.holdTimer <= 0) {
        this.scalePhase = "fade"
        this.fadeProgress = 0
      }
    } else if (this.scalePhase === "fade") {
      const duration = Math.max(TakarState.sanitize(fadeSeconds, Number.MAX_VALUE), MIN_FADE_SECONDS)
      this.fadeProgress += step / duration
      this.scaleAlpha = Math.max(1 - this.fadeProgress, 0)
      if (this.scaleAlpha <= 0) {
        this.hideScale()
      }
    }

    return {
      mlChanged: this.currentMl !== prevMl,
      pouringChanged: this.pouring !== prevPouring,
      scaleAlphaChanged: this.scaleAlpha !== prevAlpha,
      becameFull: becameFull,
    }
  }

  reset(): void {
    this.currentMl = 0
    this.pouring = false
    this.hideScale()
  }

  getCurrentMl(): number {
    return this.currentMl
  }

  isPouring(): boolean {
    return this.pouring
  }

  isFull(): boolean {
    return this.currentMl >= CAPACITY_ML
  }

  getScaleAlpha(): number {
    return this.scaleAlpha
  }

  isScaleVisible(): boolean {
    return this.scaleAlpha > 0
  }

  private hideScale(): void {
    this.scalePhase = "hidden"
    this.scaleAlpha = 0
    this.holdTimer = 0
    this.fadeProgress = 0
  }

  /** Negative / NaN -> 0, then capped at max. */
  private static sanitize(value: number, max: number): number {
    if (!(value > 0)) {
      return 0
    }
    return Math.min(value, max)
  }
}
