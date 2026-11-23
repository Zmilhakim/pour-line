/**
 * Done criterion 5 — "After pouring I look at whether the amount is right, and if it
 * isn't, I add more": pouring again continues from the current level, not from 0.
 * Path A: pinch the waiting kettle again inside the 3 s pause (same hand).
 * Path B: after the kettle went back to the stove, bring it over again.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep, waitUntil} from "Leaf.lspkg/Utils/common/Utils"
import {TakarLeafDriver} from "./TakarLeafDriver"

@component
export class TakarAddMoreScenario extends Scenario {
  async run(): Promise<void> {
    const d = await TakarLeafDriver.create("c5-add-more")
    try {
      const main = d.main
      const ml0 = d.ml()
      expect(ml0, "precondition: room left in the glass (ml)").toBeLessThan(main.getCapacityMl() - 200)

      // ── First pour to N ───────────────────────────────────────────────
      const first = d.pinchKettle("right", 3000)
      await d.carryToGlass(first)
      await d.liftToPour(first)
      const tRelease1 = await d.waitForRelease(first)
      await first.finish()
      const mlN = d.ml()
      d.log(`first pour: ml ${ml0.toFixed(2)} -> N=${mlN.toFixed(2)}; state=${d.state()}`)
      expect(mlN, "first pour added water").toBeGreaterThan(ml0 + 15)
      expect(main.isPouring(), "isPouring after the first release").toBe(false)

      // ── Path A: pinch again within the pause, same hand ───────────────
      const second = d.pinchKettle("right", 3000)
      await d.waitWhilePinched(second, () => d.state() === "overGlass" && main.kettle.isHeld(), 6000, "re-pinch of the waiting kettle")
      const tRepinch = getTime()
      const between = d.statesFromLast("parkedOverGlass").join(",")
      d.log(`re-pinch (right hand) +${(tRepinch - tRelease1).toFixed(2)}s after release; states since release: ${between}; ml=${d.ml().toFixed(2)}`)
      expect(between, "kettle stayed over the glass until the re-pinch").toBe("parkedOverGlass,overGlass")
      expect(tRepinch - tRelease1, "re-pinch happened inside the 3 s pause (s)").toBeLessThan(3)
      expect(main.isScaleVisible(), "scale still shown at the re-pinch").toBe(true)
      expect(d.ml(), "level at the re-pinch is still N").toBe(mlN)

      await d.liftToPour(second)
      await d.waitWhilePinched(second, () => d.ml() > mlN, 2000, "ml rising after the re-pinch")
      const mlFirstTickA = d.ml()
      expect(mlFirstTickA - mlN, "second pour continues from N, first step is one frame of water (ml)").toBeWithinRange(0.0001, 4)
      const tRelease2 = await d.waitForRelease(second)
      await second.finish()
      const mlM = d.ml()
      d.log(`path A (re-pinch): ml N=${mlN.toFixed(2)} -> M=${mlM.toFixed(2)} (first step ${mlFirstTickA.toFixed(2)})`)
      expect(mlM, "path A raised the level above N").toBeGreaterThan(mlN + 15)

      // ── Kettle goes home by itself; level is kept ─────────────────────
      await waitUntil(() => d.state() === "onStove", 6000, () => `auto-return; state=${d.state()}`)
      const tHome = getTime()
      await sleep(300)
      d.log(`auto-return +${(tHome - tRelease2).toFixed(2)}s after release; ml=${d.ml().toFixed(2)} scaleAlpha=${main.getScaleAlpha().toFixed(2)}`)
      expect(d.ml(), "level kept while the kettle went back to the stove").toBe(mlM)

      // ── Path B: bring the kettle over from the stove again ────────────
      const third = d.pinchKettle("right", 3500)
      await d.carryToGlass(third)
      expect(d.ml(), "level still M with the kettle back over the glass").toBe(mlM)
      expect(main.isScaleVisible(), "scale shown again").toBe(true)
      await d.liftToPour(third)
      await d.waitWhilePinched(third, () => d.ml() > mlM, 2000, "ml rising on the third pour")
      const mlFirstTickB = d.ml()
      expect(mlFirstTickB - mlM, "third pour continues from M, first step is one frame of water (ml)").toBeWithinRange(0.0001, 4)
      await d.waitForRelease(third)
      await third.finish()
      const mlP = d.ml()
      d.log(`path B (from the stove again): ml M=${mlM.toFixed(2)} -> P=${mlP.toFixed(2)} (first step ${mlFirstTickB.toFixed(2)})`)
      expect(mlP, "path B raised the level above M").toBeGreaterThan(mlM + 15)

      d.log(`levels: ${ml0.toFixed(2)} -> ${mlN.toFixed(2)} -> ${mlM.toFixed(2)} -> ${mlP.toFixed(2)}; transitions: ${d.transitionLog()}`)
    } finally {
      d.dispose()
    }
  }
}
