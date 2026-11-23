/**
 * Done criterion 1 — "Pinching the kettle on the stove and dragging it toward the glass
 * moves it over the glass, and the millilitre scale appears."
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {TakarLeafDriver} from "./TakarLeafDriver"

@component
export class TakarKettleToGlassScenario extends Scenario {
  async run(): Promise<void> {
    const d = await TakarLeafDriver.create("c1-kettle-to-glass")
    try {
      const main = d.main
      const ml0 = d.ml()

      // Before: kettle on the stove, no scale.
      expect(d.state(), "kettle state before the pinch").toBe("onStove")
      expect(main.isKettleOverGlass(), "isKettleOverGlass before").toBe(false)
      expect(main.isScaleVisible(), "isScaleVisible before").toBe(false)
      expect(main.getScaleAlpha(), "scale alpha before").toBe(0)
      expect(d.scaleLabelsRoot.enabled, "ScaleLabelsRoot.enabled before").toBe(false)

      const tStart = getTime()
      const pinch = d.pinchKettle("right", 2500)
      await d.carryToGlass(pinch)
      const tSnap = getTime()
      await sleep(400) // let the kettle finish easing onto the pour spot

      const pos = d.kettleObject.getTransform().getWorldPosition()
      const spotY = d.pourSpot.getTransform().getWorldPosition().y
      d.log(
        `over glass: state=${d.state()} isKettleOverGlass=${main.isKettleOverGlass()} isScaleVisible=${main.isScaleVisible()} ` +
          `scaleAlpha=${main.getScaleAlpha()} labelsEnabled=${d.scaleLabelsRoot.enabled} travel=${d.kettleTravel().toFixed(2)}cm ` +
          `kettleY=${pos.y.toFixed(2)} pourSpotY=${spotY.toFixed(2)} tilt=${d.kettleTiltDeg().toFixed(2)}deg ` +
          `ml=${d.ml().toFixed(2)} pinchToSnap=${(tSnap - tStart).toFixed(2)}s`,
      )

      expect(d.statesSince(tStart).join(","), "states entered during the drag").toBe("carried,overGlass")
      expect(d.state(), "kettle state after dragging toward the glass").toBe("overGlass")
      expect(main.isKettleOverGlass(), "isKettleOverGlass").toBe(true)
      expect(main.isScaleVisible(), "isScaleVisible").toBe(true)
      expect(main.getScaleAlpha(), "scale alpha").toBeCloseTo(1, 3)
      expect(d.scaleLabelsRoot.enabled, "ScaleLabelsRoot.enabled").toBe(true)
      // The kettle really moved: off the stove, at the pour height, still level, nothing poured.
      expect(d.kettleTravel(), "horizontal kettle travel from the stove (cm)").toBeGreaterThan(6)
      expect(Math.abs(pos.y - spotY), "kettle height vs KettlePourSpot height (cm)").toBeLessThan(0.2)
      expect(d.kettleTiltDeg(), "kettle tilt while only over the glass (deg)").toBeLessThan(1)
      expect(main.isPouring(), "isPouring while only over the glass").toBe(false)
      expect(d.ml(), "ml unchanged by moving the kettle").toBe(ml0)

      await pinch.finish()
      d.log(`transitions: ${d.transitionLog()}`)
    } finally {
      d.dispose()
    }
  }
}
