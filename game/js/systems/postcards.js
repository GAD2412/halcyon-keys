// Twenty lost postcards hidden on sidewalks, beaches and landmarks across Port Halcyon. Each spins and
// glows where it lies; walk or drive through it to collect it for cash and respect. They count toward
// completion, show in Stats and are kept in saves.
import * as THREE from 'three';

export const POSTCARDS = [
  [-420, 330, 'Halo Pier'], [-432, 120, 'Flamingo Mile beach'], [-418, -240, 'the lifeguard tower'], [-359, 9, 'the deco hotels'],
  [-250, 50, 'the Lantern Night Market'], [-209, 132, 'Suds & Sons'], [-150, -91, 'a Lantern backstreet'], [-109, 309, 'Lantern Quarter north'],
  [9, -50, 'Glasswater plaza'], [150, -109, 'Halcyon Tower'], [91, 150, 'the Glasswater arcade'], [-91, 50, 'Glasswater west'],
  [-50, -209, 'Mango Hill gates'], [-209, -350, 'the Mango Hill villas'], [150, -309, 'the hillside lookout'], [291, -50, 'Rustline Yards'],
  [209, 150, 'the rail sidings'], [350, -191, 'the chimney stacks'], [250, 391, 'Ninefold Ferry Slip'], [109, 250, 'the container cranes'],
];

// The card face: a sunset over the keys with a palm, painted in code.
function cardTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 88;
  const g = c.getContext('2d');
  g.fillStyle = '#fbf6ec'; g.fillRect(0, 0, 128, 88);
  const sky = g.createLinearGradient(0, 6, 0, 60);
  sky.addColorStop(0, '#5a3a9a'); sky.addColorStop(0.55, '#ff6f8a'); sky.addColorStop(1, '#ffc46a');
  g.fillStyle = sky; g.fillRect(6, 6, 116, 54);
  g.fillStyle = '#ffe08a'; g.beginPath(); g.arc(64, 50, 13, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2a7fa8'; g.fillRect(6, 52, 116, 24);
  g.fillStyle = '#7fd0e0'; for (let y = 56; y < 76; y += 5) g.fillRect(30 + (y % 10) * 2, y, 50, 1.5);
  g.strokeStyle = '#1c1430'; g.lineWidth = 3; g.beginPath(); g.moveTo(100, 76); g.quadraticCurveTo(96, 44, 104, 22); g.stroke();
  g.fillStyle = '#1c1430';
  for (const a of [-2.6, -2.0, -1.2, -0.5, 0.2]) { g.save(); g.translate(104, 22); g.rotate(a); g.fillRect(0, -2, 20, 4); g.restore(); }
  g.fillStyle = '#1c1430'; g.font = 'bold 9px system-ui, sans-serif'; g.fillText('PORT HALCYON', 10, 84);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createPostcards(G) {
  const found = new Set();
  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 0.76), new THREE.MeshBasicMaterial({ map: cardTexture(), side: THREE.DoubleSide }), POSTCARDS.length);
  mesh.frustumCulled = false;
  G.scene.add(mesh);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s = new THREE.Vector3(1, 1, 1);

  function place() {
    let n = 0;
    POSTCARDS.forEach(([x, z], i) => {
      if (found.has(i)) return;
      q.setFromAxisAngle(up, G.time * 1.6 + i);
      v.set(x, 1.35 + Math.sin(G.time * 2 + i) * 0.15, z);
      m.compose(v, q, s);
      mesh.setMatrixAt(n++, m);
    });
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  }

  return {
    total: POSTCARDS.length,
    count: () => found.size,
    update() {
      if (G.mode === 'play') {
        const p = G.player.vehicle || G.player, reach = G.player.vehicle ? 4.5 : 2.6;
        POSTCARDS.forEach(([x, z, name], i) => {
          if (found.has(i) || Math.hypot(p.x - x, p.z - z) > reach) return;
          found.add(i);
          G.progression.addCash(150, `Lost postcard ${found.size}/${POSTCARDS.length} · ${name}`);
          G.progression.addRespect(10);
          G.audio.ui();
        });
      }
      place();
    },
    drawGlows(glows) {
      const c = G.camera.position;
      POSTCARDS.forEach(([x, z], i) => { if (!found.has(i) && Math.abs(x - c.x) < 150 && Math.abs(z - c.z) < 150) glows.add(x, 1.35, z, 1.2, 0.55, 0.75, 9); });
    },
    saveState: () => [...found],
    loadState(list) { found.clear(); for (const i of list || []) found.add(i); },
  };
}
