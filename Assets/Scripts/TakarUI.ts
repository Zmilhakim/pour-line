// TakarUI.ts — passive UIKit view for the Takar experience.
//
// Three authored surface roots (created and posed by the bootstrap, found here by
// @input or by name):
//   StartOverButtonRoot — fixed Frame with one capsule "Start over" button
//   ScaleLabelsRoot     — six millilitre numbers (50..300) beside the glass ticks
//   StandInCaptionRoot  — always-visible two-line stand-in caption
//
// Public API (contract with TakarMain — do not rename):
//   setScaleAlpha(alpha: number): void
//   getScaleAlpha(): number
//   setStartOverEnabled(enabled: boolean): void
//   onStartOver: PublicApi<void>

import Event, {PublicApi} from "InteractionKit.lspkg/Utils/Event"
import {CanvasController} from "UIKit.lspkg/Scripts/Utility/CanvasController"
import {TextSizing} from "UIKit.lspkg/Scripts/Components/Content/ElementContent"
import {
  Button,
  FlexAlign,
  FlexDirection,
  FlexJustify,
  FlexLayout,
  TextRole,
  TYPE_SCALE,
  FONT_SIZE_SCALE,
  addButton,
  applyTextRole,
  contentHost,
  dynamicText,
  flexColumn,
  makeFixedFrame
} from "./UIKitHelpers"

const TAG = "[TakarUI]"

// ─── Layout numbers from the plan (cm; world == TakarRoot local) ─────────────
const BUTTON_ROOT_NAME = "StartOverButtonRoot"
const SCALE_ROOT_NAME = "ScaleLabelsRoot"
const CAPTION_ROOT_NAME = "StandInCaptionRoot"

const BUTTON_W_CM = 14
const BUTTON_H_CM = 5
const FRAME_MARGIN_CM = 4 // Frame default margin per side -> 22 x 13 total

const SCALE_VALUES_BOTTOM_TO_TOP = ["50", "100", "150", "200", "250", "300"]
const SCALE_SPAN_CM = 11 // 300 ml tick height above the root origin
const SCALE_CELL_W_CM = 3.4
const SCALE_CAP_HEIGHT_CM = 1.3

const CAPTION_LINES = "Virtual stand-in: table, stove,\nkettle and 300 ml glass"
const CAPTION_W_CM = 26
const CAPTION_H_CM = 4
const CAPTION_CAP_HEIGHT_CM = 1.1

const DEFAULT_TEXT_COLOR = new vec3(0.95, 0.97, 1.0)

// Fallback poses, used only when a root is missing from the scene.
const FALLBACK_POSES: {[name: string]: {pos: vec3; rotDeg: vec3}} = {
  StartOverButtonRoot: {pos: new vec3(-27, -62, -55), rotDeg: new vec3(-40, 26, 0)},
  ScaleLabelsRoot: {pos: new vec3(29.22, -69.5, -50.87), rotDeg: new vec3(0, -28.6, 0)},
  StandInCaptionRoot: {pos: new vec3(16, -69, -38), rotDeg: new vec3(-55, 0, 0)}
}

// Text.size is the em-square height: em cm = size / 43.886, cap height ~= 0.695 em.
// applyTextRole scales a role by (distance / 110), so this returns the distance
// argument that makes `role` render with the requested cap height.
function distanceForCapHeight(role: TextRole, capHeightCm: number): number {
  const wantedSize = (capHeightCm / 0.695) * 43.886
  return (110 * wantedSize) / (TYPE_SCALE[role].size * FONT_SIZE_SCALE)
}

function findByName(root: SceneObject, name: string): SceneObject | null {
  if (root.name === name) return root
  const count = root.getChildrenCount()
  for (let i = 0; i < count; i++) {
    const hit = findByName(root.getChild(i), name)
    if (hit) return hit
  }
  return null
}

function findInScene(name: string): SceneObject | null {
  const rootCount = global.scene.getRootObjectsCount()
  for (let i = 0; i < rootCount; i++) {
    const hit = findByName(global.scene.getRootObject(i), name)
    if (hit) return hit
  }
  return null
}

function applyLayerRecursive(so: SceneObject, layer: LayerSet): void {
  so.layer = layer
  const count = so.getChildrenCount()
  for (let i = 0; i < count; i++) applyLayerRecursive(so.getChild(i), layer)
}

function isSelfOrAncestor(candidate: SceneObject, of: SceneObject): boolean {
  let cur: SceneObject | null = of
  while (cur) {
    if (cur === candidate) return true
    cur = cur.getParent()
  }
  return false
}

