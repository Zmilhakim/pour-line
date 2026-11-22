/**
 * MeshKit - small geometry toolkit for the code-built meshes of this Lens.
 *
 * Units are centimetres (Lens Studio world units). Vertex layout is
 * position(3) + normal(3) + color(4), triangles, UInt16 indices.
 *
 * Winding: every triangle is ordered from its vertex normals, so that
 * (v1 - v0) x (v2 - v0) points the same way as the normals. As long as the
 * normals point outward, the triangle is counter-clockwise seen from outside
 * and survives back-face culling.
 *
 * Shading: the vertex colour material is unlit, so a soft directional light is
 * baked into the vertex colours (Geo.lit). Nothing ever gets darker than about
 * half brightness, which keeps the shapes visible on an additive display.
 */

export type V3 = [number, number, number];
export type RGBA = [number, number, number, number];

const STRIDE = 10;

function norm3(v: V3): V3 {
  const l = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (l < 1e-9) return [0, 1, 0];
  return [v[0] / l, v[1] / l, v[2] / l];
}

function cross3(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot3(a: V3, b: V3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

// Light from above, a little to the right and towards the viewer (+Z).
const LIGHT: V3 = norm3([0.3, 0.85, 0.45]);

/** An outline is a closed loop in the XZ plane that can be grown or shrunk. */
export interface Outline {
  n: number;
  cx: number;
  cz: number;
  /** Point j of the loop at size `o`: [x, z, normalX, normalZ]. */
  at(j: number, o: number): [number, number, number, number];
}

/** Circle around (cx, cz); `o` is the radius. */
export function circleOutline(segs: number, cx: number = 0, cz: number = 0): Outline {
  return {
    n: segs,
    cx: cx,
    cz: cz,
    at: (j: number, o: number) => {
      const a = (j / segs) * Math.PI * 2;
      const c = Math.cos(a);
      const s = Math.sin(a);
      return [cx + o * c, cz + o * s, c, s];
    },
  };
}

/**
 * Rounded rectangle with half-extents hx, hz and corner radius cr; `o` is an
 * offset from that outline (0 = on it, negative = shrunk inward, at most cr).
 */
export function roundRectOutline(
  hx: number,
  hz: number,
  cr: number,
  arcSegs: number,
  cx: number = 0,
  cz: number = 0
): Outline {
  const per = arcSegs + 1;
  const corners: [number, number, number][] = [
    [hx - cr, hz - cr, 0],
    [-(hx - cr), hz - cr, Math.PI / 2],
    [-(hx - cr), -(hz - cr), Math.PI],
    [hx - cr, -(hz - cr), (Math.PI * 3) / 2],
  ];
  return {
    n: per * 4,
    cx: cx,
    cz: cz,
    at: (j: number, o: number) => {
      const corner = corners[Math.floor(j / per) % 4];
      const a = corner[2] + ((j % per) / arcSegs) * (Math.PI / 2);
      const c = Math.cos(a);
      const s = Math.sin(a);
      const r = Math.max(cr + o, 0);
      return [cx + corner[0] + r * c, cz + corner[1] + r * s, c, s];
    },
  };
}

export interface SweepOptions {
  /** Neighbouring profile segments closer than this angle share normals. */
  smoothDeg?: number;
  /** Flat cap (facing down) closing the first profile point. */
  capStart?: RGBA;
  /** Flat cap (facing up) closing the last profile point. */
  capEnd?: RGBA;
}

export class Geo {
  verts: number[] = [];
  indices: number[] = [];
  count: number = 0;
  /** Bake the soft directional light into vertex colours. */
  lit: boolean = true;
  /** Named index ranges, used by the offline checks. */
  parts: { name: string; start: number; closed: boolean }[] = [];
  private xf: ((v: V3, isNormal: boolean) => V3) | null = null;

  part(name: string, closed: boolean): void {
    this.parts.push({ name: name, start: this.indices.length, closed: closed });
  }

  /** Run `fn` with a rigid transform applied to everything it adds. */
  withTransform(xf: (v: V3, isNormal: boolean) => V3, fn: () => void): void {
    const prev = this.xf;
    this.xf = xf;
    fn();
    this.xf = prev;
  }

  vert(p: V3, n: V3, c: RGBA): number {
    let pp = p;
    let nn = norm3(n);
    if (this.xf) {
      pp = this.xf(p, false);
      nn = norm3(this.xf(nn, true));
    }
    let k = 1;
    if (this.lit) k = 0.78 + 0.22 * dot3(nn, LIGHT);
    this.verts.push(
      pp[0], pp[1], pp[2],
      nn[0], nn[1], nn[2],
      Math.min(c[0] * k, 1), Math.min(c[1] * k, 1), Math.min(c[2] * k, 1), c[3]
    );
    return this.count++;
  }

  private pos(i: number): V3 {
    const o = i * STRIDE;
    return [this.verts[o], this.verts[o + 1], this.verts[o + 2]];
  }

  private nrm(i: number): V3 {
    const o = i * STRIDE + 3;
    return [this.verts[o], this.verts[o + 1], this.verts[o + 2]];
  }

  /** Adds a triangle, ordered so that it faces along its vertex normals. */
  tri(a: number, b: number, c: number): void {
    const pa = this.pos(a);
    const pb = this.pos(b);
    const pc = this.pos(c);
    const cr = cross3(
      [pb[0] - pa[0], pb[1] - pa[1], pb[2] - pa[2]],
      [pc[0] - pa[0], pc[1] - pa[1], pc[2] - pa[2]]
    );
    if (dot3(cr, cr) < 1e-14) return; // degenerate (for example at a pole)
    const na = this.nrm(a);
    const nb = this.nrm(b);
    const nc = this.nrm(c);
    const ns: V3 = [na[0] + nb[0] + nc[0], na[1] + nb[1] + nc[1], na[2] + nb[2] + nc[2]];
    if (dot3(cr, ns) >= 0) this.indices.push(a, b, c);
    else this.indices.push(a, c, b);
  }

  quad(a: number, b: number, c: number, d: number): void {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }

  /** Flat quad p0..p3 (in loop order) facing along `n`. */
  flatQuad(p0: V3, p1: V3, p2: V3, p3: V3, n: V3, c: RGBA): void {
    const a = this.vert(p0, n, c);
    const b = this.vert(p1, n, c);
    const cc = this.vert(p2, n, c);
    const d = this.vert(p3, n, c);
    this.quad(a, b, cc, d);
  }

  /** Flat-shaded triangle; its normal is taken from the geometry, on the side of `hint`. */
  flatTri(p0: V3, p1: V3, p2: V3, hint: V3, c: RGBA): void {
    let n = cross3(
      [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]],
      [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]]
    );
    if (dot3(n, n) < 1e-14) return;
    if (dot3(n, hint) < 0) n = [-n[0], -n[1], -n[2]];
    const a = this.vert(p0, n, c);
    const b = this.vert(p1, n, c);
    const cc = this.vert(p2, n, c);
    this.tri(a, b, cc);
  }

  /** Axis-aligned box: 24 vertices, one flat normal per face. */
  box(cx: number, cy: number, cz: number, hx: number, hy: number, hz: number, c: RGBA, top?: RGBA): void {
    const x0 = cx - hx, x1 = cx + hx;
    const y0 = cy - hy, y1 = cy + hy;
    const z0 = cz - hz, z1 = cz + hz;
    this.flatQuad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], c);
    this.flatQuad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], c);
    this.flatQuad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], c);
    this.flatQuad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], c);
    this.flatQuad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], top ? top : c);
    this.flatQuad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0], c);
  }

  /**
   * Sweeps an outline through a profile of [size, y] points (a lathe when the
   * outline is a circle). Walk the profile with the solid on its left:
   * bottom centre -> outward -> up the outside -> inward over the top.
   * The surface normal of a profile step (d_size, d_y) is (d_y, -d_size).
   */
  sweep(outline: Outline, profile: [number, number][], colorAt: (seg: number) => RGBA, opts?: SweepOptions): void {
    const o = opts ? opts : {};
    const cosSmooth = Math.cos(((o.smoothDeg !== undefined ? o.smoothDeg : 35) * Math.PI) / 180);
    const n = outline.n;

    const segN: ([number, number] | null)[] = [];
    for (let i = 0; i < profile.length - 1; i++) {
      const dr = profile[i + 1][0] - profile[i][0];
      const dy = profile[i + 1][1] - profile[i][1];
      const l = Math.sqrt(dr * dr + dy * dy);
      segN.push(l < 1e-9 ? null : [dy / l, -dr / l]);
    }

    const blend = (a: [number, number], b: [number, number] | null | undefined): [number, number] => {
      if (!b) return a;
      if (a[0] * b[0] + a[1] * b[1] < cosSmooth) return a;
      const x = a[0] + b[0];
      const y = a[1] + b[1];
      const l = Math.sqrt(x * x + y * y);
      return [x / l, y / l];
    };

    const ring = (size: number, y: number, pn: [number, number], c: RGBA): number => {
      const first = this.count;
      for (let j = 0; j < n; j++) {
        const q = outline.at(j, size);
        this.vert([q[0], y, q[1]], [pn[0] * q[2], pn[1], pn[0] * q[3]], c);
      }
      return first;
    };

    for (let i = 0; i < segN.length; i++) {
      const sn = segN[i];
      if (!sn) continue;
      const c = colorAt(i);
      const a = ring(profile[i][0], profile[i][1], blend(sn, i > 0 ? segN[i - 1] : null), c);
      const b = ring(profile[i + 1][0], profile[i + 1][1], blend(sn, i + 1 < segN.length ? segN[i + 1] : null), c);
      for (let j = 0; j < n; j++) {
        const j1 = (j + 1) % n;
        this.quad(a + j, a + j1, b + j1, b + j);
      }
    }

    const cap = (size: number, y: number, ny: number, c: RGBA) => {
      const centre = this.vert([outline.cx, y, outline.cz], [0, ny, 0], c);
      const first = this.count;
      for (let j = 0; j < n; j++) {
        const q = outline.at(j, size);
        this.vert([q[0], y, q[1]], [0, ny, 0], c);
      }
      for (let j = 0; j < n; j++) this.tri(centre, first + j, first + ((j + 1) % n));
    };
    if (o.capStart) cap(profile[0][0], profile[0][1], -1, o.capStart);
    if (o.capEnd) cap(profile[profile.length - 1][0], profile[profile.length - 1][1], 1, o.capEnd);
  }

  /** Round tube along a path, with a radius per path point. */
  tube(path: V3[], radii: number[], segs: number, colorAt: (step: number) => RGBA, capStart?: RGBA, capEnd?: RGBA): void {
    const m = path.length;
    const tan: V3[] = [];
    for (let i = 0; i < m; i++) {
      const p = path[Math.max(i - 1, 0)];
      const q = path[Math.min(i + 1, m - 1)];
      tan.push(norm3([q[0] - p[0], q[1] - p[1], q[2] - p[2]]));
    }
    // Parallel-transported frame, so the tube does not twist.
    const seed: V3 = Math.abs(tan[0][2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    let nrm = norm3(cross3(tan[0], cross3(seed, tan[0])));
    const rings: number[] = [];
    for (let i = 0; i < m; i++) {
      const t = tan[i];
      const d = dot3(nrm, t);
      nrm = norm3([nrm[0] - t[0] * d, nrm[1] - t[1] * d, nrm[2] - t[2] * d]);
      const bin = cross3(t, nrm);
      rings.push(this.count);
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const c = Math.cos(a);
        const s = Math.sin(a);
        const dir: V3 = [nrm[0] * c + bin[0] * s, nrm[1] * c + bin[1] * s, nrm[2] * c + bin[2] * s];
        const r = radii[i];
        this.vert([path[i][0] + dir[0] * r, path[i][1] + dir[1] * r, path[i][2] + dir[2] * r], dir, colorAt(i));
      }
      if (i > 0) {
        const a0 = rings[i - 1];
        const b0 = rings[i];
        for (let j = 0; j < segs; j++) {
          const j1 = (j + 1) % segs;
          this.quad(a0 + j, a0 + j1, b0 + j1, b0 + j);
        }
      }
      if ((i === 0 && capStart) || (i === m - 1 && capEnd)) {
        const isStart = i === 0 && !!capStart;
        const both = m === 1 && capStart && capEnd;
        const ends: boolean[] = both ? [true, false] : [isStart];
        for (let e = 0; e < ends.length; e++) {
          const sgn = ends[e] ? -1 : 1;
          const cn: V3 = [t[0] * sgn, t[1] * sgn, t[2] * sgn];
          const col = (ends[e] ? capStart : capEnd) as RGBA;
          const centre = this.vert(path[i], cn, col);
          const first = this.count;
          for (let j = 0; j < segs; j++) {
            const o = (rings[i] + j) * STRIDE;
            this.vert([this.verts[o], this.verts[o + 1], this.verts[o + 2]], cn, col);
          }
          for (let j = 0; j < segs; j++) this.tri(centre, first + j, first + ((j + 1) % segs));
        }
      }
    }
  }

  bounds(): { min: V3; max: V3 } {
    const min: V3 = [Infinity, Infinity, Infinity];
    const max: V3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < this.count; i++) {
      for (let k = 0; k < 3; k++) {
        const v = this.verts[i * STRIDE + k];
        if (v < min[k]) min[k] = v;
        if (v > max[k]) max[k] = v;
      }
    }
    return { min: min, max: max };
  }
}

