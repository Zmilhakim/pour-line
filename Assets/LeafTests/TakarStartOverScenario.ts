/**
 * Extra — the "Start over" button empties the glass and puts the kettle back.
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {LeafHandInteractor} from "Leaf.lspkg/Interactors/interactor/LeafTwoHandInteractor"
import {nextFrame} from "Leaf.lspkg/Utils/common/Utils"
import {TakarLeafDriver} from "./TakarLeafDriver"

@component
export class TakarStartOverScenario extends Scenario {
  async run(): Promise<void> {
    const d = await TakarLeafDriver.create("x6-start-over")
    try {
      const main = d.main
      const button = findInteractableByName("startOverButton", undefined, true)
      if (button === undefined || isNull(button)) throw new Error('Interactable "startOverButton" not found or not enabled')

      const ml0 = d.ml()
      const pinch = d.pinchKettle("right", 2500)
      await d.carryToGlass(pinch)
      await d.liftToPour(pinch)
      await d.waitForRelease(pinch)
      await pinch.finish()
      const mlBefore = d.ml()
      d.log(`before Start over: ml=${mlBefore.toFixed(2)} state=${d.state()} scaleAlpha=${main.getScaleAlpha()} height=${main.getLiquidHeightCm().toFixed(3)}cm`)
      expect(mlBefore, "water in the glass before Start over").toBeGreaterThan(ml0 + 10)

      // Left hand, while the kettle still waits over the glass.
      await LeafHandInteractor.get("left").trigger(button)
      await nextFrame()
      await nextFrame()
      const homeError = d.kettleObject.getTransform().getWorldPosition().distance(d.home)
      d.log(
        `after Start over: ml=${d.ml()} state=${d.state()} scaleAlpha=${main.getScaleAlpha()} isPouring=${main.isPouring()} ` +
          `height=${main.getLiquidHeightCm()}cm kettleHomeError=${homeError.toFixed(3)}cm labelsEnabled=${d.scaleLabelsRoot.enabled}`,
      )
      expect(d.ml(), "ml after Start over").toBe(0)
      expect(main.getLiquidHeightCm(), "liquid height after Start over").toBe(0)
      expect(d.state(), "kettle state after Start over").toBe("onStove")
      expect(homeError, "kettle distance from its stove position (cm)").toBeLessThan(0.05)
      expect(main.isPouring(), "isPouring after Start over").toBe(false)
      expect(main.isScaleVisible(), "scale hidden after Start over").toBe(false)
      expect(d.scaleLabelsRoot.enabled, "ScaleLabelsRoot.enabled after Start over").toBe(false)
    } finally {
      d.dispose()
    }
  }
}
