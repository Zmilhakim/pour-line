import { attachMesh } from "./MeshKit";
import { buildCoffeeGrounds } from "./MeshShapes";

/**
 * Disc of ground coffee, 6.9 x 0.8 x 6.9 cm. Stands on y = 0: place it on the inside bottom of the glass (glass y + GLASS_FLOOR_Y).
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class CoffeeGroundsMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  onAwake(): void {
    attachMesh(this.sceneObject, buildCoffeeGrounds(), this.material, {});
  }
}