export function mix(a: RGBA, b: RGBA, t: number): RGBA {
  const k = Math.max(0, Math.min(1, t));
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k, a[3] + (b[3] - a[3]) * k];
}

export function scaleRGB(c: RGBA, k: number): RGBA {
  return [Math.min(c[0] * k, 1), Math.min(c[1] * k, 1), Math.min(c[2] * k, 1), c[3]];
}

// ---------------------------------------------------------------------------
// Lens Studio side: MeshBuilder + RenderMeshVisual
// ---------------------------------------------------------------------------

export interface MeshHandle {
  visual: RenderMeshVisual;
  builder: MeshBuilder;
  material: Material | null;
}

export interface AttachOptions {
  /** Alpha-blend the vertex colour alpha (the material is cloned first). */
  transparent?: boolean;
  /** Draw both sides (thin sheets only). */
  twoSided?: boolean;
  /** Higher numbers draw later; used to layer the see-through meshes. */
  renderOrder?: number;
}

function fill(builder: MeshBuilder, geo: Geo): void {
  if (geo.count > 0) {
    builder.appendVerticesInterleaved(geo.verts);
    builder.appendIndices(geo.indices);
  }
}

/** Creates a RenderMeshVisual on `obj` that shows `geo`. */
export function attachMesh(obj: SceneObject, geo: Geo, material: Material | null | undefined, opts?: AttachOptions): MeshHandle {
  const o = opts ? opts : {};
  const builder = new MeshBuilder([
    { name: "position", components: 3 },
    { name: "normal", components: 3, normalized: true },
    { name: "color", components: 4 },
  ]);
  builder.topology = MeshTopology.Triangles;
  builder.indexType = MeshIndexType.UInt16;
  fill(builder, geo);

  const visual = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual;
  visual.mesh = builder.getMesh();

  let mat: Material | null = material ? material : null;
  if (mat) {
    if (o.transparent || o.twoSided) {
      // Clone, so the shared vertex colour material stays opaque for the others.
      mat = mat.clone();
      if (o.transparent) {
        mat.mainPass.blendMode = BlendMode.Normal;
        mat.mainPass.depthWrite = false;
      }
      if (o.twoSided) mat.mainPass.twoSided = true;
    }
    visual.mainMaterial = mat;
  } else {
    print("[MeshKit] " + obj.name + ": no material assigned, the mesh will not render. Wire vertexBaseColorMaterial to the 'material' input.");
  }
  if (o.renderOrder !== undefined) visual.setRenderOrder(o.renderOrder);
  if (geo.count > 0) builder.updateMesh();
  return { visual: visual, builder: builder, material: mat };
}

/** Replaces the whole content of a mesh made by attachMesh. */
export function refillMesh(handle: MeshHandle, geo: Geo): void {
  const b = handle.builder;
  const ic = b.getIndicesCount();
  if (ic > 0) b.eraseIndices(0, ic);
  const vc = b.getVerticesCount();
  if (vc > 0) b.eraseVertices(0, vc);
  fill(b, geo);
  if (geo.count > 0) b.updateMesh();
}
