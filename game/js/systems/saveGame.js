// Save and load: three manual slots plus an autosave in localStorage (cash, respect, story progress,
// weapons, position, time of day, stats and settings).

const KEY = 'halcyon-keys-save-';

export function createSaveGame(G) {
  const read = (slot) => { try { return JSON.parse(localStorage.getItem(KEY + slot) || 'null'); } catch { return null; } };
  const snapshot = () => {
    const p = G.player;
    return {
      v: 1, at: new Date().toISOString(),
      cash: G.progression.cash, respect: G.progression.respect, stats: G.progression.stats,
      missions: G.missions.saveState(), raceBest: G.side.best, postcards: G.postcards.saveState(),
      player: { x: p.vehicle ? p.vehicle.x : p.x, z: p.vehicle ? p.vehicle.z : p.z, health: p.health, armor: p.armor, ammo: { pistol: p.ammo.pistol, smg: p.ammo.smg }, owned: [...p.owned], weapon: p.weapon },
      hour: G.dayNight.state.hour,
    };
  };
  return {
    slots: ['auto', '1', '2', '3'],
    info(slot) { const s = read(slot); return s ? { at: s.at, cash: s.cash, done: s.missions?.done?.length || 0 } : null; },
    hasAny() { return ['auto', '1', '2', '3'].some((s) => read(s)); },
    latest() { return ['auto', '1', '2', '3'].map((s) => ({ s, d: read(s) })).filter((x) => x.d).sort((a, b) => (a.d.at < b.d.at ? 1 : -1))[0]?.s; },
    save(slot) {
      try { localStorage.setItem(KEY + slot, JSON.stringify(snapshot())); G.notify?.(slot === 'auto' ? 'Autosaved' : `Saved to slot ${slot}`); return true; } catch { return false; }
    },
    load(slot) {
      const s = read(slot);
      if (!s) return false;
      const p = G.player;
      G.progression.cash = s.cash; G.progression.respect = s.respect; Object.assign(G.progression.stats, s.stats || {});
      G.missions.loadState(s.missions);
      Object.assign(G.side.best, s.raceBest || {}); G.side.reset();
      G.postcards.loadState(s.postcards);
      p.respawn(s.player.x, s.player.z);
      p.health = s.player.health; p.armor = s.player.armor;
      Object.assign(p.ammo, s.player.ammo); p.owned = new Set(s.player.owned); p.selectWeapon(s.player.weapon);
      G.dayNight.setHour(s.hour);
      G.wanted.clear(); G.police.clearAll();
      G.notify?.('Game loaded');
      return true;
    },
  };
}
