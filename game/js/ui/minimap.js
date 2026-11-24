// Rotating radar minimap: the map turns with the camera, zooms out with speed, and shows the GPS route,
// mission target, police and helicopter blips, the wanted search area and the player arrow.
import { MAP_MIN } from './cityMapPainter.js';
import { routeWaypoint } from '../ai/policeAI.js';

export function gpsRoute(fromX, fromZ, toX, toZ) {
  const pts = [[fromX, fromZ]];
  let x = fromX, z = fromZ;
  for (let i = 0; i < 14; i++) {
    const w = routeWaypoint(x, z, toX, toZ);
    pts.push([w.x, w.z]);
    if (w.x === toX && w.z === toZ) break;
    x = w.x; z = w.z;
  }
  return pts;
}

export function createMinimap(canvas, G) {
  const ctx = canvas.getContext('2d');
  const S = canvas.width, R = S / 2;
  let zoom = 1;
  return {
    draw(dt) {
      const p = G.player, v = p.vehicle;
      const px = v ? v.x : p.x, pz = v ? v.z : p.z;
      const speed = v ? Math.abs(v.speed) : 0;
      zoom += ((S / 2) / (110 + speed * 2.2) - zoom) * Math.min(1, dt * 2);
      const yaw = G.cameraRig.yaw;
      ctx.save();
      ctx.clearRect(0, 0, S, S);
      ctx.beginPath(); ctx.arc(R, R, R, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = '#1f5f86'; ctx.fillRect(0, 0, S, S);
      ctx.translate(R, R);
      ctx.rotate(yaw - Math.PI);
      ctx.scale(zoom, zoom);
      ctx.translate(-px, -pz);
      ctx.drawImage(G.mapCanvas, MAP_MIN, MAP_MIN, G.mapCanvas.width / G.mapScale, G.mapCanvas.height / G.mapScale);
      // wanted search area
      const w = G.wanted;
      if (w.stars > 0 && !w.seen) {
        ctx.fillStyle = 'rgba(80,140,255,0.22)'; ctx.strokeStyle = 'rgba(140,190,255,0.8)'; ctx.lineWidth = 2 / zoom;
        ctx.beginPath(); ctx.arc(w.lastX, w.lastZ, w.searchRadius(), 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      }
      // GPS route
      const tgt = G.missions.target();
      if (tgt) {
        const route = gpsRoute(px, pz, tgt.x, tgt.z);
        ctx.strokeStyle = '#c86bff'; ctx.lineWidth = 7 / zoom; ctx.lineJoin = 'round';
        ctx.beginPath(); route.forEach(([x, z], i) => (i ? ctx.lineTo(x, z) : ctx.moveTo(x, z))); ctx.stroke();
      }
      ctx.restore();
      // blips in screen space so they stay round and readable
      const toScreen = (x, z) => {
        const dx = (x - px) * zoom, dz = (z - pz) * zoom, a = yaw - Math.PI;
        return [R + dx * Math.cos(a) - dz * Math.sin(a), R + dx * Math.sin(a) + dz * Math.cos(a)];
      };
      const blip = (x, z, color, r, edge = false, ring = false) => {
        let [sx, sy] = toScreen(x, z);
        const dx = sx - R, dy = sy - R, d = Math.hypot(dx, dy), lim = R - r - 4;
        if (d > lim) { if (!edge) return; sx = R + (dx / d) * lim; sy = R + (dy / d) * lim; }
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = ring ? '#000' : 'rgba(0,0,0,0.7)'; ctx.lineWidth = 2.5; ctx.stroke();
      };
      for (const m of G.missions.startMarkers()) blip(m.x, m.z, '#ff6f61', 13, true, true);
      for (const g of G.humans) if (g.kind === 'gang' && g.alive) blip(g.x, g.z, '#ff3a3a', 7);
      const flash = Math.sin(G.time * 10) > 0;
      for (const u of G.police.units) if (!u.wrecked) blip(u.x, u.z, flash ? '#ff3a4a' : '#3a7aff', 10, w.stars > 0);
      for (const o of G.police.officers) if (o.alive) blip(o.x, o.z, flash ? '#3a7aff' : '#ff3a4a', 6);
      const heli = G.police.heli;
      if (heli && !heli.removed) blip(heli.x, heli.z, '#7ec4ff', 12, true);
      if (tgt) blip(tgt.x, tgt.z, '#ffd23a', 13, true, true);
      // player arrow
      const a = (v ? v.heading : p.heading) - yaw;
      ctx.save(); ctx.translate(R, R); ctx.rotate(-a);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(12, 13); ctx.lineTo(0, 6); ctx.lineTo(-12, 13); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      // north marker
      const [nx, ny] = toScreen(px, pz - 1000);
      const nd = Math.hypot(nx - R, ny - R);
      const ex = R + ((nx - R) / nd) * (R - 20), ey = R + ((ny - R) / nd) * (R - 20);
      ctx.fillStyle = 'rgba(10,14,28,0.8)'; ctx.beginPath(); ctx.arc(ex, ey, 15, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('N', ex, ey + 1);
    },
  };
}
