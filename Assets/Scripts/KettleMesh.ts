import { attachMesh } from "./MeshKit";
import { buildKettle, KETTLE_BODY_AXIS_X, KETTLE_SPOUT_TIP } from "./MeshShapes";

/**
 * Stovetop kettle, 22 x 18 x 16 cm. Stands on y = 0, spout towards +X.
 * The origin is the centre of the footprint, so the round body sits at
 * x = -3 (KETTLE_BODY_AXIS_X) and the spout opening at (10.15, 10.9, 0).
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class KettleMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  onAwake(): void {
    attachMesh(this.sceneObject, buildKettle(), this.material, {});
  }

  /** Centre of the spout opening in this object's local space. */
  getSpoutTipLocal(): vec3 {
    return new vec3(KETTLE_SPOUT_TIP[0], KETTLE_SPOUT_TIP[1], KETTLE_SPOUT_TIP[2]);
  }

  /** Centre of the spout opening in world space: water leaves the kettle here. */
  getSpoutTipWorld(): vec3 {
    return this.sceneObject.getTransform().getWorldTransform().multiplyPoint(this.getSpoutTipLocal());
  }

  /** Centre of the round body's base in local space. */
  getBodyBaseLocal(): vec3 {
    return new vec3(KETTLE_BODY_AXIS_X, 0, 0);
  }
}
