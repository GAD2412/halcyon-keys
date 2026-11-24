// Arcade car physics: speed-dependent steering, lateral grip with handbrake drift, body roll and pitch,
// wall and car-to-car collisions, damage that leads to smoke, fire and an explosion.
import { buildVehicleMesh, vehicleMaterials } from './vehicleModels.js';
import { VEHICLES } from './vehicleCatalog.js';
import { clamp, wrapAngle, rightOf } from '../core/mathUtils.js';
import { rng } from '../core/random.js';

let nextId = 1;

export class Vehicle {
  constructor(G, type, x, z, heading, paint) {
    this.G = G;
    this.id = nextId++;
    this.type = type;
    this.spec = VEHICLES[type];
    this.paint = paint || rng.pick(this.spec.colors);
    const m = buildVehicleMesh(type, this.paint);
    this.mesh = m.group; this.body = m.body; this.bar = m.bar;
    G.scene.add(this.mesh);
    this.x = x; this.z = z; this.heading = heading;
    this.vx = 0; this.vz = 0; this.speed = 0; this.lateral = 0; this.yawRate = 0;
    this.controls = { throttle: 0, brake: 0, steer: 0, handbrake: false };
    this.steer = 0; this.roll = 0; this.pitch = 0;
    this.health = 100; this.wrecked = false; this.fireTime = 0;
    this.driver = null;      // 'player' | 'ai' | null
    this.role = 'traffic';   // 'traffic' | 'police' | 'parked' | 'mission'
    this.ai = null;
    this.siren = this.spec.police;
    this.sirenOn = false;
    this.lightPhase = rng.next() * 6;
    this.radius = this.spec.wid / 2;
    this.drifting = false;
    this.lastHitBy = null;
    this.sync();
  }

  get forward() { return { x: Math.sin(this.heading), z: Math.cos(this.heading) }; }
  get kmh() { return Math.abs(this.speed) * 3.6; }

  // Two circles (front/rear) approximate the body for collisions.
  circles() {
    const f = this.forward, o = this.spec.len / 2 - this.radius;
    return [{ x: this.x + f.x * o, z: this.z + f.z * o }, { x: this.x - f.x * o, z: this.z - f.z * o }];
  }

  update(dt) {
    const s = this.spec, c = this.controls;
    if (this.wrecked) { c.throttle = 0; c.steer = 0; c.brake = 1; }
    // steering: eases in, narrows with speed
    this.steer += (c.steer - this.steer) * Math.min(1, dt * 7);
    const absV = Math.abs(this.speed);
    // steering narrows with speed so the car stays planted on the boulevard but turns tight in town
    const steerAngle = this.steer * 0.62 / (1 + absV * 0.085);
    const wheelbase = s.len * 0.62;
    let yawRate = (this.speed / wheelbase) * Math.tan(steerAngle);
    if (c.handbrake && absV > 6) yawRate *= 1.45;
    this.yawRate = yawRate;
    this.heading = wrapAngle(this.heading - yawRate * dt);

    const f = this.forward, r = rightOf(this.heading);
    let vf = this.vx * f.x + this.vz * f.z;
    let vr = this.vx * r.x + this.vz * r.z;
    // engine and brakes
    const healthMul = this.health < 30 ? 0.6 : 1;
    if (c.throttle > 0) {
      const top = s.maxSpeed * healthMul;
      vf += s.accel * c.throttle * Math.max(0.1, 1 - Math.max(0, vf) / top) * dt * (vf < 0 ? 2.2 : 1);
    }
    if (c.brake > 0) {
      if (vf > 0.5) vf -= 26 * c.brake * dt;
      else vf -= s.accel * 0.55 * c.brake * dt * (vf > -12 ? 1 : 0);
    }
    if (c.handbrake) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 9 * dt);
    vf -= vf * (0.12 + (c.throttle === 0 && c.brake === 0 ? 0.25 : 0)) * dt;
    // lateral grip: low with handbrake, which lets the rear step out into a drift
    const grip = c.handbrake ? 1.4 : s.grip * (absV > 30 ? 0.85 : 1);
    vr *= Math.exp(-grip * dt);
    this.drifting = Math.abs(vr) > 3.2 && absV > 8;
    this.vx = f.x * vf + r.x * vr;
    this.vz = f.z * vf + r.z * vr;
    this.speed = vf; this.lateral = vr;
    this.x += this.vx * dt; this.z += this.vz * dt;

