/**
 * TakarSceneContracts — constants and shared types only.
 *
 * Owns: scene object names, asset paths, the in-code invariants (capacity, tick
 * step, liquid span) and the layout numbers taken from the plan.
 * Expects: nothing (no @input, no scene access).
 * Must not: hold state, touch the scene, or import any other Takar file.
 */

// ── Shared types ────────────────────────────────────────────────────────────

export type KettleState =
  | "onStove"
  | "carried"
  | "overGlass"
  | "pouring"
  | "parkedOverGlass"
  | "returning"

/** Payload of TakarKettleController.onStateChanged. */
export type KettleStateChange = {
  state: KettleState
  previous: KettleState
}

/** What TakarState.tick() reports back to Main for one frame. */
export type TakarTickResult = {
  mlChanged: boolean
  pouringChanged: boolean
  scaleAlphaChanged: boolean
  /** True only on the frame the glass reaches CAPACITY_ML. */
  becameFull: boolean
}

// ── In-code invariants (tied to the meshes and the six labels) ──────────────

export const CAPACITY_ML = 300
export const TICK_STEP_ML = 50
/** Liquid height in cm at CAPACITY_ML (authored height of the CoffeeLiquid mesh). */
export const LIQUID_SPAN_CM = 11
/** Authored height in cm of the WaterStream mesh (Y scale 1). */
export const STREAM_AUTHORED_CM = 14
/** Liquid height at which the coffee grounds disc is hidden (coincident surfaces). */
export const GROUNDS_HIDE_HEIGHT_CM = 0.8

// ── Layout numbers from the plan (world cm, TakarRoot at identity) ──────────

export const KETTLE_HOME_X = 0
export const KETTLE_HOME_Y = -62
export const KETTLE_HOME_Z = -55
export const KETTLE_POUR_SPOT_X = 15.5
export const KETTLE_CARRY_Y = -56
export const GLASS_X = 30
export const GLASS_BASE_Y = -70
export const GLASS_Z = -55
export const LIQUID_BASE_Y = -69.5

/** Kettle mesh size from the plan's target_size_cm (grounded: origin at the base centre). */
export const KETTLE_SIZE_X = 22
export const KETTLE_SIZE_Y = 18
export const KETTLE_SIZE_Z = 16
/** Padding added per side to the kettle grab collider. */
export const KETTLE_COLLIDER_PAD_CM = 2
/** Spout tip in kettle-local cm (spout points +X). */
export const KETTLE_SPOUT_TIP_LOCAL_X = 10.15
export const KETTLE_SPOUT_TIP_LOCAL_Y = 10.9

// ── Stable scene object names (LEAF tests look these up) ────────────────────

export const NAME_ROOT = "TakarRoot"
export const NAME_MAIN = "TakarMain"
export const NAME_UI = "TakarUI"
export const NAME_KETTLE = "Kettle"
export const NAME_KETTLE_POUR_SPOT = "KettlePourSpot"
export const NAME_GLASS_STATION = "GlassStation"
export const NAME_GLASS = "Glass"
export const NAME_COFFEE_GROUNDS = "CoffeeGrounds"
export const NAME_COFFEE_LIQUID = "CoffeeLiquid"
export const NAME_WATER_STREAM = "WaterStream"
export const NAME_SCALE_TICKS = "ScaleTicks"
export const NAME_SCALE_LABELS_ROOT = "ScaleLabelsRoot"
export const NAME_START_OVER_BUTTON_ROOT = "StartOverButtonRoot"
export const NAME_STAND_IN_CAPTION_ROOT = "StandInCaptionRoot"

// ── Asset paths (project-relative; documentation for bootstrap and audit) ───

export const PATH_SFX_POUR_LOOP = "Assets/GeneratedSFX/PourLoop.wav"
export const PATH_SFX_KETTLE_SNAP = "Assets/GeneratedSFX/KettleSnap.wav"
export const PATH_SFX_KETTLE_RETURN = "Assets/GeneratedSFX/KettleReturn.wav"
export const PATH_SFX_BUTTON_CLICK = "Assets/GeneratedSFX/ButtonClick.wav"
export const PATH_MESH_DIR = "Assets/GeneratedMeshes"
