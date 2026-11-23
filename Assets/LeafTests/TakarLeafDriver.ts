/**
 * TakarLeafDriver — shared test helper for the Takar LEAF scenarios (test code only).
 *
 * Reads the lens through TakarMain's read-only test API and drives the kettle with the
 * shared LEAF hand interactor. Nothing here changes lens behaviour.
 *
 * How the pinch is driven: LEAF's `drag(target, vector, durationMs)` holds a pinch on the
 * target for `durationMs` and feeds `vector` to InteractionKit as the per-frame drag
 * delta. The scenarios need several phases inside ONE pinch (carry to the glass, wait,
 * lift, keep pouring), so a pinch is started with one vec3 whose components are changed
 * while the pinch is held. All hand targets are derived from runtime transforms (the
 * kettle's home and KettlePourSpot), never from hard-coded world coordinates.
 */
import {Interactable} from "InteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {HandType} from "InteractionKit.lspkg/Providers/HandInputData/HandType"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {findSceneObjectByName, sleep, waitUntil} from "Leaf.lspkg/Utils/common/Utils"
import {TakarMain} from "../Scripts/TakarMain"

const TAG = "[TakarLeaf]"

/** Hand travel per frame while carrying the kettle toward the glass (cm). */
const CARRY_CM_PER_FRAME = 0.4
/** Hand travel per frame while lifting over the glass (cm). */
const LIFT_CM_PER_FRAME = 0.4

export type Transition = {t: number; state: string; previous: string}

/** One held pinch on the kettle. `finish()` resolves after LEAF has released it. */
export class KettlePinch {
  /** Per-frame hand movement while the pinch is held (world cm). Mutated by the scenario. */
  readonly perFrame = new vec3(0, 0, 0)
  private error: unknown = undefined
  private failed = false
  private settled = false
  private readonly done: Promise<void>

  constructor(
    readonly handType: HandType,
    readonly holdMs: number,
    start: (perFrame: vec3) => Promise<void>,
  ) {
    this.done = start(this.perFrame).then(
      () => {
        this.settled = true
      },
      (e) => {
        this.settled = true
        this.failed = true
        this.error = e
      },
    )
  }

  move(v: vec3): void {
    this.perFrame.x = v.x
    this.perFrame.y = v.y
    this.perFrame.z = v.z
  }

  holdStill(): void {
    this.move(vec3.zero())
  }

  isSettled(): boolean {
    return this.settled
  }

  /** Throws the pinch's own error as soon as LEAF reported one. */
  throwIfFailed(): void {
    if (this.failed) throw this.error
  }

  async finish(): Promise<void> {
    await this.done
    this.throwIfFailed()
  }
}

export class TakarLeafDriver {
  readonly main: TakarMain
  readonly kettleObject: SceneObject
  readonly kettle: Interactable
  readonly pourSpot: SceneObject
  readonly scaleLabelsRoot: SceneObject
  /** Kettle pose on the stove, captured when the driver is created. */
  readonly home: vec3
  readonly homeRotation: quat
  /** Unit vector along the table from the stove toward the pour spot (world). */
  readonly axis: vec3
  /** Horizontal distance from the stove position to KettlePourSpot (cm). */
  readonly spotDistance: number
  readonly transitions: Transition[] = []

  private readonly unsubscribe: () => void

  private constructor(private readonly id: string) {
    const mainObject = findSceneObjectByName("TakarMain")
    if (isNull(mainObject)) throw new Error('SceneObject "TakarMain" not found')
    const main = mainObject.getComponent(TakarMain.getTypeName()) as TakarMain
    if (isNull(main)) throw new Error('TakarMain script not found on "TakarMain"')
    this.main = main

    this.kettleObject = TakarLeafDriver.requireObject("Kettle")
    this.pourSpot = TakarLeafDriver.requireObject("KettlePourSpot")
    this.scaleLabelsRoot = TakarLeafDriver.requireObject("ScaleLabelsRoot")

    const kettle = findInteractableByName("Kettle")
    if (kettle === undefined || isNull(kettle)) throw new Error('Interactable on "Kettle" not found')
    this.kettle = kettle

    const tr = this.kettleObject.getTransform()
    this.home = tr.getWorldPosition()
    this.homeRotation = tr.getWorldRotation()
    const flat = this.pourSpot.getTransform().getWorldPosition().sub(this.home)
    flat.y = 0
    this.spotDistance = flat.length
    if (this.spotDistance < 1) throw new Error("Kettle is not on the stove: it is already at the pour spot")
    this.axis = flat.normalize()

    this.unsubscribe = this.main.kettle.onStateChanged.add((change) => {
      this.transitions.push({t: getTime(), state: change.state, previous: change.previous})
    })
  }

  private static requireObject(name: string): SceneObject {
    const obj = findSceneObjectByName(name)
    if (isNull(obj)) throw new Error(`SceneObject "${name}" not found`)
    return obj
  }

