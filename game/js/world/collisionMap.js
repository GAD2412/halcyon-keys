// Spatial hash of solid boxes (buildings, containers, landmarks). Pushes circles out of walls and
// answers line-of-sight and bullet queries.

const CELL = 40;

export function createCollisionMap() {
  const cells = new Map();
  const boxes = [];
  const key = (cx, cz) => cx * 73856093 ^ cz * 19349663;

  function addBox(minX, minZ, maxX, maxZ, height = 30) {
    const b = { minX, minZ, maxX, maxZ, height };
    boxes.push(b);
    for (let cx = Math.floor(minX / CELL); cx <= Math.floor(maxX / CELL); cx++)
      for (let cz = Math.floor(minZ / CELL); cz <= Math.floor(maxZ / CELL); cz++) {
        const k = key(cx, cz);
        if (!cells.has(k)) cells.set(k, []);
        cells.get(k).push(b);
      }
    return b;
  }

  function near(x, z) { return cells.get(key(Math.floor(x / CELL), Math.floor(z / CELL))) || []; }

  // Moves pos {x,z} out of any box it overlaps (radius r). Returns the push normal or null.
  function resolveCircle(pos, r) {
    let hit = null;
    for (const b of near(pos.x, pos.z)) {
      const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
      let dx = pos.x - cx, dz = pos.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 < 1e-6) {
        // centre inside the box: push out along the shallowest side
        const pen = [pos.x - b.minX, b.maxX - pos.x, pos.z - b.minZ, b.maxZ - pos.z];
        const m = pen.indexOf(Math.min(...pen));
        dx = [-1, 1, 0, 0][m]; dz = [0, 0, -1, 1][m];
        const push = pen[m] + r;
        pos.x += dx * push; pos.z += dz * push;
        hit = { nx: dx, nz: dz };
        continue;
      }
      const d = Math.sqrt(d2);
      const push = r - d;
      pos.x += (dx / d) * push; pos.z += (dz / d) * push;
      hit = { nx: dx / d, nz: dz / d };
    }
    return hit;
  }

  function pointBlocked(x, z, y = 1) {
    for (const b of near(x, z)) if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ && y < b.height) return true;
    return false;
  }

  // Distance along a ray (2D, stepping) until a wall, or maxDist if clear.
  function rayDistance(x, z, dx, dz, maxDist, y = 1.2) {
    const len = Math.hypot(dx, dz) || 1;
    dx /= len; dz /= len;
    for (let t = 0; t < maxDist; t += 1.5) if (pointBlocked(x + dx * t, z + dz * t, y)) return t;
    return maxDist;
  }

  const lineOfSight = (ax, az, bx, bz) => rayDistance(ax, az, bx - ax, bz - az, Math.hypot(bx - ax, bz - az)) >= Math.hypot(bx - ax, bz - az) - 0.1;

  return { addBox, resolveCircle, pointBlocked, rayDistance, lineOfSight, boxes };
}
