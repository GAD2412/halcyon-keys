// Gradient sky dome with a sun disc and haze, plus a matching environment map for car paint and glass reflections.
import * as THREE from 'three';

const vert = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * p;
  gl_Position.z = gl_Position.w;
}`;

const frag = `
uniform vec3 topColor; uniform vec3 horizonColor; uniform vec3 groundColor;
uniform vec3 sunDir; uniform vec3 sunColor; uniform float sunSize; uniform float stars;
varying vec3 vDir;
float hash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(horizonColor, topColor, pow(clamp(h, 0.0, 1.0), 0.55));
  col = mix(col, groundColor, smoothstep(0.0, -0.12, h));
  float sd = max(dot(d, normalize(sunDir)), 0.0);
  col += sunColor * pow(sd, 6.0) * 0.45;
  col += sunColor * pow(sd, 60.0) * 0.9;
  col += sunColor * smoothstep(1.0 - sunSize, 1.0 - sunSize * 0.6, sd) * 3.0;
  if (stars > 0.0 && h > 0.05) {
    vec3 q = floor(d * 380.0);
    float s = step(0.9975, hash(q));
    col += vec3(s) * stars * smoothstep(0.05, 0.4, h);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function createSky(scene, renderer) {
  const uniforms = {
    topColor: { value: new THREE.Color() }, horizonColor: { value: new THREE.Color() }, groundColor: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(-0.8, 0.2, 0.3) }, sunColor: { value: new THREE.Color() }, sunSize: { value: 0.0016 }, stars: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms, side: THREE.BackSide, depthWrite: false, fog: false });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(2500, 32, 16), material);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  scene.add(dome);

  // Environment map: render only the sky into a PMREM cube when the palette changes enough.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  const envDome = new THREE.Mesh(new THREE.SphereGeometry(100, 32, 16), material);
  envScene.add(envDome);
  let envTarget = null;
  function refreshEnvironment() {
    if (envTarget) envTarget.dispose();
    envTarget = pmrem.fromScene(envScene, 0.02);
    scene.environment = envTarget.texture;
  }

  return { dome, uniforms, refreshEnvironment, follow: (cam) => dome.position.copy(cam.position) };
}
