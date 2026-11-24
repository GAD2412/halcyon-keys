// The in-game HUD: mission card, clock, cash, wanted stars, weapon and ammo, PHPD dispatch roster,
// minimap with district name and health/armor bars, speedometer with radio, prompts, crosshair,
// toasts and the big BUSTED / WASTED / MISSION PASSED messages.
import { createMinimap } from './minimap.js';
import { createDialogueBox } from './dialogueBox.js';
import { drawWeaponIcon, WEAPONS } from '../systems/weapons.js';
import { DISTRICTS, districtAt, CITY_MIN } from '../world/cityPlan.js';
import { formatMoney } from '../core/mathUtils.js';

export function createHud(G) {
  const root = document.getElementById('hud-root');
  root.innerHTML = `
  <div class="hud-mission hidden"><div class="m-kicker"></div><div class="m-title"></div><div class="m-objective"></div><div class="m-steps"></div></div>
  <div class="hud-status">
    <div class="hud-clock"></div>
    <div class="hud-cash"></div>
    <div class="hud-stars"><span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>
    <div class="hud-weapon"><canvas width="128" height="64"></canvas><span class="w-name"></span><span class="ammo"></span></div>
  </div>
  <div class="hud-dispatch hidden"><div class="d-head">PHPD DISPATCH</div><div class="d-list"></div></div>
  <div class="hud-minimap"><div class="hud-district"></div><canvas width="500" height="500"></canvas>
    <div class="hud-bars"><div class="hp"><b></b></div><div class="ar"><b></b></div></div></div>
  <div class="hud-speed hidden"><div class="s-num">0</div><div class="s-unit">KM/H</div><div class="s-gauge"><b></b></div><div class="s-car"></div><div class="s-radio"></div></div>
  <div class="hud-prompt hidden"></div>
  <div class="hud-crosshair hidden"></div>
  <div class="hud-notify hidden"></div>
  <div class="hud-timer hidden"></div>
  <div class="hud-racepos hidden"></div>
  <div class="hud-big hidden"></div>`;
  const $ = (s) => root.querySelector(s);
  const el = {
    mission: $('.hud-mission'), kicker: $('.m-kicker'), title: $('.m-title'), objective: $('.m-objective'), steps: $('.m-steps'),
    clock: $('.hud-clock'), cash: $('.hud-cash'), stars: $('.hud-stars'), starSpans: [...root.querySelectorAll('.hud-stars span')],
    weaponIcon: $('.hud-weapon canvas'), weaponName: $('.w-name'), ammo: $('.ammo'),
    dispatch: $('.hud-dispatch'), dlist: $('.d-list'), district: $('.hud-district'),
    hp: $('.hp b'), ar: $('.ar b'), speed: $('.hud-speed'), snum: $('.s-num'), sgauge: $('.s-gauge b'), scar: $('.s-car'), sradio: $('.s-radio'),
    prompt: $('.hud-prompt'), cross: $('.hud-crosshair'), notify: $('.hud-notify'), timer: $('.hud-timer'), big: $('.hud-big'),
    racepos: $('.hud-racepos'),
  };
  const minimap = createMinimap($('.hud-minimap canvas'), G);
  const dialogue = createDialogueBox(root);
  const toasts = [];
  let toastT = 0, bigT = 0, lastWeapon = '', hitT = 0, cache = {};
  const set = (key, node, prop, value) => { if (cache[key] !== value) { cache[key] = value; node[prop] = value; } };

  const hud = {
    dialogue, root,
    notify(text) { toasts.push(text); if (toasts.length > 4) toasts.shift(); },
    big(text, cls, sub = '', time = 3) { el.big.className = `hud-big ${cls}`; el.big.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`; bigT = time; },
    hitMarker(hit) { if (hit) hitT = 0.15; },
    flashDamage() { root.style.boxShadow = 'inset 0 0 120px rgba(255,30,40,0.55)'; setTimeout(() => (root.style.boxShadow = ''), 160); },
    setVisible(v) { root.classList.toggle('hidden', !v); },
    update(dt) {
      const p = G.player, v = p.vehicle, pr = G.progression, w = G.wanted;
      // mission card
      const card = G.side.card() || G.missions.card();
      el.mission.classList.toggle('hidden', !card);
      if (card) {
        set('kicker', el.kicker, 'textContent', card.kicker);
        set('title', el.title, 'textContent', card.title);
        set('obj', el.objective, 'innerHTML', card.objective);
        const stepsHtml = Array.from({ length: card.total }, (_, i) => `<i class="${i < card.index ? 'done' : i === card.index ? 'now' : ''}"></i>`).join('');
        set('steps', el.steps, 'innerHTML', stepsHtml);
      }
      const timer = G.side.timer() ?? G.missions.timer();
      el.timer.classList.toggle('hidden', timer === null);
      if (timer !== null) set('timer', el.timer, 'textContent', `${Math.floor(timer / 60)}:${String(Math.floor(timer % 60)).padStart(2, '0')}`);
      const place = G.side.place();
      el.racepos.classList.toggle('hidden', place === null);
      if (place !== null) set('racepos', el.racepos, 'innerHTML', `<small>POS</small>${place}<em>/4</em>`);
      // status column
      set('clock', el.clock, 'textContent', `${G.dayNight.clockText()}  ·  ${pr.rank().name.toUpperCase()}`);
      set('cash', el.cash, 'textContent', formatMoney(pr.cash));
      el.starSpans.forEach((s, i) => { const on = i < w.stars; if (s.classList.contains('on') !== on) s.classList.toggle('on', on); });
      const flash = w.stars > 0 && !w.seen;
      if (el.stars.classList.contains('flash') !== flash) el.stars.classList.toggle('flash', flash);
      if (lastWeapon !== p.weapon) { lastWeapon = p.weapon; drawWeaponIcon(el.weaponIcon.getContext('2d'), p.weapon, 128, 64); }
      set('wname', el.weaponName, 'textContent', WEAPONS[p.weapon].name.toUpperCase());
      set('ammo', el.ammo, 'textContent', p.weapon === 'fists' ? '' : String(p.ammo[p.weapon]));
      // dispatch roster
      const roster = w.stars > 0 ? G.police.roster() : [];
      el.dispatch.classList.toggle('hidden', roster.length === 0);
      if (roster.length) set('roster', el.dlist, 'innerHTML', roster.map((r) => `<div class="d-row"><span>${r.name}</span><span>${Math.round(r.d)}m <em>${r.status}</em></span></div>`).join(''));
      // minimap and bars
      minimap.draw(dt);
      const px = v ? v.x : p.x, pz = v ? v.z : p.z;
      set('district', el.district, 'textContent', px < CITY_MIN - 10 ? 'Flamingo Beach' : DISTRICTS[districtAt(px, pz)].name);
      el.hp.style.width = `${Math.max(0, p.health)}%`;
      el.ar.style.width = `${Math.max(0, p.armor)}%`;
      // speedometer
      el.speed.classList.toggle('hidden', !v);
      if (v) {
        set('snum', el.snum, 'textContent', String(Math.round(v.kmh)));
        el.sgauge.style.width = `${Math.min(100, (Math.abs(v.speed) / v.spec.maxSpeed) * 100)}%`;
        set('scar', el.scar, 'textContent', `${v.spec.name}${v.health < 35 ? '  ·  DAMAGED' : ''}`);
        set('sradio', el.sradio, 'textContent', `♪ ${G.audio.radioName()}`);
      }
      // prompts and crosshair
      let prompt = '';
      if (!v && p.nearVehicle && p.alive) prompt = `<kbd>F</kbd>${p.nearVehicle.driver === 'ai' ? 'Steal' : 'Enter'} ${p.nearVehicle.spec.name}`;
      const mp = G.missions.prompt() || G.side.prompt();
      if (mp) prompt = mp;
      el.prompt.classList.toggle('hidden', !prompt);
      if (prompt) set('prompt', el.prompt, 'innerHTML', prompt);
      const showCross = !v && (p.aiming || G.forceCrosshair);
      el.cross.classList.toggle('hidden', !showCross);
      hitT -= dt;
      el.cross.classList.toggle('hit', hitT > 0);
      // toasts
      toastT -= dt;
      if (toastT <= 0) {
        if (toasts.length) { el.notify.textContent = toasts.shift(); el.notify.classList.remove('hidden'); toastT = 2.6; }
        else el.notify.classList.add('hidden');
      }
      bigT -= dt;
      el.big.classList.toggle('hidden', bigT <= 0);
      dialogue.update(dt);
    },
  };
  return hud;
}
