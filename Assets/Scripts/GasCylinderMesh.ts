import { attachMesh } from "./MeshKit";
import { buildGasCylinder } from "./MeshShapes";

/**
 * Household gas cylinder, 26 cm across and about 35 cm tall with its regulator. Stands on y = 0
 * (centred on x and z); the regulator's outlet points to -X at GAS_REGULATOR_OUTLET.
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class GasCylinderMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  onAwake(): void {
    attachMesh(this.sceneObject, buildGasCylinder(), this.material, {});
  }
}
