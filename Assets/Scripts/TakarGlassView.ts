/**
 * TakarGlassView – passive view of the 300 ml glass on the "GlassStation" SceneObject.
 *
 * OWNS
 *   - Coffee liquid height and colour (dark brown -> light caramel).
 *   - Coffee grounds visibility (hidden once the liquid covers them).
 *   - The vertical water stream between a given spout tip and the liquid surface.
 *   - The fade of the six tick marks on the glass.
 *
 * EXPECTS (@input, wired by the bootstrap)
 *   - coffeeLiquid, coffeeGrounds, waterStream, scaleTicks : unit-scale wrapper SceneObjects
 *     under GlassStation, each with its mesh at or beneath it.
 *   - liquidStartColor, liquidEndColor : colours at 0 ml and 300 ml.
 *
 * DELIVERY MODES (resolved once, on the first call after all scripts have awoken)
 *   - Runtime mesh scripts (CoffeeLiquidMesh / WaterStreamMesh / ScaleTicksMesh from the mesh
 *     step) found at or under a wrapper are driven through their own methods
 *     (setHeightCm + setColor, setLength, setOpacity). They are found by method name, so this
 *     file does not import them.
 *   - Otherwise (plain GLB mesh) the wrapper is scaled in Y and the cloned material's
 *     baseColor is written.
 *
 * MUST NOT
 *   - Read input, know about the kettle, or hold ml state beyond the last displayed value.
 *   - Call into any other ScriptComponent from onAwake (mesh drivers are only called from the
 *     public methods, which TakarMain first invokes in its OnStartEvent).
 *   - Create SceneObjects, or scale the mesh children (only the four wrappers are scaled).
 */
import { CAPACITY_ML, LIQUID_SPAN_CM, STREAM_AUTHORED_CM, GROUNDS_HIDE_HEIGHT_CM } from "./TakarSceneContracts"

const TAG = "[TakarGlassView]"
const MIN_SCALE_FRACTION = 0.001
const MIN_STREAM_LENGTH_CM = 0.2

// Method surfaces of the mesh step's runtime mesh scripts (matched by name, not imported).
type LiquidDriver = { setHeightCm(heightCm: number): void; setColor(color: vec3): void }
type StreamDriver = { setLength(lengthCm: number): void }
type TicksDriver = { setOpacity(opacity01: number): void }

