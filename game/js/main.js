// HALCYON KEYS boot: builds Port Halcyon, creates every system, wires events between them and runs the
// title → play → pause → wasted/busted flow. Imports are ordered so the showcase systems come first:
// wanted level and police, missions and traffic, street races, then the HUD and minimap.
import { createWantedLevel } from './systems/wantedLevel.js';
import { createPoliceDispatch } from './ai/policeDispatch.js';
import { createMissionDirector } from './missions/missionDirector.js';
import { createTraffic } from './ai/trafficAI.js';
import { createSideActivities } from './missions/sideActivities.js';
import { createHud } from './ui/hud.js';
import { createPedestrians } from './ai/pedestrianAI.js';
import { createCombat } from './systems/combat.js';
import { createPlayer } from './entities/player.js';
import { resolveVehicleCollisions } from './entities/vehicle.js';
import { createPostcards } from './systems/postcards.js';
import { buildCity } from './world/cityBuilder.js';
import { createMenus } from './ui/menus.js';
import { createAudio } from './audio/audioEngine.js';
import { createSaveGame } from './systems/saveGame.js';
import { createProgression } from './systems/progression.js';
import { buildCoastline } from './world/coastline.js';
import { buildStreetProps } from './world/streetProps.js';
import { PLACES, CITY_MIN, CITY_MAX, onRoadNS, onRoadEW } from './world/cityPlan.js';
import { createRenderer } from './render/renderer.js';
import { createSky } from './render/sky.js';
import { createDayNightCycle } from './render/dayNightCycle.js';
import { createLightGlows } from './render/lightGlows.js';
import { createEffects, createSkidMarks } from './render/effects.js';
import { createCameraRig } from './render/cameraRig.js';
import { createWeather } from './render/weather.js';
import { signalState } from './ai/trafficSignals.js';
import { createCrowdRenderer } from './entities/characterModel.js';
import { paintCityMap } from './ui/cityMapPainter.js';
import { input, attachInput } from './core/input.js';
import { createEventBus } from './core/eventBus.js';
import { startGameLoop } from './core/gameLoop.js';
import { stageShot } from './debug/shots.js';

const params = new URLSearchParams(location.search);
const SETTINGS_KEY = 'halcyon-keys-settings';
const loadSettings = () => { try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null'); } catch { return null; } };

const canvas = document.getElementById('game-canvas');
const R = createRenderer(canvas);
const G = {
  ...R, mode: 'title', time: 0, vehicles: [], humans: [], humansOnRoad: [], focus: { x: -400, z: 0 }, input,
  events: createEventBus(),
  settings: { volume: 0.7, muted: false, sensitivity: 1, shadows: true, traffic: 24, ...(loadSettings() || {}) },
};
window.__hk = G;
attachInput(canvas);

// ---- world
G.sky = createSky(R.scene, R.renderer);
G.dayNight = createDayNightCycle({ ...R, sky: G.sky });
const city = buildCity(R.scene, G.dayNight);
G.collision = city.collision;
G.plan = city.plan;
G.coast = buildCoastline(R.scene, G.collision);
const props = buildStreetProps(R.scene, city.plan);
G.dayNight.nightObjects.push(...props.nightMeshes);
G.glows = createLightGlows(R.scene);
G.glows.addStatic(city.glowPoints); G.glows.addStatic(G.coast.glowPoints); G.glows.addStatic(props.glowPoints);
G.effects = createEffects(R.scene);
G.weather = createWeather(R.scene, { roadMaterials: city.roadMaterials });
G.signalLamps = props.signalLamps;
G.skids = createSkidMarks(R.scene);
G.crowd = createCrowdRenderer(R.scene);
G.mapScale = 1;
G.mapCanvas = paintCityMap(city.plan, G.mapScale);

// ---- systems
G.player = createPlayer(G, -430, 336);
G.player.heading = -Math.PI / 2;
G.humans.push(G.player);
G.cameraRig = createCameraRig(G);
G.cameraRig.yaw = -Math.PI / 2;
G.combat = createCombat(G);
G.traffic = createTraffic(G);
G.peds = createPedestrians(G);
G.police = createPoliceDispatch(G);
G.wanted = createWantedLevel(G);
G.progression = createProgression(G);
G.hud = createHud(G);
G.notify = (t) => G.hud.notify(t);
G.missions = createMissionDirector(G);
G.side = createSideActivities(G);
G.postcards = createPostcards(G);
G.save = createSaveGame(G);
G.audio = createAudio(G);
G.menus = createMenus(G);

G.applySettings = () => {
  const s = G.settings;
  G.audio.setVolume(s.volume); G.audio.setMuted(s.muted);
  G.cameraRig.sensitivity = s.sensitivity;
  R.renderer.shadowMap.enabled = s.shadows; R.sun.castShadow = s.shadows;
  G.traffic.target.count = s.traffic;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* private mode */ }
};
G.applySettings();
G.dayNight.setHour(Number(params.get('hour') || 17.2));

