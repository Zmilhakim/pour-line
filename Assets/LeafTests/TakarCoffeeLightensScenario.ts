/**
 * Done criterion 3 — "As the level rises, the coffee changes from dark brown to a
 * lighter brown."
 */
import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {TakarLeafDriver} from "./TakarLeafDriver"

function fmt(c: vec4): string {
  return `(${c.r.toFixed(3)}, ${c.g.toFixed(3)}, ${c.b.toFixed(3)})`
}

function brightness(c: vec4): number {
  return c.r + c.g + c.b
}

function distance(a: vec4, b: vec4): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

@component
export class TakarCoffeeLightensScenario extends Scenario {
  async run(): Promise<void> {
    const d = await TakarLeafDriver.create("c3-coffee-lightens")
    try {
      const main = d.main
      const capacity = main.getCapacityMl()
      const start = main.glassView.liquidStartColor
      const end = main.glassView.liquidEndColor
      const ml0 = d.ml()
      expect(ml0, "precondition: room left in the glass (ml)").toBeLessThan(capacity - 150)

      const pinch = d.pinchKettle("right", 7000)
      await d.carryToGlass(pinch)
      await d.liftToPour(pinch)

      await d.waitWhilePinched(pinch, () => d.ml() >= ml0 + 5, 3000, "a low level (+5 ml)")
      const mlLow = d.ml()
      const low = main.getLiquidColor()

      await d.waitWhilePinched(pinch, () => d.ml() >= ml0 + 110, 6000, "a high level (+110 ml)")
      const mlHigh = d.ml()
      const high = main.getLiquidColor()

      d.log(
        `low: ml=${mlLow.toFixed(2)} colour=${fmt(low)} brightness=${brightness(low).toFixed(3)} | ` +
          `high: ml=${mlHigh.toFixed(2)} colour=${fmt(high)} brightness=${brightness(high).toFixed(3)} | ` +
          `configured start=${fmt(start)} end=${fmt(end)} distToEnd low=${distance(low, end).toFixed(3)} high=${distance(high, end).toFixed(3)}`,
      )

      expect(mlHigh, "level rose between the two samples").toBeGreaterThan(mlLow + 90)
      // Lighter: every channel and the overall brightness go up, toward the configured end colour.
      expect(brightness(high), "brightness at the high level").toBeGreaterThan(brightness(low))
      expect(high.r, "red at the high level").toBeGreaterThan(low.r)
      expect(high.g, "green at the high level").toBeGreaterThan(low.g)
      expect(high.b, "blue at the high level").toBeGreaterThan(low.b)
      expect(distance(high, end), "distance to the end colour shrinks").toBeLessThan(distance(low, end))
      // Still brown at both levels (red > green > blue), and exactly on the start->end blend.
      expect(low.r > low.g && low.g > low.b, "low level is a brown (r > g > b)").toBe(true)
      expect(high.r > high.g && high.g > high.b, "high level is a brown (r > g > b)").toBe(true)
      const tHigh = mlHigh / capacity
      expect(high.r, "red on the start->end blend").toBeCloseTo(start.r + (end.r - start.r) * tHigh, 2)
      expect(high.g, "green on the start->end blend").toBeCloseTo(start.g + (end.g - start.g) * tHigh, 2)
      expect(high.b, "blue on the start->end blend").toBeCloseTo(start.b + (end.b - start.b) * tHigh, 2)

      await pinch.finish()
      d.log(`after release: ml=${d.ml().toFixed(2)} colour=${fmt(main.getLiquidColor())}`)
    } finally {
      d.dispose()
    }
  }
}
