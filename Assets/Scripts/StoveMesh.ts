import { attachMesh } from "./MeshKit";
import { buildStove } from "./MeshShapes";

/**
 * Single-burner stove, 26 x 8 x 26 cm. Stands on y = 0, burner at the centre, knob on the front (+Z). A kettle stands on the pan supports at y = 8 (STOVE_TOP_Y).
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class StoveMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  onAwake(): void {
    attachMesh(this.sceneObject, buildStove(), this.material, {});
  }
}
