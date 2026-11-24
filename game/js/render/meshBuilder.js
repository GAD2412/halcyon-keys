// Accumulates boxes, prisms, cylinders and quads into one BufferGeometry with vertex colours and UVs,
// so a whole city chunk or a whole car is a single draw call.
import * as THREE from 'three';

const ROOF_UV = [0.01, 0.995];

export class MeshBuilder {
  constructor() { this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.idx = []; }

  get vertexCount() { return this.pos.length / 3; }

  // A quad from 4 corners (counter-clockwise seen from the front), one normal, uvs and a colour.
  quad(a, b, c, d, n, color, uvs) {
    const base = this.vertexCount;
    // Winding follows the given normal, so callers never have to think about vertex order.
    const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2];
    const vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
    const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
    if (gx * n[0] + gy * n[1] + gz * n[2] < 0) { [b, d] = [d, b]; uvs = [uvs[0], uvs[1], uvs[6], uvs[7], uvs[4], uvs[5], uvs[2], uvs[3]]; }
    for (const [i, p] of [a, b, c, d].entries()) {
      this.pos.push(p[0], p[1], p[2]);
      this.nrm.push(n[0], n[1], n[2]);
      this.uv.push(uvs[i * 2], uvs[i * 2 + 1]);
      this.col.push(color.r, color.g, color.b);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  // Axis-aligned box rotated by rotY around its centre. uv: 'facade' tiles windows by size, 'flat' is one texel.
  box(cx, cy, cz, sx, sy, sz, color, { uv = 'flat', tileW = 12, tileH = 3.6, uOff = 0, rotY = 0, topColor = null, bottom = false, top = true } = {}) {
    const hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
    const N = (x, y, z) => [x * c + z * s, y, -x * s + z * c];
    const fu = (w) => (uv === 'facade' ? [uOff, 0, uOff + w / tileW, 0, uOff + w / tileW, sy / tileH, uOff, sy / tileH] : flat());
    const flat = () => [ROOF_UV[0], ROOF_UV[1], ROOF_UV[0], ROOF_UV[1], ROOF_UV[0], ROOF_UV[1], ROOF_UV[0], ROOF_UV[1]];
    // +z, -z, +x, -x sides
    this.quad(P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz), N(0, 0, 1), color, fu(sx));
    this.quad(P(hx, -hy, -hz), P(-hx, -hy, -hz), P(-hx, hy, -hz), P(hx, hy, -hz), N(0, 0, -1), color, fu(sx));
    this.quad(P(hx, -hy, hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(hx, hy, hz), N(1, 0, 0), color, fu(sz));
    this.quad(P(-hx, -hy, -hz), P(-hx, -hy, hz), P(-hx, hy, hz), P(-hx, hy, -hz), N(-1, 0, 0), color, fu(sz));
    if (top) this.quad(P(-hx, hy, hz), P(hx, hy, hz), P(hx, hy, -hz), P(-hx, hy, -hz), N(0, 1, 0), topColor || color, flat());
    if (bottom) this.quad(P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, -hy, hz), P(-hx, -hy, hz), N(0, -1, 0), color, flat());
  }

  // A frustum-like block: bottom rectangle (bx,bz half sizes) to top rectangle with per-side insets. Car cabins, hoods, roofs.
  prism(cx, y0, cz, bw, bl, h, inset, color, rotY = 0) {
    const { front = 0, back = 0, side = 0 } = inset;
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const P = (x, y, z) => [cx + x * c + z * s, y, cz - x * s + z * c];
    const b = [[-bw, -bl], [bw, -bl], [bw, bl], [-bw, bl]];
    const t = [[-bw + side, -bl + back], [bw - side, -bl + back], [bw - side, bl - front], [-bw + side, bl - front]];
    const y1 = y0 + h;
    const f = this.flatUv;
    const face = (i, j) => {
      const A = P(b[i][0], y0, b[i][1]), B = P(b[j][0], y0, b[j][1]), C = P(t[j][0], y1, t[j][1]), D = P(t[i][0], y1, t[i][1]);
      const n = new THREE.Vector3().crossVectors(new THREE.Vector3(...B).sub(new THREE.Vector3(...A)), new THREE.Vector3(...D).sub(new THREE.Vector3(...A))).normalize();
      this.quad(A, B, C, D, [n.x, n.y, n.z], color, f);
    };
    face(1, 0); face(2, 1); face(3, 2); face(0, 3);
    this.quad(P(t[3][0], y1, t[3][1]), P(t[2][0], y1, t[2][1]), P(t[1][0], y1, t[1][1]), P(t[0][0], y1, t[0][1]), [0, 1, 0], color, f);
  }

  get flatUv() { return [ROOF_UV[0], ROOF_UV[1], ROOF_UV[0], ROOF_UV[1], ROOF_UV[0], ROOF_UV[1], ROOF_UV[0], ROOF_UV[1]]; }

  // Cylinder along x (wheels) or y (poles, trunks). segments kept low for the low-poly look.
  cylinder(cx, cy, cz, r, len, color, { axis = 'y', seg = 10, rotY = 0, rTop = r } = {}) {
    const c = Math.cos(rotY), s = Math.sin(rotY);
    const P = (x, y, z) => [cx + x * c + z * s, cy + y, cz - x * s + z * c];
    const pt = (a, along, rad) => (axis === 'y' ? [Math.cos(a) * rad, along, Math.sin(a) * rad] : [along, Math.cos(a) * rad, Math.sin(a) * rad]);
    const f = this.flatUv;
    for (let i = 0; i < seg; i++) {
      const a0 = (i / seg) * Math.PI * 2, a1 = ((i + 1) / seg) * Math.PI * 2, am = (a0 + a1) / 2;
      const n = axis === 'y' ? [Math.cos(am), 0, Math.sin(am)] : [0, Math.cos(am), Math.sin(am)];
      const nr = [n[0] * c + n[2] * s, n[1], -n[0] * s + n[2] * c];
      this.quad(P(...pt(a1, -len / 2, r)), P(...pt(a0, -len / 2, r)), P(...pt(a0, len / 2, rTop)), P(...pt(a1, len / 2, rTop)), nr, color, f);
      // caps as triangles folded into degenerate quads
      const capN = axis === 'y' ? [0, 1, 0] : [1, 0, 0];
      const capNr = [capN[0] * c + capN[2] * s, capN[1], -capN[0] * s + capN[2] * c];
      const ctr = axis === 'y' ? [0, len / 2, 0] : [len / 2, 0, 0];
      this.quad(P(...ctr), P(...ctr), P(...pt(a0, len / 2, rTop)), P(...pt(a1, len / 2, rTop)), capNr, color, f);
      const ctr2 = axis === 'y' ? [0, -len / 2, 0] : [-len / 2, 0, 0];
      this.quad(P(...ctr2), P(...ctr2), P(...pt(a1, -len / 2, r)), P(...pt(a0, -len / 2, r)), capNr.map((v) => -v), color, f);
    }
  }

  // Flat horizontal quad (ground patches, road strips) with world-tiled uvs.
  ground(x0, z0, x1, z1, y, color, uvRect = null) {
    const u = uvRect || this.flatUv;
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], color, u);
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// Linear colour from a hex value, ready for vertex colours.
export function vcolor(hex, mul = 1) {
  const c = new THREE.Color(hex);
  return { r: c.r * mul, g: c.g * mul, b: c.b * mul };
}
