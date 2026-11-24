// Eight stunt ramps on the beaches and in the parks. Drive up one fast enough and the car leaves the
// ground; land a long flight to clear that unique jump for cash and respect. Counted in completion,
// shown in Stats, kept in saves.
import * as THREE from 'three';
import { MeshBuilder, vcolor } from '../render/meshBuilder.js';
import { rightOf } from '../core/mathUtils.js';

export const JUMPS = [
  [-178, -70, Math.PI / 2, 'Fountain Leap'], [22, 230, Math.PI / 2, 'Arcade Hop'], [-432, 300, Math.PI, 'Pier Run'],
  [-443, 46, 0, 'Lifeguard Launch'], [-438, -180, Math.PI, 'Dune Flyer'], [-250, 440, Math.PI / 2, 'Bay Skipper'],
  [-50, 440, -Math.PI / 2, 'Sandbar Soar'], [-150, 440, Math.PI / 2, 'Breakwater Bounce'],
];
const LEN = 6, WID = 4.4, H = 1.7;

export function createStuntJumps(G) {
  const ramps = JUMPS.map(([x, z, h, name], i) => ({ i, x, z, name, f: { x: Math.sin(h), z: Math.cos(h) }, r: rightOf(h) }));
  // wedge ramps with yellow and black chevron bands up the slope
  const mb = new MeshBuilder();
  const uv = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const rp of ramps) {
    const P = (u, y, v) => [rp.x + rp.f.x * u + rp.r.x * v, y, rp.z + rp.f.z * u + rp.r.z * v];
    const nl = Math.hypot(H, LEN), up = [-rp.f.x * H / nl, LEN / nl, -rp.f.z * H / nl];
    for (let k = 0; k < 6; k++) {
      const u0 = -LEN / 2 + (k / 6) * LEN, u1 = u0 + LEN / 6, y0 = (k / 6) * H, y1 = ((k + 1) / 6) * H;
      mb.quad(P(u0, y0, -WID / 2), P(u0, y0, WID / 2), P(u1, y1, WID / 2), P(u1, y1, -WID / 2), up, vcolor(k % 2 ? '#1c1c1e' : '#ffc21a'), uv);
    }
    mb.quad(P(LEN / 2, 0, -WID / 2), P(LEN / 2, 0, WID / 2), P(LEN / 2, H, WID / 2), P(LEN / 2, H, -WID / 2), [rp.f.x, 0, rp.f.z], vcolor('#6a6e74'), uv);
    for (const s of [-1, 1]) mb.quad(P(-LEN / 2, 0, s * WID / 2), P(LEN / 2, 0, s * WID / 2), P(LEN / 2, H, s * WID / 2), P(-LEN / 2, 0, s * WID / 2), [rp.r.x * s, 0, rp.r.z * s], vcolor('#8a8e94'), uv);
  }
  const mesh = new THREE.Mesh(mb.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide }));
  mesh.receiveShadow = true; mesh.castShadow = true;
  G.scene.add(mesh);

  const done = new Set();
  let on = null, flight = null;
  const local = (v, rp) => { const dx = v.x - rp.x, dz = v.z - rp.z; return { a: dx * rp.f.x + dz * rp.f.z, b: dx * rp.r.x + dz * rp.r.z }; };

  return {
    total: ramps.length,
    count: () => done.size,
    update() {
      const v = G.player.vehicle;
      if (flight && flight.v !== v) flight = null;
      if (!v) { on = null; return; }
      if (!v.air) {
        // land: score the flight
        if (flight) {
          const d = Math.hypot(v.x - flight.x, v.z - flight.z);
          if (d > 14 && !done.has(flight.rp.i)) {
            done.add(flight.rp.i);
            G.progression.addCash(500, `Stunt jump ${done.size}/${ramps.length} · ${flight.rp.name} · ${Math.round(d)} m`);
            G.progression.addRespect(30);
            G.hud.big('Stunt jump', 'passed', `${flight.rp.name} · ${Math.round(d)} m`, 2.2);
            G.audio.missionPassed();
          } else if (d > 14) G.notify(`${flight.rp.name} · ${Math.round(d)} m`);
          flight = null;
        }
        // ride the slope, launch off the lip
        let now = null;
        for (const rp of ramps) {
          const { a, b } = local(v, rp);
          if (Math.abs(b) < WID / 2 + 0.3 && a > -LEN / 2 && a < LEN / 2) { now = rp; v.y = ((a + LEN / 2) / LEN) * H; v.pitch = -0.27; }
        }
        if (!now && on) {
          const along = v.vx * on.f.x + v.vz * on.f.z;
          if (local(v, on).a >= LEN / 2 - 0.5 && along > 9) { v.air = true; v.vy = along * 0.34; flight = { v, rp: on, x: v.x, z: v.z }; }
          else v.y = 0;
        }
        on = now;
      }
    },
    saveState: () => [...done],
    loadState(list) { done.clear(); for (const i of list || []) done.add(i); },
  };
}
