/**
 * LeafIndex — registers the Takar LEAF scenarios (test code only; one per done criterion
 * of devpost/design-brief.md, plus Start over).
 */
import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {TakarAddMoreScenario} from "./TakarAddMoreScenario"
import {TakarCoffeeLightensScenario} from "./TakarCoffeeLightensScenario"
import {TakarKettleToGlassScenario} from "./TakarKettleToGlassScenario"
import {TakarPourRaisesLevelScenario} from "./TakarPourRaisesLevelScenario"
import {TakarReleaseStopsScaleFadesScenario} from "./TakarReleaseStopsScaleFadesScenario"
import {TakarStartOverScenario} from "./TakarStartOverScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "takar-1-kettle-to-glass-shows-scale", typename: TakarKettleToGlassScenario.getTypeName()},
    {id: "takar-2-drag-up-pours-level-rises", typename: TakarPourRaisesLevelScenario.getTypeName()},
    {id: "takar-3-coffee-dark-to-lighter-brown", typename: TakarCoffeeLightensScenario.getTypeName()},
    {id: "takar-4-release-stops-scale-holds-then-fades", typename: TakarReleaseStopsScaleFadesScenario.getTypeName()},
    {id: "takar-5-add-more-continues-from-level", typename: TakarAddMoreScenario.getTypeName()},
    {id: "takar-6-start-over-resets", typename: TakarStartOverScenario.getTypeName()},
  ]
}
