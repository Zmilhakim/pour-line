import { attachMesh, refillMesh, MeshHandle } from "./MeshKit";
import { buildWaterStream, STREAM_MAX_LENGTH } from "./MeshShapes";

/**
 * Stream of water from the kettle, light cyan and see-through.
 * The origin is the BOTTOM of the stream: put this object where the water
 * lands (the liquid surface, or the inside bottom of the glass) and the stream
 * rises straight up (+Y) for the given length, up to 14 cm.
 * 0.8 cm across at the top, narrower lower down. Hidden at length 0.
 *
 *   setLength(cm)   0 hides it
 *   hide()          same as setLength(0)
 *
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class WaterStreamMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  @input
  @hint("Length in cm at start; 0 = hidden")
  initialLength: number = 0;

  private handle: MeshHandle | null = null;
  private lengthCm: number = 0;
  private builtLength: number = -1;

  onAwake(): void {
    this.lengthCm = Math.max(0, Math.min(STREAM_MAX_LENGTH, this.initialLength));
    this.handle = attachMesh(this.sceneObject, buildWaterStream(0), this.material, { transparent: true, renderOrder: 1 });
    this.rebuild();
  }

  /** Length of the stream in cm, measured up from the origin. 0 hides it. */
  setLength(lengthCm: number): void {
    this.lengthCm = Math.max(0, Math.min(STREAM_MAX_LENGTH, lengthCm));
    this.rebuild();
  }

  hide(): void {
    this.setLength(0);
  }

  getLength(): number {
    return this.lengthCm;
  }

  isVisible(): boolean {
    return this.lengthCm >= 0.01;
  }

  private rebuild(): void {
    if (!this.handle) return;
    if (Math.abs(this.builtLength - this.lengthCm) < 0.002) return;
    const geo = buildWaterStream(this.lengthCm);
    this.handle.visual.enabled = geo.count > 0;
    if (geo.count > 0) refillMesh(this.handle, geo);
    this.builtLength = this.lengthCm;
  }
}
