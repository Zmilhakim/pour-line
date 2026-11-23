import { attachMesh } from "./MeshKit";
import { buildTable } from "./MeshShapes";

/**
 * Table: a 90 x 3 x 45 cm slab on four legs. The slab's underside is y = 0 and its top face
 * y = 3 (centred on x and z); the legs hang below, from y = 0 down to the floor at y = -87.
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
