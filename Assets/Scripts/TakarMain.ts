/**
 * TakarMain — entry script and orchestration table for the Takar pour stand-in.
 *
 * Owns: lifecycle, reference validation, the per-frame tick (kettle state ->
 *       TakarState -> glass view, scale labels, audio), the Start over action
 *       and the read-only test API used by the LEAF scenarios.
 * Expects (@input, wired by the bootstrap): kettle (TakarKettleController on
 *       "Kettle"), glassView (TakarGlassView on "GlassStation"), ui (TakarUI on
 *       "TakarUI"), four optional AudioComponents, and the Settings sliders.
 * Must not: build geometry, touch Interactable / InteractionKit directly,
 *       create text or UIKit elements, or move the kettle itself.
 */
import { TakarAudioController } from "./TakarAudioController"
import { TakarGlassView } from "./TakarGlassView"
import { TakarKettleController } from "./TakarKettleController"
import { CAPACITY_ML, KettleState, KettleStateChange } from "./TakarSceneContracts"
import { TakarState } from "./TakarState"
import { TakarUI } from "./TakarUI"

@component
export class TakarMain extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TakarMain – pour flow, scale timing and test API</span>')
  @ui.separator

  // ── References ──────────────────────────────────
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("TakarKettleController on the Kettle object (kettle pose and pinch-drag state)")
  kettle!: TakarKettleController

  @input
  @hint("TakarGlassView on GlassStation (liquid, water stream, tick marks)")
  glassView!: TakarGlassView

  @input
  @hint("TakarUI on the TakarUI object (Start over button, scale numbers, caption)")
  ui!: TakarUI

  @input
  @allowUndefined
  @hint("AudioComponent holding PourLoop.wav (looped while water flows)")
  pourAudio: AudioComponent

  @input
  @allowUndefined
  @hint("AudioComponent holding KettleSnap.wav (kettle snaps over the glass)")
  snapAudio: AudioComponent

  @input
  @allowUndefined
  @hint("AudioComponent holding KettleReturn.wav (kettle goes back to the stove)")
  returnAudio: AudioComponent

  @input
  @allowUndefined
  @hint("AudioComponent holding ButtonClick.wav (Start over pressed)")
  clickAudio: AudioComponent
  @ui.group_end

  // ── Settings ────────────────────────────────────
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @widget(new SliderWidget(5, 100, 1))
  @hint("Millilitres added per second while the kettle is pouring")
  pourRateMlPerSec: number = 30

  @input
  @widget(new SliderWidget(0, 10, 0.1))
  @hint("Seconds the scale stays fully visible after pouring ends, before it fades")
  scaleHoldSeconds: number = 3

  @input
  @widget(new SliderWidget(0.1, 3, 0.1))
  @hint("Seconds the scale takes to fade out after the hold")
  scaleFadeSeconds: number = 0.6

  @input
  @widget(new SliderWidget(0, 1, 0.05))
  @hint("Volume of all sound effects")
  sfxVolume: number = 0.8

  @input
  @hint("Draw every collider as a wireframe (takes effect on preview restart)")
  debugColliders: boolean = false
  @ui.group_end

  private state: TakarState = new TakarState()
  private audio: TakarAudioController | null = null
  private refsOk = false
  private started = false
  private appliedVolume = -1

  onAwake(): void {
    // Own-component work only: sibling ScriptComponents have not awoken yet.
    const missing: string[] = []
    if (isNull(this.kettle)) missing.push("kettle")
    if (isNull(this.glassView)) missing.push("glassView")
    if (isNull(this.ui)) missing.push("ui")
    if (missing.length > 0) {
      print("[TakarMain] ERROR: required @input not wired: " + missing.join(", ") + ". Check the bootstrap wiring.")
      return
    }
    this.refsOk = true
    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  private onStart(): void {
    if (!this.refsOk) return

    this.audio = new TakarAudioController(
      this.pourAudio ?? null,
      this.snapAudio ?? null,
      this.returnAudio ?? null,
      this.clickAudio ?? null,
      this.sfxVolume
    )
    this.appliedVolume = this.sfxVolume

    this.kettle.onStateChanged.add((change: KettleStateChange) => this.onKettleStateChanged(change))
    this.ui.onStartOver.add(() => this.startOver(true))

    // Opening presentation: empty glass, no stream, scale hidden, button live.
    this.ui.setStartOverEnabled(true)
    this.paintAll()

    if (this.debugColliders) {
      const root = this.kettle.getSceneObject().getParent()
      this.setColliderDebugAll(root ? root : this.kettle.getSceneObject(), true)
    }
    this.started = true
  }

  private onUpdate(): void {
    if (!this.started) return

    if (this.audio && this.appliedVolume !== this.sfxVolume) {
      this.audio.setVolume(this.sfxVolume)
      this.appliedVolume = this.sfxVolume
    }

    // One setting for both: the kettle waits over the glass exactly as long as the scale holds.
    this.kettle.setParkSeconds(this.scaleHoldSeconds)

    const kettleState: KettleState = this.kettle.getState()
    const wantsPour = kettleState === "pouring"
    const scaleHeld = kettleState === "overGlass" || kettleState === "pouring"

    const result = this.state.tick(
      getDeltaTime(),
      wantsPour,
      scaleHeld,
      this.pourRateMlPerSec,
      this.scaleHoldSeconds,
      this.scaleFadeSeconds
    )

    if (result.mlChanged) {
      this.glassView.setLevel(this.state.getCurrentMl())
    }
    if (result.becameFull) {
      // Auto stop at capacity: kettle levels out and cannot pour until Start over.
      this.kettle.setPourAllowed(false)
    }
    if (result.pouringChanged) {
      if (this.state.isPouring()) {
        this.audio?.startPour()
      } else {
        this.audio?.stopPour()
        this.glassView.setStream(false, null)
      }
    }
    if (this.state.isPouring()) {
      // The spout moves while the kettle tilts, so the stream follows it each frame.
      this.glassView.setStream(true, this.kettle.getSpoutTipWorld())
    }
    if (result.scaleAlphaChanged) {
      this.pushScaleAlpha()
    }
  }

  private onKettleStateChanged(change: KettleStateChange): void {
    if (!this.started) return
    if (change.state === "overGlass" && change.previous === "carried") {
      this.audio?.playSnap()
    } else if (change.state === "returning") {
      this.audio?.playReturn()
    }
  }

  /** Start over: empty glass, kettle back on the stove, scale hidden at once. */
  private startOver(playClick: boolean): void {
    if (!this.started) return
    if (playClick) this.audio?.playClick()
    this.audio?.stopPour()
    this.state.reset()
    this.kettle.setPourAllowed(true)
    this.kettle.returnHome(true)
    this.paintAll()
  }

  private paintAll(): void {
    this.glassView.setLevel(this.state.getCurrentMl())
    this.glassView.setStream(false, null)
    this.pushScaleAlpha()
  }

  private pushScaleAlpha(): void {
    const alpha = this.state.getScaleAlpha()
    this.glassView.setScaleAlpha(alpha)
    this.ui.setScaleAlpha(alpha)
  }

  // ── Read-only test API (LEAF scenarios for the five done criteria) ────────

  getCurrentMl(): number {
    return this.state.getCurrentMl()
  }

  getKettleState(): string {
    return this.started ? this.kettle.getState() : "onStove"
  }

  isPouring(): boolean {
    return this.state.isPouring()
  }

  isScaleVisible(): boolean {
    return this.state.isScaleVisible()
  }

  getScaleAlpha(): number {
    return this.state.getScaleAlpha()
  }

  getLiquidHeightCm(): number {
    return this.started ? this.glassView.getLiquidHeightCm() : 0
  }

  getLiquidColor(): vec4 {
    return this.started ? this.glassView.getLiquidColor() : new vec4(0, 0, 0, 0)
  }

  isKettleOverGlass(): boolean {
    return this.started ? this.kettle.isOverGlass() : false
  }

  /** Capacity of the glass in ml (in-code invariant, tied to the meshes and labels). */
  getCapacityMl(): number {
    return CAPACITY_ML
  }

  // Walks the tree and toggles debug drawing on every collider / body (debugColliders).
  private setColliderDebugAll(obj: SceneObject, enable: boolean): void {
    const c = obj.getComponent("Physics.ColliderComponent") as ColliderComponent | null
    if (c) c.debugDrawEnabled = enable
    const b = obj.getComponent("Physics.BodyComponent") as ColliderComponent | null
    if (b) b.debugDrawEnabled = enable
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      this.setColliderDebugAll(obj.getChild(i), enable)
    }
  }
}
