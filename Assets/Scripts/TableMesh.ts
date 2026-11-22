import { attachMesh } from "./MeshKit";
import { buildTable } from "./MeshShapes";

/**
 * Tabletop slab, 90 x 3 x 45 cm. Stands on y = 0, centred on x and z; the top face is at y = 3.
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class TableMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  onAwake(): void {
    attachMesh(this.sceneObject, buildTable(), this.material, {});
  }
}
