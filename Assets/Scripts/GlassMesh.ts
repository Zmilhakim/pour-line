import { attachMesh } from "./MeshKit";
import { buildGlass } from "./MeshShapes";

/**
 * Open drinking glass, 7.5 x 12 x 7.5 cm, see-through. Stands on y = 0; the inside bottom is at y = 0.5 (GLASS_FLOOR_Y), inside radius 3.5.
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class GlassMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  onAwake(): void {
    attachMesh(this.sceneObject, buildGlass(), this.material, { transparent: true, renderOrder: 2 });
  }
}