    this.collideWorld();
    // visual body roll and pitch
    this.roll += (clamp(-vr * 0.012 - this.steer * absV * 0.0016, -0.09, 0.09) - this.roll) * Math.min(1, dt * 6);
    const accelPitch = -(c.throttle - c.brake) * 0.025;
    this.pitch += (accelPitch - this.pitch) * Math.min(1, dt * 4);

    // damage effects
    const fx = this.G.effects;
    if (fx) {
      if (this.drifting && rng.chance(0.6)) {
        const back = this.circles()[1];
        fx.smoke(back.x + r.x * 0.8, 0.3, back.z + r.z * 0.8, 0.9, 0.85);
        fx.smoke(back.x - r.x * 0.8, 0.3, back.z - r.z * 0.8, 0.9, 0.85);
        this.G.skids?.add(back.x + r.x * 0.8, back.z + r.z * 0.8, back.x - r.x * 0.8, back.z - r.z * 0.8);
      }
      if (this.health < 35 && !this.wrecked && rng.chance(0.25)) fx.smoke(this.x + f.x * 1.6, 1.1, this.z + f.z * 1.6, 1.4, this.health < 15 ? 0.25 : 0.55);
      if (this.wrecked && this.fireTime > 0) {
        this.fireTime -= dt;
        if (rng.chance(0.7)) fx.fire(this.x + rng.range(-1, 1), 1.0, this.z + rng.range(-1, 1));
        if (rng.chance(0.3)) fx.smoke(this.x, 2, this.z, 2.2, 0.15);
      }
    }
    if (!this.wrecked && this.health <= 0) this.explode();
    this.sync(dt);
  }

  collideWorld() {
    const col = this.G.collision;
    const circles = this.circles();
    for (const cc of circles) {
      const before = { x: cc.x, z: cc.z };
      const hit = col.resolveCircle(cc, this.radius);
      if (!hit) continue;
      this.x += cc.x - before.x; this.z += cc.z - before.z;
      const vn = this.vx * hit.nx + this.vz * hit.nz;
      if (vn < 0) {
        this.vx -= hit.nx * vn * 1.35; this.vz -= hit.nz * vn * 1.35;
        this.vx *= 0.8; this.vz *= 0.8;
        if (-vn > 6) this.impact(-vn, (this.x + cc.x) / 2, (this.z + cc.z) / 2);
      }
    }
    const lim = 515;
    this.x = clamp(this.x, -lim, lim); this.z = clamp(this.z, -lim, lim);
  }

  impact(strength, x, z) {
    if (strength > 7) this.health -= (strength - 5) * (this.spec.police ? 0.45 : this.driver === 'player' ? 0.8 : 1.1);
    this.G.effects?.sparks(x, 0.8, z, Math.min(20, strength * 1.5));
    this.G.audio?.crash(strength, x, z);
  }

  explode() {
    this.wrecked = true;
    this.health = 0;
    this.fireTime = 14;
    this.body.material = vehicleMaterials().lights.burnt;
    this.sirenOn = false;
    this.G.effects?.explosion(this.x, this.z);
    this.G.combat?.explosion(this.x, this.z, 7, this);
  }

  sync(dt = 0) {
    this.mesh.position.set(this.x, 0.0, this.z);
    this.mesh.rotation.set(this.pitch, this.heading, this.roll, 'YXZ');
    if (this.bar) {
      this.lightPhase += dt * 9;
      const on = this.sirenOn;
      const a = Math.sin(this.lightPhase) > 0;
      const { lights } = vehicleMaterials();
      this.bar.red.material = on && a ? lights.red : lights.off;
      this.bar.blue.material = on && !a ? lights.blue : lights.off;
    }
  }

  // Glows for headlights, tail lights and the siren bar, written into the shared light cloud.
  drawGlows(glows, night) {
    const f = this.forward, r = rightOf(this.heading);
    const L = this.spec.len / 2, W = this.spec.wid / 2 - 0.3;
    if (this.wrecked) return;
    if (night) {
      for (const sx of [-1, 1]) {
        glows.add(this.x + f.x * (L + 0.2) + r.x * W * sx, 0.75, this.z + f.z * (L + 0.2) + r.z * W * sx, 1, 0.93, 0.75, 5.5);
        glows.add(this.x - f.x * (L + 0.1) + r.x * W * sx, 0.75, this.z - f.z * (L + 0.1) + r.z * W * sx, 0.9, 0.05, 0.05, 3);      }
    } else if (this.controls.brake > 0.2 && this.speed > 1) {
      for (const sx of [-1, 1]) glows.add(this.x - f.x * (L + 0.1) + r.x * W * sx, 0.75, this.z - f.z * (L + 0.1) + r.z * W * sx, 1, 0.08, 0.08, 3.5);
    }
    if (this.bar && this.sirenOn) {
      const a = Math.sin(this.lightPhase) > 0;
      const y = this.bar.y;
      const sideR = { x: this.x + r.x * 0.3 - f.x * 0.1, z: this.z + r.z * 0.3 - f.z * 0.1 };
      const sideL = { x: this.x - r.x * 0.3 - f.x * 0.1, z: this.z - r.z * 0.3 - f.z * 0.1 };
      if (a) glows.add(sideL.x, y, sideL.z, 1.8, 0.12, 0.15, 17); else glows.add(sideR.x, y, sideR.z, 0.15, 0.4, 2.0, 17);
      glows.add(sideL.x, y, sideL.z, 1.0, 0.05, 0.1, a ? 7 : 4); glows.add(sideR.x, y, sideR.z, 0.1, 0.25, 1.1, a ? 4 : 7);
      glows.add(this.x, y + 0.1, this.z, a ? 0.8 : 0.1, 0.05, a ? 0.1 : 0.9, 8);
    }
  }

  remove() { this.G.scene.remove(this.mesh); this.removed = true; }
}