@component
export class TakarGlassView extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TakarGlassView – liquid, stream and tick marks in the glass</span>')
  @ui.separator

  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("CoffeeLiquid wrapper (unit scale). Its mesh is an 11 cm cylinder with the origin at its base.")
  coffeeLiquid: SceneObject

  @input
  @hint("CoffeeGrounds wrapper. Shown while the liquid is lower than the grounds disc.")
  coffeeGrounds: SceneObject

  @input
  @hint("WaterStream wrapper. Its mesh is a 14 cm thin tube with the origin at its base.")
  waterStream: SceneObject

  @input
  @hint("ScaleTicks wrapper holding the six tick bars on the glass.")
  scaleTicks: SceneObject
  @ui.group_end

  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input("vec4", "{0.38, 0.21, 0.09, 1}")
  @widget(new ColorWidget())
  @hint("Liquid colour at 0 ml. Keep it a visible dark brown: black is invisible on the additive display.")
  liquidStartColor: vec4

  @input("vec4", "{0.80, 0.58, 0.34, 1}")
  @widget(new ColorWidget())
  @hint("Liquid colour at 300 ml: light caramel brown.")
  liquidEndColor: vec4
  @ui.group_end

  private ready: boolean = false
  private liquidInitialScale: vec3 = vec3.one()
  private liquidInitialPos: vec3 = vec3.zero()
  private streamInitialScale: vec3 = vec3.one()
  private liquidMaterials: Material[] = []
  private tickMaterials: Material[] = []
  private tickBaseColors: vec4[] = []
  private resolved: boolean = false
  private liquidDriver: LiquidDriver | null = null
  private streamDriver: StreamDriver | null = null
  private ticksDriver: TicksDriver | null = null

  private lastMl: number = -1
  private heightCm: number = 0
  private liquidColor: vec4 = new vec4(0.38, 0.21, 0.09, 1)
  private scaleAlpha: number = -1
  private streamOn: boolean = true

  onAwake(): void {
    const missing: string[] = []
    if (isNull(this.coffeeLiquid)) missing.push("coffeeLiquid")
    if (isNull(this.coffeeGrounds)) missing.push("coffeeGrounds")
    if (isNull(this.waterStream)) missing.push("waterStream")
    if (isNull(this.scaleTicks)) missing.push("scaleTicks")
    if (missing.length > 0) {
      print(TAG + " ERROR: required @input not wired: " + missing.join(", "))
      return
    }

    const liquidT = this.coffeeLiquid.getTransform()
    this.liquidInitialScale = liquidT.getLocalScale()
    this.liquidInitialPos = liquidT.getLocalPosition()
    this.streamInitialScale = this.waterStream.getTransform().getLocalScale()

    // Own-object setup only. The opening presentation (level 0, no stream, alpha 0) is painted
    // by TakarMain in its OnStartEvent, before the first frame renders: the mesh scripts under
    // the wrappers may not have awoken yet, so nothing is driven from here.
    this.ready = true
  }

  /** Finds the mesh drivers / clones the fallback materials. Runs once, after all onAwake calls. */
  private resolve(): void {
    if (this.resolved) return
    this.resolved = true
    this.liquidDriver = this.findDriver(this.coffeeLiquid, ["setHeightCm", "setColor"]) as LiquidDriver | null
    this.streamDriver = this.findDriver(this.waterStream, ["setLength"]) as StreamDriver | null
    this.ticksDriver = this.findDriver(this.scaleTicks, ["setOpacity"]) as TicksDriver | null
    if (!this.liquidDriver) {
      this.liquidMaterials = this.cloneMaterials(this.coffeeLiquid)
    }
    if (!this.ticksDriver) {
      this.tickMaterials = this.cloneMaterials(this.scaleTicks)
      for (const mat of this.tickMaterials) {
        this.tickBaseColors.push(this.readBaseColor(mat))
      }
    }
    print(
      TAG +
        " drivers: liquid=" +
        (this.liquidDriver ? "mesh script" : "wrapper scale") +
        ", stream=" +
        (this.streamDriver ? "mesh script" : "wrapper scale") +
        ", ticks=" +
        (this.ticksDriver ? "mesh script" : "material")
    )
  }

  /** First ScriptComponent at or under root that has every named method. */
  private findDriver(root: SceneObject, methods: string[]): object | null {
    const scripts = root.getComponents("Component.ScriptComponent")
    for (const sc of scripts) {
      const candidate = sc as unknown as Record<string, unknown>
      let ok = true
      for (const m of methods) {
        if (typeof candidate[m] !== "function") ok = false
      }
      if (ok) return sc
    }
    const count = root.getChildrenCount()
    for (let i = 0; i < count; i++) {
      const found = this.findDriver(root.getChild(i), methods)
      if (found) return found
    }
    return null
  }

  setLevel(ml: number): void {
    if (!this.ready) return
    this.resolve()
    const clamped = Math.min(Math.max(ml, 0), CAPACITY_ML)
    if (clamped === this.lastMl) return
    this.lastMl = clamped

    const t = clamped / CAPACITY_ML
    this.heightCm = t * LIQUID_SPAN_CM
    // A mesh script hides itself when empty; only the plain-mesh wrapper is toggled here.
    if (!this.liquidDriver) this.coffeeLiquid.enabled = clamped > 0

    const a = this.liquidStartColor
    const b = this.liquidEndColor
    this.liquidColor = new vec4(a.r + (b.r - a.r) * t, a.g + (b.g - a.g) * t, a.b + (b.b - a.b) * t, 1)

    const liquidT = this.coffeeLiquid.getTransform()
    liquidT.setLocalPosition(this.liquidInitialPos)
    if (this.liquidDriver) {
      // Runtime mesh: it rebuilds its own geometry at the real height and vertex colour.
      this.liquidDriver.setColor(new vec3(this.liquidColor.r, this.liquidColor.g, this.liquidColor.b))
      this.liquidDriver.setHeightCm(this.heightCm)
    } else {
      const s = this.liquidInitialScale
      const frac = Math.max(this.heightCm / LIQUID_SPAN_CM, MIN_SCALE_FRACTION)
      liquidT.setLocalScale(new vec3(s.x, s.y * frac, s.z))
      for (const mat of this.liquidMaterials) {
        this.setBaseColor(mat, this.liquidColor)
      }
    }

    this.coffeeGrounds.enabled = this.heightCm < GROUNDS_HIDE_HEIGHT_CM
  }

  setStream(active: boolean, spoutTipWorld: vec3 | null): void {
    if (!this.ready) return
    this.resolve()
    if (!active || spoutTipWorld === null) {
      this.hideStream()
      return
    }
    // Wrappers are unit scale, so the liquid height in cm is also its world-space height.
    const surfaceY = this.coffeeLiquid.getTransform().getWorldPosition().y + this.heightCm
    const length = spoutTipWorld.y - surfaceY
    if (length <= MIN_STREAM_LENGTH_CM) {
      this.hideStream()
      return
    }
    const s = this.streamInitialScale
    const streamT = this.waterStream.getTransform()
    streamT.setWorldPosition(new vec3(spoutTipWorld.x, surfaceY, spoutTipWorld.z))
    if (this.streamDriver) {
      // Runtime mesh: it builds the tube at the asked length, up to its authored maximum;
      // only a longer stream (nearly empty glass) is stretched on the wrapper.
      const built = Math.min(length, STREAM_AUTHORED_CM)
      this.streamDriver.setLength(built)
      streamT.setLocalScale(new vec3(s.x, (s.y * length) / built, s.z))
    } else {
      streamT.setLocalScale(new vec3(s.x, (s.y * length) / STREAM_AUTHORED_CM, s.z))
    }
    if (!this.streamDriver) this.waterStream.enabled = true
    this.streamOn = true
  }

  setScaleAlpha(alpha: number): void {
    if (!this.ready) return
    this.resolve()
    const clamped = Math.min(Math.max(alpha, 0), 1)
    if (clamped === this.scaleAlpha) return
    this.scaleAlpha = clamped

    if (this.ticksDriver) {
      // The mesh script fades and hides itself; its object is left enabled.
      this.ticksDriver.setOpacity(clamped)
      return
    }
    this.scaleTicks.enabled = clamped > 0
    // RGB is premultiplied on purpose: on the additive display, fading toward black fades the
    // ticks out even when the material is not alpha-blended.
    for (let i = 0; i < this.tickMaterials.length; i++) {
      const o = this.tickBaseColors[i]
      this.setBaseColor(this.tickMaterials[i], new vec4(o.r * clamped, o.g * clamped, o.b * clamped, o.a * clamped))
    }
  }

  getLiquidHeightCm(): number {
    return this.heightCm
  }

  getLiquidColor(): vec4 {
    const c = this.liquidColor
    return new vec4(c.r, c.g, c.b, c.a)
  }

  getScaleAlpha(): number {
    return Math.max(this.scaleAlpha, 0)
  }

  isReady(): boolean {
    return this.ready
  }

  private hideStream(): void {
    if (!this.streamOn) return
    if (this.streamDriver) this.streamDriver.setLength(0)
    else this.waterStream.enabled = false
    this.streamOn = false
  }

  /** Clones the main material of every RenderMeshVisual at or under root; returns the clones. */
  private cloneMaterials(root: SceneObject): Material[] {
    const out: Material[] = []
    const visuals: RenderMeshVisual[] = []
    this.collectVisuals(root, visuals)
    for (const rmv of visuals) {
      if (isNull(rmv.mainMaterial)) continue
      const clone = rmv.mainMaterial.clone()
      rmv.mainMaterial = clone
      out.push(clone)
    }
    return out
  }

  private collectVisuals(obj: SceneObject, out: RenderMeshVisual[]): void {
    const found = obj.getComponents("Component.RenderMeshVisual") as RenderMeshVisual[]
    for (const rmv of found) out.push(rmv)
    const count = obj.getChildrenCount()
    for (let i = 0; i < count; i++) {
      this.collectVisuals(obj.getChild(i), out)
    }
  }

  private readBaseColor(mat: Material): vec4 {
    try {
      const c = (mat.mainPass as any).baseColor as vec4 | undefined
      if (c !== undefined && c !== null && typeof c.r === "number") {
        return new vec4(c.r, c.g, c.b, c.a)
      }
    } catch (e) {
      // Material has no baseColor; fall through to white.
    }
    return new vec4(1, 1, 1, 1)
  }

  private setBaseColor(mat: Material, color: vec4): void {
    try {
      ;(mat.mainPass as any).baseColor = color
    } catch (e) {
      // Some materials lack baseColor; never throw from a view update.
    }
  }
}
