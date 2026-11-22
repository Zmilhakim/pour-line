import { attachMesh, refillMesh, MeshHandle } from "./MeshKit";
import { buildScaleTicks, TICK_COUNT, TICK_STEP } from "./MeshShapes";

/**
 * Measuring scale: six soft white tick bars for 50..300 ml, 2 cm wide,
 * curved to follow the glass, front towards +Z.
 * The origin is the 0 ml level: tick i (1..6) is at y = i * 11/6 cm, so the
 * 300 ml tick is at y = 11. Put this object at
 * glass position + (0, GLASS_FLOOR_Y, TICK_Z_FROM_AXIS) = glass + (0, 0.5, 3.67),
 * or turn that offset around the glass axis to face the user.
 *
 *   setOpacity(0..1)   0 hides it; starts at `initialOpacity`
 *
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class ScaleTicksMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  @input
  @hint("Opacity at start, 0 = hidden, 1 = fully visible")
  initialOpacity: number = 0;

  private handle: MeshHandle | null = null;
  private opacity: number = 0;
  private builtOpacity: number = -1;

  onAwake(): void {
    this.opacity = Math.max(0, Math.min(1, this.initialOpacity));
    this.handle = attachMesh(this.sceneObject, buildScaleTicks(0), this.material, {
      transparent: true,
      twoSided: true,
      renderOrder: 3,
    });
    this.rebuild();
  }

  /** 0 = hidden, 1 = fully visible. */
  setOpacity(opacity01: number): void {
    this.opacity = Math.max(0, Math.min(1, opacity01));
    this.rebuild();
  }

  getOpacity(): number {
    return this.opacity;
  }

  /** Local y of the tick for `ml` millilitres (50 ml per tick). */
  getTickLocalY(ml: number): number {
    return (ml / 50) * TICK_STEP;
  }

  getTickCount(): number {
    return TICK_COUNT;
  }

  private rebuild(): void {
    if (!this.handle) return;
    if (Math.abs(this.builtOpacity - this.opacity) < 0.002) return;
    const geo = buildScaleTicks(this.opacity);
    this.handle.visual.enabled = geo.count > 0;
    if (geo.count > 0) refillMesh(this.handle, geo);
    this.builtOpacity = this.opacity;
  }
}
