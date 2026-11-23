import { attachMesh } from "./MeshKit";
import { buildGasHose } from "./MeshShapes";

/**
 * Gas hose, 1.2 cm thick, from the cylinder's regulator to the stove's inlet. The origin is the
 * regulator end; the route is fixed in the space of the table, so the object must stand at
 * GAS_HOSE_ORIGIN (MeshShapes), unrotated, next to the Stove and the GasCylinder.
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class GasHoseMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  onAwake(): void {
    attachMesh(this.sceneObject, buildGasHose(), this.material, {});
  }
}