// ---- events between systems
G.events.on('crime', (type, x, z) => G.wanted.addCrime(type, x, z));
let ramT = 0;
G.events.on('vehicleHit', (a, b) => {
  const pv = G.player.vehicle;
  if (!pv || (a !== pv && b !== pv)) return;
  const other = a === pv ? b : a;
  if (other.spec.police && G.time - ramT > 3) { ramT = G.time; G.events.emit('crime', 'ramCop', pv.x, pv.z); }
});
let deathT = 0;
G.events.on('playerDied', () => {
  if (G.mode !== 'play') return;
  G.player.alive = false; G.player.pose = 'dead'; G.player.visible = true;
  if (G.player.vehicle) G.player.exit();
  G.player.alive = false; G.player.pose = 'dead';
  G.progression.stats.wasted++;
  G.hud.big('Wasted', 'wasted', 'Halcyon General · $100 hospital bill', 4);
  G.mode = 'dead'; deathT = 4; G.respawnAt = PLACES.hospital; G.respawnFee = 100;
  G.side.reset();
});
G.events.on('busted', () => {
  if (G.mode !== 'play') return;
  if (G.player.vehicle) G.player.exit();
  G.player.pose = 'handsup';
  G.progression.stats.busted++;
  G.hud.big('Busted', 'busted', 'PHPD Central · $250 bail', 4);
  G.mode = 'dead'; deathT = 4; G.respawnAt = PLACES.police; G.respawnFee = 250;
  G.side.reset();
});

G.startGame = (slot) => {
  G.menus.showTitle(false);
  G.menus.close();
  G.mode = 'play';
  if (slot) G.save.load(slot);
  G.hud.setVisible(true);
  if (navigator.userActivation?.isActive) input.lock();
};

// ---- input that is not gameplay
addEventListener('keydown', (e) => {
  if (G.mode === 'shot') return;
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (G.mode === 'play') G.menus.open('Map'); else if (G.mode === 'pause') G.menus.close();
  }
  if (e.code === 'KeyM' && (G.mode === 'play' || G.mode === 'pause')) { if (G.menus.isOpen && G.menus.tab === 'Map') G.menus.close(); else G.menus.open('Map'); }
  if (e.code === 'KeyN') { G.settings.muted = !G.settings.muted; G.applySettings(); G.notify(G.settings.muted ? 'Audio muted' : 'Audio on'); }
  if (e.code === 'KeyR' && G.player.vehicle) { G.audio.nextStation(); G.notify(`Radio: ${G.audio.radioName()}`); }
  G.audio.start();
});
canvas.addEventListener('click', () => { G.audio.start(); if (G.mode === 'play') input.lock(); });
document.addEventListener('pointerlockchange', () => { if (!input.locked() && G.mode === 'play' && !params.has('shot') && !params.has('nolock')) G.menus.open('Map'); });

