// Tall translucent light beam with a ground ring: marks objectives, mission starts and race starts.
import * as THREE from 'three';

export function makeMarkerBeam(color, height = 70) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.4, 1.4, height, 18, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
  );
  beam.position.y = height / 2;
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.3;
  g.add(beam, ring);
  g.visible = false;
  g.pulse = (t) => { beam.material.opacity = 0.25 + Math.sin(t * 3) * 0.08; };
  return g;
}
