// HALCYON KEYS boot (provisional city test).
import { buildCity } from './world/cityBuilder.js';
import { buildCoastline } from './world/coastline.js';
import { buildStreetProps } from './world/streetProps.js';
import { createRenderer } from './render/renderer.js';
import { createSky } from './render/sky.js';
import { createDayNightCycle } from './render/dayNightCycle.js';
import { createLightGlows } from './render/lightGlows.js';
import { startGameLoop } from './core/gameLoop.js';

const canvas = document.getElementById('game-canvas');
const R = createRenderer(canvas);
const sky = createSky(R.scene, R.renderer);
const dayNight = createDayNightCycle({ ...R, sky });
const city = buildCity(R.scene, dayNight);
const coast = buildCoastline(R.scene, city.collision);
const props = buildStreetProps(R.scene, city.plan);
const glows = createLightGlows(R.scene);
glows.addStatic(city.glowPoints); glows.addStatic(coast.glowPoints); glows.addStatic(props.glowPoints);
const params = new URLSearchParams(location.search);
dayNight.setHour(Number(params.get('hour') || 17.4));
let t = 0;
const stats = startGameLoop({
  update(dt) { t += dt; coast.update(dt, t); },
  render() {
    const a = t * 0.05;
    R.camera.position.set(-430 + Math.cos(a) * 20, 14, 120 + Math.sin(a) * 20);
    R.camera.lookAt(-400, 6, 0);
    R.followShadow(-400, 60);
    sky.follow(R.camera);
    glows.nightLevel = dayNight.state.glow;
    glows.setViewportHeight(innerHeight);
    glows.begin(); glows.end();
    R.renderer.render(R.scene, R.camera);
  },
});
window.__hk = { R, stats, city };
document.getElementById('title-screen').classList.add('hidden');