@component
export class TakarUI extends BaseScriptComponent {
  @input
  @allowUndefined
  @hint("Authored root for the Start over button. Found by name when left empty.")
  startOverButtonRoot: SceneObject

  @input
  @allowUndefined
  @hint("Authored root for the six millilitre numbers. Found by name when left empty.")
  scaleLabelsRoot: SceneObject

  @input
  @allowUndefined
  @hint("Authored root for the stand-in caption. Found by name when left empty.")
  standInCaptionRoot: SceneObject

  @input
  @allowUndefined
  @hint("Restart icon for the button. Falls back to Assets/Icons/restart_alt.png.")
  restartIcon: Texture

  @input
  @widget(new ColorWidget())
  @hint("Colour of the scale numbers and the caption. Keep it light: black is invisible on the display.")
  textColor: vec3 = new vec3(0.95, 0.97, 1.0)

  private onStartOverEvent = new Event<void>()
  /** Fires once per completed press of the Start over button. */
  public readonly onStartOver: PublicApi<void> = this.onStartOverEvent.publicApi()

  private built = false
  private scaleAlpha = 0
  private startOverEnabled = true
  private scaleToggleHost: SceneObject | null = null
  private scaleTexts: Text[] = []
  private startOverButton: Button | null = null
  private resolvedColor: vec3 = DEFAULT_TEXT_COLOR