// Pushes overlapping cars apart and trades momentum; heavy hits damage both.
export function resolveVehicleCollisions(G, vehicles) {
  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      const dx0 = b.x - a.x, dz0 = b.z - a.z;
      if (dx0 * dx0 + dz0 * dz0 > 49) continue;
      for (const ca of a.circles()) for (const cb of b.circles()) {
        const dx = cb.x - ca.x, dz = cb.z - ca.z;
        const rr = a.radius + b.radius;
        const d2 = dx * dx + dz * dz;
        if (d2 >= rr * rr || d2 < 1e-6) continue;
        const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, pen = rr - d;
        const ma = a.spec.mass, mb = b.spec.mass, tot = ma + mb;
        a.x -= nx * pen * (mb / tot); a.z -= nz * pen * (mb / tot);
        b.x += nx * pen * (ma / tot); b.z += nz * pen * (ma / tot);
        const rel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz;
        if (rel < 0) {
          const imp = -rel * 1.3 / tot;
          a.vx -= nx * imp * mb; a.vz -= nz * imp * mb;
          b.vx += nx * imp * ma; b.vz += nz * imp * ma;
          if (-rel > 5) {
            a.impact(-rel * 0.6, (ca.x + cb.x) / 2, (ca.z + cb.z) / 2);
            b.impact(-rel * 0.6, (ca.x + cb.x) / 2, (ca.z + cb.z) / 2);
            a.lastHitBy = b; b.lastHitBy = a;
            G.events?.emit('vehicleHit', a, b, -rel);
          }
        }
      }
    }
  }
}
