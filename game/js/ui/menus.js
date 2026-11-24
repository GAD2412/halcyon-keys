// Title screen and pause menu. Tabs: Map, Story, Stats, Features, Controls, Settings, Save/Load.
import { drawTitleLogo } from './titleLogo.js';
import { drawWorldMap } from './worldMap.js';
import { RANKS } from '../systems/progression.js';
import { CAST } from './portraits.js';

const TABS = ['Map', 'Story', 'Stats', 'Features', 'Controls', 'Settings', 'Save / Load'];
const CONTROLS = [
  ['W A S D', 'Move / drive'], ['Mouse', 'Look and aim'], ['Shift', 'Sprint'], ['Space', 'Jump / handbrake'],
  ['F', 'Enter, exit or steal a car'], ['Left click', 'Fire / punch'], ['Right click', 'Aim'], ['1 2 3 / wheel', 'Fists, Tamsin 9, Hornet SMG'],
  ['H', 'Horn'], ['R', 'Next radio station'], ['M', 'City map'], ['N', 'Mute'], ['Esc', 'Pause menu'],
];

export function createMenus(G) {
  const title = document.getElementById('title-screen');
  const pause = document.getElementById('pause-menu');
  const tabsEl = document.getElementById('pause-tabs');
  const body = document.getElementById('pause-body');
  drawTitleLogo(document.getElementById('title-logo'));
  let tab = 'Map';

  const btn = (id) => document.getElementById(id);
  btn('btn-new-game').onclick = () => { G.audio.start(); G.audio.ui(); G.startGame(null); };
  btn('btn-continue').onclick = () => { G.audio.start(); G.startGame(G.save.latest()); };
  btn('btn-load').onclick = () => { G.audio.start(); open('Save / Load'); };
  btn('btn-title-settings').onclick = () => { G.audio.start(); open('Settings'); };
  const refreshTitle = () => { btn('btn-continue').disabled = !G.save.hasAny(); btn('btn-load').disabled = !G.save.hasAny(); };
  refreshTitle();

  tabsEl.innerHTML = TABS.map((t) => `<button data-tab="${t}">${t}</button>`).join('') + '<button data-tab="resume">Resume ▸</button>';
  tabsEl.onclick = (e) => {
    const t = e.target.dataset?.tab;
    if (!t) return;
    G.audio.ui();
    if (t === 'resume') return close();
    tab = t; render();
  };

  function open(which = 'Map') {
    tab = which;
    pause.classList.remove('hidden');
    G.input.unlock();
    if (G.mode === 'play') G.mode = 'pause';
    render();
  }
  function close() {
    pause.classList.add('hidden');
    if (G.mode === 'pause') { G.mode = 'play'; G.input.lock(); }
  }

  function render() {
    for (const b of tabsEl.children) b.classList.toggle('active', b.dataset.tab === tab);
    const pr = G.progression;
    if (tab === 'Map') {
      body.innerHTML = `<div class="map-wrap"><canvas id="pause-map" width="900" height="900"></canvas></div>
        <div class="side-col"><h2>Port Halcyon</h2><div class="progress-big">${pr.completion()}%</div><div>complete</div>
        <div class="legend"><span><i style="background:#ffd23a"></i>Objective</span><span><i style="background:#ff6f61"></i>Mission start</span>
        <span><i style="background:#ff3a4a"></i>PHPD unit</span><span><i style="background:#c86bff"></i>GPS route</span>
        <span><i style="background:#f2b8a8"></i>Flamingo Mile</span><span><i style="background:#9fc3dc"></i>Glasswater</span>
        <span><i style="background:#e7c48f"></i>Lantern Quarter</span><span><i style="background:#c4a58a"></i>Rustline Yards</span>
        <span><i style="background:#a9b4c0"></i>Ninefold Docks</span><span><i style="background:#a8d58f"></i>Mango Hill</span></div>
        <h2 style="margin-top:18px">Story</h2>${storyRows()}</div>`;
      drawWorldMap(document.getElementById('pause-map'), G);
    } else if (tab === 'Story') {
      body.innerHTML = `<div class="side-col"><h2>Story · ${G.missions.completedCount()}/${G.missions.total()} missions</h2>${storyRows(true)}
        <h2 style="margin-top:18px">The crew</h2>${['pearl', 'tuck', 'lux'].map((k) => `<div class="story-row">${CAST[k].name}</div>`).join('')}
        <h2 style="margin-top:18px">Rivals</h2><div class="story-row">Rustline Kings · Oz Marlowe</div><div class="story-row">The Gilded Tide · Cassius Wren</div></div>`;
    } else if (tab === 'Stats') {
      const s = pr.stats, r = pr.rank();
      const nextRank = RANKS.find((k) => k.respect > pr.respect);
      body.innerHTML = `<div class="side-col"><h2>${r.name}</h2><div class="progress-big">${pr.completion()}%</div><div>complete · ${pr.respect} respect${nextRank ? ` · next rank ${nextRank.name} at ${nextRank.respect}` : ''}</div>
        ${[['Cash', `$${Math.round(pr.cash).toLocaleString('en-US')}`], ['Cars stolen', s.carsStolen], ['Takedowns', s.kills], ['Police evaded', s.copsEvaded], ['Busted', s.busted], ['Wasted', s.wasted], ['Distance driven', `${(s.distance / 1000).toFixed(1)} km`], ['Top speed', `${Math.round(s.topSpeed)} km/h`], ['Time played', `${Math.floor(s.playTime / 60)} min`]].map(([a, b]) => `<div class="stat-line"><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
    } else if (tab === 'Features') {
      body.innerHTML = `<div class="side-col"><h2>Features</h2><ul class="features" style="max-width:none">${document.getElementById('features').innerHTML}</ul></div>`;
    } else if (tab === 'Controls') {
      body.innerHTML = `<div class="side-col"><h2>Controls</h2><div class="controls-grid">${CONTROLS.map(([k, v]) => `<kbd>${k}</kbd><span>${v}</span>`).join('')}</div></div>`;
    } else if (tab === 'Settings') {
      const st = G.settings;
      body.innerHTML = `<div class="side-col"><h2>Settings</h2>
        <div class="setting"><label>Master volume</label><input id="set-vol" type="range" min="0" max="1" step="0.05" value="${st.volume}"></div>
        <div class="setting"><label>Mute audio (N)</label><input id="set-mute" type="checkbox" ${st.muted ? 'checked' : ''}></div>
        <div class="setting"><label>Mouse sensitivity</label><input id="set-sens" type="range" min="0.3" max="2.5" step="0.1" value="${st.sensitivity}"></div>
        <div class="setting"><label>Shadows</label><input id="set-shadows" type="checkbox" ${st.shadows ? 'checked' : ''}></div>
        <div class="setting"><label>Traffic density</label><input id="set-traffic" type="range" min="8" max="36" step="2" value="${st.traffic}"></div>
        <div class="setting"><label>Time of day</label><input id="set-hour" type="range" min="0" max="23.9" step="0.1" value="${G.dayNight.state.hour.toFixed(1)}"></div></div>`;
      const bind = (id, fn) => { document.getElementById(id).oninput = (e) => { fn(e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value)); G.applySettings(); }; };
      bind('set-vol', (v) => (st.volume = v)); bind('set-mute', (v) => (st.muted = v)); bind('set-sens', (v) => (st.sensitivity = v));
      bind('set-shadows', (v) => (st.shadows = v)); bind('set-traffic', (v) => (st.traffic = v)); bind('set-hour', (v) => G.dayNight.setHour(v));
    } else if (tab === 'Save / Load') {
      body.innerHTML = `<div class="side-col"><h2>Save / Load</h2><p>Saving is available at any time; the game autosaves after each mission.</p>
        ${G.save.slots.map((s) => { const i = G.save.info(s); return `<div class="slot"><span><b>${s === 'auto' ? 'Autosave' : `Slot ${s}`}</b> · ${i ? `${new Date(i.at).toLocaleString()} · $${i.cash} · ${i.done} missions` : 'empty'}</span>
        ${s !== 'auto' && G.mode !== 'title' ? `<button class="menu-btn" data-save="${s}">Save</button>` : ''}<button class="menu-btn" data-load="${s}" ${i ? '' : 'disabled'}>Load</button></div>`; }).join('')}</div>`;
      body.onclick = (e) => {
        const sv = e.target.dataset?.save, ld = e.target.dataset?.load;
        if (sv) { G.save.save(sv); render(); }
        if (ld) { if (G.mode === 'title') G.startGame(ld); else { G.save.load(ld); close(); } }
      };
    }
  }

  function storyRows(long = false) {
    return G.missions.list().map((m) => `<div class="story-row ${m.state}"><span class="st">${m.state.toUpperCase()}</span><span>${m.title}${long ? `<small>${m.act} · for ${CAST[m.giver].name} · $${m.reward.toLocaleString('en-US')}</small>` : ''}</span></div>`).join('');
  }

  return {
    open, close, render, refreshTitle,
    get isOpen() { return !pause.classList.contains('hidden'); },
    get tab() { return tab; },
    showTitle(v) { title.classList.toggle('hidden', !v); },
  };
}
