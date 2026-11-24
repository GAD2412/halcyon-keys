// Rustline Kings and Gilded Tide crews: they hold a spot, close in on the player, take cover range
// and trade fire with anyone shooting at them.
import { createHuman } from '../entities/characterModel.js';
import { groundHeight } from '../world/cityPlan.js';
import { headingTo, dampAngle } from '../core/mathUtils.js';
import { rng } from '../core/random.js';

export function spawnGangMember(G, x, z, weapon = 'pistol') {
  const g = createHuman('gang', x, z, rng.range(-3, 3));
  g.weapon = weapon; g.shootT = rng.range(1, 2.5); g.homeX = x; g.homeZ = z; g.alert = false;
  G.humans.push(g);
  return g;
}

export function updateGangMember(G, g, dt) {
  if (!g.alive) { g.deadT = (g.deadT ?? 20) - dt; return; }
  const p = G.player;
  const d = Math.hypot(p.x - g.x, p.z - g.z);
  if (d < 45) g.alert = true;
  let speed = 0, face = headingTo(g.x, g.z, p.x, p.z);
  if (g.alert && p.alive) {
    if (d > 16) speed = 4.8;
    else if (d < 7) { speed = 2.5; face += Math.PI; }
    g.shootT -= dt;
    if (d < 38 && g.shootT <= 0 && G.collision.lineOfSight(g.x, g.z, p.x, p.z)) {
      g.shootT = g.weapon === 'smg' ? rng.range(0.25, 0.5) : rng.range(0.9, 1.6);
      g.heading = headingTo(g.x, g.z, p.x, p.z);
      G.combat.npcShoot(g, p, 0.2);
    }
  }
  const moveDir = face;
  g.heading = dampAngle(g.heading, speed > 0 && d > 16 ? moveDir : headingTo(g.x, g.z, p.x, p.z), 8, dt);
  g.x += Math.sin(moveDir) * speed * dt; g.z += Math.cos(moveDir) * speed * dt;
  G.collision.resolveCircle(g, g.radius);
  g.y = groundHeight(g.x, g.z);
  g.pose = speed > 4 ? 'run' : speed > 0 ? 'walk' : g.alert ? 'aim' : 'idle';
  g.phase += speed * dt * 2.3;
}