  onAwake(): void {
    this.resolvedColor = this.resolveTextColor()

    const buttonRoot = this.resolveRoot(this.startOverButtonRoot, BUTTON_ROOT_NAME)
    const scaleRoot = this.resolveRoot(this.scaleLabelsRoot, SCALE_ROOT_NAME)
    const captionRoot = this.resolveRoot(this.standInCaptionRoot, CAPTION_ROOT_NAME)

    this.buildStartOverButton(buttonRoot)
    this.buildScaleLabels(scaleRoot)
    this.buildCaption(captionRoot)

    this.built = true
    // Apply whatever was requested before the build (peer onAwake order is not guaranteed).
    this.applyScaleAlpha()
    this.applyStartOverEnabled()
    print(`${TAG} built: button, ${this.scaleTexts.length} scale numbers, caption`)
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** 0..1 on all six numbers. Disables the scale labels at 0. Starts at 0. */
  public setScaleAlpha(alpha: number): void {
    const clamped = Math.max(0, Math.min(1, alpha))
    if (clamped === this.scaleAlpha && this.built) return
    this.scaleAlpha = clamped
    this.applyScaleAlpha()
  }

  public getScaleAlpha(): number {
    return this.scaleAlpha
  }

  /** Enabled = normal hover/press; disabled = UIKit inactive state, no presses. */
  public setStartOverEnabled(enabled: boolean): void {
    this.startOverEnabled = enabled
    this.applyStartOverEnabled()
  }

  // ─── Extra read-only accessors (for tests / peers) ─────────────────────────

  public isStartOverEnabled(): boolean {
    return this.startOverEnabled
  }

  public isScaleVisible(): boolean {
    return this.scaleAlpha > 0
  }

  // ─── Build ────────────────────────────────────────────────────────────────

  private resolveTextColor(): vec3 {
    const c = this.textColor
    // A serialized-unset colour arrives as (0,0,0), which is invisible on an additive display.
    if (!c || c.x + c.y + c.z < 0.05) return DEFAULT_TEXT_COLOR
    return c
  }

  private resolveRoot(wired: SceneObject, name: string): SceneObject {
    if (wired && !isNull(wired)) return wired
    const found = findInScene(name)
    if (found) return found

    print(`${TAG} WARNING: "${name}" is not in the scene; creating it at its planned pose.`)
    const created = global.scene.createSceneObject(name)
    created.setParent(this.sceneObject)
    created.layer = this.sceneObject.layer
    const pose = FALLBACK_POSES[name]
    const t = created.getTransform()
    const d2r = Math.PI / 180
    t.setWorldPosition(pose.pos)
    t.setWorldRotation(quat.fromEulerAngles(pose.rotDeg.x * d2r, pose.rotDeg.y * d2r, pose.rotDeg.z * d2r))
    return created
  }

  private buildStartOverButton(root: SceneObject): void {
    // Canvas on the surface root: hierarchy order is draw order for plate -> face -> label.
    const total = new vec2(BUTTON_W_CM + 2 * FRAME_MARGIN_CM, BUTTON_H_CM + 2 * FRAME_MARGIN_CM)
    new CanvasController(root).ensure(total)

    // One +Z lift for the whole content layer in front of the frame plate.
    const content = contentHost(root, "StartOverContent")
    const column = flexColumn(content, BUTTON_W_CM, BUTTON_H_CM, {
      justify: FlexJustify.Center,
      align: FlexAlign.Center
    })

    let icon: Texture | undefined = undefined
    if (this.restartIcon && !isNull(this.restartIcon)) {
      icon = this.restartIcon
    } else {
      icon = requireAsset("../Icons/restart_alt.png") as Texture
    }

    const built = addButton(
      column,
      "Start over",
      BUTTON_W_CM,
      BUTTON_H_CM,
      () => {
        if (!this.startOverEnabled) return
        print(`${TAG} Start over pressed`)
        this.onStartOverEvent.invoke()
      },
      {role: "Headline2", variant: {shape: "Capsule", style: "Primary"}, leadingIcon: icon}
    )
    // Fit: the label takes its natural width, so icon + text sit together in the middle.
    built.content.textSizing = TextSizing.Fit
    built.content.leadingIconSize = 2.2
    built.button.getSceneObject().name = "startOverButton"
    this.startOverButton = built.button
    ;(column.getComponent(FlexLayout.getTypeName()) as FlexLayout).refreshChildren()

    // Fixed (non-grabbable) frame; created after the content so the frame adopts it on init.
    const frame = makeFixedFrame(root)
    frame.onInitialized.add(() => {
      frame.innerSize = new vec2(BUTTON_W_CM, BUTTON_H_CM)
      applyLayerRecursive(root, root.layer)
    })
    applyLayerRecursive(root, root.layer)
  }

  private buildScaleLabels(root: SceneObject): void {
    // Six equal cells in one flex column. Cell i is centred on tick i (i * span/6 above the
    // root origin), so the column as a whole sits half a cell above the 0..span range.
    const cellH = SCALE_SPAN_CM / SCALE_VALUES_BOTTOM_TO_TOP.length
    const column = flexColumn(root, SCALE_CELL_W_CM, SCALE_SPAN_CM, {
      justify: FlexJustify.Start,
      align: FlexAlign.Center
    })
    column.name = "scaleLabels"
    const flex = column.getComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.direction = FlexDirection.ColumnReverse // first item (50) at the bottom
    column.getTransform().setLocalPosition(new vec3(0, SCALE_SPAN_CM / 2 + cellH / 2, 0))

    const role: TextRole = "Headline2"
    const distance = distanceForCapHeight(role, SCALE_CAP_HEIGHT_CM)
    this.scaleTexts = []
    for (const value of SCALE_VALUES_BOTTOM_TO_TOP) {
      const t = dynamicText(column, value, role, SCALE_CELL_W_CM, cellH)
      applyTextRole(t, role, distance)
      t.getSceneObject().name = `scale-${value}`
      this.scaleTexts.push(t)
    }
    flex.refreshChildren()
    applyLayerRecursive(root, root.layer)

    // Hide by disabling the root, unless this script lives on/under it (then hide the column).
    this.scaleToggleHost = isSelfOrAncestor(root, this.sceneObject) ? column : root
  }

  private buildCaption(root: SceneObject): void {
    const column = flexColumn(root, CAPTION_W_CM, CAPTION_H_CM, {
      justify: FlexJustify.Center,
      align: FlexAlign.Center
    })
    column.name = "standInCaption"
    const role: TextRole = "Body"
    const c = this.resolvedColor
    const t = dynamicText(column, CAPTION_LINES, role, CAPTION_W_CM, CAPTION_H_CM, new vec4(c.x, c.y, c.z, 1))
    applyTextRole(t, role, distanceForCapHeight(role, CAPTION_CAP_HEIGHT_CM))
    t.getSceneObject().name = "captionText"
    ;(column.getComponent(FlexLayout.getTypeName()) as FlexLayout).refreshChildren()
    applyLayerRecursive(root, root.layer)
  }

  // ─── Apply state ──────────────────────────────────────────────────────────

  private applyScaleAlpha(): void {
    if (!this.built) return
    const c = this.resolvedColor
    const color = new vec4(c.x, c.y, c.z, this.scaleAlpha)
    for (const t of this.scaleTexts) {
      if (t && !isNull(t)) t.textFill.color = color
    }
    const host = this.scaleToggleHost
    if (host && !isNull(host)) {
      const visible = this.scaleAlpha > 0
      if (host.enabled !== visible) host.enabled = visible
    }
  }

  private applyStartOverEnabled(): void {
    if (!this.built) return
    const button = this.startOverButton
    if (button && !isNull(button)) button.inactive = !this.startOverEnabled
  }
}
