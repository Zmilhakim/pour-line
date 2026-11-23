/**
 * Done criterion 2 — "With the kettle over the glass, dragging upward makes water flow
 * and the level in the glass rise against the scale."
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {TakarLeafDriver} from "./TakarLeafDriver"

const SPAN_CM = 11 // liquid height at capacity (TakarSceneContracts.LIQUID_SPAN_CM)

@component
export class TakarPourRaisesLevelScenario extends Scenario {
  async run(): Promise<void> {
    const d = await TakarLeafDriver.create("c2-pour-raises-level")
    try {
      const main = d.main
      const capacity = main.getCapacityMl()
      const ml0 = d.ml()
      const h0 = main.getLiquidHeightCm()
      expect(ml0, "precondition: room left in the glass (ml)").toBeLessThan(capacity - 150)

      const pinch = d.pinchKettle("right", 6000)
      await d.carryToGlass(pinch)

      // Over the glass but not lifted: nothing flows.
      await sleep(500)
      expect(main.isPouring(), "isPouring before lifting").toBe(false)
      expect(d.ml(), "ml before lifting").toBe(ml0)

      const tLift = getTime()
      await d.liftToPour(pinch)
      d.log(`pour started ${(getTime() - tLift).toFixed(2)}s after the lift began; state=${d.state()}`)
      await sleep(300) // kettle eases into its pour tilt

      const t1 = getTime()
      const ml1 = d.ml()
      const h1 = main.getLiquidHeightCm()
      expect(main.isPouring(), "isPouring at first sample").toBe(true)
      const tilt = d.kettleTiltDeg()

      await sleep(2000)
      pinch.throwIfFailed()
      const t2 = getTime()
      const ml2 = d.ml()
      const h2 = main.getLiquidHeightCm()
      expect(main.isPouring(), "isPouring at second sample").toBe(true)

      const rate = (ml2 - ml1) / (t2 - t1)
      d.log(
        `ml0=${ml0.toFixed(2)} ml1=${ml1.toFixed(2)} ml2=${ml2.toFixed(2)} dt=${(t2 - t1).toFixed(3)}s rate=${rate.toFixed(2)}ml/s ` +
          `h0=${h0.toFixed(3)}cm h1=${h1.toFixed(3)}cm h2=${h2.toFixed(3)}cm expectedH2=${((ml2 / capacity) * SPAN_CM).toFixed(3)}cm tilt=${tilt.toFixed(1)}deg`,
      )

      expect(ml1, "ml after the pour started").toBeGreaterThan(ml0)
      expect(ml2, "ml keeps rising").toBeGreaterThan(ml1)
      expect(rate, "pour rate (ml/s), configured 30").toBeWithinRange(25.5, 34.5)
      expect(h2, "liquid height rises").toBeGreaterThan(h1)
      expect(h1, "liquid height proportional to ml at sample 1 (cm)").toBeCloseTo((ml1 / capacity) * SPAN_CM, 2)
      expect(h2, "liquid height proportional to ml at sample 2 (cm)").toBeCloseTo((ml2 / capacity) * SPAN_CM, 2)
      expect(tilt, "kettle tilt while pouring (deg), configured 35").toBeWithinRange(30, 36)

      await pinch.finish()
      d.log(`after release: ml=${d.ml().toFixed(2)} state=${d.state()} transitions: ${d.transitionLog()}`)
    } finally {
      d.dispose()
    }
  }
}