  /** Waits for the lens to be idle (kettle on the stove, scale hidden) and builds the driver. */
  static async create(id: string): Promise<TakarLeafDriver> {
    await sleep(1500)
    const mainObject = findSceneObjectByName("TakarMain")
    if (isNull(mainObject)) throw new Error('SceneObject "TakarMain" not found')
    const main = mainObject.getComponent(TakarMain.getTypeName()) as TakarMain
    if (isNull(main)) throw new Error('TakarMain script not found on "TakarMain"')
    await waitUntil(
      () => main.getKettleState() === "onStove" && !main.isScaleVisible(),
      8000,
      () => `lens not idle: state=${main.getKettleState()} scaleAlpha=${main.getScaleAlpha()}`,
    )
    const driver = new TakarLeafDriver(id)
    driver.log(
      `start ml=${driver.ml().toFixed(2)} state=${driver.state()} home=${TakarLeafDriver.v3(driver.home)} ` +
        `axis=${TakarLeafDriver.v3(driver.axis)} spotDistance=${driver.spotDistance.toFixed(2)}`,
    )
    return driver
  }

  dispose(): void {
    this.unsubscribe()
  }

  log(message: string): void {
    print(`${TAG} [${this.id}] ${message}`)
  }

  static v3(v: vec3): string {
    return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`
  }

  state(): string {
    return this.main.getKettleState()
  }

  ml(): number {
    return this.main.getCurrentMl()
  }

  /** States entered since `sinceTime` (getTime seconds), oldest first. */
  statesSince(sinceTime: number): string[] {
    return this.transitions.filter((x) => x.t >= sinceTime).map((x) => x.state)
  }

  /** States entered from the most recent entry into `state` onward (inclusive), oldest first. */
  statesFromLast(state: string): string[] {
    const all = this.transitions.map((x) => x.state)
    const i = all.lastIndexOf(state)
    return i < 0 ? [] : all.slice(i)
  }

  transitionLog(): string {
    const t0 = this.transitions.length > 0 ? this.transitions[0].t : 0
    return this.transitions.map((x) => `${x.state}@+${(x.t - t0).toFixed(2)}s`).join(" -> ")
  }

  /** Horizontal distance of the kettle from its stove position (cm). */
  kettleTravel(): number {
    const d = this.kettleObject.getTransform().getWorldPosition().sub(this.home)
    d.y = 0
    return d.length
  }

  /** Kettle tilt away from its level stove pose, in degrees. */
  kettleTiltDeg(): number {
    const q = this.kettleObject.getTransform().getWorldRotation()
    const h = this.homeRotation
    const dot = Math.min(1, Math.abs(q.x * h.x + q.y * h.y + q.z * h.z + q.w * h.w))
    return (2 * Math.acos(dot) * 180) / Math.PI
  }

  /** Starts a pinch on the kettle that LEAF holds for `holdMs`, then releases. */
  pinchKettle(handType: HandType, holdMs: number): KettlePinch {
    const hand = LeafHandInteractor.get(handType)
    return new KettlePinch(handType, holdMs, (perFrame) => hand.drag(this.kettle, perFrame, holdMs))
  }

  /** Waits for `predicate`, failing early with the pinch's own error if LEAF lost it. */
  async waitWhilePinched(pinch: KettlePinch, predicate: () => boolean, timeoutMs: number, what: string): Promise<void> {
    await waitUntil(
      () => {
        pinch.throwIfFailed()
        if (predicate()) return true
        if (pinch.isSettled()) {
          throw new Error(`pinch was released before ${what} (state=${this.state()} ml=${this.ml().toFixed(2)})`)
        }
        return false
      },
      timeoutMs,
      () => `${what}; state=${this.state()} ml=${this.ml().toFixed(2)} transitions=${this.transitionLog()}`,
    )
  }

  /** Stove -> glass: moves the pinched hand along the table until the kettle snaps over the glass. */
  async carryToGlass(pinch: KettlePinch): Promise<void> {
    pinch.move(this.axis.uniformScale(CARRY_CM_PER_FRAME))
    await this.waitWhilePinched(pinch, () => this.state() === "overGlass", 8000, 'kettle state "overGlass"')
    pinch.holdStill()
  }

  /** Over the glass: moves the pinched hand straight up until the lens reports pouring. */
  async liftToPour(pinch: KettlePinch): Promise<void> {
    pinch.move(vec3.up().uniformScale(LIFT_CM_PER_FRAME))
    await this.waitWhilePinched(pinch, () => this.state() === "pouring" && this.main.isPouring(), 4000, "pouring")
    pinch.holdStill()
  }

  /** Waits (without a pinch) until the kettle is released and parked over the glass; returns that time. */
  async waitForRelease(pinch: KettlePinch): Promise<number> {
    await waitUntil(
      () => {
        pinch.throwIfFailed()
        return this.state() === "parkedOverGlass"
      },
      pinch.holdMs + 6000,
      () => `release (parkedOverGlass); state=${this.state()}`,
    )
    return getTime()
  }
}