// ---- frame update
function update(dt) {
  if (G.mode === 'shot') { G.effects.update(dt * 0.0001); G.weather.update(0, G.camera, G.dayNight.state.isNight, G.time); return; }
  if (G.mode === 'pause') { input.endFrame(); return; }
  G.time += dt;
  const p = G.player;
  G.focus = G.mode === 'title' ? { x: G.camera.position.x + 30, z: G.camera.position.z } : { x: p.vehicle ? p.vehicle.x : p.x, z: p.vehicle ? p.vehicle.z : p.z };
  G.dayNight.update(dt);
  if (G.mode === 'play') p.update(dt, input);
  if (G.mode === 'dead') {
    deathT -= dt;
    if (deathT <= 0) {
      G.wanted.clear(); G.police.clearAll();
      p.respawn(G.respawnAt.x, G.respawnAt.z);
      G.progression.addCash(-G.respawnFee, G.respawnAt === PLACES.police ? 'Bail' : 'Hospital bill');
      G.mode = 'play';
    }
  }
  G.humansOnRoad.length = 0;
  for (const h of G.humans) if (h.alive && h.visible && (onRoadNS(h.x, h.z) || onRoadEW(h.x, h.z))) G.humansOnRoad.push(h);
  G.traffic.update(dt);
  G.peds.update(dt);
  G.police.update(dt);
  G.wanted.update(dt);
  G.missions.update(dt);
  G.side.update(dt, input);
  G.postcards.update();
  for (const v of G.vehicles) v.update(dt);
  resolveVehicleCollisions(G, G.vehicles);
  G.effects.update(dt);
  G.weather.update(dt, G.camera, G.dayNight.state.isNight, G.time);
  G.coast.update(dt, G.time);
  if (G.mode === 'play') {
    const st = G.progression.stats;
    st.playTime += dt;
    if (p.vehicle) { st.distance += Math.abs(p.vehicle.speed) * dt; st.topSpeed = Math.max(st.topSpeed, p.vehicle.kmh); }
  }
  input.endFrame();
}

function render(dt) {
  G.cameraRig.update(dt, input);
  const c = G.camera.position;
  const fx = G.mode === 'shot' ? G.shotFocus || c : G.focus;
  R.followShadow(fx.x, fx.z);
  G.sky.follow(G.camera);
  G.crowd.draw(G.humans);
  const glows = G.glows;
  glows.nightLevel = G.dayNight.state.glow;
  glows.setViewportHeight(innerHeight * Math.min(devicePixelRatio, 1.5));
  G.effects.setViewportHeight(innerHeight * Math.min(devicePixelRatio, 1.5));
  glows.begin();
  const night = G.dayNight.state.glow > 0.35;
  for (const v of G.vehicles) if (Math.abs(v.x - c.x) < 260 && Math.abs(v.z - c.z) < 260) v.drawGlows(glows, night);
  G.police.drawGlows(glows);
  G.effects.drawGlows(glows);
  G.postcards.drawGlows(glows);
  // live traffic signals near the camera
  for (const s of G.signalLamps) {
    if (Math.abs(s.x - c.x) > 150 || Math.abs(s.z - c.z) > 150) continue;
    const st = signalState(s.axis, G.time);
    if (st === 'red') glows.add(s.x, 5.15, s.z, 1.6, 0.1, 0.05, 3.2);
    else if (st === 'amber') glows.add(s.x, 4.75, s.z, 1.6, 0.8, 0.05, 3.2);
    else glows.add(s.x, 4.35, s.z, 0.1, 1.6, 0.5, 3.2);
  }
  glows.end();
  R.renderer.render(R.scene, G.camera);
  if (G.mode !== 'title') G.hud.update(dt);
  G.audio.update(dt);
}

G.hud.setVisible(false);
G.loop = startGameLoop({ update, render });
if (params.has('shot')) stageShot(G, params.get('shot'));
else if (params.has('play')) G.startGame(null);
