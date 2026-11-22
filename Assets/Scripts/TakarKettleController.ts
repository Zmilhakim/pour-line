/**
 * TakarKettleController
 *
 * OWNS: the kettle pose (world position + tilt) and the kettle state machine
 * (onStove -> carried -> overGlass -> pouring -> parkedOverGlass / returning).
 * Attached to the unit-scale wrapper SceneObject "Kettle" (mesh origin at the base
 * centre, spout pointing local +X). Ensures its own grab collider and Interactable.
 * Hover / held highlight: a warm ring around the kettle base, built here with
 * MeshBuilder (the kettle's vertex-colour material has no tint parameter), plus a
 * baseColor tint for materials that do have one.
 *
 * @inputs: pourSpot (required marker: snapped kettle origin + carry height),
 * glassStation (optional glass axis), snapDistanceCm, unsnapDistanceCm,
 * pourStartLiftCm, pourTiltDeg, returnSeconds, highlightColor.
 *
 * Size reason: pose, the gesture state machine and the highlight all need the same
 * private state (held, hovered, path geometry), so they stay in one component.
 *
 * MUST NOT: know about millilitres, glass contents, audio or UI; must not scale
 * anything; must not touch other components in onAwake (Interactable events are
 * subscribed in OnStartEvent).
 */
import { Interactable } from "InteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import { InteractorEvent, DragInteractorEvent } from "InteractionKit.lspkg/Core/Interactor/InteractorEvent"
import Event, { PublicApi } from "InteractionKit.lspkg/Utils/Event"
import {
  KettleState,
  KettleStateChange,
  KETTLE_SIZE_X,
  KETTLE_SIZE_Y,
  KETTLE_SIZE_Z,
  KETTLE_COLLIDER_PAD_CM,
  KETTLE_SPOUT_TIP_LOCAL_X,
  KETTLE_SPOUT_TIP_LOCAL_Y
} from "./TakarSceneContracts"

const TAG = "[TakarKettleController]"
/** Radius of the small sphere collider at the kettle origin (see onAwake). */
const KETTLE_GRAB_ANCHOR_RADIUS_CM = 1.2

type HighlightEntry = { material: Material; original: vec4 }

@component
export class TakarKettleController extends BaseScriptComponent {
  @ui.label('<span style="color: #60A5FA;">TakarKettleController – kettle pose, pinch-drag and pour gesture</span>')
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">References</span>')
  @ui.group_start("References")
  @input
  @hint("Empty marker 'KettlePourSpot': kettle origin when snapped over the glass. Its Y is also the carry height.")
  pourSpot!: SceneObject

  @input
  @allowUndefined
  @hint("Optional 'GlassStation' (glass axis). When wired, the snapped position is recomputed so the tilted spout tip sits over the glass axis.")
  glassStation!: SceneObject
  @ui.group_end
  @ui.separator
  @ui.label('<span style="color: #60A5FA;">Settings</span>')
  @ui.group_start("Settings")
  @input
  @hint("Distance (cm) from the snapped position at which the carried kettle snaps over the glass.")
  snapDistanceCm: number = 6

  @input
  @hint("Sideways drag (cm) back toward the stove needed to pull the kettle off the glass.")
  unsnapDistanceCm: number = 10

  @input
  @hint("Upward hand travel (cm) over the glass that starts the pour.")
  pourStartLiftCm: number = 3

  @input
  @widget(new SliderWidget(0, 60, 1))
  @hint("Kettle tilt (degrees) while pouring.")
  pourTiltDeg: number = 35

  @input
  @hint("Seconds the kettle takes to glide back to the stove after being released.")
  returnSeconds: number = 0.4

  @input("vec4", "{1.0, 0.85, 0.45, 1}")
  @widget(new ColorWidget())
  @hint("Tint blended into the kettle while it is hovered or held.")
  highlightColor!: vec4
  @ui.group_end

  private readonly stateChangedEvent = new Event<KettleStateChange>()
  private readonly pourLiftChangedEvent = new Event<boolean>()
  readonly onStateChanged: PublicApi<KettleStateChange> = this.stateChangedEvent.publicApi()
  readonly onPourLiftChanged: PublicApi<boolean> = this.pourLiftChangedEvent.publicApi()

  private ready = false
  private state: KettleState = "onStove"
  private held = false
  private hovered = false
  private pourAllowed = true
  private interactable: Interactable | null = null

  private home = vec3.zero()
  private homeRotation = quat.quatIdentity()
  private axis = new vec3(1, 0, 0)
  private carryY = 0
  private snapT = 1

