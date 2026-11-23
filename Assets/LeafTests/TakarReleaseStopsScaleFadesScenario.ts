/**
 * Done criterion 4 — "Releasing the pinch stops the water. The scale stays visible for
 * about 3 seconds, so the amount can be checked, then fades." Also checks the agreed
 * auto-return: the kettle is back on the stove once the scale is gone.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {nextFrame, sleep, waitUntil} from "Leaf.lspkg/Utils/common/Utils"
import {TakarLeafDriver} from "./TakarLeafDriver"

@component
export class TakarReleaseStopsScaleFadesScenario extends Scenario {
  async run(): Promise<void> {
    const d = await TakarLeafDriver.create("c4-release-stops-scale-fades")
    try {
      const main = d.main
      const ml0 = d.ml()
      expect(ml0, "precondition: room left in the glass (ml)").toBeLessThan(main.getCapacityMl() - 150)

      const pinch = d.pinchKettle("right", 3000)
      await d.carryToGlass(pinch)
      await d.liftToPour(pinch)
      await d.waitWhilePinched(pinch, () => d.ml() >= ml0 + 15, 3000, "some water poured (+15 ml)")
      expect(main.isPouring(), "isPouring before the release").toBe(true)

      // LEAF releases the pinch when its hold time is up.
      const tRelease = await d.waitForRelease(pinch)
      const at = (s: number) => waitUntil(() => getTime() - tRelease >= s, 10000)

      await nextFrame()
      await nextFrame()
      const mlAtRelease = d.ml()
      d.log(`released: ml=${mlAtRelease.toFixed(3)} isPouring=${main.isPouring()} state=${d.state()} scaleAlpha=${main.getScaleAlpha()}`)
      expect(main.isPouring(), "isPouring right after the release").toBe(false)
      expect(d.state(), "kettle state right after the release").toBe("parkedOverGlass")
      expect(mlAtRelease, "water was poured before the release").toBeGreaterThan(ml0 + 15)

      // Watch the scale for the rest of the run.
      let tFadeStart = -1
      let tHidden = -1
      const watch = waitUntil(() => {
        const a = main.getScaleAlpha()
        if (tFadeStart < 0 && a < 1) tFadeStart = getTime() - tRelease
        if (tHidden < 0 && a <= 0) tHidden = getTime() - tRelease
        return tHidden >= 0
      }, 10000, () => `scale never hid; alpha=${main.getScaleAlpha()}`)

      await at(1.1)
      const mlAfter1s = d.ml()
      expect(mlAfter1s, "ml constant for 1 s after the release").toBe(mlAtRelease)

      await at(1.5)
      d.log(
        `+1.5s: isScaleVisible=${main.isScaleVisible()} scaleAlpha=${main.getScaleAlpha()} labelsEnabled=${d.scaleLabelsRoot.enabled} ` +
          `state=${d.state()} ml=${d.ml().toFixed(3)} tilt=${d.kettleTiltDeg().toFixed(2)}deg`,
      )
      expect(main.isScaleVisible(), "isScaleVisible at +1.5 s").toBe(true)
      expect(main.getScaleAlpha(), "scale alpha at +1.5 s").toBeCloseTo(1, 3)
      expect(d.scaleLabelsRoot.enabled, "ScaleLabelsRoot.enabled at +1.5 s").toBe(true)
      expect(d.state(), "kettle waits over the glass at +1.5 s").toBe("parkedOverGlass")
      expect(d.kettleTiltDeg(), "waiting kettle is level (deg)").toBeLessThan(1)

      await at(2.7)
      expect(main.getScaleAlpha(), "scale still fully shown at +2.7 s").toBeCloseTo(1, 3)

      await at(4.5)
      await watch
      const homeError = d.kettleObject.getTransform().getWorldPosition().distance(d.home)
      d.log(
        `+4.5s: isScaleVisible=${main.isScaleVisible()} scaleAlpha=${main.getScaleAlpha()} labelsEnabled=${d.scaleLabelsRoot.enabled} ` +
          `state=${d.state()} ml=${d.ml().toFixed(3)} fadeStart=+${tFadeStart.toFixed(2)}s hidden=+${tHidden.toFixed(2)}s ` +
          `kettleHomeError=${homeError.toFixed(3)}cm tilt=${d.kettleTiltDeg().toFixed(2)}deg transitions: ${d.transitionLog()}`,
      )
      expect(main.isScaleVisible(), "isScaleVisible at +4.5 s").toBe(false)
      expect(main.getScaleAlpha(), "scale alpha at +4.5 s").toBe(0)
      expect(d.scaleLabelsRoot.enabled, "ScaleLabelsRoot.enabled at +4.5 s").toBe(false)
      expect(tFadeStart, "fade starts about 3 s after the release (s)").toBeWithinRange(2.8, 3.4)
      expect(tHidden, "scale hidden about 3.6 s after the release (s)").toBeWithinRange(3.3, 4.2)
      expect(tHidden - tFadeStart, "fade lasts about 0.6 s").toBeWithinRange(0.4, 0.9)
      expect(d.state(), "kettle back on the stove at +4.5 s").toBe("onStove")
      expect(homeError, "kettle distance from its stove position (cm)").toBeLessThan(0.05)
      expect(d.kettleTiltDeg(), "kettle level on the stove (deg)").toBeLessThan(0.1)
      expect(d.statesFromLast("parkedOverGlass").join(","), "states after the release").toBe("parkedOverGlass,returning,onStove")
      expect(d.ml(), "ml unchanged from release to the end").toBe(mlAtRelease)

      await pinch.finish()
      await sleep(100)
    } finally {
      d.dispose()
    }
  }
}
