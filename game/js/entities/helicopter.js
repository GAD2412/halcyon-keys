// MANTA-1, the PHPD air unit: a low-poly helicopter that circles the suspect with a searchlight cone
// and a bright spot on the ground. It spots the player from above, ignoring buildings.
import * as THREE from 'three';
import { MeshBuilder, vcolor } from '../render/meshBuilder.js';
import { headingTo, dampAngle } from '../core/mathUtils.js';

function helicopterGeometry() {
  const mb = new MeshBuilder();
  const navy = vcolor('#1b2a48'), white = vcolor('#f4f4f0'), glass = vcolor('#1a2a3a'), teal = vcolor('#2bd0c4');
  mb.prism(0, 0.2, 0.3, 1.0, 1.8, 1.5, { front: 0.9, back: 0.2, side: 0.2 }, navy);
  mb.prism(0, 0.9, 1.1, 0.85, 0.9, 0.7, { front: 0.7, back: 0, side: 0.15 }, glass);
  mb.box(0, 0.9, -1.0, 1.6, 1.4, 1.6, white);
  mb.box(0, 0.6, 0.3, 2.06, 0.12, 3.4, teal);
  mb.box(0, 1.1, -3.6, 0.35, 0.4, 4.2, navy);
  mb.box(0, 1.7, -5.4, 0.12, 1.3, 0.9, white);
  mb.box(0.4, 1.2, -5.4, 0.9, 0.12, 0.5, navy);
  for (const sx of [-0.8, 0.8]) {
    mb.box(sx, -0.25, 0.2, 0.1, 0.1, 3.4, vcolor('#2a2d30'));
    mb.box(sx, 0.0, -0.6, 0.08, 0.5, 0.08, vcolor('#2a2d30'));
    mb.box(sx, 0.0, 1.0, 0.08, 0.5, 0.08, vcolor('#2a2d30'));
  }
  mb.cylinder(0, 1.85, -0.4, 0.18, 0.4, vcolor('#2a2d30'), { seg: 6 });
  return mb.build();
}

export function createHelicopter(G, x, z) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0.4, roughness: 0.4 });
  const group = new THREE.Group();
  const body = new THREE.Mesh(helicopterGeometry(), mat);
  body.castShadow = true;
  group.add(body);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.06, 0.35), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  rotor.position.set(0, 2.1, -0.4);
  const rotor2 = rotor.clone(); rotor2.rotation.y = Math.PI / 2; rotor.add(rotor2); rotor2.position.set(0, 0, 0);
  group.add(rotor);
  group.scale.setScalar(1.35);
  G.scene.add(group);

  const coneGeo = new THREE.CylinderGeometry(0.25, 6, 1, 24, 1, true);
  coneGeo.translate(0, -0.5, 0);
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({ color: 0xfff0c8, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  const spot = new THREE.Mesh(new THREE.CircleGeometry(4.6, 28), new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  spot.rotation.x = -Math.PI / 2;
  G.scene.add(cone, spot);

  const h = { x, z, y: 60, heading: 0, vx: 0, vz: 0, leaving: false, removed: false, orbit: Math.random() * 6, callsign: 'MANTA-1', group, aimX: x, aimZ: z };
  const down = new THREE.Vector3(0, -1, 0), dir = new THREE.Vector3(), q = new THREE.Quaternion();

  h.update = (dt) => {
    const p = G.player;
    h.orbit += dt * 0.25;
    let tx = p.x + Math.cos(h.orbit) * 28, tz = p.z + Math.sin(h.orbit) * 28, ty = 40;
    if (h.leaving) { tx = h.x + (h.x > 0 ? 400 : -400); tz = h.z - 400; ty = 90; }
    const dx = tx - h.x, dz = tz - h.z, dist = Math.hypot(dx, dz);
    const maxV = 30;
    const sp = Math.min(maxV, dist * 0.8);
    const wantVx = dist > 0.1 ? (dx / dist) * sp : 0, wantVz = dist > 0.1 ? (dz / dist) * sp : 0;
    h.vx += (wantVx - h.vx) * Math.min(1, dt * 1.5); h.vz += (wantVz - h.vz) * Math.min(1, dt * 1.5);
    h.x += h.vx * dt; h.z += h.vz * dt; h.y += (ty - h.y) * Math.min(1, dt * 0.8);
    h.heading = dampAngle(h.heading, headingTo(h.x, h.z, p.x, p.z), 2, dt);
    group.position.set(h.x, h.y, h.z);
    const fwdV = h.vx * Math.sin(h.heading) + h.vz * Math.cos(h.heading);
    const sideV = h.vx * -Math.cos(h.heading) + h.vz * Math.sin(h.heading);
    group.rotation.set(fwdV * 0.012, h.heading, -sideV * 0.012, 'YXZ');
    rotor.rotation.y += dt * 28;
    // searchlight wanders slightly around the suspect
    h.aimX += (p.x + Math.sin(G.time * 1.3) * 2.5 - h.aimX) * Math.min(1, dt * 2.5);
    h.aimZ += (p.z + Math.cos(G.time * 1.1) * 2.5 - h.aimZ) * Math.min(1, dt * 2.5);
    const showLight = !h.leaving;
    cone.visible = spot.visible = showLight;
    cone.position.set(h.x, h.y - 0.5, h.z);
    dir.set(h.aimX - h.x, 0.2 - (h.y - 0.5), h.aimZ - h.z);
    const len = dir.length();
    q.setFromUnitVectors(down, dir.normalize());
    cone.quaternion.copy(q);
    cone.scale.set(1, len, 1);
    spot.position.set(h.aimX, 0.25, h.aimZ);
    const night = G.dayNight.state.glow;
    cone.material.opacity = 0.1 + night * 0.1;
    spot.material.opacity = night * 0.5;
    spot.visible = showLight && night > 0.2;
    if (h.leaving && Math.hypot(h.x - p.x, h.z - p.z) > 380) h.remove();
  };
  h.sees = (x, z) => !h.leaving && Math.hypot(h.x - x, h.z - z) < 160;
  h.drawGlows = (glows) => {
    const blink = Math.sin(G.time * 8) > 0.6;
    glows.add(h.x, h.y - 0.3, h.z, 1.2, 1.1, 0.9, 6);
    if (blink) glows.add(h.x, h.y + 1.8, h.z - 7, 1.6, 0.1, 0.1, 6);
    glows.add(h.x + Math.cos(h.heading) * 1.4, h.y + 0.6, h.z - Math.sin(h.heading) * 1.4, 0.1, 1.2, 0.2, 4);
  };
  h.remove = () => { G.scene.remove(group, cone, spot); h.removed = true; };
  return h;
}
