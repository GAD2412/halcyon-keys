// Third-person cameras: an over-the-shoulder orbit on foot (tighter when aiming), a speed-sensitive
// chase camera in cars with free look that settles back, a title flyover and fixed shot framings.
import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../core/mathUtils.js';

export function createCameraRig(G) {
  const cam = G.camera;
  const rig = { yaw: 0, pitch: 0.22, dist: 4.6, freeLook: 0, freeLookT: 0, shake: 0, sensitivity: 1, override: null, fov: 62 };
  const target = new THREE.Vector3(), want = new THREE.Vector3();

  rig.update = (dt, input) => {
    if (rig.override) {
      cam.position.copy(rig.override.pos);
      cam.fov = rig.override.fov || 60; cam.updateProjectionMatrix();
      cam.lookAt(rig.override.look);
      return;
    }
    const p = G.player;
    const mdx = input.mouse.dx * 0.0024 * rig.sensitivity, mdy = input.mouse.dy * 0.002 * rig.sensitivity;
    let fov = 62;
    if (G.mode === 'title') {
      const t = performance.now() / 1000 * 0.04;
      cam.position.set(-505 + Math.cos(t) * 25, 46, 40 + Math.sin(t) * 160);
      cam.lookAt(-360, 14, Math.sin(t) * 160 - 60);
      fov = 58;
    } else if (p.vehicle) {
      const v = p.vehicle;
      if (Math.abs(mdx) > 0.0001) { rig.freeLook = clamp(rig.freeLook - mdx, -Math.PI, Math.PI); rig.freeLookT = 1.6; }
      rig.freeLookT -= dt;
      if (rig.freeLookT <= 0) rig.freeLook = damp(rig.freeLook, 0, 3, dt);
      const back = v.speed < -2 ? Math.PI : 0;
      rig.yaw = dampAngle(rig.yaw, v.heading + rig.freeLook + back * 0, 4.5, dt);
      const spd = Math.abs(v.speed);
      const dist = 7.2 + spd * 0.045 + (v.spec.style === 'van' ? 1.5 : 0);
      const height = 2.5 + spd * 0.01;
      target.set(v.x + Math.sin(v.heading) * 2, 1.3, v.z + Math.cos(v.heading) * 2);
      want.set(v.x - Math.sin(rig.yaw) * dist, height, v.z - Math.cos(rig.yaw) * dist);
      cam.position.lerp(want, 1 - Math.exp(-dt * 12));
      cam.position.y = Math.max(cam.position.y, 1.2);
      cam.lookAt(target);
      fov = 62 + Math.min(14, spd * 0.28);
    } else {
      rig.yaw -= mdx;
      rig.pitch = clamp(rig.pitch + mdy, -0.6, 1.1);
      const aiming = p.aiming;
      const dist = aiming ? 2.6 : 4.6;
      const shoulder = aiming ? 0.75 : 0.45;
      rig.dist = damp(rig.dist, dist, 10, dt);
      const rx = -Math.cos(rig.yaw), rz = Math.sin(rig.yaw);
      target.set(p.x + rx * shoulder, p.y + 1.62, p.z + rz * shoulder);
      const dx = Math.sin(rig.yaw) * Math.cos(rig.pitch), dy = -Math.sin(rig.pitch), dz = Math.cos(rig.yaw) * Math.cos(rig.pitch);
      const free = G.collision.rayDistance(target.x, target.z, -dx, -dz, rig.dist, target.y - dy * rig.dist);
      const d = Math.max(0.8, Math.min(rig.dist, free - 0.3));
      cam.position.set(target.x - dx * d, Math.max(0.5, target.y - dy * d), target.z - dz * d);
      cam.lookAt(target.x + dx * 10, target.y + dy * 10, target.z + dz * 10);
      fov = aiming ? 48 : 62;
    }
    if (rig.shake > 0) {
      rig.shake = Math.max(0, rig.shake - dt * 2);
      cam.position.x += (Math.random() - 0.5) * rig.shake; cam.position.y += (Math.random() - 0.5) * rig.shake;
    }
    rig.fov = damp(rig.fov, fov, 6, dt);
    if (Math.abs(cam.fov - rig.fov) > 0.05) { cam.fov = rig.fov; cam.updateProjectionMatrix(); }
  };

  // World-space ray through the screen centre (crosshair).
  rig.aimRay = () => {
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    return { origin: cam.position.clone(), dir };
  };
  return rig;
}