  private dragAccum = vec3.zero()
  private tAnchor = 0
  private carryT = 0
  private snapAlong = 0
  private liftAnchor = 0

  private tilt = 0
  private returnFrom = vec3.zero()
  private returnElapsed = 0
  private highlights: HighlightEntry[] = []
  private highlightRing: SceneObject | null = null

  onAwake(): void {
    if (isNull(this.pourSpot)) {
      print(TAG + " ERROR: required @input not wired: pourSpot")
      return
    }
    const tr = this.sceneObject.getTransform()
    this.home = tr.getWorldPosition()
    this.homeRotation = tr.getWorldRotation()

    if (!this.hasCollider(this.sceneObject)) {
      const pad = 2 * KETTLE_COLLIDER_PAD_CM
      const obj = global.scene.createSceneObject("KettleGrabCollider")
      obj.setParent(this.sceneObject)
      obj.getTransform().setLocalPosition(new vec3(0, KETTLE_SIZE_Y / 2, 0))
      const collider = obj.createComponent("Physics.ColliderComponent") as ColliderComponent
      const shape = Shape.createBoxShape()
      shape.size = new vec3(KETTLE_SIZE_X + pad, KETTLE_SIZE_Y + pad, KETTLE_SIZE_Z + pad)
      collider.shape = shape

      // IK's direct (near-field) targeting needs the fingertip sphere-cast (index upper
      // joint -> tip, 0.7 cm) to ENTER a collider; a cast that starts inside the solid box
      // above reports nothing, so a fingertip resting at the kettle origin (where LEAF /
      // PreviewInteractTool place it, and well inside the box) never targets the kettle.
      // This small sphere at the origin gives that cast a surface to cross.
      const anchor = global.scene.createSceneObject("KettleGrabAnchor")
      anchor.setParent(this.sceneObject)
      anchor.getTransform().setLocalPosition(vec3.zero())
      const anchorCollider = anchor.createComponent("Physics.ColliderComponent") as ColliderComponent
      const anchorShape = Shape.createSphereShape()
      anchorShape.radius = KETTLE_GRAB_ANCHOR_RADIUS_CM
      anchorCollider.shape = anchorShape
    }

    let ia = this.sceneObject.getComponent(Interactable.getTypeName()) as Interactable | null
    if (isNull(ia)) {
      ia = this.sceneObject.createComponent(Interactable.getTypeName()) as Interactable
    }
    this.interactable = ia
    if (ia) {
      ia.enableInstantDrag = true
      ia.targetingMode = 3
      ia.allowMultipleInteractors = false
    }

    this.ready = true
    this.createEvent("OnStartEvent").bind(() => this.onStart())
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  // ---------- public API ----------

  getState(): KettleState {
    return this.state
  }

  isOverGlass(): boolean {
    return this.state === "overGlass" || this.state === "pouring" || this.state === "parkedOverGlass"
  }

  isHeld(): boolean {
    return this.held
  }

  isReady(): boolean {
    return this.ready
  }

  getSpoutTipWorld(): vec3 {
    const tr = this.sceneObject.getTransform()
    const local = new vec3(KETTLE_SPOUT_TIP_LOCAL_X, KETTLE_SPOUT_TIP_LOCAL_Y, 0)
    return tr.getWorldPosition().add(tr.getWorldRotation().multiplyVec3(local))
  }

  setPourAllowed(allowed: boolean): void {
    this.pourAllowed = allowed
    if (!allowed && this.state === "pouring") this.setState("overGlass")
  }

  returnHome(immediate: boolean): void {
    if (!this.ready) return
    this.held = false
    this.carryT = 0
    this.dragAccum = vec3.zero()
    const tr = this.sceneObject.getTransform()
    if (immediate) {
      this.tilt = 0
      tr.setWorldPosition(this.home)
      tr.setWorldRotation(this.homeRotation)
      this.setState("onStove")
    } else {
      this.returnFrom = tr.getWorldPosition()
      this.returnElapsed = 0
      this.setState("returning")
    }
    this.refreshHighlight()
  }

  // ---------- lifecycle ----------

  private onStart(): void {
    if (!this.ready) return
    this.computePath()
    this.collectHighlights(this.sceneObject)
    this.buildHighlightRing()
    this.refreshHighlight()

    const ia = this.interactable
    if (!ia) return
    ia.onHoverEnter.add(() => {
      this.hovered = true
      this.refreshHighlight()
    })
    ia.onHoverExit.add(() => {
      this.hovered = false
      this.refreshHighlight()
    })
    ia.onTriggerStart.add((_e: InteractorEvent) => this.handleTriggerStart())
    ia.onTriggerEnd.add((_e: InteractorEvent) => this.handleRelease())
    ia.onTriggerEndOutside.add((_e: InteractorEvent) => this.handleRelease())
    ia.onTriggerCanceled.add((_e: InteractorEvent) => this.handleRelease())
    ia.onDragStart.add((e: DragInteractorEvent) => this.handleDrag(e))
    ia.onDragUpdate.add((e: DragInteractorEvent) => this.handleDrag(e))
  }

  private computePath(): void {
    const p = this.pourSpot.getTransform().getWorldPosition()
    const flat = p.sub(this.home)
    flat.y = 0
    this.axis = flat.length < 0.001 ? new vec3(1, 0, 0) : flat.normalize()
    this.carryY = p.y
    let l = p.sub(this.home).dot(this.axis)
    if (!isNull(this.glassStation)) {
      const tiltRad = (this.pourTiltDeg * Math.PI) / 180
      const tipAlong = KETTLE_SPOUT_TIP_LOCAL_X * Math.cos(tiltRad) + KETTLE_SPOUT_TIP_LOCAL_Y * Math.sin(tiltRad)
      const g = this.glassStation.getTransform().getWorldPosition()
      l = g.sub(this.home).dot(this.axis) - tipAlong
    }
    this.snapT = Math.max(1, l)
  }

  private onUpdate(): void {
    if (!this.ready) return
    const dt = getDeltaTime()
    const tr = this.sceneObject.getTransform()

    if (this.state === "returning") {
      this.returnElapsed += dt
      const k = Math.min(1, this.returnElapsed / Math.max(this.returnSeconds, 0.01))
      const s = k * k * (3 - 2 * k)
      tr.setWorldPosition(vec3.lerp(this.returnFrom, this.home, s))
      if (k >= 1) this.setState("onStove")
    } else {
      const target = this.targetPosition()
      const f = 1 - Math.exp(-25 * dt)
      tr.setWorldPosition(vec3.lerp(tr.getWorldPosition(), target, f))
    }

    const targetTilt = this.state === "pouring" ? (this.pourTiltDeg * Math.PI) / 180 : 0
    this.tilt += (targetTilt - this.tilt) * (1 - Math.exp(-12 * dt))
    tr.setWorldRotation(this.homeRotation.multiply(quat.angleAxis(-this.tilt, new vec3(0, 0, 1))))
  }

  // ---------- gesture handling ----------

  private handleTriggerStart(): void {
    if (!this.ready || this.held) return
    this.held = true
    this.dragAccum = vec3.zero()
    this.snapAlong = 0
    this.liftAnchor = 0
    if (this.state === "onStove") {
      this.tAnchor = 0
      this.carryT = 0
      this.setState("carried")
    } else if (this.state === "returning") {
      const cur = this.sceneObject.getTransform().getWorldPosition()
      this.tAnchor = this.clamp(cur.sub(this.home).dot(this.axis), 0, this.snapT)
      this.carryT = this.tAnchor
      this.setState("carried")
    } else if (this.state === "parkedOverGlass") {
      this.setState("overGlass")
    }
    this.refreshHighlight()
  }

  private handleDrag(e: DragInteractorEvent): void {
    if (!this.ready || !this.held) return
    const d = e.planecastDragVector ?? e.dragVector
    if (!d) return
    this.dragAccum = this.dragAccum.add(d)
    const along = this.dragAccum.dot(this.axis)
    const perp = this.dragAccum.sub(this.axis.uniformScale(along))
    const lift = (perp.y >= 0 ? 1 : -1) * perp.length

    if (this.state === "carried") {
      this.carryT = this.clamp(this.tAnchor + along, 0, this.snapT)
      if (this.snapT - this.carryT <= this.snapDistanceCm) {
        this.carryT = this.snapT
        this.snapAlong = along
        this.liftAnchor = lift
        this.setState("overGlass")
      }
    } else if (this.state === "overGlass") {
      if (this.pourAllowed && lift - this.liftAnchor >= this.pourStartLiftCm) {
        this.setState("pouring")
      } else if (this.snapAlong - along > this.unsnapDistanceCm) {
        this.tAnchor = Math.max(0, this.snapT - this.unsnapDistanceCm)
        this.carryT = this.tAnchor
        this.dragAccum = vec3.zero()
        this.setState("carried")
      }
    } else if (this.state === "pouring") {
      if (lift - this.liftAnchor < this.pourStartLiftCm) this.setState("overGlass")
    }
  }

  private handleRelease(): void {
    if (!this.ready || !this.held) return
    this.held = false
    if (this.state === "overGlass" || this.state === "pouring") {
      this.setState("parkedOverGlass")
    } else if (this.state === "carried") {
      this.returnHome(false)
    }
    this.refreshHighlight()
  }

  private setState(next: KettleState): void {
    if (next === this.state) return
    const previous = this.state
    this.state = next
    this.stateChangedEvent.invoke({ state: next, previous: previous })
    if (next === "pouring") this.pourLiftChangedEvent.invoke(true)
    else if (previous === "pouring") this.pourLiftChangedEvent.invoke(false)
  }

  // ---------- helpers ----------

  private targetPosition(): vec3 {
    if (this.state === "onStove") return this.home
    const t = this.state === "carried" ? this.carryT : this.snapT
    const p = this.home.add(this.axis.uniformScale(t))
    p.y = this.carryY
    return p
  }

  private clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v))
  }

  private hasCollider(obj: SceneObject): boolean {
    if (obj.getComponents("Physics.ColliderComponent").length > 0) return true
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      if (this.hasCollider(obj.getChild(i))) return true
    }
    return false
  }

  private collectHighlights(obj: SceneObject): void {
    const visuals = obj.getComponents("Component.RenderMeshVisual") as RenderMeshVisual[]
    for (const visual of visuals) {
      const source = visual.mainMaterial
      if (isNull(source)) continue
      const material = source.clone()
      visual.mainMaterial = material
      let original = new vec4(1, 1, 1, 1)
      try {
        const c = (material.mainPass as any).baseColor as vec4 | undefined
        if (c) original = new vec4(c.x, c.y, c.z, c.w)
      } catch (_err) {
        // material has no baseColor: keep the default
      }
      this.highlights.push({ material: material, original: original })
    }
    for (let i = 0; i < obj.getChildrenCount(); i++) {
      this.collectHighlights(obj.getChild(i))
    }
  }

  /**
   * Flat ring around the kettle base in highlightColor. Uses the same vertex layout
   * (position, normal, color) and material as the kettle mesh, so it needs no asset.
   */
  private buildHighlightRing(): void {
    if (this.highlights.length === 0) return
    const h = this.highlightColor
    const r = h ? h.x : 1
    const g = h ? h.y : 0.85
    const b = h ? h.z : 0.45
    const inner = Math.max(KETTLE_SIZE_X, KETTLE_SIZE_Z) / 2 + 0.6
    const outer = inner + 1.4
    const segments = 40
    const verts: number[] = []
    const indices: number[] = []
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      verts.push(c * inner, 0, s * inner, 0, 1, 0, r, g, b, 1)
      verts.push(c * outer, 0, s * outer, 0, 1, 0, r, g, b, 1)
    }
    for (let i = 0; i < segments; i++) {
      const k = i * 2
      indices.push(k, k + 3, k + 1, k, k + 2, k + 3)
    }
    try {
      const builder = new MeshBuilder([
        { name: "position", components: 3 },
        { name: "normal", components: 3, normalized: true },
        { name: "color", components: 4 }
      ])
      builder.topology = MeshTopology.Triangles
      builder.indexType = MeshIndexType.UInt16
      builder.appendVerticesInterleaved(verts)
      builder.appendIndices(indices)
      const obj = global.scene.createSceneObject("KettleHighlightRing")
      obj.setParent(this.sceneObject)
      obj.getTransform().setLocalPosition(new vec3(0, 0.3, 0))
      const visual = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
      visual.mesh = builder.getMesh()
      const material = this.highlights[0].material.clone()
      material.mainPass.twoSided = true
      visual.mainMaterial = material
      builder.updateMesh()
      obj.enabled = false
      this.highlightRing = obj
    } catch (err) {
      print(TAG + " highlight ring not built: " + err)
    }
  }

  private refreshHighlight(): void {
    const on = this.hovered || this.held
    if (this.highlightRing && !isNull(this.highlightRing)) this.highlightRing.enabled = on
    const h = this.highlightColor
    for (const entry of this.highlights) {
      const o = entry.original
      const k = on && h ? 0.45 : 0
      const c = new vec4(o.x + (h ? h.x - o.x : 0) * k, o.y + (h ? h.y - o.y : 0) * k, o.z + (h ? h.z - o.z : 0) * k, o.w)
      try {
        ;(entry.material.mainPass as any).baseColor = c
      } catch (_err) {
        // material has no baseColor: nothing to tint
      }
    }
  }
}
