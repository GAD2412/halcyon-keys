// WebGL renderer, scene, camera and the sun/sky lights. ACES tone mapping, soft shadows that follow the player.
import * as THREE from 'three';

export function createRenderer(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.4, 3000);
  camera.position.set(0, 60, 120);

  const hemi = new THREE.HemisphereLight(0xffd7b0, 0x6b5a4a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc78a, 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -110; sc.right = 110; sc.top = 110; sc.bottom = -110; sc.near = 10; sc.far = 700;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize);

  // Keep the shadow frustum centred on the action; snap to texels to stop shimmering.
  const sunDir = new THREE.Vector3(-0.8, 0.35, 0.3).normalize();
  function followShadow(x, z) {
    const snap = 220 / 2048;
    const cx = Math.round(x / snap) * snap, cz = Math.round(z / snap) * snap;
    sun.target.position.set(cx, 0, cz);
    sun.position.set(cx + sunDir.x * 400, sunDir.y * 400, cz + sunDir.z * 400);
  }

  return { renderer, scene, camera, hemi, sun, sunDir, followShadow, resize };
}
