// Wanted level: crimes add heat, heat sets 0-5 stars. While PHPD can see the player the stars stay solid
// and the last-known position follows; out of sight the stars flash and a search area shows on the
// minimap. Staying out of sight and outside the area long enough clears the stars.

const HEAT = { gunfire: 0.6, assault: 1.2, carjack: 1.0, stealPolice: 3.5, runover: 1.8, killPed: 2.6, killGang: 1.2, shootCop: 3, killCop: 5, ramCop: 1.2, mission: 0 };
const THRESHOLDS = [0.5, 3, 7, 12, 19];

export function createWantedLevel(G) {
  const w = {
    heat: 0, stars: 0, seen: false, unseen: 0, lastX: 0, lastZ: 0, lastGunfire: -9, cooldownNeeded: 0, locked: false,
    searchRadius: () => 50 + w.stars * 35,
  };

  function setStars(n) {
    n = Math.max(0, Math.min(5, n));
    if (n > w.stars) { G.audio?.starUp(); G.notify?.(n >= 3 ? `${'★'.repeat(n)}  MANTA-1 is airborne` : `${'★'.repeat(n)}  PHPD responding`); }
    w.stars = n;
    if (n === 0) w.heat = 0;
  }

  w.addCrime = (type, x, z) => {
    if (type === 'gunfire') {
      if (G.time - w.lastGunfire < 4) return;
      w.lastGunfire = G.time;
      // shooting is only a crime if someone is around to hear it
      if (!G.humans.some((h) => h.kind === 'ped' && h.alive && Math.hypot(h.x - x, h.z - z) < 40) && !G.police.anyNear(x, z, 80)) return;
    }
    if (type === 'carjack' && !G.police.anyNear(x, z, 60) && !G.humans.some((h) => h.kind === 'ped' && h.alive && Math.hypot(h.x - x, h.z - z) < 20)) return;
    w.heat += HEAT[type] ?? 1;
    let s = 0;
    while (s < 5 && w.heat >= THRESHOLDS[s]) s++;
    if (s > w.stars) setStars(s);
    w.lastX = G.player.x; w.lastZ = G.player.z;
    w.unseen = 0;
  };

  w.force = (stars) => {
    w.heat = Math.max(w.heat, THRESHOLDS[Math.max(0, stars - 1)]);
    setStars(stars);
    w.lastX = G.player.x; w.lastZ = G.player.z;
  };
  w.clear = () => { setStars(0); w.unseen = 0; };

  w.update = (dt) => {
    if (w.stars === 0) { w.seen = false; return; }
    const p = G.player;
    w.seen = G.police.canSee(p.x, p.z);
    if (w.seen) { w.unseen = 0; w.lastX = p.x; w.lastZ = p.z; }
    else w.unseen += dt;
    const outside = Math.hypot(p.x - w.lastX, p.z - w.lastZ) > w.searchRadius();
    w.cooldownNeeded = 6 + w.stars * 3.5;
    if (!w.locked && w.unseen > w.cooldownNeeded && (outside || w.unseen > w.cooldownNeeded * 2)) {
      setStars(0);
      G.notify?.('You lost the PHPD');
      G.events.emit('wantedCleared');
    }
  };
  return w;
}
