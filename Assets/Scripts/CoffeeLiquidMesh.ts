import { attachMesh, refillMesh, MeshHandle, RGBA } from "./MeshKit";
import { buildCoffeeLiquid, coffeeColor, LIQUID_MAX_HEIGHT } from "./MeshShapes";

/**
 * Column of coffee inside the glass, 6.9 cm across and up to 11 cm tall.
 * Stands on y = 0: place it on the inside bottom of the glass
 * (glass y + GLASS_FLOOR_Y). Nothing is drawn while it is empty.
 *
 *   setFill(0..1)   height and colour together: 0 = empty, 1 = 300 ml / 11 cm,
 *                   colour runs from deep brown to light caramel
 *   setHeightCm(h)  height only
 *   setColor(c)     fixed colour (rgb 0..1); clearColor() returns to the blend
 *
 * Builds its own RenderMeshVisual at runtime. Wire the vertex colour material
 * (vertexBaseColorMaterial) to `material`.
 */
@component
export class CoffeeLiquidMesh extends BaseScriptComponent {
  @input
  @allowUndefined
  material: Material;

  @input
  @hint("Fill level at start, 0 = empty, 1 = full (300 ml)")
  initialFill: number = 0;

  private handle: MeshHandle | null = null;
  private heightCm: number = 0;
  private colorFill: number = 0;
  private fixedColor: RGBA | null = null;
  private builtHeight: number = -1;
  private builtColor: RGBA | null = null;

  onAwake(): void {
    const f = Math.max(0, Math.min(1, this.initialFill));
    this.heightCm = f * LIQUID_MAX_HEIGHT;
    this.colorFill = f;
    this.handle = attachMesh(this.sceneObject, buildCoffeeLiquid(0, coffeeColor(0)), this.material, { renderOrder: 0 });
    this.rebuild();
  }

  /** Sets height and colour from one fill level, 0 (empty) to 1 (full, 300 ml). */
  setFill(fill01: number): void {
    const f = Math.max(0, Math.min(1, fill01));
    this.heightCm = f * LIQUID_MAX_HEIGHT;
    this.colorFill = f;
    this.rebuild();
  }

  /** Sets the height only, 0 to 11 cm. */
  setHeightCm(heightCm: number): void {
    this.heightCm = Math.max(0, Math.min(LIQUID_MAX_HEIGHT, heightCm));
    this.rebuild();
  }

  /** Uses a fixed colour instead of the deep-brown-to-caramel blend. */
  setColor(color: vec3): void {
    this.fixedColor = [color.x, color.y, color.z, 1];
    this.rebuild();
  }

  /** Returns to the fill-driven colour blend. */
  clearColor(): void {
    this.fixedColor = null;
    this.rebuild();
  }

  getHeightCm(): number {
    return this.heightCm;
  }

  getFill(): number {
    return this.heightCm / LIQUID_MAX_HEIGHT;
  }

  /** The liquid surface in world space (where the water stream should end). */
  getSurfaceWorld(): vec3 {
    return this.sceneObject.getTransform().getWorldTransform().multiplyPoint(new vec3(0, this.heightCm, 0));
  }

  private rebuild(): void {
    if (!this.handle) return;
    const c = this.fixedColor ? this.fixedColor : coffeeColor(this.colorFill);
    const b = this.builtColor;
    const sameColor = b !== null && Math.abs(b[0] - c[0]) + Math.abs(b[1] - c[1]) + Math.abs(b[2] - c[2]) < 0.002;
    if (sameColor && Math.abs(this.builtHeight - this.heightCm) < 0.002) return;
    const geo = buildCoffeeLiquid(this.heightCm, c);
    this.handle.visual.enabled = geo.count > 0;
    if (geo.count > 0) refillMesh(this.handle, geo);
    this.builtHeight = this.heightCm;
    this.builtColor = c;
  }
}
